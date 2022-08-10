// Firebase config
import { initializeApp } from "firebase/app";
import "firebase/firestore";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBB2p_4qlKJkAFJmxdUkbpAuqETr9krIcc",
  authDomain: "fir-rtc-44604.firebaseapp.com",
  projectId: "fir-rtc-44604",
  storageBucket: "fir-rtc-44604.appspot.com",
  messagingSenderId: "515077938596",
  appId: "1:515077938596:web:a9b6abc75eb0c30f6cf531",
};

// Initialize Firebase
initializeApp(firebaseConfig);

export const firestore = getFirestore();
