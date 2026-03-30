/* SSI Dashboard Module */
const SSIDashboard = (() => {

  function render(area) {
    if (!SSIApp.hasRole('ADMIN')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    const st  = SSIApp.getState();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    // ── Stats ──────────────────────────────────────────────────
    const totalProducts = st.products.filter(p => p.active).length;
    const totalClients  = st.clients.filter(c => c.active).length;

    const ordersThisMonth = st.orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const pendingOrders = st.orders.filter(o => o.status === 'SUBMITTED').length;
    const urgentOrders  = st.orders.filter(o => o.status === 'SUBMITTED' && o.urgent).length;

    const dispatchedThisMonth = ordersThisMonth.filter(o => o.status === 'DISPATCHED').length;
    const revenueThisMonth    = ordersThisMonth
      .filter(o => o.status === 'DISPATCHED')
      .reduce((s, o) => {
        // Use actual dispatched_value if order was modified
        const val = o.dispatch_modified ? (o.dispatched_value || 0) : (o.total_value || 0);
        return s + val;
      }, 0);

    // ── Low Stock ──────────────────────────────────────────────
    const lowStock = [];
    st.products.filter(p => p.active && p.reorder_level > 0).forEach(p => {
      st.units.filter(u => u.active).forEach(u => {
        const qty = SSIApp.getStock(p.id, u.id);
        if (qty <= p.reorder_level) {
          lowStock.push({ product: p.name, unit: u.name, qty, reorder: p.reorder_level });
        }
      });
    });

    // ── Recent Orders (last 7) ─────────────────────────────────
    const recentOrders = [...st.orders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 7);

    // ── Render ─────────────────────────────────────────────────
    area.innerHTML = `
      <div style="padding:0 0 24px;">

        <!-- Stats Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
          ${statCard('📦', 'Products',     totalProducts,                         'Active products',           '#e11d2e')}
          ${statCard('👥', 'Clients',      totalClients,                          'Active clients',            '#C0392B')}
          ${statCard('🛒', 'Pending',      pendingOrders,                         'Awaiting dispatch',         '#d97706')}
          ${statCard('🚨', 'Urgent',       urgentOrders,                          'Urgent orders',             '#dc2626')}
          ${statCard('🚚', 'Dispatched',   dispatchedThisMonth,                   'This month',                '#16a34a')}
          ${statCard('💰', 'Revenue',      SSIApp.moneyFmt(revenueThisMonth),     'This month (dispatched)',   '#7c3aed')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap;">

          <!-- Low Stock Alerts -->
          <div class="card">
            <h3 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;">🔴 Low Stock Alerts</h3>
            ${lowStock.length === 0
              ? '<p style="color:#94a3b8;font-size:14px;">All products are well stocked ✅</p>'
              : `<div style="display:flex;flex-direction:column;gap:8px;">
                  ${lowStock.slice(0, 6).map(l => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fee2e2;border-radius:8px;">
                      <div>
                        <div style="font-size:13px;font-weight:600;color:#991b1b;">${l.product}</div>
                        <div style="font-size:12px;color:#dc2626;">${l.unit}</div>
                      </div>
                      <div style="text-align:right;">
                        <div style="font-size:13px;font-weight:700;color:#dc2626;">${SSIApp.qtyFmt(l.qty)}</div>
                        <div style="font-size:11px;color:#ef4444;">Reorder: ${l.reorder}</div>
                      </div>
                    </div>`).join('')}
                </div>`}
          </div>

          <!-- Recent Orders -->
          <div class="card">
            <h3 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;">🕐 Recent Orders</h3>
            ${recentOrders.length === 0
              ? '<p style="color:#94a3b8;font-size:14px;">No orders yet</p>'
              : `<div style="display:flex;flex-direction:column;gap:8px;">
                  ${recentOrders.map(o => {
                    const client = st.clients.find(c => c.id === o.client_id);
                    const statusColors = {
                      DRAFT:      '#64748b',
                      SUBMITTED:  '#d97706',
                      DISPATCHED: '#16a34a',
                      CANCELLED:  '#dc2626'
                    };
                    const isModified = o.dispatch_modified;
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8fafc;border-radius:8px;">
                      <div>
                        <div style="font-size:13px;font-weight:600;color:#111827;">
                          ${o.order_no} ${o.urgent ? '🚨' : ''}
                          ${isModified ? '<span style="background:#fef3c7;color:#b45309;font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;margin-left:4px;">✏️ MOD</span>' : ''}
                        </div>
                        <div style="font-size:12px;color:#64748b;">
                          ${client ? client.name : '—'} • ${SSIApp.dateFmt(o.created_at)}
                          ${isModified ? ` <span style="color:#d97706;">${SSIApp.qtyFmt(o.dispatched_qty||0)}/${SSIApp.qtyFmt(o.total_qty||0)} KG</span>` : ''}
                        </div>
                      </div>
                      <span style="background:${statusColors[o.status]}20;color:${statusColors[o.status]};font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;">${o.status}</span>
                    </div>`;
                  }).join('')}
                </div>`}
          </div>
        </div>

        <!-- Unit Stock Summary -->
        <div class="card" style="margin-top:20px;">
          <h3 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;">🏭 Stock Summary by Unit</h3>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  ${st.units.filter(u => u.active).map(u => `<th style="text-align:center;">${u.name}</th>`).join('')}
                  <th style="text-align:center;">Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${st.products.filter(p => p.active).map(p => {
                  const units  = st.units.filter(u => u.active);
                  const stocks = units.map(u => SSIApp.getStock(p.id, u.id));
                  const total  = stocks.reduce((a, b) => a + b, 0);
                  const isLow  = p.reorder_level > 0 && total <= p.reorder_level;
                  return `<tr>
                    <td>
                      <strong>${p.name}</strong><br>
                      <span style="font-size:11px;color:#94a3b8;">${p.sku}</span>
                    </td>
                    ${stocks.map(q => `
                      <td style="text-align:center;font-weight:600;color:${q <= 0 ? '#dc2626' : q <= (p.reorder_level || 0) ? '#d97706' : '#16a34a'};">
                        ${SSIApp.qtyFmt(q)}
                      </td>`).join('')}
                    <td style="text-align:center;color:#64748b;">${p.reorder_level || '—'}</td>
                    <td><span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? '⚠️ LOW' : '✅ OK'}</span></td>
                  </tr>`;
                }).join('') || `
                  <tr>
                    <td colspan="${2 + st.units.filter(u=>u.active).length}" style="text-align:center;color:#94a3b8;padding:20px;">
                      No products added yet
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>

      </div>`;
  }

  function statCard(icon, label, value, sub, color) {
    return `<div class="stat-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:24px;">${icon}</span>
        <span style="width:8px;height:8px;background:${color};border-radius:50%;"></span>
      </div>
      <div style="font-size:26px;font-weight:800;color:#111827;">${value}</div>
      <div style="font-size:13px;font-weight:600;color:#374151;margin-top:4px;">${label}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${sub}</div>
    </div>`;
  }

  return { render };
})();
