import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEJ74wHklDp-7r0DvHDm4-Ea-pXty1fk4",
  authDomain: "taskmitpro.firebaseapp.com",
  databaseURL: "https://taskmitpro-default-rtdb.firebaseio.com",
  projectId: "taskmitpro",
  storageBucket: "taskmitpro.firebasestorage.app",
  messagingSenderId: "887447967195",
  appId: "1:887447967195:web:5f88f687398d89bae943fe",
  measurementId: "G-RDSEQVJ7T3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;
