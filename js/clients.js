/* global SSIApp */

const SSIClients = (() => {
  const render = () => {
    if (!SSIApp.requireRole(['ADMIN'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();

    // ── rows with checkboxes ──────────────────────────────────────────────────
    const rows = st.clients.map(c => `
      <tr class="border-t">
        <td class="py-2 pr-2">
          <input type="checkbox" class="client-cb w-4 h-4 accent-rose-600" data-id="${c.id}" />
        </td>
        <td class="py-2 pr-3 font-semibold">${c.name}</td>
        <td class="py-2 pr-3 text-slate-600">${c.type || 'Client'}</td>
        <td class="py-2 pr-3">${c.tel || ''}</td>
        <td class="py-2 pr-3">${c.gst || ''}</td>
        <td class="py-2 pr-3 text-slate-600">${c.assignedTo || '—'}</td>
        <td class="py-2 text-right">
          <button data-edit="${c.id}" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50 text-sm">Edit</button>
          <button data-del="${c.id}"  class="ml-2 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm">Delete</button>
        </td>
      </tr>`).join('');

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-lg font-extrabold">Clients / Vendors</div>
            <div class="text-sm text-slate-500">Name, Address, Tel No, GST No.</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnBulkDel" class="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm hidden">🗑️ Delete Selected</button>
            <button id="btnTplClient" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📥 Template Excel</button>
            <button id="btnImpClient" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📂 Import Excel</button>
            <button id="btnExpClient" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📤 Export Excel</button>
            <button id="btnAddClient" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Add</button>
          </div>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500">
              <tr>
                <th class="py-2 pr-2">
                  <input type="checkbox" id="cbSelectAll" class="w-4 h-4 accent-rose-600" title="Select All" />
                </th>
                <th class="py-2 pr-3">Name</th>
                <th class="py-2 pr-3">Type</th>
                <th class="py-2 pr-3">Tel</th>
                <th class="py-2 pr-3">GST</th>
                <th class="py-2 pr-3">Assigned To</th>
                <th class="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${st.clients.length === 0 ? `<div class="text-sm text-slate-500 py-4">No clients/vendors yet.</div>` : ''}
        </div>
      </div>
      ${modalHtml()}
      <input id="clientCsvFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" />
    `;

    SSIApp.render(SSIApp.shell(content, 'clients'));
    SSIApp.bindShellEvents();

    // ── Add button ────────────────────────────────────────────────────────────
    document.getElementById('btnAddClient').addEventListener('click', () => openModal());

    // ── Edit / Delete per-row ─────────────────────────────────────────────────
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-edit');
      openModal(st.clients.find(x => x.id === id));
    }));

    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      if (!confirm('Delete this entry?')) return;
      const st2 = SSIApp.getState();
      st2.clients = st2.clients.filter(x => x.id !== id);
      SSIApp.setState(st2);
      SSIApp.audit('DELETE', 'client', id, {});
      SSIApp.toast('Deleted', 'ok');
      render();
    }));

    // ── Select All checkbox ───────────────────────────────────────────────────
    const cbAll = document.getElementById('cbSelectAll');
    const updateBulkBtn = () => {
      const anyChecked = document.querySelectorAll('.client-cb:checked').length > 0;
      document.getElementById('btnBulkDel').classList.toggle('hidden', !anyChecked);
    };

    cbAll.addEventListener('change', () => {
      document.querySelectorAll('.client-cb').forEach(cb => { cb.checked = cbAll.checked; });
      updateBulkBtn();
    });

    document.querySelectorAll('.client-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const all = document.querySelectorAll('.client-cb');
        cbAll.checked = [...all].every(c => c.checked);
        cbAll.indeterminate = !cbAll.checked && [...all].some(c => c.checked);
        updateBulkBtn();
      });
    });

    // ── Bulk Delete button ────────────────────────────────────────────────────
    document.getElementById('btnBulkDel').addEventListener('click', () => {
      const selected = [...document.querySelectorAll('.client-cb:checked')].map(cb => cb.getAttribute('data-id'));
      if (selected.length === 0) return SSIApp.toast('No clients selected', 'warn');
      if (!confirm(`Delete ${selected.length} selected client(s)?`)) return;
      const st2 = SSIApp.getState();
      st2.clients = st2.clients.filter(x => !selected.includes(x.id));
      SSIApp.setState(st2);
      SSIApp.audit('BULK_DELETE', 'client', 'multiple', { count: selected.length });
      SSIApp.toast(`Deleted ${selected.length} client(s) ✅`, 'ok');
      render();
    });

    // ── Template Download ─────────────────────────────────────────────────────
    document.getElementById('btnTplClient').addEventListener('click', () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Name', 'Type', 'Tel', 'GST', 'Address', 'Assigned To'],
        ['Sample Client Pvt Ltd', 'Client', '9876543210', '27ABCDE1234F1ZX', '123 Main Street, City', 'Rahul Sharma'],
        ['Sample Vendor Co', 'Vendor', '9898989898', '07XYZAB5678G2ZY', '456 Market Road, Town', 'Priya Singh'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      XLSX.writeFile(wb, 'clients_template.xlsx');
    });

    // ── Export Excel ──────────────────────────────────────────────────────────
    document.getElementById('btnExpClient').addEventListener('click', () => {
      const st2 = SSIApp.getState();
      const wsData = [['Name', 'Type', 'Tel', 'GST', 'Address', 'Assigned To']];
      for (const c of st2.clients) {
        wsData.push([
          c.name || '',
          c.type || '',
          c.tel || '',
          c.gst || '',
          c.address || '',
          c.assignedTo || ''
        ]);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      XLSX.writeFile(wb, 'clients_export.xlsx');
    });

    // ── Import Excel ──────────────────────────────────────────────────────────
    document.getElementById('btnImpClient').addEventListener('click', () => {
      document.getElementById('clientCsvFile').click();
    });

    document.getElementById('clientCsvFile').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const st = SSIApp.getState();
        let added = 0;
        for (const o of objs) {
          const name = String(o['name'] || o['Name'] || '').trim();
          if (!name) continue;
          const typeRaw = String(o['type'] || o['Type'] || 'Client').trim();
          const type = ['Client', 'Vendor', 'Both'].includes(typeRaw) ? typeRaw : 'Client';

          // ── FIX: read "Assigned To" column from Excel ──────────────────────
          const assignedTo = String(
            o['Assigned To'] || o['assigned_to'] || o['AssignedTo'] ||
            o['Assigned to'] || o['ASSIGNED TO'] || o['assignedTo'] || ''
          ).trim();

          st.clients.unshift({
            id: SSIApp.uid('cli'),
            name,
            type,
            tel: String(o['tel'] || o['Tel'] || o['TEL'] || '').trim(),
            gst: String(o['gst'] || o['GST'] || o['Gst'] || '').trim(),
            address: String(o['address'] || o['Address'] || o['ADDRESS'] || '').trim(),
            assignedTo,                       // ← was missing before
            created_at: SSIApp.nowISO()
          });
          added++;
        }
        SSIApp.setState(st);
        SSIApp.toast('Imported ' + added + ' clients ✅', 'ok');
        render();
      } catch (err) {
        console.error(err);
        SSIApp.toast('Import failed. Check Excel format.', 'err');
      } finally {
        e.target.value = '';
      }
    });

    bindModalEvents();
  };

  // ── Modal HTML ──────────────────────────────────────────────────────────────
  const modalHtml = () => `
  <div id="clientModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
    <div class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
      <div class="flex items-center justify-between">
        <div class="text-lg font-extrabold" id="clientModalTitle">Add</div>
        <button id="clientModalClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
      </div>

      <input type="hidden" id="cId" />

      <div class="grid grid-cols-2 gap-3 mt-4">
        <div class="col-span-2">
          <label class="text-sm font-semibold">Name</label>
          <input id="cName" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Client/Vendor name" />
        </div>
        <div>
          <label class="text-sm font-semibold">Type</label>
          <select id="cType" class="mt-1 w-full px-3 py-2 rounded-xl border">
            <option>Client</option>
            <option>Vendor</option>
            <option>Both</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold">Tel No</label>
          <input id="cTel" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Phone" />
        </div>
        <div>
          <label class="text-sm font-semibold">GST No</label>
          <input id="cGST" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="GST" />
        </div>
        <div>
          <label class="text-sm font-semibold">Assigned To</label>
          <input id="cAssignedTo" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Employee / Sales person name" />
        </div>
        <div class="col-span-2">
          <label class="text-sm font-semibold">Address</label>
          <textarea id="cAddr" class="mt-1 w-full px-3 py-2 rounded-xl border" rows="3" placeholder="Address"></textarea>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button id="clientModalSave" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Save</button>
      </div>
    </div>
  </div>`;

  // ── Open Modal ──────────────────────────────────────────────────────────────
  const openModal = (c = null) => {
    document.getElementById('clientModal').classList.remove('hidden');
    document.getElementById('clientModal').classList.add('flex');

    document.getElementById('cId').value         = c?.id         || '';
    document.getElementById('cName').value       = c?.name       || '';
    document.getElementById('cType').value       = c?.type       || 'Client';
    document.getElementById('cTel').value        = c?.tel        || '';
    document.getElementById('cGST').value        = c?.gst        || '';
    document.getElementById('cAssignedTo').value = c?.assignedTo || '';
    document.getElementById('cAddr').value       = c?.address    || '';

    document.getElementById('clientModalTitle').textContent = c ? 'Edit' : 'Add';
  };

  const closeModal = () => {
    document.getElementById('clientModal').classList.add('hidden');
    document.getElementById('clientModal').classList.remove('flex');
  };

  // ── Modal Events ────────────────────────────────────────────────────────────
  const bindModalEvents = () => {
    document.getElementById('clientModalClose').onclick = closeModal;
    document.getElementById('clientModal').addEventListener('click', (e) => {
      if (e.target.id === 'clientModal') closeModal();
    });

    document.getElementById('clientModalSave').onclick = () => {
      const st = SSIApp.getState();
      const id = document.getElementById('cId').value.trim();
      const payload = {
        id:         id || SSIApp.uid('client'),
        name:       document.getElementById('cName').value.trim(),
        type:       document.getElementById('cType').value,
        tel:        document.getElementById('cTel').value.trim(),
        gst:        document.getElementById('cGST').value.trim(),
        assignedTo: document.getElementById('cAssignedTo').value.trim(),
        address:    document.getElementById('cAddr').value.trim(),
        created_at: SSIApp.nowISO()
      };
      if (!payload.name) return SSIApp.toast('Name required', 'warn');

      const idx = st.clients.findIndex(x => x.id === payload.id);
      if (idx >= 0) st.clients[idx] = { ...st.clients[idx], ...payload };
      else st.clients.unshift(payload);

      SSIApp.setState(st);
      SSIApp.audit(idx >= 0 ? 'UPDATE' : 'CREATE', 'client', payload.id, { name: payload.name });
      SSIApp.toast('Saved', 'ok');
      closeModal();
      render();
    };
  };

  return { render };
})();
