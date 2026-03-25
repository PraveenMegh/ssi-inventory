/* global SSIApp, SSIAuth */

const SSIReports = (() => {
  const render = () => {
    if (!SSIApp.requireRole(['ADMIN','STOCK','DISPATCH','SALES'])) return SSIApp.toast('Not allowed','err');

    const user = SSIAuth.currentUser();
    const st = SSIApp.getState();

    const month = new Date().toISOString().slice(0,7);

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold">Reports</div>
            <div class="text-sm text-slate-500">Monthly sales + product demand trend (simple).</div>
          </div>
          <div class="flex gap-2">
            <input id="rpMonth" type="month" value="${month}" class="px-3 py-2 rounded-xl border" />
            <button id="rpRun" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Run</button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4">
          <div class="border border-slate-200 rounded-2xl p-4">
            <div class="font-extrabold">Monthly Sales (Product-wise)</div>
            <div class="text-sm text-slate-500">Shows totals for DISPATCHED orders in selected month.</div>
            <div class="mt-3 overflow-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-slate-500">
                  <tr>
                    <th class="py-2 pr-3">Product</th>
                    <th class="py-2 pr-3">Qty</th>
                    <th class="py-2 pr-3">Value (INR equiv*)</th>
                  </tr>
                </thead>
                <tbody id="rpProductRows"></tbody>
              </table>
              <div class="text-xs text-slate-500 mt-2">*This MVP does not convert FX; it sums numeric totals as recorded in the order currency.</div>
            </div>
          </div>

          <div class="border border-slate-200 rounded-2xl p-4">
            <div class="font-extrabold">Trend (More/Less/No Demand)</div>
            <div class="text-sm text-slate-500">Compares last 3 months quantities per product.</div>
            <div class="mt-3 overflow-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-slate-500">
                  <tr>
                    <th class="py-2 pr-3">Product</th>
                    <th class="py-2 pr-3">This month</th>
                    <th class="py-2 pr-3">Prev avg</th>
                    <th class="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody id="rpTrendRows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    SSIApp.render(SSIApp.shell(content, 'reports'));
    SSIApp.bindShellEvents();

    const run = () => {
      const m = document.getElementById('rpMonth').value; // YYYY-MM
      const data = computeMonthly(st, user, m);

      document.getElementById('rpProductRows').innerHTML = data.productRows;
      document.getElementById('rpTrendRows').innerHTML = data.trendRows;
    };

    document.getElementById('rpRun').onclick = run;
    run();
  };

  const allowedOrders = (st, user) => {
    if (user.role==='ADMIN' || user.role==='STOCK' || user.role==='DISPATCH') return st.sales_orders;
    // SALES sees own only
    return st.sales_orders.filter(o => o.created_by === user.id);
  };

  const monthKey = (isoDate) => String(isoDate||'').slice(0,7);

  const computeMonthly = (st, user, month) => {
    const orders = allowedOrders(st,user).filter(o => o.status==='DISPATCHED' && monthKey(o.date)===month);

    // aggregate qty by product
    const qtyByProd = new Map();
    const valByProd = new Map();

    for (const o of orders) {
      for (const it of o.items) {
        qtyByProd.set(it.product_id, (qtyByProd.get(it.product_id)||0) + Number(it.qty_base||it.qty||0));
        valByProd.set(it.product_id, (valByProd.get(it.product_id)||0) + Number(it.line_total||0));
      }
    }

    const productRows = st.products.map(p => {
      const q = qtyByProd.get(p.id)||0;
      const v = valByProd.get(p.id)||0;
      if (q===0 && v===0) return '';
      return `
        <tr class="border-t">
          <td class="py-2 pr-3 font-semibold">${p.name}</td>
          <td class="py-2 pr-3">${q.toFixed(3)}</td>
          <td class="py-2 pr-3">${v.toFixed(2)}</td>
        </tr>`;
    }).filter(Boolean).join('') || `<tr><td class="py-3 text-slate-500" colspan="3">No dispatched sales in this month.</td></tr>`;

    // Trend: last 3 months qty
    const months = [month, prevMonth(month), prevMonth(prevMonth(month))];
    const qtyByProdByMonth = new Map();
    for (const p of st.products) qtyByProdByMonth.set(p.id, { [months[0]]:0,[months[1]]:0,[months[2]]:0 });

    const all = allowedOrders(st,user).filter(o => o.status==='DISPATCHED' && months.includes(monthKey(o.date)));
    for (const o of all) {
      const mk = monthKey(o.date);
      for (const it of o.items) {
        const obj = qtyByProdByMonth.get(it.product_id) || {};
        obj[mk] = (obj[mk]||0) + Number(it.qty_base||it.qty||0);
        qtyByProdByMonth.set(it.product_id, obj);
      }
    }

    const trendRows = st.products.map(p => {
      const obj = qtyByProdByMonth.get(p.id) || {};
      const m0 = obj[months[0]]||0;
      const m1 = obj[months[1]]||0;
      const m2 = obj[months[2]]||0;
      const avg = (m1+m2)/2;

      let status = 'Stable';
      let chip = 'chip-ok';
      if (m0===0) { status='No demand'; chip='chip-urgent'; }
      else if (avg>0 && m0 > avg*1.15) { status='More demand'; chip='chip-ok'; }
      else if (avg>0 && m0 < avg*0.85) { status='Less demand'; chip='chip-warn'; }

      return `
        <tr class="border-t">
          <td class="py-2 pr-3 font-semibold">${p.name}</td>
          <td class="py-2 pr-3">${m0.toFixed(3)}</td>
          <td class="py-2 pr-3">${avg.toFixed(3)}</td>
          <td class="py-2 pr-3"><span class="chip ${chip}">${status}</span></td>
        </tr>`;
    }).join('');

    return { productRows, trendRows };
  };

  const prevMonth = (yyyyMM) => {
    const [y,m] = yyyyMM.split('-').map(Number);
    const d = new Date(y, m-1, 1);
    d.setMonth(d.getMonth()-1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    return `${yy}-${mm}`;
  };

  return { render };
})();
