// ============================================================
//  SSI Inventory — Firebase Firestore Integration
//  firebase.js  (place in js/ folder)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDzVVzHlVh5mjg2EruHyHbKQIp0bHqTCeM",
  authDomain: "ssiinventory.firebaseapp.com",
  projectId: "ssiinventory",
  storageBucket: "ssiinventory.firebasestorage.app",
  messagingSenderId: "817558451124",
  appId: "1:817558451124:web:acad56012d3975e9cd4685"
};

// Initialise Firebase (compat SDK loaded via <script> tags in index.html)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const DOC_REF = db.collection('ssi').doc('data');

// ── Persistence flags ──────────────────────────────────────
let _unsubscribe = null;   // holds onSnapshot unsubscribe fn
let _isSaving    = false;  // prevent echo-loop on own saves

// ── Load data from Firestore (falls back to localStorage) ──
async function loadFromFirestore() {
  try {
    const snap = await DOC_REF.get();
    if (snap.exists) {
      console.log('[Firebase] Data loaded from Firestore ✅');
      return snap.data();
    } else {
      console.warn('[Firebase] No Firestore doc yet — checking localStorage');
      const local = localStorage.getItem('ssiData');
      return local ? JSON.parse(local) : null;
    }
  } catch (err) {
    console.error('[Firebase] Load failed, using localStorage:', err);
    const local = localStorage.getItem('ssiData');
    return local ? JSON.parse(local) : null;
  }
}

// ── Save data to Firestore + keep localStorage as offline cache ──
async function saveToFirestore(stateObj) {
  // Always keep a local copy for offline resilience
  try {
    localStorage.setItem('ssiData', JSON.stringify(stateObj));
  } catch (e) { /* quota exceeded – ignore */ }

  try {
    _isSaving = true;
    await DOC_REF.set(stateObj);
    console.log('[Firebase] Saved to Firestore ✅');
  } catch (err) {
    console.error('[Firebase] Save failed (offline?):', err);
  } finally {
    // Small delay so the snapshot listener ignores our own write
    setTimeout(() => { _isSaving = false; }, 1000);
  }
}

// ── Real-time listener — updates all open tabs/devices ──────
function syncListener() {
  if (_unsubscribe) _unsubscribe(); // detach any previous listener

  _unsubscribe = DOC_REF.onSnapshot((snap) => {
    if (!snap.exists) return;
    if (_isSaving) return;  // skip echo from our own save

    const incoming = snap.data();
    // Merge into SSIApp state without overwriting currentUser
    const currentUser = SSIApp.state.currentUser;
    Object.assign(SSIApp.state, incoming);
    SSIApp.state.currentUser = currentUser;

    // Also refresh localStorage cache
    try {
      localStorage.setItem('ssiData', JSON.stringify(SSIApp.state));
    } catch (e) {}

    // Re-render current page so UI reflects remote changes
    const page = document.body.getAttribute('data-page');
    if (page && page !== 'login') {
      const area = document.getElementById('app-area');
      if (area) SSIApp.navigate(page);
    }

    console.log('[Firebase] Real-time update received 🔄');
  }, (err) => {
    console.error('[Firebase] Listener error:', err);
  });

  console.log('[Firebase] Real-time sync listener started 👂');
}

// ── Expose globally ─────────────────────────────────────────
window.SSIFirebase = { db, loadFromFirestore, saveToFirestore, syncListener };
