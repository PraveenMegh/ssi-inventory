/* global SSIApp */

const SSIProducts = (() => {
  const PACK_SIZES = [
    { label:'100g', kg:0.1 },
    { label:'200g', kg:0.2 },
    { label:'500g', kg:0.5 },
    { label:'1kg', kg:1 },
    { label:'30kg', kg:30 },
    { label:'40kg', kg:40 },
    { label:'50kg', kg:50 }
  ];

  const render = () => {
    if (!SSIApp.requireRole(['ADMIN'])) return SSIApp.toast('Not allowed', 'err');
    const st = SSIApp.getState();

    // Calculate stock per unit for each product
    const calcStock = (unitId, prodId) => {
      return (st.inventory_txn || []).reduce((sum, t) => {
        if (t.unit_id !== unitId || t.product_id !== prodId) return sum;
        if (t.type === 'IN' || t.type === 'OPEN') return sum + Number(t.qty || 0);
        if (t.type === 'OUT') return sum - Number(t.qty || 0);
        return sum;
      }, 0);
    };

    const rows = st.products.map(p => {
      // Stock chips per unit
      const stockCells = (st.units || []).map(u => {
        const bal = calcStock(u.id, p.id);
        const low = p.reorder_level && bal <= p.reorder_level;
        const chip = low
          ? `<span class="chip chip-urgent" title="${u.name}">${u.code||u.name.split(' ')[1]}: ${bal.toFixed(1)} ⚠️</span>`
          : `<span class="chip chip-ok" title="${u.name}">${u.code||u.name.split(' ')[1]}: ${bal.toFixed(1)}</span>`;
        return chip;
      }).join(' ');

      return `
      <tr class="border-t">
        <td class="py-2 pr-3 font-semibold">${p.name}</td>
        <td class="py-2 pr-3 text-slate-500">${p.sku || ''}</td>
        <td class="py-2 pr-3">${p.uom || 'KG'}</td>
        <td class="py-2 pr-3 text-slate-600">${(p.pack_sizes||[]).join(', ') || '-'}</td>
        <td class="py-2 pr-3">${stockCells}</td>
        <td class="py-2 text-right">
          <button data-edit="${p.id}" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Edit</button>
          <button data-del="${p.id}" class="ml-2 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50">Delete</button>
        </td>
      </tr>`;
    }).join('');

    const content = `
      <div class="bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-extrabold">Products</div>
            <div class="text-sm text-slate-500">Products are shared across both units. Stock tracked per unit via Inventory IN/OUT. 🟢=OK stock, 🔴=Low/zero stock.</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnTplProd" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📥 Template Excel</button>
            <button id="btnImpProd" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📂 Import Excel</button>
            <button id="btnExpProd" class="px-3 py-2 rounded-xl border hover:bg-slate-50 text-sm">📤 Export Excel</button>
            <button id="btnAddProduct" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Add Product</button>
          </div>
        </div>

        <div class="mt-4 overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-500">
              <tr>
                <th class="py-2 pr-3">Name</th>
                <th class="py-2 pr-3">SKU</th>
                <th class="py-2 pr-3">UoM</th>
                <th class="py-2 pr-3">Pack sizes</th>
                <th class="py-2 pr-3">Stock (per Unit) <span class="text-xs font-normal text-slate-400">— green=OK, red=Low</span></th>
                <th class="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>${rows || ''}</tbody>
          </table>
          ${st.products.length===0 ? `<div class="text-sm text-slate-500 py-4">No products yet. Click <b>Add Product</b>.</div>`:''}
        </div>
      </div>
      ${modalHtml()}
      <input id="prodCsvFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" />
    `;

    SSIApp.render(SSIApp.shell(content, 'products'));
    SSIApp.bindShellEvents();

    document.getElementById('btnAddProduct').addEventListener('click', ()=>openModal());

    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-edit');
      openModal(st.products.find(x=>x.id===id));
    }));

    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      if (!confirm('Delete this product?')) return;
      const st2 = SSIApp.getState();
      st2.products = st2.products.filter(x=>x.id!==id);
      SSIApp.setState(st2);
      SSIApp.audit('DELETE','product',id,{});
      SSIApp.toast('Product deleted','ok');
      render();
    }));

    bindModalEvents();


    // Bulk tools
    document.getElementById('btnTplProd').addEventListener('click', () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['product_name','uom_type','pack_sizes','carton_std_kg'],
        ['Sample Product','WEIGHT','200g|500g|1kg|30kg',30],
        ['Sample Unit Item','NOS','',''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:25},{wch:10},{wch:30},{wch:15}];
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'products_template.xlsx');
    });

    document.getElementById('btnExpProd').addEventListener('click', () => {
      const st3 = SSIApp.getState();
      const wsData = [['Product Name','SKU','UoM Type','Pack Sizes','Carton Std (KG)','Reorder Level','Price INR','Price USD','Price EUR','Price GBP']];
      for (const p of st3.products){
        const uom_type = (p.uom==='NOS') ? 'NOS' : 'WEIGHT';
        wsData.push([
          p.name,
          p.sku || '',
          uom_type,
          (p.pack_sizes||[]).join('|'),
          p.carton_std_kg ?? '',
          p.reorder_level ?? '',
          p.prices?.INR ?? '',
          p.prices?.USD ?? '',
          p.prices?.EUR ?? '',
          p.prices?.GBP ?? '',
        ]);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:25},{wch:12},{wch:10},{wch:30},{wch:14},{wch:13},{wch:11},{wch:11},{wch:11},{wch:11}];
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'products_export.xlsx');
    });

    document.getElementById('btnImpProd').addEventListener('click', () => {
      document.getElementById('prodCsvFile').click();
    });

    document.getElementById('prodCsvFile').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const st4 = SSIApp.getState();
        let added = 0;

        for (const o of objs){
          const name = String(o['product_name'] || o['Product Name'] || o['name'] || '').trim();
          if (!name) continue;
          const uom_raw = String(o['uom_type'] || o['UoM Type'] || o['uom'] || 'WEIGHT').toUpperCase();
          const uom = (uom_raw==='NOS' || uom_raw==='UNIT' || uom_raw==='UNITS') ? 'NOS' : 'KG';
          const pack_raw = String(o['pack_sizes'] || o['Pack Sizes'] || '');
          const pack_sizes = pack_raw.split('|').map(x=>x.trim()).filter(Boolean);
          const carton_raw = String(o['carton_std_kg'] || o['Carton Std (KG)'] || '').trim();

          const prod = {
            id: SSIApp.uid('prod'),
            name,
            sku: SSIApp.genSKU(),
            uom,
            pack_sizes,
            carton_std_kg: carton_raw==='' || carton_raw==='0' ? null : Number(carton_raw),
            reorder_level: null,
            prices: { INR:null, USD:null, EUR:null, GBP:null },
            created_at: SSIApp.nowISO(),
          };
          st4.products.unshift(prod);
          added++;
        }

        SSIApp.setState(st4);
        SSIApp.toast('Imported ' + added + ' products ✅', 'ok');
        render();
      } catch (err) {
        console.error(err);
        SSIApp.toast('Import failed. Check Excel format.', 'err');
      } finally {
        e.target.value = '';
      }
    });

  };

  const modalHtml = () => {
    const packOptions = PACK_SIZES.map(p=>`<label class="flex items-center gap-2 text-sm">
      <input type="checkbox" class="packChk" value="${p.label}" />
      <span>${p.label}</span>
    </label>`).join('');

    return `
    <div id="prodModal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4 z-40">
      <div class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
        <div class="flex items-center justify-between">
          <div class="text-lg font-extrabold" id="prodModalTitle">Add Product</div>
          <button id="prodModalClose" class="px-3 py-1.5 rounded-lg border hover:bg-slate-50">Close</button>
        </div>

        <input type="hidden" id="pId" />

        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="col-span-2">
            <label class="text-sm font-semibold">Product Name</label>
            <input id="pName" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="Product name" />
          </div>
          <div>
            <label class="text-sm font-semibold">SKU/Code</label>
            <input id="pSku" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="SKU" />
          </div>
          <div>
            <label class="text-sm font-semibold">UoM</label>
            <select id="pUom" class="mt-1 w-full px-3 py-2 rounded-xl border">
              <option value="KG">KG (default)</option>
              <option value="NOS">NOS (Units)</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-sm font-semibold">Pack Sizes (for weight products)</label>
            <div class="mt-2 grid grid-cols-3 gap-2" id="packArea">${packOptions}</div>
          </div>
          <div>
            <label class="text-sm font-semibold">Carton Standard (KG per carton) — Option B</label>
            <input id="pCartonStd" type="number" step="0.001" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="e.g. 30" />
          </div>
          <div>
            <label class="text-sm font-semibold">Reorder Level</label>
            <input id="pReorder" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="e.g. 100" />
          </div>
          <div></div>

          <div class="col-span-2">
            <div class="text-sm font-extrabold">Price List (per KG or per Unit)</div>
            <div class="text-xs text-slate-500">Default currency is INR.</div>
          </div>
          <div>
            <label class="text-sm font-semibold">INR</label>
            <input id="pINR" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="0" />
          </div>
          <div>
            <label class="text-sm font-semibold">USD</label>
            <input id="pUSD" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="0" />
          </div>
          <div>
            <label class="text-sm font-semibold">EUR</label>
            <input id="pEUR" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="0" />
          </div>
          <div>
            <label class="text-sm font-semibold">GBP</label>
            <input id="pGBP" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border" placeholder="0" />
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button id="prodModalSave" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700">Save</button>
        </div>
      </div>
    </div>`;
  };

  const openModal = (p=null) => {
    document.getElementById('prodModal').classList.remove('hidden');
    document.getElementById('prodModal').classList.add('flex');

    document.getElementById('pId').value = p?.id || '';
    document.getElementById('pName').value = p?.name || '';
    document.getElementById('pSku').value = p?.sku || '';
    document.getElementById('pUom').value = p?.uom || 'KG';
    document.getElementById('pCartonStd').value = p?.carton_std_kg ?? '';
    document.getElementById('pReorder').value = p?.reorder_level ?? '';

    const prices = p?.prices || {};
    document.getElementById('pINR').value = prices.INR ?? '';
    document.getElementById('pUSD').value = prices.USD ?? '';
    document.getElementById('pEUR').value = prices.EUR ?? '';
    document.getElementById('pGBP').value = prices.GBP ?? '';

    const selected = new Set(p?.pack_sizes || []);
    document.querySelectorAll('.packChk').forEach(chk => {
      chk.checked = selected.has(chk.value);
    });

    document.getElementById('prodModalTitle').textContent = p ? 'Edit Product' : 'Add Product';
  };

  const closeModal = () => {
    document.getElementById('prodModal').classList.add('hidden');
    document.getElementById('prodModal').classList.remove('flex');
  };

  const bindModalEvents = () => {
    document.getElementById('prodModalClose').onclick = closeModal;
    document.getElementById('prodModal').addEventListener('click', (e)=>{
      if (e.target.id==='prodModal') closeModal();
    });

    document.getElementById('prodModalSave').onclick = () => {
      const st = SSIApp.getState();
      const id = document.getElementById('pId').value.trim();
      const payload = {
        id: id || SSIApp.uid('prod'),
        name: document.getElementById('pName').value.trim(),
        sku: (document.getElementById('pSku').value.trim() || SSIApp.genSKU()),
        uom: document.getElementById('pUom').value,
        pack_sizes: Array.from(document.querySelectorAll('.packChk')).filter(c=>c.checked).map(c=>c.value),
        carton_std_kg: document.getElementById('pCartonStd').value === '' ? null : Number(document.getElementById('pCartonStd').value),
        reorder_level: document.getElementById('pReorder').value === '' ? null : Number(document.getElementById('pReorder').value),
        prices: {
          INR: document.getElementById('pINR').value === '' ? null : Number(document.getElementById('pINR').value),
          USD: document.getElementById('pUSD').value === '' ? null : Number(document.getElementById('pUSD').value),
          EUR: document.getElementById('pEUR').value === '' ? null : Number(document.getElementById('pEUR').value),
          GBP: document.getElementById('pGBP').value === '' ? null : Number(document.getElementById('pGBP').value)
        },
        created_at: SSIApp.nowISO()
      };

      if (!payload.name) return SSIApp.toast('Product name required','warn');

      const idx = st.products.findIndex(x=>x.id===payload.id);
      if (idx>=0) st.products[idx] = { ...st.products[idx], ...payload };
      else st.products.unshift(payload);

      SSIApp.setState(st);
      SSIApp.audit(idx>=0?'UPDATE':'CREATE','product',payload.id,{ name: payload.name });
      SSIApp.toast('Saved','ok');
      closeModal();
      render();
    };
  };

  const packToKg = (label) => {
    const p = PACK_SIZES.find(x=>x.label===label);
    return p ? p.kg : 1;
  };

  return { render, PACK_SIZES, packToKg };
})();
