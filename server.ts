import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import cors from "cors";
import * as admin from "firebase-admin"; // Changed to namespace import for better compatibility
import { cert } from "firebase-admin/app";
import { google } from "googleapis";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  firestoreDatabaseId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "restoran-wawasan.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "restoran-wawasan",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "restoran-wawasan.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1019707766959",
  appId: process.env.FIREBASE_APP_ID || "1:1019707766959:web:78644cddb16b67a69ffc5a",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-ZWC8H62RZN",
  firestoreDatabaseId: undefined
};

// IMPORTANT: The backend Express server must ALWAYS connect to the production
// Firebase project (restoran-wawasan), regardless of environment. Unlike the
// frontend (which legitimately switches to a sandbox project during AI Studio
// preview), this server only ever runs on Render as the real production
// backend — so it must never read firebase-applet-config.json or any other
// sandbox override. Doing so previously caused orders, invoice counters, and
// calendar syncs to silently target the wrong Firestore project.

// Self-healing Local JSON Database Fallback
const LOCAL_DB_PATH = path.join(process.cwd(), "orders.json");

// Lazy initialize Firebase Admin
let adminApp: admin.app.App | null = null;
function getAdminApp() {
  if (!adminApp) {
    const apps = admin.apps || [];
    if (apps.length === 0) {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

      if (email && privateKey) {
        // Render has no Application Default Credentials (that's a GCP-only
        // mechanism), so Firebase Admin must be given an explicit service
        // account credential or every Firestore call silently fails auth.
        adminApp = admin.initializeApp({
          credential: cert({
            projectId: firebaseConfig.projectId,
            clientEmail: email,
            privateKey: privateKey,
          }),
          projectId: firebaseConfig.projectId,
        });
      } else {
        console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set — Firebase Admin will attempt Application Default Credentials, which do not exist on Render and will likely fail.");
        adminApp = admin.initializeApp({ projectId: firebaseConfig.projectId });
      }
    } else {
      adminApp = apps[0]!;
    }
  }
  return adminApp;
}

function getFirestore() {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId;
  
  if (dbId && dbId !== "(default)") {
    // In firebase-admin, you can get a named database via admin.firestore(app, databaseId)
    // or by accessing the firestore service and then getting the database.
    try {
      return admin.firestore(app, dbId);
    } catch (err) {
      console.warn(`Failed to initialize Firestore with database ID ${dbId}, falling back to default:`, err);
      return admin.firestore(app);
    }
  }
  return admin.firestore(app);
}

async function sendNotificationToTopic(topic: string, title: string, body: string) {
  try {
    const app = getAdminApp();
    const message = {
      notification: {
        title,
        body,
      },
      topic: topic,
    };
    const response = await admin.messaging(app).send(message);
    console.log(`Successfully sent message to topic ${topic}:`, response);
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error);
  }
}

// Robust Firestore operation retry mechanism to minimize reliance on the transient file system
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[Firestore Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms... Error:`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      }
    }
  }
  throw lastError;
}

function getLocalOrders(): Record<string, unknown>[] {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      console.warn("[WARNING] Reading from local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error("Error reading local orders database:", err);
  }
  return [];
}

function saveLocalOrders(orders: Record<string, unknown>[]) {
  try {
    console.warn("[WARNING] Writing to local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to local orders database:", err);
  }
}

// Generates sequential invoice number using Firestore transactions
async function generateSequentialInvoiceNumber(): Promise<string> {
  const db = getFirestore();
  const counterRef = db.collection("meta").doc("invoiceCounter");

  return await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(counterRef);
    let count = 1;
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && typeof data.count === "number") {
        count = data.count + 1;
      }
    }
    transaction.set(counterRef, { count });

    const padded = String(count).padStart(4, "0");
    return `RW${padded}`;
  });
}

// Google Calendar Helper
function getGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!email || !privateKey) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured. Google Calendar event creation will be skipped.");
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
    });
    return google.calendar({ version: "v3", auth });
  } catch (err) {
    console.error("Failed to initialize Google Calendar client:", err);
    return null;
  }
}

interface OrderData {
  dateTime?: string;
  date?: string;
  time?: string;
  meals?: string | string[];
  quantity?: number;
  location?: string;
  menu?: string;
  name?: string;
  contact?: string;
  email?: string;
  notes?: string;
  status?: string;
  totalAmount?: number;
  calendarEventIds?: Record<string, string>;
}

async function syncGoogleCalendarEvent(orderId: string, passedOrderData?: OrderData) {
  try {
    const calendar = getGoogleCalendarClient();
    if (!calendar) {
      return;
    }

    // 1. Fetch current order data if not passed
    let orderData: OrderData | undefined = passedOrderData;
    if (!orderData) {
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          orderData = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn(`Firestore sync load failed for order ${orderId}:`, dbErr);
      }

      if (!orderData) {
        const localOrders = getLocalOrders();
        orderData = localOrders.find(o => o.id === orderId) as OrderData | undefined;
      }
    }

    if (!orderData) {
      console.warn(`Sync Google Calendar Event: Order ${orderId} not found.`);
      return;
    }

    // Determine start time (using orderData.dateTime or parsing date/time)
    let startDateTime: Date;
    if (orderData.dateTime) {
      startDateTime = new Date(orderData.dateTime);
    } else if (orderData.date) {
      startDateTime = new Date(`${orderData.date}T${orderData.time || '12:00'}:00+08:00`);
    } else {
      startDateTime = new Date();
    }

    // Validate date
    if (isNaN(startDateTime.getTime())) {
      startDateTime = new Date();
    }

    // Default duration: 3 hours
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

    const mealList = Array.isArray(orderData.meals) ? orderData.meals.join(", ") : (orderData.meals || "");
    const summary = `[${(orderData.status || "pending").toUpperCase()}] Wawasan Order - ${orderData.name || "Customer"} (${orderData.quantity || ""} Pax)`;
    const description = `${orderData.quantity || "N/A"} Pax
Meal For: ${mealList || "N/A"}
Event Location: ${orderData.location || "N/A"}
Menu: ${orderData.menu || "N/A"}`;

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const existingEventId = orderData.calendarEventIds?.[calendarId];

    if (existingEventId) {
      try {
        console.log(`Updating existing Google Calendar event ${existingEventId} for order ${orderId}...`);
        await calendar.events.update({
          calendarId: calendarId,
          eventId: existingEventId,
          requestBody: {
            summary: summary,
            description: description,
            location: orderData.location || "",
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
          },
        });
        console.log(`Google Calendar event ${existingEventId} updated successfully.`);
        return;
      } catch (updateErr) {
        // If event was deleted, we'll recreate it
        const errObj = updateErr as { status?: number; message?: string };
        if (errObj && (errObj.status === 404 || (errObj.message && errObj.message.includes('Not Found')))) {
          console.warn(`Existing calendar event ${existingEventId} not found or deleted on calendar, recreating...`);
        } else {
          throw updateErr;
        }
      }
    }

    // Insert new event if no existing event id or if recreation is needed
    console.log(`Creating new Google Calendar event for order ${orderId}...`);
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: summary,
        description: description,
        location: orderData.location || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
      },
    });

    const eventId = response.data.id;
    if (eventId) {
      console.log(`Google Calendar event created successfully! Event Link: ${response.data.htmlLink}`);
      
      const updatedCalendarEventIds = {
        ...(orderData.calendarEventIds || {}),
        [calendarId]: eventId
      };

      // Update Firestore document with calendarEventIds
      try {
        const adminDb = getFirestore();
        await adminDb.collection("orders").doc(orderId).update({
          calendarEventIds: updatedCalendarEventIds
        });
        console.log(`Firestore updated with calendarEventIds for order ${orderId}`);
      } catch (dbErr) {
        console.warn(`Failed to update calendarEventIds in Firestore for order ${orderId}:`, dbErr);
      }

      // Update Local JSON file with calendarEventIds
      try {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            calendarEventIds: updatedCalendarEventIds
          };
          saveLocalOrders(localOrders);
          console.log(`Local JSON updated with calendarEventIds for order ${orderId}`);
        }
      } catch (localErr) {
        console.error("Failed to update local orders with calendarEventIds:", localErr);
      }
    }
  } catch (err) {
    console.error(`Error syncing Google Calendar event for order ${orderId}:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Allow large payloads for base64 PDF

  // Nodemailer transporter setup
  // Expects environment variables for SMTP configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    family: 4, // Force IPv4 — Render's network doesn't reliably route outbound IPv6 to Gmail SMTP
  });

  // Verify SMTP transporter connection
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Configuration/Connection Error:", error);
    } else {
      console.log("SMTP connection verified! Server is ready to send emails.");
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lightweight endpoint for the Android home-screen widget.
  // Returns only the fields the widget needs (pax, meal, location, menu, date),
  // sorted by event date ascending, limited to the nearest upcoming orders.
  app.get("/api/widget/upcoming-orders", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "5", 10), 20);
      const now = new Date();
      const results: { id: string; date: string; time?: string; quantity?: number; meals?: string; location?: string; menu?: string }[] = [];

      try {
        const adminDb = getFirestore();
        const snapshot = await adminDb.collection("orders").get();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as OrderData;
          const eventDate = d.dateTime ? new Date(d.dateTime) : (d.date ? new Date(`${d.date}T${d.time || '12:00'}:00+08:00`) : null);
          if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
            results.push({
              id: docSnap.id,
              date: eventDate.toISOString(),
              quantity: d.quantity,
              meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals,
              location: d.location,
              menu: d.menu,
            });
          }
        });
      } catch (dbErr) {
        console.warn("Widget endpoint: Firestore fetch failed, falling back to local orders:", dbErr);
        const localOrders = getLocalOrders() as unknown as (OrderData & { id: string })[];
        localOrders.forEach((d) => {
          const eventDate = d.dateTime ? new Date(d.dateTime) : (d.date ? new Date(`${d.date}T${d.time || '12:00'}:00+08:00`) : null);
          if (eventDate && !isNaN(eventDate.getTime()) && eventDate.getTime() >= now.getTime()) {
            results.push({
              id: d.id,
              date: eventDate.toISOString(),
              quantity: d.quantity,
              meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals,
              location: d.location,
              menu: d.menu,
            });
          }
        });
      }

      results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      res.json({ success: true, orders: results.slice(0, limit) });
    } catch (err) {
      console.error("Widget endpoint error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // TEMPORARY DEBUG ENDPOINT - lists ALL orders with no date filter, to verify
  // Firestore actually contains test data. Remove this once debugging is done.
  app.get("/api/widget/debug-all-orders", async (req, res) => {
    try {
      const results: Record<string, unknown>[] = [];
      try {
        const adminDb = getFirestore();
        const snapshot = await adminDb.collection("orders").get();
        snapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (dbErr) {
        console.warn("Debug endpoint: Firestore fetch failed:", dbErr);
      }
      const localOrders = getLocalOrders();
      res.json({ success: true, firestoreCount: results.length, localCount: localOrders.length, firestoreOrders: results, localOrders });
    } catch (err) {
      console.error("Debug endpoint error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Submit order endpoint - tries Firestore first, falls back to local JSON backup
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      let orderId = '';
      let savedInFirestore = false;
      let invoiceNo = '';

      try {
        invoiceNo = await generateSequentialInvoiceNumber();
      } catch (err) {
        console.warn("Failed to generate Firestore sequential invoice number, generating fallback:", err);
        // Generate a fallback invoice number with timestamp & random characters
        invoiceNo = `RW-FALLBACK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      try {
        const adminDb = getFirestore();
        const docRef = await runWithRetry(() => adminDb.collection("orders").add({
          ...orderData,
          invoiceNo,
          adminPasscode: process.env.ADMIN_PASSWORD || "wawasan123",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }));
        orderId = docRef.id;
        savedInFirestore = true;
      } catch (dbErr) {
        console.warn("Firestore order submission failed after retries, saving locally:", dbErr);
      }

      if (!savedInFirestore) {
        orderId = "order_" + Math.random().toString(36).substring(2, 10);
        const localOrders = getLocalOrders();
        localOrders.push({
          id: orderId,
          ...orderData,
          invoiceNo,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        });
        saveLocalOrders(localOrders);
      }

      // Trigger background Google Calendar event creation safely without blocking client response
      syncGoogleCalendarEvent(orderId, { ...orderData, invoiceNo }).catch(err => {
        console.error("Background Google Calendar event creation error:", err);
      });

      // Trigger push notification
      sendNotificationToTopic("new_orders", "New Order Received!", `New order from ${orderData.name || 'Customer'} - ${orderData.quantity || '0'} pax.`).catch(err => {
        console.error("Background push notification error:", err);
      });

      res.json({ success: true, id: orderId, invoiceNo });
    } catch (err) {
      console.error("Order submission endpoint error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Invoice Billing and Delivery system for Submissions/Orders collection
  app.post("/api/submissions/bill", async (req, res) => {
    try {
      const { submissionId, totalAmount, pdfBase64, fileName, collectionName = 'submissions' } = req.body;

      if (!submissionId) {
        return res.status(400).json({ error: "Missing submissionId" });
      }

      if (totalAmount === undefined || totalAmount === null || isNaN(Number(totalAmount))) {
        return res.status(400).json({ error: "Invalid or missing totalAmount" });
      }

      const parsedAmount = Number(totalAmount);

      // 1. Fetch document from Firestore or Local JSON
      let data: Record<string, unknown> | null = null;
      let isLocal = false;
      
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection(collectionName).doc(submissionId).get();
        if (docSnap.exists) {
          data = docSnap.data() as Record<string, unknown>;
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in bill failed, trying local backup:", dbErr);
      }

      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find(o => o.id === submissionId);
        if (found) {
          data = found;
          isLocal = true;
        }
      }

      if (!data) {
        return res.status(404).json({ error: `Document not found in ${collectionName}` });
      }

      // 2. Update Firestore document or Local JSON with totalAmount and set status to 'billed'
      const updatedFields = {
        totalAmount: parsedAmount,
        status: 'billed',
        billedAt: new Date().toISOString()
      };

      if (!isLocal) {
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection(collectionName).doc(submissionId).update(updatedFields));
        } catch (dbErr) {
          console.warn("Firestore update in bill failed after retries, syncing locally:", dbErr);
          isLocal = true;
        }
      }

      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === submissionId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...updatedFields
          };
          saveLocalOrders(localOrders);
        }
      }

      // Sync Google Calendar Event in background if this is an order
      if (collectionName === 'orders') {
        syncGoogleCalendarEvent(submissionId).catch(err => {
          console.error("Background Google Calendar event sync error during billing:", err);
        });
      }

      // 3. Extract customer email, name, invoice details
      const customerEmail = data.customerEmail || data.email;
      const customerName = data.customerName || data.name || "Valued Customer";
      const invoiceNo = data.invoiceNo || `INV-${submissionId.substring(0, 6).toUpperCase()}`;
      const items = data.items || [];
      const lang = data.lang || 'en';

      if (!customerEmail) {
        return res.json({ 
          success: true, 
          message: "Document successfully updated to 'billed', but no customer email was found in the document to send an invoice." 
        });
      }

      // 4. Secure Email Delivery - Build styled HTML email
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.json({
          success: true,
          message: "Document successfully updated to 'billed', but email could not be sent because SMTP is not configured on the server."
        });
      }

      // Build items list HTML table if present
      let itemsHtml = '';
      if (items && Array.isArray(items) && items.length > 0) {
        itemsHtml = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-family: sans-serif;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #4a5568; font-size: 13px;">
                <th style="padding: 10px 0;">Item</th>
                <th style="padding: 10px 0; text-align: center;">Qty</th>
                <th style="padding: 10px 0; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
        `;
        interface InvoiceItem {
          name?: string;
          title?: string;
          qty?: number;
          quantity?: number;
          price?: number | string;
        }
        (items as InvoiceItem[]).forEach((item) => {
          const name = item.name || item.title || 'Item';
          const qty = item.qty || item.quantity || 1;
          const price = item.price !== undefined ? `RM ${Number(item.price).toFixed(2)}` : '-';
          itemsHtml += `
            <tr style="border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px;">
              <td style="padding: 12px 0; font-weight: 500;">${name}</td>
              <td style="padding: 12px 0; text-align: center; color: #718096;">${qty}</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 500;">${price}</td>
            </tr>
          `;
        });
        itemsHtml += `
            </tbody>
          </table>
        `;
      }

      // Styled HTML Template for the Invoice
      const emailSubject = lang === 'bm'
        ? `Invois Rasmi - ${invoiceNo} (Restoran Wawasan)`
        : `Official Invoice - ${invoiceNo} (Restoran Wawasan)`;

      const titleText = lang === 'bm' ? 'INVOIS RASMI' : 'OFFICIAL INVOICE';
      const billToText = lang === 'bm' ? 'Bil Kepada:' : 'Bill To:';
      const invoiceNoText = lang === 'bm' ? 'No. Invois:' : 'Invoice No:';
      const dateText = lang === 'bm' ? 'Tarikh:' : 'Date:';
      const totalAmountText = lang === 'bm' ? 'Jumlah Keseluruhan:' : 'Total Amount:';
      const thankYouText = lang === 'bm'
        ? 'Terima kasih atas kunjungan/pesanan anda di Restoran Wawasan! Sila dapati butiran bil anda di bawah.'
        : 'Thank you for your order/visit at Restoran Wawasan! Please find your billing details below.';
      const footerText = lang === 'bm'
        ? 'E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan.'
        : 'This is an automatically generated email. Please contact us if you have any questions.';

      const formattedDate = new Date().toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f7fafc;
              margin: 0;
              padding: 20px;
              color: #2d3748;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              border: 1px solid #e2e8f0;
            }
            .header {
              background-color: #1a202c;
              padding: 30px;
              text-align: center;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.05em;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #a0aec0;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #edf2f7;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              font-size: 14px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .meta-row:last-child {
              margin-bottom: 0;
            }
            .meta-label {
              color: #718096;
              font-weight: 500;
            }
            .meta-value {
              color: #2d3748;
              font-weight: 600;
              text-align: right;
            }
            .total-box {
              background-color: #ebf8ff;
              border: 1px solid #bee3f8;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin-top: 20px;
              margin-bottom: 25px;
            }
            .total-label {
              font-size: 14px;
              color: #2b6cb0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-weight: 700;
              margin-bottom: 5px;
            }
            .total-amount {
              font-size: 32px;
              font-weight: 800;
              color: #2b6cb0;
            }
            .footer {
              background-color: #f7fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #a0aec0;
              border-top: 1px solid #edf2f7;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RESTORAN WAWASAN</h1>
              <p>${titleText}</p>
            </div>
            <div class="content">
              <div class="greeting">
                <p style="margin-top:0; font-weight: 600; font-size: 18px;">${lang === 'bm' ? 'Salam' : 'Hello'} ${customerName},</p>
                <p style="color: #4a5568;">${thankYouText}</p>
              </div>
              
              <div class="meta-box">
                <div class="meta-row">
                  <span class="meta-label">${billToText}</span>
                  <span class="meta-value">${customerName} (${customerEmail})</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">${invoiceNoText}</span>
                  <span class="meta-value" style="color: #1a202c;">${invoiceNo}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">${dateText}</span>
                  <span class="meta-value">${formattedDate}</span>
                </div>
              </div>

              ${itemsHtml}

              <div class="total-box">
                <div class="total-label">${totalAmountText}</div>
                <div class="total-amount">RM ${parsedAmount.toFixed(2)}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">${footerText}</p>
              <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Restoran Wawasan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 5. Send secure email
      const emailAttachments = [];
      if (pdfBase64) {
        emailAttachments.push({
          filename: fileName || `Invoice_${invoiceNo}.pdf`,
          content: pdfBase64,
          encoding: 'base64'
        });
      }

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SENDER_EMAIL || 'madnor.noisy@gmail.com'}>`,
        to: customerEmail,
        subject: emailSubject,
        html: htmlBody,
        attachments: emailAttachments.length > 0 ? emailAttachments : undefined
      });

      console.log(`Invoice email sent successfully to ${customerEmail} for submission ${submissionId}`);
      res.json({ 
        success: true, 
        message: "Submission updated and invoice email sent successfully", 
        data: { 
          submissionId, 
          totalAmount: parsedAmount, 
          status: 'billed',
          emailSentTo: customerEmail
        } 
      });

    } catch (error) {
      console.error("Error billing submission:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to bill submission and send email" });
    }
  });

  app.post("/api/send-invoice", async (req, res) => {
    try {
      const { email, name, invoiceNo, pdfBase64, isFinal, lang, orderDetails } = req.body;

      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "Missing required fields (email, pdfBase64)" });
      }

      // Ensure SMTP is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.status(500).json({ error: "Email service not configured." });
      }

      const emailSubject = lang === 'bm' 
        ? (isFinal ? `Invois Muktamad - ${invoiceNo}` : `Invois Awal - ${invoiceNo}`)
        : (isFinal ? `Final Invoice - ${invoiceNo}` : `Preliminary Invoice - ${invoiceNo}`);

      let emailBody = "";
      let htmlBody: string | undefined = undefined;

      if (orderDetails) {
        const titleText = lang === 'bm' ? 'TEMPAHAN KATERING REKODED' : 'CATERING BOOKING RECORDED';
        const subtitleText = lang === 'bm' ? 'Butiran Tempahan & Invois Awal' : 'Booking Details & Preliminary Invoice';
        const thankYouText = lang === 'bm'
          ? `Terima kasih kerana memilih <strong>Restoran Wawasan</strong>! Butiran tempahan katering anda telah berjaya direkodkan. Sila dapati salinan butiran lengkap pesanan anda di bawah.`
          : `Thank you for choosing <strong>Restoran Wawasan</strong>! Your catering booking details have been successfully recorded. Please find a copy of your complete order details below.`;
        
        const footerText = lang === 'bm'
          ? 'E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan.'
          : 'This is an automatically generated email. Please contact us if you have any questions.';

        const mealLabels: Record<string, string> = {
          'breakfast': lang === 'bm' ? 'Sarapan (Breakfast)' : 'Breakfast (Sarapan)',
          'lunch': lang === 'bm' ? 'Makan Tengahari (Lunch)' : 'Lunch (Makan Tengahari)',
          'tea_break': lang === 'bm' ? 'Minum Petang (High Tea)' : 'High Tea (Minum Petang)',
          'dinner': lang === 'bm' ? 'Makan Malam (Dinner)' : 'Dinner (Makan Malam)'
        };
        const formattedMeals = Array.isArray(orderDetails.meals)
          ? orderDetails.meals.map((m: string) => mealLabels[m] || m).join(', ')
          : (orderDetails.meals || 'N/A');

        htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f7fafc;
                margin: 0;
                padding: 20px;
                color: #2d3748;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                border: 1px solid #e2e8f0;
              }
              .header {
                background-color: #1a202c;
                padding: 30px;
                text-align: center;
                color: #ffffff;
                border-bottom: 3px solid #D4AF37;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 0.05em;
                color: #D4AF37;
              }
              .header p {
                margin: 5px 0 0 0;
                color: #a0aec0;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
              }
              .content {
                padding: 30px;
              }
              .greeting {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 25px;
              }
              .section-title {
                font-size: 16px;
                font-weight: 700;
                color: #1a202c;
                border-bottom: 2px solid #edf2f7;
                padding-bottom: 8px;
                margin-top: 25px;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .detail-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 14px;
              }
              .detail-table td {
                padding: 10px 12px;
                vertical-align: top;
                border-bottom: 1px solid #f7fafc;
              }
              .detail-table td.label {
                width: 35%;
                color: #718096;
                font-weight: 600;
                background-color: #fcfcfc;
              }
              .detail-table td.value {
                width: 65%;
                color: #2d3748;
                font-weight: 500;
              }
              .notes-box {
                background-color: #fffaf0;
                border: 1px solid #feebc8;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
                font-size: 14px;
              }
              .notes-title {
                color: #dd6b20;
                font-weight: 700;
                margin-bottom: 5px;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.05em;
              }
              .notes-content {
                color: #7b341e;
                line-height: 1.5;
              }
              .footer {
                background-color: #f7fafc;
                padding: 25px;
                text-align: center;
                font-size: 12px;
                color: #a0aec0;
                border-top: 1px solid #edf2f7;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>RESTORAN WAWASAN</h1>
                <p>${titleText}</p>
                <div style="font-size: 12px; color: #cbd5e0; margin-top: 4px;">${subtitleText}</div>
              </div>
              <div class="content">
                <div class="greeting">
                  <p style="margin-top: 0; font-weight: 700; font-size: 18px; color: #1a202c;">
                    ${lang === 'bm' ? 'Salam' : 'Hello'} ${name || 'Customer'},
                  </p>
                  <p style="color: #4a5568; margin-bottom: 0;">${thankYouText}</p>
                </div>

                <div class="section-title">${lang === 'bm' ? 'BUTIRAN MAJLIS' : 'EVENT DETAILS'}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Syarikat / Organisasi' : 'Company / Organization'}</td>
                    <td class="value">${orderDetails.to || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Untuk Perhatian (Attn)' : 'Attention (Attn)'}</td>
                    <td class="value">${orderDetails.attn || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Nama PIC' : 'PIC Name'}</td>
                    <td class="value">${orderDetails.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Siri Hubungan' : 'Contact Number'}</td>
                    <td class="value">${orderDetails.contact || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Alamat E-mel' : 'Email Address'}</td>
                    <td class="value">${orderDetails.email || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Tarikh Majlis' : 'Event Date'}</td>
                    <td class="value" style="color: #2b6cb0; font-weight: 700;">${orderDetails.date || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Masa Penghantaran' : 'Delivery Time'}</td>
                    <td class="value">${orderDetails.time || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Lokasi / Alamat Majlis' : 'Event Venue'}</td>
                    <td class="value">${orderDetails.location || 'N/A'}</td>
                  </tr>
                </table>

                <div class="section-title">${lang === 'bm' ? 'PILIHAN MENU & HIDANGAN' : 'MENU & MEAL SELECTION'}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Pakej Pilihan' : 'Selected Package'}</td>
                    <td class="value" style="font-weight: 700; color: #1a202c;">${orderDetails.menu || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Bilangan Pax' : 'Quantity (Pax)'}</td>
                    <td class="value" style="font-weight: 700; color: #2b6cb0;">${orderDetails.quantity || 'N/A'} Pax</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === 'bm' ? 'Jenis Hidangan' : 'Meal Types'}</td>
                    <td class="value">${formattedMeals}</td>
                  </tr>
                </table>

                ${orderDetails.notes ? `
                  <div class="notes-box">
                    <div class="notes-title">${lang === 'bm' ? 'PERMINTAAN KHAS / NOTA' : 'SPECIAL REQUESTS / NOTES'}</div>
                    <div class="notes-content">${orderDetails.notes.replace(/\n/g, '<br>')}</div>
                  </div>
                ` : ''}

                <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 15px; text-align: center; font-size: 14px; color: #2b6cb0; font-weight: 600;">
                  ${lang === 'bm' 
                    ? `Salinan invois awal (${invoiceNo}) telah dilampirkan bersama e-mel ini.` 
                    : `A copy of your preliminary invoice (${invoiceNo}) has been attached to this email.`}
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">${footerText}</p>
                <p style="margin: 5px 0 0 0; font-weight: 600; color: #718096;">Restoran Wawasan Putrajaya</p>
                <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Restoran Wawasan. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        emailBody = lang === 'bm'
          ? `Salam ${name || 'Pelanggan'},\n\nSila dapati lampiran invois untuk rujukan anda.\n\nTerima kasih.\nRestoran Wawasan`
          : `Dear ${name || 'Customer'},\n\nPlease find attached the invoice for your reference.\n\nThank you.\nRestoran Wawasan`;
      }

      // Convert base64 back to buffer
      const pdfBuffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64');

      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SENDER_EMAIL || 'madnor.noisy@gmail.com'}>`,
        to: email,
        subject: emailSubject,
        text: htmlBody ? undefined : emailBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${invoiceNo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log(`Invoice email sent successfully to ${email}`);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Admin Login Endpoint
  app.post("/api/admin/login", (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!password || password !== adminPassword) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid password" });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("Admin login API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Gated Admin orders operations bypassing client-side security restrictions via Client SDK
  app.post("/api/admin/subscribe-to-topic", async (req, res) => {
    try {
      const { token, topic } = req.body;
      if (!token || !topic) {
        return res.status(400).json({ error: "Missing token or topic" });
      }
      
      const app = getAdminApp();
      await admin.messaging(app).subscribeToTopic(token, topic);
      console.log(`Successfully subscribed token to topic ${topic}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error subscribing to topic:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.post("/api/admin/orders", async (req, res) => {
    try {
      const { password, action, orderId, data } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!password || password !== adminPassword) {
        return res.status(401).json({ error: "Unauthorized: Invalid password" });
      }

      if (action === "fetch") {
        const orders: Record<string, unknown>[] = [];
        try {
          const adminDb = getFirestore();
          const snapshot = await adminDb.collection("orders").orderBy("createdAt", "desc").get();
          snapshot.forEach((docSnap) => {
            const docData = docSnap.data();
            const createdAt = docData.createdAt as { seconds?: number; nanoseconds?: number } | null;
            orders.push({
              id: docSnap.id,
              ...docData,
              createdAt: createdAt ? {
                seconds: createdAt.seconds,
                nanoseconds: createdAt.nanoseconds
              } : null
            });
          });
        } catch (dbErr) {
          console.warn("Firestore fetch failed, relying on local backup:", dbErr);
        }

        // Merge with local orders
        const localOrders = getLocalOrders();
        localOrders.forEach((localOrder) => {
          if (!orders.some(o => o.id === localOrder.id)) {
            orders.push(localOrder);
          }
        });

        // Sort merged orders by createdAt descending
        orders.sort((a, b) => {
          interface OrderWithTimestamp {
            createdAt?: { seconds?: number; nanoseconds?: number } | null;
          }
          const secA = ((a as unknown) as OrderWithTimestamp).createdAt?.seconds || 0;
          const secB = ((b as unknown) as OrderWithTimestamp).createdAt?.seconds || 0;
          return secB - secA;
        });

        return res.json({ success: true, orders });
      }

      if (action === "update") {
        if (!orderId || !data) {
          return res.status(400).json({ error: "Missing orderId or data for update" });
        }
        
        let updatedInFirestore = false;
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).update(data));
          updatedInFirestore = true;
        } catch (dbErr) {
          console.warn("Firestore update failed after retries, relying on local backup:", dbErr);
        }

        // Also update in local orders
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...data
          };
          saveLocalOrders(localOrders);
        } else if (!updatedInFirestore) {
          const newLocalOrder = {
            id: orderId,
            ...data,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
          };
          localOrders.push(newLocalOrder);
          saveLocalOrders(localOrders);
        }

        // Trigger Google Calendar sync for updated order
        syncGoogleCalendarEvent(orderId).catch(err => {
          console.error("Background Google Calendar event sync error during admin update:", err);
        });

        return res.json({ success: true });
      }

      if (action === "delete") {
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId for delete" });
        }
        
        try {
          const adminDb = getFirestore();
          await runWithRetry(() => adminDb.collection("orders").doc(orderId).delete());
        } catch (dbErr) {
          console.warn("Firestore delete failed after retries, relying on local backup:", dbErr);
        }

        // Also delete in local orders
        const localOrders = getLocalOrders();
        const filtered = localOrders.filter(o => o.id !== orderId);
        if (filtered.length !== localOrders.length) {
          saveLocalOrders(filtered);
        }

        return res.json({ success: true });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (err) {
      console.error("Admin orders API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // Vite middleware for development - check if we are in production
  const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(path.join(process.cwd(), "dist/index.html"));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
