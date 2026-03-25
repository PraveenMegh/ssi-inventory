/* SSI Sales Orders Module */
const SSIOrders = (() => {
  const PACK_MODES = [
    { value:'BAG',        label:'🛍️ KG Bags (Size × Count)' },
    { value:'CARTON_STD', label:'📦 Cartons – Use Product Std' },
    { value:'CARTON_MAN', label:'📦 Cartons – Manual KG/Ctn' },
    { value:'DIRECT_KG',  label:'⚖️ Direct KG' },
    { value:'NOS',        label:'🔢 Units / NOS' },
  ];

  function render(area) {
    if (!SSIApp.hasRole('ADMIN','SALES')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st   = SSIApp.getState();
    const user = SSIApp.currentUser();
    const isSales = user?.role === 'SALES';

    // Sales: own orders only. Others: all orders
    const orders = isSales
      ? st.orders.filter(o => o.created_by === user.id)
      : [...st.orders];
    orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    const statusBadge = s => {
      const map = { DRAFT:'badge-draft', SUBMITTED:'badge-submitted', DISPATCHED:'badge-dispatched', CANCELLED:'badge-cancelled' };
      return `<span class="badge ${map[s]||'badge-draft'}">${s}</span>`;
    };

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🛒 Sales Orders</h2>
        <button class="btn btn-primary" onclick="SSIOrders.openForm()">+ New Order</button>
      </div>

      <!-- Filters (admin/dispatch) -->
      ${!isSales ? `
      <div class="card" style="margin-bottom:16px;padding:16px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:1;min-width:140px;">
            <label>Status</label>
            <select id="ord-filter-status" onchange="SSIOrders.applyFilter()">
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div style="flex:1;min-width:140px;">
            <label>Salesperson</label>
            <select id="ord-filter-sales" onchange="SSIOrders.applyFilter()">
              <option value="">All</option>
              ${st.users.filter(u=>u.role==='SALES').map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;min-width:140px;">
            <label>From Date</label>
            <input type="date" id="ord-filter-from" onchange="SSIOrders.applyFilter()">
          </div>
          <div style="flex:1;min-width:140px;">
            <label>To Date</label>
            <input type="date" id="ord-filter-to" onchange="SSIOrders.applyFilter()">
          </div>
          <button class="btn btn-secondary btn-sm" onclick="SSIOrders.exportExcel()">📤 Export</button>
        </div>
      </div>` : ''}

      <div class="card">
        <div style="overflow-x:auto;">
          <table id="orders-table">
            <thead><tr>
              <th>Order #</th><th>Date</th><th>Client</th><th>Unit</th>
              <th>Items</th><th>Total KG</th><th>Value</th>
              <th style="text-align:center;">Urgent</th><th>Status</th>
              ${!isSales ? '<th>By</th>' : ''}
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${orders.map(o => {
                const client   = st.clients.find(c=>c.id===o.client_id);
                const unit     = st.units.find(u=>u.id===o.unit_id);
                const salesp   = st.users.find(u=>u.id===o.created_by);
                const totalKg  = (o.items||[]).reduce((s,i)=>s+(i.total_qty||0),0);
                const canEdit  = o.status==='DRAFT' && (SSIApp.hasRole('ADMIN') || o.created_by===user?.id);
                const canCancel= (o.status==='DRAFT'||o.status==='SUBMITTED') && (SSIApp.hasRole('ADMIN')||o.created_by===user?.id);
                return `<tr data-status="${o.status}" data-sales="${o.created_by}" data-date="${o.created_at?.slice(0,10)||''}">
                  <td><strong>${o.order_no}</strong></td>
                  <td style="white-space:nowrap;">${SSIApp.dateFmt(o.created_at)}</td>
                  <td>
                    <strong>${client?.name||'—'}</strong>
                    ${client?.gst_no?`<br><span style="font-size:11px;color:#16a34a;">${client.gst_no}</span>`:''}
                  </td>
                  <td style="font-size:13px;">${unit?.name||'—'}</td>
                  <td style="text-align:center;">${(o.items||[]).length}</td>
                  <td style="font-weight:600;">${SSIApp.qtyFmt(totalKg)} KG</td>
                  <td style="font-weight:600;">${SSIApp.moneyFmt(o.total_value, o.currency||'INR')}</td>
                  <td style="text-align:center;">${o.urgent?'<span class="badge badge-urgent">🚨 YES</span>':'<span style="color:#d1d5db;">—</span>'}</td>
                  <td>${statusBadge(o.status)}</td>
                  ${!isSales ? `<td style="font-size:12px;color:#64748b;">${salesp?.name||'—'}</td>` : ''}
                  <td style="white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="SSIOrders.viewOrder('${o.id}')">👁️</button>
                    ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="SSIOrders.openForm('${o.id}')">✏️</button>` : ''}
                    ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="SSIOrders.cancelOrder('${o.id}')">✕</button>` : ''}
                  </td>
                </tr>`;
              }).join('') || `<tr><td colspan="12" style="text-align:center;padding:40px;color:#94a3b8;">No orders yet. Create your first order!</td></tr>`}
            </tbody>
          </table>
        </div>
        <div id="ord-count" style="margin-top:12px;font-size:13px;color:#94a3b8;">Total: ${orders.length} orders</div>
      </div>`;
  }

  function applyFilter() {
    const statusF = document.getElementById('ord-filter-status')?.value || '';
    const salesF  = document.getElementById('ord-filter-sales')?.value  || '';
    const fromF   = document.getElementById('ord-filter-from')?.value   || '';
    const toF     = document.getElementById('ord-filter-to')?.value     || '';
    const rows    = document.querySelectorAll('#orders-table tbody tr[data-status]');
    let visible   = 0;
    rows.forEach(row => {
      const show = (!statusF || row.dataset.status===statusF)
        && (!salesF  || row.dataset.sales===salesF)
        && (!fromF   || row.dataset.date >= fromF)
        && (!toF     || row.dataset.date <= toF);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const cnt = document.getElementById('ord-count');
    if (cnt) cnt.textContent = `Showing: ${visible} orders`;
  }

  function openForm(orderId) {
    const st   = SSIApp.getState();
    const user = SSIApp.currentUser();
    const ord  = orderId ? st.orders.find(o=>o.id===orderId) : null;
    const items = ord?.items || [{}];

    const productOpts = st.products.filter(p=>p.active)
      .map(p=>`<option value="${p.id}">${p.name} (${p.uom||'KG'})</option>`).join('');
    const clientOpts  = st.clients.filter(c=>c.active && c.type!=='Vendor')
      .map(c=>`<option value="${c.id}" ${ord?.client_id===c.id?'selected':''}>${c.name}${c.gst_no?' | '+c.gst_no:''}</option>`).join('');
    const unitOpts    = st.units.filter(u=>u.active)
      .map(u=>`<option value="${u.id}" ${ord?.unit_id===u.id?'selected':''}>${u.name}</option>`).join('');

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${ord?'Edit':'New'} Sales Order ${ord?'— '+ord.order_no:''}</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <!-- Header fields -->
        <div class="form-grid form-grid-3" style="margin-bottom:20px;">
          <div>
            <label>Date *</label>
            <input type="date" id="ord-date" value="${ord?.date||new Date().toISOString().slice(0,10)}">
          </div>
          <div>
            <label>SSI Unit *</label>
            <select id="ord-unit"><option value="">—Select—</option>${unitOpts}</select>
          </div>
          <div>
            <label>Currency</label>
            <select id="ord-currency">
              ${SSIApp.CURRENCIES.map(c=>`<option value="${c}" ${ord?.currency===c||(c==='INR'&&!ord)?'selected':''}>${c} (${SSIApp.CURRENCY_SYMBOLS[c]})</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:span 2;">
            <label>Client *</label>
            <select id="ord-client"><option value="">—Select Client—</option>${clientOpts}</select>
          </div>
          <div>
            <label>🚨 Urgent Order</label>
            <div style="margin-top:6px;">
              <button type="button" id="ord-urgent-btn"
                onclick="SSIOrders.toggleUrgent()"
                style="width:100%;padding:9px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;border:2px solid ${ord?.urgent?'#dc2626':'#d1d5db'};background:${ord?.urgent?'#dc2626':'#fff'};color:${ord?.urgent?'#fff':'#64748b'};transition:all .2s;">
                ${ord?.urgent?'🚨 URGENT — YES':'⬜ URGENT — NO'}
              </button>
              <input type="hidden" id="ord-urgent-val" value="${ord?.urgent?'1':'0'}">
            </div>
          </div>
          <div style="grid-column:span 2;">
            <label>Remarks</label>
            <input id="ord-remarks" value="${ord?.remarks||''}" placeholder="Optional notes / instructions">
          </div>
        </div>

        <!-- Items table -->
        <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:12px;">📋 Order Items</div>
        <div id="ord-items-container">
          ${items.map((item,idx) => buildItemRow(idx, item, productOpts)).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="SSIOrders.addItemRow()">+ Add Item</button>

        <!-- Grand total -->
        <div style="margin-top:20px;background:#f8fafc;border-radius:10px;padding:16px;display:flex;justify-content:flex-end;gap:40px;">
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Total KG / Units</div>
            <div id="ord-grand-kg" style="font-size:22px;font-weight:800;color:#111827;">0.000 KG</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Grand Total Value</div>
            <div id="ord-grand-total" style="font-size:22px;font-weight:800;color:#e11d2e;">₹0.00</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-secondary" onclick="SSIOrders.saveOrder('${orderId||''}','DRAFT')">💾 Save Draft</button>
        <button class="btn btn-primary"   onclick="SSIOrders.saveOrder('${orderId||''}','SUBMITTED')">📤 Submit Order</button>
      </div>`;

    SSIApp.showModal(html);
    recalcGrand();
  }

  function buildItemRow(idx, item, productOpts) {
    const st = SSIApp.getState();
    const prod = item.product_id ? st.products.find(p=>p.id===item.product_id) : null;
    const packOpts = PACK_MODES.map(m=>`<option value="${m.value}" ${item.pack_mode===m.value?'selected':''}>${m.label}</option>`).join('');

    return `<div class="item-row" id="item-row-${idx}" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:13px;color:#64748b;">Item ${idx+1}</strong>
        <button onclick="SSIOrders.removeItemRow(${idx})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;">
        <div>
          <label style="font-size:12px;">Product</label>
          <select class="item-product" data-idx="${idx}" onchange="SSIOrders.onItemProductChange(${idx})" style="font-size:13px;">
            <option value="">—Select—</option>${productOpts}
            ${prod ? `<option value="${prod.id}" selected>${prod.name}</option>` : ''}
          </select>
        </div>
        <div>
          <label style="font-size:12px;">Pack Type</label>
          <select class="item-pack-mode" data-idx="${idx}" onchange="SSIOrders.onItemPackChange(${idx})" style="font-size:13px;">${packOpts}</select>
        </div>
        <div id="item-size-wrap-${idx}">
          <label style="font-size:12px;">Bag/Ctn Size (KG)</label>
          <input type="number" class="item-size" data-idx="${idx}" min="0" step="0.001" value="${item.pack_size||''}" placeholder="e.g. 50" style="font-size:13px;" oninput="SSIOrders.calcItemTotal(${idx})">
        </div>
        <div>
          <label style="font-size:12px;" id="item-count-label-${idx}">No. of Bags</label>
          <input type="number" class="item-count" data-idx="${idx}" min="1" value="${item.count||''}" placeholder="e.g. 30" style="font-size:13px;" oninput="SSIOrders.calcItemTotal(${idx})">
        </div>
        <div>
          <label style="font-size:12px;">Rate (₹/KG)</label>
          <input type="number" class="item-rate" data-idx="${idx}" min="0" step="0.01" value="${item.rate||''}" placeholder="e.g. 45" style="font-size:13px;" oninput="SSIOrders.calcItemTotal(${idx})">
        </div>
        <div>
          <label style="font-size:12px;">Total KG</label>
          <div id="item-qty-${idx}" style="font-size:16px;font-weight:800;color:#16a34a;padding:8px 0;">${SSIApp.qtyFmt(item.total_qty||0)}</div>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        <div id="item-formula-${idx}" style="font-size:12px;color:#94a3b8;font-style:italic;"></div>
        <div id="item-line-total-${idx}" style="font-size:15px;font-weight:700;color:#e11d2e;">₹0.00</div>
      </div>
    </div>`;
  }

  function onItemProductChange(idx) {
    const productEl = document.querySelector(`.item-product[data-idx="${idx}"]`);
    const productId = productEl?.value;
    if (!productId) return;
    const st   = SSIApp.getState();
    const prod = st.products.find(p=>p.id===productId);
    if (!prod) return;
    // Auto-fill rate
    const rateEl = document.querySelector(`.item-rate[data-idx="${idx}"]`);
    if (rateEl && !rateEl.value && prod.default_rate) rateEl.value = prod.default_rate;
    // Auto pack size if only one
    const sizeEl = document.querySelector(`.item-size[data-idx="${idx}"]`);
    if (sizeEl && prod.pack_sizes?.length === 1) {
      const m = (prod.pack_sizes[0]||'').match(/[\d.]+/);
      if (m) sizeEl.value = parseFloat(m[0]);
    }
    calcItemTotal(idx);
  }

  function onItemPackChange(idx) {
    const mode  = document.querySelector(`.item-pack-mode[data-idx="${idx}"]`)?.value;
    const label = document.getElementById(`item-count-label-${idx}`);
    const sizeWrap = document.getElementById(`item-size-wrap-${idx}`);
    if (label) {
      label.textContent = mode==='NOS' ? 'Quantity' : mode==='BAG' ? 'No. of Bags' : 'No. of Cartons';
    }
    if (sizeWrap) {
      sizeWrap.style.display = (mode==='DIRECT_KG'||mode==='NOS') ? 'none' : '';
    }
    // If carton_std, auto-fill size from product
    if (mode === 'CARTON_STD') {
      const productId = document.querySelector(`.item-product[data-idx="${idx}"]`)?.value;
      if (productId) {
        const prod = SSIApp.getState().products.find(p=>p.id===productId);
        const sizeEl = document.querySelector(`.item-size[data-idx="${idx}"]`);
        if (sizeEl && prod?.carton_std) sizeEl.value = prod.carton_std;
      }
    }
    calcItemTotal(idx);
  }

  function calcItemTotal(idx) {
    const mode   = document.querySelector(`.item-pack-mode[data-idx="${idx}"]`)?.value || 'BAG';
    const size   = parseFloat(document.querySelector(`.item-size[data-idx="${idx}"]`)?.value) || 0;
    const count  = parseFloat(document.querySelector(`.item-count[data-idx="${idx}"]`)?.value) || 0;
    const rate   = parseFloat(document.querySelector(`.item-rate[data-idx="${idx}"]`)?.value) || 0;

    let totalQty = 0, formula = '';
    if (mode === 'BAG') {
      totalQty = size * count;
      formula = `${size} KG × ${count} bags = ${SSIApp.qtyFmt(totalQty)} KG`;
    } else if (mode === 'CARTON_STD' || mode === 'CARTON_MAN') {
      totalQty = size * count;
      formula = `${size} KG/ctn × ${count} cartons = ${SSIApp.qtyFmt(totalQty)} KG`;
    } else if (mode === 'DIRECT_KG') {
      totalQty = count;
      formula = `Direct: ${SSIApp.qtyFmt(totalQty)} KG`;
    } else if (mode === 'NOS') {
      totalQty = count;
      formula = `${count} Units/NOS`;
    }

    const lineTotal = totalQty * rate;
    const currency  = document.getElementById('ord-currency')?.value || 'INR';

    const qtyEl    = document.getElementById(`item-qty-${idx}`);
    const totalEl  = document.getElementById(`item-line-total-${idx}`);
    const formulaEl= document.getElementById(`item-formula-${idx}`);
    if (qtyEl)     qtyEl.textContent    = SSIApp.qtyFmt(totalQty);
    if (totalEl)   totalEl.textContent  = SSIApp.moneyFmt(lineTotal, currency);
    if (formulaEl) formulaEl.textContent= formula;

    recalcGrand();
  }

  function recalcGrand() {
    const rows     = document.querySelectorAll('.item-row');
    let grandKg    = 0, grandVal = 0;
    const currency = document.getElementById('ord-currency')?.value || 'INR';

    rows.forEach((row, idx) => {
      const mode   = document.querySelector(`.item-pack-mode[data-idx="${idx}"]`)?.value || 'BAG';
      const size   = parseFloat(document.querySelector(`.item-size[data-idx="${idx}"]`)?.value) || 0;
      const count  = parseFloat(document.querySelector(`.item-count[data-idx="${idx}"]`)?.value) || 0;
      const rate   = parseFloat(document.querySelector(`.item-rate[data-idx="${idx}"]`)?.value) || 0;
      let qty = 0;
      if (mode==='DIRECT_KG'||mode==='NOS') qty=count;
      else qty=size*count;
      grandKg  += qty;
      grandVal += qty*rate;
    });

    const kgEl  = document.getElementById('ord-grand-kg');
    const valEl = document.getElementById('ord-grand-total');
    if (kgEl)  kgEl.textContent  = SSIApp.qtyFmt(grandKg) + ' KG';
    if (valEl) valEl.textContent = SSIApp.moneyFmt(grandVal, currency);
  }

  let _itemCount = 0;
  function addItemRow() {
    const container = document.getElementById('ord-items-container');
    if (!container) return;
    const st = SSIApp.getState();
    const productOpts = st.products.filter(p=>p.active)
      .map(p=>`<option value="${p.id}">${p.name} (${p.uom||'KG'})</option>`).join('');
    const idx = container.querySelectorAll('.item-row').length;
    container.insertAdjacentHTML('beforeend', buildItemRow(idx, {}, productOpts));
  }

  function removeItemRow(idx) {
    const row = document.getElementById(`item-row-${idx}`);
    if (row) { row.remove(); recalcGrand(); }
  }

  function toggleUrgent() {
    const val = document.getElementById('ord-urgent-val');
    const btn = document.getElementById('ord-urgent-btn');
    const isUrgent = val.value === '1';
    val.value = isUrgent ? '0' : '1';
    btn.style.background    = isUrgent ? '#fff' : '#dc2626';
    btn.style.color         = isUrgent ? '#64748b' : '#fff';
    btn.style.borderColor   = isUrgent ? '#d1d5db' : '#dc2626';
    btn.textContent         = isUrgent ? '⬜ URGENT — NO' : '🚨 URGENT — YES';
  }

  function collectItems() {
    const rows = document.querySelectorAll('.item-row');
    const items = [];
    rows.forEach((row, idx) => {
      const productId = document.querySelector(`.item-product[data-idx="${idx}"]`)?.value;
      if (!productId) return;
      const mode   = document.querySelector(`.item-pack-mode[data-idx="${idx}"]`)?.value || 'BAG';
      const size   = parseFloat(document.querySelector(`.item-size[data-idx="${idx}"]`)?.value) || 0;
      const count  = parseFloat(document.querySelector(`.item-count[data-idx="${idx}"]`)?.value) || 0;
      const rate   = parseFloat(document.querySelector(`.item-rate[data-idx="${idx}"]`)?.value) || 0;
      let totalQty = 0;
      if (mode==='DIRECT_KG'||mode==='NOS') totalQty=count;
      else totalQty=size*count;
      items.push({ product_id:productId, pack_mode:mode, pack_size:size, count, rate, total_qty:totalQty, line_total:totalQty*rate });
    });
    return items;
  }

  function saveOrder(orderId, status) {
    const date     = document.getElementById('ord-date')?.value;
    const unitId   = document.getElementById('ord-unit')?.value;
    const clientId = document.getElementById('ord-client')?.value;
    const currency = document.getElementById('ord-currency')?.value || 'INR';
    const urgent   = document.getElementById('ord-urgent-val')?.value === '1';
    const remarks  = document.getElementById('ord-remarks')?.value.trim() || '';
    const items    = collectItems();

    if (!date || !unitId || !clientId) { SSIApp.toast('Please fill Date, Unit and Client', 'error'); return; }
    if (!items.length) { SSIApp.toast('Add at least one order item', 'error'); return; }
    if (items.some(i=>i.total_qty<=0)) { SSIApp.toast('All items must have quantity > 0', 'error'); return; }

    const totalKg    = items.reduce((s,i)=>s+(i.total_qty||0), 0);
    const totalValue = items.reduce((s,i)=>s+(i.line_total||0), 0);
    const user       = SSIApp.currentUser();
    const st         = SSIApp.getState();

    if (orderId) {
      const idx = st.orders.findIndex(o=>o.id===orderId);
      if (idx>=0) {
        Object.assign(st.orders[idx], {date,unit_id:unitId,client_id:clientId,currency,urgent,remarks,items,total_qty:totalKg,total_value:totalValue,status,updated_at:new Date().toISOString()});
        if (status==='SUBMITTED') st.orders[idx].submitted_at = new Date().toISOString();
      }
      SSIApp.toast(`Order updated (${status}) ✅`);
    } else {
      const orderNo = SSIApp.nextOrderNo(st);
      st.orders.push({
        id:SSIApp.uid(), order_no:orderNo, date, unit_id:unitId, client_id:clientId,
        currency, urgent, remarks, items, total_qty:totalKg, total_value:totalValue,
        status, created_by:user?.id, created_at:new Date().toISOString(),
        submitted_at: status==='SUBMITTED' ? new Date().toISOString() : null
      });
      SSIApp.toast(`Order ${orderNo} ${status==='SUBMITTED'?'submitted':'saved'} ✅`);
    }

    SSIApp.saveState(st);
    SSIApp.closeModal();
    SSIApp.audit('ORDER_SAVE', `Order ${status}`);
    refresh(document.getElementById('page-area'));
  }

  function viewOrder(orderId) {
    const st   = SSIApp.getState();
    const o    = st.orders.find(x=>x.id===orderId);
    if (!o) return;
    const client  = st.clients.find(c=>c.id===o.client_id);
    const unit    = st.units.find(u=>u.id===o.unit_id);
    const salesp  = st.users.find(u=>u.id===o.created_by);
    const statusColors = {DRAFT:'#64748b',SUBMITTED:'#d97706',DISPATCHED:'#16a34a',CANCELLED:'#dc2626'};

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">Order Details — ${o.order_no} ${o.urgent?'🚨':''}</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Client</div><strong>${client?.name||'—'}</strong>${client?.gst_no?`<br><span style="font-size:12px;color:#16a34a;">GST: ${client.gst_no}</span>`:''}</div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Unit</div><strong>${unit?.name||'—'}</strong></div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Date</div><strong>${SSIApp.dateFmt(o.date)}</strong></div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Status</div><span style="color:${statusColors[o.status]};font-weight:700;">${o.status}</span>${o.dispatched_at?`<br><span style="font-size:11px;color:#64748b;">Dispatched: ${SSIApp.dateFmt(o.dispatched_at)}</span>`:''}</div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Salesperson</div><strong>${salesp?.name||'—'}</strong></div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Currency</div><strong>${o.currency||'INR'}</strong></div>
          ${o.remarks?`<div class="info-card" style="grid-column:span 2;"><div style="font-size:12px;color:#64748b;">Remarks</div><strong>${o.remarks}</strong></div>`:''}
        </div>
        <table>
          <thead><tr><th>#</th><th>Product</th><th>Pack</th><th>Size</th><th>Count</th><th style="text-align:right;">Total KG</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${(o.items||[]).map((item,i)=>{
              const prod = st.products.find(p=>p.id===item.product_id);
              return `<tr>
                <td>${i+1}</td>
                <td><strong>${prod?.name||'—'}</strong></td>
                <td style="font-size:12px;">${item.pack_mode||'—'}</td>
                <td>${item.pack_size>0?item.pack_size+' KG':'—'}</td>
                <td>${item.count||0}</td>
                <td style="text-align:right;font-weight:700;">${SSIApp.qtyFmt(item.total_qty||0)}</td>
                <td style="text-align:right;">${SSIApp.moneyFmt(item.rate||0,o.currency)}</td>
                <td style="text-align:right;font-weight:700;">${SSIApp.moneyFmt(item.line_total||0,o.currency)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc;">
              <td colspan="5" style="text-align:right;font-weight:700;">Totals:</td>
              <td style="text-align:right;font-weight:800;">${SSIApp.qtyFmt(o.total_qty||0)} KG</td>
              <td></td>
              <td style="text-align:right;font-weight:800;color:#e11d2e;">${SSIApp.moneyFmt(o.total_value||0,o.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Close</button>
      </div>`;

    SSIApp.showModal(html);
  }

  async function cancelOrder(orderId) {
    const ok = await SSIApp.confirm('Cancel this order?');
    if (!ok) return;
    const st  = SSIApp.getState();
    const idx = st.orders.findIndex(o=>o.id===orderId);
    if (idx>=0) { st.orders[idx].status='CANCELLED'; st.orders[idx].cancelled_at=new Date().toISOString(); }
    SSIApp.saveState(st);
    SSIApp.toast('Order cancelled');
    SSIApp.audit('ORDER_CANCEL', orderId);
    refresh(document.getElementById('page-area'));
  }

  function exportExcel() {
    const st   = SSIApp.getState();
    const rows = [['Order #','Date','Client','GST No','Unit','Total KG','Value','Currency','Urgent','Status','Salesperson','Remarks']];
    st.orders.forEach(o => {
      const client = st.clients.find(c=>c.id===o.client_id);
      const unit   = st.units.find(u=>u.id===o.unit_id);
      const salesp = st.users.find(u=>u.id===o.created_by);
      rows.push([
        o.order_no, o.date, client?.name||'', client?.gst_no||'', unit?.name||'',
        o.total_qty||0, o.total_value||0, o.currency||'INR',
        o.urgent?'YES':'NO', o.status, salesp?.name||'', o.remarks||''
      ]);
    });
    SSIApp.excelDownload(rows, 'Orders', 'SSI_Orders_Export');
    SSIApp.toast('Orders exported ✅');
  }

  return { render, refresh, openForm, saveOrder, viewOrder, cancelOrder, addItemRow, removeItemRow, toggleUrgent, calcItemTotal, onItemProductChange, onItemPackChange, recalcGrand, applyFilter, exportExcel };
})();
