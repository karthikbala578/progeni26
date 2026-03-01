import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBmGMxfttBKIZt2KeDgCreHmR02Scb7YLM",
  authDomain: "progeni26.firebaseapp.com",
  databaseURL: "https://progeni26-default-rtdb.firebaseio.com",
  projectId: "progeni26",
  storageBucket: "progeni26.firebasestorage.app",
  messagingSenderId: "1016220439484",
  appId: "1:1016220439484:web:dd1d0349d345e5de32d1b9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);