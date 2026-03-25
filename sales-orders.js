/* global SSIApp, SSIAuth, SSIProducts, SSIInventory */

const SSIOrders = (() => {
  const CURRENCIES = ['INR','USD','EUR','GBP'];

  const canEdit = (order, user) => {
    if (user.role==='ADMIN') return true;
    if (user.role!=='SALES') return false;
    if (order.created_by !== user.id) return false;
    return order.status === 'DRAFT';
  };

  const listForUser = (st, user) => {
    if (user.role==='ADMIN') return st.sales_orders;
    if (user.role==='SALES') return st.sales_orders.filter(o => o.created_by === user.id);
    return [];
  };

  const calcTotals = (order) => {
    const total = (order.items||[]).reduce((s,it)=> s + (Number(it.line_total||0)), 0);
    return { total };
  };

  const render = () => {
    const user = SSIAuth.currentUser();
    if (!SSIApp.requireRole(['ADMIN','SALES'])) return SSIApp.toast('Not allowed', 'err');

    const st = SSIApp.getState();
    const orders = listForUser(st, user);

    const rows = orders.map(o => {
      const c = st.clients.find(x=>x.id===o.client_id);
      const u = st.units.find(x=>x.id===o.unit_id);
      const total = SSIApp.moneyFmt(o.total_value||0, o.currency||'INR');
      const urgent = o.urgent ? '<span class="chip chip-urgent">URGENT</span>' : '';
      return `
      <tr class="border-t ${o.urgent?'bg-rose-50':''}">
        <td class="py-2 pr-3 font-semibold">${o.order_no}</td>
        <td class="py-2 pr-3">${o.date}</td>
        <td class="py-2 pr-3">${u?.name||'-'}</td>
        <td class="py-2 pr-3">${c?.name||'-'}</td>
        <td class="py-2 pr-3 text-center">${o.urgent ? '<span class="chip chip-urgent text-base">🚨 YES</span>' : '<span class="text-slate-300 text-sm">—</span>'}</td>
        <td class="py-2 pr-3"><span class="chip ${o.status==='DISPATCHED'?'chip-ok':o.status==='SUBMITTED'?'chip-warn':''}">${o.status}</span></td>
        <td class="py-2 pr-3">${total}</td>
        <td class="py-2 text-right">
          <button data-view="${o.id}" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Open</button>
        </td>
      </tr>`;
    }).join('');

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold">Sales Orders</div>
            <div class="text-sm text-slate-500">DRAFT→SUBMITTED→DISPATCHED. 🚨 Urgent orders processed first. After submit → visible in <b>Dispatch panel</b>.</div>
          </div>
          <button id="btnNewOrder" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">New Order</button>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500">
              <tr>
                <th class="py-2 pr-3">Order</th>
                <th class="py-2 pr-3">Date</th>
                <th class="py-2 pr-3">Unit</th>
                <th class="py-2 pr-3">Client</th>
                <th class="py-2 pr-3 text-center">🚨 Urgent</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 pr-3">Total</th>
                <th class="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${orders.length===0 ? `<div class="text-sm text-slate-500 py-4">No orders yet.</div>`:''}
        </div>
      </div>

      ${editorHtml(st)}
    `;

    SSIApp.render(SSIApp.shell(content, 'orders'));
    SSIApp.bindShellEvents();

    document.getElementById('btnNewOrder').addEventListener('click', ()=>openEditor());
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-view');
      const st2 = SSIApp.getState();
      openEditor(st2.sales_orders.find(x=>x.id===id));
    }));

    bindEditorEvents();
  };

  const editorHtml = (st) => {
    const clientOpts = st.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    const unitOpts = st.units.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
    const curOpts = CURRENCIES.map(c=>`<option value="${c}">${c}</option>`).join('');
    const prodOpts = st.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');

    return `
    <div id="orderEditor" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
      <div class="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold" id="oeTitle">New Order</div>
            <div class="text-sm text-slate-500" id="oeSub">Create and submit order.</div>
          </div>
          <button id="oeClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
        </div>

        <input type="hidden" id="oeId" />

        <div class="grid grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <label class="font-semibold">Date</label>
            <input id="oeDate" type="date" class="mt-1 w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label class="font-semibold">Unit</label>
            <select id="oeUnit" class="mt-1 w-full px-3 py-2 rounded-xl border">${unitOpts}</select>
          </div>
          <div class="col-span-2">
            <label class="font-semibold">Client</label>
            <select id="oeClient" class="mt-1 w-full px-3 py-2 rounded-xl border">${clientOpts}</select>
          </div>
          <div>
            <label class="font-semibold">Currency</label>
            <select id="oeCurrency" class="mt-1 w-full px-3 py-2 rounded-xl border">${curOpts}</select>
          </div>
          <div>
            <label class="font-semibold">🚨 Urgent Order?</label>
            <div class="mt-1 flex items-center gap-3">
              <button type="button" id="oeUrgentBtn"
                class="w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all"
                onclick="(()=>{
                  const v = document.getElementById('oeUrgent').value;
                  const isUrgent = v !== 'true';
                  document.getElementById('oeUrgent').value = String(isUrgent);
                  const btn = document.getElementById('oeUrgentBtn');
                  if(isUrgent){ btn.className='w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all bg-rose-600 text-white border-rose-600'; btn.textContent='🚨 YES — URGENT'; }
                  else { btn.className='w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all bg-white text-slate-400 border-slate-200'; btn.textContent='No — Normal Order'; }
                })()">
                No — Normal Order
              </button>
              <input type="hidden" id="oeUrgent" value="false" />
            </div>
          </div>
          <div class="col-span-2">
            <label class="font-semibold">Remarks</label>
            <input id="oeRemarks" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Optional" />
          </div>
        </div>

        <div class="mt-5">
          <div class="flex items-center justify-between">
            <div class="text-sm font-extrabold">Items</div>
            <button id="oeAddItem" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">+ Add Item</button>
          </div>
          <div class="mt-2 overflow-auto border border-slate-200 rounded-2xl">
            <table class="w-full text-sm">
              <thead class="text-left text-slate-500 bg-slate-50">
                <tr>
                  <th class="py-2 px-3">Product</th>
                  <th class="py-2 px-3">Pack Type</th>
                  <th class="py-2 px-3 text-slate-600">Bag/Carton Size (KG)</th>
                  <th class="py-2 px-3 text-slate-600">No. of Bags / Cartons</th>
                  <th class="py-2 px-3 font-bold">Total KG / Units</th>
                  <th class="py-2 px-3">Rate (per KG/Unit)</th>
                  <th class="py-2 px-3 font-bold">Line Total (₹)</th>
                  <th class="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody id="oeItems"></tbody>
            </table>
          </div>

          <div class="mt-3 flex items-center justify-end gap-4">
            <div class="text-sm text-slate-500">Total:</div>
            <div class="text-lg font-extrabold" id="oeTotal">₹0.00</div>
          </div>
        </div>

        <div class="mt-5 flex items-center justify-between">
          <div class="text-xs text-slate-500" id="oeLockHint"></div>
          <div class="flex gap-2">
            <button id="oeSave" class="px-4 py-2 rounded-xl border hover:bg-slate-50 font-semibold">Save Draft</button>
            <button id="oeSubmit" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Submit</button>
          </div>
        </div>

      </div>
    </div>
    <template id="tplItem">
      <tr class="border-t">
        <td class="py-2 px-3">
          <select class="itProd w-full px-3 py-2 rounded-xl border">${prodOpts}</select>
        </td>
        <td class="py-2 px-3">
          <select class="itMode w-full px-3 py-2 rounded-xl border" title="Select packing type">
            <option value="BAG">🛍️ KG Bags (Size × Count)</option>
            <option value="CARTON_MANUAL">📦 Cartons – Enter KG/Carton</option>
            <option value="CARTON_STD">📦 Cartons – Use Product Std</option>
            <option value="KG">⚖️ Direct KG Entry</option>
            <option value="NOS">🔢 Units / NOS</option>
          </select>
        </td>
        <td class="py-2 px-3"><input type="number" step="0.001" class="itSize w-full px-3 py-2 rounded-xl border" value="30" placeholder="Bag/Carton KG" title="Bag size or KG per carton" /></td>
        <td class="py-2 px-3"><input type="number" step="0.001" class="itCount w-full px-3 py-2 rounded-xl border" value="1" placeholder="Count" title="Number of bags or cartons" /></td>
        <td class="py-2 px-3 font-semibold itTotal">0</td>
        <td class="py-2 px-3"><input type="number" step="0.01" class="itPrice w-full px-3 py-2 rounded-xl border" value="0" /></td>
        <td class="py-2 px-3 font-semibold itLine">0</td>
        <td class="py-2 px-3 text-right"><button class="itDel px-3 py-1.5 rounded-lg border hover:bg-slate-50">Remove</button></td>
      </tr>
    </template>
    `;
  };

  const openEditor = (order=null) => {
    const st = SSIApp.getState();
    const user = SSIAuth.currentUser();

    // prerequisites
    if (st.products.length===0) return SSIApp.toast('Add products first (Admin → Products)','warn');
    if (st.clients.length===0) return SSIApp.toast('Add clients first (Admin → Clients/Vendors)','warn');

    const el = document.getElementById('orderEditor');
    el.classList.remove('hidden');
    el.classList.add('flex');

    const isNew = !order;
    const o = order || {
      id: SSIApp.uid('ord'),
      order_no: `SO-${String(st.sales_orders.length+1).padStart(4,'0')}`,
      date: new Date().toISOString().slice(0,10),
      unit_id: st.units[0]?.id,
      client_id: st.clients[0]?.id,
      currency: 'INR',
      urgent: false,
      remarks: '',
      status: 'DRAFT',
      items: [],
      created_by: user.id,
      submitted_at: null,
      created_at: SSIApp.nowISO(),
      total_value: 0
    };

    document.getElementById('oeId').value = o.id;
    document.getElementById('oeTitle').textContent = `${isNew?'New':'Edit'} Order • ${o.order_no}`;
    document.getElementById('oeDate').value = o.date;
    document.getElementById('oeUnit').value = o.unit_id;
    document.getElementById('oeClient').value = o.client_id;
    document.getElementById('oeCurrency').value = o.currency;
    document.getElementById('oeUrgent').value = String(!!o.urgent);
    // Sync urgent button visual
    const urgBtn = document.getElementById('oeUrgentBtn');
    if (urgBtn) {
      if (o.urgent) {
        urgBtn.className = 'w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all bg-rose-600 text-white border-rose-600';
        urgBtn.textContent = '🚨 YES — URGENT';
      } else {
        urgBtn.className = 'w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all bg-white text-slate-400 border-slate-200';
        urgBtn.textContent = 'No — Normal Order';
      }
    }
    document.getElementById('oeRemarks').value = o.remarks || '';

    // Render items
    const tbody = document.getElementById('oeItems');
    tbody.innerHTML = '';
    if (o.items.length===0) addItemRow();
    else o.items.forEach(it => addItemRow(it));

    // Locks
    const editable = canEdit(o,user);
    document.getElementById('oeLockHint').textContent = editable ? '' : 'Locked: Only Admin can edit after submission.';
    setEditorEnabled(editable || user.role==='ADMIN');

    // calculate
    recalc();
  };

  const closeEditor = () => {
    const el = document.getElementById('orderEditor');
    el.classList.add('hidden');
    el.classList.remove('flex');
  };

  const setEditorEnabled = (enabled) => {
    ['oeDate','oeUnit','oeClient','oeCurrency','oeUrgent','oeRemarks','oeAddItem','oeSave','oeSubmit'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
      if (el && !enabled) el.classList.add('opacity-60');
      if (el && enabled) el.classList.remove('opacity-60');
    });
    document.querySelectorAll('.itProd,.itPack,.itQty,.itPrice,.itDel').forEach(el => {
      el.disabled = !enabled;
      el.classList.toggle('opacity-60', !enabled);
    });
  };

  const bindEditorEvents = () => {
    document.getElementById('oeClose').onclick = closeEditor;
    document.getElementById('orderEditor').addEventListener('click', (e)=>{ if (e.target.id==='orderEditor') closeEditor(); });

    document.getElementById('oeAddItem').onclick = () => addItemRow();

    document.getElementById('oeCurrency').onchange = () => { autoFillPrices(); recalc(); };

    document.getElementById('oeSave').onclick = () => save(false);
    document.getElementById('oeSubmit').onclick = () => save(true);
  };

  const addItemRow = (it=null) => {
    const tpl = document.getElementById('tplItem');
    const frag = tpl.content.cloneNode(true);
    const tr = frag.querySelector('tr');

    const prodSel = tr.querySelector('.itProd');
    const modeSel = tr.querySelector('.itMode');
    const sizeIn = tr.querySelector('.itSize');
    const countIn = tr.querySelector('.itCount');
    const totalEl = tr.querySelector('.itTotal');
    const priceIn = tr.querySelector('.itPrice');
    const lineEl = tr.querySelector('.itLine');
    const delBtn = tr.querySelector('.itDel');

    if (it) {
      prodSel.value = it.product_id;
      modeSel.value = it.mode || 'BAG';
      sizeIn.value = it.size ?? 30;
      countIn.value = it.count ?? 1;
      totalEl.textContent = Number(it.qty_base || 0).toFixed(3);
      priceIn.value = it.price ?? 0;
      lineEl.textContent = Number(it.line_total || 0).toFixed(2);
    }

    const computeQtyBase = () => {
      const st = SSIApp.getState();
      const prodId = prodSel.value;
      const p = st.products.find(x=>x.id===prodId);
      const mode = modeSel.value;
      const size = Number(sizeIn.value || 0);
      const count = Number(countIn.value || 0);

      // If NOS product, force NOS mode
      if (p && p.uom === 'NOS') {
        modeSel.value = 'NOS';
      }

      if (modeSel.value === 'NOS') {
        // qty_base = units
        return Math.max(0, count);
      }

      // weight product => qty_base in KG
      if (modeSel.value === 'KG') {
        return Math.max(0, size);
      }
      if (modeSel.value === 'BAG') {
        return Math.max(0, size * count);
      }
      if (modeSel.value === 'CARTON_MANUAL') {
        return Math.max(0, size * count);
      }
      if (modeSel.value === 'CARTON_STD') {
        const std = Number(p?.carton_std_kg || 0);
        return Math.max(0, std * count);
      }
      return Math.max(0, size * count);
    };

    const updateUIForMode = () => {
      const st = SSIApp.getState();
      const prodId = prodSel.value;
      const p = st.products.find(x=>x.id===prodId);
      const mode = modeSel.value;

      if (p && p.uom === 'NOS') {
        modeSel.value = 'NOS';
      }

      if (modeSel.value === 'NOS') {
        sizeIn.value = 1;
        sizeIn.disabled = true;
        sizeIn.classList.add('opacity-60');
      } else if (modeSel.value === 'CARTON_STD') {
        sizeIn.value = Number(p?.carton_std_kg || 0);
        sizeIn.disabled = true;
        sizeIn.classList.add('opacity-60');
      } else {
        sizeIn.disabled = false;
        sizeIn.classList.remove('opacity-60');
      }

      // defaults
      if (!it) {
        if (p && p.uom !== 'NOS' && modeSel.value === 'BAG') {
          // use common default 30kg if present
          const has30 = (p.pack_sizes||[]).includes('30kg');
          sizeIn.value = has30 ? 30 : (Number(sizeIn.value||0) || 30);
        }
      }

      // price autofill
      autoFillPricesRow(tr);
    };

    const recalcRow = () => {
      const qtyBase = computeQtyBase();
      totalEl.textContent = Number(qtyBase).toFixed(3);
      const lineTotal = qtyBase * Number(priceIn.value || 0);
      lineEl.textContent = Number(lineTotal).toFixed(2);
      recalc();
    };

    const onChange = () => {
      updateUIForMode();
      recalcRow();
    };

    [prodSel, modeSel, sizeIn, countIn, priceIn].forEach(el => el.addEventListener('input', onChange));
    prodSel.addEventListener('change', onChange);
    modeSel.addEventListener('change', onChange);

    delBtn.addEventListener('click', () => {
      tr.remove();
      recalc();
    });

    document.getElementById('oeItems').appendChild(frag);
    updateUIForMode();
    recalcRow();
  };

  const autoFillPricesRow = (tr) => {
    const st = SSIApp.getState();
    const cur = document.getElementById('oeCurrency')?.value || 'INR';
    const prodId = tr.querySelector('.itProd').value;
    const p = st.products.find(x=>x.id===prodId);
    const priceEl = tr.querySelector('.itPrice');
    if (p?.prices && p.prices[cur]!=null && (Number(priceEl.value||0)===0)) {
      priceEl.value = p.prices[cur];
    }
  };

  const autoFillPrices = () => {
    document.querySelectorAll('#oeItems tr').forEach(tr => autoFillPricesRow(tr));
  };

  const recalc = () => {
    const cur = document.getElementById('oeCurrency')?.value || 'INR';
    let total = 0;
    document.querySelectorAll('#oeItems tr').forEach(tr => {
      const qtyBase = Number(tr.querySelector('.itTotal').textContent||0);
      const price = Number(tr.querySelector('.itPrice').value||0);
      total += qtyBase * price;
    });
    document.getElementById('oeTotal').textContent = SSIApp.moneyFmt(total, cur);
  };

  const save = (submit) => {
    const st = SSIApp.getState();
    const user = SSIAuth.currentUser();

    const id = document.getElementById('oeId').value;
    let order = st.sales_orders.find(x=>x.id===id);

    // If existing and locked
    if (order && !canEdit(order,user) && user.role!=='ADMIN') {
      return SSIApp.toast('Order is locked (submitted). Admin only.','err');
    }

    const payload = order ? { ...order } : {
      id,
      order_no: `SO-${String(st.sales_orders.length+1).padStart(4,'0')}`,
      created_by: user.id,
      created_at: SSIApp.nowISO()
    };

    payload.date = document.getElementById('oeDate').value;
    payload.unit_id = document.getElementById('oeUnit').value;
    payload.client_id = document.getElementById('oeClient').value;
    payload.currency = document.getElementById('oeCurrency').value;
    payload.urgent = document.getElementById('oeUrgent').value === 'true';
    payload.remarks = document.getElementById('oeRemarks').value.trim();
    payload.status = submit ? 'SUBMITTED' : 'DRAFT';
    if (submit) payload.submitted_at = SSIApp.nowISO();

    const items = [];
    document.querySelectorAll('#oeItems tr').forEach(tr => {
      const prodId = tr.querySelector('.itProd').value;
      const mode = tr.querySelector('.itMode').value;
      const size = Number(tr.querySelector('.itSize').value||0);
      const count = Number(tr.querySelector('.itCount').value||0);
      const qty_base = Number(tr.querySelector('.itTotal').textContent||0);
      const price = Number(tr.querySelector('.itPrice').value||0);
      if (!prodId || qty_base<=0) return;
      items.push({
        product_id: prodId,
        mode,
        size,
        count,
        qty_base,
        price,
        line_total: Number((qty_base*price).toFixed(2))
      });
    });
    if (items.length===0) return SSIApp.toast('Add at least one item','warn');
    payload.items = items;

    const totals = calcTotals(payload);
    payload.total_value = totals.total;

    if (!payload.date || !payload.unit_id || !payload.client_id) return SSIApp.toast('Missing fields','warn');

    // persist
    const idx = st.sales_orders.findIndex(x=>x.id===payload.id);
    if (idx>=0) st.sales_orders[idx] = payload;
    else st.sales_orders.unshift(payload);

    SSIApp.setState(st);
    SSIApp.audit(idx>=0?'UPDATE':'CREATE','sales_order',payload.id,{ status: payload.status, order_no: payload.order_no });
    SSIApp.toast(submit ? 'Submitted' : 'Saved (Draft)', 'ok');

    closeEditor();
    render();
  };

  return { render };
})();
