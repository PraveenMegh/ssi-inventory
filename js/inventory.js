/* SSI Inventory Module - Smart Entry */
const SSIInventory = (() => {
  const ENTRY_TYPES = [
    { value:'OPENING',     label:'📂 Opening Stock' },
    { value:'IN',          label:'📥 Stock IN (Received)' },
    { value:'OUT',         label:'📤 Stock OUT (Issued)' },
    { value:'ADJUST',      label:'🔧 Adjustment' },
    { value:'TRANSFER_OUT',label:'↗️ Transfer OUT' },
    { value:'TRANSFER_IN', label:'↙️ Transfer IN' },
  ];

  const PACK_MODES = [
    { value:'BAG',         label:'🛍️ KG Bags (Size × Count)' },
    { value:'CARTON_STD',  label:'📦 Cartons – Use Product Std' },
    { value:'CARTON_MAN',  label:'📦 Cartons – Enter KG/Carton' },
    { value:'DIRECT_KG',   label:'⚖️ Direct KG Entry' },
    { value:'NOS',         label:'🔢 Units / NOS' },
  ];

  function render(area) {
    if (!SSIApp.hasRole('ADMIN','STOCK')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st = SSIApp.getState();
    const ledger = [...st.inventory].sort((a,b) => new Date(b.date) - new Date(a.date));

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🏭 Inventory Ledger</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIInventory.exportExcel()">📤 Export</button>
          <button class="btn btn-primary" onclick="SSIInventory.openEntryModal()">+ Add Entry</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:16px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
          <div>
            <label>Filter by Unit</label>
            <select id="inv-filter-unit" onchange="SSIInventory.applyFilter()">
              <option value="">All Units</option>
              ${st.units.filter(u=>u.active).map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Filter by Product</label>
            <select id="inv-filter-product" onchange="SSIInventory.applyFilter()">
              <option value="">All Products</option>
              ${st.products.filter(p=>p.active).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Filter by Type</label>
            <select id="inv-filter-type" onchange="SSIInventory.applyFilter()">
              <option value="">All Types</option>
              ${ENTRY_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>From Date</label>
            <input type="date" id="inv-filter-from" onchange="SSIInventory.applyFilter()">
          </div>
          <div>
            <label>To Date</label>
            <input type="date" id="inv-filter-to" onchange="SSIInventory.applyFilter()">
          </div>
        </div>
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table id="inv-table">
            <thead><tr>
              <th>Date</th><th>Type</th><th>Unit</th><th>Product</th>
              <th>Pack Mode</th><th style="text-align:right;">Qty (KG/NOS)</th>
              <th>Bill / Note</th><th>By</th>
              ${SSIApp.hasRole('ADMIN') ? '<th>Del</th>' : ''}
            </tr></thead>
            <tbody id="inv-tbody">
              ${renderRows(ledger, st)}
            </tbody>
          </table>
        </div>
        <div id="inv-count" style="margin-top:12px;font-size:13px;color:#94a3b8;">Total: ${ledger.length} entries</div>
      </div>`;
  }

  function renderRows(ledger, st) {
    if (!ledger.length) return `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">No inventory entries yet. Add your first entry!</td></tr>`;
    const typeColors = {IN:'#dcfce7',OUT:'#fee2e2',OPENING:'#dbeafe',ADJUST:'#fef3c7',TRANSFER_OUT:'#fce7f3',TRANSFER_IN:'#ede9fe'};
    const typeTextColors = {IN:'#166534',OUT:'#991b1b',OPENING:'#1e40af',ADJUST:'#92400e',TRANSFER_OUT:'#9d174d',TRANSFER_IN:'#5b21b6'};
    return ledger.map(t => {
      const prod = st.products.find(p=>p.id===t.product_id);
      const unit = st.units.find(u=>u.id===t.unit_id);
      const user = st.users.find(u=>u.id===t.user_id);
      const bg = typeColors[t.type] || '#f1f5f9';
      const tc = typeTextColors[t.type] || '#374151';
      const isOut = ['OUT','TRANSFER_OUT'].includes(t.type);
      return `<tr data-unit="${t.unit_id}" data-product="${t.product_id}" data-type="${t.type}" data-date="${t.date}">
        <td style="white-space:nowrap;">${SSIApp.dateFmt(t.date)}</td>
        <td><span style="background:${bg};color:${tc};padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600;">${t.type}</span></td>
        <td style="font-size:13px;">${unit?.name||'—'}</td>
        <td><strong>${prod?.name||'—'}</strong><br><span style="font-size:11px;color:#94a3b8;">${prod?.sku||''}</span></td>
        <td style="font-size:12px;color:#64748b;">${t.pack_desc||'—'}</td>
        <td style="text-align:right;font-weight:700;color:${isOut?'#dc2626':'#16a34a'};">${isOut?'-':'+'} ${SSIApp.qtyFmt(t.qty)} ${prod?.uom||'KG'}</td>
        <td style="font-size:12px;color:#64748b;max-width:150px;">${t.note||'—'}</td>
        <td style="font-size:12px;color:#94a3b8;">${user?.name||t.user_name||'—'}</td>
        ${SSIApp.hasRole('ADMIN') ? `<td><button class="btn btn-danger btn-sm" onclick="SSIInventory.deleteEntry('${t.id}')">🗑️</button></td>` : ''}
      </tr>`;
    }).join('');
  }

  function applyFilter() {
    const unitF    = document.getElementById('inv-filter-unit')?.value    || '';
    const prodF    = document.getElementById('inv-filter-product')?.value || '';
    const typeF    = document.getElementById('inv-filter-type')?.value    || '';
    const fromF    = document.getElementById('inv-filter-from')?.value    || '';
    const toF      = document.getElementById('inv-filter-to')?.value      || '';
    const rows     = document.querySelectorAll('#inv-tbody tr[data-unit]');
    let visible = 0;
    rows.forEach(row => {
      const show = (!unitF || row.dataset.unit===unitF)
        && (!prodF || row.dataset.product===prodF)
        && (!typeF || row.dataset.type===typeF)
        && (!fromF || row.dataset.date >= fromF)
        && (!toF   || row.dataset.date <= toF);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const cnt = document.getElementById('inv-count');
    if (cnt) cnt.textContent = `Showing: ${visible} entries`;
  }

  function openEntryModal(prefillProductId, prefillUnitId) {
    const st = SSIApp.getState();
    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">📥 Add Inventory Entry</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2" style="margin-bottom:16px;">
          <div>
            <label>Date *</label>
            <input type="date" id="inv-date" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div>
            <label>Entry Type *</label>
            <select id="inv-type">
              ${ENTRY_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>SSI Unit *</label>
            <select id="inv-unit" onchange="SSIInventory.onProductUnitChange()">
              <option value="">— Select Unit —</option>
              ${st.units.filter(u=>u.active).map(u=>`<option value="${u.id}" ${u.id===prefillUnitId?'selected':''}>${u.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Product *</label>
            <select id="inv-product" onchange="SSIInventory.onProductUnitChange()">
              <option value="">— Select Product —</option>
              ${st.products.filter(p=>p.active).map(p=>`<option value="${p.id}" ${p.id===prefillProductId?'selected':''}>${p.name} (${p.uom||'KG'})</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Product Info Card -->
        <div id="inv-info-card" style="display:none;" class="info-card">
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;">
            <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">UoM</span><br><strong id="inv-uom-badge">KG</strong></div>
            <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Pack Sizes</span><br><span id="inv-pack-sizes" style="font-size:13px;">—</span></div>
            <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Carton Std</span><br><span id="inv-carton-std" style="font-size:13px;">—</span></div>
            <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Current Stock</span><br><strong id="inv-current-stock" style="font-size:16px;">—</strong></div>
          </div>
        </div>

        <!-- Pack Mode -->
        <div id="inv-pack-section" style="display:none;">
          <div style="margin-bottom:16px;">
            <label>Pack Type</label>
            <select id="inv-pack-mode" onchange="SSIInventory.onPackModeChange()">
              ${PACK_MODES.map(m=>`<option value="${m.value}">${m.label}</option>`).join('')}
            </select>
          </div>

          <div id="inv-pack-fields" class="form-grid form-grid-3">
            <!-- dynamically filled -->
          </div>

          <div id="inv-total-display" style="display:none;background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:14px 20px;margin-top:16px;text-align:center;">
            <span style="font-size:13px;color:#16a34a;font-weight:600;">Total Quantity</span><br>
            <span id="inv-total-qty" style="font-size:28px;font-weight:900;color:#16a34a;">0.000</span>
            <span id="inv-total-uom" style="font-size:16px;color:#16a34a;font-weight:600;"> KG</span>
          </div>
        </div>

        <!-- Note -->
        <div style="margin-top:16px;">
          <label>Bill No. / Note</label>
          <input id="inv-note" placeholder="e.g. Bill No. 1234 / Truck No. UP15AB1234">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="SSIInventory.saveEntry()">💾 Save Entry</button>
      </div>`;

    SSIApp.showModal(html);
    if (prefillProductId && prefillUnitId) setTimeout(() => onProductUnitChange(), 100);
  }

  function onProductUnitChange() {
    const productId = document.getElementById('inv-product')?.value;
    const unitId    = document.getElementById('inv-unit')?.value;
    const infoCard  = document.getElementById('inv-info-card');
    const packSec   = document.getElementById('inv-pack-section');

    if (!productId || !unitId) {
      if (infoCard) infoCard.style.display = 'none';
      if (packSec)  packSec.style.display  = 'none';
      return;
    }

    const st = SSIApp.getState();
    const prod = st.products.find(p => p.id === productId);
    if (!prod) return;

    const currentStock = SSIApp.getStock(productId, unitId);
    const isNOS = prod.uom === 'NOS';

    // Show info card
    document.getElementById('inv-uom-badge').textContent    = prod.uom || 'KG';
    document.getElementById('inv-pack-sizes').textContent   = (prod.pack_sizes||[]).join(', ') || '—';
    document.getElementById('inv-carton-std').textContent   = prod.carton_std > 0 ? prod.carton_std + ' KG/ctn' : '—';
    const stockEl = document.getElementById('inv-current-stock');
    stockEl.textContent = SSIApp.qtyFmt(currentStock) + ' ' + (prod.uom || 'KG');
    stockEl.style.color = currentStock <= 0 ? '#dc2626' : currentStock <= (prod.reorder_level||0) ? '#d97706' : '#16a34a';
    infoCard.style.display = 'block';
    packSec.style.display  = 'block';

    // Set default pack mode for NOS
    if (isNOS) {
      document.getElementById('inv-pack-mode').value = 'NOS';
    }
    onPackModeChange();
  }

  function onPackModeChange() {
    const mode = document.getElementById('inv-pack-mode')?.value;
    const fieldsDiv = document.getElementById('inv-pack-fields');
    const totalDiv  = document.getElementById('inv-total-display');
    if (!fieldsDiv) return;

    const productId = document.getElementById('inv-product')?.value;
    const st = SSIApp.getState();
    const prod = productId ? st.products.find(p=>p.id===productId) : null;

    // Build pack size options
    const packOpts = (prod?.pack_sizes||[]).map(s=>`<option value="${s}">${s}</option>`).join('');

    let html = '';
    if (mode === 'BAG') {
      html = `
        <div>
          <label>Bag Size (KG)</label>
          <select id="inv-bag-size" onchange="SSIInventory.calcTotal()">
            <option value="">—Select—</option>
            ${packOpts}
            <option value="custom">Custom...</option>
          </select>
        </div>
        <div id="inv-bag-custom-wrap" style="display:none;">
          <label>Custom Bag Size (KG)</label>
          <input type="number" id="inv-bag-custom" min="0.001" step="0.001" placeholder="e.g. 25" oninput="SSIInventory.calcTotal()">
        </div>
        <div>
          <label>No. of Bags *</label>
          <input type="number" id="inv-count" min="1" placeholder="e.g. 30" oninput="SSIInventory.calcTotal()">
        </div>`;
    } else if (mode === 'CARTON_STD') {
      const stdKg = prod?.carton_std || 0;
      html = `
        <div>
          <label>KG per Carton (from product)</label>
          <input type="number" id="inv-carton-kg" value="${stdKg}" readonly style="background:#f1f5f9;">
        </div>
        <div>
          <label>No. of Cartons *</label>
          <input type="number" id="inv-count" min="1" placeholder="e.g. 50" oninput="SSIInventory.calcTotal()">
        </div>`;
    } else if (mode === 'CARTON_MAN') {
      html = `
        <div>
          <label>KG per Carton *</label>
          <input type="number" id="inv-carton-kg" min="0.001" step="0.001" placeholder="e.g. 20" oninput="SSIInventory.calcTotal()">
        </div>
        <div>
          <label>No. of Cartons *</label>
          <input type="number" id="inv-count" min="1" placeholder="e.g. 75" oninput="SSIInventory.calcTotal()">
        </div>`;
    } else if (mode === 'DIRECT_KG') {
      html = `
        <div style="grid-column:span 3;">
          <label>Direct KG Quantity *</label>
          <input type="number" id="inv-direct-qty" min="0.001" step="0.001" placeholder="e.g. 1500" oninput="SSIInventory.calcTotal()">
        </div>`;
    } else if (mode === 'NOS') {
      html = `
        <div style="grid-column:span 3;">
          <label>Number of Units *</label>
          <input type="number" id="inv-direct-qty" min="1" placeholder="e.g. 200" oninput="SSIInventory.calcTotal()">
        </div>`;
    }

    fieldsDiv.innerHTML = html;
    totalDiv.style.display = 'block';

    // handle custom bag size
    const bagSizeEl = document.getElementById('inv-bag-size');
    if (bagSizeEl) {
      bagSizeEl.onchange = () => {
        const wrap = document.getElementById('inv-bag-custom-wrap');
        if (bagSizeEl.value === 'custom') { if(wrap) wrap.style.display='block'; }
        else { if(wrap) wrap.style.display='none'; }
        calcTotal();
      };
    }
    calcTotal();
  }

  function calcTotal() {
    const mode = document.getElementById('inv-pack-mode')?.value;
    const totalEl = document.getElementById('inv-total-qty');
    const uomEl   = document.getElementById('inv-total-uom');
    if (!totalEl) return;

    let qty = 0;
    if (mode === 'BAG') {
      const bagSizeEl = document.getElementById('inv-bag-size');
      let bagSize = 0;
      if (bagSizeEl) {
        if (bagSizeEl.value === 'custom') {
          bagSize = parseFloat(document.getElementById('inv-bag-custom')?.value) || 0;
        } else {
          // parse numeric value from label like "30 KG"
          bagSize = parseFloat(bagSizeEl.value) || 0;
          if (!bagSize) {
            // try extracting number
            const m = (bagSizeEl.value||'').match(/[\d.]+/);
            bagSize = m ? parseFloat(m[0]) : 0;
            // handle grams
            if ((bagSizeEl.value||'').toLowerCase().includes('g') && !bagSizeEl.value.toLowerCase().includes('kg')) {
              bagSize = bagSize / 1000;
            }
          }
        }
      }
      const count = parseFloat(document.getElementById('inv-count')?.value) || 0;
      qty = bagSize * count;
    } else if (mode === 'CARTON_STD' || mode === 'CARTON_MAN') {
      const kgPerCtn = parseFloat(document.getElementById('inv-carton-kg')?.value) || 0;
      const count    = parseFloat(document.getElementById('inv-count')?.value) || 0;
      qty = kgPerCtn * count;
    } else if (mode === 'DIRECT_KG' || mode === 'NOS') {
      qty = parseFloat(document.getElementById('inv-direct-qty')?.value) || 0;
    }

    const productId = document.getElementById('inv-product')?.value;
    const st = SSIApp.getState();
    const prod = productId ? st.products.find(p=>p.id===productId) : null;
    const uom = (mode === 'NOS' || prod?.uom === 'NOS') ? 'NOS' : 'KG';

    totalEl.textContent = SSIApp.qtyFmt(qty);
    if (uomEl) uomEl.textContent = ' ' + uom;
  }

  function getPackDesc() {
    const mode = document.getElementById('inv-pack-mode')?.value;
    if (mode === 'BAG') {
      const bagSizeEl = document.getElementById('inv-bag-size');
      let bagSize = bagSizeEl?.value === 'custom'
        ? (document.getElementById('inv-bag-custom')?.value + ' KG (custom)')
        : bagSizeEl?.value || '?';
      const count = document.getElementById('inv-count')?.value || '?';
      return `Bags: ${bagSize} × ${count}`;
    } else if (mode === 'CARTON_STD') {
      return `Cartons (Std ${document.getElementById('inv-carton-kg')?.value} KG) × ${document.getElementById('inv-count')?.value}`;
    } else if (mode === 'CARTON_MAN') {
      return `Cartons (${document.getElementById('inv-carton-kg')?.value} KG) × ${document.getElementById('inv-count')?.value}`;
    } else if (mode === 'DIRECT_KG') {
      return 'Direct KG';
    } else if (mode === 'NOS') {
      return 'Units/NOS';
    }
    return '—';
  }

  function saveEntry() {
    const date      = document.getElementById('inv-date')?.value;
    const type      = document.getElementById('inv-type')?.value;
    const unitId    = document.getElementById('inv-unit')?.value;
    const productId = document.getElementById('inv-product')?.value;
    const note      = document.getElementById('inv-note')?.value.trim();
    const mode      = document.getElementById('inv-pack-mode')?.value;

    if (!date || !type || !unitId || !productId) {
      SSIApp.toast('Please fill all required fields', 'error'); return;
    }

    // Calculate qty
    calcTotal();
    const qtyText = document.getElementById('inv-total-qty')?.textContent || '0';
    const qty = parseFloat(qtyText.replace(/,/g,'')) || 0;
    if (qty <= 0) { SSIApp.toast('Quantity must be greater than 0', 'error'); return; }

    // Check OUT doesn't exceed stock
    if (['OUT','TRANSFER_OUT'].includes(type)) {
      const current = SSIApp.getStock(productId, unitId);
      if (qty > current) {
        SSIApp.toast(`Insufficient stock! Current: ${SSIApp.qtyFmt(current)} KG`, 'error'); return;
      }
    }

    const user = SSIApp.currentUser();
    const st   = SSIApp.getState();
    const prod = st.products.find(p=>p.id===productId);

    const entry = {
      id: SSIApp.uid(),
      date,
      type,
      unit_id: unitId,
      product_id: productId,
      pack_mode: mode,
      pack_desc: getPackDesc(),
      qty,
      note,
      user_id: user?.id,
      user_name: user?.name,
      created_at: new Date().toISOString()
    };

    st.inventory.push(entry);
    SSIApp.saveState(st);
    SSIApp.toast(`Entry saved: ${SSIApp.qtyFmt(qty)} ${prod?.uom||'KG'} ✅`);
    SSIApp.audit('INV_ENTRY', `${type} ${qty} ${prod?.name}`);
    SSIApp.closeModal();
    refresh(document.getElementById('page-area'));
  }

  async function deleteEntry(id) {
    const ok = await SSIApp.confirm('Delete this inventory entry? Stock balance will change.');
    if (!ok) return;
    const st = SSIApp.getState();
    st.inventory = st.inventory.filter(t => t.id !== id);
    SSIApp.saveState(st);
    SSIApp.toast('Entry deleted');
    SSIApp.audit('INV_DELETE', id);
    refresh(document.getElementById('page-area'));
  }

  function exportExcel() {
    const st = SSIApp.getState();
    const rows = [['Date','Type','Unit','Product','SKU','Pack Mode','Pack Desc','Qty','UoM','Note','By']];
    [...st.inventory].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(t => {
      const prod = st.products.find(p=>p.id===t.product_id);
      const unit = st.units.find(u=>u.id===t.unit_id);
      const user = st.users.find(u=>u.id===t.user_id);
      rows.push([
        t.date, t.type, unit?.name||'', prod?.name||'', prod?.sku||'',
        t.pack_mode||'', t.pack_desc||'', t.qty||0, prod?.uom||'KG',
        t.note||'', user?.name||t.user_name||''
      ]);
    });
    SSIApp.excelDownload(rows, 'Inventory', 'SSI_Inventory_Ledger');
    SSIApp.toast('Inventory exported ✅');
  }

  return { render, refresh, openEntryModal, onProductUnitChange, onPackModeChange, calcTotal, saveEntry, deleteEntry, exportExcel, applyFilter };
})();
