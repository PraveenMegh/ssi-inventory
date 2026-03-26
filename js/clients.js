/* SSI Clients/Vendors Module — v10 with Salesperson Assignment */
const SSIClients = (() => {

  // Returns clients visible to current user
  function visibleClients(st, user) {
    const all = st.clients.filter(c => c.active);
    if (!user || user.role === 'ADMIN') return all;           // Admin sees all
    if (user.role === 'SALES') {
      // Sales: own assigned clients + clients they created
      return all.filter(c => c.assigned_to === user.id || c.created_by === user.id);
    }
    return all; // STOCK / DISPATCH see all (read-only context via orders)
  }

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
    const clients = visibleClients(st, user);
    const isAdmin = user?.role === 'ADMIN';
    const salesUsers = st.users.filter(u => u.role === 'SALES' && u.active);

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👥 Clients / Vendors</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="SSIClients.downloadTemplate()">⬇️ Template</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
              📥 Import Excel <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="SSIClients.importExcel(this)">
            </label>
            <button class="btn btn-secondary btn-sm" onclick="SSIClients.exportExcel()">📤 Export</button>
          ` : ''}
          <button class="btn btn-primary" onclick="SSIClients.openForm()">+ Add Client</button>
        </div>
      </div>

      <!-- Search + Filter bar -->
      <div class="card" style="margin-bottom:16px;padding:14px 16px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:200px;">
            <label>Search</label>
            <input type="text" id="client-search" placeholder="🔍 Name / GST / Phone / City..."
              oninput="SSIClients.filterTable(this.value)">
          </div>
          ${isAdmin ? `
          <div style="flex:1;min-width:160px;">
            <label>Filter by Salesperson</label>
            <select id="client-filter-sp" onchange="SSIClients.filterTable(document.getElementById('client-search').value)">
              <option value="">All Salespersons</option>
              ${salesUsers.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
              <option value="unassigned">— Unassigned —</option>
            </select>
          </div>
          <div style="flex:1;min-width:140px;">
            <label>Filter by Type</label>
            <select id="client-filter-type" onchange="SSIClients.filterTable(document.getElementById('client-search').value)">
              <option value="">All Types</option>
              <option value="Client">Client</option>
              <option value="Vendor">Vendor</option>
              <option value="Both">Both</option>
            </select>
          </div>` : ''}
        </div>
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table id="clients-table">
            <thead><tr>
              <th>#</th>
              <th>Name</th>
              <th>GST Number</th>
              <th>Phone</th>
              <th>City</th>
              <th>Type</th>
              <th>Assigned To</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${clients.length === 0
                ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">
                    ${user?.role==='SALES' ? 'No clients assigned to you yet. Add a new client or ask Admin to assign.' : 'No clients yet. Add your first client!'}
                   </td></tr>`
                : clients.map((c, i) => {
                    const orderCount = st.orders.filter(o => o.client_id === c.id).length;
                    const assignedUser = st.users.find(u => u.id === c.assigned_to);
                    const spColor = assignedUser ? '#7c3aed' : '#94a3b8';
                    return `<tr
                      data-search="${[c.name,c.gst_no||'',c.phone||'',c.city||'',c.address||''].join(' ').toLowerCase()}"
                      data-sp="${c.assigned_to||'unassigned'}"
                      data-type="${c.type||'Client'}">
                      <td style="color:#94a3b8;font-size:13px;">${i+1}</td>
                      <td>
                        <strong style="color:#111827;">${c.name}</strong>
                        ${c.contact_person ? `<br><span style="font-size:12px;color:#94a3b8;">👤 ${c.contact_person}</span>` : ''}
                        ${c.email ? `<br><span style="font-size:12px;color:#94a3b8;">✉️ ${c.email}</span>` : ''}
                      </td>
                      <td>
                        ${c.gst_no
                          ? `<code style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${c.gst_no}</code>`
                          : '<span style="color:#d1d5db;font-size:12px;">—</span>'}
                      </td>
                      <td style="font-size:13px;">${c.phone || '—'}</td>
                      <td style="font-size:13px;color:#64748b;">${c.city || '—'}</td>
                      <td>
                        <span style="background:${c.type==='Vendor'?'#fef3c7':c.type==='Both'?'#f3e8ff':'#dbeafe'};
                          color:${c.type==='Vendor'?'#92400e':c.type==='Both'?'#6d28d9':'#1e40af'};
                          padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">
                          ${c.type||'Client'}
                        </span>
                      </td>
                      <td>
                        ${assignedUser
                          ? `<div style="display:flex;align-items:center;gap:6px;">
                              <div style="width:26px;height:26px;background:#7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">${assignedUser.name[0]}</div>
                              <span style="font-size:13px;font-weight:600;color:#7c3aed;">${assignedUser.name}</span>
                             </div>`
                          : `<span style="color:#d1d5db;font-size:12px;">— Unassigned —</span>`}
                      </td>
                      <td style="text-align:center;font-weight:600;">${orderCount}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="SSIClients.openForm('${c.id}')">✏️</button>
                        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="SSIClients.deleteClient('${c.id}')">🗑️</button>` : ''}
                      </td>
                    </tr>`;
                  }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:12px;font-size:13px;color:#94a3b8;">
          Showing: <strong>${clients.length}</strong> clients/vendors
          ${user?.role==='SALES' ? ' (your assigned clients only)' : ''}
        </div>
      </div>`;
  }

  function filterTable(q) {
    const term   = (q||'').toLowerCase();
    const spF    = document.getElementById('client-filter-sp')?.value    || '';
    const typeF  = document.getElementById('client-filter-type')?.value  || '';
    let visible  = 0;
    document.querySelectorAll('#clients-table tbody tr[data-search]').forEach(row => {
      const matchSearch = !term || row.dataset.search.includes(term);
      const matchSP     = !spF  || row.dataset.sp === spF;
      const matchType   = !typeF|| row.dataset.type === typeF;
      const show = matchSearch && matchSP && matchType;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
  }

  function openForm(id) {
    const st   = SSIApp.getState();
    const user = SSIApp.currentUser();
    const c    = id ? st.clients.find(x => x.id === id) : null;
    const isAdmin = user?.role === 'ADMIN';
    const salesUsers = st.users.filter(u => u.role === 'SALES' && u.active);

    // For SALES user adding new client → auto-assign to themselves
    const defaultAssignedTo = c?.assigned_to || (user?.role === 'SALES' ? user.id : '');

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${c ? 'Edit' : 'Add'} Client / Vendor</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">

          <!-- Assigned Salesperson — FIRST & prominent -->
          <div style="grid-column:span 2;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:10px;padding:14px 16px;">
            <label style="color:#6d28d9;font-size:13px;font-weight:700;">🧑‍💼 Assigned Salesperson *</label>
            ${isAdmin
              ? `<select id="c-assigned" style="margin-top:6px;border-color:#c4b5fd;">
                  <option value="">— Unassigned (Admin only) —</option>
                  ${salesUsers.map(u=>`<option value="${u.id}" ${defaultAssignedTo===u.id?'selected':''}>${u.name} (@${u.username})</option>`).join('')}
                </select>
                <p style="font-size:12px;color:#7c3aed;margin-top:6px;">📌 This client will be visible ONLY to the assigned salesperson (and Admin)</p>`
              : `<div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                  <div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${user?.name[0]}</div>
                  <strong style="color:#7c3aed;">${user?.name} (You)</strong>
                  <input type="hidden" id="c-assigned" value="${user?.id}">
                 </div>
                 <p style="font-size:12px;color:#7c3aed;margin-top:6px;">This client will be assigned to you automatically.</p>`}
          </div>

          <div>
            <label>Client / Vendor Name *</label>
            <input id="c-name" value="${c?.name||''}" placeholder="e.g. Raj Enterprises">
          </div>
          <div>
            <label>Type</label>
            <select id="c-type">
              <option value="Client" ${c?.type==='Client'||!c?'selected':''}>Client (Buyer)</option>
              <option value="Vendor" ${c?.type==='Vendor'?'selected':''}>Vendor (Supplier)</option>
              <option value="Both"   ${c?.type==='Both'  ?'selected':''}>Both</option>
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

    const assigned_to = document.getElementById('c-assigned')?.value || '';
    if (!assigned_to) {
      // Admin saving without assignment — allow but warn
      if (SSIApp.hasRole('ADMIN')) {
        if (!window.confirm('No salesperson assigned. This client will only be visible to Admin. Continue?')) return;
      }
    }

    const gst_no = document.getElementById('c-gst').value.trim().toUpperCase();
    if (gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_no)) {
      if (!window.confirm('GST number format looks incorrect. Continue anyway?')) return;
    }

    const user = SSIApp.currentUser();
    const st   = SSIApp.getState();
    const data = {
      name,
      assigned_to,
      type:           document.getElementById('c-type').value,
      gst_no,
      phone:          document.getElementById('c-phone').value.trim(),
      email:          document.getElementById('c-email').value.trim(),
      city:           document.getElementById('c-city').value.trim(),
      address:        document.getElementById('c-address').value.trim(),
      contact_person: document.getElementById('c-contact').value.trim(),
      credit_limit:   parseFloat(document.getElementById('c-credit').value) || 0,
    };

    if (id) {
      const idx = st.clients.findIndex(c => c.id === id);
      if (idx >= 0) Object.assign(st.clients[idx], data, { updated_at: new Date().toISOString() });
      SSIApp.toast('Client updated ✅');
    } else {
      st.clients.push({
        id: SSIApp.uid(), ...data,
        created_by: user?.id,
        active: true,
        created_at: new Date().toISOString()
      });
      SSIApp.toast('Client added ✅');
    }

    SSIApp.saveState(st);
    SSIApp.closeModal();
    SSIApp.audit('CLIENT_SAVE', `Client ${name} → assigned to ${assigned_to||'nobody'}`);
    refresh(document.getElementById('page-area'));
  }

  async function deleteClient(id) {
    const ok = await SSIApp.confirm('Delete this client? Existing orders will not be affected.');
    if (!ok) return;
    const st = SSIApp.getState();
    const c  = st.clients.find(x => x.id === id);
    if (c) {
      c.active = false;
      SSIApp.saveState(st);
      SSIApp.toast('Client deleted');
      SSIApp.audit('CLIENT_DELETE', c.name);
      refresh(document.getElementById('page-area'));
    }
  }

  // Excel template — now includes Assigned Salesperson column
  function downloadTemplate() {
    const st = SSIApp.getState();
    const salesUsers = st.users.filter(u => u.role === 'SALES' && u.active);
    const salesNote  = salesUsers.map(u => u.username).join(' / ') || 'sales1 / sales2';
    SSIApp.excelDownload([
      ['Name','Type (Client/Vendor/Both)','GST Number','Phone','Email','City','Address','Contact Person','Credit Limit','Assigned Salesperson (username)'],
      ['Raj Enterprises','Client','09ABCDE1234F1Z5','9876543210','raj@example.com','Delhi','123 Main St, Delhi','Mr. Raj','50000', salesNote.split('/')[0].trim()],
      ['ABC Suppliers','Vendor','','9123456789','','Noida','Sector 63, Noida','Mr. Sharma','', salesNote.split('/')[1]?.trim()||''],
      ['XYZ Traders','Client','27XYZAB5678G1H2','9988776655','xyz@email.com','Mumbai','Andheri West, Mumbai','Ms. Priya','100000', salesNote.split('/')[0]?.trim()||''],
    ], 'Clients', 'SSI_Clients_Template');
    SSIApp.toast('Template downloaded ✅ — Fill Assigned Salesperson column with username (e.g. sales1)');
  }

  async function importExcel(input) {
    const file = input.files[0]; if (!file) return;
    try {
      const rows = await SSIApp.excelRead(file);
      const st   = SSIApp.getState();
      let added = 0, skipped = 0;
      const user = SSIApp.currentUser();

      rows.forEach(r => {
        const name = (r['Name'] || '').toString().trim();
        if (!name) return;

        // Resolve salesperson by username
        const spUsername = (r['Assigned Salesperson (username)'] || '').toString().trim().toLowerCase();
        const spUser     = spUsername ? st.users.find(u => u.username === spUsername && u.role === 'SALES') : null;

        st.clients.push({
          id:             SSIApp.uid(),
          name,
          assigned_to:   spUser?.id || '',
          type:          (r['Type (Client/Vendor/Both)'] || 'Client').toString().trim(),
          gst_no:        (r['GST Number'] || '').toString().trim().toUpperCase(),
          phone:         (r['Phone'] || '').toString().trim(),
          email:         (r['Email'] || '').toString().trim(),
          city:          (r['City'] || '').toString().trim(),
          address:       (r['Address'] || '').toString().trim(),
          contact_person:(r['Contact Person'] || '').toString().trim(),
          credit_limit:  parseFloat(r['Credit Limit']) || 0,
          created_by:    user?.id,
          active:        true,
          created_at:    new Date().toISOString()
        });
        added++;
      });

      SSIApp.saveState(st);
      SSIApp.toast(`✅ ${added} clients imported${skipped>0?' ('+skipped+' skipped)':''}`);
      SSIApp.audit('CLIENT_IMPORT', `${added} clients`);
      refresh(document.getElementById('page-area'));
    } catch (e) {
      SSIApp.toast('Import failed: ' + e.message, 'error');
    }
    input.value = '';
  }

  function exportExcel() {
    const st = SSIApp.getState();
    const rows = [['Name','Type','GST Number','Phone','Email','City','Address','Contact Person','Credit Limit','Assigned Salesperson (username)','Assigned Salesperson Name']];
    st.clients.filter(c => c.active).forEach(c => {
      const sp = st.users.find(u => u.id === c.assigned_to);
      rows.push([
        c.name, c.type||'Client', c.gst_no||'', c.phone||'', c.email||'',
        c.city||'', c.address||'', c.contact_person||'', c.credit_limit||0,
        sp?.username||'', sp?.name||''
      ]);
    });
    SSIApp.excelDownload(rows, 'Clients', 'SSI_Clients_Export');
    SSIApp.toast('Clients exported ✅');
  }

  // Used by Orders module to get clients for current user
  function getClientsForCurrentUser() {
    const st   = SSIApp.getState();
    const user = SSIApp.currentUser();
    return visibleClients(st, user);
  }

  return {
    render, refresh, openForm, saveClient, deleteClient,
    downloadTemplate, importExcel, exportExcel, filterTable,
    visibleClients, getClientsForCurrentUser
  };
})();
