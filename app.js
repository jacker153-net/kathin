// ===== CONFIG =====
const API_BASE = 'https://script.google.com/macros/s/AKfycbwycbOeOEHYRt4nHQvoG9-IGZg-zgQdnO7p5niMDpj21EKMCXKrKR9k2glAjIVn23TJ/exec'; // <<< ใส่ของคุณ
const TZ = 'Asia/Bangkok';

// ===== Utils =====
/** แปลงวันที่ -> "D MMMM BBBB" (พ.ศ.) รองรับ Date/ISO/Excel serial/ข้อความไทย */
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

/** HTML helpers */
function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
function linkify(text){
  let t = String(text||'');
  t = t.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|\s)(0\d{8,9})($|\s)/g, '$1<a href="tel:$2">$2</a>$3');
  return t;
}

/** ตารางรายละเอียดสำหรับ SweetAlert2 */
function buildDetailTable(item){
  const entries = [
    ['ชื่อวัด', item['ชื่อวัด']],
    ['วันที่', toThaiLongDateBuddhist(item['วันที่'])],
    ['เวลาถวาย', item['เวลาถวาย']],
    ['อำเภอ', item['อำเภอ']],
    ['จังหวัด', item['จังหวัด']],
    ['ประเทศ', item['ประเทศ']],
    ['พิกัด', item['พิกัด']],
    ['จุดประสงค์', item['จุดประสงค์']],
    ['ธนาคาร', item['ธนาคาร']],
    ['เลขที่บัญชี', item['เลขที่บัญชี']],
    ['ชื่อบัญชี', item['ชื่อบัญชี']],
    ['ป้ายประชาสัมพันธ์', item['ป้ายประชาสัมพันธ์']],
    ['เบอร์ติดต่อ', item['เบอร์ติดต่อ']],
    ['ไลน์', item['ไลน์']],
    ['Facebook', item['Facebook']],
    ['ชื่อผู้ติดต่อ', item['ชื่อผู้ติดต่อ']],
    ['หมายเหตุ', item['หมายเหตุ']],
  ];
  const rows = entries.map(([k,v]) => `
    <tr>
      <th style="white-space:nowrap">${escapeHtml(k)}</th>
      <td>${linkify(escapeHtml(v||''))}</td>
    </tr>
  `).join('');

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

window.__GATHIN_APP__ = {
  fetchEvents, toThaiLongDateBuddhist, showDetail, escapeHtml
};
