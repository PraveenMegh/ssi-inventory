/* SSI Products Module */
const SSIProducts = (() => {
  const PACK_SIZES = [
    {label:'100g',kg:0.1},{label:'200g',kg:0.2},{label:'500g',kg:0.5},
    {label:'1 KG',kg:1},{label:'5 KG',kg:5},{label:'10 KG',kg:10},
    {label:'25 KG',kg:25},{label:'30 KG',kg:30},{label:'40 KG',kg:40},
    {label:'50 KG',kg:50},{label:'Units/NOS',kg:0}
  ];

  function render(area) {
    if (!SSIApp.hasRole('ADMIN','STOCK')) { area.innerHTML='<div class="empty-state"><div class="icon">🔒</div><p>Access Denied</p></div>'; return; }
    refresh(area);
  }

  function refresh(area) {
    const st = SSIApp.getState();
    const products = st.products.filter(p=>p.active);

    area.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">📦 Products</h2>
        ${SSIApp.hasRole('ADMIN') ? `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="SSIProducts.downloadTemplate()">⬇️ Template</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            📥 Import Excel <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="SSIProducts.importExcel(this)">
          </label>
          <button class="btn btn-secondary btn-sm" onclick="SSIProducts.exportExcel()">📤 Export</button>
          <button class="btn btn-primary" onclick="SSIProducts.openForm()">+ Add Product</button>
        </div>` : ''}
      </div>

      <div class="card">
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>SKU</th><th>Product Name</th><th>UoM</th><th>Pack Sizes</th><th>Carton Std</th><th>Reorder</th>
              ${st.units.filter(u=>u.active).map(u=>`<th style="text-align:center;">${u.name}<br><span style="font-size:10px;">Stock</span></th>`).join('')}
              <th>Status</th>${SSIApp.hasRole('ADMIN')?'<th>Actions</th>':''}
            </tr></thead>
            <tbody>
              ${products.map(p=>{
                const unitStocks = st.units.filter(u=>u.active).map(u=>{
                  const qty = SSIApp.getStock(p.id,u.id);
                  const isLow = p.reorder_level>0 && qty<=p.reorder_level;
                  return `<td style="text-align:center;"><strong style="color:${qty<=0?'#dc2626':isLow?'#d97706':'#16a34a'};">${SSIApp.qtyFmt(qty)}</strong>${isLow?'<br><span style="font-size:10px;color:#dc2626;">LOW</span>':''}</td>`;
                }).join('');
                const packLabels = (p.pack_sizes||[]).join(', ');
                const isLowTotal = p.reorder_level>0 && st.units.filter(u=>u.active).reduce((s,u)=>s+SSIApp.getStock(p.id,u.id),0)<=p.reorder_level;
                return `<tr>
                  <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">${p.sku}</code></td>
                  <td><strong>${p.name}</strong>${p.description?`<br><span style="font-size:12px;color:#94a3b8;">${p.description}</span>`:''}</td>
                  <td><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${p.uom||'KG'}</span></td>
                  <td style="font-size:12px;color:#64748b;">${packLabels||'—'}</td>
                  <td style="font-size:13px;">${p.carton_std>0?p.carton_std+' KG/ctn':'—'}</td>
                  <td style="font-size:13px;">${p.reorder_level||'—'}</td>
                  ${unitStocks}
                  <td><span class="badge ${isLowTotal?'badge-low':'badge-ok'}">${isLowTotal?'⚠️ LOW':'✅ OK'}</span></td>
                  ${SSIApp.hasRole('ADMIN')?`<td>
                    <button class="btn btn-secondary btn-sm" onclick="SSIProducts.openForm('${p.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="SSIProducts.deleteProduct('${p.id}')">🗑️</button>
                  </td>`:''}
                </tr>`;
              }).join('') || `<tr><td colspan="20" class="empty-state"><div class="icon">📦</div><p>No products yet. Add your first product!</p></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function openForm(id) {
    const st = SSIApp.getState();
    const p = id ? st.products.find(x=>x.id===id) : null;
    const packSizeCheckboxes = PACK_SIZES.map(ps=>`
      <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">
        <input type="checkbox" value="${ps.label}" ${(p?.pack_sizes||[]).includes(ps.label)?'checked':''} style="width:auto;"> ${ps.label}
      </label>`).join('');

    const html = `
      <div class="modal-header">
        <h3 style="font-size:18px;font-weight:700;">${p?'Edit':'Add'} Product</h3>
        <button onclick="SSIApp.closeModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-2">
          <div>
            <label>Product Name *</label>
            <input id="p-name" value="${p?.name||''}" placeholder="e.g. Calcium Carbonate 1 KG">
          </div>
          <div>
            <label>Unit of Measure *</label>
            <select id="p-uom">
              <option value="KG" ${p?.uom==='KG'?'selected':''}>KG (Weight-based)</option>
              <option value="NOS" ${p?.uom==='NOS'?'selected':''}>NOS/Units (Count-based)</option>
            </select>
          </div>
          <div>
            <label>Description</label>
            <input id="p-desc" value="${p?.description||''}" placeholder="Optional description">
          </div>
          <div>
            <label>Reorder Level (${p?.uom||'KG'})</label>
            <input id="p-reorder" type="number" min="0" value="${p?.reorder_level||''}" placeholder="e.g. 100">
          </div>
          <div>
            <label>Carton Standard (KG per carton)</label>
            <input id="p-carton" type="number" min="0" step="0.001" value="${p?.carton_std||''}" placeholder="e.g. 20 (0 = not applicable)">
          </div>
          <div>
            <label>Default Rate (₹ per KG/Unit)</label>
            <input id="p-rate" type="number" min="0" step="0.01" value="${p?.default_rate||''}" placeholder="e.g. 45.50">
          </div>
        </div>
        <div style="margin-top:16px;">
          <label>Available Pack Sizes</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;" id="pack-sizes-container">
            ${packSizeCheckboxes}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="SSIApp.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="SSIProducts.saveProduct('${id||''}')">💾 Save Product</button>
      </div>`;

    SSIApp.showModal(html);
  }

  function saveProduct(id) {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { SSIApp.toast('Product name is required', 'error'); return; }
    const uom = document.getElementById('p-uom').value;
    const desc = document.getElementById('p-desc').value.trim();
    const reorder = parseFloat(document.getElementById('p-reorder').value)||0;
    const carton_std = parseFloat(document.getElementById('p-carton').value)||0;
    const default_rate = parseFloat(document.getElementById('p-rate').value)||0;
    const pack_sizes = [...document.querySelectorAll('#pack-sizes-container input:checked')].map(c=>c.value);

    const st = SSIApp.getState();
    if (id) {
      const idx = st.products.findIndex(p=>p.id===id);
      if (idx>=0) Object.assign(st.products[idx],{name,uom,description:desc,reorder_level:reorder,carton_std,default_rate,pack_sizes,updated_at:new Date().toISOString()});
      SSIApp.toast('Product updated ✅');
    } else {
      const sku = SSIApp.nextSKU(st);
      st.products.push({id:SSIApp.uid(),sku,name,uom,description:desc,reorder_level:reorder,carton_std,default_rate,pack_sizes,active:true,created_at:new Date().toISOString()});
      SSIApp.toast('Product added ✅');
    }
    SSIApp.saveState(st);
    SSIApp.closeModal();
    SSIApp.audit('PRODUCT_SAVE',`Product ${name}`);
    refresh(document.getElementById('page-area'));
  }

  async function deleteProduct(id) {
    const ok = await SSIApp.confirm('Delete this product? This cannot be undone.');
    if (!ok) return;
    const st = SSIApp.getState();
    const p = st.products.find(x=>x.id===id);
    if (p) { p.active=false; SSIApp.saveState(st); SSIApp.toast('Product deleted'); SSIApp.audit('PRODUCT_DELETE',p.name); refresh(document.getElementById('page-area')); }
  }

  function downloadTemplate() {
    SSIApp.excelDownload([
      ['Product Name','UoM (KG/NOS)','Description','Reorder Level','Carton Std (KG)','Default Rate','Pack Sizes (comma-separated)'],
      ['Calcium Carbonate 1KG','KG','White powder','100','30','45.50','1 KG,30 KG,50 KG'],
      ['Sample Product','KG','Description here','50','0','25','500g,1 KG'],
    ],'Products','SSI_Products_Template');
  }

  async function importExcel(input) {
    const file = input.files[0]; if (!file) return;
    try {
      const rows = await SSIApp.excelRead(file);
      const st = SSIApp.getState();
      let added=0;
      rows.forEach(r=>{
        const name = (r['Product Name']||'').toString().trim();
        if (!name) return;
        const sku = SSIApp.nextSKU(st);
        st.products.push({
          id:SSIApp.uid(),sku,name,
          uom:(r['UoM (KG/NOS)']||'KG').toString().trim(),
          description:(r['Description']||'').toString(),
          reorder_level:parseFloat(r['Reorder Level'])||0,
          carton_std:parseFloat(r['Carton Std (KG)'])||0,
          default_rate:parseFloat(r['Default Rate'])||0,
          pack_sizes:(r['Pack Sizes (comma-separated)']||'').toString().split(',').map(s=>s.trim()).filter(Boolean),
          active:true,created_at:new Date().toISOString()
        });
        added++;
      });
      SSIApp.saveState(st);
      SSIApp.toast(`${added} products imported ✅`);
      SSIApp.audit('PRODUCT_IMPORT',`${added} products`);
      refresh(document.getElementById('page-area'));
    } catch(e) { SSIApp.toast('Import failed: '+e.message,'error'); }
    input.value='';
  }

  function exportExcel() {
    const st = SSIApp.getState();
    const rows = [['SKU','Product Name','UoM','Description','Reorder Level','Carton Std (KG)','Default Rate','Pack Sizes']];
    st.products.filter(p=>p.active).forEach(p=>{
      rows.push([p.sku,p.name,p.uom||'KG',p.description||'',p.reorder_level||0,p.carton_std||0,p.default_rate||0,(p.pack_sizes||[]).join(',')]);
    });
    SSIApp.excelDownload(rows,'Products','SSI_Products_Export');
    SSIApp.toast('Products exported ✅');
  }

  return { render, openForm, saveProduct, deleteProduct, downloadTemplate, importExcel, exportExcel };
})();
