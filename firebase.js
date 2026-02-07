// firebase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDcDeCacWePRdl3dYeJy7NsS_JCDKx11Fs",
  authDomain: "loginsignup-25f19.firebaseapp.com",
  projectId: "loginsignup-25f19",
  storageBucket: "loginsignup-25f19.firebasestorage.app",
  messagingSenderId: "990041544732",
  appId: "1:990041544732:web:593028d20756f7c97127d9",
  measurementId: "G-8P5PPSZG7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
