// ============================================================
//  SSI Inventory Management System — Core App
//  app.js
// ============================================================

const SSIApp = {

  CURRENCIES: {
    INR: { symbol: '₹',  name: 'Indian Rupee',   rate: 1      },
    USD: { symbol: '$',  name: 'US Dollar',       rate: 0.012  },
    EUR: { symbol: '€',  name: 'Euro',            rate: 0.011  },
    GBP: { symbol: '£',  name: 'British Pound',   rate: 0.0095 }
  },

  state: {
    users:       [],
    products:    [],
    clients:     [],
    orders:      [],
    inventory:   [],
    units:       [],
    currentUser: null,
    lastSaved:   null
  },

  // ── Save state → Firestore + localStorage ─────────────────
  async saveState() {
    this.state.lastSaved = new Date().toISOString();
    if (window.SSIFirebase) {
      await SSIFirebase.saveToFirestore(this.state);
    } else {
      try { localStorage.setItem('ssiData', JSON.stringify(this.state)); } catch(e) {}
    }
  },

  // ── Load state ← Firestore (fallback localStorage) ────────
  async loadState() {
    let saved = null;
    if (window.SSIFirebase) {
      saved = await SSIFirebase.loadFromFirestore();
    } else {
      try {
        const raw = localStorage.getItem('ssiData');
        if (raw) saved = JSON.parse(raw);
      } catch(e) {}
    }
    if (saved) {
      const cu = this.state.currentUser;
      Object.assign(this.state, saved);
      this.state.currentUser = cu;
    }
  },

  // ── Seed defaults ──────────────────────────────────────────
  async init() {
    await this.loadState();

    if (!this.state.users || this.state.users.length === 0) {
      this.state.users = [
        { id: this.genId(), username: 'admin',     password: 'admin123',    name: 'Administrator',    role: 'ADMIN',    active: true },
        { id: this.genId(), username: 'stock1',    password: 'stock123',    name: 'Stock Manager',    role: 'STOCK',    active: true },
        { id: this.genId(), username: 'dispatch1', password: 'dispatch123', name: 'Dispatch Officer', role: 'DISPATCH', active: true },
        { id: this.genId(), username: 'sales1',    password: 'sales123',    name: 'Sales Person 1',   role: 'SALES',    active: true },
        { id: this.genId(), username: 'sales2',    password: 'sales456',    name: 'Sales Person 2',   role: 'SALES',    active: true }
      ];
    }

    if (!this.state.units || this.state.units.length === 0) {
      this.state.units = [
        { id: this.genId(), name: 'Modinagar', address: 'Modinagar, UP', active: true },
        { id: this.genId(), name: 'Patla',     address: 'Patla, UP',     active: true }
      ];
    }

    await this.saveState();

    if (window.SSIFirebase) {
      SSIFirebase.syncListener();
    }

    SSIAuth.init();
  },

  // ── bootstrap = alias for init (called from HTML/old code) ─
  bootstrap: async function() {
    await SSIApp.init();
  },

  // ── Role-based navigation ──────────────────────────────────
  navigate(page) {
    const u    = this.state.currentUser;
    const area = document.getElementById('app-area');
    if (!u || !area) return;

    document.body.setAttribute('data-page', page);

    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav') === page);
    });

    const pageTitles = {
      dashboard: '📊 Dashboard', products: '📦 Products',
      clients: '👥 Clients / Vendors', inventory: '🏭 Inventory Ledger',
      orders: '🛒 Sales Orders', dispatch: '🚚 Dispatch',
      reports: '📈 Reports', users: '👤 User Management', units: '🏢 Units / Locations'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;

    const allowed = {
      ADMIN:    ['dashboard','products','clients','inventory','orders','dispatch','reports','users','units'],
      STOCK:    ['dashboard','inventory'],
      DISPATCH: ['dashboard','dispatch'],
      SALES:    ['dashboard','orders','clients']
    };

    if (!(allowed[u.role] || []).includes(page)) {
      area.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:60vh;">
          <div style="text-align:center;">
            <div style="font-size:4rem;">🚫</div>
            <h2 style="color:#374151;font-size:1.5rem;margin:.5rem 0;">Access Denied</h2>
            <p style="color:#6b7280;">You don't have permission to view this page.</p>
          </div>
        </div>`;
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

  // ── Helpers ────────────────────────────────────────────────
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  genSKU(n) {
    return 'SSI-' + String(n).padStart(4, '0');
  },

  fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },

  fmtNum(n, decimals = 2) {
    return parseFloat(n || 0).toFixed(decimals);
  },

  excelDownload(rows, fileName) {
    if (typeof XLSX === 'undefined') { this.toastMsg('Excel library not loaded!', 'error'); return; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName + '.xlsx');
  },

  toastMsg(msg, type = 'success') {
    const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:${colors[type]||colors.info};color:#fff;padding:.6rem 1.2rem;border-radius:.6rem;font-size:.875rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .4s;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => SSIApp.bootstrap());
