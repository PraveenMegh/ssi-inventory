// ============================================================
//  SSI Inventory Management System — Core App (v11 COMPLETE)
//  app.js  — all compatibility functions for all modules
// ============================================================

const SSIApp = {

  // ── Currency config ────────────────────────────────────────
  CURRENCIES: {
    INR: { symbol: '₹',  name: 'Indian Rupee',   rate: 1      },
    USD: { symbol: '$',  name: 'US Dollar',       rate: 0.012  },
    EUR: { symbol: '€',  name: 'Euro',            rate: 0.011  },
    GBP: { symbol: '£',  name: 'British Pound',   rate: 0.0095 }
  },

  // ── CURRENCY_SYMBOLS — used by orders.js ──────────────────
  CURRENCY_SYMBOLS: { INR: '₹', USD: '$', EUR: '€', GBP: '£' },

  // ── State ──────────────────────────────────────────────────
  state: {
    users: [], products: [], clients: [],
    orders: [], inventory: [], units: [],
    currentUser: null, lastSaved: null
  },

  // ══════════════════════════════════════════════════════════
  //  PERSIST
  // ══════════════════════════════════════════════════════════
  async saveState(stateArg) {
    // Accept optional state argument — old modules call saveState(st)
    if (stateArg && typeof stateArg === 'object' && !stateArg.type) {
      Object.assign(this.state, stateArg);
    }
    this.state.lastSaved = new Date().toISOString();
    if (window.SSIFirebase) {
      try { await SSIFirebase.saveToFirestore(this.state); } catch(e) { console.warn('[SSI] Firestore save failed:', e.message); }
    }
    try { localStorage.setItem('ssiData', JSON.stringify(this.state)); } catch(e) {}
  },

  async loadState() {
    let saved = null;
    if (window.SSIFirebase) {
      try { saved = await SSIFirebase.loadFromFirestore(); } catch(e) { console.warn('[SSI] Firestore load failed:', e.message); }
    }
    if (!saved) {
      try { const r = localStorage.getItem('ssiData'); if (r) saved = JSON.parse(r); } catch(e) {}
    }
    if (saved) {
      const cu = this.state.currentUser;
      Object.assign(this.state, saved);
      this.state.currentUser = cu;
    }
  },

  // ══════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════
  async init() {
    await this.loadState();

    // Seed default users if none exist
    if (!this.state.users || this.state.users.length === 0) {
      this.state.users = [
        { id:'u1', username:'admin',     password:'admin123',    name:'Administrator',    role:'ADMIN',    active:true, created_at:new Date().toISOString() },
        { id:'u2', username:'stock1',    password:'stock123',    name:'Stock Manager',    role:'STOCK',    active:true, created_at:new Date().toISOString() },
        { id:'u3', username:'dispatch1', password:'dispatch123', name:'Dispatch Officer', role:'DISPATCH', active:true, created_at:new Date().toISOString() },
        { id:'u4', username:'sales1',    password:'sales123',    name:'Sales Person 1',   role:'SALES',    active:true, created_at:new Date().toISOString() },
        { id:'u5', username:'sales2',    password:'sales456',    name:'Sales Person 2',   role:'SALES',    active:true, created_at:new Date().toISOString() }
      ];
    }

    // Seed default units if none exist
    if (!this.state.units || this.state.units.length === 0) {
      this.state.units = [
        { id:'un1', name:'Modinagar', address:'Modinagar, UP', active:true },
        { id:'un2', name:'Patla',     address:'Patla, UP',     active:true }
      ];
    }

    await this.saveState();
    if (window.SSIFirebase) {
      try { SSIFirebase.syncListener(); } catch(e) {}
    }
    if (window.SSIAuth) SSIAuth.init();
  },

  bootstrap: async function() { await SSIApp.init(); },

  // ══════════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════════
  navigate(page) {
    const u    = this.state.currentUser;
    const area = document.getElementById('app-area') || document.getElementById('page-area');
    if (!u || !area) return;

    document.body.setAttribute('data-page', page);

    // Highlight active nav item
    document.querySelectorAll('[data-nav]').forEach(el => {
      const active = el.getAttribute('data-nav') === page;
      el.style.background = active ? 'rgba(255,255,255,0.15)' : 'transparent';
      el.style.borderLeft = active ? '3px solid #fff'         : '3px solid transparent';
      el.style.fontWeight = active ? '700' : '500';
      if (active) el.classList.add('active'); else el.classList.remove('active');
    });

    // Update page title
    const titles = {
      dashboard:'📊 Dashboard',     products:'📦 Products',
      clients:'👥 Clients / Vendors', inventory:'🏭 Inventory Ledger',
      orders:'🛒 Sales Orders',       dispatch:'🚚 Dispatch',
      reports:'📈 Reports',           users:'👤 User Management',
      units:'🏢 Units / Locations'
    };
    const t = document.getElementById('page-title');
    if (t) t.textContent = titles[page] || page;

    // Role-based access
    const allowed = {
      ADMIN:    ['dashboard','products','clients','inventory','orders','dispatch','reports','users','units'],
      STOCK:    ['dashboard','inventory'],
      DISPATCH: ['dashboard','dispatch'],
      SALES:    ['dashboard','orders','clients']
    };

    if (!(allowed[u.role] || []).includes(page)) {
      area.innerHTML = `<div class="empty-state"><div class="icon">🚫</div><p>Access Denied</p></div>`;
      return;
    }

    // Render page module — show friendly message if module not loaded
    area.innerHTML = '';
    try {
      switch(page) {
        case 'dashboard':  window.SSIDashboard  ? SSIDashboard.render(area)  : area.innerHTML = _moduleError('SSIDashboard');  break;
        case 'products':   window.SSIProducts   ? SSIProducts.render(area)   : area.innerHTML = _moduleError('SSIProducts');   break;
        case 'clients':    window.SSIClients    ? SSIClients.render(area)    : area.innerHTML = _moduleError('SSIClients');    break;
        case 'inventory':  window.SSIInventory  ? SSIInventory.render(area)  : area.innerHTML = _moduleError('SSIInventory');  break;
        case 'orders':     window.SSIOrders     ? SSIOrders.render(area)     : area.innerHTML = _moduleError('SSIOrders');     break;
        case 'dispatch':   window.SSIDispatch   ? SSIDispatch.render(area)   : area.innerHTML = _moduleError('SSIDispatch');   break;
        case 'reports':    window.SSIReports    ? SSIReports.render(area)    : area.innerHTML = _moduleError('SSIReports');    break;
        case 'users':      window.SSIUsers      ? SSIUsers.render(area)      : area.innerHTML = _moduleError('SSIUsers');      break;
        case 'units':      window.SSIUnits      ? SSIUnits.render(area)      : area.innerHTML = _moduleError('SSIUnits');      break;
        default:           window.SSIDashboard  ? SSIDashboard.render(area)  : area.innerHTML = _moduleError('SSIDashboard');  break;
      }
    } catch(err) {
      console.error('[SSI] Page render error on', page, err);
      area.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Page error: ${err.message}</p></div>`;
    }
  },

  // ══════════════════════════════════════════════════════════
  //  COMPATIBILITY LAYER — all functions called by modules
  // ══════════════════════════════════════════════════════════

  // Role check
  hasRole(...roles) {
    const u = this.state.currentUser;
    return u ? roles.includes(u.role) : false;
  },

  // Get full state
  getState() { return this.state; },

  // Current user
  currentUser() { return this.state.currentUser || null; },

  // ── ID generators ──────────────────────────────────────────
  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
  uid()   { return this.genId(); },

  // ── SKU generator — used by products.js ───────────────────
  genSKU(n) { return 'SSI-' + String(n).padStart(4, '0'); },

  nextSKU(st) {
    const s = st || this.state;
    const nums = (s.products || [])
      .map(p => { const m = (p.sku||'').match(/SSI-(\d+)/); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return 'SSI-' + String(next).padStart(4, '0');
  },

  // ── Order number generator — used by orders.js ────────────
  nextOrderNo(st) {
    const s = st || this.state;
    const nums = (s.orders || [])
      .map(o => { const m = (o.order_no||'').match(/ORD-(\d+)/); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return 'ORD-' + String(next).padStart(5, '0');
  },

  // ── Stock calculator ───────────────────────────────────────
  getStock(productId, unitId) {
    let qty = 0;
    for (const e of (this.state.inventory || [])) {
      if (e.product_id !== productId) continue;
      if (unitId && e.unit_id !== unitId) continue;
      const tp = (e.type || e.entry_type || '').toUpperCase();
      const q  = parseFloat(e.qty || e.quantity || 0);
      if (['OPENING','IN','TRANSFER_IN'].includes(tp)) qty += q;
      else if (['OUT','TRANSFER_OUT'].includes(tp))     qty -= q;
      else if (tp === 'ADJUST')                         qty += q;
    }
    return qty;
  },

  // ── Formatters ─────────────────────────────────────────────
  moneyFmt(value, currency) {
    const cur = currency || 'INR';
    const cfg = this.CURRENCIES[cur] || this.CURRENCIES.INR;
    return cfg.symbol + parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  },

  qtyFmt(qty) { return parseFloat(qty || 0).toFixed(3); },

  dateFmt(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch(e) { return String(d); }
  },
  fmtDate(d) { return this.dateFmt(d); },
  fmtNum(n, dec = 2) { return parseFloat(n || 0).toFixed(dec); },

  // ── Toast ──────────────────────────────────────────────────
  toast(msg, type = 'success') { this._showToast(msg, type); },
  toastMsg(msg, type = 'success') { this._showToast(msg, type); },
  _showToast(msg, type = 'success') {
    const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:${colors[type]||colors.info};color:#fff;padding:.65rem 1.25rem;border-radius:.6rem;font-size:.875rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .4s;max-width:340px;word-wrap:break-word;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(), 400); }, 3500);
  },

  // ── Modal ──────────────────────────────────────────────────
  showModal(html) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'ssi-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;overflow-y:auto;';
    overlay.innerHTML = `<div style="background:#fff;border-radius:1rem;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.body.appendChild(overlay);
  },
  closeModal() {
    const m = document.getElementById('ssi-modal');
    if (m) m.remove();
  },

  // ── Confirm dialog ─────────────────────────────────────────
  confirm(msg) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1002;padding:1rem;';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:.75rem;padding:1.5rem;max-width:400px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);">
          <p style="font-size:1rem;color:#111827;margin-bottom:1.25rem;font-weight:500;line-height:1.5;">${msg}</p>
          <div style="display:flex;gap:.75rem;justify-content:flex-end;">
            <button id="ssi-confirm-no"  style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;border-radius:.5rem;background:#fff;cursor:pointer;font-size:.875rem;font-weight:500;">Cancel</button>
            <button id="ssi-confirm-yes" style="padding:.5rem 1.25rem;border:none;border-radius:.5rem;background:#dc2626;color:#fff;cursor:pointer;font-size:.875rem;font-weight:600;">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#ssi-confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
      overlay.querySelector('#ssi-confirm-no').onclick  = () => { overlay.remove(); resolve(false); };
    });
  },

  // ── Audit log ──────────────────────────────────────────────
  audit(action, detail) {
    if (!this.state.auditLog) this.state.auditLog = [];
    this.state.auditLog.push({
      ts:     new Date().toISOString(),
      user:   this.state.currentUser?.username || '?',
      action, detail
    });
    if (this.state.auditLog.length > 500) this.state.auditLog = this.state.auditLog.slice(-500);
  },

  // ── Excel Download — 2-arg or 3-arg ───────────────────────
  excelDownload(rows, sheetOrName, fileNameArg) {
    if (typeof XLSX === 'undefined') { this._showToast('Excel library not loaded!', 'error'); return; }
    let sheetName = 'Sheet1', fileName = 'SSI_Export';
    if (fileNameArg) { sheetName = sheetOrName || 'Sheet1'; fileName = fileNameArg; }
    else             { fileName  = sheetOrName || 'SSI_Export'; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName + '.xlsx');
  },

  // ── Excel Read — used by products.js, inventory.js, clients.js ──
  excelRead(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') { reject(new Error('Excel library not loaded')); return; }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb   = XLSX.read(e.target.result, { type:'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval:'' });
          resolve(rows);
        } catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
};

// ── page-area alias — some old modules still call getElementById('page-area') ──
(function() {
  const orig = document.getElementById.bind(document);
  document.getElementById = function(id) {
    if (id === 'page-area') {
      return orig('app-area') || orig('page-area');
    }
    return orig(id);
  };
})();

// ── Internal helper ────────────────────────────────────────
function _moduleError(name) {
  return `<div class="empty-state"><div class="icon">⚠️</div><p>Module <strong>${name}</strong> not loaded.<br><small>Check browser console for errors.</small></p></div>`;
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => SSIApp.bootstrap());
