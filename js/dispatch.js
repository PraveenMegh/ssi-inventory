/* global SSIApp, SSIAuth, SSIInventory */

const SSIDispatch = (() => {
  let _activeTab = 'queue'; // 'queue' | 'history'

  const queue = (st) => {
    const submitted = st.sales_orders.filter(o => o.status === 'SUBMITTED');
    // urgent first, then FIFO by submitted_at
    return submitted.sort((a,b) => {
      const au = a.urgent ? 1 : 0;
      const bu = b.urgent ? 1 : 0;
      if (au !== bu) return bu - au;
      return String(a.submitted_at||'').localeCompare(String(b.submitted_at||''));
    });
  };

  const history = (st) => {
    return st.sales_orders
      .filter(o => o.status === 'DISPATCHED' || o.status === 'CANCELLED')
      .sort((a,b) => String(b.dispatched_at||b.created_at||'').localeCompare(String(a.dispatched_at||a.created_at||'')));
  };

  const renderQueueRows = (q, st) => q.map(o => {
    const c = st.clients.find(x=>x.id===o.client_id);
    const u = st.units.find(x=>x.id===o.unit_id);
    const urgent = o.urgent ? '<span class="chip chip-urgent ml-1">🚨 URGENT</span>' : '';
    return `
      <tr class="border-t ${o.urgent?'bg-rose-50':''}">
        <td class="py-2 pr-3 font-semibold">${o.order_no}</td>
        <td class="py-2 pr-3">${o.date}</td>
        <td class="py-2 pr-3">${u?.name||'-'}</td>
        <td class="py-2 pr-3">${c?.name||'-'}${urgent}</td>
        <td class="py-2 pr-3">${SSIApp.moneyFmt(o.total_value||0, o.currency||'INR')}</td>
        <td class="py-2 text-right">
          <button data-open="${o.id}" class="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">▶ Process</button>
        </td>
      </tr>`;
  }).join('');

  const renderHistoryRows = (hist, st) => hist.map(o => {
    const c = st.clients.find(x=>x.id===o.client_id);
    const u = st.units.find(x=>x.id===o.unit_id);
    const statusChip = o.status === 'DISPATCHED'
      ? '<span class="chip chip-ok">✅ Dispatched</span>'
      : '<span class="chip chip-warn">Cancelled</span>';
    return `
      <tr class="border-t">
        <td class="py-2 pr-3 font-semibold">${o.order_no}</td>
        <td class="py-2 pr-3">${o.date}</td>
        <td class="py-2 pr-3">${u?.name||'-'}</td>
        <td class="py-2 pr-3">${c?.name||'-'}</td>
        <td class="py-2 pr-3">${statusChip}</td>
        <td class="py-2 pr-3 text-slate-500 text-xs">${(o.dispatched_at||'').slice(0,10)||'-'}</td>
        <td class="py-2 pr-3">${SSIApp.moneyFmt(o.total_value||0, o.currency||'INR')}</td>
      </tr>`;
  }).join('');

  const render = (tab) => {
    if (tab) _activeTab = tab;
    if (!SSIApp.requireRole(['ADMIN','DISPATCH'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();
    const q = queue(st);
    const hist = history(st);

    const tabBtn = (id, label, count) => {
      const active = _activeTab === id;
      return `<button data-tab="${id}" class="px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${active ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        ${label} <span class="ml-1 px-1.5 py-0.5 rounded-full text-xs ${active?'bg-white/20 text-white':'bg-slate-100 text-slate-600'}">${count}</span>
      </button>`;
    };

    let tableContent = '';
    if (_activeTab === 'queue') {
      tableContent = `
        <table class="w-full text-sm">
          <thead class="text-left text-slate-500 bg-slate-50">
            <tr>
              <th class="py-2 pr-3 pl-2">Order No</th>
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3">Unit</th>
              <th class="py-2 pr-3">Client</th>
              <th class="py-2 pr-3">Total</th>
              <th class="py-2 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>${renderQueueRows(q, st)}</tbody>
        </table>
        ${q.length===0 ? '<div class="text-sm text-slate-500 py-6 text-center">✅ No pending orders in queue.<br><span class="text-xs text-slate-400">Orders appear here after Salesperson submits them.</span></div>' : ''}`;
    } else {
      tableContent = `
        <table class="w-full text-sm">
          <thead class="text-left text-slate-500 bg-slate-50">
            <tr>
              <th class="py-2 pr-3 pl-2">Order No</th>
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3">Unit</th>
              <th class="py-2 pr-3">Client</th>
              <th class="py-2 pr-3">Status</th>
              <th class="py-2 pr-3">Dispatched On</th>
              <th class="py-2 pr-3">Total</th>
            </tr>
          </thead>
          <tbody>${renderHistoryRows(hist, st)}</tbody>
        </table>
        ${hist.length===0 ? '<div class="text-sm text-slate-500 py-6 text-center">No dispatch history yet.</div>' : ''}`;
    }

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div class="text-lg font-extrabold">Dispatch</div>
            <div class="text-sm text-slate-500">🚨 Urgent first → FIFO queue. Orders appear after Salesperson submits.</div>
          </div>
          <div class="flex gap-2">
            ${tabBtn('queue','📋 Queue', q.length)}
            ${tabBtn('history','📦 History', hist.length)}
          </div>
        </div>

        <div class="mt-4 overflow-auto border border-slate-200 rounded-xl">
          ${tableContent}
        </div>
      </div>

      ${modalHtml(st)}
    `;

    SSIApp.render(SSIApp.shell(content, 'dispatch'));
    SSIApp.bindShellEvents();

    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>{
      render(b.getAttribute('data-tab'));
    }));

    document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-open');
      openModal(id);
    }));

    bindModalEvents();
  };

  const modalHtml = () => `
    <div id="dpModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
      <div class="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold" id="dpTitle">Process Order</div>
            <div class="text-sm text-slate-500" id="dpSub"></div>
          </div>
          <button id="dpClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
        </div>

        <input type="hidden" id="dpId" />

        <div class="mt-4 overflow-auto border border-slate-200 rounded-2xl">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500 bg-slate-50">
              <tr>
                <th class="py-2 px-3">Product</th>
                <th class="py-2 px-3">Pack</th>
                <th class="py-2 px-3">Qty</th>
                <th class="py-2 px-3">Stock (Unit)</th>
                <th class="py-2 px-3">Result</th>
              </tr>
            </thead>
            <tbody id="dpItems"></tbody>
          </table>
        </div>

        <div class="mt-5 flex items-center justify-between">
          <div class="text-xs text-slate-500">This will create STOCK OUT entries and mark order as DISPATCHED.</div>
          <div class="flex gap-2">
            <button id="dpDispatch" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Dispatch</button>
          </div>
        </div>
      </div>
    </div>`;

  const openModal = (orderId) => {
    const st = SSIApp.getState();
    const o = st.sales_orders.find(x=>x.id===orderId);
    if (!o) return;

    document.getElementById('dpModal').classList.remove('hidden');
    document.getElementById('dpModal').classList.add('flex');
    document.getElementById('dpId').value = o.id;

    const client = st.clients.find(x=>x.id===o.client_id);
    const unit = st.units.find(x=>x.id===o.unit_id);

    document.getElementById('dpTitle').textContent = `Process ${o.order_no}`;
    document.getElementById('dpSub').textContent = `${unit?.name||''} • ${client?.name||''} • ${o.urgent?'URGENT':''}`;

    const tbody = document.getElementById('dpItems');
    tbody.innerHTML = '';

    for (const it of o.items) {
      const p = st.products.find(x=>x.id===it.product_id);
      const stock = SSIInventory.calcBalance(st, o.unit_id, it.product_id);
      const ok = stock >= (it.qty_base||0);
      tbody.innerHTML += `
        <tr class="border-t">
          <td class="py-2 px-3 font-semibold">${p?.name||'-'}</td>
          <td class="py-2 px-3">${it.pack||''}</td>
          <td class="py-2 px-3">${Number(it.qty_base||0).toFixed(3)}</td>
          <td class="py-2 px-3">${stock.toFixed(3)}</td>
          <td class="py-2 px-3">${ok?'<span class="chip chip-ok">OK</span>':'<span class="chip chip-urgent">Insufficient</span>'}</td>
        </tr>`;
    }
  };

  const closeModal = () => {
    document.getElementById('dpModal').classList.add('hidden');
    document.getElementById('dpModal').classList.remove('flex');
  };

  const bindModalEvents = () => {
    document.getElementById('dpClose').onclick = closeModal;
    document.getElementById('dpModal').addEventListener('click', (e)=>{ if (e.target.id==='dpModal') closeModal(); });

    document.getElementById('dpDispatch').onclick = () => {
      const st = SSIApp.getState();
      const id = document.getElementById('dpId').value;
      const o = st.sales_orders.find(x=>x.id===id);
      if (!o) return;

      // stock check
      for (const it of o.items) {
        const stock = SSIInventory.calcBalance(st, o.unit_id, it.product_id);
        if (stock < (it.qty_base||0)) return SSIApp.toast('Cannot dispatch: insufficient stock','err');
      }

      // create OUT txns
      for (const it of o.items) {
        st.inventory_txn.unshift({
          id: SSIApp.uid('txn'),
          date: new Date().toISOString().slice(0,10),
          type: 'OUT',
          unit_id: o.unit_id,
          product_id: it.product_id,
          qty: Number(it.qty_base||0),
          note: `Dispatch for ${o.order_no}`,
          created_at: SSIApp.nowISO()
        });
      }

      o.status = 'DISPATCHED';
      o.dispatched_at = SSIApp.nowISO();

      SSIApp.setState(st);
      SSIApp.audit('UPDATE','sales_order',o.id,{ status:'DISPATCHED' });
      SSIApp.toast('Dispatched','ok');

      closeModal();
      render();
    };
  };

  return { render };
})();
