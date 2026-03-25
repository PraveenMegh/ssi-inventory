/* SSI Dispatch Module */
const SSIDispatch = (() => {

  function render(area) {
    if (!SSIApp.hasRole('ADMIN','DISPATCH')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st   = SSIApp.getState();
    const queue    = st.orders.filter(o => o.status === 'SUBMITTED')
      .sort((a,b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return new Date(a.submitted_at||a.created_at) - new Date(b.submitted_at||b.created_at);
      });
    const history  = st.orders.filter(o => ['DISPATCHED','CANCELLED'].includes(o.status))
      .sort((a,b) => new Date(b.dispatched_at||b.updated_at||b.created_at) - new Date(a.dispatched_at||a.updated_at||a.created_at));

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🚚 Dispatch Queue</h2>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="SSIDispatch.exportExcel()">📤 Export History</button>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid #e2e8f0;">
        <button id="tab-queue" onclick="SSIDispatch.showTab('queue')"
          style="padding:12px 24px;border:none;background:none;font-size:14px;font-weight:700;color:#e11d2e;border-bottom:3px solid #e11d2e;cursor:pointer;margin-bottom:-2px;">
          📋 Queue
          <span style="background:#e11d2e;color:#fff;font-size:11px;padding:2px 7px;border-radius:10px;margin-left:6px;">${queue.length}</span>
        </button>
        <button id="tab-history" onclick="SSIDispatch.showTab('history')"
          style="padding:12px 24px;border:none;background:none;font-size:14px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;cursor:pointer;margin-bottom:-2px;">
          📦 History (${history.length})
        </button>
      </div>

      <!-- Queue Panel -->
      <div id="panel-queue">
        ${queue.length === 0
          ? '<div class="card empty-state"><div class="icon">✅</div><p>No pending orders. All dispatched!</p></div>'
          : queue.map(o => buildQueueCard(o, st)).join('')}
      </div>

      <!-- History Panel -->
      <div id="panel-history" style="display:none;">
        <div class="card">
          <div style="overflow-x:auto;">
            <table>
              <thead><tr>
                <th>Order #</th><th>Date</th><th>Client</th><th>Unit</th>
                <th>Total KG</th><th>Value</th><th>Status</th><th>Dispatched By</th><th>Dispatch Date</th>
              </tr></thead>
              <tbody>
                ${history.map(o => {
                  const client   = st.clients.find(c=>c.id===o.client_id);
                  const unit     = st.units.find(u=>u.id===o.unit_id);
                  const dispBy   = st.users.find(u=>u.id===o.dispatched_by);
                  return `<tr>
                    <td><strong>${o.order_no}</strong></td>
                    <td>${SSIApp.dateFmt(o.date)}</td>
                    <td>${client?.name||'—'}</td>
                    <td>${unit?.name||'—'}</td>
                    <td>${SSIApp.qtyFmt(o.total_qty||0)} KG</td>
                    <td>${SSIApp.moneyFmt(o.total_value||0,o.currency||'INR')}</td>
                    <td><span class="badge ${o.status==='DISPATCHED'?'badge-dispatched':'badge-cancelled'}">${o.status}</span></td>
                    <td style="font-size:12px;">${dispBy?.name||'—'}</td>
                    <td style="font-size:12px;">${SSIApp.dateFmt(o.dispatched_at)}</td>
                  </tr>`;
                }).join('') || '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;">No dispatch history yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function buildQueueCard(o, st) {
    const client  = st.clients.find(c=>c.id===o.client_id);
    const unit    = st.units.find(u=>u.id===o.unit_id);
    const salesp  = st.users.find(u=>u.id===o.created_by);
    const waitHrs = o.submitted_at
      ? Math.round((Date.now()-new Date(o.submitted_at).getTime())/3600000)
      : 0;

    return `<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px;overflow:hidden;border-left:4px solid ${o.urgent?'#dc2626':'#2563eb'};">
      <!-- Header -->
      <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:${o.urgent?'#fff5f5':'#f8fafc'};">
        <div style="display:flex;align-items:center;gap:12px;">
          ${o.urgent?'<span style="font-size:24px;">🚨</span>':'<span style="font-size:24px;">📋</span>'}
          <div>
            <div style="font-size:16px;font-weight:800;color:#111827;">${o.order_no} ${o.urgent?'— <span style="color:#dc2626;">URGENT</span>':''}</div>
            <div style="font-size:13px;color:#64748b;">${client?.name||'—'} | ${unit?.name||'—'} | By: ${salesp?.name||'—'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Waiting</div>
            <div style="font-size:15px;font-weight:700;color:${waitHrs>24?'#dc2626':'#d97706'};">${waitHrs}h</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Total KG</div>
            <div style="font-size:15px;font-weight:700;">${SSIApp.qtyFmt(o.total_qty||0)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Value</div>
            <div style="font-size:15px;font-weight:700;">${SSIApp.moneyFmt(o.total_value||0,o.currency)}</div>
          </div>
          <button class="btn btn-primary" onclick="SSIDispatch.openDispatchModal('${o.id}')">▶ Process</button>
        </div>
      </div>
      <!-- Items preview -->
      <div style="padding:12px 20px;border-top:1px solid #f1f5f9;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${(o.items||[]).map(item => {
            const prod = st.products.find(p=>p.id===item.product_id);
            const avail = SSIApp.getStock(item.product_id, o.unit_id);
            const ok = avail >= (item.total_qty||0);
            return `<span style="background:${ok?'#dcfce7':'#fee2e2'};color:${ok?'#166534':'#991b1b'};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">
              ${prod?.name||'—'}: ${SSIApp.qtyFmt(item.total_qty||0)} KG ${ok?'✅':'⚠️ LOW'}
            </span>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  function openDispatchModal(orderId) {
    const st     = SSIApp.getState();
    const o      = st.orders.find(x=>x.id===orderId);
    if (!o) return;
    const client = st.clients.find(c=>c.id===o.client_id);
    const unit   = st.units.find(u=>u.id===o.unit_id);

    const itemRows = (o.items||[]).map((item, i) => {
      const prod  = st.products.find(p=>p.id===item.product_id);
      const avail = SSIApp.getStock(item.product_id, o.unit_id);
      const ok    = avail >= (item.total_qty||0);
      return `<tr>
        <td>${i+1}</td>
        <td><strong>${prod?.name||'—'}</strong></td>
        <td>${item.pack_mode||'—'}</td>
        <td>${SSIApp.qtyFmt(item.total_qty||0)} ${prod?.uom||'KG'}</td>
        <td style="font-weight:600;color:${avail<=0?'#dc2626':avail<=(prod?.reorder_level||0)?'#d97706':'#16a34a'};">${SSIApp.qtyFmt(avail)} ${prod?.uom||'KG'}</td>
        <td><span class="badge ${ok?'badge-ok':'badge-low'}">${ok?'✅ OK':'⚠️ INSUFFICIENT'}</span></td>
      </tr>`;
    }).join('');

    const allOk = (o.items||[]).every(item => SSIApp.getStock(item.product_id, o.unit_id) >= (item.total_qty||0));

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">🚚 Process Dispatch — ${o.order_no} ${o.urgent?'🚨':''}</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Client</div><strong>${client?.name||'—'}</strong>${client?.gst_no?`<br><span style="font-size:12px;color:#16a34a;">${client.gst_no}</span>`:''}</div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Unit</div><strong>${unit?.name||'—'}</strong></div>
          <div class="info-card"><div style="font-size:12px;color:#64748b;">Order Value</div><strong>${SSIApp.moneyFmt(o.total_value||0,o.currency)}</strong></div>
        </div>

        <table>
          <thead><tr><th>#</th><th>Product</th><th>Pack</th><th>Ordered</th><th>In Stock</th><th>Status</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>

        ${!allOk ? `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-top:16px;">
          <strong style="color:#991b1b;">⚠️ Insufficient Stock</strong>
          <p style="font-size:13px;color:#dc2626;margin-top:4px;">Some items do not have enough stock. Please add inventory before dispatching, or contact Stock department.</p>
        </div>` : `<div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-top:16px;">
          <strong style="color:#166534;">✅ All items have sufficient stock. Ready to dispatch!</strong>
        </div>`}

        <div style="margin-top:16px;">
          <label>Dispatch Note (optional)</label>
          <input id="dispatch-note" placeholder="e.g. Truck No. UP15AB1234, Driver: Ramesh">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        ${allOk
          ? `<button class="btn btn-success" onclick="SSIDispatch.confirmDispatch('${orderId}')">✅ Confirm Dispatch</button>`
          : `<button class="btn btn-primary" style="opacity:.5;cursor:not-allowed;" disabled>Insufficient Stock</button>`}
      </div>`;

    SSIApp.showModal(html);
  }

  async function confirmDispatch(orderId) {
    const note = document.getElementById('dispatch-note')?.value.trim() || '';
    const st   = SSIApp.getState();
    const o    = st.orders.find(x=>x.id===orderId);
    if (!o) return;

    const user = SSIApp.currentUser();
    const now  = new Date().toISOString();
    const today= now.slice(0,10);

    // Create OUT inventory transactions
    (o.items||[]).forEach(item => {
      st.inventory.push({
        id: SSIApp.uid(),
        date: today,
        type: 'OUT',
        unit_id: o.unit_id,
        product_id: item.product_id,
        pack_mode: item.pack_mode,
        pack_desc: `Dispatch: ${o.order_no}`,
        qty: item.total_qty || 0,
        note: `Order ${o.order_no} dispatch${note?' — '+note:''}`,
        user_id: user?.id,
        user_name: user?.name,
        created_at: now
      });
    });

    // Update order status
    const idx = st.orders.findIndex(x=>x.id===orderId);
    if (idx>=0) {
      Object.assign(st.orders[idx], {
        status: 'DISPATCHED',
        dispatched_at: now,
        dispatched_by: user?.id,
        dispatch_note: note
      });
    }

    SSIApp.saveState(st);
    SSIApp.toast(`Order ${o.order_no} dispatched successfully ✅`, 'success');
    SSIApp.audit('DISPATCH', `Order ${o.order_no} dispatched by ${user?.name}`);
    SSIApp.closeModal();
    refresh(document.getElementById('page-area'));
  }

  function showTab(tab) {
    const queuePanel   = document.getElementById('panel-queue');
    const histPanel    = document.getElementById('panel-history');
    const tabQueue     = document.getElementById('tab-queue');
    const tabHistory   = document.getElementById('tab-history');
    if (!queuePanel) return;

    if (tab === 'queue') {
      queuePanel.style.display = '';
      histPanel.style.display  = 'none';
      tabQueue.style.color = '#e11d2e'; tabQueue.style.borderBottomColor = '#e11d2e';
      tabHistory.style.color = '#64748b'; tabHistory.style.borderBottomColor = 'transparent';
    } else {
      queuePanel.style.display = 'none';
      histPanel.style.display  = '';
      tabHistory.style.color = '#e11d2e'; tabHistory.style.borderBottomColor = '#e11d2e';
      tabQueue.style.color = '#64748b'; tabQueue.style.borderBottomColor = 'transparent';
    }
  }

  function exportExcel() {
    const st   = SSIApp.getState();
    const rows = [['Order #','Date','Client','GST No','Unit','Total KG','Value','Currency','Status','Dispatched By','Dispatch Date','Dispatch Note']];
    st.orders.filter(o => ['DISPATCHED','CANCELLED'].includes(o.status)).forEach(o => {
      const client  = st.clients.find(c=>c.id===o.client_id);
      const unit    = st.units.find(u=>u.id===o.unit_id);
      const dispBy  = st.users.find(u=>u.id===o.dispatched_by);
      rows.push([
        o.order_no, o.date, client?.name||'', client?.gst_no||'', unit?.name||'',
        o.total_qty||0, o.total_value||0, o.currency||'INR', o.status,
        dispBy?.name||'', o.dispatched_at?.slice(0,10)||'', o.dispatch_note||''
      ]);
    });
    SSIApp.excelDownload(rows, 'Dispatch', 'SSI_Dispatch_History');
    SSIApp.toast('Dispatch history exported ✅');
  }

  return { render, refresh, openDispatchModal, confirmDispatch, showTab, exportExcel };
})();
