/* SSI Inventory Management System v9 - Core App */
/* global XLSX */

const SSIApp = (() => {
  const STATE_KEY = 'ssi_v9';
  const SESSION_KEY = 'ssi_session_v9';

  const ROLES = { ADMIN: 'ADMIN', STOCK: 'STOCK', DISPATCH: 'DISPATCH', SALES: 'SALES' };
  const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
  const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

  // ── State helpers ─────────────────────────────────────────────
  const getState = () => JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || seed();
  const saveState = (st) => { localStorage.setItem(STATE_KEY, JSON.stringify(st)); };

  const getSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') || {};
  const saveSession = (s) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));

  // ── Seed default data ─────────────────────────────────────────
  function seed() {
    const now = new Date().toISOString();
    const st = {
      users: [
        { id: 'u001', username: 'admin',     password: 'admin123',    name: 'Administrator',   role: ROLES.ADMIN,    active: true, created_at: now },
        { id: 'u002', username: 'stock1',    password: 'stock123',    name: 'Stock Manager',   role: ROLES.STOCK,    active: true, created_at: now },
        { id: 'u003', username: 'dispatch1', password: 'dispatch123', name: 'Dispatch Manager',role: ROLES.DISPATCH, active: true, created_at: now },
        { id: 'u004', username: 'sales1',    password: 'sales123',    name: 'Sales Person 1',  role: ROLES.SALES,    active: true, created_at: now },
        { id: 'u005', username: 'sales2',    password: 'sales123',    name: 'Sales Person 2',  role: ROLES.SALES,    active: true, created_at: now },
      ],
      units: [
        { id: 'unit1', name: 'Modinagar', address: 'Modinagar, UP', active: true },
        { id: 'unit2', name: 'Patla',     address: 'Patla, UP',     active: true },
      ],
      products: [],
      clients: [],
      inventory: [],
      orders: [],
      audit: [],
      meta: { next_sku: 1, next_order: 1, next_client: 1, next_product: 1 }
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(st));
    return st;
  }

  // ── ID / SKU generators ───────────────────────────────────────
  const uid = () => 'id' + Date.now() + Math.random().toString(36).slice(2, 7);

  function nextSKU(st) {
    const n = st.meta.next_sku++;
    return 'SSI-' + String(n).padStart(4, '0');
  }
  function nextOrderNo(st) {
    const n = st.meta.next_order++;
    return 'SO-' + String(n).padStart(4, '0');
  }

  // ── Auth helpers ──────────────────────────────────────────────
  const currentUser = () => {
    const ses = getSession();
    if (!ses.uid) return null;
    return getState().users.find(u => u.id === ses.uid) || null;
  };
  const hasRole = (...roles) => { const u = currentUser(); return u && roles.includes(u.role); };

  function login(username, password) {
    const st = getState();
    const user = st.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) return false;
    saveSession({ uid: user.id });
    audit('LOGIN', `User ${user.name} logged in`);
    return true;
  }

  function logout() {
    const u = currentUser();
    if (u) audit('LOGOUT', `User ${u.name} logged out`);
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Audit ─────────────────────────────────────────────────────
  function audit(action, detail) {
    const st = getState();
    const u = currentUser();
    st.audit.push({ id: uid(), action, detail, user: u ? u.name : 'system', at: new Date().toISOString() });
    if (st.audit.length > 500) st.audit = st.audit.slice(-400);
    saveState(st);
  }

  // ── Stock calculator ──────────────────────────────────────────
  function getStock(productId, unitId) {
    const st = getState();
    return st.inventory
      .filter(t => t.product_id === productId && t.unit_id === unitId)
      .reduce((sum, t) => {
        if (['IN', 'OPENING', 'TRANSFER_IN'].includes(t.type)) return sum + (t.qty || 0);
        if (['OUT', 'TRANSFER_OUT'].includes(t.type)) return sum - (t.qty || 0);
        if (t.type === 'ADJUST') return sum + (t.qty || 0);
        return sum;
      }, 0);
  }

  // ── Formatters ────────────────────────────────────────────────
  function moneyFmt(amount, currency = 'INR') {
    const sym = CURRENCY_SYMBOLS[currency] || '₹';
    return sym + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dateFmt(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function qtyFmt(q) { return Number(q || 0).toFixed(3); }

  // ── Toast ─────────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    let box = document.getElementById('ssi-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ssi-toast';
      box.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;';
      document.body.appendChild(box);
    }
    const colors = { success: '#16a34a', error: '#dc2626', warn: '#d97706', info: '#2563eb' };
    const el = document.createElement('div');
    el.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:12px 16px;border-radius:8px;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.2);animation:slideIn .3s ease;`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Modal helper ──────────────────────────────────────────────
  function showModal(html, onClose) {
    let ov = document.getElementById('ssi-modal-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'ssi-modal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = `<div style="background:#fff;border-radius:12px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">${html}</div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); if (onClose) onClose(); } });
    return ov;
  }

  function closeModal() {
    const ov = document.getElementById('ssi-modal-overlay');
    if (ov) ov.remove();
  }

  // ── Confirm dialog ────────────────────────────────────────────
  function confirm(msg) {
    return new Promise(resolve => {
      const html = `
        <div style="padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <p style="font-size:16px;color:#374151;margin-bottom:24px;">${msg}</p>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="ssi-confirm-no"  style="padding:10px 24px;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;font-size:14px;">Cancel</button>
            <button id="ssi-confirm-yes" style="padding:10px 24px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Confirm</button>
          </div>
        </div>`;
      showModal(html);
      document.getElementById('ssi-confirm-yes').onclick = () => { closeModal(); resolve(true); };
      document.getElementById('ssi-confirm-no').onclick  = () => { closeModal(); resolve(false); };
    });
  }

  // ── Excel helpers ─────────────────────────────────────────────
  function excelDownload(rows, sheetName, fileName) {
    if (typeof XLSX === 'undefined') { toast('SheetJS not loaded', 'error'); return; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName + '.xlsx');
  }

  function excelRead(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }

  // ── Nav builder ───────────────────────────────────────────────
  function navItems(role) {
    const all = [
      { id: 'dashboard', label: '📊 Dashboard',   roles: [ROLES.ADMIN] },
      { id: 'products',  label: '📦 Products',    roles: [ROLES.ADMIN, ROLES.STOCK] },
      { id: 'clients',   label: '👥 Clients',     roles: [ROLES.ADMIN, ROLES.SALES] },
      { id: 'inventory', label: '🏭 Inventory',   roles: [ROLES.ADMIN, ROLES.STOCK] },
      { id: 'orders',    label: '🛒 Orders',      roles: [ROLES.ADMIN, ROLES.SALES] },
      { id: 'dispatch',  label: '🚚 Dispatch',    roles: [ROLES.ADMIN, ROLES.DISPATCH] },
      { id: 'reports',   label: '📈 Reports',     roles: [ROLES.ADMIN] },
      { id: 'users',     label: '👤 Users',       roles: [ROLES.ADMIN] },
    ];
    return all.filter(n => n.roles.includes(role));
  }

  // ── Shell layout ──────────────────────────────────────────────
  function renderShell(activePage) {
    const user = currentUser();
    if (!user) { SSIAuth.renderLogin(); return; }
    const items = navItems(user.role);
    const app = document.getElementById('app');

    const navHTML = items.map(n => `
      <a href="#" data-page="${n.id}" class="nav-link ${n.id === activePage ? 'nav-active' : ''}"
         style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;color:${n.id === activePage ? '#fff' : '#cbd5e1'};background:${n.id === activePage ? 'rgba(255,255,255,.15)' : 'transparent'};transition:all .2s;"
         onmouseover="if(this.dataset.page!=='${activePage}')this.style.background='rgba(255,255,255,.08)'"
         onmouseout="if(this.dataset.page!=='${activePage}')this.style.background='transparent'">
        ${n.label}
      </a>`).join('');

    const roleColors = { ADMIN:'#dc2626', STOCK:'#16a34a', DISPATCH:'#2563eb', SALES:'#7c3aed' };
    const roleColor = roleColors[user.role] || '#6b7280';

    app.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f1f5f9; }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        .card { background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:24px; }
        .btn { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s; }
        .btn-primary { background:#e11d2e;color:#fff; }
        .btn-primary:hover { background:#c41525; }
        .btn-secondary { background:#f1f5f9;color:#374151;border:1px solid #e2e8f0; }
        .btn-secondary:hover { background:#e2e8f0; }
        .btn-success { background:#16a34a;color:#fff; }
        .btn-danger { background:#dc2626;color:#fff; }
        .btn-sm { padding:6px 12px;font-size:13px; }
        .badge { display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600; }
        .badge-draft    { background:#f1f5f9;color:#64748b; }
        .badge-submitted{ background:#fef3c7;color:#92400e; }
        .badge-dispatched{background:#dcfce7;color:#166534; }
        .badge-cancelled{ background:#fee2e2;color:#991b1b; }
        .badge-urgent   { background:#dc2626;color:#fff; }
        .badge-ok       { background:#dcfce7;color:#166534; }
        .badge-low      { background:#fee2e2;color:#991b1b; }
        table { width:100%;border-collapse:collapse; }
        th { background:#f8fafc;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:10px 14px;text-align:left;border-bottom:1px solid #e2e8f0; }
        td { padding:12px 14px;font-size:14px;color:#374151;border-bottom:1px solid #f1f5f9; }
        tr:hover td { background:#f8fafc; }
        input,select,textarea { width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;font-family:inherit; }
        input:focus,select:focus,textarea:focus { border-color:#e11d2e;box-shadow:0 0 0 3px rgba(225,29,46,.1); }
        label { font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px; }
        .form-grid { display:grid;gap:16px; }
        .form-grid-2 { grid-template-columns:1fr 1fr; }
        .form-grid-3 { grid-template-columns:1fr 1fr 1fr; }
        @media(max-width:640px){ .form-grid-2,.form-grid-3{grid-template-columns:1fr;} .sidebar{transform:translateX(-100%);} .sidebar.open{transform:translateX(0);} }
        .page-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px; }
        .page-title { font-size:22px;font-weight:700;color:#111827; }
        .modal-header { display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #f1f5f9; }
        .modal-body { padding:24px; }
        .modal-footer { padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:12px;justify-content:flex-end; }
        .info-card { background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:16px; }
        .empty-state { text-align:center;padding:60px 20px;color:#94a3b8; }
        .empty-state .icon { font-size:48px;margin-bottom:16px; }
        .stat-card { background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08); }
        #sidebar { width:240px;min-height:100vh;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);position:fixed;top:0;left:0;z-index:100;display:flex;flex-direction:column;transition:transform .3s; }
        #main-content { margin-left:240px;min-height:100vh; }
        #topbar { background:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,.08);position:sticky;top:0;z-index:50; }
        #page-area { padding:24px; }
        @media(max-width:768px){ #sidebar{transform:translateX(-100%);} #sidebar.open{transform:translateX(0);} #main-content{margin-left:0;} }
        .hamburger { display:none;cursor:pointer;font-size:22px; }
        @media(max-width:768px){ .hamburger{display:block;} }
      </style>

      <!-- SIDEBAR -->
      <div id="sidebar">
        <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,.1);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;background:#e11d2e;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px;">SSI</div>
            <div>
              <div style="color:#fff;font-weight:700;font-size:15px;">Shree Sai</div>
              <div style="color:#94a3b8;font-size:11px;">Industries</div>
            </div>
          </div>
        </div>
        <nav style="flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:4px;">
          ${navHTML}
        </nav>
        <div style="padding:16px;border-top:1px solid rgba(255,255,255,.1);">
          <div style="color:#94a3b8;font-size:12px;margin-bottom:4px;">${user.name}</div>
          <span style="background:${roleColor};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">${user.role}</span>
        </div>
      </div>

      <!-- MAIN -->
      <div id="main-content">
        <div id="topbar">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="hamburger" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</span>
            <span id="topbar-title" style="font-weight:700;font-size:16px;color:#111827;">${items.find(i=>i.id===activePage)?.label || ''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:13px;color:#64748b;display:none;" id="topbar-user">${user.name}</span>
            <button class="btn btn-secondary btn-sm" onclick="SSIAuth.logout()">🚪 Logout</button>
          </div>
        </div>
        <div id="page-area"></div>
      </div>`;

    // nav click handler
    document.querySelectorAll('.nav-link').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const page = a.dataset.page;
        document.getElementById('sidebar').classList.remove('open');
        navigate(page);
      });
    });
  }

  // ── Router ────────────────────────────────────────────────────
  function navigate(page) {
    const user = currentUser();
    if (!user) { SSIAuth.renderLogin(); return; }
    renderShell(page);
    const area = document.getElementById('page-area');
    const title = document.getElementById('topbar-title');
    const routes = {
      dashboard: () => { if(title) title.textContent='📊 Dashboard'; SSIDashboard.render(area); },
      products:  () => { if(title) title.textContent='📦 Products';  SSIProducts.render(area); },
      clients:   () => { if(title) title.textContent='👥 Clients';   SSIClients.render(area); },
      inventory: () => { if(title) title.textContent='🏭 Inventory'; SSIInventory.render(area); },
      orders:    () => { if(title) title.textContent='🛒 Orders';    SSIOrders.render(area); },
      dispatch:  () => { if(title) title.textContent='🚚 Dispatch';  SSIDispatch.render(area); },
      reports:   () => { if(title) title.textContent='📈 Reports';   SSIReports.render(area); },
      users:     () => { if(title) title.textContent='👤 Users';     SSIUsers.render(area); },
    };
    const fn = routes[page];
    if (fn) fn();
    else {
      // default route per role
      const defaults = { ADMIN:'dashboard', STOCK:'inventory', DISPATCH:'dispatch', SALES:'orders' };
      navigate(defaults[user.role] || 'orders');
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  function bootstrap() {
    // Add global CSS
    const style = document.createElement('style');
    style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');`;
    document.head.appendChild(style);

    const user = currentUser();
    if (user) {
      const defaults = { ADMIN:'dashboard', STOCK:'inventory', DISPATCH:'dispatch', SALES:'orders' };
      navigate(defaults[user.role] || 'orders');
    } else {
      SSIAuth.renderLogin();
    }
  }

  return {
    getState, saveState, getSession, saveSession,
    currentUser, hasRole, login, logout, audit,
    getStock, moneyFmt, dateFmt, qtyFmt,
    toast, showModal, closeModal, confirm,
    excelDownload, excelRead,
    uid, nextSKU, nextOrderNo,
    ROLES, CURRENCIES, CURRENCY_SYMBOLS,
    navItems, navigate, renderShell, bootstrap
  };
})();
