import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase Web SDK configuration identifies the project; it is not an admin secret.
// Firestore authorization is enforced separately by server-side Security Rules.
const firebaseConfig = {
  apiKey: 'AIzaSyBnFulImyHnrH9YaWupzWQw7vNmFjq3UEs',
  authDomain: 'attendance-app-v2-b0133.firebaseapp.com',
  projectId: 'attendance-app-v2-b0133',
  storageBucket: 'attendance-app-v2-b0133.firebasestorage.app',
  messagingSenderId: '326802240648',
  appId: '1:326802240648:web:0219a1f2daf434442e5b3d',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
