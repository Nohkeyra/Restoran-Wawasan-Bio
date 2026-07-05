import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { Capacitor } from '@capacitor/core';
import firebaseAppletConfig from "../firebase-applet-config.json";

// Production configuration for the live database used in compiling the app for the APK
const prodConfig = {
  apiKey: "AIzaSyCaCFMk6K8go9Wgt-jdNd6QTvD8JbsTkY4",
  authDomain: "restoran-wawasan.firebaseapp.com",
  projectId: "restoran-wawasan",
  storageBucket: "restoran-wawasan.firebasestorage.app",
  messagingSenderId: "1019707766959",
  appId: "1:1019707766959:web:78644cddb16b67a69ffc5a",
  firestoreDatabaseId: undefined
};

// Sandbox configuration for the Google AI Studio workspace environment
const sandboxConfig = {
  apiKey: firebaseAppletConfig.apiKey || prodConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain || prodConfig.authDomain,
  projectId: firebaseAppletConfig.projectId || prodConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket || prodConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || prodConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId || prodConfig.appId,
  firestoreDatabaseId: (firebaseAppletConfig as Record<string, string | undefined>).firestoreDatabaseId
};

// Determine if we are running inside the Google AI Studio workspace preview or on a native mobile device.
// When compiled for the APK, we check both hostname and Capacitor state.
const isNative = Capacitor.isNativePlatform();
const isWorkspace = typeof window !== "undefined" && (
  window.location.hostname.endsWith(".run.app") ||
  window.location.hostname.includes("aistudio") ||
  (window.location.hostname === "localhost" && window.location.port === "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port === "3000")
);

// We use sandboxConfig for both workspace and native (APK) by default to ensure 
// the mobile app connects to the same database as the preview.
const firebaseConfig = (isWorkspace || isNative) ? sandboxConfig : prodConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore with active database instance ID if specified
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
