import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDkU88zoYfO7URAqi19qtIDGs25zkgJ4_g",
    authDomain: "ai-code-typer-db.firebaseapp.com",
    projectId: "ai-code-typer-db",
    storageBucket: "ai-code-typer-db.firebasestorage.app",
    messagingSenderId: "713662672910",
    appId: "1:713662672910:web:990f2412b177a3e5fd8c5f",
    measurementId: "G-N1NK71JBG7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
