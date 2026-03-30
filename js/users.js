// ============================================================
//  SSI Inventory — User Management Module
//  users.js  |  ADMIN access only
// ============================================================
//  User schema: { id, username, password, name, role, active }
//  Roles: ADMIN | STOCK | DISPATCH | SALES | ACCOUNTANT
// ============================================================

const SSIUsers = (() => {

  const ROLES = ['ADMIN', 'STOCK', 'DISPATCH', 'SALES', 'ACCOUNTANT'];

  const ROLE_COLORS = {
    ADMIN:      { bg:'#fef3c7', color:'#92400e' },
    STOCK:      { bg:'#dbeafe', color:'#1e40af' },
    DISPATCH:   { bg:'#d1fae5', color:'#065f46' },
    SALES:      { bg:'#ede9fe', color:'#5b21b6' },
    ACCOUNTANT: { bg:'#fce7f3', color:'#9d174d' },
  };

  function roleBadge(role) {
    const c = ROLE_COLORS[role] || { bg:'#f1f5f9', color:'#475569' };
    return `<span style="background:${c.bg};color:${c.color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${role}</span>`;
  }

  /* ── Render main users page ────────────────────────────── */
  function render(area) {
    if (!SSIApp.hasRole('ADMIN')) {
      area.innerHTML = `<div class="card" style="text-align:center;padding:3rem;">
        <div style="font-size:3rem;">🔒</div>
        <h3>Access Denied</h3>
        <p style="color:#64748b;">Only Administrators can manage users.</p>
      </div>`;
      return;
    }
    area.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
        <div>
          <h2 style="margin:0;font-size:1.25rem;font-weight:700;">👤 User Management</h2>
          <p style="margin:.25rem 0 0;font-size:.82rem;color:#64748b;">Manage login accounts and access roles</p>
        </div>
        <button class="btn btn-primary" onclick="SSIUsers.openForm()">+ Add User</button>
      </div>

      <div class="card" style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;">#</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;">Name</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;">Username</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;">Role</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#475569;">Status</th>
              <th style="padding:10px 14px;text-align:right;font-weight:600;color:#475569;">Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${buildRows()}
          </tbody>
        </table>
      </div>`;
  }

  function buildRows() {
    const st    = SSIApp.getState();
    const users = st.users || [];
    if (!users.length) return `<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">No users found.</td></tr>`;

    const currentUser = SSIApp.state.currentUser;

    return users.map((u, idx) => {
      const isActive  = u.active !== false;
      const isSelf    = currentUser && currentUser.username === u.username;
      const statusBadge = isActive
        ? `<span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">✅ Active</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">🔴 Inactive</span>`;

      return `<tr style="border-bottom:1px solid #f1f5f9;${isSelf ? 'background:#fefce8;' : ''}">
        <td style="padding:10px 14px;color:#94a3b8;font-size:12px;">${idx + 1}${isSelf ? ' <span title="You" style="color:#d97706;">★</span>' : ''}</td>
        <td style="padding:10px 14px;font-weight:600;">${u.name}</td>
        <td style="padding:10px 14px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;">${u.username}</code></td>
        <td style="padding:10px 14px;">${roleBadge(u.role)}</td>
        <td style="padding:10px 14px;">${statusBadge}</td>
        <td style="padding:10px 14px;text-align:right;white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIUsers.openForm('${u.id}')" title="Edit user">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="SSIUsers.toggleActive('${u.id}')"
            title="${isActive ? 'Disable user' : 'Enable user'}"
            ${isSelf ? 'disabled title="Cannot disable your own account"' : ''}>
            ${isActive ? '🔴 Disable' : '🟢 Enable'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="SSIUsers.deleteUser('${u.id}')"
            title="Delete user"
            ${isSelf ? 'disabled title="Cannot delete your own account"' : ''}>
            🗑️
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function refresh() {
    const tbody = document.getElementById('users-tbody');
    if (tbody) tbody.innerHTML = buildRows();
  }

  /* ── Add / Edit form modal ────────────────────────────── */
  function openForm(userId) {
    const st   = SSIApp.getState();
    const user = userId ? (st.users || []).find(u => u.id === userId) : null;
    const isEdit = !!user;

    const overlay = document.createElement('div');
    overlay.id    = 'user-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:1rem;padding:1.75rem;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <h3 style="font-size:1.1rem;font-weight:700;margin:0;">${isEdit ? '✏️ Edit' : '➕ Add'} User</h3>
          <button onclick="document.getElementById('user-modal-overlay').remove()"
            style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:#64748b;line-height:1;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:.9rem;">
          <div>
            <label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.3rem;">Full Name *</label>
            <input id="usr-name" class="form-input" type="text" value="${user?.name || ''}" placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.3rem;">Username *</label>
            <input id="usr-username" class="form-input" type="text" value="${user?.username || ''}" placeholder="e.g. rahul" autocomplete="off" />
          </div>
          <div>
            <label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.3rem;">${isEdit ? 'New Password <span style="color:#94a3b8;font-weight:400;">(leave blank to keep current)</span>' : 'Password *'}</label>
            <input id="usr-password" class="form-input" type="password" value="" placeholder="${isEdit ? 'Leave blank to keep current' : 'Enter password'}" autocomplete="new-password" />
          </div>
          <div>
            <label style="display:block;font-size:.82rem;font-weight:600;color:#374151;margin-bottom:.3rem;">Role *</label>
            <select id="usr-role" class="form-input">
              ${ROLES.map(r => `<option value="${r}" ${(user?.role || 'SALES') === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <input type="checkbox" id="usr-active" ${(user?.active !== false) ? 'checked' : ''} style="width:auto;cursor:pointer;" />
            <label for="usr-active" style="font-size:.85rem;font-weight:500;cursor:pointer;">Account Active</label>
          </div>
        </div>

        <div id="usr-err" style="display:none;margin-top:.75rem;padding:.5rem .75rem;background:#fee2e2;color:#991b1b;border-radius:.5rem;font-size:.82rem;"></div>

        <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.5rem;">
          <button class="btn btn-secondary" onclick="document.getElementById('user-modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="SSIUsers.saveUser('${userId || ''}')">💾 Save User</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('usr-name').focus();
  }

  /* ── Save user (create or update) ────────────────────── */
  function saveUser(userId) {
    const name     = (document.getElementById('usr-name')?.value     || '').trim();
    const username = (document.getElementById('usr-username')?.value || '').trim().toLowerCase();
    const password = (document.getElementById('usr-password')?.value || '').trim();
    const role     = document.getElementById('usr-role')?.value || 'SALES';
    const active   = document.getElementById('usr-active')?.checked !== false;
    const errEl    = document.getElementById('usr-err');

    function showErr(msg) {
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    }

    if (!name)     { showErr('Full Name is required.'); return; }
    if (!username) { showErr('Username is required.'); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { showErr('Username may only contain lowercase letters, numbers, and underscores.'); return; }

    const st    = SSIApp.getState();
    const users = st.users || [];
    const isEdit = !!userId;

    // Check duplicate username
    const dup = users.find(u => u.username === username && u.id !== userId);
    if (dup) { showErr(`Username "${username}" is already taken.`); return; }

    if (!isEdit && !password) { showErr('Password is required for new users.'); return; }

    if (isEdit) {
      const user = users.find(u => u.id === userId);
      if (!user) { showErr('User not found.'); return; }
      user.name     = name;
      user.username = username;
      user.role     = role;
      user.active   = active;
      if (password) user.password = password;   // Only update if new password provided
      SSIApp.saveState(st);
      SSIApp.toast('✅ User updated');
      SSIApp.audit('USER_EDIT', `Updated user: ${username} (${role})`);
    } else {
      // New user
      const newUser = {
        id:       'u_' + Date.now(),
        name,
        username,
        password,
        role,
        active,
      };
      st.users = [...users, newUser];
      SSIApp.saveState(st);
      SSIApp.toast('✅ User created');
      SSIApp.audit('USER_CREATE', `Created user: ${username} (${role})`);
    }

    document.getElementById('user-modal-overlay')?.remove();
    refresh();
  }

  /* ── Toggle active/inactive ───────────────────────────── */
  function toggleActive(userId) {
    const currentUser = SSIApp.state.currentUser;
    const st    = SSIApp.getState();
    const user  = (st.users || []).find(u => u.id === userId);
    if (!user) return;

    // Cannot disable self
    if (currentUser && currentUser.username === user.username) {
      SSIApp.toast('⚠️ You cannot disable your own account', 'warning');
      return;
    }

    user.active = !user.active;
    SSIApp.saveState(st);
    const action = user.active ? '🟢 Enabled' : '🔴 Disabled';
    SSIApp.toast(`${action}: ${user.name}`);
    SSIApp.audit('USER_TOGGLE', `${action} user: ${user.username}`);
    refresh();
  }

  /* ── Delete user ─────────────────────────────────────── */
  async function deleteUser(userId) {
    const currentUser = SSIApp.state.currentUser;
    const st   = SSIApp.getState();
    const user = (st.users || []).find(u => u.id === userId);
    if (!user) return;

    // Cannot delete self
    if (currentUser && currentUser.username === user.username) {
      SSIApp.toast('⚠️ You cannot delete your own account', 'warning');
      return;
    }

    // Prevent deleting the only ADMIN
    const adminCount = (st.users || []).filter(u => u.role === 'ADMIN' && u.active !== false).length;
    if (user.role === 'ADMIN' && adminCount <= 1) {
      SSIApp.toast('⚠️ Cannot delete the only active Admin account', 'warning');
      return;
    }

    const ok = await SSIApp.confirm(
      `Permanently delete user "${user.name}" (${user.username})?\n\nRole: ${user.role}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    st.users = (st.users || []).filter(u => u.id !== userId);
    SSIApp.saveState(st);
    SSIApp.toast('🗑️ User deleted');
    SSIApp.audit('USER_DELETE', `Deleted user: ${user.username} (${user.role})`);
    refresh();
  }

  return { render, refresh, openForm, saveUser, toggleActive, deleteUser };

})();
