# Wawasan Pak Usop 📱🍔

A highly interactive and professional web and mobile application designed for **Restoran Wawasan Pak Usop**. It is built using **React, TypeScript, Vite, Tailwind CSS, and Capacitor** to deliver a premium responsive experience that can be built directly into an Android APK, backed by a robust and resilient Express backend.

---

## 🌟 Key Features

*   **Premium Interactive Landing Page**: Modern visual design featuring elegant typography, fluid transitions, and a local Malay-inspired aesthetic.
*   **Dynamic Order System**: Customers can customize orders, calculate totals dynamically, and select preferred delivery or pickup modes.
*   **Automated PDF Invoicing**: Uses client-side PDF generation (`jspdf` & `jspdf-autotable`) to create beautiful, printable receipts instantly in both English and Bahasa Melayu.
*   **Interactive Admin Dashboard**: Admin view to manage active orders, review restaurant analytics, and inspect customer inquiries.
*   **Fully Wrapped Mobile Shell**: Fully integrated with `@capacitor/core` and `@capacitor/android` to enable packaging as a native Android App (APK).
*   **Resilient Hybrid Database**: Automated self-healing dual-layer database that synchronizes Firestore records with a local `orders.json` backup on the server, ensuring zero data loss during network disruptions.
*   **Google Calendar Syncing**: Automatically creates and updates catering events on Google Calendar for seamless tracking of event dates and times.
*   **Professional Email Receipts**: Generates and mails beautiful HTML-designed receipts to customers using SMTP and Nodemailer.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19), TypeScript, Vite, Tailwind CSS
*   **Animations**: Motion (`motion/react`)
*   **Native Shell**: Capacitor (v7/8)
*   **Receipt Engine**: `jspdf` & `jspdf-autotable`
*   **Backend**: Node.js + Express (running in CommonJS bundled format)
*   **Email Engine**: Nodemailer with HTML templates
*   **Integrations**: Firebase SDK (Firestore & Authentication) & Google APIs (Calendar JWT Auth)

---

## 🗄️ Database & Environment Configuration

This app uses **Firebase Firestore** for its backend data with a dual-environment configuration setup located in `src/firebaseConfig.ts`. It is also backed by a local self-healing database `orders.json` to prevent transactional data loss in case of cloud network failures.

### Sandbox vs. Production
*   **Sandbox (Development)**: Used for local testing, the AI Studio preview, and testing the Debug APK without touching real live data. It writes to the designated AI Studio database and uses local `orders.json` backups.
*   **Production (Live)**: Used for the final release builds when connected to actual production data.

### Switching Environments for the APK
Before compiling your APK, you can manually control the environment in `src/firebaseConfig.ts`:
*   **For Local Debugging (Sandbox Testing)**:
    Force the boolean flag: `const isWorkspace = true;`
*   **For Production Release (Live Data)**:
    Force the boolean flag to `false`, or restore the original hostname detection logic.

**Note:** If you change this environment toggle, you must re-run `npm run build && npx cap sync` to inject the new settings into your Android build before compiling.

---

## 🌐 API Reference (Express Backend)

The server serves both the static React client and several key REST endpoints to support secure transactions, admin controls, and external integrations without exposing private keys.

### 📧 Email & Invoice Services
*   **`POST /api/send-invoice`**
    *   **Description**: Sends a styled PDF receipt to the customer's email.
    *   **Payload**:
        ```json
        {
          "email": "customer@example.com",
          "name": "Customer Name",
          "invoiceNo": "INV-20260704-001",
          "pdfBase64": "data:application/pdf;base64,...",
          "isFinal": true,
          "lang": "bm",
          "orderDetails": { ... }
        }
        ```

### 🔐 Administrative Operations
*   **`POST /api/admin/login`**
    *   **Description**: Verifies the admin password to grant access to the admin dashboard.
    *   **Payload**: `{"password": "your_password"}`
*   **`POST /api/admin/orders`**
    *   **Description**: A unified gateway to fetch, update, or delete order submissions. This endpoint acts as an admin proxy, bypassing Firestore rules by executing operations from the server side.
    *   **Payload (Fetch)**:
        ```json
        {
          "password": "your_password",
          "action": "fetch"
        }
        ```
    *   **Payload (Update)**:
        ```json
        {
          "password": "your_password",
          "action": "update",
          "orderId": "id",
          "data": { ... }
        }
        ```
    *   **Payload (Delete)**:
        ```json
        {
          "password": "your_password",
          "action": "delete",
          "orderId": "id"
        }
        ```

---

## 🔑 Environment Variables (`.env`)

Configure these variables inside your `.env` file at the root level of the project. A template is provided in `.env.example`:

```env
# SMTP Configuration for sending receipts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Firebase Credentials (used by server/client)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Calendar Integration (Service Account Setup)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com

# Admin Authentication
ADMIN_EMAIL=admin@wawasan.com
ADMIN_PASSWORD=wawasan123

# Mobile Target Connectivity
VITE_API_URL=https://your-production-server-url.com
```

---

## 🚀 Step-by-Step Guide to Build the Android APK

Since this project is already fully initialized with **Capacitor**, compiling it into a native Android APK is simple and direct.

### 📋 1. Prerequisites
Before compiling, ensure you have the following installed on your build machine:
*   **Node.js** (v18 or newer)
*   **Java Development Kit (JDK 17)** (required by modern Android Gradle tools)
*   **Android Studio** & **Android SDK** (with Command Line Tools and Build Tools installed)

### 💻 2. Execution Commands

Open your terminal in the root directory of the project and execute the following steps:

#### Step 2.1: Install Dependencies
```bash
npm install
```

#### Step 2.2: Compile Web Assets
This compiles the React app into optimized, static files in the `/dist` directory:
```bash
npm run build
```

#### Step 2.3: Sync Assets to the Android Native Project
This copies the contents of `/dist` into the native Android assets directory and syncs newly installed plugins:
```bash
npx cap sync
```

#### Step 2.4: Build the APK File
You have two options to build the actual `.apk` file:

##### **Option A: Build via Android Studio (Recommended)**
1. Open the Android native project in Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Android Studio to finish indexing and syncing Gradle (this takes a couple of minutes on the first run).
3. In the top menu bar, click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4. Once completed, a popup will appear at the bottom-right of Android Studio. Click **Locate** to retrieve your compiled `app-debug.apk` file.

##### **Option B: Build via Command Line (Gradle)**
You can compile the APK directly from your terminal without opening Android Studio.

*   **On macOS/Linux:**
    ```bash
    ./android/gradlew -p android assembleDebug
    ```
*   **On Windows (Command Prompt / PowerShell):**
    ```cmd
    android\gradlew.bat -p android assembleDebug
    ```

Once finished, the generated APK will be available at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📂 Key Configuration Reference

If you need to customize the app identifier or name, refer to the configuration file in the project root:

### `capacitor.config.ts`
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wawasanpakusop.app', // Unique package name for Android
  appName: 'Wawasan Pak Usop',      // App name visible on the phone launcher
  webDir: 'dist'                     // Directory where built assets reside
};

export default config;
```

---

## 🛠️ Troubleshooting & Tips

1. **Gradle Build Errors / Missing JDK**: If the build fails mentioning Java or Gradle, verify that your environment variable `JAVA_HOME` is pointed to **JDK 17** or above.
2. **Network Requests in APK**: If your APK needs to call an external API, make sure those endpoints are hosted over secure `https://` URLs. Android blocks cleartext `http://` traffic by default unless configured otherwise in the network security config.
3. **Updating Changes**: Whenever you make a change to the React files inside `/src`, you must run:
   ```bash
   npm run build && npx cap sync
   ```
   to update the Android build with your latest code modifications.
