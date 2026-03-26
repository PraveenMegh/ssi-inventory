// ============================================================
//  SSI Inventory Management System — Core App (v10 + Firebase)
//  app.js  (place in js/ folder)
// ============================================================

const SSIApp = {

  // ── Currency config ───────────────────────────────────────
  CURRENCIES: {
    INR: { symbol: '₹',  name: 'Indian Rupee',   rate: 1      },
    USD: { symbol: '$',  name: 'US Dollar',       rate: 0.012  },
    EUR: { symbol: '€',  name: 'Euro',            rate: 0.011  },
    GBP: { symbol: '£',  name: 'British Pound',   rate: 0.0095 }
  },

  // ── Application state ─────────────────────────────────────
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

  // ── Persist state → Firestore + localStorage ──────────────
  async saveState() {
    this.state.lastSaved = new Date().toISOString();
    // Save via Firebase module (also keeps localStorage copy)
    if (window.SSIFirebase) {
      await SSIFirebase.saveToFirestore(this.state);
    } else {
      // Fallback if Firebase not loaded
      try {
        localStorage.setItem('ssiData', JSON.stringify(this.state));
      } catch(e) {}
    }
  },

  // ── Load state ← Firestore (falls back to localStorage) ───
  async loadState() {
    let saved = null;
    if (window.SSIFirebase) {
      saved = await SSIFirebase.loadFromFirestore();
    } else {
      const raw = localStorage.getItem('ssiData');
      if (raw) { try { saved = JSON.parse(raw); } catch(e) {} }
    }

    if (saved) {
      // Restore all fields except currentUser (session-only)
      const cu = this.state.currentUser;
      Object.assign(this.state, saved);
      this.state.currentUser = cu;
    }
  },

  // ── Seed defaults on first run ────────────────────────────
  async init() {
    await this.loadState();

    if (!this.state.users || this.state.users.length === 0) {
      this.state.users = [
        { id: this.genId(), username: 'admin',     password: 'admin123',    name: 'Administrator',   role: 'ADMIN',    active: true  },
        { id: this.genId(), username: 'stock1',    password: 'stock123',    name: 'Stock Manager',   role: 'STOCK',    active: true  },
        { id: this.genId(), username: 'dispatch1', password: 'dispatch123', name: 'Dispatch Officer',role: 'DISPATCH', active: true  },
        { id: this.genId(), username: 'sales1',    password: 'sales123',    name: 'Sales Person 1',  role: 'SALES',    active: true  },
        { id: this.genId(), username: 'sales2',    password: 'sales456',    name: 'Sales Person 2',  role: 'SALES',    active: true  }
      ];
    }

    if (!this.state.units || this.state.units.length === 0) {
      this.state.units = [
        { id: this.genId(), name: 'Modinagar', address: 'Modinagar, UP', active: true },
        { id: this.genId(), name: 'Patla',     address: 'Patla, UP',     active: true }
      ];
    }

    await this.saveState();

    // Start real-time sync listener AFTER initial load
    if (window.SSIFirebase) {
      SSIFirebase.syncListener();
    }

    SSIAuth.init();
  },

  // ── Role-based navigation ─────────────────────────────────
  navigate(page) {
    const u    = this.state.currentUser;
    const area = document.getElementById('app-area');
    if (!u || !area) return;

    document.body.setAttribute('data-page', page);

    // Update nav active state
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav') === page);
    });

    const role = u.role;

    // Role-gate
    const allowed = {
      ADMIN:    ['dashboard','products','clients','inventory','orders','dispatch','reports','users','units'],
      STOCK:    ['dashboard','inventory'],
      DISPATCH: ['dashboard','dispatch'],
      SALES:    ['dashboard','orders','clients']
    };

    if (!(allowed[role] || []).includes(page)) {
      area.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="text-6xl mb-4">🚫</div>
            <h2 class="text-2xl font-bold text-gray-700">Access Denied</h2>
            <p class="text-gray-500 mt-2">You don't have permission to view this page.</p>
          </div>
        </div>`;
      return;
    }

    // Route to module
    switch(page) {
      case 'dashboard':  SSIDashboard.render(area);  break;
      case 'products':   SSIProducts.render(area);   break;
      case 'clients':    SSIClients.render(area);    break;
      case 'inventory':  SSIInventory.render(area);  break;
      case 'orders':     SSIOrders.render(area);     break;
      case 'dispatch':   SSIDispatch.render(area);   break;
      case 'reports':    SSIReports.render(area);    break;
      case 'users':      SSIUsers.render(area);      break;
      case 'units':      SSIUnits.render(area);      break;
      default:           SSIDashboard.render(area);  break;
    }
  },

  // ── Utility helpers ───────────────────────────────────────
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  genSKU(n) {
    return 'SSI-' + String(n).padStart(4, '0');
  },

  fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },

  fmtNum(n, decimals = 2) {
    return parseFloat(n || 0).toFixed(decimals);
  },

  // Export data as .xlsx using SheetJS
  excelDownload(rows, fileName) {
    if (typeof XLSX === 'undefined') {
      this.toastMsg('Excel library not loaded!', 'error');
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName + '.xlsx');
  },

  // Toast notification
  toastMsg(msg, type = 'success') {
    const colors = {
      success: 'bg-green-600',
      error:   'bg-red-600',
      warning: 'bg-yellow-500',
      info:    'bg-blue-600'
    };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all ${colors[type] || colors.info}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
  }
};

// Boot the app when DOM is ready
SSIApp.bootstrap = async function() { await SSIApp.init(); };
document.addEventListener('DOMContentLoaded', () => SSIApp.bootstrap());
