/* SSI Units / Locations Module */
const SSIUnits = (() => {

  // ── Helper used by other modules ──────────────────────────
  function getAll() {
    return (SSIApp.getState().units || []).filter(u => u.active);
  }

  // ── Render full admin page ─────────────────────────────────
  function render(area) {
    if (!SSIApp.hasRole('ADMIN')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Admin access only</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    if (!area) area = document.getElementById('page-area');
    if (!area) return;
    const st = SSIApp.getState();
    const units = st.units || [];

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">🏢 Units / Locations</h2>
        <button class="btn btn-primary" onclick="SSIUnits.openForm()">+ Add Unit</button>
      </div>

      <div class="card">
        ${units.length === 0 ? `
          <div class="empty-state">
            <div class="icon">🏭</div>
            <p>No units/locations added yet</p>
            <button class="btn btn-primary" style="margin-top:1rem;" onclick="SSIUnits.openForm()">Add First Unit</button>
          </div>` : `
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>#</th>
              <th>Unit Name</th>
              <th>Address / Location</th>
              <th>Status</th>
              <th>Products in Stock</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${units.map((u, i) => {
                // Count products that have any stock in this unit
                const productsWithStock = (st.products || []).filter(p =>
                  p.active && SSIApp.getStock(p.id, u.id) > 0
                ).length;
                return `<tr>
                  <td style="color:#94a3b8;font-weight:600;">${i + 1}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;flex-shrink:0;">
                        🏭
                      </div>
                      <div>
                        <div style="font-weight:700;color:#111827;">${u.name}</div>
                        <div style="font-size:11px;color:#94a3b8;">ID: ${u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style="color:#374151;">${u.address || '—'}</td>
                  <td>
                    <span style="background:${u.active ? '#dcfce7' : '#f1f5f9'};color:${u.active ? '#16a34a' : '#64748b'};padding:3px 12px;border-radius:12px;font-size:12px;font-weight:600;">
                      ${u.active ? '✅ Active' : '⛔ Inactive'}
                    </span>
                  </td>
                  <td style="text-align:center;">
                    <span style="font-weight:700;color:${productsWithStock > 0 ? '#16a34a' : '#94a3b8'};">
                      ${productsWithStock} product${productsWithStock !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="SSIUnits.openForm('${u.id}')">✏️ Edit</button>
                    <button class="btn ${u.active ? 'btn-danger' : 'btn-success'} btn-sm"
                      onclick="SSIUnits.toggleActive('${u.id}')">
                      ${u.active ? '⛔ Disable' : '✅ Enable'}
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <!-- Stock Summary per Unit -->
      ${units.filter(u => u.active).length > 0 && (st.products || []).filter(p => p.active).length > 0 ? `
      <div class="card">
        <h3 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;">📊 Stock Summary by Unit</h3>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>Product</th>
              ${units.filter(u => u.active).map(u => `<th style="text-align:center;">${u.name}</th>`).join('')}
              <th style="text-align:center;">Total</th>
            </tr></thead>
            <tbody>
              ${(st.products || []).filter(p => p.active).map(p => {
                const stocks = units.filter(u => u.active).map(u => SSIApp.getStock(p.id, u.id));
                const total  = stocks.reduce((a, b) => a + b, 0);
                return `<tr>
                  <td><strong>${p.name}</strong><br><span style="font-size:11px;color:#94a3b8;">${p.sku}</span></td>
                  ${stocks.map(q => `<td style="text-align:center;font-weight:600;color:${q <= 0 ? '#dc2626' : '#16a34a'};">${SSIApp.qtyFmt(q)}</td>`).join('')}
                  <td style="text-align:center;font-weight:700;color:#1e3a5f;">${SSIApp.qtyFmt(total)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}`;
  }

  function openForm(id) {
    const st = SSIApp.getState();
    const u  = id ? (st.units || []).find(x => x.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${u ? 'Edit' : 'Add'} Unit / Location</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">
          <div>
            <label>Unit Name *</label>
            <input id="unit-name" value="${u ? u.name : ''}" placeholder="e.g. Modinagar, Patla">
          </div>
          <div>
            <label>Address / Location</label>
            <input id="unit-address" value="${u ? (u.address || '') : ''}" placeholder="e.g. Modinagar, Ghaziabad, UP">
          </div>
        </div>
        <div style="margin-top:12px;padding:12px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:13px;color:#0369a1;">
          💡 Units represent your physical warehouse locations. Each unit tracks its own stock independently.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="SSIUnits.saveUnit('${id || ''}')">💾 Save Unit</button>
      </div>`;

    SSIApp.showModal(html);
    setTimeout(() => document.getElementById('unit-name')?.focus(), 100);
  }

  function saveUnit(id) {
    const name    = document.getElementById('unit-name')?.value.trim();
    const address = document.getElementById('unit-address')?.value.trim();

    if (!name) { SSIApp.toast('Unit name is required', 'error'); return; }

    const st = SSIApp.getState();
    if (!st.units) st.units = [];

    // Check duplicate
    const dup = st.units.find(u => u.name.toLowerCase() === name.toLowerCase() && u.id !== id);
    if (dup) { SSIApp.toast('A unit with this name already exists', 'error'); return; }

    if (id) {
      const idx = st.units.findIndex(u => u.id === id);
      if (idx >= 0) {
        Object.assign(st.units[idx], { name, address, updated_at: new Date().toISOString() });
        SSIApp.toast('Unit updated ✅');
        SSIApp.audit('UNIT_UPDATE', name);
      }
    } else {
      st.units.push({
        id:         SSIApp.uid(),
        name,
        address,
        active:     true,
        created_at: new Date().toISOString()
      });
      SSIApp.toast('Unit added ✅');
      SSIApp.audit('UNIT_ADD', name);
    }

    SSIApp.saveState(st);
    SSIApp.closeModal();
    refresh(document.getElementById('page-area'));
  }

  async function toggleActive(id) {
    const st = SSIApp.getState();
    const u  = (st.units || []).find(x => x.id === id);
    if (!u) return;

    const action = u.active ? 'Disable' : 'Enable';
    const ok = await SSIApp.confirm(`${action} unit "${u.name}"?\n${u.active ? 'Disabling will hide this unit from all modules.' : ''}`);
    if (!ok) return;

    u.active = !u.active;
    SSIApp.saveState(st);
    SSIApp.toast(`Unit "${u.name}" ${u.active ? 'enabled' : 'disabled'} ✅`);
    SSIApp.audit('UNIT_TOGGLE', `${u.name} ${u.active ? 'enabled' : 'disabled'}`);
    refresh(document.getElementById('page-area'));
  }

  return { render, refresh, getAll, openForm, saveUnit, toggleActive };
})();
