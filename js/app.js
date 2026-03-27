// ============================================================
//  SSI Inventory Management System — Core App (v12 FINAL)
//  app.js  — complete with all module compatibility functions
// ============================================================

const SSIApp = {

  // ── Currency config ────────────────────────────────────────
  CURRENCIES: {
    INR: { symbol: '₹', name: 'Indian Rupee',  rate: 1      },
    USD: { symbol: '$', name: 'US Dollar',      rate: 0.012  },
    EUR: { symbol: '€', name: 'Euro',           rate: 0.011  },
    GBP: { symbol: '£', name: 'British Pound',  rate: 0.0095 }
  },
  CURRENCY_SYMBOLS: { INR: '₹', USD: '$', EUR: '€', GBP: '£' },

  // ── Default users (always guaranteed) ─────────────────────
  _DEFAULT_USERS: [
    { id:'u1', username:'admin',     password:'admin123',    name:'Administrator',    role:'ADMIN',    active:true },
    { id:'u2', username:'stock1',    password:'stock123',    name:'Stock Manager',    role:'STOCK',    active:true },
    { id:'u3', username:'dispatch1', password:'dispatch123', name:'Dispatch Officer', role:'DISPATCH', active:true },
    { id:'u4', username:'sales1',    password:'sales123',    name:'Sales Person 1',   role:'SALES',    active:true },
    { id:'u5', username:'sales2',    password:'sales456',    name:'Sales Person 2',   role:'SALES',    active:true }
  ],

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
    if (stateArg && typeof stateArg === 'object' && !stateArg.type) {
      Object.assign(this.state, stateArg);
    }
    this.state.lastSaved = new Date().toISOString();

    if (window.SSIFirebase) {
      try { await SSIFirebase.saveToFirestore(this.state); } catch(e) {}
    }
    // Always keep localStorage copy (works offline)
    try { localStorage.setItem('ssiData', JSON.stringify(this.state)); } catch(e) {}
  },

  async loadState() {
    let saved = null;

    if (window.SSIFirebase) {
      try { saved = await SSIFirebase.loadFromFirestore(); } catch(e) {}
    }
    if (!saved) {
      try {
        const r = localStorage.getItem('ssiData');
        if (r) saved = JSON.parse(r);
      } catch(e) {}
    }

    if (saved) {
      const cu = this.state.currentUser;
      Object.assign(this.state, saved);
      this.state.currentUser = cu;
    }
  },

  // ── Ensure default users always exist ─────────────────────
  _ensureUsers() {
    if (!this.state.users) this.state.users = [];

    if (this.state.users.length === 0) {
      // No users at all — seed all defaults
      this.state.users = [...this._DEFAULT_USERS];
      return;
    }

    // Make sure every default user exists (add if missing)
    for (const du of this._DEFAULT_USERS) {
      if (!this.state.users.find(u => u.username === du.username)) {
        this.state.users.push({ ...du });
      }
    }
  },

  // ── Ensure default units always exist ─────────────────────
  _ensureUnits() {
    if (!this.state.units || this.state.units.length === 0) {
      this.state.units = [
        { id:'un1', name:'Modinagar', address:'Modinagar, UP', active:true },
        { id:'un2', name:'Patla',     address:'Patla, UP',     active:true }
      ];
    }
  },

  // ══════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════

  async init() {
    await this.loadState();

    // Guarantee defaults even if saved data was corrupt/partial
    this._ensureUsers();
    this._ensureUnits();

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

    document.querySelectorAll('[data-nav]').forEach(el => {
      const active = el.getAttribute('data-nav') === page;
      el.style.background = active ? 'rgba(255,255,255,0.15)' : 'transparent';
      el.style.borderLeft = active ? '3px solid #fff'         : '3px solid transparent';
      el.style.fontWeight = active ? '700' : '500';
      if (active) el.classList.add('active'); else el.classList.remove('active');
    });

    const titles = {
      dashboard:'📊 Dashboard',      products:'📦 Products',
      clients:'👥 Clients / Vendors', inventory:'🏭 Inventory Ledger',
      orders:'🛒 Sales Orders',       dispatch:'🚚 Dispatch',
      reports:'📈 Reports',           users:'👤 User Management',
      units:'🏢 Units / Locations'
    };
    const t = document.getElementById('page-title');
    if (t) t.textContent = titles[page] || page;

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

    area.innerHTML = '';
    try {
      switch (page) {
        case 'dashboard':  window.SSIDashboard ? SSIDashboard.render(area)  : area.innerHTML = _modErr('SSIDashboard');  break;
        case 'products':   window.SSIProducts  ? SSIProducts.render(area)   : area.innerHTML = _modErr('SSIProducts');   break;
        case 'clients':    window.SSIClients   ? SSIClients.render(area)    : area.innerHTML = _modErr('SSIClients');    break;
        case 'inventory':  window.SSIInventory ? SSIInventory.render(area)  : area.innerHTML = _modErr('SSIInventory');  break;
        case 'orders':     window.SSIOrders    ? SSIOrders.render(area)     : area.innerHTML = _modErr('SSIOrders');     break;
        case 'dispatch':   window.SSIDispatch  ? SSIDispatch.render(area)   : area.innerHTML = _modErr('SSIDispatch');   break;
        case 'reports':    window.SSIReports   ? SSIReports.render(area)    : area.innerHTML = _modErr('SSIReports');    break;
        case 'users':      window.SSIUsers     ? SSIUsers.render(area)      : area.innerHTML = _modErr('SSIUsers');      break;
        case 'units':      window.SSIUnits     ? SSIUnits.render(area)      : area.innerHTML = _modErr('SSIUnits');      break;
        default:           window.SSIDashboard ? SSIDashboard.render(area)  : area.innerHTML = _modErr('SSIDashboard');  break;
      }
    } catch (err) {
      console.error('[SSI] Page render error on', page, ':', err);
      area.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Error: ${err.message}</p><small style="color:#94a3b8;">Check browser console (F12)</small></div>`;
    }
  },

  // ══════════════════════════════════════════════════════════
  //  COMPATIBILITY LAYER
  // ══════════════════════════════════════════════════════════

  hasRole(...roles) {
    const u = this.state.currentUser;
    return u ? roles.includes(u.role) : false;
  },

  getState()     { return this.state; },
  currentUser()  { return this.state.currentUser || null; },

  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
  uid()   { return this.genId(); },

  genSKU(n) { return 'SSI-' + String(n).padStart(4, '0'); },

  nextSKU(st) {
    const s    = st || this.state;
    const nums = (s.products || [])
      .map(p => { const m = (p.sku || '').match(/SSI-(\d+)/); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    return 'SSI-' + String(nums.length ? Math.max(...nums) + 1 : 1).padStart(4, '0');
  },

  nextOrderNo(st) {
    const s    = st || this.state;
    const nums = (s.orders || [])
      .map(o => { const m = (o.order_no || '').match(/ORD-(\d+)/); return m ? parseInt(m[1]) : 0; })
      .filter(n => n > 0);
    return 'ORD-' + String(nums.length ? Math.max(...nums) + 1 : 1).padStart(5, '0');
  },

  getStock(productId, unitId) {
    let qty = 0;
    for (const e of (this.state.inventory || [])) {
      if (e.product_id !== productId) continue;
      if (unitId && e.unit_id !== unitId) continue;
      const tp = (e.type || e.entry_type || '').toUpperCase();
      const q  = parseFloat(e.qty || e.quantity || 0);
      if      (['OPENING','IN','TRANSFER_IN'].includes(tp)) qty += q;
      else if (['OUT','TRANSFER_OUT'].includes(tp))          qty -= q;
      else if (tp === 'ADJUST')                              qty += q;
    }
    return qty;
  },

  moneyFmt(value, currency) {
    const cur = currency || 'INR';
    const cfg = this.CURRENCIES[cur] || this.CURRENCIES.INR;
    return cfg.symbol + parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  qtyFmt(qty)    { return parseFloat(qty || 0).toFixed(3); },

  dateFmt(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch(e) { return String(d); }
  },
  fmtDate(d)     { return this.dateFmt(d); },
  fmtNum(n, dec) { return parseFloat(n || 0).toFixed(dec == null ? 2 : dec); },

  toast(msg, type)    { this._toast(msg, type); },
  toastMsg(msg, type) { this._toast(msg, type); },
  _toast(msg, type = 'success') {
    const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:${colors[type] || colors.info};color:#fff;padding:.65rem 1.25rem;border-radius:.6rem;font-size:.875rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .4s;max-width:340px;word-wrap:break-word;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3500);
  },

  showModal(html) {
    this.closeModal();
    const ov = document.createElement('div');
    ov.id = 'ssi-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;overflow-y:auto;';
    ov.innerHTML = `<div style="background:#fff;border-radius:1rem;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);">${html}</div>`;
    ov.addEventListener('click', e => { if (e.target === ov) this.closeModal(); });
    document.body.appendChild(ov);
  },
  closeModal() {
    const m = document.getElementById('ssi-modal');
    if (m) m.remove();
  },

  confirm(msg) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1002;padding:1rem;';
      ov.innerHTML = `
        <div style="background:#fff;border-radius:.75rem;padding:1.5rem;max-width:400px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);">
          <p style="font-size:1rem;color:#111827;margin-bottom:1.25rem;font-weight:500;line-height:1.5;">${msg}</p>
          <div style="display:flex;gap:.75rem;justify-content:flex-end;">
            <button id="ssi-no"  style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;border-radius:.5rem;background:#fff;cursor:pointer;font-size:.875rem;">Cancel</button>
            <button id="ssi-yes" style="padding:.5rem 1.25rem;border:none;border-radius:.5rem;background:#dc2626;color:#fff;cursor:pointer;font-size:.875rem;font-weight:600;">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#ssi-yes').onclick = () => { ov.remove(); resolve(true);  };
      ov.querySelector('#ssi-no').onclick  = () => { ov.remove(); resolve(false); };
    });
  },

  audit(action, detail) {
    if (!this.state.auditLog) this.state.auditLog = [];
    this.state.auditLog.push({
      ts: new Date().toISOString(),
      user: this.state.currentUser?.username || '?',
      action, detail
    });
    if (this.state.auditLog.length > 500) this.state.auditLog = this.state.auditLog.slice(-500);
  },

  excelDownload(rows, sheetOrName, fileNameArg) {
    if (typeof XLSX === 'undefined') { this._toast('Excel library not loaded!', 'error'); return; }
    let sheetName = 'Sheet1', fileName = 'SSI_Export';
    if (fileNameArg) { sheetName = sheetOrName || 'Sheet1'; fileName = fileNameArg; }
    else             { fileName  = sheetOrName || 'SSI_Export'; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName + '.xlsx');
  },

  excelRead(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') { reject(new Error('Excel library not loaded')); return; }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
};

// ── page-area alias ─────────────────────────────────────────
(function () {
  const orig = document.getElementById.bind(document);
  document.getElementById = function (id) {
    if (id === 'page-area') return orig('app-area') || orig('page-area');
    return orig(id);
  };
})();

function _modErr(name) {
  return `<div class="empty-state"><div class="icon">⚠️</div><p>Module <strong>${name}</strong> not loaded.<br><small style="color:#94a3b8;">Reload the page (Ctrl+Shift+R)</small></p></div>`;
}

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => SSIApp.bootstrap());
