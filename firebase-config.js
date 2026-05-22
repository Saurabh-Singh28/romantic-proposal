/**
 * Firebase Config & Analytics Tracking Module
 * -------------------------------------------------------------
 * Paste your actual Firebase Web Config keys here from firebase.google.com.
 * If you leave it as placeholders, the app will gracefully activate the
 * live overlay Developer console to track metrics locally!
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- REPLACE THESE WITH YOUR FIREBASE CONFIGURATION KEYS ---
const firebaseConfig = {
  apiKey: "AIzaSyA6jISWoF7yzLtkc-c_9z3cW8RLQJizg4I",
  authDomain: "dys-s-cdcd5.firebaseapp.com",
  projectId: "dys-s-cdcd5",
  storageBucket: "dys-s-cdcd5.firebasestorage.app",
  messagingSenderId: "84464679047",
  appId: "1:84464679047:web:b1405b63e021b448aee022",
  measurementId: "G-KXNP2EJSC8"
};

let db = null;
let isFirebaseActive = false;
let sessionDocId = "";

// Generate a unique session ID
const generateSessionId = () => {
  return "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
};

// Check if configuration is updated
const isConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("YOUR_")
  );
};

// Initialize Firebase
try {
  if (isConfigured()) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully!");
  } else {
    console.warn("⚠️ Firebase is using placeholder keys. Activating the visual local debug tracker!");
  }
} catch (error) {
  console.error("❌ Error initializing Firebase:", error);
}

// In-Memory state for the local debug dashboard
const localState = {
  sessionId: generateSessionId(),
  wrongPasswordAttempts: 0,
  backClickCount: 0,
  noClickCount: 0,
  finalAnswer: "Pending",
  sessionDuration: 0,
  deviceInfo: navigator.userAgent,
  isActive: isFirebaseActive
};

// Synchronize debug console UI
const updateDebugUI = () => {
  const elements = {
    "debug-status": localState.isActive ? "🟢 Connected (Firebase)" : "🟡 Offline (Local Tracking Active)",
    "debug-id": localState.sessionId,
    "debug-wrong-pwd": localState.wrongPasswordAttempts,
    "debug-back-clicks": localState.backClickCount,
    "debug-no-clicks": localState.noClickCount,
    "debug-duration": localState.sessionDuration + "s",
    "debug-answer": localState.finalAnswer
  };

  for (const [id, val] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      if (id === "debug-status") {
        el.className = localState.isActive ? "status-online" : "status-offline";
      }
      if (id === "debug-answer") {
        el.className = val === "Yes" ? "answer-yes" : "answer-pending";
      }
    }
  }
};

/**
 * Start standard session tracking document
 */
export const startSession = async () => {
  sessionDocId = localState.sessionId;
  const initialData = {
    sessionId: sessionDocId,
    wrongPasswordAttempts: 0,
    backClickCount: 0,
    noClickCount: 0,
    finalAnswer: "Pending",
    sessionDurationSeconds: 0,
    deviceInfo: localState.deviceInfo,
    startedAt: serverTimestamp ? serverTimestamp() : new Date(),
    lastUpdatedAt: serverTimestamp ? serverTimestamp() : new Date()
  };

  if (isFirebaseActive && db) {
    try {
      await setDoc(doc(db, "proposals", sessionDocId), initialData);
      console.log(`📊 Session doc created in Firestore: proposals/${sessionDocId}`);
    } catch (error) {
      console.error("❌ Failed to create session in Firebase:", error);
    }
  } else {
    console.log("📊 Session tracking initiated (Local Mode):", initialData);
  }
  updateDebugUI();
};

/**
 * Increment and update a specific session metric
 * @param {string} metricName - wrongPasswordAttempts, backClickCount, noClickCount
 */
export const incrementMetric = async (metricName) => {
  if (metricName in localState) {
    localState[metricName]++;
  }
  updateDebugUI();

  if (isFirebaseActive && db && sessionDocId) {
    try {
      const updateData = {
        lastUpdatedAt: serverTimestamp ? serverTimestamp() : new Date()
      };
      
      if (metricName === "wrongPasswordAttempts") {
        updateData.wrongPasswordAttempts = localState.wrongPasswordAttempts;
      } else if (metricName === "backClickCount") {
        updateData.backClickCount = localState.backClickCount;
      } else if (metricName === "noClickCount") {
        updateData.noClickCount = localState.noClickCount;
      }

      await updateDoc(doc(db, "proposals", sessionDocId), updateData);
    } catch (error) {
      console.error(`❌ Failed to update metric: ${metricName}`, error);
    }
  }
};

/**
 * Set the final answer metric (Yes/No)
 * @param {string} answer - "Yes" or other value
 */
export const submitFinalAnswer = async (answer) => {
  localState.finalAnswer = answer;
  updateDebugUI();

  if (isFirebaseActive && db && sessionDocId) {
    try {
      await updateDoc(doc(db, "proposals", sessionDocId), {
        finalAnswer: answer,
        lastUpdatedAt: serverTimestamp ? serverTimestamp() : new Date()
      });
      console.log(`🎉 Final Answer '${answer}' logged to Firestore!`);
    } catch (error) {
      console.error("❌ Failed to submit final answer:", error);
    }
  }
};

/**
 * Sync elapsed session duration in seconds
 * @param {number} secondsElapsed
 */
export const updateDuration = async (secondsElapsed) => {
  localState.sessionDuration = secondsElapsed;
  updateDebugUI();

  if (isFirebaseActive && db && sessionDocId) {
    try {
      await updateDoc(doc(db, "proposals", sessionDocId), {
        sessionDurationSeconds: secondsElapsed,
        lastUpdatedAt: serverTimestamp ? serverTimestamp() : new Date()
      });
    } catch (error) {
      // Slit silent to prevent logging bloat on tick
    }
  }
};
