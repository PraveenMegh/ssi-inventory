// ============================================================
//  SSI Inventory Management System — Core App (FINAL)
//  app.js  — complete compatibility layer for all modules
// ============================================================

const SSIApp = {

  CURRENCIES: {
    INR: { symbol: '₹',  name: 'Indian Rupee',   rate: 1      },
    USD: { symbol: '$',  name: 'US Dollar',       rate: 0.012  },
    EUR: { symbol: '€',  name: 'Euro',            rate: 0.011  },
    GBP: { symbol: '£',  name: 'British Pound',   rate: 0.0095 }
  },

  state: {
    users: [], products: [], clients: [],
    orders: [], inventory: [], units: [],
    currentUser: null, lastSaved: null
  },

  // ── Persist ────────────────────────────────────────────────
  async saveState(stateArg) {
    // Accept optional state argument (old modules call saveState(st))
    if (stateArg && typeof stateArg === 'object' && !stateArg.type) {
      Object.assign(this.state, stateArg);
    }
    this.state.lastSaved = new Date().toISOString();
    if (window.SSIFirebase) {
      await SSIFirebase.saveToFirestore(this.state);
    } else {
      try { localStorage.setItem('ssiData', JSON.stringify(this.state)); } catch(e) {}
    }
  },

  async loadState() {
    let saved = null;
    if (window.SSIFirebase) {
      saved = await SSIFirebase.loadFromFirestore();
    } else {
      try { const r = localStorage.getItem('ssiData'); if (r) saved = JSON.parse(r); } catch(e) {}
    }
    if (saved) {
      const cu = this.state.currentUser;
      Object.assign(this.state, saved);
      this.state.currentUser = cu;
    }
  },

  // ── Seed & Boot ────────────────────────────────────────────
  async init() {
    await this.loadState();

    if (!this.state.users || this.state.users.length === 0) {
      this.state.users = [
        { id: 'u1', username: 'admin',     password: 'admin123',    name: 'Administrator',    role: 'ADMIN',    active: true, created_at: new Date().toISOString() },
        { id: 'u2', username: 'stock1',    password: 'stock123',    name: 'Stock Manager',    role: 'STOCK',    active: true, created_at: new Date().toISOString() },
        { id: 'u3', username: 'dispatch1', password: 'dispatch123', name: 'Dispatch Officer', role: 'DISPATCH', active: true, created_at: new Date().toISOString() },
        { id: 'u4', username: 'sales1',    password: 'sales123',    name: 'Sales Person 1',   role: 'SALES',    active: true, created_at: new Date().toISOString() },
        { id: 'u5', username: 'sales2',    password: 'sales456',    name: 'Sales Person 2',   role: 'SALES',    active: true, created_at: new Date().toISOString() }
      ];
    }

    if (!this.state.units || this.state.units.length === 0) {
      this.state.units = [
        { id: 'un1', name: 'Modinagar', address: 'Modinagar, UP', active: true },
        { id: 'un2', name: 'Patla',     address: 'Patla, UP',     active: true }
      ];
    }

    await this.saveState();
    if (window.SSIFirebase) SSIFirebase.syncListener();
    SSIAuth.init();
  },

  bootstrap: async function() { await SSIApp.init(); },

  // ── Navigation ─────────────────────────────────────────────
  navigate(page) {
    const u    = this.state.currentUser;
    const area = document.getElementById('app-area') || document.getElementById('page-area');
    if (!u || !area) return;

    document.body.setAttribute('data-page', page);

    document.querySelectorAll('[data-nav]').forEach(el => {
      const active = el.getAttribute('data-nav') === page;
      el.style.background    = active ? 'rgba(255,255,255,0.15)' : 'transparent';
      el.style.borderLeft    = active ? '3px solid #fff' : '3px solid transparent';
      el.style.fontWeight    = active ? '700' : '500';
    });

    const titles = {
      dashboard:'📊 Dashboard', products:'📦 Products',
      clients:'👥 Clients / Vendors', inventory:'🏭 Inventory Ledger',
      orders:'🛒 Sales Orders', dispatch:'🚚 Dispatch',
      reports:'📈 Reports', users:'👤 User Management', units:'🏢 Units / Locations'
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

    switch(page) {
      case 'dashboard':  if(window.SSIDashboard)  SSIDashboard.render(area);  break;
      case 'products':   if(window.SSIProducts)   SSIProducts.render(area);   break;
      case 'clients':    if(window.SSIClients)     SSIClients.render(area);    break;
      case 'inventory':  if(window.SSIInventory)   SSIInventory.render(area);  break;
      case 'orders':     if(window.SSIOrders)      SSIOrders.render(area);     break;
      case 'dispatch':   if(window.SSIDispatch)    SSIDispatch.render(area);   break;
      case 'reports':    if(window.SSIReports)     SSIReports.render(area);    break;
      case 'users':      if(window.SSIUsers)       SSIUsers.render(area);      break;
      case 'units':      if(window.SSIUnits)       SSIUnits.render(area);      break;
      default:           if(window.SSIDashboard)   SSIDashboard.render(area);  break;
    }
  },

  // ════════════════════════════════════════════════════════════
  //  FULL COMPATIBILITY LAYER
  //  All functions below are called by existing modules
  // ════════════════════════════════════════════════════════════

  // Role check
  hasRole(...roles) {
    const u = this.state.currentUser;
    return u ? roles.includes(u.role) : false;
  },

  // Get state object
  getState() { return this.state; },

  // Current logged-in user
  currentUser() { return this.state.currentUser || null; },

  // Generate unique ID
  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
  uid()   { return this.genId(); },  // alias

  // Auto SKU
  genSKU(n) { return 'SSI-' + String(n).padStart(4, '0'); },

  // Calculate stock for product+unit
  getStock(productId, unitId) {
    let qty = 0;
    for (const e of (this.state.inventory || [])) {
      if (e.product_id !== productId) continue;
      if (unitId && e.unit_id !== unitId) continue;
      const t = e.type || e.entry_type || '';
      const q = parseFloat(e.qty || e.quantity || 0);
      if (['OPENING','IN','TRANSFER_IN'].includes(t))  qty += q;
      else if (['OUT','TRANSFER_OUT'].includes(t))      qty -= q;
      else if (t === 'ADJUST')                          qty += q;
    }
    return qty;
  },

  // Money formatter
  moneyFmt(value, currency) {
    const cur = currency || 'INR';
    const cfg = this.CURRENCIES[cur] || this.CURRENCIES.INR;
    return cfg.symbol + parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Qty formatter (3 decimal KG)
  qtyFmt(qty) { return parseFloat(qty || 0).toFixed(3); },

  // Date formatter
  dateFmt(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch(e) { return d; }
  },
  fmtDate(d) { return this.dateFmt(d); },
  fmtNum(n, dec = 2) { return parseFloat(n || 0).toFixed(dec); },

  // Toast notification
  toast(msg, type = 'success') { this.toastMsg(msg, type); },
  toastMsg(msg, type = 'success') {
    const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:${colors[type]||colors.info};color:#fff;padding:.65rem 1.25rem;border-radius:.6rem;font-size:.875rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:opacity .4s;max-width:320px;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(), 400); }, 3000);
  },

  // Modal system
  showModal(html) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'ssi-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;';
    overlay.innerHTML = `<div style="background:#fff;border-radius:1rem;width:100%;max-width:660px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.body.appendChild(overlay);
  },
  closeModal() {
    const m = document.getElementById('ssi-modal');
    if (m) m.remove();
  },

  // Async confirm dialog
  confirm(msg) {
    return new Promise(resolve => {
      this.closeModal();
      const overlay = document.createElement('div');
      overlay.id = 'ssi-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1001;padding:1rem;';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:.75rem;padding:1.5rem;max-width:400px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);">
          <p style="font-size:1rem;color:#111827;margin-bottom:1.25rem;font-weight:500;">${msg}</p>
          <div style="display:flex;gap:.75rem;justify-content:flex-end;">
            <button id="confirm-no"  style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;border-radius:.5rem;background:#fff;cursor:pointer;font-size:.875rem;">Cancel</button>
            <button id="confirm-yes" style="padding:.5rem 1.25rem;border:none;border-radius:.5rem;background:#dc2626;color:#fff;cursor:pointer;font-size:.875rem;font-weight:600;">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.getElementById('confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
      document.getElementById('confirm-no').onclick  = () => { overlay.remove(); resolve(false); };
    });
  },

  // Audit log (stored in state for now)
  audit(action, detail) {
    if (!this.state.auditLog) this.state.auditLog = [];
    this.state.auditLog.push({
      ts: new Date().toISOString(),
      user: this.state.currentUser?.username || '?',
      action, detail
    });
    // Keep only last 500 entries
    if (this.state.auditLog.length > 500) this.state.auditLog = this.state.auditLog.slice(-500);
  },

  // Excel download — supports 2 or 3 arguments
  excelDownload(rows, sheetOrName, fileNameArg) {
    if (typeof XLSX === 'undefined') { this.toastMsg('Excel library not loaded!', 'error'); return; }
    // 2-arg call: excelDownload(rows, fileName)
    // 3-arg call: excelDownload(rows, sheetName, fileName)
    let sheetName = 'Sheet1';
    let fileName  = 'SSI_Export';
    if (fileNameArg) {
      sheetName = sheetOrName || 'Sheet1';
      fileName  = fileNameArg;
    } else {
      fileName  = sheetOrName || 'SSI_Export';
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName + '.xlsx');
  }
};

// ── page-area alias ── old modules use getElementById('page-area')
const _origGetById = document.getElementById.bind(document);
document.getElementById = function(id) {
  if (id === 'page-area') return _origGetById('app-area') || _origGetById('page-area');
  return _origGetById(id);
};

// Boot
document.addEventListener('DOMContentLoaded', () => SSIApp.bootstrap());
