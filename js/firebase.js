// ============================================================
//  SSI Inventory — Firebase Firestore Integration
//  firebase.js
//  NOTE: Firebase SDK compat scripts MUST be loaded in
//  index.html BEFORE this file via <script> tags.
// ============================================================

(function() {
  'use strict';

  const firebaseConfig = {
    apiKey:            "AIzaSyDzVVzHlVh5mjg2EruHyHbKQIp0bHqTCeM",
    authDomain:        "ssiinventory.firebaseapp.com",
    projectId:         "ssiinventory",
    storageBucket:     "ssiinventory.firebasestorage.app",
    messagingSenderId: "817558451124",
    appId:             "1:817558451124:web:acad56012d3975e9cd4685"
  };

  // Guard: only initialise once
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db      = firebase.firestore();
  const DOC_REF = db.collection('ssi').doc('data');

  let _unsubscribe = null;
  let _isSaving    = false;

  // ── Show / hide sync badge ──────────────────────────────────
  function showSyncBadge() {
    const b = document.getElementById('sync-badge');
    if (!b) return;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2500);
  }

  // ── Load from Firestore (fallback → localStorage) ──────────
  async function loadFromFirestore() {
    try {
      const snap = await DOC_REF.get();
      if (snap.exists) {
        console.log('[SSI Firebase] Loaded from Firestore ✅');
        return snap.data();
      }
      console.warn('[SSI Firebase] No Firestore doc yet — checking localStorage');
    } catch (err) {
      console.error('[SSI Firebase] Firestore load failed:', err);
    }
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('ssiData');
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  // ── Save to Firestore + keep localStorage cache ─────────────
  async function saveToFirestore(stateObj) {
    // Always update local cache first (works offline)
    try { localStorage.setItem('ssiData', JSON.stringify(stateObj)); } catch(e) {}

    try {
      _isSaving = true;
      await DOC_REF.set(stateObj);
      showSyncBadge();
      console.log('[SSI Firebase] Saved to Firestore ✅');
    } catch (err) {
      console.error('[SSI Firebase] Save failed (offline?):', err);
    } finally {
      setTimeout(() => { _isSaving = false; }, 1200);
    }
  }

  // ── Real-time listener (syncs all open tabs / devices) ──────
  function syncListener() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

    _unsubscribe = DOC_REF.onSnapshot(
      (snap) => {
        if (!snap.exists || _isSaving) return;

        const incoming    = snap.data();
        const currentUser = SSIApp.state.currentUser; // keep session

        Object.assign(SSIApp.state, incoming);
        SSIApp.state.currentUser = currentUser;

        // Refresh local cache
        try { localStorage.setItem('ssiData', JSON.stringify(SSIApp.state)); } catch(e) {}

        // Re-render current page
        const page = document.body.getAttribute('data-page');
        if (page && page !== 'login') SSIApp.navigate(page);

        console.log('[SSI Firebase] Real-time update received 🔄');
      },
      (err) => { console.error('[SSI Firebase] Listener error:', err); }
    );

    console.log('[SSI Firebase] Real-time listener started 👂');
  }

  // ── Expose globally ─────────────────────────────────────────
  window.SSIFirebase = { db, loadFromFirestore, saveToFirestore, syncListener };

})();
