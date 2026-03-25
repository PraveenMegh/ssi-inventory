/* global SSIApp, SSIAuth, SSIInventory */

const SSIDashboard = (() => {
  const render = () => {
    const u = SSIAuth.currentUser();
    if (!u) return SSIAuth.renderLogin();

    const st = SSIApp.getState();

    const totalProducts = st.products.length;
    const totalClients = st.clients.length;

    const myOrders = (u.role==='SALES') ? st.sales_orders.filter(o=>o.created_by===u.id) : st.sales_orders;
    const draft = myOrders.filter(o=>o.status==='DRAFT').length;
    const submitted = myOrders.filter(o=>o.status==='SUBMITTED').length;
    const dispatched = myOrders.filter(o=>o.status==='DISPATCHED').length;

    const lowStock = st.units.flatMap(unit => st.products.map(p => {
      const bal = SSIInventory.calcBalance(st, unit.id, p.id);
      const low = (p.reorder_level!=null && bal <= p.reorder_level);
      return low ? { unit, product:p, bal } : null;
    })).filter(Boolean);

    const lowRows = lowStock.slice(0,8).map(x=>`
      <tr class="border-t">
        <td class="py-2 pr-3">${x.unit.name}</td>
        <td class="py-2 pr-3 font-semibold">${x.product.name}</td>
        <td class="py-2 pr-3">${x.bal.toFixed(3)} ${x.product.uom}</td>
        <td class="py-2 pr-3"><span class="chip chip-warn">Low</span></td>
      </tr>
    `).join('') || `<tr><td class="py-3 text-slate-500" colspan="4">No low-stock alerts.</td></tr>`;

    const content = `
      <div class="grid grid-cols-1 gap-5">
        <div>
          <div class="text-2xl font-extrabold">Welcome, ${u.name || u.username}</div>
          <div class="text-sm text-slate-500">Role: <span class="font-semibold">${u.role}</span></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="text-sm text-slate-500">Products</div>
            <div class="text-2xl font-extrabold">${totalProducts}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="text-sm text-slate-500">Clients/Vendors</div>
            <div class="text-2xl font-extrabold">${totalClients}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="text-sm text-slate-500">Orders Draft</div>
            <div class="text-2xl font-extrabold">${draft}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="text-sm text-slate-500">Submitted</div>
            <div class="text-2xl font-extrabold">${submitted}</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-extrabold">Low Stock Alerts</div>
              <div class="text-sm text-slate-500">Based on product reorder level.</div>
            </div>
            <button class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm" id="goInventory">Open Inventory</button>
          </div>
          <div class="mt-3 overflow-auto">
            <table class="w-full text-sm">
              <thead class="text-left text-slate-500">
                <tr>
                  <th class="py-2 pr-3">Unit</th>
                  <th class="py-2 pr-3">Product</th>
                  <th class="py-2 pr-3">Balance</th>
                  <th class="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>${lowRows}</tbody>
            </table>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <div class="text-lg font-extrabold">Quick Actions</div>
          <div class="text-sm text-slate-500">Go to relevant modules.</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button data-go="products" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Products</button>
            <button data-go="clients" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Clients</button>
            <button data-go="inventory" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Inventory</button>
            <button data-go="orders" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Sales Orders</button>
            <button data-go="dispatch" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Dispatch</button>
            <button data-go="reports" class="px-4 py-2 rounded-xl border hover:bg-slate-50">Reports</button>
          </div>
        </div>
      </div>
    `;

    SSIApp.render(SSIApp.shell(content, 'dashboard'));
    SSIApp.bindShellEvents();

    document.getElementById('goInventory').onclick = () => SSIApp.route('inventory');
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', ()=>SSIApp.route(b.getAttribute('data-go'))));
  };

  return { render };
})();
