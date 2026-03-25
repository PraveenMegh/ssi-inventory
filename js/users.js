/* global SSIApp, SSIAuth */

const SSIUsers = (() => {
  const render = () => {
    if (!SSIApp.requireRole(['ADMIN'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();

    const rows = st.users.map(u => `
      <tr class="border-t">
        <td class="py-2 pr-3 font-semibold">${u.username}</td>
        <td class="py-2 pr-3">${u.name || ''}</td>
        <td class="py-2 pr-3"><span class="chip ${u.role==='ADMIN'?'chip-urgent':'chip-ok'}">${u.role}</span></td>
        <td class="py-2 pr-3">${u.active ? 'Active' : 'Disabled'}</td>
        <td class="py-2 text-right">
          <button data-edit="${u.id}" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Edit</button>
          <button data-del="${u.id}" class="ml-2 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50">Delete</button>
        </td>
      </tr>`).join('');

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold">Users</div>
            <div class="text-sm text-slate-500">Admin can add/edit/delete users.</div>
          </div>
          <button id="btnAddUser" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Add User</button>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500">
              <tr>
                <th class="py-2 pr-3">Username</th>
                <th class="py-2 pr-3">Name</th>
                <th class="py-2 pr-3">Role</th>
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      ${modalHtml()}
    `;

    SSIApp.render(SSIApp.shell(content, 'users'));
    SSIApp.bindShellEvents();

    document.getElementById('btnAddUser').addEventListener('click', () => openModal());

    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-edit');
      openModal(st.users.find(x=>x.id===id));
    }));

    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      if (!confirm('Delete this user?')) return;
      const me = SSIAuth.currentUser();
      if (me && me.id === id) return SSIApp.toast('Cannot delete current logged-in user', 'warn');

      const st2 = SSIApp.getState();
      st2.users = st2.users.filter(x=>x.id!==id);
      SSIApp.setState(st2);
      SSIApp.audit('DELETE','user',id,{});
      SSIApp.toast('User deleted','ok');
      render();
    }));

    bindModalEvents();
  };

  const modalHtml = () => `
  <div id="userModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
    <div class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
      <div class="flex items-center justify-between">
        <div class="text-lg font-extrabold" id="userModalTitle">Add User</div>
        <button id="userModalClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
        <input type="hidden" id="uId" />
        <div class="col-span-2">
          <label class="font-semibold">Name</label>
          <input id="uName" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Full name" />
        </div>
        <div>
          <label class="font-semibold">Username</label>
          <input id="uUsername" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="sales1" />
        </div>
        <div>
          <label class="font-semibold">Password</label>
          <input id="uPassword" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Set password" />
        </div>
        <div>
          <label class="font-semibold">Role</label>
          <select id="uRole" class="mt-1 w-full px-3 py-2 rounded-xl border">
            <option value="ADMIN">ADMIN</option>
            <option value="STOCK">STOCK</option>
            <option value="DISPATCH">DISPATCH</option>
            <option value="SALES">SALES</option>
          </select>
        </div>
        <div>
          <label class="font-semibold">Active</label>
          <select id="uActive" class="mt-1 w-full px-3 py-2 rounded-xl border">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button id="userModalSave" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Save</button>
      </div>
    </div>
  </div>`;

  const openModal = (u=null) => {
    document.getElementById('userModal').classList.remove('hidden');
    document.getElementById('userModal').classList.add('flex');

    document.getElementById('uId').value = u?.id || '';
    document.getElementById('uName').value = u?.name || '';
    document.getElementById('uUsername').value = u?.username || '';
    document.getElementById('uPassword').value = u?.password || '';
    document.getElementById('uRole').value = u?.role || 'SALES';
    document.getElementById('uActive').value = String(u?.active ?? true);

    document.getElementById('userModalTitle').textContent = u ? 'Edit User' : 'Add User';
  };

  const closeModal = () => {
    document.getElementById('userModal').classList.add('hidden');
    document.getElementById('userModal').classList.remove('flex');
  };

  const bindModalEvents = () => {
    document.getElementById('userModalClose').onclick = closeModal;
    document.getElementById('userModal').addEventListener('click', (e)=>{
      if (e.target.id==='userModal') closeModal();
    });
    document.getElementById('userModalSave').onclick = () => {
      const st = SSIApp.getState();
      const id = document.getElementById('uId').value.trim();
      const payload = {
        id: id || SSIApp.uid('user'),
        name: document.getElementById('uName').value.trim(),
        username: document.getElementById('uUsername').value.trim(),
        password: document.getElementById('uPassword').value,
        role: document.getElementById('uRole').value,
        active: document.getElementById('uActive').value === 'true',
        created_at: SSIApp.nowISO()
      };

      if (!payload.username || !payload.password) return SSIApp.toast('Username and password required','warn');

      const dup = st.users.find(u => u.username===payload.username && u.id!==payload.id);
      if (dup) return SSIApp.toast('Username already exists','err');

      const idx = st.users.findIndex(u=>u.id===payload.id);
      if (idx>=0) st.users[idx] = { ...st.users[idx], ...payload };
      else st.users.unshift(payload);

      SSIApp.setState(st);
      SSIApp.audit(idx>=0?'UPDATE':'CREATE','user',payload.id,{ username: payload.username, role: payload.role });
      SSIApp.toast('Saved','ok');
      closeModal();
      render();
    };
  };

  return { render };
})();
