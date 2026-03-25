/* global SSIApp */

const SSIUnits = (() => {
  const render = () => {
    if (!SSIApp.requireRole(['ADMIN'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();

    const rows = st.units.map(u => `
      <tr class="border-t">
        <td class="py-2 pr-3 font-semibold">${u.name}</td>
        <td class="py-2 pr-3 text-slate-600">${u.code || ''}</td>
        <td class="py-2 text-right">
          <button data-edit="${u.id}" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Edit</button>
          <button data-del="${u.id}" class="ml-2 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50">Delete</button>
        </td>
      </tr>`).join('');

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold">Units</div>
            <div class="text-sm text-slate-500">Manage Unit 1 Modinagar and Unit 2 Patla.</div>
          </div>
          <button id="btnAddUnit" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Add Unit</button>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500">
              <tr>
                <th class="py-2 pr-3">Name</th>
                <th class="py-2 pr-3">Code</th>
                <th class="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      ${modalHtml()}
    `;

    SSIApp.render(SSIApp.shell(content, 'units'));
    SSIApp.bindShellEvents();

    document.getElementById('btnAddUnit').addEventListener('click', ()=>openModal());

    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-edit');
      openModal(st.units.find(x=>x.id===id));
    }));

    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      if (!confirm('Delete this unit?')) return;
      const st2 = SSIApp.getState();
      st2.units = st2.units.filter(x=>x.id!==id);
      SSIApp.setState(st2);
      SSIApp.audit('DELETE','unit',id,{});
      SSIApp.toast('Unit deleted','ok');
      render();
    }));

    bindModalEvents();
  };

  const modalHtml = () => `
  <div id="unitModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
    <div class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
      <div class="flex items-center justify-between">
        <div class="text-lg font-extrabold" id="unitModalTitle">Add Unit</div>
        <button id="unitModalClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
        <input type="hidden" id="unId" />
        <div class="col-span-2">
          <label class="font-semibold">Unit Name</label>
          <input id="unName" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Unit 1 Modinagar" />
        </div>
        <div>
          <label class="font-semibold">Code</label>
          <input id="unCode" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="MODI" />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button id="unitModalSave" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Save</button>
      </div>
    </div>
  </div>`;

  const openModal = (u=null) => {
    document.getElementById('unitModal').classList.remove('hidden');
    document.getElementById('unitModal').classList.add('flex');

    document.getElementById('unId').value = u?.id || '';
    document.getElementById('unName').value = u?.name || '';
    document.getElementById('unCode').value = u?.code || '';
    document.getElementById('unitModalTitle').textContent = u ? 'Edit Unit' : 'Add Unit';
  };

  const closeModal = () => {
    document.getElementById('unitModal').classList.add('hidden');
    document.getElementById('unitModal').classList.remove('flex');
  };

  const bindModalEvents = () => {
    document.getElementById('unitModalClose').onclick = closeModal;
    document.getElementById('unitModal').addEventListener('click', (e)=>{
      if (e.target.id==='unitModal') closeModal();
    });

    document.getElementById('unitModalSave').onclick = () => {
      const st = SSIApp.getState();
      const id = document.getElementById('unId').value.trim();
      const payload = {
        id: id || SSIApp.uid('unit'),
        name: document.getElementById('unName').value.trim(),
        code: document.getElementById('unCode').value.trim(),
        created_at: SSIApp.nowISO()
      };
      if (!payload.name) return SSIApp.toast('Unit name required','warn');

      const idx = st.units.findIndex(x=>x.id===payload.id);
      if (idx>=0) st.units[idx] = { ...st.units[idx], ...payload };
      else st.units.unshift(payload);

      SSIApp.setState(st);
      SSIApp.audit(idx>=0?'UPDATE':'CREATE','unit',payload.id,{ name: payload.name });
      SSIApp.toast('Saved','ok');
      closeModal();
      render();
    };
  };

  return { render };
})();
