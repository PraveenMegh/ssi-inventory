/* global window, document, localStorage */

const SSIApp = (() => {
  const LS_KEYS = {
    state: 'ssi_state_v1'
  };

  const nowISO = () => new Date().toISOString();
  const uid = (p='id') => `${p}_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  const toast = (msg, type='info') => {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg border text-sm ${
      type==='ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
      type==='warn' ? 'bg-amber-50 border-amber-200 text-amber-900' :
      type==='err' ? 'bg-rose-50 border-rose-200 text-rose-900' :
      'bg-white border-slate-200 text-slate-800'
    }`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .2s'; }, 2400);
    setTimeout(()=>el.remove(), 2800);
  };

  const getState = () => {
    const raw = localStorage.getItem(LS_KEYS.state);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const setState = (st) => localStorage.setItem(LS_KEYS.state, JSON.stringify(st));

  const seed = () => {
    if (getState()) return;

    const adminId = uid('user');
    const st = {
      meta: { created_at: nowISO(), version: '1.0', next_sku: 1 },
      session: { user_id: null },
      roles: ['ADMIN','STOCK','DISPATCH','SALES'],
      users: [
        { id: adminId, username:'admin', password:'admin123', role:'ADMIN', name:'Admin', active:true, created_at: nowISO() }
      ],
      units: [
        { id: uid('unit'), name:'Unit 1 Modinagar', code:'MODI', created_at: nowISO() },
        { id: uid('unit'), name:'Unit 2 Patla', code:'PATLA', created_at: nowISO() }
      ],
      products: [],
      clients: [],
      inventory_txn: [],
      sales_orders: [],
      audit: []
    };
    setState(st);
  };

  const audit = (action, entity, entity_id, details={}) => {
    const st = getState();
    const user = SSIAuth.currentUser();
    st.audit.unshift({
      id: uid('audit'),
      at: nowISO(),
      by: user ? { id:user.id, username:user.username, role:user.role } : null,
      action, entity, entity_id, details
    });
    setState(st);
  };

  const moneyFmt = (value, currency) => {
    const sym = { INR:'₹', USD:'$', EUR:'€', GBP:'£' }[currency] || '';
    const n = Number(value||0);
    return `${sym}${n.toFixed(2)}`;
  };

  const render = (html) => {
    document.getElementById('app').innerHTML = html;
  };

  const requireRole = (roles) => {
    const u = SSIAuth.currentUser();
    if (!u) return false;
    if (!roles || roles.length===0) return true;
    return roles.includes(u.role);
  };

  const navItemsForRole = (role) => {
    const base = [
      { id:'dashboard', label:'Dashboard', roles:['ADMIN','STOCK','DISPATCH','SALES'] }
    ];
    const masters = [
      { id:'products', label:'Products', roles:['ADMIN'] },
      { id:'clients', label:'Clients/Vendors', roles:['ADMIN'] },
      { id:'units', label:'Units', roles:['ADMIN'] },
      { id:'users', label:'Users', roles:['ADMIN'] }
    ];
    const ops = [
      { id:'inventory', label:'Inventory', roles:['ADMIN','STOCK','DISPATCH'] },
      { id:'orders', label:'Sales Orders', roles:['ADMIN','SALES'] },
      { id:'dispatch', label:'Dispatch', roles:['ADMIN','DISPATCH'] },
      { id:'reports', label:'Reports', roles:['ADMIN','STOCK','DISPATCH','SALES'] }
    ];
    return [...base, ...masters, ...ops].filter(x => x.roles.includes(role));
  };

  const shell = (content, active='dashboard') => {
    const u = SSIAuth.currentUser();
    const nav = navItemsForRole(u.role).map(item => {
      const a = item.id === active ? 'nav-active' : '';
      return `<button data-nav="${item.id}" class="w-full text-left px-4 py-2 rounded-lg ${a} hover:bg-rose-50">
        <div class="text-sm font-semibold">${item.label}</div>
      </button>`;
    }).join('');

    return `
    <div class="min-h-screen">
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="ssi-logo-red-white.png" alt="SSI"
              class="w-12 h-12 rounded-xl object-contain bg-white"
              onerror="this.style.display='none'; document.getElementById('hdrLogoFb').style.display='flex'" />
            <div id="hdrLogoFb" style="display:none"
              class="w-12 h-12 rounded-xl bg-rose-600 items-center justify-center">
              <span class="text-white font-extrabold text-sm">SSI</span>
            </div>
            <div>
              <div class="font-bold leading-5 text-slate-800">SSI Inventory</div>
              <div class="text-xs text-slate-500">Shree Sai Industries</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-slate-700">
              <span class="font-semibold">${u.name || u.username}</span>
              <span class="text-slate-400">•</span>
              <span class="text-slate-500">${u.role}</span>
            </div>
            <button id="btnLogout" class="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-5">
        <aside class="col-span-12 md:col-span-3">
          <div class="bg-white border border-slate-200 rounded-2xl p-3">
            <div class="text-xs font-semibold text-slate-500 px-2 pb-2">MENU</div>
            <div class="space-y-1">${nav}</div>
          </div>
        </aside>
        <main class="col-span-12 md:col-span-9">
          ${content}
        </main>
      </div>
    </div>`;
  };

  const bindShellEvents = () => {
    const logout = document.getElementById('btnLogout');
    if (logout) logout.addEventListener('click', () => { SSIAuth.logout(); SSIAuth.renderLogin(); });

    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-nav');
        route(page);
      });
    });
  };

  const route = (page) => {
    const u = SSIAuth.currentUser();
    if (!u) return SSIAuth.renderLogin();

    if (page==='dashboard') return SSIDashboard.render();
    if (page==='products') return SSIProducts.render();
    if (page==='clients') return SSIClients.render();
    if (page==='users') return SSIUsers.render();
    if (page==='units') return SSIUnits.render();
    if (page==='inventory') return SSIInventory.render();
    if (page==='orders') return SSIOrders.render();
    if (page==='dispatch') return SSIDispatch.render();
    if (page==='reports') return SSIReports.render();

    return SSIDashboard.render();
  };

  // --- CSV utilities (simple, Excel-friendly) ---
  const csvEscape = (v) => {
    const s = String(v ?? '');
    // escape if contains newline, quote, or comma
    if (s.includes('\n') || s.includes('\r') || s.includes('"') || s.includes(',')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const parseCSV = (csvText) => {
    // Minimal CSV parser supporting quotes. Returns array-of-arrays.
    const rows = [];
    let row = [];
    let cur = '';
    let inQ = false;

    // Normalize newlines
    const s = String(csvText || '')
      .split('\r\n').join('\n')
      .split('\r').join('\n');

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const next = s[i + 1];

      if (inQ) {
        if (ch === '"' && next === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        row.push(cur);
        cur = '';
      } else if (ch === '\n') {
        row.push(cur);
        cur = '';
        if (row.some(v => String(v).trim() !== '')) rows.push(row);
        row = [];
      } else {
        cur += ch;
      }
    }

    if (cur.length || row.length) {
      row.push(cur);
      if (row.some(v => String(v).trim() !== '')) rows.push(row);
    }

    return rows;
  };

  const rowsToObjects = (rows) => {
    if (!rows || rows.length<2) return [];
    const headers = rows[0].map(h=>String(h||'').trim());
    return rows.slice(1).map(r=>{
      const o = {};
      headers.forEach((h,idx)=>{ o[h]= (r[idx] ?? '').toString().trim(); });
      return o;
    }).filter(o => Object.values(o).some(v=>String(v).trim()!==''));
  };

  const downloadTextFile = (filename, text, mime='text/plain') => {
    const blob = new Blob([text], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const genSKU = () => {
    const st = getState();
    const n = Number(st.meta?.next_sku || 1);
    st.meta.next_sku = n + 1;
    setState(st);
    return `SSI-${String(n).padStart(4,'0')}`;
  };

  const bootstrap = () => {
    seed();
    const u = SSIAuth.currentUser();
    if (!u) SSIAuth.renderLogin();
    else SSIDashboard.render();
  };

  return { getState, setState, seed, uid, nowISO, toast, audit, moneyFmt, render, shell, bindShellEvents, route, requireRole, bootstrap, parseCSV, rowsToObjects, downloadTextFile, csvEscape, genSKU };
})();
