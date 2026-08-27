import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyC9MZy5W541_EbIZZJT9nXrvrS7gyx8wQc",
  authDomain: "phone-18908.firebaseapp.com",
  projectId: "phone-18908",
  storageBucket: "phone-18908.firebasestorage.app",
  messagingSenderId: "607131218487",
  appId: "1:607131218487:web:deef94c88a161fcb5b85b2",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
