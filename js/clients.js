/* SSI Clients/Vendors Module */
const SSIClients = (() => {

  function render(area) {
    if (!SSIApp.hasRole('ADMIN','SALES')) { area.innerHTML='<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>'; return; }
    refresh(area);
  }

  function refresh(area) {
    const st = SSIApp.getState();
    const clients = st.clients.filter(c => c.active);

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👥 Clients / Vendors</h2>
        ${SSIApp.hasRole('ADMIN') ? `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIClients.downloadTemplate()">⬇️ Template</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            📥 Import Excel <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="SSIClients.importExcel(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="SSIClients.exportExcel()">📤 Export</button>
          <button class="btn btn-primary" onclick="SSIClients.openForm()">+ Add Client</button>
        </div>` : ''}
      </div>

      <div class="card">
        <div style="margin-bottom:16px;">
          <input type="text" id="client-search" placeholder="🔍 Search by name, GST, phone..." style="max-width:360px;"
            oninput="SSIClients.filterTable(this.value)">
        </div>
        <div style="overflow-x:auto;">
          <table id="clients-table">
            <thead><tr>
              <th>#</th>
              <th>Name</th>
              <th>GST Number</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Type</th>
              <th>Total Orders</th>
              ${SSIApp.hasRole('ADMIN') ? '<th>Actions</th>' : ''}
            </tr></thead>
            <tbody>
              ${clients.map((c, i) => {
                const orderCount = st.orders.filter(o => o.client_id === c.id).length;
                return `<tr data-search="${(c.name+c.gst_no+c.phone+c.address).toLowerCase()}">
                  <td style="color:#94a3b8;font-size:13px;">${i+1}</td>
                  <td>
                    <strong style="color:#111827;">${c.name}</strong>
                    ${c.email ? `<br><span style="font-size:12px;color:#94a3b8;">${c.email}</span>` : ''}
                  </td>
                  <td>
                    ${c.gst_no
                      ? `<code style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${c.gst_no}</code>`
                      : '<span style="color:#d1d5db;font-size:12px;">—</span>'}
                  </td>
                  <td style="font-size:13px;">${c.phone || '—'}</td>
                  <td style="font-size:13px;color:#64748b;max-width:200px;">${c.address || '—'}</td>
                  <td>
                    <span style="background:${c.type==='Vendor'?'#fef3c7':'#dbeafe'};color:${c.type==='Vendor'?'#92400e':'#1e40af'};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${c.type||'Client'}</span>
                  </td>
                  <td style="text-align:center;font-weight:600;">${orderCount}</td>
                  ${SSIApp.hasRole('ADMIN') ? `<td>
                    <button class="btn btn-secondary btn-sm" onclick="SSIClients.openForm('${c.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="SSIClients.deleteClient('${c.id}')">🗑️</button>
                  </td>` : ''}
                </tr>`;
              }).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">No clients yet. Add your first client!</td></tr>`}
            </tbody>
          </table>
        </div>
        <div style="margin-top:12px;font-size:13px;color:#94a3b8;">Total: ${clients.length} clients/vendors</div>
      </div>`;
  }

  function filterTable(q) {
    const term = q.toLowerCase();
    document.querySelectorAll('#clients-table tbody tr[data-search]').forEach(row => {
      row.style.display = row.dataset.search.includes(term) ? '' : 'none';
    });
  }

  function openForm(id) {
    const st = SSIApp.getState();
    const c = id ? st.clients.find(x => x.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${c ? 'Edit' : 'Add'} Client / Vendor</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">
          <div>
            <label>Name *</label>
            <input id="c-name" value="${c?.name||''}" placeholder="e.g. Raj Enterprises">
          </div>
          <div>
            <label>Type</label>
            <select id="c-type">
              <option value="Client"  ${c?.type==='Client' ?'selected':''}>Client (Buyer)</option>
              <option value="Vendor"  ${c?.type==='Vendor' ?'selected':''}>Vendor (Supplier)</option>
              <option value="Both"    ${c?.type==='Both'   ?'selected':''}>Both</option>
            </select>
          </div>
          <div>
            <label>GST Number</label>
            <input id="c-gst" value="${c?.gst_no||''}" placeholder="e.g. 09ABCDE1234F1Z5" maxlength="15"
              style="text-transform:uppercase;" oninput="this.value=this.value.toUpperCase()">
          </div>
          <div>
            <label>Phone / Mobile</label>
            <input id="c-phone" value="${c?.phone||''}" placeholder="e.g. 9876543210" type="tel">
          </div>
          <div>
            <label>Email</label>
            <input id="c-email" value="${c?.email||''}" placeholder="e.g. contact@example.com" type="email">
          </div>
          <div>
            <label>City</label>
            <input id="c-city" value="${c?.city||''}" placeholder="e.g. Delhi">
          </div>
          <div style="grid-column:span 2;">
            <label>Full Address</label>
            <textarea id="c-address" rows="2" placeholder="Street, Area, City, PIN">${c?.address||''}</textarea>
          </div>
          <div>
            <label>Contact Person</label>
            <input id="c-contact" value="${c?.contact_person||''}" placeholder="e.g. Mr. Sharma">
          </div>
          <div>
            <label>Credit Limit (₹)</label>
            <input id="c-credit" type="number" min="0" value="${c?.credit_limit||''}" placeholder="0 = no limit">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="SSIClients.saveClient('${id||''}')">💾 Save Client</button>
      </div>`;

    SSIApp.showModal(html);
  }

  function saveClient(id) {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { SSIApp.toast('Client name is required', 'error'); return; }

    const gst_no = document.getElementById('c-gst').value.trim().toUpperCase();
    if (gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_no)) {
      if (!window.confirm('GST number format looks incorrect. Continue anyway?')) return;
    }

    const st = SSIApp.getState();
    const data = {
      name,
      type: document.getElementById('c-type').value,
      gst_no,
      phone: document.getElementById('c-phone').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      city: document.getElementById('c-city').value.trim(),
      address: document.getElementById('c-address').value.trim(),
      contact_person: document.getElementById('c-contact').value.trim(),
      credit_limit: parseFloat(document.getElementById('c-credit').value) || 0,
    };

    if (id) {
      const idx = st.clients.findIndex(c => c.id === id);
      if (idx >= 0) Object.assign(st.clients[idx], data, { updated_at: new Date().toISOString() });
      SSIApp.toast('Client updated ✅');
    } else {
      st.clients.push({ id: SSIApp.uid(), ...data, active: true, created_at: new Date().toISOString() });
      SSIApp.toast('Client added ✅');
    }

    SSIApp.saveState(st);
    SSIApp.closeModal();
    SSIApp.audit('CLIENT_SAVE', `Client ${name}`);
    refresh(document.getElementById('page-area'));
  }

  async function deleteClient(id) {
    const ok = await SSIApp.confirm('Delete this client? Existing orders will not be affected.');
    if (!ok) return;
    const st = SSIApp.getState();
    const c = st.clients.find(x => x.id === id);
    if (c) {
      c.active = false;
      SSIApp.saveState(st);
      SSIApp.toast('Client deleted');
      SSIApp.audit('CLIENT_DELETE', c.name);
      refresh(document.getElementById('page-area'));
    }
  }

  function downloadTemplate() {
    SSIApp.excelDownload([
      ['Name','Type (Client/Vendor/Both)','GST Number','Phone','Email','City','Address','Contact Person','Credit Limit'],
      ['Raj Enterprises','Client','09ABCDE1234F1Z5','9876543210','raj@example.com','Delhi','123 Main St, Delhi','Mr. Raj','50000'],
      ['ABC Suppliers','Vendor','','9123456789','','Noida','Sector 63, Noida','Mr. Sharma',''],
    ], 'Clients', 'SSI_Clients_Template');
  }

  async function importExcel(input) {
    const file = input.files[0]; if (!file) return;
    try {
      const rows = await SSIApp.excelRead(file);
      const st = SSIApp.getState();
      let added = 0;
      rows.forEach(r => {
        const name = (r['Name'] || '').toString().trim();
        if (!name) return;
        st.clients.push({
          id: SSIApp.uid(), name,
          type: (r['Type (Client/Vendor/Both)'] || 'Client').toString().trim(),
          gst_no: (r['GST Number'] || '').toString().trim().toUpperCase(),
          phone: (r['Phone'] || '').toString().trim(),
          email: (r['Email'] || '').toString().trim(),
          city: (r['City'] || '').toString().trim(),
          address: (r['Address'] || '').toString().trim(),
          contact_person: (r['Contact Person'] || '').toString().trim(),
          credit_limit: parseFloat(r['Credit Limit']) || 0,
          active: true, created_at: new Date().toISOString()
        });
        added++;
      });
      SSIApp.saveState(st);
      SSIApp.toast(`${added} clients imported ✅`);
      SSIApp.audit('CLIENT_IMPORT', `${added} clients`);
      refresh(document.getElementById('page-area'));
    } catch (e) {
      SSIApp.toast('Import failed: ' + e.message, 'error');
    }
    input.value = '';
  }

  function exportExcel() {
    const st = SSIApp.getState();
    const rows = [['Name','Type','GST Number','Phone','Email','City','Address','Contact Person','Credit Limit']];
    st.clients.filter(c => c.active).forEach(c => {
      rows.push([c.name, c.type||'Client', c.gst_no||'', c.phone||'', c.email||'', c.city||'', c.address||'', c.contact_person||'', c.credit_limit||0]);
    });
    SSIApp.excelDownload(rows, 'Clients', 'SSI_Clients_Export');
    SSIApp.toast('Clients exported ✅');
  }

  return { render, refresh, openForm, saveClient, deleteClient, downloadTemplate, importExcel, exportExcel, filterTable };
})();
