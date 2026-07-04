var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");
var import_googleapis = require("googleapis");
var firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "restoran-wawasan.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "restoran-wawasan",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "restoran-wawasan.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1019707766959",
  appId: process.env.FIREBASE_APP_ID || "1:1019707766959:web:78644cddb16b67a69ffc5a",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-ZWC8H62RZN",
  firestoreDatabaseId: void 0
};
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    const appletConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
    firebaseConfig = {
      ...firebaseConfig,
      ...appletConfig,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || void 0
    };
  }
} catch (err) {
  console.warn("Failed to load local firebase-applet-config.json, using default credentials:", err);
}
var clientApps = (0, import_app.getApps)();
var clientApp = clientApps.length === 0 ? (0, import_app.initializeApp)(firebaseConfig) : clientApps[0];
var db = (0, import_firestore.getFirestore)(clientApp, firebaseConfig.firestoreDatabaseId);
var auth = (0, import_auth.getAuth)(clientApp);
var adminEmail = process.env.ADMIN_EMAIL;
var adminPassword = process.env.ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  (0, import_auth.signInWithEmailAndPassword)(auth, adminEmail, adminPassword).then((userCredential) => {
    console.log(`[Firebase] Server successfully authenticated as admin user: ${userCredential.user.email}`);
  }).catch((err) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = err.code || "";
    if (errorCode === "auth/operation-not-allowed" || errorMessage.includes("auth/operation-not-allowed") || errorMessage.includes("operation-not-allowed")) {
      console.error(
        `
======================================================================
[Firebase ERROR] Server failed to authenticate: auth/operation-not-allowed

REASON: The "Email/Password" sign-in provider is disabled in your Firebase Console.

TO FIX THIS:
1. Go to your Firebase Console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers
2. Under the "Sign-in method" tab, click "Add new provider" (or choose "Email/Password").
3. Toggle "Enable" under the Email/Password setting and click "Save".
4. Re-run or redeploy your app on Render.
======================================================================
`
      );
    } else {
      console.error("[Firebase] Server failed to authenticate as admin user:", errorMessage);
    }
  });
}
var LOCAL_DB_PATH = import_path.default.join(process.cwd(), "orders.json");
async function runWithRetry(fn, retries = 3, delayMs = 1e3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[Firestore Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms... Error:`, error);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }
  throw lastError;
}
function getLocalOrders() {
  try {
    if (import_fs.default.existsSync(LOCAL_DB_PATH)) {
      console.warn("[WARNING] Reading from local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
      return JSON.parse(import_fs.default.readFileSync(LOCAL_DB_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading local orders database:", err);
  }
  return [];
}
function saveLocalOrders(orders) {
  try {
    console.warn("[WARNING] Writing to local fallback file 'orders.json'. Note: This local file system is ephemeral and transient. All local changes will be lost upon container restart or redeployment.");
    import_fs.default.writeFileSync(LOCAL_DB_PATH, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to local orders database:", err);
  }
}
function getGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n") : void 0;
  if (!email || !privateKey) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured. Google Calendar event creation will be skipped.");
    return null;
  }
  try {
    const auth2 = new import_googleapis.google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
    });
    return import_googleapis.google.calendar({ version: "v3", auth: auth2 });
  } catch (err) {
    console.error("Failed to initialize Google Calendar client:", err);
    return null;
  }
}
async function syncGoogleCalendarEvent(orderId, passedOrderData) {
  try {
    const calendar = getGoogleCalendarClient();
    if (!calendar) {
      return;
    }
    let orderData = passedOrderData;
    if (!orderData) {
      try {
        const docSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "orders", orderId));
        if (docSnap.exists()) {
          orderData = docSnap.data();
        }
      } catch (dbErr) {
        console.warn(`Firestore sync load failed for order ${orderId}:`, dbErr);
      }
      if (!orderData) {
        const localOrders = getLocalOrders();
        orderData = localOrders.find((o) => o.id === orderId);
      }
    }
    if (!orderData) {
      console.warn(`Sync Google Calendar Event: Order ${orderId} not found.`);
      return;
    }
    let startDateTime;
    if (orderData.dateTime) {
      startDateTime = new Date(orderData.dateTime);
    } else if (orderData.date) {
      startDateTime = /* @__PURE__ */ new Date(`${orderData.date}T${orderData.time || "12:00"}:00+08:00`);
    } else {
      startDateTime = /* @__PURE__ */ new Date();
    }
    if (isNaN(startDateTime.getTime())) {
      startDateTime = /* @__PURE__ */ new Date();
    }
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1e3);
    const mealList = Array.isArray(orderData.meals) ? orderData.meals.join(", ") : orderData.meals || "";
    const summary = `[${(orderData.status || "pending").toUpperCase()}] Wawasan Order - ${orderData.name || "Customer"} (${orderData.quantity || ""} Pax)`;
    const description = `Customer: ${orderData.name || "N/A"}
Contact: ${orderData.contact || "N/A"}
Email: ${orderData.email || "N/A"}
Pax (Quantity): ${orderData.quantity || "N/A"}
Meals: ${mealList || "N/A"}
Menu: ${orderData.menu || "N/A"}
Location: ${orderData.location || "N/A"}
Notes: ${orderData.notes || "N/A"}
Status: ${orderData.status || "N/A"}
Total Amount: ${orderData.totalAmount !== void 0 ? `RM ${Number(orderData.totalAmount).toFixed(2)}` : "N/A"}`;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const existingEventId = orderData.calendarEventIds?.[calendarId];
    if (existingEventId) {
      try {
        console.log(`Updating existing Google Calendar event ${existingEventId} for order ${orderId}...`);
        await calendar.events.update({
          calendarId,
          eventId: existingEventId,
          requestBody: {
            summary,
            description,
            location: orderData.location || "",
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur"
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur"
            }
          }
        });
        console.log(`Google Calendar event ${existingEventId} updated successfully.`);
        return;
      } catch (updateErr) {
        const errObj = updateErr;
        if (errObj && (errObj.status === 404 || errObj.message && errObj.message.includes("Not Found"))) {
          console.warn(`Existing calendar event ${existingEventId} not found or deleted on calendar, recreating...`);
        } else {
          throw updateErr;
        }
      }
    }
    console.log(`Creating new Google Calendar event for order ${orderId}...`);
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        location: orderData.location || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur"
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur"
        }
      }
    });
    const eventId = response.data.id;
    if (eventId) {
      console.log(`Google Calendar event created successfully! Event Link: ${response.data.htmlLink}`);
      const updatedCalendarEventIds = {
        ...orderData.calendarEventIds || {},
        [calendarId]: eventId
      };
      try {
        await (0, import_firestore.updateDoc)((0, import_firestore.doc)(db, "orders", orderId), {
          calendarEventIds: updatedCalendarEventIds
        });
        console.log(`Firestore updated with calendarEventIds for order ${orderId}`);
      } catch (dbErr) {
        console.warn(`Failed to update calendarEventIds in Firestore for order ${orderId}:`, dbErr);
      }
      try {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex((o) => o.id === orderId);
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
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  const transporter = import_nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Configuration/Connection Error:", error);
    } else {
      console.log("SMTP connection verified! Server is ready to send emails.");
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      let orderId = "";
      let savedInFirestore = false;
      try {
        const docRef = await runWithRetry(() => (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "orders"), {
          ...orderData,
          adminPasscode: process.env.ADMIN_PASSWORD || "wawasan123"
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
          createdAt: { seconds: Math.floor(Date.now() / 1e3), nanoseconds: 0 }
        });
        saveLocalOrders(localOrders);
      }
      syncGoogleCalendarEvent(orderId, orderData).catch((err) => {
        console.error("Background Google Calendar event creation error:", err);
      });
      res.json({ success: true, id: orderId });
    } catch (err) {
      console.error("Order submission endpoint error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
  app.post("/api/submissions/bill", async (req, res) => {
    try {
      const { submissionId, totalAmount, pdfBase64, fileName, collectionName = "submissions" } = req.body;
      if (!submissionId) {
        return res.status(400).json({ error: "Missing submissionId" });
      }
      if (totalAmount === void 0 || totalAmount === null || isNaN(Number(totalAmount))) {
        return res.status(400).json({ error: "Invalid or missing totalAmount" });
      }
      const parsedAmount = Number(totalAmount);
      let data = null;
      let isLocal = false;
      try {
        const docRef = (0, import_firestore.doc)(db, collectionName, submissionId);
        const docSnap = await (0, import_firestore.getDoc)(docRef);
        if (docSnap.exists()) {
          data = docSnap.data();
        }
      } catch (dbErr) {
        console.warn("Firestore fetch in bill failed, trying local backup:", dbErr);
      }
      if (!data) {
        const localOrders = getLocalOrders();
        const found = localOrders.find((o) => o.id === submissionId);
        if (found) {
          data = found;
          isLocal = true;
        }
      }
      if (!data) {
        return res.status(404).json({ error: `Document not found in ${collectionName}` });
      }
      const updatedFields = {
        totalAmount: parsedAmount,
        status: "billed",
        billedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (!isLocal) {
        try {
          const docRef = (0, import_firestore.doc)(db, collectionName, submissionId);
          await runWithRetry(() => (0, import_firestore.updateDoc)(docRef, updatedFields));
        } catch (dbErr) {
          console.warn("Firestore update in bill failed after retries, syncing locally:", dbErr);
          isLocal = true;
        }
      }
      if (isLocal) {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex((o) => o.id === submissionId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            ...updatedFields
          };
          saveLocalOrders(localOrders);
        }
      }
      if (collectionName === "orders") {
        syncGoogleCalendarEvent(submissionId).catch((err) => {
          console.error("Background Google Calendar event sync error during billing:", err);
        });
      }
      const customerEmail = data.customerEmail || data.email;
      const customerName = data.customerName || data.name || "Valued Customer";
      const invoiceNo = data.invoiceNo || `INV-${submissionId.substring(0, 6).toUpperCase()}`;
      const items = data.items || [];
      const lang = data.lang || "en";
      if (!customerEmail) {
        return res.json({
          success: true,
          message: "Document successfully updated to 'billed', but no customer email was found in the document to send an invoice."
        });
      }
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      if (!smtpUser || !smtpPass) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.json({
          success: true,
          message: "Document successfully updated to 'billed', but email could not be sent because SMTP is not configured on the server."
        });
      }
      let itemsHtml = "";
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
        items.forEach((item) => {
          const name = item.name || item.title || "Item";
          const qty = item.qty || item.quantity || 1;
          const price = item.price !== void 0 ? `RM ${Number(item.price).toFixed(2)}` : "-";
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
      const emailSubject = lang === "bm" ? `Invois Rasmi - ${invoiceNo} (Restoran Wawasan)` : `Official Invoice - ${invoiceNo} (Restoran Wawasan)`;
      const titleText = lang === "bm" ? "INVOIS RASMI" : "OFFICIAL INVOICE";
      const billToText = lang === "bm" ? "Bil Kepada:" : "Bill To:";
      const invoiceNoText = lang === "bm" ? "No. Invois:" : "Invoice No:";
      const dateText = lang === "bm" ? "Tarikh:" : "Date:";
      const totalAmountText = lang === "bm" ? "Jumlah Keseluruhan:" : "Total Amount:";
      const thankYouText = lang === "bm" ? "Terima kasih atas kunjungan/pesanan anda di Restoran Wawasan! Sila dapati butiran bil anda di bawah." : "Thank you for your order/visit at Restoran Wawasan! Please find your billing details below.";
      const footerText = lang === "bm" ? "E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan." : "This is an automatically generated email. Please contact us if you have any questions.";
      const formattedDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "long",
        year: "numeric"
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
                <p style="margin-top:0; font-weight: 600; font-size: 18px;">${lang === "bm" ? "Salam" : "Hello"} ${customerName},</p>
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
              <p style="margin: 5px 0 0 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Restoran Wawasan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      const emailAttachments = [];
      if (pdfBase64) {
        emailAttachments.push({
          filename: fileName || `Invoice_${invoiceNo}.pdf`,
          content: pdfBase64,
          encoding: "base64"
        });
      }
      await transporter.sendMail({
        from: `"Restoran Wawasan" <${smtpUser}>`,
        to: customerEmail,
        subject: emailSubject,
        html: htmlBody,
        attachments: emailAttachments.length > 0 ? emailAttachments : void 0
      });
      console.log(`Invoice email sent successfully to ${customerEmail} for submission ${submissionId}`);
      res.json({
        success: true,
        message: "Submission updated and invoice email sent successfully",
        data: {
          submissionId,
          totalAmount: parsedAmount,
          status: "billed",
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
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured. Please configure SMTP_USER and SMTP_PASS.");
        return res.status(500).json({ error: "Email service not configured." });
      }
      const emailSubject = lang === "bm" ? isFinal ? `Invois Muktamad - ${invoiceNo}` : `Invois Awal - ${invoiceNo}` : isFinal ? `Final Invoice - ${invoiceNo}` : `Preliminary Invoice - ${invoiceNo}`;
      let emailBody = "";
      let htmlBody = void 0;
      if (orderDetails) {
        const titleText = lang === "bm" ? "TEMPAHAN KATERING REKODED" : "CATERING BOOKING RECORDED";
        const subtitleText = lang === "bm" ? "Butiran Tempahan & Invois Awal" : "Booking Details & Preliminary Invoice";
        const thankYouText = lang === "bm" ? `Terima kasih kerana memilih <strong>Restoran Wawasan</strong>! Butiran tempahan katering anda telah berjaya direkodkan. Sila dapati salinan butiran lengkap pesanan anda di bawah.` : `Thank you for choosing <strong>Restoran Wawasan</strong>! Your catering booking details have been successfully recorded. Please find a copy of your complete order details below.`;
        const footerText = lang === "bm" ? "E-mel ini dijanakan secara automatik. Sila hubungi kami jika terdapat sebarang pertanyaan." : "This is an automatically generated email. Please contact us if you have any questions.";
        const mealLabels = {
          "breakfast": lang === "bm" ? "Sarapan (Breakfast)" : "Breakfast (Sarapan)",
          "lunch": lang === "bm" ? "Makan Tengahari (Lunch)" : "Lunch (Makan Tengahari)",
          "tea_break": lang === "bm" ? "Minum Petang (High Tea)" : "High Tea (Minum Petang)",
          "dinner": lang === "bm" ? "Makan Malam (Dinner)" : "Dinner (Makan Malam)"
        };
        const formattedMeals = Array.isArray(orderDetails.meals) ? orderDetails.meals.map((m) => mealLabels[m] || m).join(", ") : orderDetails.meals || "N/A";
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
                    ${lang === "bm" ? "Salam" : "Hello"} ${name || "Customer"},
                  </p>
                  <p style="color: #4a5568; margin-bottom: 0;">${thankYouText}</p>
                </div>

                <div class="section-title">${lang === "bm" ? "BUTIRAN MAJLIS" : "EVENT DETAILS"}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === "bm" ? "Syarikat / Organisasi" : "Company / Organization"}</td>
                    <td class="value">${orderDetails.to || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Untuk Perhatian (Attn)" : "Attention (Attn)"}</td>
                    <td class="value">${orderDetails.attn || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Nama PIC" : "PIC Name"}</td>
                    <td class="value">${orderDetails.name || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Siri Hubungan" : "Contact Number"}</td>
                    <td class="value">${orderDetails.contact || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Alamat E-mel" : "Email Address"}</td>
                    <td class="value">${orderDetails.email || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Tarikh Majlis" : "Event Date"}</td>
                    <td class="value" style="color: #2b6cb0; font-weight: 700;">${orderDetails.date || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Masa Penghantaran" : "Delivery Time"}</td>
                    <td class="value">${orderDetails.time || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Lokasi / Alamat Majlis" : "Event Venue"}</td>
                    <td class="value">${orderDetails.location || "N/A"}</td>
                  </tr>
                </table>

                <div class="section-title">${lang === "bm" ? "PILIHAN MENU & HIDANGAN" : "MENU & MEAL SELECTION"}</div>
                <table class="detail-table">
                  <tr>
                    <td class="label">${lang === "bm" ? "Pakej Pilihan" : "Selected Package"}</td>
                    <td class="value" style="font-weight: 700; color: #1a202c;">${orderDetails.menu || "N/A"}</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Bilangan Pax" : "Quantity (Pax)"}</td>
                    <td class="value" style="font-weight: 700; color: #2b6cb0;">${orderDetails.quantity || "N/A"} Pax</td>
                  </tr>
                  <tr>
                    <td class="label">${lang === "bm" ? "Jenis Hidangan" : "Meal Types"}</td>
                    <td class="value">${formattedMeals}</td>
                  </tr>
                </table>

                ${orderDetails.notes ? `
                  <div class="notes-box">
                    <div class="notes-title">${lang === "bm" ? "PERMINTAAN KHAS / NOTA" : "SPECIAL REQUESTS / NOTES"}</div>
                    <div class="notes-content">${orderDetails.notes.replace(/\n/g, "<br>")}</div>
                  </div>
                ` : ""}

                <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 15px; text-align: center; font-size: 14px; color: #2b6cb0; font-weight: 600;">
                  ${lang === "bm" ? `Salinan invois awal (${invoiceNo}) telah dilampirkan bersama e-mel ini.` : `A copy of your preliminary invoice (${invoiceNo}) has been attached to this email.`}
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">${footerText}</p>
                <p style="margin: 5px 0 0 0; font-weight: 600; color: #718096;">Restoran Wawasan Putrajaya</p>
                <p style="margin: 5px 0 0 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Restoran Wawasan. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        emailBody = lang === "bm" ? `Salam ${name || "Pelanggan"},

Sila dapati lampiran invois untuk rujukan anda.

Terima kasih.
Restoran Wawasan` : `Dear ${name || "Customer"},

Please find attached the invoice for your reference.

Thank you.
Restoran Wawasan`;
      }
      const pdfBuffer = Buffer.from(pdfBase64.split(",")[1] || pdfBase64, "base64");
      await transporter.sendMail({
        from: `"Restoran Wawasan" <${process.env.SMTP_USER}>`,
        to: email,
        subject: emailSubject,
        text: htmlBody ? void 0 : emailBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${invoiceNo}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
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
  app.post("/api/admin/login", (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword2 = process.env.ADMIN_PASSWORD;
      if (!password || password !== adminPassword2) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid password" });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("Admin login API error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });
  app.post("/api/admin/orders", async (req, res) => {
    try {
      const { password, action, orderId, data } = req.body;
      const adminPassword2 = process.env.ADMIN_PASSWORD;
      if (!password || password !== adminPassword2) {
        return res.status(401).json({ error: "Unauthorized: Invalid password" });
      }
      if (action === "fetch") {
        const orders = [];
        try {
          const q = (0, import_firestore.query)((0, import_firestore.collection)(db, "orders"), (0, import_firestore.orderBy)("createdAt", "desc"));
          const snapshot = await (0, import_firestore.getDocs)(q);
          snapshot.forEach((docSnap) => {
            const docData = docSnap.data();
            const createdAt = docData.createdAt;
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
        const localOrders = getLocalOrders();
        localOrders.forEach((localOrder) => {
          if (!orders.some((o) => o.id === localOrder.id)) {
            orders.push(localOrder);
          }
        });
        orders.sort((a, b) => {
          const secA = a.createdAt?.seconds || 0;
          const secB = b.createdAt?.seconds || 0;
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
          await runWithRetry(() => (0, import_firestore.updateDoc)((0, import_firestore.doc)(db, "orders", orderId), data));
          updatedInFirestore = true;
        } catch (dbErr) {
          console.warn("Firestore update failed after retries, relying on local backup:", dbErr);
        }
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex((o) => o.id === orderId);
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
            createdAt: { seconds: Math.floor(Date.now() / 1e3), nanoseconds: 0 }
          };
          localOrders.push(newLocalOrder);
          saveLocalOrders(localOrders);
        }
        syncGoogleCalendarEvent(orderId).catch((err) => {
          console.error("Background Google Calendar event sync error during admin update:", err);
        });
        return res.json({ success: true });
      }
      if (action === "delete") {
        if (!orderId) {
          return res.status(400).json({ error: "Missing orderId for delete" });
        }
        try {
          await runWithRetry(() => (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "orders", orderId)));
        } catch (dbErr) {
          console.warn("Firestore delete failed after retries, relying on local backup:", dbErr);
        }
        const localOrders = getLocalOrders();
        const filtered = localOrders.filter((o) => o.id !== orderId);
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
  const isProduction = process.env.NODE_ENV === "production" && import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist/index.html"));
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
