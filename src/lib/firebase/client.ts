import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase จะไม่ถูก initialize ระหว่างการเปิดหน้า UI preview
 * เรียกฟังก์ชันนี้เมื่อเตรียม Firebase โปรเจกต์ทดสอบและ Security Rules แล้วเท่านั้น
 */
export function getFirebaseServices() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  if (Object.values(config).some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error("Firebase test environment has not been configured");
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app)
  };
}
