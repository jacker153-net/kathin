(function(){
  const { fetchEvents, toThaiLongDateBuddhist, showDetail, escapeHtml } = window.__GATHIN_APP__;
  const loading = document.querySelector('#loading');

  const els = {
    q:        document.querySelector('#q'),
    province: document.querySelector('#province'),
    district: document.querySelector('#district'),
    dateFrom: document.querySelector('#dateFrom'),
    dateTo:   document.querySelector('#dateTo'),
    btnReset: document.querySelector('#btnReset'),
  };

  // Map
  const map = L.map('map', { zoomControl:true, scrollWheelZoom:true }).setView([15.8700, 100.9925], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

  let all = [];
  let view = [];
  let markers = [];

  const norm = s => String(s ?? '').toLowerCase().trim();
  const trimEq = (a,b) => String(a ?? '').trim() === String(b ?? '').trim();
  const contains = (a,b) => norm(a).includes(norm(b));
  const parseDate = (v) => { if (!v) return null; const d=new Date(v); return isNaN(d)?null:d; };
  const safeVal = el => (el && 'value' in el) ? el.value : '';

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
    const sProvince = new Set(), sDistrict = new Set();
    rows.forEach(r=>{
      const province= (r['จังหวัด'] ?? '').trim();
      const district= (r['อำเภอ']  ?? '').trim();
      if (province) sProvince.add(province);
      if (district) sDistrict.add(district);
    });
    fillOptions(els.province, sProvince, 'ทุกจังหวัด');
    fillOptions(els.district, sDistrict, 'ทุกอำเภอ');
  }

  function applyFilters(){
    const q         = norm(safeVal(els.q));
    const fProvince = safeVal(els.province).trim();
    const fDistrict = safeVal(els.district).trim();
    const df = safeVal(els.dateFrom) ? new Date(els.dateFrom.value) : null;
    const dt = safeVal(els.dateTo)   ? new Date(els.dateTo.value)   : null;

    view = all.filter(r=>{
      const province = (r['จังหวัด'] ?? '').trim();
      const district = (r['อำเภอ']  ?? '').trim();

      const okQ = !q || [r['ชื่อวัด'], r['อำเภอ'], r['จังหวัด']].some(v=>contains(v,v==null?'':v));
      if (!okQ) return false;

      if (fProvince && !trimEq(province, fProvince)) return false;
      if (fDistrict && !trimEq(district, fDistrict)) return false;

      if (df || dt){
        const d = parseDate(r['วันที่']); if (!d) return false;
        if (df && d < new Date(df.getFullYear(), df.getMonth(), df.getDate())) return false;
        if (dt && d > new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23,59,59,999)) return false;
      }
      return true;
    });

    renderMap();
  }

  function renderMap(){
    // clear markers
    markers.forEach(m=>m.remove()); markers = [];

    // add markers
    view.forEach((it, idx)=>{
      const lat = parseFloat(it.lat), lng = parseFloat(it.lng);
      if (!isNaN(lat) && !isNaN(lng)){
        const m = L.marker([lat, lng]).addTo(map);
        m.bindPopup(`
          <div style="min-width:220px">
            <div class="fw-semibold">${escapeHtml(it['ชื่อวัด']||'-')}</div>
            <div class="small text-muted">${escapeHtml(it['อำเภอ']||'-')}, ${escapeHtml(it['จังหวัด']||'-')}</div>
            <div class="mt-1"><span class="badge-soft">${toThaiLongDateBuddhist(it['วันที่'])}</span> ${escapeHtml(it['เวลาถวาย']||'')}</div>
            <div class="mt-2 text-end">
              <button class="btn btn-primary btn-sm" onclick="window.__MAP_DETAIL__(${idx})">รายละเอียด</button>
            </div>
          </div>
        `);
        markers.push(m);
      }
    });

    if (markers.length){
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }

  window.__MAP_DETAIL__ = (i)=> showDetail(view[i]);

  // ดีบาวซ์กรอง
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  const onFilterChange = debounce(applyFilters, 120);
  ['q','province','district','dateFrom','dateTo'].forEach(k=>{
    if (els[k]){
      els[k].addEventListener('input', onFilterChange);
      els[k].addEventListener('change', onFilterChange);
    }
  });
  if (els.btnReset){
    els.btnReset.addEventListener('click', ()=>{
      if (els.q) els.q.value='';
      ['province','district','dateFrom','dateTo'].forEach(k=>{ if (els[k]) els[k].value=''; });
      applyFilters();
    });
  }

  // Init
  (async ()=>{
    try{
      const data = await fetchEvents();
      all = Array.isArray(data)? data : [];
      buildFacetSets(all);
      applyFilters();
    }catch(err){
      console.error(err);
      Swal.fire({icon:'error', title:'โหลดข้อมูลไม่สำเร็จ', text:'ตรวจสอบ URL Web App / สิทธิ์เข้าถึง', confirmButtonText:'ปิด'});
    }finally{
      loading?.remove();
    }
  })();
})();
