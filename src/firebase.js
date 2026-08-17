import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZvkTeO-efoX0uTGmmSkvugeticgDNJ2s",
  authDomain: "hackathon-demo-39697.firebaseapp.com",
  projectId: "hackathon-demo-39697",
  storageBucket: "hackathon-demo-39697.firebasestorage.app",
  messagingSenderId: "726351839190",
  appId: "1:726351839190:web:70bd30058a652c82e86e77"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);