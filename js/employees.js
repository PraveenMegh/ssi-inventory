/* ============================================================
   SSI Employees Module  — Employee Master
   employees.js
   Access: ADMIN (full), ACCOUNTANT (limited – no staff salary)
   ============================================================ */
const SSIEmployees = (() => {

  const EMP_TYPES = [
    { value:'STAFF',  label:'👔 Staff'  },
    { value:'WORKER', label:'👷 Worker' },
  ];

  /* ── render ─────────────────────────────────────────────── */
  function render(area) {
    if (!SSIApp.hasRole('ADMIN','ACCOUNTANT')) {
      area.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>';
      return;
    }
    refresh(area);
  }

  function refresh(area) {
    const st   = SSIApp.getState();
    const emps = (st.employees || []);
    const isAdmin = SSIApp.hasRole('ADMIN');

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">👥 Employee Master</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIEmployees.downloadTemplate()">⬇️ Template</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            📥 Import Excel/CSV
            <input type="file" accept=".xlsx,.xls,.csv" style="display:none;" onchange="SSIEmployees.importFile(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="SSIEmployees.exportExcel()">📤 Export</button>
          ${isAdmin ? `<button class="btn btn-primary" onclick="SSIEmployees.openForm()">+ Add Employee</button>` : ''}
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:16px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
          <div>
            <label>Filter by Type</label>
            <select id="emp-filter-type" onchange="SSIEmployees.applyFilter()">
              <option value="">All Types</option>
              ${EMP_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Filter by Unit</label>
            <select id="emp-filter-unit" onchange="SSIEmployees.applyFilter()">
              <option value="">All Units</option>
              ${(st.units||[]).filter(u=>u.active).map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Search Name / Code</label>
            <input type="text" id="emp-filter-search" placeholder="Search…" oninput="SSIEmployees.applyFilter()">
          </div>
          <div>
            <label>Status</label>
            <select id="emp-filter-status" onchange="SSIEmployees.applyFilter()">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card" style="overflow-x:auto;">
        <table id="emp-table">
          <thead><tr>
            <th>Code</th><th>Name</th><th>Type</th><th>Department</th>
            <th>Designation</th><th>Unit</th><th>Join Date</th><th>Phone</th>
            ${isAdmin ? '<th style="text-align:right;">Monthly Salary</th>' : ''}
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody id="emp-tbody">${buildRows(emps, st, isAdmin)}</tbody>
        </table>
        <div style="padding:8px 16px;font-size:13px;color:#64748b;">Total: <b id="emp-count">${emps.filter(e=>e.active!==false).length}</b> active employees</div>
      </div>`;
  }

  function buildRows(emps, st, isAdmin) {
    const typeFilter   = document.getElementById('emp-filter-type')?.value   || '';
    const unitFilter   = document.getElementById('emp-filter-unit')?.value   || '';
    const search       = (document.getElementById('emp-filter-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('emp-filter-status')?.value || '';

    let list = emps.filter(e => {
      if (typeFilter   && e.type    !== typeFilter)   return false;
      if (unitFilter   && e.unit_id !== unitFilter)   return false;
      if (statusFilter === 'active'   && e.active === false) return false;
      if (statusFilter === 'inactive' && e.active !== false) return false;
      if (search && !`${e.emp_code} ${e.name}`.toLowerCase().includes(search)) return false;
      return true;
    });

    if (!list.length) return `<tr><td colspan="${isAdmin?11:10}" style="text-align:center;padding:40px;color:#94a3b8;">No employees found.</td></tr>`;

    return list.map(e => {
      const unit = (st.units||[]).find(u=>u.id===e.unit_id);
      const active = e.active !== false;
      return `<tr>
        <td><code style="font-size:12px;">${e.emp_code||'—'}</code></td>
        <td><b>${e.name}</b></td>
        <td><span class="badge" style="background:${e.type==='STAFF'?'#dbeafe':'#dcfce7'};color:${e.type==='STAFF'?'#1e40af':'#166534'};">${e.type==='STAFF'?'👔 Staff':'👷 Worker'}</span></td>
        <td>${e.department||'—'}</td>
        <td>${e.designation||'—'}</td>
        <td>${unit?.name||'—'}</td>
        <td>${e.join_date||'—'}</td>
        <td>${e.phone||'—'}</td>
        ${isAdmin ? `<td style="text-align:right;font-weight:600;">₹${(e.monthly_salary||0).toLocaleString('en-IN')}</td>` : ''}
        <td><span style="background:${active?'#dcfce7':'#fee2e2'};color:${active?'#166534':'#991b1b'};padding:2px 8px;border-radius:12px;font-size:12px;">${active?'Active':'Inactive'}</span></td>
        <td>
          ${SSIApp.hasRole('ADMIN') ? `
            <button class="btn btn-secondary btn-sm" onclick="SSIEmployees.openForm('${e.id}')" title="Edit">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="SSIEmployees.toggleActive('${e.id}')" title="${active?'Deactivate':'Activate'}">${active?'🔴':'🟢'}</button>
            <button class="btn btn-danger btn-sm" onclick="SSIEmployees.deleteEmployee('${e.id}')" title="Delete employee">🗑️</button>
          ` : ''}
        </td>
      </tr>`;
    }).join('');
  }

  function applyFilter() {
    const st = SSIApp.getState();
    const isAdmin = SSIApp.hasRole('ADMIN');
    const tbody = document.getElementById('emp-tbody');
    if (!tbody) return;
    tbody.innerHTML = buildRows(st.employees||[], st, isAdmin);
    const count = document.getElementById('emp-count');
    if (count) count.textContent = (st.employees||[]).filter(e=>e.active!==false).length;
  }

  /* ── Add / Edit form modal ────────────────────────────────── */
  function openForm(empId) {
    if (!SSIApp.hasRole('ADMIN')) return;
    const st  = SSIApp.getState();
    const emp = empId ? (st.employees||[]).find(e=>e.id===empId) : null;

    const html = `
      <div id="emp-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;overflow-y:auto;">
        <div style="background:#fff;border-radius:.75rem;padding:1.5rem;width:100%;max-width:620px;max-height:90vh;overflow-y:auto;">
          <h3 style="font-size:18px;font-weight:700;margin-bottom:16px;">${emp?'Edit':'New'} Employee</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label>Employee Code *</label>
              <input id="ef-code" value="${emp?.emp_code||''}" placeholder="EMP-001">
            </div>
            <div>
              <label>Full Name *</label>
              <input id="ef-name" value="${emp?.name||''}" placeholder="Full name">
            </div>
            <div>
              <label>Type *</label>
              <select id="ef-type">
                ${EMP_TYPES.map(t=>`<option value="${t.value}" ${emp?.type===t.value?'selected':''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Unit *</label>
              <select id="ef-unit">
                <option value="">Select Unit</option>
                ${(st.units||[]).filter(u=>u.active).map(u=>`<option value="${u.id}" ${emp?.unit_id===u.id?'selected':''}>${u.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Department</label>
              <input id="ef-dept" value="${emp?.department||''}" placeholder="Production / Admin…">
            </div>
            <div>
              <label>Designation</label>
              <input id="ef-desig" value="${emp?.designation||''}" placeholder="Supervisor / Operator…">
            </div>
            <div>
              <label>Join Date</label>
              <input type="date" id="ef-join" value="${emp?.join_date||''}">
            </div>
            <div>
              <label>Phone</label>
              <input id="ef-phone" value="${emp?.phone||''}" placeholder="Mobile number">
            </div>
            <div>
              <label>Father / Husband / Wife Name</label>
              <input id="ef-relation" value="${emp?.relation_name||''}" placeholder="Relation's full name">
            </div>
            <div>
              <label>Monthly Salary (₹) *</label>
              <input type="number" id="ef-salary" value="${emp?.monthly_salary||''}" placeholder="e.g. 15000" min="0">
            </div>
            <div>
              <label>Bank Account No.</label>
              <input id="ef-bank-ac" value="${emp?.bank_ac||''}" placeholder="Account number">
            </div>
            <div>
              <label>Bank IFSC</label>
              <input id="ef-bank-ifsc" value="${emp?.bank_ifsc||''}" placeholder="IFSC code">
            </div>
            <div>
              <label>Bank Name</label>
              <input id="ef-bank-name" value="${emp?.bank_name||''}" placeholder="Bank name">
            </div>
          </div>
          <div style="margin-top:12px;">
            <label>Notes / Remarks</label>
            <textarea id="ef-notes" rows="2" style="width:100%;" placeholder="Any notes…">${emp?.notes||''}</textarea>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
            <button class="btn btn-secondary" onclick="document.getElementById('emp-modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="SSIEmployees.saveEmployee('${empId||''}')">💾 Save</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  async function saveEmployee(empId) {
    const code   = document.getElementById('ef-code')?.value.trim();
    const name   = document.getElementById('ef-name')?.value.trim();
    const type   = document.getElementById('ef-type')?.value;
    const unitId = document.getElementById('ef-unit')?.value;
    const salary = parseFloat(document.getElementById('ef-salary')?.value) || 0;

    if (!code || !name || !type || !unitId || !salary) {
      SSIApp.toast('Fill all required fields (Code, Name, Type, Unit, Salary)'); return;
    }

    const st = SSIApp.getState();
    if (!st.employees) st.employees = [];

    // Duplicate code check
    const dupCode = st.employees.find(e => e.emp_code === code && e.id !== empId);
    if (dupCode) { SSIApp.toast(`Employee code "${code}" already exists!`); return; }

    const entry = {
      id:             empId || SSIApp.uid(),
      emp_code:       code,
      name,
      type,
      unit_id:        unitId,
      department:     document.getElementById('ef-dept')?.value.trim()||'',
      designation:    document.getElementById('ef-desig')?.value.trim()||'',
      join_date:      document.getElementById('ef-join')?.value||'',
      phone:          document.getElementById('ef-phone')?.value.trim()||'',
      relation_name:  document.getElementById('ef-relation')?.value.trim()||'',
      monthly_salary: salary,
      bank_ac:        document.getElementById('ef-bank-ac')?.value.trim()||'',
      bank_ifsc:      document.getElementById('ef-bank-ifsc')?.value.trim()||'',
      bank_name:      document.getElementById('ef-bank-name')?.value.trim()||'',
      notes:          document.getElementById('ef-notes')?.value.trim()||'',
      active:         true,
      updated_at:     new Date().toISOString(),
    };

    if (!empId) {
      entry.created_by = SSIApp.state.currentUser?.id||'';
      entry.created_at = entry.updated_at;
      st.employees.push(entry);
    } else {
      const idx = st.employees.findIndex(e=>e.id===empId);
      if (idx>=0) st.employees[idx] = { ...st.employees[idx], ...entry };
    }

    await SSIApp.saveState(st);
    SSIApp.audit('EMPLOYEE_SAVE', `${empId?'Updated':'Added'} employee ${name} (${code})`);
    SSIApp.toast(`✅ Employee ${name} saved`);
    document.getElementById('emp-modal-overlay')?.remove();
    refresh(document.getElementById('page-area'));
  }

  async function toggleActive(empId) {
    if (!SSIApp.hasRole('ADMIN')) return;
    const st  = SSIApp.getState();
    const idx = (st.employees||[]).findIndex(e=>e.id===empId);
    if (idx < 0) return;
    st.employees[idx].active = !st.employees[idx].active;
    await SSIApp.saveState(st);
    SSIApp.toast(`Employee ${st.employees[idx].active ? 'activated' : 'deactivated'}`);
    refresh(document.getElementById('page-area'));
  }

  /* ── Template download ───────────────────────────────────── */
  function downloadTemplate() {
    const rows = [
      ['emp_code','name','type','unit_name','department','designation','join_date','phone','relation_name','monthly_salary','bank_ac','bank_ifsc','bank_name','notes'],
      ['EMP-001','Ramesh Kumar','WORKER','Modinagar','Production','Machine Operator','2024-01-01','9876543210','Ram Kumar (Father)','12000','','','',''],
      ['EMP-002','Suresh Sharma','STAFF','Modinagar','Admin','Supervisor','2024-01-01','9876543211','Geeta Sharma (Wife)','25000','123456789','SBIN0001234','SBI',''],
    ];
    SSIApp.excelDownload(rows, 'Employees_Template', 'SSI_Employee_Import_Template');
  }

  /* ── Import Excel / CSV ───────────────────────────────────── */
  async function importFile(input) {
    if (!input.files.length) return;
    const file = input.files[0];
    const name = file.name.toLowerCase();
    try {
      let rows = [];
      if (name.endsWith('.csv')) {
        const text = await file.text();
        rows = text.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g,'')));
      } else {
        if (typeof XLSX === 'undefined') { SSIApp.toast('Excel library not loaded!'); return; }
        const ab   = await file.arrayBuffer();
        const wb   = XLSX.read(ab, { type:'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        rows       = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      }

      if (rows.length < 2) { SSIApp.toast('No data rows found'); return; }

      const header = rows[0].map(h => String(h).toLowerCase().trim());
      const idx = {
        code:    header.indexOf('emp_code'),
        name:    header.indexOf('name'),
        type:    header.indexOf('type'),
        unit:    header.indexOf('unit_name'),
        dept:    header.indexOf('department'),
        desig:   header.indexOf('designation'),
        join:    header.indexOf('join_date'),
        phone:    header.indexOf('phone'),
        relation: header.indexOf('relation_name'),
        salary:  header.indexOf('monthly_salary'),
        bankAc:  header.indexOf('bank_ac'),
        bankIfsc:header.indexOf('bank_ifsc'),
        bankName:header.indexOf('bank_name'),
        notes:   header.indexOf('notes'),
      };

      if (idx.code<0 || idx.name<0 || idx.salary<0) {
        SSIApp.toast('Template columns missing: emp_code, name, monthly_salary'); return;
      }

      const st = SSIApp.getState();
      if (!st.employees) st.employees = [];
      let added=0, skipped=0;

      for (let i=1; i<rows.length; i++) {
        const r = rows[i];
        if (!r[idx.code] && !r[idx.name]) continue;
        const code = String(r[idx.code]||'').trim();
        const empName = String(r[idx.name]||'').trim();
        if (!code || !empName) { skipped++; continue; }

        // Resolve unit by name
        const unitName = String(r[idx.unit]||'').trim().toLowerCase();
        const unit = (st.units||[]).find(u => u.name.toLowerCase()===unitName);

        const type = String(r[idx.type]||'WORKER').toUpperCase().includes('STAFF') ? 'STAFF' : 'WORKER';

        const existing = st.employees.findIndex(e => e.emp_code===code);
        const entry = {
          id:             existing>=0 ? st.employees[existing].id : SSIApp.uid(),
          emp_code:       code,
          name:           empName,
          type,
          unit_id:        unit?.id || '',
          department:     String(r[idx.dept]||'').trim(),
          designation:    String(r[idx.desig]||'').trim(),
          join_date:      String(r[idx.join]||'').trim(),
          phone:          String(r[idx.phone]||'').trim(),
          relation_name:  idx.relation>=0 ? String(r[idx.relation]||'').trim() : '',
          monthly_salary: parseFloat(r[idx.salary])||0,
          bank_ac:        String(r[idx.bankAc]||'').trim(),
          bank_ifsc:      String(r[idx.bankIfsc]||'').trim(),
          bank_name:      String(r[idx.bankName]||'').trim(),
          notes:          String(r[idx.notes]||'').trim(),
          active:         true,
          created_at:     existing>=0 ? (st.employees[existing].created_at||new Date().toISOString()) : new Date().toISOString(),
          updated_at:     new Date().toISOString(),
        };

        if (existing>=0) { st.employees[existing] = entry; }
        else             { st.employees.push(entry); added++; }
      }

      await SSIApp.saveState(st);
      SSIApp.toast(`✅ Import done — ${added} added, ${skipped} skipped`);
      refresh(document.getElementById('page-area'));
    } catch(err) {
      SSIApp.toast(`Import failed: ${err.message}`);
    }
    input.value = '';
  }

  /* ── Delete employee (ADMIN only) ─────────────────────────── */
  async function deleteEmployee(id) {
    if (!SSIApp.hasRole('ADMIN')) { SSIApp.toast('🔒 Admin only'); return; }
    const st  = SSIApp.getState();
    const emp = (st.employees||[]).find(e=>e.id===id);
    if (!emp) return;
    const ok  = await SSIApp.confirm(`Delete employee "${emp.name}" (${emp.emp_code})? All attendance and payroll records for this employee will remain but they will be removed from the employee list. This cannot be undone.`);
    if (!ok) return;
    st.employees = (st.employees||[]).filter(e=>e.id!==id);
    await SSIApp.saveState(st);
    SSIApp.audit('EMPLOYEE_DELETE', `Deleted employee: ${emp.emp_code} ${emp.name}`);
    SSIApp.toast('🗑️ Employee deleted');
    refresh(document.getElementById('page-area'));
  }


  /* ── Export ──────────────────────────────────────────────── */
  function exportExcel() {
    const st = SSIApp.getState();
    const isAdmin = SSIApp.hasRole('ADMIN');
    const headers = ['Code','Name','Type','Unit','Department','Designation','Join Date','Phone','Father/Spouse Name','Status',
      ...(isAdmin ? ['Monthly Salary','Bank AC','Bank IFSC','Bank Name'] : [])];
    const rows = [headers];
    (st.employees||[]).forEach(e => {
      const unit = (st.units||[]).find(u=>u.id===e.unit_id);
      rows.push([
        e.emp_code, e.name, e.type, unit?.name||'', e.department, e.designation,
        e.join_date, e.phone, e.relation_name||'', e.active!==false?'Active':'Inactive',
        ...(isAdmin ? [e.monthly_salary, e.bank_ac, e.bank_ifsc, e.bank_name] : [])
      ]);
    });
    SSIApp.excelDownload(rows, 'Employees', 'SSI_Employee_Export');
  }

  return { render, refresh, applyFilter, openForm, saveEmployee, toggleActive, deleteEmployee, downloadTemplate, importFile, exportExcel };
})();
