/* SSI Clients / Vendors Module — ssi-v2 compatible */

const SSIClients = (() => {

  // ── Main render ─────────────────────────────────────────────────────────────
  function render(area) {
    if (!SSIApp.hasRole('ADMIN', 'SALES')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st = SSIApp.getState();
    const clients = st.clients || [];
    const isAdmin = SSIApp.hasRole('ADMIN');

    // Count actives for summary bar
    const activeCount   = clients.filter(c => c.active !== false).length;
    const inactiveCount = clients.length - activeCount;

    const rows = clients.map(c => {
      // treat missing active field as active (legacy imported data)
      const isActive = c.active !== false;
      const statusBadge = isActive
        ? `<span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;"
             onclick="SSIClients._toggleStatus('${c.id}')" title="Click to deactivate">✅ Active</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;"
             onclick="SSIClients._toggleStatus('${c.id}')" title="Click to activate">🔴 Inactive</span>`;

      return `
      <tr style="${isActive ? '' : 'opacity:0.55;background:#fafafa;'}">
        ${isAdmin ? `<td style="width:36px;">
          <input type="checkbox" class="client-cb" data-id="${c.id}"
            style="width:16px;height:16px;accent-color:#C0392B;cursor:pointer;" />
        </td>` : ''}
        <td><strong>${_esc(c.name)}</strong></td>
        <td><span style="background:#FDECEA;color:#922B21;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${_esc(c.type || 'Client')}</span></td>
        <td>${_esc(c.tel || '—')}</td>
        <td style="font-size:12px;color:#64748b;">${_esc(c.gst || '—')}</td>
        <td style="font-size:13px;color:#374151;">${_esc(c.assignedTo || '—')}</td>
        <td>${statusBadge}</td>
        ${isAdmin ? `<td style="white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIClients._edit('${c.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm"    onclick="SSIClients._del('${c.id}')">🗑️</button>
        </td>` : ''}
      </tr>`;
    }).join('') ||
      `<tr><td colspan="${isAdmin ? 8 : 6}" class="empty-state">
        <div class="icon">👥</div><p>No clients/vendors yet.</p>
      </td></tr>`;

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👥 Clients / Vendors</h2>
        ${isAdmin ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button id="btnBulkDel"
            class="btn btn-danger btn-sm"
            style="display:none;"
            onclick="SSIClients._bulkDelete()">
            🗑️ Delete Selected
          </button>
          <button class="btn btn-secondary btn-sm" onclick="SSIClients._downloadTemplate()">⬇️ Template</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            📥 Import Excel
            <input type="file" id="clientImportFile" accept=".xlsx,.xls"
              style="display:none;" onchange="SSIClients._import(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="SSIClients._export()">📤 Export</button>
          <button class="btn btn-primary"          onclick="SSIClients._openForm()">+ Add</button>
        </div>` : ''}
      </div>

      <!-- Summary bar -->
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
        <div style="background:#dcfce7;color:#166534;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">
          ✅ Active: ${activeCount}
        </div>
        <div style="background:#fee2e2;color:#991b1b;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">
          🔴 Inactive: ${inactiveCount}
        </div>
        <div style="background:#f1f5f9;color:#475569;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">
          📋 Total: ${clients.length}
        </div>
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              ${isAdmin ? `<th style="width:36px;">
                <input type="checkbox" id="cbAll"
                  style="width:16px;height:16px;accent-color:#C0392B;cursor:pointer;"
                  title="Select All"
                  onchange="SSIClients._toggleAll(this.checked)" />
              </th>` : ''}
              <th>Name</th>
              <th>Type</th>
              <th>Tel</th>
              <th>GST</th>
              <th>Assigned To</th>
              <th>Status</th>
              ${isAdmin ? '<th>Actions</th>' : ''}
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    // Wire up per-row checkbox changes
    if (isAdmin) {
      area.querySelectorAll('.client-cb').forEach(cb => {
        cb.addEventListener('change', () => _syncSelectAll(area));
      });
    }

    SSIClients._area = area;
  }

  // ── helpers ──────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _syncSelectAll(area) {
    const all     = [...(area || SSIClients._area).querySelectorAll('.client-cb')];
    const checked = all.filter(c => c.checked);
    const cbAll   = (area || SSIClients._area).querySelector('#cbAll');
    if (cbAll) {
      cbAll.checked       = all.length > 0 && checked.length === all.length;
      cbAll.indeterminate = checked.length > 0 && checked.length < all.length;
    }
    const btn = (area || SSIClients._area).querySelector('#btnBulkDel');
    if (btn) btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';
  }

  // ── Toggle Active / Inactive ─────────────────────────────────────────────────
  async function _toggleStatus(id) {
    const st     = SSIApp.getState();
    const client = (st.clients || []).find(c => c.id === id);
    if (!client) return;

    const wasActive = client.active !== false;
    client.active   = !wasActive;   // flip

    await SSIApp.saveState(st);
    SSIApp.toast(
      wasActive ? `🔴 "${client.name}" marked Inactive` : `✅ "${client.name}" marked Active`,
      wasActive ? 'warning' : 'success'
    );
    SSIApp.audit('TOGGLE_CLIENT_STATUS',
      `${client.name} → ${client.active ? 'Active' : 'Inactive'}`);
    if (SSIClients._area) refresh(SSIClients._area);
  }

  // ── Select All toggle ────────────────────────────────────────────────────────
  function _toggleAll(checked) {
    const area = SSIClients._area;
    if (!area) return;
    area.querySelectorAll('.client-cb').forEach(cb => { cb.checked = checked; });
    _syncSelectAll(area);
  }

  // ── Bulk Delete ───────────────────────────────────────────────────────────────
  async function _bulkDelete() {
    const area = SSIClients._area;
    if (!area) return;
    const ids = [...area.querySelectorAll('.client-cb:checked')].map(cb => cb.getAttribute('data-id'));
    if (!ids.length) return;
    const ok = await SSIApp.confirm(`Delete ${ids.length} selected client(s)? This cannot be undone.`);
    if (!ok) return;
    const st = SSIApp.getState();
    st.clients = (st.clients || []).filter(c => !ids.includes(c.id));
    await SSIApp.saveState(st);
    SSIApp.audit('BULK_DELETE_CLIENTS', `Deleted ${ids.length} clients`);
    SSIApp.toast(`🗑️ ${ids.length} client(s) deleted`, 'success');
    refresh(area);
  }

  // ── Single Delete ────────────────────────────────────────────────────────────
  async function _del(id) {
    const ok = await SSIApp.confirm('Delete this client/vendor?');
    if (!ok) return;
    const st    = SSIApp.getState();
    const found = (st.clients || []).find(c => c.id === id);
    st.clients  = (st.clients || []).filter(c => c.id !== id);
    await SSIApp.saveState(st);
    SSIApp.audit('DELETE_CLIENT', `Deleted: ${found?.name || id}`);
    SSIApp.toast('Client deleted', 'success');
    if (SSIClients._area) refresh(SSIClients._area);
  }

  // ── Open Add / Edit Form ─────────────────────────────────────────────────────
  function _openForm(id) {
    const st = SSIApp.getState();
    const c  = id ? (st.clients || []).find(x => x.id === id) : null;
    const isActive = !c || c.active !== false;

    SSIApp.showModal(`
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${c ? 'Edit' : 'Add'} Client / Vendor</h3>
        <button onclick="SSIApp.closeModal()"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">

          <div style="grid-column:1/-1;">
            <label>Name *</label>
            <input id="c-name" value="${_esc(c?.name || '')}" placeholder="Client / Vendor name">
          </div>

          <div>
            <label>Type</label>
            <select id="c-type">
              <option value="Client"  ${(!c || c.type==='Client')  ? 'selected':''}>Client</option>
              <option value="Vendor"  ${c?.type==='Vendor'         ? 'selected':''}>Vendor</option>
              <option value="Both"    ${c?.type==='Both'           ? 'selected':''}>Both</option>
            </select>
          </div>

          <div>
            <label>Tel No</label>
            <input id="c-tel" value="${_esc(c?.tel || '')}" placeholder="Phone number">
          </div>

          <div>
            <label>GST No</label>
            <input id="c-gst" value="${_esc(c?.gst || '')}" placeholder="GST Number">
          </div>

          <div>
            <label>Assigned To</label>
            <input id="c-assigned" value="${_esc(c?.assignedTo || '')}"
              placeholder="Sales person / Employee name">
          </div>

          <div>
            <label>Status</label>
            <select id="c-active">
              <option value="true"  ${isActive  ? 'selected':''}>✅ Active</option>
              <option value="false" ${!isActive ? 'selected':''}>🔴 Inactive</option>
            </select>
          </div>

          <div style="grid-column:1/-1;">
            <label>Address</label>
            <textarea id="c-addr" rows="3"
              placeholder="Full address">${_esc(c?.address || '')}</textarea>
          </div>

        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:1rem 1.5rem;">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary"   onclick="SSIClients._save('${c?.id || ''}')">
          ${c ? 'Update' : 'Add Client'}
        </button>
      </div>`);
  }

  // ── Save (Add / Update) ───────────────────────────────────────────────────────
  async function _save(id) {
    const name = document.getElementById('c-name')?.value.trim();
    if (!name) { SSIApp.toast('Name is required', 'error'); return; }

    const payload = {
      id:         id || SSIApp.uid(),
      name,
      type:       document.getElementById('c-type')?.value          || 'Client',
      tel:        document.getElementById('c-tel')?.value.trim()    || '',
      gst:        document.getElementById('c-gst')?.value.trim()    || '',
      assignedTo: document.getElementById('c-assigned')?.value.trim() || '',
      address:    document.getElementById('c-addr')?.value.trim()   || '',
      active:     document.getElementById('c-active')?.value !== 'false',  // true unless explicitly false
      created_at: new Date().toISOString()
    };

    const st  = SSIApp.getState();
    if (!st.clients) st.clients = [];
    const idx = st.clients.findIndex(c => c.id === payload.id);

    if (idx >= 0) {
      st.clients[idx] = { ...st.clients[idx], ...payload };
      SSIApp.toast('Client updated ✅', 'success');
      SSIApp.audit('UPDATE_CLIENT', `Updated: ${name}`);
    } else {
      st.clients.unshift(payload);
      SSIApp.toast('Client added ✅', 'success');
      SSIApp.audit('ADD_CLIENT', `Added: ${name}`);
    }

    await SSIApp.saveState(st);
    SSIApp.closeModal();
    if (SSIClients._area) refresh(SSIClients._area);
  }

  // ── Template Download ─────────────────────────────────────────────────────────
  function _downloadTemplate() {
    if (typeof XLSX === 'undefined') { SSIApp.toast('Excel library not loaded', 'error'); return; }
    const rows = [
      ['Name', 'Type', 'Tel', 'GST', 'Address', 'Assigned To'],
      ['Sample Client Pvt Ltd', 'Client', '9876543210', '27ABCDE1234F1ZX', '123 Main Street, City', 'Rahul Sharma'],
      ['Sample Vendor Co',      'Vendor', '9898989898', '07XYZAB5678G2ZY', '456 Market Road, Town', 'Priya Singh'],
    ];
    SSIApp.excelDownload(rows, 'Clients', 'SSI_Clients_Template');
  }

  // ── Export Excel ──────────────────────────────────────────────────────────────
  function _export() {
    if (typeof XLSX === 'undefined') { SSIApp.toast('Excel library not loaded', 'error'); return; }
    const st   = SSIApp.getState();
    const rows = [['Name', 'Type', 'Tel', 'GST', 'Address', 'Assigned To', 'Status']];
    for (const c of (st.clients || [])) {
      rows.push([
        c.name||'', c.type||'', c.tel||'', c.gst||'', c.address||'',
        c.assignedTo||'',
        c.active !== false ? 'Active' : 'Inactive'
      ]);
    }
    SSIApp.excelDownload(rows, 'Clients', 'SSI_Clients_Export');
  }

  // ── Import Excel ──────────────────────────────────────────────────────────────
  async function _import(input) {
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const rows = await SSIApp.excelRead(file);
      const st   = SSIApp.getState();
      if (!st.clients) st.clients = [];

      let added = 0;
      for (const o of rows) {
        const name = String(o['Name'] || o['name'] || '').trim();
        if (!name) continue;

        const typeRaw = String(o['Type'] || o['type'] || 'Client').trim();
        const type    = ['Client','Vendor','Both'].includes(typeRaw) ? typeRaw : 'Client';

        const assignedTo = String(
          o['Assigned To'] || o['assigned_to'] || o['AssignedTo'] ||
          o['Assigned to'] || o['ASSIGNED TO'] || o['assignedTo'] || ''
        ).trim();

        st.clients.unshift({
          id:         SSIApp.uid(),
          name,
          type,
          tel:        String(o['Tel'] || o['tel'] || o['TEL'] || '').trim(),
          gst:        String(o['GST'] || o['gst'] || o['Gst'] || '').trim(),
          address:    String(o['Address'] || o['address'] || '').trim(),
          assignedTo,
          active:     true,          // all imported clients are Active by default
          created_at: new Date().toISOString()
        });
        added++;
      }

      await SSIApp.saveState(st);
      SSIApp.toast(`Imported ${added} clients ✅`, 'success');
      SSIApp.audit('IMPORT_CLIENTS', `Imported ${added} clients`);
      if (SSIClients._area) refresh(SSIClients._area);
    } catch (err) {
      console.error('[SSIClients] Import error:', err);
      SSIApp.toast('Import failed. Check Excel format.', 'error');
    } finally {
      if (input) input.value = '';
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  return {
    render,
    _area: null,
    _edit:             _openForm,
    _del,
    _bulkDelete,
    _toggleAll,
    _toggleStatus,
    _openForm,
    _save,
    _downloadTemplate,
    _export,
    _import
  };
})();
