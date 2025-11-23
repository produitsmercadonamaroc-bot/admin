import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC0YUGE6hRG9sck7rXcqjaB3he1nRGgbbU",
  authDomain: "elhajiauto.firebaseapp.com",
  projectId: "elhaji-auto",
  storageBucket: "elhaji-auto.appspot.com",
  messagingSenderId: "596529784342",
  appId: "1:596529784342:web:dfa01b1e33287ce36db737"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);