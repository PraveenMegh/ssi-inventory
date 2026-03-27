// ============================================================
//  SSI Inventory — Firebase Firestore Integration (v2)
//  firebase.js
//  Firebase SDK compat scripts MUST be loaded in index.html
//  BEFORE this file.
// ============================================================

(function () {
  'use strict';

  const firebaseConfig = {
    apiKey:            "AIzaSyDzVVzHlVh5mjg2EruHyHbKQIp0bHqTCeM",
    authDomain:        "ssiinventory.firebaseapp.com",
    projectId:         "ssiinventory",
    storageBucket:     "ssiinventory.firebasestorage.app",
    messagingSenderId: "817558451124",
    appId:             "1:817558451124:web:acad56012d3975e9cd4685"
  };

  // Init once
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  // Enable offline persistence so the app works without internet
  const db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('[SSI Firebase] Persistence unavailable (multiple tabs)');
    } else if (err.code === 'unimplemented') {
      console.warn('[SSI Firebase] Persistence not supported in this browser');
    }
  });

  const DOC_REF    = db.collection('ssi').doc('data');
  let _unsubscribe = null;
  let _isSaving    = false;

  // ── Sync badge ──────────────────────────────────────────────
  function showSyncBadge(ok = true) {
    const b = document.getElementById('sync-badge');
    if (!b) return;
    b.textContent  = ok ? '✅ Synced' : '🔴 Offline';
    b.style.background = ok ? '#22c55e' : '#ef4444';
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2500);
  }

  // ── Load (Firestore first, localStorage fallback) ───────────
  async function loadFromFirestore() {
    // Try Firestore with a 6-second timeout
    try {
      const snap = await Promise.race([
        DOC_REF.get(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
      ]);
      if (snap.exists) {
        console.log('[SSI Firebase] Loaded from Firestore ✅');
        showSyncBadge(true);
        return snap.data();
      }
      console.warn('[SSI Firebase] No Firestore doc yet — will seed defaults');
      return null;
    } catch (err) {
      console.error('[SSI Firebase] Firestore load failed:', err.message);
      showSyncBadge(false);
    }

    // Fallback → localStorage
    try {
      const raw = localStorage.getItem('ssiData');
      if (raw) {
        console.log('[SSI Firebase] Loaded from localStorage (offline fallback)');
        return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  }

  // ── Save ────────────────────────────────────────────────────
  async function saveToFirestore(stateObj) {
    // Always keep localStorage in sync (instant, works offline)
    try { localStorage.setItem('ssiData', JSON.stringify(stateObj)); } catch (e) {}

    try {
      _isSaving = true;
      await DOC_REF.set(stateObj);
      showSyncBadge(true);
      console.log('[SSI Firebase] Saved to Firestore ✅');
    } catch (err) {
      console.warn('[SSI Firebase] Firestore save failed (offline?):', err.message);
      showSyncBadge(false);
    } finally {
      setTimeout(() => { _isSaving = false; }, 1200);
    }
  }

  // ── Real-time listener ──────────────────────────────────────
  function syncListener() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

    _unsubscribe = DOC_REF.onSnapshot(
      snap => {
        if (!snap.exists || _isSaving) return;
        const incoming    = snap.data();
        const currentUser = SSIApp.state.currentUser;

        Object.assign(SSIApp.state, incoming);
        SSIApp.state.currentUser = currentUser;

        // Keep localStorage cache fresh
        try { localStorage.setItem('ssiData', JSON.stringify(SSIApp.state)); } catch (e) {}

        showSyncBadge(true);
        const page = document.body.getAttribute('data-page');
        if (page && page !== 'login') SSIApp.navigate(page);
        console.log('[SSI Firebase] Real-time update 🔄');
      },
      err => console.error('[SSI Firebase] Listener error:', err)
    );

    console.log('[SSI Firebase] Real-time listener started 👂');
  }

  window.SSIFirebase = { db, loadFromFirestore, saveToFirestore, syncListener };
})();
