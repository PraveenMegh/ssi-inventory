/* SSI Users Module — Admin Only */
const SSIUsers = (() => {

  function render(area) {
    if (!SSIApp.hasRole('ADMIN')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Admin access only</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st = SSIApp.getState();
    const roleColors = { ADMIN:'#dc2626', STOCK:'#16a34a', DISPATCH:'#2563eb', SALES:'#7c3aed' };
    const roleBg     = { ADMIN:'#fee2e2', STOCK:'#dcfce7', DISPATCH:'#dbeafe', SALES:'#ede9fe' };

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👤 User Management</h2>
        <button class="btn btn-primary" onclick="SSIUsers.openForm()">+ Add User</button>
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>#</th><th>Name</th><th>Username</th><th>Role</th>
              <th>Status</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${st.users.map((u, i) => `
                <tr>
                  <td style="color:#94a3b8;">${i+1}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:${roleColors[u.role]||'#94a3b8'};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">
                        ${u.name[0].toUpperCase()}
                      </div>
                      <strong>${u.name}</strong>
                    </div>
                  </td>
                  <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">@${u.username}</code></td>
                  <td>
                    <span style="background:${roleBg[u.role]||'#f1f5f9'};color:${roleColors[u.role]||'#374151'};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;">
                      ${u.role}
                    </span>
                  </td>
                  <td>
                    <span style="background:${u.active?'#dcfce7':'#f1f5f9'};color:${u.active?'#16a34a':'#64748b'};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">
                      ${u.active ? '✅ Active' : '⛔ Inactive'}
                    </span>
                  </td>
                  <td style="font-size:12px;color:#94a3b8;">${SSIApp.dateFmt(u.created_at)}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="SSIUsers.openForm('${u.id}')">✏️ Edit</button>
                    ${u.id !== SSIApp.currentUser()?.id
                      ? `<button class="btn ${u.active?'btn-danger':'btn-success'} btn-sm" onclick="SSIUsers.toggleActive('${u.id}')">
                          ${u.active ? '⛔ Disable' : '✅ Enable'}
                        </button>`
                      : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <!-- Role Access Summary -->
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f1f5f9;">
          <h4 style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px;">🔐 Role Access Matrix</h4>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr>
                <th>Module</th>
                <th style="text-align:center;color:#dc2626;">ADMIN</th>
                <th style="text-align:center;color:#7c3aed;">SALES</th>
                <th style="text-align:center;color:#16a34a;">STOCK</th>
                <th style="text-align:center;color:#2563eb;">DISPATCH</th>
              </tr></thead>
              <tbody>
                ${[
                  ['Dashboard',         '✅ Full',   '—',           '—',           '—'],
                  ['Products',          '✅ Full',   '—',           '✅ View',      '—'],
                  ['Clients/Vendors',   '✅ Full',   '✅ View+Add', '—',           '—'],
                  ['Inventory IN/OUT',  '✅ Full',   '—',           '✅ Full',      '—'],
                  ['Sales Orders',      '✅ Full',   '✅ Own Only',  '—',           '—'],
                  ['Dispatch Queue',    '✅ Full',   '—',           '—',           '✅ Full'],
                  ['Reports',           '✅ Full',   '—',           '—',           '—'],
                  ['User Management',   '✅ Full',   '—',           '—',           '—'],
                ].map(r=>`<tr>
                  <td style="font-weight:600;">${r[0]}</td>
                  ${r.slice(1).map(v=>`<td style="text-align:center;font-size:13px;">${v}</td>`).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function openForm(id) {
    const st = SSIApp.getState();
    const u  = id ? st.users.find(x=>x.id===id) : null;

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${u?'Edit':'Add'} User</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">
          <div>
            <label>Full Name *</label>
            <input id="u-name" value="${u?.name||''}" placeholder="e.g. Raj Kumar">
          </div>
          <div>
            <label>Username *</label>
            <input id="u-username" value="${u?.username||''}" placeholder="e.g. rajkumar" ${u?'':''}
              style="text-transform:lowercase;" oninput="this.value=this.value.toLowerCase().replace(/\\s/g,'')">
          </div>
          <div>
            <label>${u?'New Password (leave blank to keep current)':'Password *'}</label>
            <input id="u-password" type="password" placeholder="${u?'Leave blank = no change':'Min 6 characters'}">
          </div>
          <div>
            <label>Role *</label>
            <select id="u-role">
              <option value="SALES"    ${u?.role==='SALES'   ?'selected':''}>🛒 Sales Person</option>
              <option value="STOCK"    ${u?.role==='STOCK'   ?'selected':''}>🏭 Stock Department</option>
              <option value="DISPATCH" ${u?.role==='DISPATCH'?'selected':''}>🚚 Dispatch Department</option>
              <option value="ADMIN"    ${u?.role==='ADMIN'   ?'selected':''}>👑 Administrator</option>
            </select>
          </div>
        </div>

        <!-- Role description -->
        <div id="u-role-desc" style="margin-top:12px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#374151;">
          <strong>SALES:</strong> Can create orders and view only their own orders with dispatch status. Cannot see other salesperson's orders.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="SSIUsers.saveUser('${id||''}')">💾 Save User</button>
      </div>`;

    SSIApp.showModal(html);

    const roleDescs = {
      SALES:    '<strong>SALES:</strong> Can create orders and view only their own orders with dispatch status.',
      STOCK:    '<strong>STOCK:</strong> Can manage inventory IN/OUT entries. Cannot see orders or dispatch.',
      DISPATCH: '<strong>DISPATCH:</strong> Can see all submitted orders and process dispatch. Cannot edit orders.',
      ADMIN:    '<strong>ADMIN:</strong> Full access to all modules including user management and reports.',
    };
    document.getElementById('u-role')?.addEventListener('change', function() {
      const desc = document.getElementById('u-role-desc');
      if (desc) desc.innerHTML = roleDescs[this.value] || '';
    });
    const initRole = u?.role || 'SALES';
    const roleDescEl = document.getElementById('u-role-desc');
    if (roleDescEl) roleDescEl.innerHTML = roleDescs[initRole] || '';
  }

  function saveUser(id) {
    const name     = document.getElementById('u-name')?.value.trim();
    const username = document.getElementById('u-username')?.value.trim().toLowerCase();
    const password = document.getElementById('u-password')?.value;
    const role     = document.getElementById('u-role')?.value;

    if (!name)     { SSIApp.toast('Full name is required', 'error'); return; }
    if (!username) { SSIApp.toast('Username is required', 'error'); return; }
    if (!id && !password) { SSIApp.toast('Password is required for new users', 'error'); return; }
    if (password && password.length < 6) { SSIApp.toast('Password must be at least 6 characters', 'error'); return; }

    const st = SSIApp.getState();

    // Check duplicate username
    const dup = st.users.find(u => u.username === username && u.id !== id);
    if (dup) { SSIApp.toast('Username already exists', 'error'); return; }

    if (id) {
      const idx = st.users.findIndex(u=>u.id===id);
      if (idx>=0) {
        const updates = { name, username, role, updated_at: new Date().toISOString() };
        if (password) updates.password = password;
        Object.assign(st.users[idx], updates);
        SSIApp.toast('User updated ✅');
      }
    } else {
      st.users.push({
        id: SSIApp.uid(), name, username, password, role,
        active: true, created_at: new Date().toISOString()
      });
      SSIApp.toast('User created ✅');
    }

    SSIApp.saveState(st);
    SSIApp.closeModal();
    SSIApp.audit('USER_SAVE', `User ${name} (${role})`);
    refresh(document.getElementById('page-area'));
  }

  async function toggleActive(id) {
    const st  = SSIApp.getState();
    const u   = st.users.find(x=>x.id===id);
    if (!u) return;
    const action = u.active ? 'Disable' : 'Enable';
    const ok = await SSIApp.confirm(`${action} user "${u.name}"?`);
    if (!ok) return;
    u.active = !u.active;
    SSIApp.saveState(st);
    SSIApp.toast(`User ${u.active?'enabled':'disabled'} ✅`);
    SSIApp.audit('USER_TOGGLE', `${u.name} ${u.active?'enabled':'disabled'}`);
    refresh(document.getElementById('page-area'));
  }

  return { render, refresh, openForm, saveUser, toggleActive };
})();
