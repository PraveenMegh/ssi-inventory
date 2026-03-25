/* global SSIApp */

const SSIInventory = (() => {
  const TYPES = ['OPENING','IN','OUT','ADJUST','TRANSFER_OUT','TRANSFER_IN'];

  const calcBalance = (st, unit_id, product_id) => {
    let bal = 0;
    for (const t of st.inventory_txn) {
      if (t.unit_id !== unit_id) continue;
      if (t.product_id !== product_id) continue;
      if (['OPENING','IN','TRANSFER_IN','ADJUST'].includes(t.type)) bal += Number(t.qty||0);
      if (['OUT','TRANSFER_OUT'].includes(t.type)) bal -= Number(t.qty||0);
    }
    return bal;
  };

  const render = () => {
    if (!SSIApp.requireRole(['ADMIN','STOCK','DISPATCH'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();

    const unitOpts = st.units.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
    const prodOpts = st.products.map(p=>`<option value="${p.id}">${p.name} (${p.uom||'KG'})</option>`).join('');

    const balances = st.units.flatMap(u => st.products.map(p => {
      const b = calcBalance(st, u.id, p.id);
      const low = (p.reorder_level!=null && b <= p.reorder_level);
      return { unit:u, product:p, bal:b, low };
    }));

    const balanceRows = balances.map(x=>`
      <tr class="border-t">
        <td class="py-2 pr-3">${x.unit.name}</td>
        <td class="py-2 pr-3 font-semibold">${x.product.name}</td>
        <td class="py-2 pr-3">
          <span class="chip ${x.product.uom==='NOS'?'chip-warn':'chip-ok'}">${x.product.uom||'KG'}</span>
        </td>
        <td class="py-2 pr-3 text-xs text-slate-500">${(x.product.pack_sizes||[]).join(', ')||'-'}</td>
        <td class="py-2 pr-3 font-semibold ${x.low?'text-rose-700':''}">${x.bal.toFixed(3)}</td>
        <td class="py-2 pr-3">${x.low ? '<span class="chip chip-urgent">⚠️ Low</span>' : '<span class="chip chip-ok">✅ OK</span>'}</td>
      </tr>`).join('');

    const txRows = st.inventory_txn.slice(0,80).map(t => {
      const u = st.units.find(x=>x.id===t.unit_id);
      const p = st.products.find(x=>x.id===t.product_id);
      const packInfo = t.pack_desc ? `<span class="text-xs text-slate-400 ml-1">(${t.pack_desc})</span>` : '';
      return `
        <tr class="border-t">
          <td class="py-2 pr-3 text-slate-600">${t.date}</td>
          <td class="py-2 pr-3">
            <span class="chip ${t.type==='OUT'||t.type==='TRANSFER_OUT'?'chip-warn':t.type==='OPENING'?'chip-ok':t.type==='ADJUST'?'chip-urgent':'chip-ok'}">${t.type}</span>
          </td>
          <td class="py-2 pr-3">${u?.name || '-'}</td>
          <td class="py-2 pr-3 font-semibold">${p?.name || '-'}</td>
          <td class="py-2 pr-3">${Number(t.qty||0).toFixed(3)} ${p?.uom||'KG'}${packInfo}</td>
          <td class="py-2 pr-3 text-slate-600">${t.note || ''}</td>
        </tr>`;
    }).join('');

    const content = `
      <div class="grid grid-cols-1 gap-5">
        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-extrabold">Inventory</div>
              <div class="text-sm text-slate-500">Ledger-based stock. Opening stock, IN, OUT, Adjustments, Transfers.</div>
            </div>
            <button id="btnAddTxn" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">+ Add Entry</button>
          </div>

          <div class="mt-4 overflow-auto">
            <table class="w-full text-sm">
              <thead class="text-left text-slate-500 bg-slate-50">
                <tr>
                  <th class="py-2 pr-3 pl-2">Unit</th>
                  <th class="py-2 pr-3">Product</th>
                  <th class="py-2 pr-3">UoM</th>
                  <th class="py-2 pr-3">Pack Sizes</th>
                  <th class="py-2 pr-3">Balance</th>
                  <th class="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>${balanceRows}</tbody>
            </table>
            ${st.products.length===0 ? `<div class="text-sm text-slate-500 py-4">Add products first (Admin → Products).</div>`:''}
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <div class="text-lg font-extrabold">Recent Transactions</div>
          <div class="mt-3 overflow-auto">
            <table class="w-full text-sm">
              <thead class="text-left text-slate-500 bg-slate-50">
                <tr>
                  <th class="py-2 pr-3 pl-2">Date</th>
                  <th class="py-2 pr-3">Type</th>
                  <th class="py-2 pr-3">Unit</th>
                  <th class="py-2 pr-3">Product</th>
                  <th class="py-2 pr-3">Qty (Pack Info)</th>
                  <th class="py-2 pr-3">Note</th>
                </tr>
              </thead>
              <tbody>${txRows || ''}</tbody>
            </table>
          </div>
        </div>
      </div>

      ${modalHtml(unitOpts, prodOpts)}
    `;

    SSIApp.render(SSIApp.shell(content, 'inventory'));
    SSIApp.bindShellEvents();

    document.getElementById('btnAddTxn').addEventListener('click', ()=>openModal());
    bindModalEvents();
  };

  // ── SMART MODAL ────────────────────────────────────────────────
  const modalHtml = (unitOpts, prodOpts) => `
    <div id="txnModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
      <div class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-lg font-extrabold">Add Inventory Entry</div>
            <div class="text-xs text-slate-500">Select product → pack type auto-loads → qty auto-calculates</div>
          </div>
          <button id="txnModalClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
        </div>

        <!-- Row 1: Date + Type -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label class="font-semibold">Date</label>
            <input id="tDate" type="date" class="mt-1 w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label class="font-semibold">Entry Type</label>
            <select id="tType" class="mt-1 w-full px-3 py-2 rounded-xl border">
              <option value="OPENING">📂 OPENING (Opening Stock)</option>
              <option value="IN">📥 IN (Stock Received)</option>
              <option value="OUT">📤 OUT (Stock Issued)</option>
              <option value="ADJUST">🔧 ADJUST (Correction)</option>
              <option value="TRANSFER_OUT">➡️ TRANSFER OUT</option>
              <option value="TRANSFER_IN">⬅️ TRANSFER IN</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Unit + Product -->
        <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <label class="font-semibold">Unit / Location</label>
            <select id="tUnit" class="mt-1 w-full px-3 py-2 rounded-xl border">${unitOpts}</select>
          </div>
          <div>
            <label class="font-semibold">Product</label>
            <select id="tProd" class="mt-1 w-full px-3 py-2 rounded-xl border">${prodOpts}</select>
          </div>
        </div>

        <!-- Product Info Card (auto-fills on product select) -->
        <div id="tProdInfo" class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm hidden">
          <div class="flex flex-wrap gap-3 items-center">
            <div><span class="text-slate-500">UoM:</span> <span id="tProdUom" class="font-bold text-rose-700"></span></div>
            <div><span class="text-slate-500">Pack Sizes:</span> <span id="tProdPacks" class="font-semibold text-slate-700"></span></div>
            <div id="tCartonStdRow" class="hidden"><span class="text-slate-500">Carton Std:</span> <span id="tProdCarton" class="font-semibold text-blue-700"></span> KG/carton</div>
            <div><span class="text-slate-500">Current Stock:</span> <span id="tProdBalance" class="font-bold"></span></div>
          </div>
        </div>

        <!-- Pack Type + Size fields -->
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <label class="font-semibold">Pack / Entry Type</label>
            <select id="tPackMode" class="mt-1 w-full px-3 py-2 rounded-xl border">
              <option value="BAG">🛍️ KG Bags — Size × No. of Bags</option>
              <option value="CARTON_MANUAL">📦 Cartons — Enter KG per Carton</option>
              <option value="CARTON_STD">📦 Cartons — Use Product Standard</option>
              <option value="KG">⚖️ Direct KG / Weight Entry</option>
              <option value="NOS">🔢 Units / NOS (pieces)</option>
            </select>
          </div>
          <div id="tPackSizeRow">
            <label class="font-semibold" id="tPackSizeLabel">Bag Size (KG)</label>
            <input id="tPackSize" type="number" step="0.001" min="0"
              class="mt-1 w-full px-3 py-2 rounded-xl border"
              placeholder="e.g. 30 for 30 KG bag" />
          </div>
        </div>

        <!-- Count + Auto Total -->
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div id="tCountRow">
            <label class="font-semibold" id="tCountLabel">No. of Bags / Cartons</label>
            <input id="tCount" type="number" step="1" min="0"
              class="mt-1 w-full px-3 py-2 rounded-xl border"
              placeholder="e.g. 50" />
          </div>
          <div>
            <label class="font-semibold text-rose-700">📊 Total Quantity (auto)</label>
            <div id="tQtyDisplay" class="mt-1 w-full px-3 py-2.5 rounded-xl border-2 border-rose-200 bg-rose-50 font-bold text-rose-700 text-base">
              0
            </div>
            <input type="hidden" id="tQty" value="0" />
          </div>
        </div>

        <!-- Note -->
        <div class="mt-3 text-sm">
          <label class="font-semibold">Note / Reference</label>
          <input id="tNote" class="mt-1 w-full px-3 py-2 rounded-xl border"
            placeholder="e.g. Purchase Bill No., Dispatch Order, Opening balance" />
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button id="txnModalSave"
            class="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 text-sm">
            💾 Save Entry
          </button>
        </div>
      </div>
    </div>`;

  const openModal = () => {
    document.getElementById('txnModal').classList.remove('hidden');
    document.getElementById('txnModal').classList.add('flex');
    document.getElementById('tDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('tPackSize').value = '';
    document.getElementById('tCount').value = '';
    document.getElementById('tQty').value = '0';
    document.getElementById('tQtyDisplay').textContent = '0';
    document.getElementById('tProdInfo').classList.add('hidden');
    // Trigger product info update
    updateProductInfo();
    updatePackModeUI();
  };

  const closeModal = () => {
    document.getElementById('txnModal').classList.add('hidden');
    document.getElementById('txnModal').classList.remove('flex');
  };

  // ── Smart UX helpers ──────────────────────────────────────────

  const updateProductInfo = () => {
    const st = SSIApp.getState();
    const prodId = document.getElementById('tProd').value;
    const unitId = document.getElementById('tUnit').value;
    const p = st.products.find(x=>x.id===prodId);
    if (!p) { document.getElementById('tProdInfo').classList.add('hidden'); return; }

    document.getElementById('tProdInfo').classList.remove('hidden');

    // UoM
    const uom = p.uom || 'KG';
    document.getElementById('tProdUom').textContent = uom;

    // Pack sizes
    const packs = (p.pack_sizes||[]);
    document.getElementById('tProdPacks').textContent = packs.length ? packs.join(' | ') : 'Not specified';

    // Carton standard
    if (p.carton_std_kg) {
      document.getElementById('tCartonStdRow').classList.remove('hidden');
      document.getElementById('tProdCarton').textContent = p.carton_std_kg;
    } else {
      document.getElementById('tCartonStdRow').classList.add('hidden');
    }

    // Current stock
    const bal = calcBalance(st, unitId, prodId);
    const balEl = document.getElementById('tProdBalance');
    balEl.textContent = `${bal.toFixed(3)} ${uom}`;
    balEl.className = bal <= 0 ? 'font-bold text-rose-600' : 'font-bold text-emerald-600';

    // Auto-set pack mode for NOS products
    if (uom === 'NOS') {
      document.getElementById('tPackMode').value = 'NOS';
    }

    updatePackModeUI();
    recalcQty();
  };

  const updatePackModeUI = () => {
    const st = SSIApp.getState();
    const mode = document.getElementById('tPackMode').value;
    const prodId = document.getElementById('tProd')?.value;
    const p = st.products.find(x=>x.id===prodId);

    const sizeRow = document.getElementById('tPackSizeRow');
    const countRow = document.getElementById('tCountRow');
    const sizeLabel = document.getElementById('tPackSizeLabel');
    const countLabel = document.getElementById('tCountLabel');
    const sizeInput = document.getElementById('tPackSize');

    if (mode === 'NOS') {
      // Only count (units)
      sizeRow.classList.add('hidden');
      countRow.classList.remove('hidden');
      countLabel.textContent = 'Quantity (Units / NOS)';
    } else if (mode === 'KG') {
      // Only direct KG
      sizeRow.classList.remove('hidden');
      countRow.classList.add('hidden');
      sizeLabel.textContent = 'Quantity (KG)';
      sizeInput.placeholder = 'Enter total KG directly';
    } else if (mode === 'BAG') {
      // Bag size + bag count
      sizeRow.classList.remove('hidden');
      countRow.classList.remove('hidden');
      sizeLabel.textContent = '🛍️ Bag Size (KG per bag)';
      countLabel.textContent = 'No. of Bags';
      sizeInput.placeholder = 'e.g. 30 for 30 KG bag';
      // Auto-fill from product pack sizes
      if (p && p.pack_sizes && p.pack_sizes.length > 0 && !sizeInput.value) {
        // Find largest pack size in KG
        const kgMap = {'100g':0.1,'200g':0.2,'500g':0.5,'1kg':1,'30kg':30,'40kg':40,'50kg':50};
        const sizes = p.pack_sizes.map(s=>kgMap[s]||0).filter(x=>x>0).sort((a,b)=>b-a);
        if (sizes.length) sizeInput.value = sizes[0];
      }
    } else if (mode === 'CARTON_MANUAL') {
      sizeRow.classList.remove('hidden');
      countRow.classList.remove('hidden');
      sizeLabel.textContent = '📦 KG per Carton';
      countLabel.textContent = 'No. of Cartons';
      sizeInput.placeholder = 'e.g. 20 for 20 KG per carton';
    } else if (mode === 'CARTON_STD') {
      sizeRow.classList.remove('hidden');
      countRow.classList.remove('hidden');
      sizeLabel.textContent = '📦 KG per Carton (Product Std)';
      countLabel.textContent = 'No. of Cartons';
      sizeInput.placeholder = 'Auto from product standard';
      // Auto-fill carton std
      if (p && p.carton_std_kg) {
        sizeInput.value = p.carton_std_kg;
        sizeInput.readOnly = true;
        sizeInput.classList.add('opacity-60');
      }
      return; // don't clear readOnly for other modes
    }

    // Ensure size is editable for non-CARTON_STD modes
    sizeInput.readOnly = false;
    sizeInput.classList.remove('opacity-60');

    recalcQty();
  };

  const recalcQty = () => {
    const mode = document.getElementById('tPackMode').value;
    const size = Number(document.getElementById('tPackSize').value || 0);
    const count = Number(document.getElementById('tCount').value || 0);
    const st = SSIApp.getState();
    const prodId = document.getElementById('tProd')?.value;
    const p = st.products.find(x=>x.id===prodId);

    let qty = 0;
    let label = '';

    if (mode === 'NOS') {
      qty = count;
      label = `${qty} Units`;
    } else if (mode === 'KG') {
      qty = size;
      label = `${qty.toFixed(3)} KG`;
    } else if (mode === 'BAG') {
      qty = size * count;
      label = count > 0 && size > 0 ? `${size} KG × ${count} bags = ${qty.toFixed(3)} KG` : `${qty.toFixed(3)} KG`;
    } else if (mode === 'CARTON_MANUAL') {
      qty = size * count;
      label = count > 0 && size > 0 ? `${size} KG × ${count} cartons = ${qty.toFixed(3)} KG` : `${qty.toFixed(3)} KG`;
    } else if (mode === 'CARTON_STD') {
      const std = p?.carton_std_kg || size;
      qty = std * count;
      label = count > 0 ? `${std} KG × ${count} cartons = ${qty.toFixed(3)} KG` : `${qty.toFixed(3)} KG`;
    }

    document.getElementById('tQty').value = qty;
    document.getElementById('tQtyDisplay').textContent = label || '0';
  };

  const bindModalEvents = () => {
    document.getElementById('txnModalClose').onclick = closeModal;
    document.getElementById('txnModal').addEventListener('click', (e)=>{
      if (e.target.id==='txnModal') closeModal();
    });

    // Product / Unit change → refresh product info card
    document.getElementById('tProd').addEventListener('change', updateProductInfo);
    document.getElementById('tUnit').addEventListener('change', updateProductInfo);

    // Pack mode change → update UI
    document.getElementById('tPackMode').addEventListener('change', ()=>{
      updatePackModeUI();
      recalcQty();
    });

    // Size / Count inputs → recalc
    document.getElementById('tPackSize').addEventListener('input', recalcQty);
    document.getElementById('tCount').addEventListener('input', recalcQty);

    document.getElementById('txnModalSave').onclick = () => {
      const st = SSIApp.getState();
      if (st.products.length===0) return SSIApp.toast('Add products first','warn');

      const qty = Number(document.getElementById('tQty').value || 0);
      if (!qty || qty <= 0) return SSIApp.toast('Quantity must be > 0 — check bag size and count','warn');

      const mode = document.getElementById('tPackMode').value;
      const size = Number(document.getElementById('tPackSize').value || 0);
      const count = Number(document.getElementById('tCount').value || 0);

      // Build pack description for ledger display
      let pack_desc = '';
      if (mode === 'BAG') pack_desc = `${size}KG×${count} bags`;
      else if (mode === 'CARTON_MANUAL') pack_desc = `${size}KG×${count} cartons`;
      else if (mode === 'CARTON_STD') {
        const p2 = st.products.find(x=>x.id===document.getElementById('tProd').value);
        pack_desc = `${p2?.carton_std_kg||size}KG×${count} cartons(std)`;
      } else if (mode === 'NOS') pack_desc = 'units';

      const payload = {
        id: SSIApp.uid('txn'),
        date: document.getElementById('tDate').value,
        type: document.getElementById('tType').value,
        unit_id: document.getElementById('tUnit').value,
        product_id: document.getElementById('tProd').value,
        qty,
        pack_mode: mode,
        pack_desc,
        note: document.getElementById('tNote').value.trim(),
        created_at: SSIApp.nowISO()
      };

      if (!payload.date || !payload.unit_id || !payload.product_id) return SSIApp.toast('Missing fields','warn');

      st.inventory_txn.unshift(payload);
      SSIApp.setState(st);
      SSIApp.audit('CREATE','inventory_txn',payload.id,{ type:payload.type, qty:payload.qty, pack_desc:payload.pack_desc });
      SSIApp.toast('✅ Saved — ' + payload.pack_desc,'ok');
      closeModal();
      render();
    };
  };

  return { render, calcBalance };
})();
