// ===== CONFIG =====
const API_BASE = 'https://script.google.com/macros/s/AKfycbwycbOeOEHYRt4nHQvoG9-IGZg-zgQdnO7p5niMDpj21EKMCXKrKR9k2glAjIVn23TJ/exec'; // <<< ใส่ของคุณ
const TZ = 'Asia/Bangkok';

// ===== Utils =====
function toThaiLongDateBuddhist(input){
  if (!input) return '';
  let d;
  if (input instanceof Date) d = input;
  else if (!isNaN(input)) d = new Date(Math.round((Number(input) - 25569) * 86400 * 1000)); // excel serial
  else d = new Date(input);

  if (String(input).match(/[ก-๙]/)) {
    const parsed = Date.parse(String(input).replace(/\s+/g,' '));
    if (!isNaN(parsed)) d = new Date(parsed);
  }
  if (isNaN(d)) return String(input);

  const buddhistYear = d.getFullYear() + 543;
  const thMonthLong = d.toLocaleDateString('th-TH', { month:'long', timeZone: TZ });
  const day = d.getDate();
  return `${day} ${thMonthLong} ${buddhistYear}`;
}

function escapeHtml(str){
  return String(str ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
function linkify(text){
  let t = String(text||'');
  t = t.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|\s)(0\d{8,9})($|\s)/g, '$1<a href="tel:$2">$2</a>$3');
  return t;
}
function isUrl(s){ try{ const u=new URL(s); return u.protocol==='http:'||u.protocol==='https:'; }catch{return false;} }
function extractUrls(s){
  if (!s) return [];
  return String(s).replace(/\u200B/g,'').split(/[\s,]+/g).map(x=>x.trim()).filter(Boolean).filter(isUrl);
}

/** ✅ เปิด Google Maps แบบ deep link (มือถือ) + fallback เว็บ */
function openMapDeepLink(lat, lng){
  const gmapsWeb = `https://www.google.com/maps?q=${lat},${lng}`;
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let appUrl = '';
  if (isIOS){
    appUrl = `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=16`;
  }else if (isAndroid){
    appUrl = `intent://maps.google.com/?q=${lat},${lng}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
  }

  if (appUrl){
    const t = setTimeout(()=>{ window.open(gmapsWeb, '_blank', 'noopener'); }, 1200);
    window.location.href = appUrl;
    window.addEventListener('pagehide', ()=>clearTimeout(t), { once:true });
    window.addEventListener('blur', ()=>clearTimeout(t), { once:true });
  }else{
    window.open(gmapsWeb, '_blank', 'noopener');
  }
}

/** ✅ คัดลอกข้อความไปคลิปบอร์ด + Toast แจ้งผล */
async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(String(text ?? ''));
    Swal.fire({
      toast: true, position: 'top-end', timer: 1600, showConfirmButton: false,
      icon: 'success', title: 'คัดลอกแล้ว'
    });
  }catch(e){
    // เผื่อ clipboard API ไม่พร้อม
    const ta = document.createElement('textarea');
    ta.value = String(text ?? '');
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    Swal.fire({
      toast: true, position: 'top-end', timer: 1600, showConfirmButton: false,
      icon: 'success', title: 'คัดลอกแล้ว'
    });
  }
}

/** ตารางรายละเอียดสำหรับ SweetAlert2 (มีป้ายฯ, Facebook, ปุ่มเปิดแผนที่แบบ deep link, และปุ่มคัดลอกเลขที่บัญชี) */
function buildDetailTable(item){
  // --- ป้ายประชาสัมพันธ์ ---
  const bannerVal = item['ป้ายประชาสัมพันธ์'] ?? '';
  const bannerUrls = extractUrls(bannerVal);
  const bannerHtml = bannerUrls.length
    ? `<div class="d-flex flex-wrap gap-2">${
        bannerUrls.map(u=>`
          <a href="${escapeHtml(u)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(u)}" alt="ป้ายประชาสัมพันธ์"
                 style="max-width:220px;height:auto;border-radius:12px;border:1px solid #e6e6ea;box-shadow:0 4px 14px rgba(0,0,0,.08);">
          </a>`).join('')
      }</div>`
    : escapeHtml(bannerVal || '');

  // --- Facebook (ลิงก์สั้น) ---
  const fbVal = item['Facebook'] ?? '';
  const fbUrls = extractUrls(fbVal);
  const facebookHtml = fbUrls.length
    ? fbUrls.map((u,i)=>`<a href="${escapeHtml(u)}" target="_blank" rel="noopener">เปิด Facebook${fbUrls.length>1?` (${i+1})`:''}</a>`).join(' • ')
    : escapeHtml(fbVal || '');

  // --- พิกัด + ปุ่ม deep link ---
  const coordVal = (item['พิกัด'] ?? '').trim();
  let coordHtml = escapeHtml(coordVal);
  if (coordVal && coordVal.includes(',')){
    const [latStr,lngStr] = coordVal.split(',').map(s=>s.trim());
    const lat = parseFloat(latStr), lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)){
      coordHtml = `
        <div class="d-flex flex-column flex-sm-row align-items-start gap-2">
          <span>${escapeHtml(coordVal)}</span>
          <button class="btn btn-sm btn-success" onclick="window.__OPEN_MAP__(${lat}, ${lng})">
            เปิด Google Maps
          </button>
        </div>
      `;
    }
  }

  // --- เลขที่บัญชี + ปุ่มคัดลอก ---
  const acctRaw = String(item['เลขที่บัญชี'] ?? '').trim();
  const acctHtml = acctRaw
    ? `
      <div class="d-flex flex-column flex-sm-row align-items-start gap-2">
        <span class="font-monospace">${escapeHtml(acctRaw)}</span>
        <button class="btn btn-sm btn-outline-secondary"
                data-copy="${escapeHtml(acctRaw)}"
                onclick="window.__COPY__(this.dataset.copy)">
          📋 คัดลอก
        </button>
      </div>
    `
    : '';

  // --- รวมรายการข้อมูลลงในตาราง ---
  const entries = [
    ['ชื่อวัด', item['ชื่อวัด']],
    ['วันที่', toThaiLongDateBuddhist(item['วันที่'])],
    ['เวลาถวาย', item['เวลาถวาย']],
    ['อำเภอ', item['อำเภอ']],
    ['จังหวัด', item['จังหวัด']],
    ['ประเทศ', item['ประเทศ']],
    ['พิกัด', { __html: coordHtml }],
    ['จุดประสงค์', item['จุดประสงค์'] ?? item['วัตถุประสงค์'] ?? ''],
    ['ธนาคาร', item['ธนาคาร']],
    // ใช้ acctHtml (มีปุ่มคัดลอก)
    ['เลขที่บัญชี', { __html: acctHtml }],
    ['ชื่อบัญชี', item['ชื่อบัญชี']],
    ['ป้ายประชาสัมพันธ์', { __html: bannerHtml }],
    ['เบอร์ติดต่อ', item['เบอร์ติดต่อ']],
    ['ไลน์', item['ไลน์']],
    ['Facebook', { __html: facebookHtml }],
    ['ชื่อผู้ติดต่อ', item['ชื่อผู้ติดต่อ']],
    ['หมายเหตุ', item['หมายเหตุ']],
  ];

  const rows = entries.map(([k,v])=>{
    const valueHtml = (v && typeof v === 'object' && v.__html !== undefined)
      ? v.__html
      : linkify(escapeHtml(v||''));
    return `
      <tr>
        <th style="white-space:nowrap">${escapeHtml(k)}</th>
        <td>${valueHtml}</td>
      </tr>
    `;
  }).join('');

  return `
  <div class="table-responsive text-start">
    <table class="table table-sm">
      <tbody>${rows}</tbody>
    </table>
  </div>
`;
}

async function fetchEvents(){
  const url = `${API_BASE}?action=list`;
  const res = await fetch(url, { method:'GET', cache:'no-store' });
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
  return await res.json();
}

function showDetail(item){
  const html = buildDetailTable(item);
  Swal.fire({
    title: 'รายละเอียดงานกฐิน',
    html,
    width: Math.min(window.innerWidth-32, 700),
    confirmButtonText: 'ปิด',
    customClass: { popup: 'card-mac' }
  });
}

// export ให้หน้าอื่นใช้
window.__GATHIN_APP__ = {
  fetchEvents, toThaiLongDateBuddhist, showDetail, escapeHtml
};
// export deep link & copy
window.__OPEN_MAP__ = openMapDeepLink;
window.__COPY__ = copyToClipboard;

// ===== Disclaimer popup on first visit =====
(function(){
  const KEY = 'gathin_disclaimer_ack_v1';

  function showDisclaimer(){
    // ถ้าเคยกดยอมรับและติ๊ก "ไม่ต้องแสดงอีก" แล้ว ให้ข้าม
    if (localStorage.getItem(KEY) === '1') return;

    Swal.fire({
      icon: 'info',
      title: 'ข้อจำกัดความรับผิดชอบ',
      html: `
        <div class="text-start">
          <p><strong>ระบบนี้เป็นการรวบรวมข้อมูลคร่าว ๆ เกี่ยวกับงานกฐินเท่านั้น</strong></p>
          <ul class="mb-2">
            <li>ข้อมูลอาจมีการเปลี่ยนแปลง แนะนำให้ตรวจสอบกับผู้จัดงานหรือช่องทางทางการอีกครั้ง</li>
            <li>ผู้พัฒนาระบบไม่รับผิดชอบต่อความคลาดเคลื่อน ความล่าช้า หรือความเสียหายใด ๆ จากการใช้งานข้อมูลนี้</li>
          </ul>
          <p class="mb-0"><small>หากพบข้อมูลผิดพลาด โปรดแจ้งผู้ดูแลเพื่อปรับปรุง</small></p>
        </div>
      `,
      confirmButtonText: 'เข้าใจแล้ว',
      input: 'checkbox',
      inputPlaceholder: 'ไม่ต้องแสดงอีก',
      allowOutsideClick: false,
      customClass: { popup: 'card-mac' }
    }).then(res=>{
      // ถ้าติ๊ก "ไม่ต้องแสดงอีก" ให้จำ
      if (res && res.value) {
        try { localStorage.setItem(KEY, '1'); } catch(e){}
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', showDisclaimer);
  } else {
    showDisclaimer();
  }
})();
