// ===== CONFIG =====
const API_BASE = 'https://script.google.com/macros/s/AKfycbwycbOeOEHYRt4nHQvoG9-IGZg-zgQdnO7p5niMDpj21EKMCXKrKR9k2glAjIVn23TJ/exec'; // <<< ใส่ของคุณ
const TZ = 'Asia/Bangkok';

// ===== Utils =====
function toThaiLongDateBuddhist(input){
  if (!input) return '';
  let d;
  if (input instanceof Date) d = input;
  else if (!isNaN(input)) d = new Date(Math.round((Number(input) - 25569) * 86400 * 1000));
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

/** ✅ ฟังก์ชันเปิด Google Maps แบบ deep link (มือถือ) + fallback */
function openMapDeepLink(lat, lng){
  const gmapsWeb = `https://www.google.com/maps?q=${lat},${lng}`;
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let appUrl = '';
  if (isIOS){
    // เปิดแอป Google Maps ถ้ามี (iOS)
    appUrl = `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=16`;
  }else if (isAndroid){
    // เปิดแอป Google Maps ถ้ามี (Android)
    appUrl = `intent://maps.google.com/?q=${lat},${lng}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
  }

  if (appUrl){
    // พยายามเปิดแอป แล้ว fallback ไปเว็บถ้าไม่ได้
    const t = setTimeout(()=>{ window.open(gmapsWeb, '_blank', 'noopener'); }, 1200);
    // ใช้ location.href เพื่อกระตุ้น deep link
    window.location.href = appUrl;
    // ป้องกันไม่ให้ค้าง timeout ถ้าเปิดแอปสำเร็จ (หน้าอาจถูกพัก/เปลี่ยนโฟกัส)
    window.addEventListener('pagehide', ()=>clearTimeout(t), { once:true });
    window.addEventListener('blur', ()=>clearTimeout(t), { once:true });
  }else{
    // เดสก์ท็อป → เปิดหน้าเว็บ Google Maps
    window.open(gmapsWeb, '_blank', 'noopener');
  }
}

/** ตารางรายละเอียดสำหรับ SweetAlert2 (มีป้ายฯ, Facebook, ปุ่มเปิดแผนที่แบบ deep link) */
function buildDetailTable(item){
  // ป้ายประชาสัมพันธ์ (รูปจาก URL)
  const bannerVal = item['ป้ายประชาสัมพันธ์'] ?? '';
  let bannerHtml = '';
  const bannerUrls = extractUrls(bannerVal);
  bannerHtml = bannerUrls.length
    ? `<div class="d-flex flex-wrap gap-2">${
        bannerUrls.map(u=>`
          <a href="${escapeHtml(u)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(u)}" alt="ป้ายประชาสัมพันธ์"
                 style="max-width:220px;height:auto;border-radius:12px;border:1px solid #e6e6ea;box-shadow:0 4px 14px rgba(0,0,0,.08);">
          </a>`).join('')
      }</div>`
    : escapeHtml(bannerVal || '');

  // Facebook ลิงก์สั้น
  const fbVal = item['Facebook'] ?? '';
  const fbUrls = extractUrls(fbVal);
  const facebookHtml = fbUrls.length
    ? fbUrls.map((u,i)=>`<a href="${escapeHtml(u)}" target="_blank" rel="noopener">เปิด Facebook${fbUrls.length>1?` (${i+1})`:''}</a>`).join(' • ')
    : escapeHtml(fbVal || '');

  // พิกัด + ปุ่ม deep link
  const coordVal = (item['พิกัด'] ?? '').trim();
  let coordHtml = escapeHtml(coordVal);
  let lat=null, lng=null;
  if (coordVal && coordVal.includes(',')){
    const [latStr,lngStr] = coordVal.split(',').map(s=>s.trim());
    lat = parseFloat(latStr); lng = parseFloat(lngStr);
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
    ['เลขที่บัญชี', item['เลขที่บัญชี']],
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
    <div class="table-responsive">
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
// export deep link function
window.__OPEN_MAP__ = openMapDeepLink;
