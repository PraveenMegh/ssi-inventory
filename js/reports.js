/* SSI Reports Module — includes Demand Analysis */
const SSIReports = (() => {

  function render(area) {
    if (!SSIApp.hasRole('ADMIN')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">📈 Reports & Analytics</h2>
      </div>

      <!-- Report Tabs -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid #e2e8f0;flex-wrap:wrap;">
        ${['monthly','demand','inventory','salesperson'].map((t,i)=>
          `<button id="rpt-tab-${t}" onclick="SSIReports.showReport('${t}')"
            style="padding:12px 20px;border:none;background:none;font-size:13px;font-weight:${i===0?'700':'600'};color:${i===0?'#e11d2e':'#64748b'};border-bottom:3px solid ${i===0?'#e11d2e':'transparent'};cursor:pointer;margin-bottom:-2px;white-space:nowrap;">
            ${['📅 Monthly Sales','📊 Demand Analysis','🏭 Inventory','👤 Salesperson'][i]}
          </button>`
        ).join('')}
      </div>

      <div id="report-area"></div>`;

    showReport('monthly');
  }

  function showReport(type) {
    // Update tab styles
    ['monthly','demand','inventory','salesperson'].forEach(t => {
      const btn = document.getElementById(`rpt-tab-${t}`);
      if (!btn) return;
      const active = t === type;
      btn.style.color = active ? '#e11d2e' : '#64748b';
      btn.style.borderBottomColor = active ? '#e11d2e' : 'transparent';
      btn.style.fontWeight = active ? '700' : '600';
    });

    const area = document.getElementById('report-area');
    if (!area) return;

    if (type === 'monthly')     renderMonthly(area);
    else if (type === 'demand') renderDemand(area);
    else if (type === 'inventory') renderInventoryReport(area);
    else if (type === 'salesperson') renderSalesperson(area);
  }

  // ─── Monthly Sales Report ──────────────────────────────────
  function renderMonthly(area) {
    const st = SSIApp.getState();
    const now = new Date();
    const year = now.getFullYear();

    // Build monthly data for the current year
    const months = Array.from({length:12}, (_,i) => {
      const date = new Date(year, i, 1);
      return date.toLocaleString('en-IN', {month:'short', year:'numeric'});
    });

    const monthly = months.map((m, i) => {
      const orders = st.orders.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth()===i && d.getFullYear()===year;
      });
      const dispatched = orders.filter(o=>o.status==='DISPATCHED');
      const totalOrders  = orders.length;
      const totalKg      = dispatched.reduce((s,o)=>s+(o.total_qty||0), 0);
      const totalRevenue = dispatched.reduce((s,o)=>s+(o.total_value||0), 0);
      const urgentCount  = orders.filter(o=>o.urgent).length;
      return { m, totalOrders, totalKg, totalRevenue, urgentCount };
    });

    const maxRev = Math.max(...monthly.map(m=>m.totalRevenue), 1);

    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-size:16px;font-weight:700;color:#111827;">Monthly Sales — ${year}</h3>
        <button class="btn btn-secondary btn-sm" onclick="SSIReports.exportMonthly()">📤 Export</button>
      </div>

      <!-- Bar Chart (CSS) -->
      <div class="card" style="margin-bottom:20px;">
        <div style="font-size:14px;font-weight:600;color:#64748b;margin-bottom:16px;">Revenue Trend (₹)</div>
        <div style="display:flex;align-items:flex-end;gap:8px;height:180px;">
          ${monthly.map(m=>{
            const h = Math.round((m.totalRevenue/maxRev)*160);
            const curMonth = new Date().getMonth();
            const idx = months.indexOf(m.m);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="font-size:10px;color:#64748b;font-weight:600;">${m.totalRevenue>0?'₹'+(m.totalRevenue/1000).toFixed(0)+'k':''}</div>
              <div style="width:100%;height:${Math.max(h,2)}px;background:${idx===curMonth?'#e11d2e':'#93c5fd'};border-radius:4px 4px 0 0;transition:height .3s;" title="${m.m}: ₹${m.totalRevenue.toFixed(2)}"></div>
              <div style="font-size:10px;color:#64748b;transform:rotate(-30deg);white-space:nowrap;">${m.m}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Monthly Table -->
      <div class="card">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>Month</th><th>Total Orders</th><th>Dispatched KG</th>
              <th>Revenue (₹)</th><th>Urgent Orders</th>
            </tr></thead>
            <tbody>
              ${monthly.map(m=>`<tr>
                <td style="font-weight:600;">${m.m}</td>
                <td style="text-align:center;">${m.totalOrders}</td>
                <td style="text-align:right;">${SSIApp.qtyFmt(m.totalKg)} KG</td>
                <td style="text-align:right;font-weight:600;">${SSIApp.moneyFmt(m.totalRevenue)}</td>
                <td style="text-align:center;">${m.urgentCount>0?`<span class="badge badge-urgent">${m.urgentCount}</span>`:'—'}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:700;">
                <td>TOTAL</td>
                <td style="text-align:center;">${monthly.reduce((s,m)=>s+m.totalOrders,0)}</td>
                <td style="text-align:right;">${SSIApp.qtyFmt(monthly.reduce((s,m)=>s+m.totalKg,0))} KG</td>
                <td style="text-align:right;">${SSIApp.moneyFmt(monthly.reduce((s,m)=>s+m.totalRevenue,0))}</td>
                <td style="text-align:center;">${monthly.reduce((s,m)=>s+m.urgentCount,0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }

  // ─── Demand Analysis ───────────────────────────────────────
  function renderDemand(area) {
    const st = SSIApp.getState();

    // Product-wise demand from DISPATCHED orders
    const productDemand = {};
    st.orders.filter(o=>o.status==='DISPATCHED').forEach(o => {
      (o.items||[]).forEach(item => {
        if (!productDemand[item.product_id]) {
          productDemand[item.product_id] = { qty:0, value:0, orders:0, clients:new Set() };
        }
        productDemand[item.product_id].qty    += item.total_qty   || 0;
        productDemand[item.product_id].value  += item.line_total  || 0;
        productDemand[item.product_id].orders += 1;
        if (o.client_id) productDemand[item.product_id].clients.add(o.client_id);
      });
    });

    // Monthly product demand (last 6 months)
    const now = new Date();
    const last6 = Array.from({length:6}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      return { month: d.toLocaleString('en-IN',{month:'short',year:'numeric'}), m: d.getMonth(), y: d.getFullYear() };
    });

    // Sort products by demand
    const sortedProducts = Object.entries(productDemand)
      .map(([pid, data]) => {
        const prod = st.products.find(p=>p.id===pid);
        return { prod, ...data, clients: data.clients.size };
      })
      .filter(x=>x.prod)
      .sort((a,b) => b.qty - a.qty);

    const maxQty = Math.max(...sortedProducts.map(p=>p.qty), 1);

    // Client-wise demand
    const clientDemand = {};
    st.orders.filter(o=>o.status==='DISPATCHED').forEach(o => {
      if (!clientDemand[o.client_id]) clientDemand[o.client_id] = { qty:0, value:0, orders:0 };
      clientDemand[o.client_id].qty   += o.total_qty   || 0;
      clientDemand[o.client_id].value += o.total_value || 0;
      clientDemand[o.client_id].orders++;
    });
    const sortedClients = Object.entries(clientDemand)
      .map(([cid, data]) => { const c = st.clients.find(x=>x.id===cid); return { c, ...data }; })
      .filter(x=>x.c)
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);

    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-size:16px;font-weight:700;color:#111827;">📊 Demand Analysis</h3>
        <button class="btn btn-secondary btn-sm" onclick="SSIReports.exportDemand()">📤 Export</button>
      </div>

      <!-- Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:20px;">
        ${[
          {icon:'📦',label:'Products Sold',val:sortedProducts.length,color:'#2563eb'},
          {icon:'⚖️',label:'Total KG Dispatched',val:SSIApp.qtyFmt(sortedProducts.reduce((s,p)=>s+p.qty,0)),color:'#16a34a'},
          {icon:'💰',label:'Total Revenue',val:SSIApp.moneyFmt(sortedProducts.reduce((s,p)=>s+p.value,0)),color:'#e11d2e'},
          {icon:'👥',label:'Active Clients',val:sortedClients.length,color:'#7c3aed'},
        ].map(c=>`<div class="stat-card">
          <div style="font-size:28px;margin-bottom:8px;">${c.icon}</div>
          <div style="font-size:22px;font-weight:800;color:#111827;">${c.val}</div>
          <div style="font-size:13px;color:#64748b;">${c.label}</div>
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <!-- Product Demand Chart -->
        <div class="card">
          <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:16px;">🏆 Top Products by KG Demand</div>
          ${sortedProducts.slice(0,8).map(p=>{
            const pct = Math.round((p.qty/maxQty)*100);
            return `<div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;">${p.prod.name}</span>
                <span style="font-size:12px;color:#64748b;">${SSIApp.qtyFmt(p.qty)} KG</span>
              </div>
              <div style="height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#e11d2e,#f87171);border-radius:5px;transition:width .5s;"></div>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${p.orders} orders • ${p.clients} clients • ${SSIApp.moneyFmt(p.value)}</div>
            </div>`;
          }).join('') || '<p style="color:#94a3b8;">No dispatched orders yet</p>'}
        </div>

        <!-- Top Clients -->
        <div class="card">
          <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:16px;">🌟 Top Clients by Revenue</div>
          ${sortedClients.map((item,i)=>
            `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
              <div style="width:28px;height:28px;background:${['#fbbf24','#94a3b8','#d97706','#e11d2e','#2563eb'][i]||'#e2e8f0'};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${i+1}</div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${item.c.name}</div>
                ${item.c.gst_no?`<div style="font-size:11px;color:#16a34a;">GST: ${item.c.gst_no}</div>`:''}
              </div>
              <div style="text-align:right;">
                <div style="font-size:13px;font-weight:700;">${SSIApp.moneyFmt(item.value)}</div>
                <div style="font-size:11px;color:#94a3b8;">${item.orders} orders • ${SSIApp.qtyFmt(item.qty)} KG</div>
              </div>
            </div>`
          ).join('') || '<p style="color:#94a3b8;">No client data yet</p>'}
        </div>
      </div>

      <!-- Monthly Demand per Product (last 6 months) -->
      <div class="card">
        <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:16px;">📅 Monthly Product Demand (Last 6 Months)</div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>Product</th>
              ${last6.map(l=>`<th style="text-align:center;">${l.month}</th>`).join('')}
              <th style="text-align:center;">Total</th>
              <th>Trend</th>
            </tr></thead>
            <tbody>
              ${sortedProducts.slice(0,10).map(p=>{
                const monthly = last6.map(l => {
                  return st.orders.filter(o => {
                    const d = new Date(o.created_at);
                    return o.status==='DISPATCHED' && d.getMonth()===l.m && d.getFullYear()===l.y;
                  }).reduce((s,o) => {
                    const item = (o.items||[]).find(i=>i.product_id===p.prod.id);
                    return s+(item?.total_qty||0);
                  }, 0);
                });
                const lastTwo = monthly.slice(-2);
                const trend = lastTwo[1] > lastTwo[0] ? '📈' : lastTwo[1] < lastTwo[0] ? '📉' : '➡️';
                return `<tr>
                  <td><strong>${p.prod.name}</strong><br><span style="font-size:11px;color:#94a3b8;">${p.prod.sku}</span></td>
                  ${monthly.map(q=>`<td style="text-align:center;font-weight:${q>0?'600':'400'};color:${q>0?'#111827':'#d1d5db'};">${q>0?SSIApp.qtyFmt(q):'—'}</td>`).join('')}
                  <td style="text-align:center;font-weight:700;">${SSIApp.qtyFmt(p.qty)}</td>
                  <td style="text-align:center;font-size:18px;">${trend}</td>
                </tr>`;
              }).join('') || '<tr><td colspan="9" style="text-align:center;color:#94a3b8;">No data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ─── Inventory Report ──────────────────────────────────────
  function renderInventoryReport(area) {
    const st = SSIApp.getState();

    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-size:16px;font-weight:700;">🏭 Inventory Stock Report</h3>
        <button class="btn btn-secondary btn-sm" onclick="SSIReports.exportInventoryReport()">📤 Export</button>
      </div>
      <div class="card">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>SKU</th><th>Product</th><th>UoM</th>
              ${st.units.filter(u=>u.active).map(u=>`<th style="text-align:center;">${u.name}</th>`).join('')}
              <th style="text-align:center;">Total</th>
              <th>Reorder</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${st.products.filter(p=>p.active).map(p => {
                const unitStocks = st.units.filter(u=>u.active).map(u=>SSIApp.getStock(p.id,u.id));
                const total = unitStocks.reduce((a,b)=>a+b,0);
                const isLow = p.reorder_level>0 && total<=p.reorder_level;
                return `<tr>
                  <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">${p.sku}</code></td>
                  <td><strong>${p.name}</strong>${p.description?`<br><span style="font-size:12px;color:#94a3b8;">${p.description}</span>`:''}</td>
                  <td style="text-align:center;"><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:12px;">${p.uom||'KG'}</span></td>
                  ${unitStocks.map(q=>`<td style="text-align:center;font-weight:600;color:${q<=0?'#dc2626':q<=(p.reorder_level||0)?'#d97706':'#16a34a'};">${SSIApp.qtyFmt(q)}</td>`).join('')}
                  <td style="text-align:center;font-weight:800;">${SSIApp.qtyFmt(total)}</td>
                  <td style="text-align:center;color:#64748b;">${p.reorder_level||'—'}</td>
                  <td><span class="badge ${isLow?'badge-low':'badge-ok'}">${isLow?'⚠️ LOW STOCK':'✅ OK'}</span></td>
                </tr>`;
              }).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;">No products added</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ─── Salesperson Report ────────────────────────────────────
  function renderSalesperson(area) {
    const st = SSIApp.getState();
    const salespeople = st.users.filter(u=>u.role==='SALES'&&u.active);

    const salesData = salespeople.map(sp => {
      const orders = st.orders.filter(o=>o.created_by===sp.id);
      const dispatched = orders.filter(o=>o.status==='DISPATCHED');
      const pending    = orders.filter(o=>o.status==='SUBMITTED');
      const draft      = orders.filter(o=>o.status==='DRAFT');
      const totalKg    = dispatched.reduce((s,o)=>s+(o.total_qty||0),0);
      const totalRev   = dispatched.reduce((s,o)=>s+(o.total_value||0),0);
      return { sp, total:orders.length, dispatched:dispatched.length, pending:pending.length, draft:draft.length, totalKg, totalRev };
    });

    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <h3 style="font-size:16px;font-weight:700;">👤 Salesperson Performance</h3>
        <button class="btn btn-secondary btn-sm" onclick="SSIReports.exportSalesperson()">📤 Export</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:20px;">
        ${salesData.map(d=>`
          <div class="card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="width:44px;height:44px;background:#e11d2e;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;">${d.sp.name[0]}</div>
              <div>
                <div style="font-weight:700;">${d.sp.name}</div>
                <div style="font-size:12px;color:#94a3b8;">@${d.sp.username}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="background:#f8fafc;padding:8px 12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;">Total Orders</div><div style="font-weight:700;">${d.total}</div></div>
              <div style="background:#dcfce7;padding:8px 12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;">Dispatched</div><div style="font-weight:700;color:#16a34a;">${d.dispatched}</div></div>
              <div style="background:#fef3c7;padding:8px 12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;">Pending</div><div style="font-weight:700;color:#d97706;">${d.pending}</div></div>
              <div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;">Draft</div><div style="font-weight:700;color:#64748b;">${d.draft}</div></div>
            </div>
            <div style="margin-top:12px;padding:12px;background:#fff5f5;border-radius:8px;text-align:center;">
              <div style="font-size:11px;color:#64748b;">Revenue Generated</div>
              <div style="font-size:18px;font-weight:800;color:#e11d2e;">${SSIApp.moneyFmt(d.totalRev)}</div>
              <div style="font-size:12px;color:#64748b;">${SSIApp.qtyFmt(d.totalKg)} KG dispatched</div>
            </div>
          </div>`).join('') || '<p style="color:#94a3b8;">No salespeople found</p>'}
      </div>`;
  }

  // ─── Export functions ──────────────────────────────────────
  function exportMonthly() {
    const st = SSIApp.getState();
    const now = new Date();
    const year = now.getFullYear();
    const rows = [['Month','Total Orders','Dispatched KG','Revenue (INR)','Urgent Orders']];
    Array.from({length:12},(_,i)=>{
      const mName = new Date(year,i,1).toLocaleString('en-IN',{month:'short',year:'numeric'});
      const orders = st.orders.filter(o=>{ const d=new Date(o.created_at); return d.getMonth()===i&&d.getFullYear()===year; });
      const disp = orders.filter(o=>o.status==='DISPATCHED');
      rows.push([mName, orders.length, disp.reduce((s,o)=>s+(o.total_qty||0),0), disp.reduce((s,o)=>s+(o.total_value||0),0), orders.filter(o=>o.urgent).length]);
    });
    SSIApp.excelDownload(rows,'Monthly','SSI_Monthly_Report');
    SSIApp.toast('Monthly report exported ✅');
  }

  function exportDemand() {
    const st = SSIApp.getState();
    const rows = [['Product','SKU','Total KG Ordered','Total Revenue (INR)','No. of Orders','No. of Clients']];
    const productDemand = {};
    st.orders.filter(o=>o.status==='DISPATCHED').forEach(o => {
      (o.items||[]).forEach(item => {
        if (!productDemand[item.product_id]) productDemand[item.product_id] = {qty:0,value:0,orders:0,clients:new Set()};
        productDemand[item.product_id].qty   += item.total_qty||0;
        productDemand[item.product_id].value += item.line_total||0;
        productDemand[item.product_id].orders++;
        if (o.client_id) productDemand[item.product_id].clients.add(o.client_id);
      });
    });
    Object.entries(productDemand).forEach(([pid,data])=>{
      const prod = st.products.find(p=>p.id===pid);
      if (prod) rows.push([prod.name, prod.sku, data.qty, data.value, data.orders, data.clients.size]);
    });
    SSIApp.excelDownload(rows,'Demand','SSI_Demand_Analysis');
    SSIApp.toast('Demand analysis exported ✅');
  }

  function exportInventoryReport() {
    const st = SSIApp.getState();
    const unitNames = st.units.filter(u=>u.active).map(u=>u.name);
    const rows = [['SKU','Product','UoM',...unitNames,'Total','Reorder Level','Status']];
    st.products.filter(p=>p.active).forEach(p=>{
      const stocks = st.units.filter(u=>u.active).map(u=>SSIApp.getStock(p.id,u.id));
      const total = stocks.reduce((a,b)=>a+b,0);
      const isLow = p.reorder_level>0 && total<=p.reorder_level;
      rows.push([p.sku, p.name, p.uom||'KG', ...stocks, total, p.reorder_level||0, isLow?'LOW STOCK':'OK']);
    });
    SSIApp.excelDownload(rows,'Inventory','SSI_Inventory_Report');
    SSIApp.toast('Inventory report exported ✅');
  }

  function exportSalesperson() {
    const st = SSIApp.getState();
    const rows = [['Name','Username','Total Orders','Dispatched','Pending','Draft','Total KG','Revenue (INR)']];
    st.users.filter(u=>u.role==='SALES').forEach(sp=>{
      const orders = st.orders.filter(o=>o.created_by===sp.id);
      const disp = orders.filter(o=>o.status==='DISPATCHED');
      rows.push([sp.name,sp.username,orders.length,disp.length,orders.filter(o=>o.status==='SUBMITTED').length,orders.filter(o=>o.status==='DRAFT').length,disp.reduce((s,o)=>s+(o.total_qty||0),0),disp.reduce((s,o)=>s+(o.total_value||0),0)]);
    });
    SSIApp.excelDownload(rows,'Salesperson','SSI_Salesperson_Report');
    SSIApp.toast('Salesperson report exported ✅');
  }

  return { render, showReport, exportMonthly, exportDemand, exportInventoryReport, exportSalesperson };
})();
