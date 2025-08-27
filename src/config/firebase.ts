// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApXtfSzd-lexTDqv_SN2hys39ArZMBrCs",
  authDomain: "losgamers-website.firebaseapp.com",
  projectId: "losgamers-website",
  storageBucket: "losgamers-website.firebasestorage.app",
  messagingSenderId: "2782474569",
  appId: "1:2782474569:web:139978c2c8e18e456e2a98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Add some debugging
console.log('Firebase initialized with config:', {
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket
});

export default app;
