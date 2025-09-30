(function(){
  const { fetchEvents, toThaiLongDateBuddhist, showDetail, escapeHtml } = window.__GATHIN_APP__;
  const tbody   = document.querySelector('#event-body');
  const loading = document.querySelector('#loading');

  // Dashboard elements
  const dashTotalEl = document.querySelector('#countTotalList');
  const dashShownEl = document.querySelector('#countShownList');

  // ฟิลเตอร์
  const els = {
    q:        document.querySelector('#q'),
    country:  document.querySelector('#country'),
    province: document.querySelector('#province'),
    district: document.querySelector('#district'),
    purpose:  document.querySelector('#purpose'),
    dateFrom: document.querySelector('#dateFrom'),
    dateTo:   document.querySelector('#dateTo'),
    btnReset: document.querySelector('#btnReset'),
  };

  // สถานะเรียง
  let sortState = { key: 'วันที่', dir: 'asc' };
  let all = [];
  let view = [];

  // Utils
  const norm = s => String(s ?? '').toLowerCase().trim();
  const trimEq = (a,b) => String(a ?? '').trim() === String(b ?? '').trim();
  const contains = (a,b) => norm(a).includes(norm(b));
  const parseDate = (v) => { if (!v) return null; const d=new Date(v); return isNaN(d)?null:d; };
  const safeVal = el => (el && 'value' in el) ? el.value : '';
  const getPurpose = r => r['จุดประสงค์'] ?? r['วัตถุประสงค์'] ?? '';

  function fillOptions(el, values, placeholder){
    if (!el) return;
    const cur = el.value || '';
    const arr = [...values].map(v => String(v ?? '').trim()).filter(v=>v);
    arr.sort((a,b)=>a.localeCompare(b,'th'));
    el.innerHTML = ['<option value="">'+placeholder+'</option>']
      .concat(arr.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)).join('');
    if (arr.includes(cur.trim())) el.value = cur;
  }

  function buildFacetSets(rows){
    const sCountry = new Set(), sProvince = new Set(), sDistrict = new Set(), sPurpose = new Set();
    rows.forEach(r=>{
      const country = (r['ประเทศ'] ?? '').trim();
      const province= (r['จังหวัด'] ?? '').trim();
      const district= (r['อำเภอ']  ?? '').trim();
      const purpose = (getPurpose(r) ?? '').trim();
      if (country)  sCountry.add(country);
      if (province) sProvince.add(province);
      if (district) sDistrict.add(district);
      if (purpose)  sPurpose.add(purpose);
    });
    fillOptions(els.country,  sCountry,  'ทุกประเทศ');
    fillOptions(els.province, sProvince, 'ทุกจังหวัด');
    fillOptions(els.district, sDistrict, 'ทุกอำเภอ');
    fillOptions(els.purpose,  sPurpose,  'ทุกจุดประสงค์');
  }

  // ✅ อัปเดต Dashboard (นับเฉพาะแถวที่มีวันที่สำหรับ "ทั้งหมด")
  function updateDashboard(){
    if (dashTotalEl){
      const totalWithDate = all.filter(r => parseDate(r['วันที่'])).length;
      dashTotalEl.textContent = String(totalWithDate);
    }
    if (dashShownEl){
      dashShownEl.textContent = String(view.length);
    }
  }

  function applyFilters(){
    const q         = norm(safeVal(els.q));
    const fCountry  = safeVal(els.country).trim();
    const fProvince = safeVal(els.province).trim();
    const fDistrict = safeVal(els.district).trim();
    const fPurpose  = safeVal(els.purpose).trim();
    const df = safeVal(els.dateFrom) ? new Date(els.dateFrom.value) : null;
    const dt = safeVal(els.dateTo)   ? new Date(els.dateTo.value)   : null;

    let rows = all.filter(r=>{
      const province = (r['จังหวัด'] ?? '').trim();
      const district = (r['อำเภอ']  ?? '').trim();
      const country  = (r['ประเทศ'] ?? '').trim();
      const purpose  = (getPurpose(r) ?? '').trim();

      // ❗ซ่อนรายการที่ "ไม่มีวันที่" เสมอ (ตามที่กำหนดก่อนหน้า)
      const d = parseDate(r['วันที่']);
      if (!d) return false;

      // ค้นหา
      const okQ = !q || [r['ชื่อวัด'], r['อำเภอ'], r['จังหวัด'], getPurpose(r)].some(v=>contains(v ?? '', q));
      if (!okQ) return false;

      // ตัวกรอง select ต่าง ๆ
      if (fCountry  && !trimEq(country,  fCountry))  return false;
      if (fProvince && !trimEq(province, fProvince)) return false;
      if (fDistrict && !trimEq(district, fDistrict)) return false;
      if (fPurpose  && !trimEq(purpose,  fPurpose))  return false;

      // ช่วงวันที่ (optional) — หน้ารายการ "ไม่ซ่อนอดีต"
      if (df && d < new Date(df.getFullYear(), df.getMonth(), df.getDate())) return false;
      if (dt && d > new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23,59,59,999)) return false;

      return true;
    });

    // เรียง
    rows.sort((a,b)=>{
      const k = sortState.key;
      let va = a[k] ?? '', vb = b[k] ?? '';
      if (k === 'วันที่'){
        const da = parseDate(va), db = parseDate(vb);
        va = da ? da.getTime() : -Infinity;
        vb = db ? db.getTime() : -Infinity;
      }else{
        va = String(va); vb = String(vb);
      }
      const cmp = (va>vb) - (va<vb);
      return sortState.dir === 'asc' ? cmp : -cmp;
    });

    view = rows;
    renderTable(rows);
    updateSortHeaders();
    updateDashboard(); // ✅ อัปเดตตัวเลข
  }

  function renderTable(rows){
    const html = rows.map((it, idx) => `
      <tr data-idx="${idx}" title="คลิกเพื่อดูรายละเอียด">
        <td class="text-nowrap"><span class="fw-semibold">${escapeHtml(it['ชื่อวัด']||'-')}</span></td>
        <td class="text-nowrap">${toThaiLongDateBuddhist(it['วันที่'])}</td>
        <td class="text-nowrap">${escapeHtml(it['เวลาถวาย']||'-')}</td>
        <td class="text-nowrap">${escapeHtml(it['อำเภอ']||'-')}</td>
        <td class="text-nowrap">${escapeHtml(it['จังหวัด']||'-')}</td>
        <td class="text-nowrap">${escapeHtml(it['ประเทศ']||'-')}</td>
      </tr>
    `).join('');
    tbody.innerHTML = rows.length ? html : `<tr><td colspan="6" class="text-center py-4">ไม่พบข้อมูล</td></tr>`;
  }

  function updateSortHeaders(){
    document.querySelectorAll('thead th.th-sort').forEach(th=>{
      th.classList.remove('asc','desc');
      const key = th.getAttribute('data-key');
      if (key === sortState.key){ th.classList.add(sortState.dir); }
    });
  }

  // เรียงคอลัมน์
  document.querySelectorAll('thead th.th-sort').forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-key');
      if (sortState.key === key){ sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc'; }
      else { sortState.key = key; sortState.dir = 'asc'; }
      applyFilters();
    });
  });

  // คลิกทั้งแถวเพื่อเปิดรายละเอียด
  tbody.addEventListener('click', e=>{
    const tr = e.target.closest('tr[data-idx]');
    if (!tr) return;
    const row = view[Number(tr.dataset.idx)];
    if (row) showDetail(row);
  });

  // ดีบาวซ์กรอง
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  const onFilterChange = debounce(applyFilters, 120);
  ['q','country','province','district','purpose','dateFrom','dateTo'].forEach(k=>{
    if (els[k]){
      els[k].addEventListener('input', onFilterChange);
      els[k].addEventListener('change', onFilterChange);
    }
  });

  if (els.btnReset){
    els.btnReset.addEventListener('click', ()=>{
      if (els.q) els.q.value='';
      ['country','province','district','purpose','dateFrom','dateTo'].forEach(k=>{ if (els[k]) els[k].value=''; });
      applyFilters();
    });
  }

  // Init
  (async ()=>{
    try{
      const data = await fetchEvents();
      all = Array.isArray(data) ? data : [];
      buildFacetSets(all);
      applyFilters();        // จะเรียก updateDashboard ภายใน
      updateDashboard();     // กันเผื่อ initial state
    }catch(e){
      console.error(e);
      Swal.fire({icon:'error', title:'โหลดข้อมูลไม่สำเร็จ', text:'ตรวจสอบ URL Web App / สิทธิ์เข้าถึง', confirmButtonText:'ปิด'});
      all = all || [];
      applyFilters();
    }finally{
      loading?.remove();
    }
  })();
})();
