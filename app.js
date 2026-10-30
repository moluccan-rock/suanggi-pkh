// ============================================
// KONFIGURASI
// ============================================
// GANTI dengan URL /exec hasil deploy Kode.gs sebagai Web App.
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMrFmI42amIs7kpqb5qxf3mgERlHS68IqR7iOUK_eacJtH29SV2A-jLqMpWXcqm6MiVg/exec';

async function panggilAPI(action, data) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // WAJIB text/plain — hindari CORS preflight yang diblok GAS
      body: JSON.stringify({ action, ...data })
    });
    return await res.json();
  } catch (err) {
    return { status: 'error', success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

/* ========== LOADER html2canvas + jsPDF (multi-CDN + fallback offline) ========== */
function __loadScriptOnce(url, timeoutMs){
return new Promise(function(resolve, reject){
var s = document.createElement('script');
s.src = url;
var done = false;
var timer = setTimeout(function(){
if(!done){ done = true; reject(new Error('Waktu tunggu habis: ' + url)); }
}, timeoutMs || 7000);
s.onload = function(){ if(!done){ done = true; clearTimeout(timer); resolve(); } };
s.onerror = function(){ if(!done){ done = true; clearTimeout(timer); reject(new Error('Gagal memuat: ' + url)); } };
document.head.appendChild(s);
});
}
window.__H2C_SOURCES = [
'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
];
window.__JSPDF_SOURCES = [
'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
];
window.__pdfEngineLoadPromise = null;
function ensurePdfEngine(){
if(window.html2canvas && window.jspdf && window.jspdf.jsPDF){ return Promise.resolve(true); }
if(window.__pdfEngineLoadPromise) return window.__pdfEngineLoadPromise;
window.__pdfEngineLoadPromise = (async function(){
for(var i = 0; i < window.__H2C_SOURCES.length; i++){
if(window.html2canvas) break;
try{ await __loadScriptOnce(window.__H2C_SOURCES[i], 7000); }catch(e){}
}
for(var j = 0; j < window.__JSPDF_SOURCES.length; j++){
if(window.jspdf && window.jspdf.jsPDF) break;
try{ await __loadScriptOnce(window.__JSPDF_SOURCES[j], 7000); }catch(e){}
}
return !!(window.html2canvas && window.jspdf && window.jspdf.jsPDF);
})();
return window.__pdfEngineLoadPromise;
}
ensurePdfEngine();
/* ========== LOADER pdf.js (multi-CDN) ========== */
window.__PDFJS_SOURCES = [
{ lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
{ lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js' },
{ lib: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js', worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js' }
];
window.__pdfjsLoadPromise = null;
function ensurePdfJs(){
if(window.pdfjsLib){ return Promise.resolve(true); }
if(window.__pdfjsLoadPromise) return window.__pdfjsLoadPromise;
window.__pdfjsLoadPromise = (async function(){
for(var i = 0; i < window.__PDFJS_SOURCES.length; i++){
if(window.pdfjsLib) break;
try{
await __loadScriptOnce(window.__PDFJS_SOURCES[i].lib, 8000);
if(window.pdfjsLib){
window.pdfjsLib.GlobalWorkerOptions.workerSrc = window.__PDFJS_SOURCES[i].worker;
}
}catch(e){}
}
return !!window.pdfjsLib;
})();
return window.__pdfjsLoadPromise;
}
ensurePdfJs();
/* ========== LOADER heic2any (multi-CDN) ========== */
window.__HEIC2ANY_SOURCES = [
'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js'
];
window.__heic2anyLoadPromise = null;
function ensureHeicConverter(){
if(window.heic2any){ return Promise.resolve(true); }
if(window.__heic2anyLoadPromise) return window.__heic2anyLoadPromise;
window.__heic2anyLoadPromise = (async function(){
for(var i = 0; i < window.__HEIC2ANY_SOURCES.length; i++){
if(window.heic2any) break;
try{ await __loadScriptOnce(window.__HEIC2ANY_SOURCES[i], 8000); }catch(e){}
}
return !!window.heic2any;
})();
return window.__heic2anyLoadPromise;
}
ensureHeicConverter();
function isHeicFile(file){
const type = (file.type || '').toLowerCase();
const name = (file.name || '').toLowerCase();
return type === 'image/heic' || type === 'image/heif' || type === 'image/heic-sequence' || type === 'image/heif-sequence'
|| name.endsWith('.heic') || name.endsWith('.heif');
}
/* Baca 32 byte pertama file untuk mengenali isi sebenarnya (nama/MIME bisa bohong,
   mis. foto HEIC yang diberi nama .jpeg oleh iPhone/Mac saat dibagikan). */
async function sniffFormatFile(file){
try{
let buf;
const potong = file.slice(0, 32);
if(potong.arrayBuffer){ buf = await potong.arrayBuffer(); }
else{
buf = await new Promise((res, rej)=>{ const r = new FileReader(); r.onload = ()=> res(r.result); r.onerror = rej; r.readAsArrayBuffer(potong); });
}
const b = new Uint8Array(buf);
const asc = (a, z)=> String.fromCharCode.apply(null, Array.prototype.slice.call(b, a, z));
if(b.length >= 12 && asc(4, 8) === 'ftyp'){
const brand = asc(8, 12).toLowerCase();
if(['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1','heif'].indexOf(brand) >= 0) return 'heic';
if(brand === 'avif' || brand === 'avis') return 'avif';
}
if(b[0] === 0xFF && b[1] === 0xD8) return 'jpeg';
if(b[0] === 0x89 && asc(1, 4) === 'PNG') return 'png';
if(asc(0, 4) === 'RIFF' && asc(8, 12) === 'WEBP') return 'webp';
if(asc(0, 3) === 'GIF') return 'gif';
if(b[0] === 0x42 && b[1] === 0x4D) return 'bmp';
if(asc(0, 4) === '%PDF') return 'pdf';
}catch(e){}
return '';
}
async function convertHeicToJpegFile(file){
const ready = await ensureHeicConverter();
if(!ready || !window.heic2any){
throw new Error('Komponen pengonversi HEIC (heic2any) tidak dapat dimuat — kemungkinan tidak ada koneksi internet atau domain CDN diblokir jaringan.');
}
const result = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
const blob = Array.isArray(result) ? result[0] : result;
const newName = (file.name || 'foto').replace(/\.(heic|heif|jpe?g|png)$/i, '') + '.jpg';
return new File([blob], newName, { type: 'image/jpeg' });
}
/* ========== TEMA TAMPILAN ==========
   Pilihan disimpan di perangkat (localStorage). Pemilih hanya ada di layar Pilih Jabatan.
   Kertas laporan/PDF tidak terpengaruh (dikunci di CSS). */
const TEMA_NAMA = { 'default':'Default', teluk:'Teluk Ambon', maroon:'Maroon Emas', kopi:'Kopi', malam:'Malam', kaca:'Kaca' };
function temaTerapkan(nama, simpan){
  if(!TEMA_NAMA[nama]) nama = 'default';
  var root = document.documentElement;
  if(nama === 'default') root.removeAttribute('data-tema'); else root.setAttribute('data-tema', nama);
  if(simpan){ try{ if(nama === 'default') localStorage.removeItem('suanggi_tema'); else localStorage.setItem('suanggi_tema', nama); }catch(e){} }
  var dots = document.querySelectorAll('#temaPicker .tema-dot');
  for(var i = 0; i < dots.length; i++){ dots[i].setAttribute('aria-checked', dots[i].getAttribute('data-tema') === nama ? 'true' : 'false'); }
  var label = document.getElementById('temaNama');
  if(label) label.textContent = TEMA_NAMA[nama];
}
(function temaInit(){
  var tersimpan = 'default';
  try{ tersimpan = localStorage.getItem('suanggi_tema') || 'default'; }catch(e){}
  temaTerapkan(tersimpan, false);
  var dots = document.querySelectorAll('#temaPicker .tema-dot');
  for(var i = 0; i < dots.length; i++){
    dots[i].addEventListener('click', function(){ temaTerapkan(this.getAttribute('data-tema'), true); });
  }
})();
/* ========== STATE ========== */
let state = {
jabatan: "",
rhkNo: null,
aksiIdx: null,
bulan:"Agustus", tahun:"2026", nama:"", nip:"", lokasi:"Ambon", tanggal:"",
umum:"", maksud:"", ruang:"", pendahuluanTouched:false,
dasar:["Undang-Undang Nomor 13 Tahun 2011 tentang Penanganan Fakir Miskin.","Peraturan Menteri Sosial Nomor 8 Tahun 2026 tentang Program Keluarga Harapan.","Peraturan Menteri Sosial Nomor 8 Tahun 2022 tentang Tata Naskah Dinas di Lingkungan Kementerian Sosial."],
bUraian:"", hasil:"", kesimpulan:"", saran:"", penutup:"", kegiatanTouched:false,
ttd:null, dok:[], lamp:[],
p2k2:{noUrut:'',noKode:'',desa:'',kec:'',jenisKab:'Kota',kab:'',prov:'',tglKegiatan:'',jamMulai:'',jamSelesai:'',tempat:'',pemateriSaya:true,pemateriLain:[],materi:'',modul:'',hadir:'',sakit:'',alpa:'',rangkuman:''}
};
// Salinan bersih nilai awal 'state' — dipakai untuk reset total saat logout
// TANPA location.reload() (lihat penjelasan bug di handleLogout()).
const STATE_AWAL = JSON.parse(JSON.stringify(state));
function fmtIDR2(n){ return n; }
/* ========== LOGIN & KREDIT AI ========== */
let currentUser = null;
/* ========== SafeStorage: wrapper localStorage yang aman terhadap Tracking Prevention ========== */
const SafeStorage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage diblokir, abaikan */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage diblokir, abaikan */ } }
};

/* ========== LOGIN & KREDIT AI (berbasis NIP + Token, lihat Kode.js) ========== */
/*
 * PERBAIKAN KEAMANAN: versi sebelumnya menyimpan TOKEN mentah di localStorage
 * supaya bisa auto-login. localStorage bisa dibaca lewat DevTools oleh siapa
 * pun yang punya akses ke perangkat/browser korban, atau lewat XSS kalau ada
 * celah injeksi di tempat lain — token yang bocor dari sana bisa dipakai
 * langsung tanpa perlu tahu password/OTP apa pun.
 * Sekarang HANYA NIP (+ waktu) yang disimpan, sekadar untuk MEMPERCEPAT
 * pengisian form (NIP tidak perlu diketik ulang) — Token WAJIB selalu
 * diketik ulang setiap kali membuka aplikasi, sepanjang masa akses berlaku.
 */
function cekStatusLogin(){
  var saved = null;
  try{ saved = JSON.parse(SafeStorage.get('suanggi_login') || 'null'); }catch(e){ saved = null; }

  tampilkanFormLogin();
  if(saved && saved.nip){
    var inputNip = document.getElementById('loginNip');
    if(inputNip) inputNip.value = saved.nip;
    var inputToken = document.getElementById('loginToken');
    if(inputToken) inputToken.focus();
  }
}

function tampilkanFormLogin(){
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('registerSuccessBox').style.display = 'none';
  document.getElementById('perpanjanganForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('loginError').style.display = 'none';
}

function tampilkanFormDaftar(){
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerSuccessBox').style.display = 'none';
  document.getElementById('perpanjanganForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginError').style.display = 'none';
}

/* Muncul otomatis saat token kedaluwarsa (dari login gagal atau saat sesi aktif berakhir) */
function tampilkanFormPerpanjangan(nip, nama, pesan){
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('registerSuccessBox').style.display = 'none';
  document.getElementById('perpanjanganForm').style.display = 'block';
  document.getElementById('perpanjanganNip').value = nip;
  document.getElementById('perpanjanganTitle').textContent = pesan || ('Masa aktif akun ' + (nama||'') + ' sudah berakhir.');
  document.getElementById('loginError').style.display = 'none';
}

function prosesAjukanPerpanjangan(){
  var nip = document.getElementById('perpanjanganNip').value;
  var hari = document.getElementById('perpanjanganHari').value;
  var errBox = document.getElementById('loginError');
  errBox.style.display = 'none';

  if(!hari || Number(hari) <= 0){
    errBox.textContent = 'Jumlah hari yang diminta wajib diisi (angka lebih dari 0).';
    errBox.style.display = 'block';
    return;
  }
  if(Number(hari) > 7){
    errBox.textContent = 'Maksimal pengajuan akses adalah 7 hari.';
    errBox.style.display = 'block';
    return;
  }

  panggilAPI('ajukanPerpanjangan', { nip: nip, jumlahHariDiminta: hari }).then(function(res){
      if(res.status === 'success'){
        tampilkanFormPerpanjangan(nip, '', res.message);
        document.getElementById('perpanjanganHari').value = '';
        document.getElementById('perpanjanganTitle').style.color = '#6ffbbe';
      } else {
        errBox.textContent = res.message;
        errBox.style.display = 'block';
      }
    }).catch(function(err){
      errBox.textContent = 'Gagal terhubung ke server: ' + err.message;
      errBox.style.display = 'block';
    });
}

var sedangLogin = false;
/* Loading bola memantul di gerbang login. tanpaForm=true: jangan tampilkan lagi form login (dipakai saat pindah ke form perpanjangan) */
function tampilBolaLogin(aktif, tanpaForm){
  var bola = document.getElementById('loginBounce');
  var form = document.getElementById('loginForm');
  var btn = document.getElementById('btnLoginMasuk');
  if(btn) btn.disabled = !!aktif;
  if(aktif){
    form.style.display = 'none';
    bola.style.display = 'block';
    document.getElementById('loginError').style.display = 'none';
  } else {
    bola.style.display = 'none';
    if(!tanpaForm) form.style.display = 'block';
  }
}

function prosesLoginToken(){
  var nip = (document.getElementById('loginNip').value || '').trim();
  var token = (document.getElementById('loginToken').value || '').trim();
  var errBox = document.getElementById('loginError');
  errBox.style.display = 'none';

  if(!nip || !token){
    errBox.textContent = 'NIP dan Token wajib diisi.';
    errBox.style.display = 'block';
    return;
  }

  if(sedangLogin) return; // cegah klik ganda
  sedangLogin = true;
  tampilBolaLogin(true);

  panggilAPI('loginDenganToken', { nip: nip, token: token }).then(function(res){
      if(res.status === 'success'){
        currentUser = res.data;
        currentUser.token = token;
        SafeStorage.set('suanggi_login', JSON.stringify({ nip: nip, ts: Date.now() })); // token SENGAJA tidak disimpan (lihat catatan keamanan di cekStatusLogin)
        // Bola tetap memantul; gerbang login baru ditutup setelah daftar jabatan selesai dimuat.
        masukKeAplikasi(true);
      } else if(res.status === 'expired'){
        sedangLogin = false; tampilBolaLogin(false, true);
        tampilkanFormPerpanjangan(res.data.nip, res.data.nama, res.message);
      } else {
        sedangLogin = false; tampilBolaLogin(false);
        errBox.textContent = res.message;
        errBox.style.display = 'block';
      }
    }).catch(function(err){
      sedangLogin = false; tampilBolaLogin(false);
      errBox.textContent = 'Gagal terhubung ke server: ' + err.message;
      errBox.style.display = 'block';
    });
}

function prosesRegistrasi(){
  var nama = (document.getElementById('regNama').value || '').trim();
  var nip = (document.getElementById('regNip').value || '').trim();
  var hp = (document.getElementById('regHp').value || '').trim();
  var hari = (document.getElementById('regHari').value || '').trim();
  var errBox = document.getElementById('loginError');
  errBox.style.display = 'none';

  if(!nip || !hp || !nama){
    errBox.textContent = 'Nama, NIP, dan No. WhatsApp/Telegram wajib diisi.';
    errBox.style.display = 'block';
    return;
  }
  if(!hari || Number(hari) <= 0){
    errBox.textContent = 'Jumlah hari akses yang diminta wajib diisi (angka lebih dari 0).';
    errBox.style.display = 'block';
    return;
  }
  if(Number(hari) > 7){
    errBox.textContent = 'Maksimal pengajuan akses adalah 7 hari.';
    errBox.style.display = 'block';
    return;
  }

  panggilAPI('daftarUser', { nama: nama, nip: nip, noWa: hp, jumlahHariDiminta: hari }).then(function(res){
      if(res.status === 'success'){
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('registerSuccessBox').style.display = 'block';
      } else {
        errBox.textContent = res.message;
        errBox.style.display = 'block';
      }
    }).catch(function(err){
      errBox.textContent = 'Gagal terhubung ke server: ' + err.message;
      errBox.style.display = 'block';
    });
}

function masukKeAplikasi(tahanGerbang){
  // tahanGerbang=true (login manual): gerbang login ditutup nanti, setelah daftar jabatan selesai dimuat.
  if(!tahanGerbang) document.getElementById('loginGate').style.display = 'none';
  // PERBAIKAN BUG: baris ini SEBELUMNYA ikut menghapus class 'role-locked',
  // yang seharusnya HANYA dihapus oleh selectJabatan() setelah pengguna
  // benar-benar memilih jabatan. Akibatnya wizard langsung melompat ke
  // Step 2 dengan data RHK kosong. Login hanya boleh membuka gerbang LOGIN,
  // gerbang "Pilih Jabatan" tetap tampil normal seperti semula.
  if(currentUser && currentUser.nama){
    var fNama = document.getElementById('f_nama');
    if(fNama){ fNama.value = currentUser.nama; fNama.readOnly = true; state.nama = currentUser.nama; }
  }
  if(currentUser && currentUser.nip){
    var fNip = document.getElementById('f_nip');
    if(fNip){ fNip.value = currentUser.nip; fNip.readOnly = true; state.nip = currentUser.nip; }
  }
  updateCreditBadge();

  var btnLogout = document.getElementById('btnLogoutFloating');
  if(btnLogout) btnLogout.style.display = 'inline-flex';
  mulaiPantauIdle();
  mulaiPantauKedaluwarsaToken();

  // PEMBARUAN KEAMANAN: data RHK/Indikator/Rencana Aksi TIDAK LAGI tertanam
  // di kode yang dikirim ke browser sejak awal (dulu bisa dilihat siapa pun
  // lewat DevTools walau belum login). Sekarang baru diambil dari server
  // SETELAH sesi NIP+Token tervalidasi di sini, baru daftar jabatan dirender.
  var roleList = document.getElementById('roleList');
  if(roleList) roleList.innerHTML = '<div class="suanggi-loader" style="padding:10px 0 20px;">' +
    '<svg class="suanggi-loader-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs><radialGradient id="suanggiCoreGrad2" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0%" stop-color="#fff5e0"/><stop offset="40%" stop-color="#ff8a3d"/><stop offset="100%" stop-color="#ff2d2d" stop-opacity="0"/>' +
    '</radialGradient></defs>' +
    '<circle class="suanggi-orbit-ring" cx="50" cy="50" r="34"/>' +
    '<circle class="suanggi-core" cx="50" cy="50" r="12" fill="url(#suanggiCoreGrad2)"/>' +
    '<g class="suanggi-orbit"><circle class="suanggi-spark" cx="50" cy="16" r="3" fill="#ff5a36"/></g>' +
    '<g class="suanggi-orbit suanggi-orbit-2"><circle class="suanggi-spark" cx="50" cy="20" r="2.6" fill="#ffb020"/></g>' +
    '<g class="suanggi-orbit suanggi-orbit-3"><circle class="suanggi-spark" cx="50" cy="12" r="2.2" fill="#ffe27a"/></g>' +
    '</svg>' +
    '<p class="suanggi-loader-text" style="color:#fff;">Memuat data jabatan<span class="suanggi-dots"><span>.</span><span>.</span><span>.</span></span></p>' +
    '</div>';

  // CATATAN MIGRASI: ambilDataJabatan() di backend lama melempar exception
  // (throw new Error) saat sesi tidak valid. Di backend REST baru, exception
  // itu ditangkap di server dan dikirim balik sebagai {success:false, message}
  // (bukan HTTP error) — maka di sini pengecekannya memakai res.success,
  // bukan lagi mengandalkan withFailureHandler/exception seperti sebelumnya.
  panggilAPI('ambilDataJabatan', { nip: currentUser.nip, token: currentUser.token }).then(function(res){
      if(res.success){
        JABATAN_DATA = res.jabatanData || {};
        JABATAN_META = res.jabatanMeta || {};
        renderRoleList();
        if(tahanGerbang) selesaiBolaLogin();
      } else {
        if(roleList) roleList.innerHTML = '<p style="text-align:center;color:#dc2626;font-size:12px;padding:20px;">Gagal memuat data jabatan: ' + res.message + '. Coba muat ulang halaman.</p>';
        if(tahanGerbang) selesaiBolaLogin();
      }
    }).catch(function(err){
      if(roleList) roleList.innerHTML = '<p style="text-align:center;color:#dc2626;font-size:12px;padding:20px;">Gagal memuat data jabatan: ' + err.message + '. Coba muat ulang halaman.</p>';
      if(tahanGerbang) selesaiBolaLogin();
    });
}

/* Menutup gerbang login + menghentikan bola setelah tahap memuat jabatan selesai */
function selesaiBolaLogin(){
  sedangLogin = false;
  document.getElementById('loginGate').style.display = 'none';
  tampilBolaLogin(false, true);
}

/* =================== PANTAU MASA AKTIF TOKEN (Kredit = jumlah hari pakai) =================== */
// Dicek berkala (bukan cuma sekali saat login) supaya kalau masa aktif habis
// SAAT user sedang aktif memakai aplikasi, otomatis logout ke gerbang login
// tanpa perlu menunggu user me-refresh halaman sendiri.
var timerCekExpired = null;
function mulaiPantauKedaluwarsaToken(){
  clearInterval(timerCekExpired);
  if(!currentUser || !currentUser.tanggalExpired) return;
  timerCekExpired = setInterval(function(){
    updateCreditBadge();
    if(new Date(currentUser.tanggalExpired) < new Date()){
      clearInterval(timerCekExpired);
      SafeStorage.remove('suanggi_login');
      var nipUser = currentUser.nip, namaUser = currentUser.nama;
      currentUser = null;
      document.body.classList.add('role-locked');
      document.body.classList.remove('step-edit', 'step-rhk');
      document.getElementById('btnLogoutFloating').style.display = 'none';
      document.getElementById('loginGate').style.display = 'flex';
      tampilkanFormPerpanjangan(nipUser, namaUser, 'Masa aktif akun Anda telah berakhir saat sesi ini berlangsung.');
    }
  }, 5 * 60 * 1000); // cek tiap 5 menit — cukup responsif tanpa membebani server
}

/* =================== LOGOUT & AUTO-LOGOUT KARENA TIDAK AKTIF =================== */
var BATAS_IDLE_MS = 30 * 60 * 1000; // 30 menit tanpa aktivitas -> otomatis keluar
var timerIdle = null;

function mulaiPantauIdle(){
  resetTimerIdle();
  ['mousemove','keydown','click','touchstart','scroll','wheel'].forEach(function(evt){
    document.addEventListener(evt, resetTimerIdle, { passive: true });
  });
}
function resetTimerIdle(){
  if(!currentUser) return; // hanya berlaku selagi ada sesi login aktif
  clearTimeout(timerIdle);
  timerIdle = setTimeout(function(){ handleLogout(true); }, BATAS_IDLE_MS);
}

function handleLogout(otomatis){
  clearTimeout(timerIdle);
  clearInterval(timerCekExpired);
  SafeStorage.remove('suanggi_login');
  currentUser = null;

  // PERBAIKAN BUG: location.reload() TIDAK bekerja normal di dalam iframe
  // sandbox Google Apps Script — alih-alih memuat ulang aplikasi dengan
  // benar, browser malah me-reload shell sandbox-nya sendiri yang kosong,
  // sehingga layar jadi putih total sampai pengguna menekan F5 manual.
  // Solusi: reset SEMUA data & tampilan secara manual di JavaScript, tanpa
  // benar-benar memuat ulang halaman. Hasil akhirnya sama (data bersih,
  // aman dipakai bergantian), tapi tanpa bug layar putih.

  // 1) Kembalikan 'state' ke nilai awal yang bersih (hapus draf laporan,
  //    foto yang sudah diunggah, tanda tangan, dsb. — mencegah data
  //    pengguna sebelumnya "nempel" ke sesi berikutnya di perangkat sama).
  Object.keys(state).forEach(function(k){ delete state[k]; });
  Object.assign(state, JSON.parse(JSON.stringify(STATE_AWAL)));
  currentStep = 2;

  // 2) Bersihkan area-area dinamis yang sudah terlanjur dirender ke DOM
  ['rhkPickWrap','dokGrid','lampList','paper'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.innerHTML = '';
  });
  var ttdBox = document.getElementById('ttdPreviewBox'); if(ttdBox) ttdBox.style.display = 'none';
  var ttdSizeBox = document.getElementById('ttdSizeBox'); if(ttdSizeBox) ttdSizeBox.style.display = 'none';
  if(typeof ttdResetSemua === 'function') ttdResetSemua();
  if(typeof aiJawabanReset === 'function') aiJawabanReset(); // lupakan foto TTD sumber & sembunyikan panel hapus latar
  var dropTtd = document.getElementById('dropTtd'); if(dropTtd) dropTtd.style.display = '';
  document.querySelectorAll('input[type="file"]').forEach(function(inp){ inp.value = ''; });
  var roleBadge = document.getElementById('roleBadgeName'); if(roleBadge) roleBadge.textContent = '-';
  document.getElementById('btnToStep3').disabled = true;
  document.getElementById('btnToStep3Top').disabled = true;

  // 3) Kembalikan tampilan ke gerbang Pilih Jabatan + gerbang Login
  document.getElementById('btnLogoutFloating').style.display = 'none';
  document.body.classList.add('role-locked');
  document.body.classList.remove('step-edit', 'step-rhk');
  document.getElementById('viewRhk').style.display = '';
  document.getElementById('viewEdit').style.display = 'none';

  document.getElementById('loginGate').style.display = 'flex';
  tampilkanFormLogin();

  if(otomatis){
    var errBox = document.getElementById('loginError');
    errBox.textContent = 'Sesi berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.';
    errBox.style.display = 'block';
  }
}
document.getElementById('btnLogoutFloating').addEventListener('click', function(){
  handleLogout(false);
});
document.getElementById('btnLogoutTop').addEventListener('click', function(){
  handleLogout(false);
});

/* Badge menampilkan SISA HARI AKSES (Kredit = jumlah hari pakai), dihitung
   dari tanggal kedaluwarsa yang dikirim server — bukan lagi sisa kredit AI. */
function updateCreditBadge(){
  var badge = document.getElementById('creditBadge');
  if(!badge) return;
  if(!currentUser || !currentUser.tanggalExpired){ badge.style.display = 'none'; return; }
  var msSisa = new Date(currentUser.tanggalExpired) - new Date();
  var hariSisa = Math.max(0, Math.ceil(msSisa / 86400000));
  badge.style.display = '';
  badge.textContent = '⏳ Sisa Akses: ' + hariSisa + ' hari';
  badge.classList.toggle('low', hariSisa <= 3);
}

function showPaywallModal(){
  var overlay = document.getElementById('paywallOverlay');
  if(overlay) overlay.style.display = 'flex';
}

function tutupPaywall(){
  var overlay = document.getElementById('paywallOverlay');
  if(overlay) overlay.style.display = 'none';
}

/* Wrapper panggilan AI dengan pengecekan & pemotongan kredit, dikunci berdasarkan NIP.
   Kredit dikembalikan otomatis (refund) jika panggilan AI ke server gagal. */
async function callClaudeAI_withCredit(prompt){
  if(!currentUser || !currentUser.nip || !currentUser.token){
    throw new Error('Anda belum login. Silakan login kembali.');
  }
  // Validasi sesi (NIP+Token, status aktif, masa aktif) dilakukan di SERVER.
  // Pemakaian AI tidak memotong hari akses.
  return await new Promise((resolve, reject)=>{
    // CATATAN MIGRASI: sempurnakanDenganAI() mengembalikan teks string biasa
    // saat sukses, dan {success:false, message:...} saat gagal (lihat Kode.gs).
    panggilAPI('sempurnakanDenganAI', { nip: currentUser.nip, token: currentUser.token, prompt: prompt }).then(function(res){
      if(res && typeof res === 'object' && res.success === false){
        reject(new Error(res.message || 'Permintaan AI gagal.'));
      } else {
        resolve(res);
      }
    }).catch(function(err){ reject(new Error(err && err.message ? err.message : 'Permintaan AI gagal.')); });
  });
}

async function generateWithAI(promptBuilder, textareaId, statusId, btn){
  var statusEl = document.getElementById(statusId);
  var ta = document.getElementById(textareaId);
  btn.disabled = true;
  if(statusEl) statusEl.textContent = 'Menghasilkan teks...';
  try{
    var prompt = promptBuilder();
    var text = await callClaudeAI_withCredit(prompt);
    ta.value = text;
    ta.dispatchEvent(new Event('input'));
    if(statusEl) statusEl.textContent = 'Selesai.';
    setTimeout(function(){ if(statusEl) statusEl.textContent=''; }, 2500);
  }catch(err){
    if(statusEl) statusEl.textContent = ('Gagal: ' + err.message);
  }finally{
    btn.disabled = false;
  }
}

cekStatusLogin();
/*__AKHIR_BAGIAN_1__*/
/* =================== DATA: JABATAN & RHK (dari MATRIKS_JABATAN.xlsx) =================== */
let JABATAN_DATA = {}; // PINDAH KE SERVER: kosong sampai login berhasil (lihat ambilDataJabatan di Kode.js)
let JABATAN_META = {}; // idem
/* Gambar kop surat (base64) — JANGAN diedit/disalin ulang manual.
Baris di bawah ini harus tetap SATU baris panjang tanpa patah baris. */
const KOP_IMAGE_DATA_URL = "data:image/jpeg;base64,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";
/*__AKHIR_BAGIAN_2__*/
/* =================== STATE =================== */
/* =================== LOGIN & KREDIT: fungsi pendukung UI =================== */
/* =================== STEP 1: ROLE GATE =================== */
function renderRoleList(){
const wrap = document.getElementById('roleList');
wrap.innerHTML = '';
Object.keys(JABATAN_DATA).forEach((key, idx)=>{
const meta = JABATAN_META[key] || {label:key, desc:''};
const div = document.createElement('div');
div.className = 'role-opt';
div.innerHTML = `<div class="r-ic">${idx+1}</div><div><div class="r-name">${meta.label}</div><div class="r-desc">${meta.desc}</div></div>`;
div.addEventListener('click', ()=> selectJabatan(key));
wrap.appendChild(div);
});
}
function selectJabatan(key){
state.jabatan = key;
state.rhkNo = null;
state.aksiIdx = null;
state.pendahuluanTouched = false;
state.kegiatanTouched = false;
document.body.classList.remove('role-locked');
document.getElementById('roleBadgeName').textContent = (JABATAN_META[key]||{}).label || key;
if(currentUser && currentUser.nip && currentUser.token){ panggilAPI('updateUserRole', { nip: currentUser.nip, token: currentUser.token, role: key }).catch(function(){}); }
goToStep(2);
renderRhkPicker();
}
document.getElementById('btnChangeRole').addEventListener('click', ()=>{
document.body.classList.add('role-locked');
});
/* Tombol "Ganti RHK" — hanya tampil & aktif di Langkah 3 (Edit Laporan). */
document.getElementById('btnChangeRhk').addEventListener('click', ()=>{
goToStep(2);
renderRhkPicker();
});
/* =================== STEP INDICATOR =================== */
let currentStep = 2;
function renderSteps(){
const bar = document.getElementById('stepsBar');
const labels = [
{n:1,l:'Pilih Jabatan'},
{n:2,l:'Pilih RHK & Rencana Aksi'},
{n:3,l:'Edit Laporan'}
];
bar.innerHTML = labels.map((s,i)=>{
const cls = s.n < currentStep ? 'done' : (s.n === currentStep ? 'active':'');
const line = i < labels.length-1 ? '<div class="step-line"></div>' : '';
return `<div class="step-item ${cls}"><div class="step-dot">${s.n < currentStep ? '&check;' : s.n}</div><div class="step-label">${s.l}</div></div>${line}`;
}).join('');
}
function goToStep(n){
currentStep = n;
renderSteps();
document.getElementById('viewRhk').style.display = n===2 ? '' : 'none';
document.getElementById('viewEdit').style.display = n===3 ? '' : 'none';
document.body.classList.toggle('step-edit', n===3);
document.body.classList.toggle('step-rhk', n===2); // dipakai CSS untuk menampilkan tombol sticky "Lanjut ke Edit Laporan" di topbar
window.scrollTo({top:0, behavior:'smooth'});
}
/* =================== STEP 2: PILIH RHK & RENCANA AKSI =================== */
function renderRhkPicker(){
const wrap = document.getElementById('rhkPickWrap');
const list = JABATAN_DATA[state.jabatan] || [];
wrap.innerHTML = '';
list.forEach(item=>{
const sel = state.rhkNo === item.no;
const box = document.createElement('div');
box.className = 'rhk-pick' + (sel ? ' sel' : '');
box.innerHTML = `
<label class="rhk-pick-head">
<input type="radio" name="rhkPick" ${sel?'checked':''} data-rhk="${item.no}">
<div>
<div class="rhk-pick-no">RHK #${item.no}</div>
<div class="rhk-pick-title">${item.rhk}</div>
<div class="rhk-pick-sub">${item.rhkPimpinan}</div>
<span class="rhk-pick-indikator">Indikator: ${item.indikator || '-'}</span>
</div>
</label>
<div class="aksi-wrap">
<div class="aksi-title">Pilih 1 Rencana Aksi yang Dikerjakan</div>
${item.aksi.map((a,idx)=>`
<label class="aksi-opt">
<input type="radio" name="aksiPick-${item.no}" data-aksi="${item.no}:${idx}" ${sel && state.aksiIdx===idx?'checked':''}>
<span>${a}</span>
</label>`).join('')}
</div>`;
wrap.appendChild(box);
});
wrap.querySelectorAll('[data-rhk]').forEach(r=>{
r.addEventListener('change', ()=>{
state.rhkNo = parseInt(r.dataset.rhk,10);
state.aksiIdx = null;
renderRhkPicker();
checkStep2Complete();
});
});
wrap.querySelectorAll('[data-aksi]').forEach(r=>{
r.addEventListener('change', ()=>{
const [no, idx] = r.dataset.aksi.split(':');
state.rhkNo = parseInt(no,10);
state.aksiIdx = parseInt(idx,10);
checkStep2Complete();
});
});
checkStep2Complete();
}
function checkStep2Complete(){
var siap = (state.rhkNo !== null && state.aksiIdx !== null);
document.getElementById('btnToStep3').disabled = !siap;
document.getElementById('btnToStep3Top').disabled = !siap; // versi sticky di topbar ikut disable/enable bersamaan
}
function lanjutKeEditLaporan(){
goToStep(3);
renderBSummary();
p2k2Setup();
maybeAutofillPendahuluan();
maybeAutofillKegiatan();
renderPreview();
fitPreviewZoom();
}
document.getElementById('btnToStep3').addEventListener('click', lanjutKeEditLaporan);
document.getElementById('btnToStep3Top').addEventListener('click', lanjutKeEditLaporan);
document.getElementById('btnBackStep2').addEventListener('click', ()=>{
goToStep(2);
renderRhkPicker();
});
function getSelectedRhk(){
const list = JABATAN_DATA[state.jabatan] || [];
return list.find(r=> r.no === state.rhkNo) || null;
}
function getSelectedAksiText(){
const item = getSelectedRhk();
if(!item || state.aksiIdx===null) return '';
return item.aksi[state.aksiIdx] || '';
}
/* =================== STEP 3: RENDER B SUMMARY (no checkboxes) =================== */
function renderBSummary(){
const item = getSelectedRhk();
document.getElementById('bRhkVal').textContent = item ? item.rhk : '-';
document.getElementById('bAksiVal').textContent = getSelectedAksiText() || '-';
}
/* =================== DASAR HUKUM (dynamic lines) =================== */
function renderDasar(){
const wrap = document.getElementById('dasarWrap');
wrap.innerHTML = '';
state.dasar.forEach((d,i)=>{
const row = document.createElement('div');
row.style.display='flex'; row.style.gap='6px'; row.style.marginBottom='6px';
row.innerHTML = `<input type="text" data-dasar-idx="${i}" value="${d.replace(/"/g,'&quot;')}" style="flex:1;">
<button type="button" class="btn btn-outline doc-remove" data-dasar-del="${i}">&times;</button>`;
wrap.appendChild(row);
});
wrap.querySelectorAll('[data-dasar-idx]').forEach(inp=>{
inp.addEventListener('input', ()=>{ state.dasar[+inp.dataset.dasarIdx] = inp.value; renderPreview(); });
});
wrap.querySelectorAll('[data-dasar-del]').forEach(btn=>{
btn.addEventListener('click', ()=>{ state.dasar.splice(+btn.dataset.dasarDel,1); renderDasar(); renderPreview(); });
});
}
document.getElementById('btnAddDasar').addEventListener('click', ()=>{
state.dasar.push('');
renderDasar();
});
/* =================== FILE UPLOADS (ttd, dok, lampiran) =================== */
function fileToDataUrl(file){
return new Promise((res,rej)=>{
const r = new FileReader();
r.onload = ()=> res(r.result);
r.onerror = rej;
r.readAsDataURL(file);
});
}
function fmtBytes(b){
if(b<1024) return b+' B';
if(b<1024*1024) return (b/1024).toFixed(1)+' KB';
return (b/1024/1024).toFixed(1)+' MB';
}
const dropTtd = document.getElementById('dropTtd');
const f_ttd = document.getElementById('f_ttd');
const f_ttdSize = document.getElementById('f_ttdSize');
const TTD_DEFAULT_MAX_W = 130;   // lebar bawaan TTD di lembar (px)
const TTD_GAMBAR_W = 150;        // lebar bawaan untuk TTD yang digambar langsung
const TTD_MAX_PX = 800;          // sisi terpanjang gambar TTD disimpan maksimal segini (hemat memori & ukuran PDF)
const TTD_BG_DEFAULT = 35;       // kekuatan hapus latar bawaan (0-100)

// @@TTD_PURE_START
/* ---------- Pemrosesan gambar TTD: hapus latar -> PNG transparan (dikerjakan di browser) ---------- */
/* Kecilkan gambar ke kanvas dengan sisi terpanjang <= maxPx (tidak pernah diperbesar). */
function ttdBuatKanvas(img, maxPx){
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const sk = Math.min(1, maxPx / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * sk)), h = Math.max(1, Math.round(h0 * sk));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}
/* Apakah gambar ini sudah punya bagian transparan (mis. PNG hasil edit)? */
function ttdSudahTransparan(kanvas){
  const d = kanvas.getContext('2d').getImageData(0, 0, kanvas.width, kanvas.height).data;
  let n = 0;
  for(let p = 3; p < d.length; p += 4){ if(d[p] < 250) n++; }
  return n > (d.length / 4) * 0.005;
}
/* Potong kanvas ke kotak terkecil yang memuat piksel tak-transparan (+ padding). null jika kosong. */
function ttdPotongKotak(kanvas, pad){
  const w = kanvas.width, h = kanvas.height;
  const d = kanvas.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for(let y = 0; y < h; y++){
    for(let x = 0, p = (y * w) * 4 + 3; x < w; x++, p += 4){
      if(d[p] > 10){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    }
  }
  if(x1 < 0) return null;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const c = document.createElement('canvas');
  c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
  c.getContext('2d').drawImage(kanvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}
/* Hapus latar kertas dari foto/scan tanda tangan.
   1) Warna kertas diperkirakan PER WILAYAH (grid, persentil 85 tiap kanal) -> bayangan & cahaya
      tidak merata tidak ikut dianggap tinta.
   2) Seberapa lebih gelap sebuah piksel dibanding kertas di sekitarnya => alpha (transparansi) halus.
   3) Warna tinta dikembalikan ke warna aslinya (un-blend terhadap kertas) agar tepi tidak berhalo putih.
   kekuatan 0-100: makin besar makin agresif membuang latar/bayangan. Mengembalikan kanvas (sudah dipotong rapat) atau null jika kosong. */
function ttdHapusLatar(src, kekuatan){
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const GX = Math.max(2, Math.min(16, Math.round(w / 40))), GY = Math.max(2, Math.min(16, Math.round(h / 40)));
  const bg = new Float32Array(GX * GY * 3);
  const hist = new Uint32Array(256);
  for(let gy = 0; gy < GY; gy++){
    const y0 = Math.floor(gy * h / GY), y1 = Math.floor((gy + 1) * h / GY);
    for(let gx = 0; gx < GX; gx++){
      const x0 = Math.floor(gx * w / GX), x1 = Math.floor((gx + 1) * w / GX);
      const total = Math.max(1, (x1 - x0) * (y1 - y0));
      for(let c = 0; c < 3; c++){
        hist.fill(0);
        for(let y = y0; y < y1; y++){
          let p = (y * w + x0) * 4 + c;
          for(let x = x0; x < x1; x++, p += 4) hist[d[p]]++;
        }
        const target = total * 0.85; let acc = 0, v = 255;
        for(let i = 0; i < 256; i++){ acc += hist[i]; if(acc >= target){ v = i; break; } }
        bg[(gy * GX + gx) * 3 + c] = v;
      }
    }
  }
  // bobot interpolasi bilinear antar pusat sel (dihitung sekali per kolom/baris)
  const xi0 = new Int32Array(w), xi1 = new Int32Array(w), xt = new Float32Array(w);
  for(let x = 0; x < w; x++){
    const f = (x + 0.5) * GX / w - 0.5, a = Math.max(0, Math.min(GX - 1, Math.floor(f)));
    xi0[x] = a; xi1[x] = Math.min(GX - 1, a + 1); xt[x] = Math.max(0, Math.min(1, f - a));
  }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h), o = img.data;
  const t0 = 0.04 + (Math.max(0, Math.min(100, kekuatan)) / 100) * 0.30; // lebih terang dari ini => latar penuh
  const t1 = t0 + 0.20;                                                     // lebih gelap dari ini => tinta penuh
  const bgc = [0, 0, 0];
  for(let y = 0; y < h; y++){
    const f = (y + 0.5) * GY / h - 0.5, ya = Math.max(0, Math.min(GY - 1, Math.floor(f)));
    const yb = Math.min(GY - 1, ya + 1), yt = Math.max(0, Math.min(1, f - ya));
    for(let x = 0; x < w; x++){
      const p = (y * w + x) * 4;
      for(let c = 0; c < 3; c++){
        const a00 = bg[(ya * GX + xi0[x]) * 3 + c], a01 = bg[(ya * GX + xi1[x]) * 3 + c];
        const a10 = bg[(yb * GX + xi0[x]) * 3 + c], a11 = bg[(yb * GX + xi1[x]) * 3 + c];
        const tx = xt[x];
        bgc[c] = (a00 + (a01 - a00) * tx) * (1 - yt) + (a10 + (a11 - a10) * tx) * yt;
      }
      const R = d[p], G = d[p + 1], B = d[p + 2];
      const L = 0.299 * R + 0.587 * G + 0.114 * B;
      const Lb = 0.299 * bgc[0] + 0.587 * bgc[1] + 0.114 * bgc[2];
      let dark = Lb > 20 ? (Lb - L) / Lb : 0;
      let al = (dark - t0) / (t1 - t0);
      if(al <= 0.004){ o[p + 3] = 0; continue; }
      if(al > 1) al = 1;
      al = al * al * (3 - 2 * al);                    // smoothstep: tepi goresan halus
      const den = Math.max(al, 0.25);
      const ch = [R, G, B];
      for(let c = 0; c < 3; c++){
        let v = (ch[c] - bgc[c] * (1 - al)) / den;      // warna tinta asli (un-blend dari kertas)
        o[p + c] = v < 0 ? 0 : (v > 255 ? 255 : v);
      }
      o[p + 3] = Math.round(al * 255);
    }
  }
  octx.putImageData(img, 0, 0);
  return ttdPotongKotak(out, 3);
}
// @@TTD_PURE_END

/* Zoom pratinjau lembar (CSS zoom/scale) -- dipakai agar geser & ubah-ukuran TTD mengikuti kursor/jari 1:1. */
function getPreviewZoom(){
  const a = document.getElementById('paper');
  if(!a) return 1;
  const z = parseFloat(a.style.zoom);
  if(z > 0) return z;
  const m = /scale\(([\d.]+)\)/.exec(a.style.transform || '');
  return m ? (parseFloat(m[1]) || 1) : 1;
}

let ttdOrig = null; // {kanvas, sudahTransparan, name} -- sumber foto TTD agar slider bisa memproses ulang
function ttdUkuranByte(url){
  const i = url.indexOf(',');
  return Math.round((url.length - (i + 1)) * 3 / 4);
}
function ttdResetSemua(){
  ttdOrig = null;
  const bgBox = document.getElementById('ttdBgBox'); if(bgBox) bgBox.style.display = 'none';
}
/* Proses ulang foto TTD lalu pasang ke state. kekuatan: angka 0-100 = hapus latar otomatis,
   null = pakai gambar asli apa adanya (latar putih ikut tercetak). */
function ttdTerapkan(kekuatan, awal){
  if(!ttdOrig) return;
  let kanvas, mode, url;
  if(ttdOrig.sudahTransparan){
    kanvas = ttdPotongKotak(ttdOrig.kanvas, 3) || ttdOrig.kanvas; mode = 'transparan';
    url = kanvas.toDataURL('image/png');
  } else if(kekuatan === null){
    kanvas = ttdOrig.kanvas; mode = 'asli';
    url = kanvas.toDataURL('image/jpeg', 0.92);
  } else {
    kanvas = ttdHapusLatar(ttdOrig.kanvas, kekuatan); mode = 'auto';
    if(!kanvas){
      const st = document.getElementById('ttdBgLabel');
      if(st) st.textContent = 'hasil kosong — kurangi kekuatan';
      return;
    }
    url = kanvas.toDataURL('image/png');
  }
  const prev = state.ttd;
  const width = (awal || !prev) ? Math.min(TTD_DEFAULT_MAX_W, kanvas.width) : prev.width;
  const height = Math.max(1, Math.round(width * kanvas.height / kanvas.width));
  state.ttd = {name: ttdOrig.name, size: ttdUkuranByte(url), url, width, height,
               offsetX: prev ? prev.offsetX : 0, offsetY: prev ? prev.offsetY : 0,
               mode, kekuatan: (mode === 'auto' ? kekuatan : (prev ? prev.kekuatan : TTD_BG_DEFAULT))};
  renderTtd(); renderPreview();
}
async function ttdMuatFile(file){
  if(!file) return;
  const url = await fileToDataUrl(file);
  const img = await new Promise((resolve)=>{
    const im = new Image();
    im.onload = ()=> resolve(im);
    im.onerror = ()=> resolve(null);
    im.src = url;
  });
  if(!img){ alert('Gambar tidak dapat dibaca. Gunakan file JPG atau PNG.'); return; }
  const kanvas = ttdBuatKanvas(img, TTD_MAX_PX);
  ttdOrig = {kanvas, sudahTransparan: ttdSudahTransparan(kanvas), name: file.name};
  state.ttd = null; // foto baru: posisi & ukuran dimulai dari bawaan
  ttdTerapkan(TTD_BG_DEFAULT, true);
}
dropTtd.addEventListener('click', ()=> f_ttd.click());
dropTtd.addEventListener('dragover', (e)=>{ e.preventDefault(); });
dropTtd.addEventListener('drop', (e)=>{
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(f) ttdMuatFile(f);
});
f_ttd.addEventListener('change', async ()=>{
  const file = f_ttd.files[0];
  await ttdMuatFile(file);
  f_ttd.value = '';
});
(function(){
  const slider = document.getElementById('f_ttdBg');
  let timer = null;
  slider.addEventListener('input', ()=>{
    document.getElementById('ttdBgLabel').textContent = slider.value + '%';
    clearTimeout(timer);
    timer = setTimeout(()=>{ if(ttdOrig && state.ttd && state.ttd.mode !== 'asli') ttdTerapkan(parseInt(slider.value, 10), false); }, 90);
  });
})();
document.getElementById('btnRemoveTtd').addEventListener('click', ()=>{
state.ttd = null; ttdOrig = null; f_ttd.value=''; renderTtd(); renderPreview();
});

/* ---------- Pad: gambar tanda tangan langsung dengan jari/mouse (hasil otomatis transparan) ---------- */
(function(){
  const overlay = document.getElementById('ttdPadOverlay');
  const cv = document.getElementById('ttdPadCanvas');
  if(!overlay || !cv) return;
  const ctx = cv.getContext('2d');
  let strokes = [], cur = null, warna = '#111111', raf = 0;

  function gambarGoresan(s){
    ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = s.p;
    if(p.length === 1){ ctx.beginPath(); ctx.arc(p[0][0], p[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for(let i = 1; i < p.length - 1; i++){
      const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
      ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);   // kurva halus antar titik
    }
    const l = p[p.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
  }
  function gambarUlang(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(gambarGoresan);
  }
  function jadwalkan(){ if(!raf) raf = requestAnimationFrame(()=>{ raf = 0; gambarUlang(); }); }
  function posisi(e){
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  cv.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    try{ cv.setPointerCapture(e.pointerId); }catch(_){}
    const r = cv.getBoundingClientRect();
    const tebal = parseInt(document.getElementById('ttdPadWidth').value, 10) * (cv.width / r.width); // tebal mengikuti tampilan layar
    cur = {c: warna, w: tebal, p: [posisi(e)]};
    strokes.push(cur);
    jadwalkan();
  });
  cv.addEventListener('pointermove', (e)=>{
    if(!cur) return;
    e.preventDefault();
    const list = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
    list.forEach(ev => cur.p.push(posisi(ev)));
    jadwalkan();
  });
  function akhiri(){ cur = null; }
  cv.addEventListener('pointerup', akhiri);
  cv.addEventListener('pointercancel', akhiri);

  document.getElementById('ttdPadColors').addEventListener('click', (e)=>{
    const b = e.target.closest('.ttd-pad-swatch'); if(!b) return;
    warna = b.getAttribute('data-color');
    document.querySelectorAll('#ttdPadColors .ttd-pad-swatch').forEach(x => x.classList.toggle('active', x === b));
  });
  document.getElementById('ttdPadUndo').addEventListener('click', ()=>{ strokes.pop(); gambarUlang(); });
  document.getElementById('ttdPadClear').addEventListener('click', ()=>{ strokes = []; gambarUlang(); });
  function tutup(){ overlay.classList.remove('open'); cur = null; }
  document.getElementById('ttdPadCancel').addEventListener('click', tutup);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && overlay.classList.contains('open')) tutup(); });
  document.getElementById('btnDrawTtd').addEventListener('click', ()=>{
    strokes = []; cur = null; gambarUlang();
    overlay.classList.add('open');
  });
  document.getElementById('ttdPadSave').addEventListener('click', ()=>{
    if(!strokes.length){ alert('Belum ada tanda tangan yang digambar.'); return; }
    const kecil = ttdPotongKotak(cv, 6);
    if(!kecil){ alert('Belum ada tanda tangan yang digambar.'); return; }
    const url = kecil.toDataURL('image/png');
    ttdOrig = null; // hasil gambar tidak diproses ulang (sudah transparan)
    const width = Math.min(TTD_GAMBAR_W, kecil.width);
    const height = Math.max(1, Math.round(width * kecil.height / kecil.width));
    state.ttd = {name: 'Tanda tangan (digambar)', size: ttdUkuranByte(url), url, width, height,
                 offsetX: 0, offsetY: 0, mode: 'gambar', kekuatan: TTD_BG_DEFAULT};
    tutup();
    renderTtd(); renderPreview();
  });
})();
function renderTtd(){
const box = document.getElementById('ttdPreviewBox');
const sizeBox = document.getElementById('ttdSizeBox');
const bgBox = document.getElementById('ttdBgBox');
if(state.ttd){
box.style.display='flex';
document.getElementById('ttdPreviewImg').src = state.ttd.url;
const info = state.ttd.mode === 'gambar' ? ' · digambar langsung'
  : state.ttd.mode === 'transparan' ? ' · sudah transparan'
  : state.ttd.mode === 'asli' ? ' · gambar asli (latar ikut tercetak)'
  : ' · latar dihapus otomatis';
document.getElementById('ttdFileName').textContent = state.ttd.name;
document.getElementById('ttdFileSize').textContent = fmtBytes(state.ttd.size) + info;
sizeBox.style.display='block';
f_ttdSize.value = state.ttd.width;
document.getElementById('ttdSizeLabel').textContent = state.ttd.width + ' px';
// Panel "Kekuatan Hapus Latar" hanya untuk foto/scan yang bisa diproses ulang
const bisaProses = !!(ttdOrig && !ttdOrig.sudahTransparan && state.ttd.mode !== 'gambar');
if(bgBox) bgBox.style.display = bisaProses ? 'block' : 'none';
if(bisaProses){
  const sl = document.getElementById('f_ttdBg');
  const k = state.ttd.kekuatan != null ? state.ttd.kekuatan : TTD_BG_DEFAULT;
  if(document.activeElement !== sl) sl.value = k; // jangan "menarik balik" slider saat sedang diseret
  sl.disabled = (state.ttd.mode === 'asli');
  document.getElementById('ttdBgLabel').textContent = state.ttd.mode === 'asli' ? 'nonaktif' : (sl.value + '%');
}
} else {
box.style.display='none';
sizeBox.style.display='none';
if(bgBox) bgBox.style.display='none';
}
}
f_ttdSize.addEventListener('input', ()=>{
if(!state.ttd) return;
const ratio = state.ttd.height / state.ttd.width;
const newW = parseInt(f_ttdSize.value, 10);
state.ttd.width = newW;
state.ttd.height = Math.round(newW * ratio);
document.getElementById('ttdSizeLabel').textContent = newW + ' px';
renderPreview();
});
/* Seret titik biru pada gambar TTD di lembar pratinjau untuk mengubah ukuran secara langsung. */
function attachTtdResizeHandle(container){
if(!container) return;
const handle = container.querySelector('.ttd-resize-handle');
const box = container.querySelector('.ttd-resizable');
if(!handle || !box || !state.ttd) return;
const ratio = state.ttd.height / state.ttd.width;
handle.addEventListener('mousedown', (e)=>{
e.preventDefault();
const startX = e.clientX;
const startW = state.ttd.width;
const zm = getPreviewZoom();
function onMove(ev){
let newW = Math.max(40, Math.min(260, Math.round(startW + (ev.clientX - startX) / zm)));
state.ttd.width = newW;
state.ttd.height = Math.round(newW * ratio);
box.style.width = newW + 'px';
box.style.height = state.ttd.height + 'px';
f_ttdSize.value = newW;
document.getElementById('ttdSizeLabel').textContent = newW + ' px';
}
function onUp(){
document.removeEventListener('mousemove', onMove);
document.removeEventListener('mouseup', onUp);
renderPreview();
}
document.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onUp);
});
handle.addEventListener('touchstart', (e)=>{
e.preventDefault(); // PERBAIKAN: cegah gestur scroll/zoom bawaan browser ikut aktif saat mulai menyeret
const t = e.touches[0]; if(!t) return;
const startX = t.clientX;
const startW = state.ttd.width;
const zm = getPreviewZoom();
function onMove(ev){
ev.preventDefault(); // PERBAIKAN: tanpa ini, layar HP ikut ter-scroll saat jari menggeser titik resize
const tt = ev.touches[0]; if(!tt) return;
let newW = Math.max(40, Math.min(260, Math.round(startW + (tt.clientX - startX) / zm)));
state.ttd.width = newW;
state.ttd.height = Math.round(newW * ratio);
box.style.width = newW + 'px';
box.style.height = state.ttd.height + 'px';
f_ttdSize.value = newW;
document.getElementById('ttdSizeLabel').textContent = newW + ' px';
}
function onEnd(){
document.removeEventListener('touchmove', onMove);
document.removeEventListener('touchend', onEnd);
renderPreview();
}
document.addEventListener('touchmove', onMove, {passive:false}); // PERBAIKAN: passive:false wajib agar preventDefault() di atas benar-benar berfungsi
document.addEventListener('touchend', onEnd);
}, {passive:false});
}
/* Seret badan gambar TTD (di luar titik biru resize) untuk memindah posisinya secara manual. */
function attachTtdDragHandle(container){
if(!container) return;
const box = container.querySelector('.ttd-resizable');
if(!box || !state.ttd) return;
function applyTransform(){
box.style.transform = `translate(calc(-50% + ${state.ttd.offsetX||0}px), ${state.ttd.offsetY||0}px)`;
}
box.addEventListener('mousedown', (e)=>{
if(e.target.classList.contains('ttd-resize-handle')) return;
e.preventDefault();
const startX = e.clientX, startY = e.clientY;
const startOX = state.ttd.offsetX||0, startOY = state.ttd.offsetY||0;
const zm = getPreviewZoom(); // pratinjau diperkecil (CSS zoom): bagi dengan zoom agar gambar mengikuti kursor 1:1
function onMove(ev){
state.ttd.offsetX = startOX + (ev.clientX - startX) / zm;
state.ttd.offsetY = startOY + (ev.clientY - startY) / zm;
applyTransform();
}
function onUp(){
document.removeEventListener('mousemove', onMove);
document.removeEventListener('mouseup', onUp);
renderPreview();
}
document.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onUp);
});
box.addEventListener('touchstart', (e)=>{
if(e.target.classList.contains('ttd-resize-handle')) return;
e.preventDefault(); // PERBAIKAN: cegah gestur scroll/zoom bawaan browser ikut aktif saat mulai menyeret
const t = e.touches[0]; if(!t) return;
const startX = t.clientX, startY = t.clientY;
const startOX = state.ttd.offsetX||0, startOY = state.ttd.offsetY||0;
const zm = getPreviewZoom();
function onMove(ev){
ev.preventDefault(); // PERBAIKAN: tanpa ini, layar HP ikut ter-scroll saat jari menggeser tanda tangan
const tt = ev.touches[0]; if(!tt) return;
state.ttd.offsetX = startOX + (tt.clientX - startX) / zm;
state.ttd.offsetY = startOY + (tt.clientY - startY) / zm;
applyTransform();
}
function onEnd(){
document.removeEventListener('touchmove', onMove);
document.removeEventListener('touchend', onEnd);
renderPreview();
}
document.addEventListener('touchmove', onMove, {passive:false}); // PERBAIKAN: passive:false wajib agar preventDefault() di atas benar-benar berfungsi
document.addEventListener('touchend', onEnd);
}, {passive:false});
}
const DOK_MAX_DIM = 1800;
/* ---- Pipeline foto yang aman untuk Safari (Mac/iPhone/iPad), Chrome, Edge, Firefox, Android ---- */
function fotoKodeError(kode, pesan, asli){
const e = new Error(pesan); e.kode = kode; e.asli = asli; return e;
}
function jedaUI(){ return new Promise(r=> setTimeout(r, 0)); }
/* Decode ke sumber gambar. Urutan: createImageBitmap (orientasi EXIF dihormati) -> <img> via object URL -> <img> via data URL. */
async function dekodeGambar(blob){
if(typeof createImageBitmap === 'function'){
try{
const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
if(bmp && bmp.width) return { src: bmp, w: bmp.width, h: bmp.height, tutup: ()=>{ try{ bmp.close(); }catch(e){} } };
}catch(e){}
try{
const bmp2 = await createImageBitmap(blob);
if(bmp2 && bmp2.width) return { src: bmp2, w: bmp2.width, h: bmp2.height, tutup: ()=>{ try{ bmp2.close(); }catch(e){} } };
}catch(e){}
}
const muatImg = (url)=> new Promise((resolve, reject)=>{
const im = new Image();
im.onload = ()=> (im.naturalWidth ? resolve(im) : reject(new Error('gambar kosong')));
im.onerror = ()=> reject(new Error('gambar tidak dapat dibaca'));
im.src = url;
});
let objUrl = null;
try{
if(window.URL && URL.createObjectURL){
objUrl = URL.createObjectURL(blob);
const im = await muatImg(objUrl);
return { src: im, w: im.naturalWidth, h: im.naturalHeight, tutup: ()=>{ try{ URL.revokeObjectURL(objUrl); }catch(e){} } };
}
}catch(e){ if(objUrl){ try{ URL.revokeObjectURL(objUrl); }catch(_){} } }
const durl = await fileToDataUrl(blob);
const im2 = await muatImg(durl);
return { src: im2, w: im2.naturalWidth, h: im2.naturalHeight, tutup: ()=>{} };
}
/* Gambar ke canvas, coba ukuran lebih kecil bila Safari menolak (batas memori canvas iOS). */
function gambarKeJpegDataUrl(dec, maxDim, quality){
let dim = maxDim;
for(let coba = 0; coba < 4; coba++){
const scale = Math.min(1, dim / Math.max(dec.w, dec.h));
const cw = Math.max(1, Math.round(dec.w * scale));
const ch = Math.max(1, Math.round(dec.h * scale));
try{
const canvas = document.createElement('canvas');
canvas.width = cw; canvas.height = ch;
const ctx = canvas.getContext('2d');
if(ctx){
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, cw, ch);
ctx.drawImage(dec.src, 0, 0, cw, ch);
const out = canvas.toDataURL('image/jpeg', quality || 0.88);
canvas.width = 1; canvas.height = 1; // lepas memori canvas (penting di iOS Safari)
if(out && out.length > 100 && out.indexOf('data:image/jpeg') === 0) return out;
}
}catch(e){}
dim = Math.round(dim * 0.7);
}
throw fotoKodeError('CANVAS', 'Memori browser tidak cukup untuk memproses foto ini.');
}
async function fotoKeDataUrl(file, maxDim, quality){
const format = await sniffFormatFile(file);
if(format === 'pdf') throw fotoKodeError('BUKAN_FOTO', 'File ini PDF, bukan foto. Unggah PDF lewat bagian Lampiran.');
let blob = file;
let dec = null;
let errAsli = null;
// 1) Coba decode apa adanya (Safari/macOS/iOS mengerti HEIC secara native).
try{ dec = await dekodeGambar(blob); }catch(e){ errAsli = e; }
// 2) Gagal & ternyata HEIC (menurut isi atau nama) -> konversi lewat heic2any, lalu decode ulang.
if(!dec && (format === 'heic' || isHeicFile(file))){
let konv;
try{
konv = await convertHeicToJpegFile(file);
}catch(e){
const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || !window.heic2any;
throw fotoKodeError(offline ? 'HEIC_KOMPONEN' : 'HEIC_RUSAK',
offline ? 'Komponen pengonversi HEIC tidak dapat dimuat (periksa koneksi internet / CDN diblokir).'
        : 'Foto HEIC tidak dapat dikonversi (berkas mungkin rusak).', e);
}
try{ dec = await dekodeGambar(konv); }catch(e){ errAsli = e; }
}
if(!dec){
throw fotoKodeError(format === 'avif' ? 'FORMAT' : 'DECODE',
'Berkas tidak dapat dibaca sebagai foto (format tidak didukung atau berkas rusak/belum terunduh dari iCloud).', errAsli);
}
try{
return gambarKeJpegDataUrl(dec, maxDim, quality);
}finally{
dec.tutup();
}
}
async function fileToDisplaySafeDataUrl(file, maxDim, quality){
return fotoKeDataUrl(file, maxDim, quality);
}
function pesanGagalFoto(daftar){
// daftar: [{nama, kode, pesan}]
const baris = daftar.map(d=> '- ' + d.nama + ' → ' + d.pesan).join('\n');
const adaKomponen = daftar.some(d=> d.kode === 'HEIC_KOMPONEN');
const adaDecode = daftar.some(d=> d.kode === 'DECODE' || d.kode === 'FORMAT');
let saran = '';
if(adaKomponen) saran += '\nUntuk foto HEIC: pastikan internet aktif lalu coba lagi.';
if(adaDecode) saran += '\nSaran: buka foto di aplikasi Foto, lalu “Bagikan/Ekspor” sebagai JPEG (atau ambil tangkapan layar foto itu), kemudian unggah ulang. Jika foto berada di iCloud, tunggu sampai terunduh penuh ke perangkat.';
return 'Sebagian foto gagal diproses dan tidak ditambahkan:\n' + baris + saran;
}
const dropDok = document.getElementById('dropDok');
const f_dok = document.getElementById('f_dok');
const dropDokLabel = dropDok.querySelector('p');
const dropDokLabelDefault = dropDokLabel ? dropDokLabel.textContent : '';
dropDok.addEventListener('click', ()=> f_dok.click());
f_dok.addEventListener('change', async ()=>{
const files = Array.from(f_dok.files || []);
const gagal = [];
for(let i=0; i<files.length; i++){
const file = files[i];
try{
if(dropDokLabel) dropDokLabel.textContent = files.length>1 ? `Memproses foto ${i+1}/${files.length}...` : 'Memproses foto...';
await jedaUI();
const url = await fotoKeDataUrl(file, DOK_MAX_DIM, 0.88);
const nama = (file.name || 'foto').replace(/\.(heic|heif)$/i, '.jpg');
state.dok.push({name:nama, url});
}catch(err){
console.error('Gagal memproses foto dokumentasi:', file && file.name, err, err && err.asli);
gagal.push({nama:(file && file.name) || 'file tidak dikenal', kode: err && err.kode, pesan: (err && err.kode) ? err.message : ('Terjadi kesalahan: ' + ((err && err.message) || err))});
}
}
if(dropDokLabel) dropDokLabel.textContent = dropDokLabelDefault;
try{ f_dok.value=''; }catch(e){}
renderDokGrid(); renderPreview();
if(gagal.length){ alert(pesanGagalFoto(gagal)); }
});
function renderDokGrid(){
const grid = document.getElementById('dokGrid');
grid.innerHTML = '';
state.dok.forEach((d,i)=>{
const t = document.createElement('div');
t.className='doc-thumb';
t.innerHTML = `<img src="${d.url}"><button type="button" data-dok-del="${i}">&times;</button>`;
grid.appendChild(t);
});
grid.querySelectorAll('[data-dok-del]').forEach(btn=>{
btn.addEventListener('click', ()=>{ state.dok.splice(+btn.dataset.dokDel,1); renderDokGrid(); renderPreview(); });
});
}
async function addPdfFileAsLampPages(file){
const ready = await ensurePdfJs();
if(!ready || !window.pdfjsLib){
throw new Error('Komponen pembaca PDF (pdf.js) tidak dapat dimuat — kemungkinan tidak ada koneksi internet.');
}
const buf = await file.arrayBuffer();
const pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;
const numPages = pdfDoc.numPages;
for(let p = 1; p <= numPages; p++){
const page = await pdfDoc.getPage(p);
const viewport = page.getViewport({ scale: 2 });
const canvas = document.createElement('canvas');
canvas.width = viewport.width;
canvas.height = viewport.height;
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx, viewport: viewport }).promise;
const url = canvas.toDataURL('image/jpeg', 0.92);
state.lamp.push({
name: numPages > 1 ? `${file.name} (hal ${p}/${numPages})` : file.name,
url,
kind: 'pdf-page'
});
}
}
function buildLampPdfErrorMessage(file, err){
const raw = (err && err.message) ? err.message : String(err);
const name = err && err.name;
let saran;
if(!window.pdfjsLib){
saran = (navigator.onLine === false)
? 'Komputer ini tampaknya sedang TIDAK terhubung ke internet. Komponen pembaca PDF (pdf.js) perlu diunduh dari internet setiap kali aplikasi ini dibuka. Sambungkan ke internet, muat ulang halaman (tekan F5), lalu unggah PDF lagi.'
: 'Komponen pembaca PDF (pdf.js) gagal dimuat dari internet — kemungkinan besar domain CDN (cdnjs.cloudflare.com / jsdelivr.net / unpkg.com) diblokir oleh jaringan/firewall kantor, atau koneksi terlalu lambat/putus saat memuat. Coba jaringan lain, atau minta admin IT membuka akses ke domain tersebut, lalu muat ulang halaman (F5) dan unggah PDF lagi.';
} else if(name === 'PasswordException'){
saran = 'File PDF ini terkunci dengan password. Buka/hapus password PDF terlebih dahulu (lewat aplikasi PDF lain) sebelum diunggah ke sini.';
} else if(name === 'InvalidPDFException' || name === 'UnexpectedResponseException'){
saran = 'File ini tampaknya bukan PDF yang valid atau berkasnya rusak/korup. Coba buka file tersebut di aplikasi lain untuk memastikan, atau simpan ulang ("Save As") sebagai PDF baru lalu unggah kembali.';
} else {
saran = 'Pastikan file tidak rusak, koneksi internet aktif (untuk memuat komponen pembaca PDF), lalu coba lagi. Jika masalah berlanjut, laporkan pesan detail teknis di bawah ini ke admin/IT.';
}
return 'Gagal membaca file PDF "' + file.name + '".\n' + saran + '\n(Detail teknis: ' + raw + ')';
}
const dropLamp = document.getElementById('dropLamp');
const f_lamp = document.getElementById('f_lamp');
const dropLampLabel = dropLamp.querySelector('p');
const dropLampLabelDefault = dropLampLabel ? dropLampLabel.textContent : '';
dropLamp.addEventListener('click', ()=> f_lamp.click());
f_lamp.addEventListener('change', async ()=>{
for(const file of f_lamp.files){
const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
if(isPdf){
if(dropLampLabel) dropLampLabel.textContent = `Memproses ${file.name}...`;
try{
await addPdfFileAsLampPages(file);
}catch(err){
console.error('Gagal memproses PDF lampiran:', err);
alert(buildLampPdfErrorMessage(file, err));
}
} else {
try{
const url = await fotoKeDataUrl(file, 2200, 0.9);
state.lamp.push({name:(file.name||'gambar').replace(/\.(heic|heif)$/i, '.jpg'), url, kind:'image'});
}catch(err){
console.error('Gagal memproses gambar lampiran:', file.name, err, err && err.asli);
alert('Gambar lampiran "' + file.name + '" gagal diproses:\n' + ((err && err.kode) ? err.message : ((err && err.message) || err)));
}
}
}
if(dropLampLabel) dropLampLabel.textContent = dropLampLabelDefault;
f_lamp.value='';
renderLampList(); renderPreview();
});
function renderLampList(){
const wrap = document.getElementById('lampList');
wrap.innerHTML = '';
state.lamp.forEach((l,i)=>{
const row = document.createElement('div');
row.className='lamp-item';
row.innerHTML = `<img class="lamp-thumb" src="${l.url}" alt=""><span class="nm">${esc(l.name)}</span><button type="button" data-lamp-del="${i}">&times;</button>`;
wrap.appendChild(row);
});
wrap.querySelectorAll('[data-lamp-del]').forEach(btn=>{
btn.addEventListener('click', ()=>{ state.lamp.splice(+btn.dataset.lampDel,1); renderLampList(); renderPreview(); });
});
}
/* =================== RHK 2 — LAPORAN KEGIATAN P2K2 (format resmi) ===================
   Hanya aktif untuk RHK P2K2 dengan rencana aksi "Melaksanakan Pertemuan Peningkatan
   Kemampuan Keluarga (P2K2)". RHK lain tidak tersentuh. */
const P2K2_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const P2K2_MATERI_UMUM = 'P2K2 Adaptif, materi tambahan, atau isu-isu yang relevan di masyarakat sesuai dengan kondisi terkini atau sesuai kebutuhan';
const P2K2_DASAR = [
  'Undang-Undang Nomor 11 Tahun 2009 tentang Kesejahteraan Sosial.',
  'Peraturan Menteri Sosial Republik Indonesia Nomor 8 Tahun 2026 tentang Program Keluarga Harapan.',
  'Keputusan Direktur Jenderal Perlindungan dan Jaminan Sosial Nomor 20/3/HK.01/3/2025.'
];
const P2K2_RK_MAKS = 1000;
function p2kPotong(t){
  t = String(t||'').trim();
  if(t.length <= P2K2_RK_MAKS) return t;
  var c = t.slice(0, P2K2_RK_MAKS), i = Math.max(c.lastIndexOf('. '), c.lastIndexOf('.\n'));
  return (i > 500 ? c.slice(0, i + 1) : c).trim();
}
const P2K2_INGAT_KEY = 'suanggi_p2k2_ingat';
function isP2K2Aksi(item, aksiText){
  return !!item && /p2k2/i.test(String(item.rhk || '') + ' ' + String(item.indikator || '')) &&
    /^melaksanakan\s+pertemuan/i.test(String(aksiText || '').trim());
}
function isP2K2(){ return isP2K2Aksi(getSelectedRhk(), getSelectedAksiText()); }
function p2kJabatanLabel(){ return (JABATAN_META[state.jabatan] || {}).label || state.jabatan || ''; }
function p2kKapital(t){
  return String(t || '').trim().replace(/\s+/g, ' ').split(' ').map(function(w){
    return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w;
  }).join(' ');
}
function p2kTgl(iso){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if(!m) return '';
  return (+m[3]) + ' ' + P2K2_BULAN[(+m[2]) - 1] + ' ' + m[1];
}
function p2kBulanAngka(){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(state.p2k2.tglKegiatan || '');
  var n = m ? +m[2] : (P2K2_BULAN.indexOf(state.bulan) + 1);
  return n > 0 ? (n < 10 ? '0' + n : String(n)) : '..';
}
function p2kTahun(){
  var m = /^(\d{4})-/.exec(state.p2k2.tglKegiatan || '');
  return m ? m[1] : (state.tahun || '....');
}
function p2kNomor(spasi){
  var u = (state.p2k2.noUrut || '').trim() || '…..';
  var k = (state.p2k2.noKode || '').trim() || '……………………………';
  return u + (spasi ? ' / ' : '/') + 'P2K2/' + p2kBulanAngka() + '/' + p2kTahun() + '/' + k;
}
function p2kWilayah(){
  var p = state.p2k2, bagian = [];
  if((p.kec || '').trim()) bagian.push('Kecamatan ' + p2kKapital(p.kec));
  if((p.kab || '').trim()) bagian.push((p.jenisKab === 'Kabupaten' ? 'Kabupaten ' : 'Kota ') + p2kKapital(p.kab));
  if((p.prov || '').trim()) bagian.push('Provinsi ' + p2kKapital(p.prov));
  return bagian.join(' ') || 'wilayah dampingan';
}
function p2kMateri(){ return (state.p2k2.materi || '').trim() || P2K2_MATERI_UMUM; }
function p2kModul(){ return (state.p2k2.modul || '').trim() || p2kMateri(); }
function p2kTglKegiatanTeks(){ return p2kTgl(state.p2k2.tglKegiatan) || '..........................'; }

/* Teks Pendahuluan, Simpulan, Penutup — kalimat mengikuti dokumen referensi */
function p2k2TeksPendahuluan(){
  var w = p2kWilayah(), materi = p2kMateri(), modul = p2kModul();
  var umum =
    'Pertemuan Peningkatan Kemampuan Keluarga (P2K2) merupakan proses belajar terstruktur untuk mempercepat perubahan perilaku Keluarga Penerima Manfaat (KPM) PKH dalam bidang Kesehatan, Pendidikan, Ekonomi, Perlindungan Anak, dan Kesejahteraan Sosial dan merupakan salah satu kegiatan utama dalam Program Keluarga Harapan (PKH) yang bertujuan menyediakan wadah belajar bagi KPM PKH, menambah wawasan dan mengubah perilaku, melaksanakan edukasi secara berkala kepada KPM PKH, dan memberikan dukungan kepada KPM untuk menuju kemandirian khususnya di ' + w + ' yang dilakukan secara rutin sesuai jadwal yang telah ditetapkan.\n' +
    'Laporan ini disusun sebagai bentuk pertanggungjawaban dan dokumentasi kegiatan P2K2 yang telah dilaksanakan pada ' + p2kTglKegiatanTeks() + '. Pelaksanaan P2K2 melibatkan pendamping sosial PKH sebagai fasilitator dan KPM di ' + w + ' sebagai peserta pertemuan. Kegiatan berlangsung dengan metode diskusi kelompok, penyampaian materi ' + materi + ', tanya jawab, dan simulasi dengan tema modul ' + modul + ' yang ditetapkan oleh Kementerian Sosial.';
  var maksud = [
    'Memberikan informasi lengkap mengenai pelaksanaan P2K2 di ' + w + '.',
    'Menjadi bahan evaluasi terhadap hasil capaian kegiatan.',
    'Meningkatkan pengetahuan KPM tentang ' + materi + '.',
    'Menumbuhkan perilaku positif dan kemandirian dalam keluarga.'
  ].join('\n');
  var ruang = [
    'Ruang lingkup kegiatan P2K2 yang dilaksanakan meliputi:',
    'Persiapan materi ' + materi + ' dan jadwal pertemuan.',
    'Koordinasi dengan KPM mengenai lokasi dan waktu pelaksanaan.',
    'Pelaksanaan pertemuan sesuai modul ' + modul + '.',
    'Fasilitasi diskusi, penyampaian materi ' + materi + ', dan praktik sederhana.',
    'Dokumentasi pertemuan.',
    'Rekapitulasi hadir peserta.'
  ].join('\n');
  return {umum: umum, maksud: maksud, ruang: ruang};
}
function p2k2TeksPenutupan(){
  return {
    kesimpulan: 'Pelaksanaan Pertemuan Peningkatan Kemampuan Keluarga (P2K2) berjalan dengan baik, tertib. KPM mampu memahami materi yang diberikan dan menunjukkan antusiasme dan keterlibatan aktif dalam diskusi, yang menunjukkan bahwa kegiatan ini memberikan dampak pada perubahan perilaku serta peningkatan kemampuan keluarga dalam hal ' + p2kMateri() + '.',
    penutup: 'Demikian laporan pelaksanaan P2K2 ini disusun sebagai bentuk pertanggungjawaban dan dokumentasi kegiatan pelaksanaan tugas ' + (p2kJabatanLabel() || 'Pendamping Sosial PKH') + '. Semoga kegiatan ini terus memberikan manfaat bagi peningkatan kualitas hidup Keluarga Penerima Manfaat PKH.'
  };
}

/* Formulir di halaman Edit Laporan */
const P2K2_ID = {noUrut:'p2k_noUrut', noKode:'p2k_noKode', desa:'p2k_desa', kec:'p2k_kec', jenisKab:'p2k_jenisKab', kab:'p2k_kab', prov:'p2k_prov',
  tglKegiatan:'p2k_tglKegiatan', jamMulai:'p2k_jamMulai', jamSelesai:'p2k_jamSelesai', tempat:'p2k_tempat',
  materi:'p2k_materi', modul:'p2k_modul', hadir:'p2k_hadir', sakit:'p2k_sakit', alpa:'p2k_alpa', rangkuman:'p2k_rangkuman'};
const P2K2_INGAT = ['kec','jenisKab','kab','prov','noKode'];
function p2k2Ingat(){
  var o = {}; P2K2_INGAT.forEach(function(k){ o[k] = state.p2k2[k] || ''; });
  SafeStorage.set(P2K2_INGAT_KEY, JSON.stringify(o));
}
function p2k2MuatIngat(){
  try{
    var o = JSON.parse(SafeStorage.get(P2K2_INGAT_KEY) || '{}');
    P2K2_INGAT.forEach(function(k){ if(!state.p2k2[k] && o[k]) state.p2k2[k] = String(o[k]).slice(0, 80); });
  }catch(e){}
}
var p2k2RegenTimer = null;
function p2k2Regen(){
  clearTimeout(p2k2RegenTimer);
  p2k2RegenTimer = setTimeout(function(){
    if(!isP2K2()) return;
    var jalan = false;
    if(!state.pendahuluanTouched){ autofillPendahuluan(); jalan = true; }
    if(!state.kegiatanTouched){ autofillKegiatan(); jalan = true; }
    if(!jalan) renderPreview();
  }, 250);
}
function p2k2RenderPemateri(){
  var wrap = document.getElementById('p2k_pemWrap'); if(!wrap) return;
  wrap.textContent = '';
  state.p2k2.pemateriLain.forEach(function(p, i){
    var row = document.createElement('div'); row.className = 'p2k-pem-row';
    var a = document.createElement('input'); a.type = 'text'; a.maxLength = 120; a.placeholder = 'Nama pemateri'; a.value = p.nama || ''; a.setAttribute('aria-label', 'Nama pemateri ' + (i + 1));
    var b = document.createElement('input'); b.type = 'text'; b.maxLength = 160; b.placeholder = 'Jabatan / instansi'; b.value = p.jabatan || ''; b.setAttribute('aria-label', 'Jabatan pemateri ' + (i + 1));
    var x = document.createElement('button'); x.type = 'button'; x.className = 'p2k-pem-hapus'; x.textContent = '×'; x.setAttribute('aria-label', 'Hapus pemateri ' + (i + 1));
    a.addEventListener('input', function(){ p.nama = a.value; renderPreview(); });
    b.addEventListener('input', function(){ p.jabatan = b.value; renderPreview(); });
    x.addEventListener('click', function(){ state.p2k2.pemateriLain.splice(i, 1); p2k2RenderPemateri(); renderPreview(); });
    row.appendChild(a); row.appendChild(b); row.appendChild(x); wrap.appendChild(row);
  });
}
function p2k2Setup(){
  var aktif = isP2K2();
  var tampil = function(id, ya){ var e = document.getElementById(id); if(e) e.style.display = ya ? '' : 'none'; };
  tampil('p2k2Wrap', aktif); tampil('bUmumWrap', !aktif); tampil('cUmumWrap', !aktif); tampil('f_saran', !aktif);
  var set = function(id, t){ var e = document.getElementById(id); if(e) e.textContent = t; };
  set('lblUmum', aktif ? 'Umum' : 'Latar Belakang / Gambaran Umum');
  set('letterD', aktif ? 'C' : 'D'); set('titleD', aktif ? 'Simpulan' : 'Kesimpulan dan Saran'); set('lblKes', aktif ? 'Simpulan' : 'Kesimpulan & Saran');
  set('letterE', aktif ? 'D' : 'E');
  if(!aktif) return;
  p2k2MuatIngat();
  Object.keys(P2K2_ID).forEach(function(k){ var el = document.getElementById(P2K2_ID[k]); if(el) el.value = state.p2k2[k] || ''; });
  document.getElementById('p2k_tglLaporan').value = state.tanggal || '';
  document.getElementById('p2k_namaView').value = state.nama || '';
  var lbl = document.getElementById('p2k_lblPendamping');
  if(lbl) lbl.firstChild.textContent = 'Nama ' + (p2kJabatanLabel() || 'Pendamping');
  var _rc = document.getElementById('p2k_rkCount'); if(_rc) _rc.textContent = (state.p2k2.rangkuman||'').length + ' / ' + P2K2_RK_MAKS + ' karakter';
  document.getElementById('p2k_pemSaya').checked = !!state.p2k2.pemateriSaya;
  set('p2k_pemSayaTxt', 'Saya sebagai pemateri (' + (state.nama || 'nama login') + ', ' + (p2kJabatanLabel() || 'jabatan') + ')');
  p2k2RenderPemateri();
}
function p2k2SetTanggal(tglKegiatan, tglLaporan){
  state.p2k2.tglKegiatan = tglKegiatan || '';
  var a = document.getElementById('p2k_tglKegiatan'); if(a) a.value = state.p2k2.tglKegiatan;
  var f = document.getElementById('f_tanggal');
  if(f){ f.value = tglLaporan || ''; state.tanggal = f.value; }
  var b = document.getElementById('p2k_tglLaporan'); if(b) b.value = state.tanggal || '';
  p2k2Regen();
}
(function p2k2Pasang(){
  Object.keys(P2K2_ID).forEach(function(k){
    var el = document.getElementById(P2K2_ID[k]); if(!el) return;
    var ev = (el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(ev, function(){
      if(k === 'rangkuman' && el.value.length > P2K2_RK_MAKS) el.value = el.value.slice(0, P2K2_RK_MAKS);
      state.p2k2[k] = el.value;
      if(k === 'rangkuman'){ var c = document.getElementById('p2k_rkCount'); if(c) c.textContent = el.value.length + ' / ' + P2K2_RK_MAKS + ' karakter'; }
      if(P2K2_INGAT.indexOf(k) >= 0) p2k2Ingat();
      if(k === 'rangkuman' || k === 'jamMulai' || k === 'jamSelesai' || k === 'hadir' || k === 'sakit' || k === 'alpa' || k === 'tempat') renderPreview(); else p2k2Regen();
    });
  });
  var tl = document.getElementById('p2k_tglLaporan'), ft = document.getElementById('f_tanggal');
  if(tl && ft){
    tl.addEventListener('input', function(){ ft.value = tl.value; ft.dispatchEvent(new Event('input')); });
    ft.addEventListener('input', function(){ tl.value = ft.value; });
  }
  var cek = document.getElementById('p2k_pemSaya');
  if(cek) cek.addEventListener('change', function(){ state.p2k2.pemateriSaya = cek.checked; renderPreview(); });
  var tam = document.getElementById('p2k_btnPem');
  if(tam) tam.addEventListener('click', function(){
    state.p2k2.pemateriLain.push({nama:'', jabatan:''}); p2k2RenderPemateri();
    var r = document.querySelectorAll('#p2k_pemWrap .p2k-pem-row'); if(r.length) r[r.length - 1].querySelector('input').focus();
  });
})();

/* =================== A. PENDAHULUAN: AUTO-FILL DARI RHK (umum) =================== */
state.pendahuluanSrc = {rhkNo:null, aksiIdx:null};
function buildPendahuluanText(){
const item = getSelectedRhk();
const aksiText = getSelectedAksiText();
const jabatanLabel = (JABATAN_META[state.jabatan]||{}).label || state.jabatan;
if(!item){
return {umum:'', maksud:'', ruang:''};
}
if(isP2K2Aksi(item, aksiText)) return p2k2TeksPendahuluan();
const umum = `Laporan bulanan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas ${jabatanLabel} pada Program Keluarga Harapan (PKH), Direktorat Perlindungan Sosial Non Kebencanaan, Kementerian Sosial Republik Indonesia. Pelaksanaan tugas pada bulan berjalan diarahkan pada pencapaian Rencana Hasil Kerja (RHK) berupa "${item.rhk}", sebagai bagian dari upaya "${item.rhkPimpinan}", dengan Indikator Kinerja Individu "${item.indikator}".`;
const maksud = `Laporan ini dimaksudkan untuk memberikan gambaran dan informasi mengenai capaian pelaksanaan Rencana Hasil Kerja (RHK) "${item.rhk}" pada bulan ${state.bulan} ${state.tahun}, khususnya rencana aksi "${aksiText}", sekaligus sebagai bahan evaluasi kinerja dan dasar penyusunan rencana kerja pada periode berikutnya.`;
const ruang = `Ruang lingkup laporan ini mencakup pelaksanaan rencana aksi "${aksiText}" dalam rangka pencapaian Rencana Hasil Kerja (RHK) "${item.rhk}" sesuai dengan Indikator Kinerja Individu "${item.indikator}" pada jabatan ${jabatanLabel}, yang dilaksanakan selama bulan ${state.bulan} ${state.tahun}.`;
return {umum, maksud, ruang};
}
function autofillPendahuluan(){
const t = buildPendahuluanText();
state.umum = t.umum; state.maksud = t.maksud; state.ruang = t.ruang;
if(isP2K2()){
state.dasar = P2K2_DASAR.slice(); state.dasarP2k2 = true; renderDasar();
} else if(state.dasarP2k2){
state.dasar = JSON.parse(JSON.stringify(STATE_AWAL.dasar)); state.dasarP2k2 = false; renderDasar();
}
document.getElementById('f_umum').value = t.umum;
document.getElementById('f_maksud').value = t.maksud;
document.getElementById('f_ruang').value = t.ruang;
state.pendahuluanTouched = false;
state.pendahuluanSrc = {rhkNo: state.rhkNo, aksiIdx: state.aksiIdx};
renderPreview();
}
function maybeAutofillPendahuluan(){
const changed = state.pendahuluanSrc.rhkNo !== state.rhkNo || state.pendahuluanSrc.aksiIdx !== state.aksiIdx;
if(!state.pendahuluanTouched || changed){
autofillPendahuluan();
}
}
document.getElementById('btnRefreshPendahuluan').addEventListener('click', ()=>{
autofillPendahuluan();
const s = document.getElementById('pendahuluanStatus');
s.textContent = 'Diperbarui berdasarkan RHK terpilih.';
setTimeout(()=>{ s.textContent=''; }, 2200);
});
['f_umum','f_maksud','f_ruang'].forEach(id=>{
document.getElementById(id).addEventListener('input', ()=>{ state.pendahuluanTouched = true; });
});
/* =================== B/C/D/E: AUTO-GENERATE LANGSUNG DARI RHK & RENCANA AKSI =================== */
state.kegiatanSrc = {rhkNo:null, aksiIdx:null};
function buildKegiatanText(){
const item = getSelectedRhk();
const aksiText = getSelectedAksiText();
const jabatanLabel = (JABATAN_META[state.jabatan]||{}).label || state.jabatan;
if(!item){
return {bUraian:'', hasil:'', kesimpulan:'', saran:'', penutup:''};
}
if(isP2K2Aksi(item, aksiText)){
const pt = p2k2TeksPenutupan();
return {bUraian:'', hasil:'', kesimpulan:pt.kesimpulan, saran:'', penutup:pt.penutup};
}
const bUraian = `Pada bulan ${state.bulan} ${state.tahun}, dilaksanakan rencana aksi "${aksiText}" dalam rangka pencapaian Rencana Hasil Kerja (RHK) "${item.rhk}", sesuai dengan Indikator Kinerja Individu "${item.indikator}". Kegiatan dilaksanakan secara bertahap dan berkesinambungan sesuai dengan tugas dan tanggung jawab ${jabatanLabel} pada wilayah kerja masing-masing, dengan tetap memperhatikan data dan kondisi Keluarga Penerima Manfaat (KPM) di lapangan.`;
const hasil = `Pelaksanaan rencana aksi "${aksiText}" pada bulan ${state.bulan} ${state.tahun} secara umum berjalan dengan baik dan menunjukkan perkembangan yang positif terhadap pencapaian Indikator Kinerja Individu "${item.indikator}". Kegiatan dapat diselesaikan sesuai dengan target dan jadwal yang direncanakan, sebagai bagian dari kontribusi terhadap pencapaian RHK "${item.rhk}", meskipun masih terdapat sejumlah kendala teknis maupun non-teknis di lapangan yang ditindaklanjuti sesuai prosedur yang berlaku.`;
const kesimpulan = `Secara umum, pelaksanaan RHK "${item.rhk}" melalui rencana aksi "${aksiText}" pada bulan ${state.bulan} ${state.tahun} telah terlaksana dengan baik dan sesuai dengan target, jadwal, serta ketentuan yang berlaku, dengan capaian kinerja yang menunjukkan perkembangan yang cukup baik dibandingkan periode sebelumnya.`;
const saran = `Diperlukan penguatan koordinasi antara pendamping, pemerintah daerah, dan pemangku kepentingan terkait, serta pemantauan dan evaluasi secara berkelanjutan, agar pelaksanaan rencana aksi pada periode berikutnya dapat berjalan lebih optimal dan tepat sasaran.`;
const penutup = `Demikian laporan bulanan pelaksanaan tugas ${jabatanLabel} bulan ${state.bulan} ${state.tahun} ini disusun sebagai bentuk pertanggungjawaban. Semoga dapat menjadi bahan evaluasi dan masukan bagi pelaksanaan tugas pada periode berikutnya. Atas perhatian dan kerja samanya diucapkan terima kasih.`;
return {bUraian, hasil, kesimpulan, saran, penutup};
}
function autofillKegiatan(){
const t = buildKegiatanText();
state.bUraian = t.bUraian; state.hasil = t.hasil; state.kesimpulan = t.kesimpulan; state.saran = t.saran; state.penutup = t.penutup;
document.getElementById('f_bUraian').value = t.bUraian;
document.getElementById('f_hasil').value = t.hasil;
document.getElementById('f_kesimpulan').value = t.kesimpulan;
document.getElementById('f_saran').value = t.saran;
document.getElementById('f_penutup').value = t.penutup;
state.kegiatanTouched = false;
state.kegiatanSrc = {rhkNo: state.rhkNo, aksiIdx: state.aksiIdx};
renderPreview();
}
function maybeAutofillKegiatan(){
const changed = state.kegiatanSrc.rhkNo !== state.rhkNo || state.kegiatanSrc.aksiIdx !== state.aksiIdx;
if(!state.kegiatanTouched || changed){
autofillKegiatan();
}
}
document.getElementById('btnRefreshKegiatan').addEventListener('click', ()=>{
autofillKegiatan();
const s = document.getElementById('kegiatanStatus');
s.textContent = 'Diperbarui berdasarkan RHK & rencana aksi terpilih.';
setTimeout(()=>{ s.textContent=''; }, 2200);
});
['f_bUraian','f_hasil','f_kesimpulan','f_saran','f_penutup'].forEach(id=>{
document.getElementById(id).addEventListener('input', ()=>{ state.kegiatanTouched = true; });
});
/* =================== BIND SIMPLE FIELDS =================== */
const simpleFields = ['bulan','tahun','nama','nip','lokasi','tanggal','umum','maksud','ruang','bUraian','hasil','kesimpulan','saran','penutup'];
const fieldIdMap = {bulan:'f_bulan',tahun:'f_tahun',nama:'f_nama',nip:'f_nip',lokasi:'f_lokasi',tanggal:'f_tanggal',umum:'f_umum',maksud:'f_maksud',ruang:'f_ruang',bUraian:'f_bUraian',hasil:'f_hasil',kesimpulan:'f_kesimpulan',saran:'f_saran',penutup:'f_penutup'};
function bindFields(){
simpleFields.forEach(key=>{
const el = document.getElementById(fieldIdMap[key]);
if(!el) return;
el.value = state[key];
el.addEventListener('input', ()=>{ state[key] = el.value; renderPreview(); });
});
}
/* =================== TOMBOL AI + POPUP ISIAN FAKTA =================== */
/* Alur: klik "Sempurnakan dengan AI" -> popup berisi 5 isian yang menyesuaikan RHK + rencana aksi terpilih
   -> AI merangkai jawaban menjadi Bagian B (uraian) dan Bagian C (hasil). RHK P2K2 tidak memakai popup
   (perilaku lama). Tanpa menekan tombol ini, aplikasi berjalan seperti biasa. */
var AI_PENANDA_HASIL = '=====HASIL=====';
var AI_Q_WAKTU = {id:'waktu', label:'Kapan dan di mana kegiatan dilaksanakan?', type:'text', ph:'Contoh: 5–9 Agustus, Desa ..., Kec. ...'};
var AI_Q_AKHIR = {id:'akhir', label:'Kendala dan tindak lanjut', type:'text', ph:'Kendala yang dihadapi dan rencana berikutnya'};
function aiQ(id, label, type, opsi, ph){ return {id:id, label:label, type:type, opsi:opsi||null, ph:ph||''}; }

/* 3 isian khusus per rencana aksi (ditambah waktu/wilayah di awal dan kendala/tindak lanjut di akhir = 5 isian) */
var AI_SPEC = {
  generik: [
    aiQ('g1','Kegiatan utama yang dilakukan','text',null,'Ringkas apa yang dikerjakan'),
    aiQ('g2','Jumlah atau cakupan (KPM, peserta, dokumen, dll.)','text',null,'Contoh: 45 KPM'),
    aiQ('g3','Hasil atau temuan penting','text')
  ],
  supervisi: [
    aiQ('s1','Jumlah ASN PPPK yang disupervisi dan wilayahnya','text',null,'Contoh: 8 orang, Kab. ...'),
    aiQ('s2','Aspek yang disupervisi dan temuan','text'),
    aiQ('s3','Arahan yang diberikan','text')
  ],
  edukasiBansos: [
    aiQ('e1','Sasaran edukasi','multi',['KPM','Aparat desa/kelurahan','Penyalur','Masyarakat umum']),
    aiQ('e2','Jumlah peserta','text',null,'Contoh: 60 orang'),
    aiQ('e3','Materi pokok','multi',['Cara pencairan','Penggunaan KKS','Waspada penipuan','Hak dan kewajiban KPM'])
  ],
  masalahBansos: [
    aiQ('m1','Jenis permasalahan','multi',['Rekening pasif/dormant','KKS hilang atau rusak','Data tidak sesuai','Saldo tidak masuk']),
    aiQ('m2','Jumlah KPM bermasalah dan yang sudah terselesaikan','text',null,'Contoh: 12 KPM, 9 terselesaikan'),
    aiQ('m3','Langkah penyelesaian dan pihak yang dikoordinasikan','text',null,'Contoh: koordinasi dengan bank penyalur')
  ],
  monitoringBansos: [
    aiQ('o1','Bentuk penyaluran','single',['Tunai','Non-tunai','Tunai dan non-tunai']),
    aiQ('o2','Jumlah KPM yang dipantau','text',null,'Contoh: 80 KPM'),
    aiQ('o3','Kondisi dan temuan di lapangan','text')
  ],
  penelitianBansos: [
    aiQ('p1','Tujuan atau fokus penelitian','text'),
    aiQ('p2','Cara pengumpulan data dan jumlah sampel','text',null,'Contoh: wawancara dan kunjungan rumah, 20 KPM'),
    aiQ('p3','Temuan utama dan rekomendasi','text')
  ],
  verifikasiKomitmen: [
    aiQ('v1','Komponen yang diverifikasi','multi',['Pendidikan','Kesehatan','Kesejahteraan sosial']),
    aiQ('v2','Jumlah KPM diverifikasi, yang memenuhi dan belum memenuhi komitmen','text',null,'Contoh: 100 KPM, 92 memenuhi, 8 belum'),
    aiQ('v3','Penyebab belum memenuhi komitmen','multi',['Jarak','Kondisi kesehatan','Kendala ekonomi','Data tidak sesuai'])
  ],
  pendampinganKomitmen: [
    aiQ('d1','Bentuk layanan','multi',['Pendampingan','Mediasi','Fasilitasi','Advokasi','Kunjungan rumah']),
    aiQ('d2','Jumlah KPM yang didampingi','text',null,'Contoh: 15 KPM'),
    aiQ('d3','Permasalahan yang ditangani dan hasilnya (tanpa nama)','text')
  ],
  graduasi: [
    aiQ('r1','Jumlah KPM yang diusulkan graduasi','text',null,'Contoh: 20 KPM'),
    aiQ('r2','Jenis graduasi','multi',['Mandiri','Alamiah']),
    aiQ('r3','Tahap usulan saat ini','single',['Disusun','Diverifikasi','Diajukan','Disetujui'])
  ],
  ppse: [
    aiQ('x1','Jumlah KPM yang diusulkan PPSE','text',null,'Contoh: 10 KPM'),
    aiQ('x2','Jenis usaha atau bidang pemberdayaan','text'),
    aiQ('x3','Bentuk dukungan','multi',['Pelatihan','Bantuan modal','Akses permodalan','Pendampingan usaha'])
  ],
  pemutakhiran: [
    aiQ('u1','Jumlah data KPM yang dimutakhirkan','text',null,'Contoh: 75 data'),
    aiQ('u2','Jenis perubahan','multi',['Pindah domisili','Meninggal dunia','Perubahan komponen','Perubahan data keluarga']),
    aiQ('u3','Aplikasi yang dipakai dan jumlah yang belum selesai','text')
  ],
  vervalCalon: [
    aiQ('c1','Jumlah calon penerima yang diverifikasi dan divalidasi','text',null,'Contoh: 40 calon'),
    aiQ('c2','Hasil verval (layak, tidak layak, belum ditemukan)','text',null,'Contoh: 30 layak, 8 tidak layak, 2 belum ditemukan'),
    aiQ('c3','Cara verval','multi',['Kunjungan rumah','Musyawarah desa','Pemeriksaan dokumen'])
  ],
  kasus: [
    aiQ('k1','Jenis kasus','multi',['Pengaduan','Bencana','Kerentanan']),
    aiQ('k2','Jumlah kasus yang direspon dan yang selesai','text',null,'Contoh: 5 kasus, 3 selesai'),
    aiQ('k3','Tindakan yang dilakukan','multi',['Asesmen','Kunjungan lapangan','Koordinasi','Usulan bantuan','Rujukan'])
  ],
  laporan: [
    aiQ('l1','Jumlah dan jenis laporan yang disusun atau dikompilasi','text',null,'Contoh: 24 laporan pendamping'),
    aiQ('l2','Sumber data, serta jumlah pendamping yang sudah dan belum menyetor','text'),
    aiQ('l3','Temuan utama dari analisis','text')
  ],
  tlhp: [
    aiQ('t1','Pokok temuan (tanpa nama orang)','text'),
    aiQ('t2','Jumlah temuan yang ditindaklanjuti dari total','text',null,'Contoh: 4 dari 6 temuan'),
    aiQ('t3','Status tindak lanjut','single',['Selesai','Sebagian','Masih proses'])
  ],
  sosialisasi: [
    aiQ('z1','Sasaran sosialisasi','multi',['Aparat kecamatan','Aparat desa/kelurahan','KPM','Masyarakat umum']),
    aiQ('z2','Jumlah peserta','text',null,'Contoh: 50 orang'),
    aiQ('z3','Kebijakan atau materi yang disosialisasikan','text')
  ],
  rakor: [
    aiQ('a1','Nama atau tema kegiatan','text'),
    aiQ('a2','Penyelenggara, tempat atau daring, dan jumlah peserta','text'),
    aiQ('a3','Materi kunci','text')
  ],
  pengawasan: [
    aiQ('w1','Jumlah pendamping yang diawasi','text',null,'Contoh: 12 pendamping'),
    aiQ('w2','Aspek yang diawasi dan temuan','text'),
    aiQ('w3','Arahan atau edukasi yang diberikan','text')
  ],
  koordinasiInstansi: [
    aiQ('i1','Instansi yang dikoordinasikan','text'),
    aiQ('i2','Topik pembahasan','text'),
    aiQ('i3','Kesepakatan dan tindak lanjut bersama','text')
  ],
  koordinasiKatim: [
    aiQ('n1','Jumlah yang dikoordinasikan','text',null,'Contoh: 6 Katim Kab/Kota'),
    aiQ('n2','Topik pelaksanaan program','text'),
    aiQ('n3','Kesepakatan atau arahan','text')
  ],
  evaluasi: [
    aiQ('f1','Jumlah ASN PPPK yang dievaluasi','text',null,'Contoh: 20 orang'),
    aiQ('f2','Aspek atau indikator yang dinilai','text'),
    aiQ('f3','Hasil secara umum (tanpa nama) dan tindak lanjut pembinaan','text')
  ],
  tugasLain: [
    aiQ('y1','Sumber penugasan atau nomor surat tugas','text'),
    aiQ('y2','Isi penugasan','text'),
    aiQ('y3','Hasil yang dicapai','text')
  ],
  medsos: [
    aiQ('b1','Platform yang dipakai','multi',['Instagram','Facebook','TikTok','YouTube','WhatsApp']),
    aiQ('b2','Jumlah unggahan','text',null,'Contoh: 8 unggahan'),
    aiQ('b3','Topik atau program yang diangkat','text')
  ]
};

/* Menentukan set pertanyaan. Mengembalikan null untuk RHK P2K2 (tanpa popup). */
function aiKunciSpec(item, aksiText){
  var r = String((item && item.rhk) || '').toLowerCase();
  var a = String(aksiText || '').toLowerCase();
  if(r.indexOf('p2k2') >= 0) return null;
  var kunci = 'generik';
  if(r.indexOf('berita baik') >= 0){ kunci = 'medsos'; }
  else if(r.indexOf('penyaluran bansos') >= 0){
    if(a.indexOf('supervisi kebijakan') >= 0) kunci = 'supervisi';
    else if(a.indexOf('edukasi') >= 0) kunci = 'edukasiBansos';
    else if(a.indexOf('permasalahan') >= 0) kunci = 'masalahBansos';
    else if(a.indexOf('monitoring') >= 0 || a.indexOf('pemantauan') >= 0) kunci = 'monitoringBansos';
    else if(a.indexOf('penelitian') >= 0) kunci = 'penelitianBansos';
  }
  else if(r.indexOf('verifikasi komitmen') >= 0){
    if(a.indexOf('supervisi') >= 0) kunci = 'supervisi';
    else if(a.indexOf('pendampingan') >= 0) kunci = 'pendampinganKomitmen';
    else kunci = 'verifikasiKomitmen';
  }
  else if(r.indexOf('graduasi') >= 0){ kunci = (a.indexOf('ppse') >= 0) ? 'ppse' : 'graduasi'; }
  else if(r.indexOf('permutakhiran') >= 0 || r.indexOf('pemutakhiran') >= 0 || r.indexOf('verifikasi, validasi') >= 0){
    if(a.indexOf('supervisi') >= 0) kunci = 'supervisi';
    else if(a.indexOf('pemutakhiran') >= 0) kunci = 'pemutakhiran';
    else kunci = 'vervalCalon';
  }
  else if(r.indexOf('kasus adaptif') >= 0){ kunci = 'kasus'; }
  else if(r.indexOf('laporan bulanan') >= 0){ kunci = 'laporan'; }
  else if(r.indexOf('direktif') >= 0){
    if(a.indexOf('tindak lanjut hasil pemeriksaan') >= 0 || a.indexOf('tlhp') >= 0) kunci = 'tlhp';
    else if(a.indexOf('rapat koordinasi') >= 0) kunci = 'rakor';
    else if(a.indexOf('sosialisasi') >= 0) kunci = 'sosialisasi';
    else if(a.indexOf('pengawasan') >= 0) kunci = 'pengawasan';
    else if(a.indexOf('koordinasi dan sinkronisasi') >= 0) kunci = 'koordinasiInstansi';
    else if(a.indexOf('berkoo') >= 0) kunci = 'koordinasiKatim';
    else if(a.indexOf('evaluasi kinerja') >= 0) kunci = 'evaluasi';
    else if(a.indexOf('tugas lainnya') >= 0) kunci = 'tugasLain';
  }
  return kunci;
}
var AI_SPEC_P2K2 = [
  {id:'p_tglK', label:'Tanggal kegiatan P2K2 *', type:'date'},
  {id:'p_tglL', label:'Tanggal laporan (tanggal pengisian) *', type:'date'},
  {id:'p_materi', label:'Materi atau topik yang dibahas', type:'text', ph:'Contoh: Modul Pengasuhan dan Pendidikan Anak, Sesi 1'},
  {id:'p_metode', label:'Metode yang dipakai', type:'multi', opsi:['Ceramah dan diskusi kelompok','Tanya jawab','Simulasi / praktik sederhana','Permainan edukatif','Pemutaran video']},
  {id:'p_respon', label:'Keterlibatan KPM', type:'single', opsi:['Sangat antusias','Antusias','Cukup aktif','Kurang aktif']},
  {id:'p_temuan', label:'Hal penting yang muncul dalam diskusi', type:'text', ph:'Contoh: KPM berbagi pengalaman mengasuh anak, ada pertanyaan seputar jadwal posyandu'},
  {id:'p_akhir', label:'Kendala dan tindak lanjut', type:'text', ph:'Kendala yang dihadapi dan rencana pertemuan berikutnya'}
];
function aiPilihSpec(item, aksiText){
  if(isP2K2Aksi(item, aksiText)) return AI_SPEC_P2K2;
  var kunci = aiKunciSpec(item, aksiText);
  if(kunci === null) return null;
  return [AI_Q_WAKTU].concat(AI_SPEC[kunci] || AI_SPEC.generik, [AI_Q_AKHIR]);
}

/* Aksi yang memakai bagian lipat "Data KPM" (nama lengkap + NIK 16 angka). Disamarkan sebelum ke AI. */
var AI_KPM = {
  masalahBansos:        {judul: 'KPM yang bermasalah'},
  pendampinganKomitmen: {judul: 'KPM yang didampingi'},
  verifikasiKomitmen:   {judul: 'KPM yang belum memenuhi komitmen'},
  graduasi:             {judul: 'KPM yang diusulkan graduasi'},
  ppse:                 {judul: 'KPM yang diusulkan PPSE'},
  vervalCalon:          {judul: 'Calon penerima yang diverifikasi'},
  pemutakhiran:         {judul: 'KPM yang datanya dimutakhirkan'},
  kasus:                {judul: 'KPM yang ditangani'}
};
var AI_KPM_MAKS = 10;
function aiInfoKpm(item, aksiText){ return AI_KPM[aiKunciSpec(item, aksiText)] || null; }

/* Jawaban diingat selama halaman terbuka, hanya untuk RHK + aksi yang sedang aktif */
var aiJawaban = { kunci: '', nilai: {}, kpm: [] };
function aiJawabanReset(){ aiJawaban = { kunci: '', nilai: {}, kpm: [] }; }

var aiPopSedangProses = false;
var aiPopSpec = null;

function aiPopBuatField(q){
  var wrap = document.createElement('div'); wrap.className = 'ai-pop-field';
  var lab = document.createElement('label'); lab.textContent = q.label; wrap.appendChild(lab);
  var simpan = aiJawaban.nilai[q.id] || {};
  if(q.type === 'date'){
    var di = document.createElement('input'); di.type = 'date'; di.dataset.q = q.id; di.id = 'aiq_' + q.id;
    di.value = simpan.teks || (q.id === 'p_tglK' ? (state.p2k2.tglKegiatan || '') : (state.tanggal || ''));
    lab.htmlFor = di.id; wrap.appendChild(di);
    return wrap;
  }
  if(q.type === 'text'){
    var ta = document.createElement('textarea'); ta.rows = 2; ta.maxLength = 400; ta.dataset.q = q.id;
    ta.placeholder = q.ph || ''; ta.value = simpan.teks || (q.id === 'p_materi' ? (state.p2k2.materi || '') : '');
    lab.htmlFor = 'aiq_' + q.id; ta.id = 'aiq_' + q.id; wrap.appendChild(ta);
    return wrap;
  }
  var pills = document.createElement('div'); pills.className = 'ai-pop-pills';
  var nama = 'aiq_' + q.id, dipilih = simpan.pilihan || [];
  q.opsi.forEach(function(op){
    var pl = document.createElement('label'); pl.className = 'ai-pop-pill';
    var inp = document.createElement('input'); inp.type = (q.type === 'single') ? 'radio' : 'checkbox';
    inp.name = nama; inp.value = op; inp.checked = dipilih.indexOf(op) >= 0;
    if(inp.checked) pl.classList.add('on');
    inp.addEventListener('change', function(){
      if(q.type === 'single'){
        Array.prototype.forEach.call(pills.children, function(c){ c.classList.remove('on'); });
      }
      pl.classList.toggle('on', inp.checked);
    });
    pl.appendChild(inp); pl.appendChild(document.createTextNode(op)); pills.appendChild(pl);
  });
  wrap.appendChild(pills);
  var lain = document.createElement('input'); lain.type = 'text'; lain.maxLength = 200;
  lain.placeholder = 'Lainnya (tulis sendiri, boleh dikosongkan)'; lain.dataset.lain = q.id; lain.value = simpan.lain || '';
  wrap.appendChild(lain);
  return wrap;
}

function aiPopKumpul(){
  var hasil = [], nilai = {};
  aiPopSpec.forEach(function(q){
    var teks = '', rec = {};
    if(q.type === 'text' || q.type === 'date'){
      var ta = document.querySelector('#aiPopFields [data-q="' + q.id + '"]');
      teks = ta ? ta.value.trim() : ''; rec.teks = teks;
    } else {
      var pil = [];
      Array.prototype.forEach.call(document.querySelectorAll('#aiPopFields input[name="aiq_' + q.id + '"]'), function(i){ if(i.checked) pil.push(i.value); });
      var l = document.querySelector('#aiPopFields input[data-lain="' + q.id + '"]');
      var lain = l ? l.value.trim() : '';
      rec.pilihan = pil; rec.lain = lain;
      teks = pil.concat(lain ? [lain] : []).join(', ');
    }
    nilai[q.id] = rec;
    if(teks) hasil.push({ label: q.label, isi: teks });
  });
  aiJawaban.nilai = nilai;
  return hasil;
}


/* ---------- Data KPM: baris isian, validasi, penyamaran, pemulihan ---------- */
function aiKpmTambahBaris(nama, nik){
  var rows = document.getElementById('aiPopKpmRows');
  if(rows.children.length >= AI_KPM_MAKS) return;
  var r = document.createElement('div'); r.className = 'ai-pop-kpm-row';
  var n = document.createElement('input'); n.type = 'text'; n.maxLength = 80; n.dataset.f = 'nama'; n.placeholder = 'Nama lengkap'; n.value = nama || '';
  var k = document.createElement('input'); k.type = 'text'; k.maxLength = 19; k.inputMode = 'numeric'; k.dataset.f = 'nik'; k.placeholder = 'NIK (16 angka)'; k.value = nik || '';
  var x = document.createElement('button'); x.type = 'button'; x.className = 'ai-pop-kpm-hapus'; x.textContent = '×'; x.title = 'Hapus baris'; x.setAttribute('aria-label', 'Hapus baris');
  x.addEventListener('click', function(){ r.remove(); aiKpmUpdateTombol(); });
  [n, k].forEach(function(i){ i.addEventListener('input', function(){ i.classList.remove('salah'); }); });
  r.appendChild(n); r.appendChild(k); r.appendChild(x); rows.appendChild(r);
  aiKpmUpdateTombol();
}
function aiKpmUpdateTombol(){
  var rows = document.getElementById('aiPopKpmRows');
  document.getElementById('aiPopKpmTambah').style.display = rows.children.length >= AI_KPM_MAKS ? 'none' : '';
}
/* Mengembalikan {daftar:[{nama,nik}], error:''}. NIK dinormalkan jadi 16 angka. */
function aiKpmKumpul(){
  var hasil = [], error = '';
  Array.prototype.forEach.call(document.querySelectorAll('#aiPopKpmRows .ai-pop-kpm-row'), function(r){
    var n = r.querySelector('[data-f=nama]'), k = r.querySelector('[data-f=nik]');
    var nama = n.value.replace(/\s+/g, ' ').trim(), nik = k.value.replace(/\D/g, '');
    n.classList.remove('salah'); k.classList.remove('salah');
    if(!nama && !nik) return;
    if(!nama){ n.classList.add('salah'); if(!error) error = 'Isi nama lengkap untuk setiap NIK.'; return; }
    if(nik && nik.length !== 16){ k.classList.add('salah'); if(!error) error = 'NIK harus 16 angka (' + nama + ' baru ' + nik.length + ' angka).'; return; }
    hasil.push({nama: nama, nik: nik});
  });
  return {daftar: hasil, error: error};
}
function aiEscRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/* peta = {nama:[{kode,nilai}], nik:[{kode,nilai}]} */
function aiBuatPeta(daftar){
  var peta = {nama: [], nik: []};
  daftar.forEach(function(d, i){
    peta.nama.push({kode: '[KPM-' + (i + 1) + ']', nilai: d.nama});
    if(d.nik) peta.nik.push({kode: '[NIK-' + (peta.nik.length + 1) + ']', nilai: d.nik, milik: i});
  });
  return peta;
}
/* Mengganti nama terdaftar dan SEMUA angka 16 digit (terdaftar atau tidak) menjadi kode samaran. */
function aiSamarkan(teks, peta){
  var t = String(teks || '');
  peta.nama.slice().sort(function(a, b){ return b.nilai.length - a.nilai.length; }).forEach(function(n){
    var pola = n.nilai.split(/\s+/).map(aiEscRe).join('\\s+');
    t = t.replace(new RegExp(pola, 'gi'), n.kode);
  });
  t = t.replace(/\b\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}\b/g, function(m){
    var dig = m.replace(/\D/g, '');
    for(var i = 0; i < peta.nik.length; i++){ if(peta.nik[i].nilai === dig) return peta.nik[i].kode; }
    var baru = {kode: '[NIK-' + (peta.nik.length + 1) + ']', nilai: dig, milik: -1};
    peta.nik.push(baru); return baru.kode;
  });
  return t;
}
function aiPulihkan(teks, peta){
  var t = String(teks || '');
  t = t.replace(/\[\s*KPM[-\s_]?(\d+)\s*\]/gi, function(m, i){ var e = peta.nama[parseInt(i, 10) - 1]; return e ? e.nilai : m; });
  t = t.replace(/\[\s*NIK[-\s_]?(\d+)\s*\]/gi, function(m, i){ var e = peta.nik[parseInt(i, 10) - 1]; return e ? e.nilai : m; });
  return t;
}

function aiPopTutup(){
  document.getElementById('aiPopOverlay').classList.remove('open');
}
function aiPopError(pesan){
  var e = document.getElementById('aiPopErr');
  e.textContent = pesan || ''; e.classList.toggle('show', !!pesan);
}
function aiPopKunci(kunci){
  ['aiPopBatal','aiPopLewati','aiPopBuat'].forEach(function(id){ document.getElementById(id).disabled = kunci; });
  document.getElementById('aiPopBuat').textContent = kunci ? 'Menghasilkan teks...' : (isP2K2() ? 'Buat Rangkuman' : 'Buat Uraian');
}

function aiPopBuka(item, aksiText){
  aiPopSpec = aiPilihSpec(item, aksiText);
  var kunci = state.jabatan + '|' + state.rhkNo + '|' + state.aksiIdx;
  if(aiJawaban.kunci !== kunci){ aiJawaban = { kunci: kunci, nilai: {}, kpm: [] }; }
  var ctx = document.getElementById('aiPopCtx'); ctx.textContent = '';
  [['RHK', item ? item.rhk : ''], ['Indikator kinerja', item ? item.indikator : ''], ['Rencana aksi', aksiText], ['Bulan laporan', state.bulan + ' ' + state.tahun]].forEach(function(p){
    var b = document.createElement('b'); b.textContent = p[0];
    var d = document.createElement('span'); d.textContent = p[1] || '-';
    ctx.appendChild(b); ctx.appendChild(d);
  });
  var box = document.getElementById('aiPopFields'); box.textContent = '';
  aiPopSpec.forEach(function(q){ box.appendChild(aiPopBuatField(q)); });
  var infoKpm = aiInfoKpm(item, aksiText);
  var det = document.getElementById('aiPopKpm'), rowsEl = document.getElementById('aiPopKpmRows');
  rowsEl.textContent = '';
  document.getElementById('aiPopWarn').textContent = infoKpm
    ? 'Di kolom di atas jangan isi nama atau NIK. Nama dan NIK lengkap diisi di bagian "Data KPM" di bawah, yang disamarkan otomatis sebelum ke AI.'
    : 'Jangan isi nama atau NIK KPM. Cukup jumlah dan wilayah.';
  if(infoKpm){
    det.style.display = '';
    document.getElementById('aiPopKpmJudul').textContent = '\u2795 Tambahkan nama dan NIK: ' + infoKpm.judul + ' (opsional)';
    var simpanKpm = aiJawaban.kpm || [];
    simpanKpm.forEach(function(d){ aiKpmTambahBaris(d.nama, d.nik); });
    if(!simpanKpm.length) aiKpmTambahBaris('', '');
    det.open = simpanKpm.length > 0;
  } else { det.style.display = 'none'; det.open = false; }
  document.getElementById('aiPopSub').textContent = isP2K2Aksi(item, aksiText)
    ? 'Isi tanggal dan fakta kegiatan P2K2. AI akan menyusun Rangkuman Kegiatan; tanggal otomatis masuk ke laporan dan nomor laporan.'
    : 'Isi fakta kegiatan Anda. AI akan merangkainya menjadi uraian (Bagian B) dan hasil yang dicapai (Bagian C). Kosongkan yang tidak perlu.';
  aiPopError(''); aiPopKunci(false);
  document.getElementById('aiPopOverlay').classList.add('open');
  var f = box.querySelector('textarea'); if(f) f.focus();
}

function aiBangunPromptOtomatis(item, aksiText){
  return 'Susun bagian "B. Kegiatan yang Dilaksanakan" pada laporan bulanan PKH Kementerian Sosial RI, Direktorat Perlindungan Sosial Non Kebencanaan.\n' +
    'KONTEKS WAJIB DIIKUTI (jangan menyimpang dari ini):\n' +
    '- Jabatan pelapor: ' + state.jabatan + '\n' +
    '- Rencana Hasil Kerja (RHK) terpilih: "' + (item ? item.rhk : '') + '"\n' +
    '- Indikator Kinerja Individu: "' + (item ? item.indikator : '') + '"\n' +
    '- Rencana Aksi yang dikerjakan bulan ini: "' + aksiText + '"\n' +
    '- Bulan/Tahun laporan: ' + state.bulan + ' ' + state.tahun + '\n' +
    'Tulis uraian pelaksanaan/realisasi HANYA untuk rencana aksi di atas (jangan bercerita tentang RHK atau aksi lain), 1-2 paragraf.';
}

function aiBangunPromptFakta(item, aksiText, fakta, peta, judulKpm){
  var daftar = fakta.map(function(f){ return '- ' + f.label + ': ' + f.isi; }).join('\n');
  var blokKpm = '';
  if(peta && peta.nama.length){
    blokKpm = '\nDATA ' + String(judulKpm || 'KPM').toUpperCase() + ' (kode samaran; tulis kode PERSIS seperti tertulis, lengkap dengan kurung siku, jangan diubah, dipecah, diterjemahkan, atau diganti nama; jangan menambah orang lain):\n' +
      peta.nama.map(function(n, i){
        var nk = peta.nik.filter(function(x){ return x.milik === i; })[0];
        return '- ' + n.kode + (nk ? ' (NIK: ' + nk.kode + ')' : '');
      }).join('\n') + '\n' +
      'Sebut setiap KPM di atas dengan kode namanya setidaknya sekali. Bila ada kode NIK, tulis dalam tanda kurung tepat setelah nama pertama kali disebut, contoh: [KPM-1] (NIK [NIK-1]).';
  }
  return 'Susun dua bagian laporan bulanan PKH Kementerian Sosial RI, Direktorat Perlindungan Sosial Non Kebencanaan.\n' +
    'KONTEKS WAJIB DIIKUTI (jangan menyimpang dari ini):\n' +
    '- Jabatan pelapor: ' + state.jabatan + '\n' +
    '- Rencana Hasil Kerja (RHK) terpilih: "' + (item ? item.rhk : '') + '"\n' +
    '- Indikator Kinerja Individu: "' + (item ? item.indikator : '') + '"\n' +
    '- Rencana Aksi yang dikerjakan bulan ini: "' + aksiText + '"\n' +
    '- Bulan/Tahun laporan: ' + state.bulan + ' ' + state.tahun + '\n' +
    'FAKTA DARI PELAPOR (satu-satunya fakta yang boleh dipakai; yang tidak tertulis di sini JANGAN dikarang, termasuk angka, tanggal, nama tempat, dan nama orang):\n' +
    daftar + blokKpm + '\n' +
    'TUGAS: tulis dua bagian, dipisahkan oleh satu baris yang berisi persis ' + AI_PENANDA_HASIL + '\n' +
    '1) Bagian pertama = Uraian Pelaksanaan/Realisasi Kegiatan (1-2 paragraf naratif yang merangkai waktu, wilayah, kegiatan, dan pihak yang terlibat menjadi satu kesatuan kalimat yang mengalir).\n' +
    '2) Bagian kedua = Hasil yang Dicapai (1 paragraf naratif: capaian dalam angka bila diberikan, temuan, kendala, dan tindak lanjut).\n' +
    'Hanya untuk rencana aksi di atas. Jika suatu hal tidak diberikan, tulis kalimat umum yang sesuai RHK tanpa mengarang angka, atau gunakan penanda [isi sesuai data lapangan]. Jangan menulis judul bagian.';
}

async function aiJalankan(prompt, ikutC, peta){
  var teks = await callClaudeAI_withCredit(prompt);
  teks = String(teks || '').trim();
  var b = teks, c = '';
  if(ikutC){
    var idx = teks.indexOf(AI_PENANDA_HASIL);
    if(idx >= 0){ b = teks.slice(0, idx).trim(); c = teks.slice(idx + AI_PENANDA_HASIL.length).trim(); }
  }
  var peringatan = [];
  if(peta && (peta.nama.length || peta.nik.length)){
    b = aiPulihkan(b, peta); c = aiPulihkan(c, peta);
    var gabung = (b + ' ' + c).toLowerCase(), gabungDigit = (b + ' ' + c).replace(/\D/g, '');
    var hilangNama = peta.nama.filter(function(n){ return gabung.indexOf(n.nilai.toLowerCase()) < 0; }).map(function(n){ return n.nilai; });
    var hilangNik = peta.nik.filter(function(n){ return gabungDigit.indexOf(n.nilai) < 0; }).map(function(n){ return n.nilai; });
    if(hilangNama.length) peringatan.push('nama belum muncul di teks: ' + hilangNama.join(', '));
    if(hilangNik.length) peringatan.push('NIK belum muncul di teks: ' + hilangNik.join(', '));
    if(/\[\s*(KPM|NIK)[-\s_]?\d+\s*\]/i.test(b + ' ' + c)) peringatan.push('ada kode samaran yang tidak dikenali, periksa teksnya');
  }
  var taB = document.getElementById('f_bUraian');
  taB.value = b; taB.dispatchEvent(new Event('input'));
  if(ikutC && c){
    var taC = document.getElementById('f_hasil');
    taC.value = c; taC.dispatchEvent(new Event('input'));
  }
  return { bagianC: !!(ikutC && c), peringatan: peringatan };
}

document.getElementById('btnGenB').addEventListener('click', function(){
  var st = document.getElementById('bAiStatus');
  if(state.rhkNo===null || state.aksiIdx===null){
    st.textContent = 'Pilih RHK & rencana aksi pada langkah 2 terlebih dahulu.';
    return;
  }
  var item = getSelectedRhk();
  var aksiText = getSelectedAksiText();
  var spec = aiPilihSpec(item, aksiText);
  if(!spec){
    // RHK P2K2: tanpa popup, perilaku lama
    generateWithAI(function(){ return aiBangunPromptOtomatis(item, aksiText); }, 'f_bUraian', 'bAiStatus', document.getElementById('btnGenB'));
    return;
  }
  aiPopBuka(item, aksiText);
});

function aiBangunPromptP2k2(fakta){
  var daftar = fakta.map(function(f){ return '- ' + f.label.replace(/\s*\*$/, '') + ': ' + f.isi; }).join('\n');
  var p = state.p2k2;
  var tambahan = [
    p.hadir !== '' ? '- Peserta hadir: ' + p.hadir + ' orang' : '',
    p.sakit !== '' ? '- Peserta sakit: ' + p.sakit + ' orang' : '',
    p.alpa !== '' ? '- Peserta alpa: ' + p.alpa + ' orang' : '',
    p.tempat ? '- Tempat: ' + p.tempat : '',
    '- Wilayah: ' + p2kWilayah()
  ].filter(Boolean).join('\n');
  return 'Susun isi kolom "Rangkuman Kegiatan" pada Laporan Kegiatan Pertemuan Peningkatan Kemampuan Keluarga (P2K2), Program Keluarga Harapan (PKH), Kementerian Sosial RI.\n' +
    'KONTEKS:\n- Jabatan pelapor: ' + (p2kJabatanLabel() || state.jabatan) + '\n- Bulan/Tahun laporan: ' + state.bulan + ' ' + state.tahun + '\n' +
    'FAKTA DARI PELAPOR (satu-satunya fakta yang boleh dipakai; jangan mengarang angka, tanggal, nama tempat, atau nama orang):\n' + (daftar || '- (tidak ada fakta tambahan)') + '\n' + tambahan + '\n' +
    'TUGAS: tulis 2 paragraf naratif berbahasa Indonesia baku, orang ketiga, yang menggambarkan jalannya pertemuan (pembukaan, penyampaian materi, diskusi/tanya jawab, simulasi bila ada, dan penutup) serta keterlibatan KPM. ' +
    'Jangan menyebut nama atau NIK KPM. Jangan menulis judul, daftar bernomor, atau tanda markdown. Bila suatu hal tidak diberikan, tulis kalimat umum yang wajar untuk P2K2 tanpa mengarang angka. BATAS KERAS: seluruh teks maksimal 900 karakter termasuk spasi.';
}
async function aiP2k2Kirim(tanpaFakta){
  if(aiPopSedangProses) return;
  var fakta = aiPopKumpul();
  var tK = (aiJawaban.nilai.p_tglK || {}).teks || '', tL = (aiJawaban.nilai.p_tglL || {}).teks || '';
  if(!tanpaFakta){
    if(!tK){ aiPopError('Isi tanggal kegiatan P2K2.'); return; }
    if(!tL){ aiPopError('Isi tanggal laporan.'); return; }
  }
  if(tK && tL && tL < tK){ aiPopError('Tanggal laporan tidak boleh lebih awal dari tanggal kegiatan.'); return; }
  var semua = fakta.map(function(f){ return f.isi; }).join(' ');
  if(/\b\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}[\s.\-]?\d{4}\b/.test(semua)){ aiPopError('Jangan isi NIK atau angka 16 digit. Hapus dulu dari isian.'); return; }
  if(tK || tL) p2k2SetTanggal(tK || state.p2k2.tglKegiatan, tL || state.tanggal);
  var materi = (aiJawaban.nilai.p_materi || {}).teks || '';
  if(materi && !(state.p2k2.materi || '').trim()){
    state.p2k2.materi = materi; var em = document.getElementById('p2k_materi'); if(em) em.value = materi; p2k2Regen();
  }
  var st = document.getElementById('p2kAiStatus');
  aiPopError(''); aiPopSedangProses = true; aiPopKunci(true);
  try{
    st.textContent = 'Menghasilkan teks...';
    var faktaPakai = fakta.filter(function(f){ return !/^Tanggal /.test(f.label); }).map(function(f){ return {label: f.label, isi: f.isi}; });
    if(tK) faktaPakai.unshift({label: 'Tanggal kegiatan', isi: p2kTgl(tK)});
    var teks = String(await callClaudeAI_withCredit(aiBangunPromptP2k2(tanpaFakta ? [] : faktaPakai)) || '').trim();
    if(!teks) throw new Error('AI tidak mengembalikan teks.');
    teks = teks.replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').trim();
    teks = p2kPotong(teks);
    var ta = document.getElementById('p2k_rangkuman');
    ta.value = teks; ta.dispatchEvent(new Event('input'));
    aiPopTutup();
    st.textContent = 'Selesai. Rangkuman terisi, tanggal sudah masuk ke laporan.';
    setTimeout(function(){ st.textContent = ''; }, 4000);
  }catch(err){
    aiPopError('Gagal: ' + (err && err.message ? err.message : 'Permintaan AI gagal.') + ' Isian Anda tetap tersimpan, coba lagi.');
    st.textContent = '';
  }finally{
    aiPopSedangProses = false; aiPopKunci(false);
  }
}
document.getElementById('btnGenP2k2').addEventListener('click', function(){
  var st = document.getElementById('p2kAiStatus');
  if(!isP2K2()){ st.textContent = 'Pilih RHK P2K2 dan rencana aksi pelaksanaan pada langkah 2.'; return; }
  aiPopBuka(getSelectedRhk(), getSelectedAksiText());
});
async function aiPopKirim(tanpaFakta){
  if(aiPopSedangProses) return;
  var item = getSelectedRhk(), aksiText = getSelectedAksiText();
  if(isP2K2()) return aiP2k2Kirim(tanpaFakta);
  var fakta = aiPopKumpul();
  var infoKpm = aiInfoKpm(item, aksiText);
  var kpm = {daftar: [], error: ''};
  if(infoKpm && !tanpaFakta){
    kpm = aiKpmKumpul();
    aiJawaban.kpm = kpm.daftar.slice();
    if(kpm.error){
      document.getElementById('aiPopKpm').open = true;
      aiPopError(kpm.error);
      return;
    }
  }
  if(!tanpaFakta && fakta.length === 0 && kpm.daftar.length === 0){
    aiPopError('Isi minimal satu pertanyaan, atau pilih "Lewati, buat otomatis".');
    return;
  }
  aiPopError(''); aiPopSedangProses = true; aiPopKunci(true);
  var st = document.getElementById('bAiStatus');
  try{
    st.textContent = 'Menghasilkan teks...';
    var peta = aiBuatPeta(kpm.daftar);
    var prompt = tanpaFakta ? aiBangunPromptOtomatis(item, aksiText) : null;
    if(!tanpaFakta){
      // Samarkan nama/NIK terdaftar dan angka 16 digit di semua kolom bebas sebelum dikirim
      var faktaAman = fakta.map(function(f){ return {label: f.label, isi: aiSamarkan(f.isi, peta)}; });
      prompt = aiBangunPromptFakta(item, aksiText, faktaAman, peta, infoKpm ? infoKpm.judul : '');
    }
    var r = await aiJalankan(prompt, !tanpaFakta, tanpaFakta ? null : peta);
    aiPopTutup();
    var pesan = (!tanpaFakta && r.bagianC) ? 'Selesai. Bagian B dan C terisi.' : 'Selesai.';
    if(r.peringatan && r.peringatan.length) pesan += ' Periksa: ' + r.peringatan.join('; ') + '.';
    st.textContent = pesan;
    setTimeout(function(){ st.textContent = ''; }, (r.peringatan && r.peringatan.length) ? 20000 : 3500);
  }catch(err){
    aiPopError('Gagal: ' + (err && err.message ? err.message : 'Permintaan AI gagal.') + ' Isian Anda tetap tersimpan, coba lagi.');
    st.textContent = '';
  }finally{
    aiPopSedangProses = false; aiPopKunci(false);
  }
}
document.getElementById('aiPopKpmTambah').addEventListener('click', function(){ aiKpmTambahBaris('', ''); var l = document.querySelectorAll('#aiPopKpmRows input[data-f=nama]'); if(l.length) l[l.length-1].focus(); });
document.getElementById('aiPopBuat').addEventListener('click', function(){ aiPopKirim(false); });
document.getElementById('aiPopLewati').addEventListener('click', function(){ aiPopKirim(true); });
document.getElementById('aiPopBatal').addEventListener('click', function(){ if(!aiPopSedangProses) aiPopTutup(); });
document.getElementById('aiPopOverlay').addEventListener('mousedown', function(e){ if(e.target === this && !aiPopSedangProses) aiPopTutup(); });
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && !aiPopSedangProses && document.getElementById('aiPopOverlay').classList.contains('open')) aiPopTutup();
});
/*__AKHIR_BAGIAN_3__*/
/* =================== PREVIEW / PAPER RENDERING (paginasi otomatis) =================== */
// PERBAIKAN KEAMANAN: versi sebelumnya ("return (s||'').toString();") TIDAK
// benar-benar melakukan HTML-escaping meski namanya esc() — hanya mengubah
// ke string biasa. Ini akar masalah sesungguhnya (bukan sekadar soal
// localStorage): kalau data ini (mis. Nama dari form pendaftaran) mengandung
// karakter HTML dan dirender lewat innerHTML, bisa dieksekusi sebagai kode.
// Sekarang benar-benar meng-encode karakter berbahaya.
function esc(s){
  return (s||'').toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function nl2pArr(text){
const arr = (text||'').split(/\n{1,}/).filter(x=>x.trim());
return arr.length ? arr.map(p=>`<p>${esc(p)}</p>`) : ['<p>&nbsp;</p>'];
}
/* Dimensi kertas A4 & area konten (sama persis dengan CSS .paper: 210x297mm, padding 18mm),
dikonversi ke px memakai definisi CSS baku (1mm = 96/25.4 px) supaya pengukuran cocok
dengan yang benar-benar dirender di layar maupun saat diekspor ke PDF. */
const MM_TO_PX = 96 / 25.4;
const PAPER_PAD_MM = 18;
const PAPER_CONTENT_W_PX = (210 - PAPER_PAD_MM * 2) * MM_TO_PX;
const PAPER_CONTENT_H_PX = (297 - PAPER_PAD_MM * 2) * MM_TO_PX;
function getMeasureBox(){
let m = document.getElementById('measureBox');
if(!m){
m = document.createElement('div');
m.id = 'measureBox';
m.className = 'measure-box p-sec';
m.style.width = PAPER_CONTENT_W_PX + 'px';
document.body.appendChild(m);
}
return m;
}
function measureHeight(html){
const m = getMeasureBox();
m.innerHTML = html;
const h = m.getBoundingClientRect().height;
m.innerHTML = '';
return h;
}
/* Susun isi laporan (bagian A-E) sebagai daftar blok yang "mengalir" (flow blocks).
Tiap paragraf jadi satu blok tersendiri (judul bagian selalu menempel pada paragraf
pertama berikutnya agar tidak pernah tertinggal sendirian di akhir halaman), sehingga
nantinya bisa disusun otomatis ke beberapa lembar A4 sesuai kapasitas tiap halaman. */
function p2kAlpha(text){
const arr = (text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
return arr.length ? '<ol class="p-alpha">' + arr.map(x=>'<li>'+esc(x)+'</li>').join('') + '</ol>' : '';
}
function p2kRow(label, val){ return '<tr><th class="p2k-th">'+label+'</th><td colspan="3">'+(val ? esc(val) : '&nbsp;')+'</td></tr>'; }
function p2kRow4(l1, v1, l2, v2){ return '<tr><th class="p2k-th">'+l1+'</th><td>'+(v1 ? esc(v1) : '&nbsp;')+'</td><th class="p2k-th">'+l2+'</th><td>'+(v2 ? esc(v2) : '&nbsp;')+'</td></tr>'; }
function p2kBandRow(t){ return '<tr><th class="p2k-band" colspan="4">'+t+'</th></tr>'; }
function p2kTabel(rows){ return '<table class="p2k-tbl"><colgroup><col style="width:23%"><col style="width:27%"><col style="width:23%"><col style="width:27%"></colgroup><tbody>'+rows+'</tbody></table>'; }
function p2kDaftarPemateri(){
const p = state.p2k2, out = [];
if(p.pemateriSaya) out.push({nama: state.nama || '', jabatan: p2kJabatanLabel()});
p.pemateriLain.forEach(x=>{ if((x.nama||'').trim() || (x.jabatan||'').trim()) out.push(x); });
return out.length ? out : [{nama:'', jabatan:''}];
}
function p2kFotoPertama(){ return state.dok.slice(0, 4); }
function buildFlowBlocksP2K2(){
const p = state.p2k2, blocks = [];
const pushPara = (prefix, text)=>{ nl2pArr(text).forEach((x, i)=>{ blocks.push((i===0 ? prefix : '') + x); }); };
pushPara('<h3 class="p2k-h">A. Pendahuluan</h3><p><b>1. Umum</b></p>', state.umum);
blocks.push('<p><b>2. Maksud dan Tujuan</b></p>' + (p2kAlpha(state.maksud) || '<p>&nbsp;</p>'));
const ruang = (state.ruang||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
blocks.push('<p><b>3. Ruang Lingkup</b></p>' + (ruang.length ? '<p>'+esc(ruang[0])+'</p>' + p2kAlpha(ruang.slice(1).join('\n')) : '<p>&nbsp;</p>'));
blocks.push('<p><b>4. Dasar</b></p><ol class="p-alpha">' + (state.dasar.filter(d=>d.trim()).map(d=>'<li>'+esc(d)+'</li>').join('') || '<li>&nbsp;</li>') + '</ol>');
blocks.push('__PB__');
const pem = p2kDaftarPemateri();
let pemRows = '';
pem.forEach((x, i)=>{
const n = pem.length > 1 ? ' ' + (i+1) : '';
pemRows += p2kRow('Nama Pemateri' + n, x.nama) + p2kRow('Jabatan / Instansi' + n, x.jabatan);
});
const jam = (v)=> v || '';
blocks.push('<h3 class="p2k-h">B. Pelaksanaan Kegiatan dan Hasil Yang Dicapai</h3><p class="p2k-star"><i>* Laporan P2K2 ini menjadi dokumen resmi sebagai laporan SKP untuk RHK P2K2</i></p><div class="p2k-title"><b>LAPORAN KEGIATAN P2K2</b><br>Pertemuan Peningkatan Kemampuan Keluarga</div>' +
p2kTabel(
p2kBandRow('A. INFORMASI UMUM') +
p2kRow4('No. Laporan', p2kNomor(false), 'Tanggal Pengisian', p2kTgl(state.tanggal)) +
p2kRow('Nama Pendamping', state.nama) +
p2kRow4('Desa / Kelurahan', p2kKapital(p.desa), 'Kecamatan', p2kKapital(p.kec)) +
p2kRow4('Kabupaten / Kota', p.kab ? ((p.jenisKab === 'Kabupaten' ? 'Kabupaten ' : 'Kota ') + p2kKapital(p.kab)) : '', 'Provinsi', p2kKapital(p.prov)) +
p2kBandRow('B. WAKTU PELAKSANAAN') +
p2kRow('Tanggal Kegiatan', p2kTgl(p.tglKegiatan)) +
p2kRow4('Jam Mulai', jam(p.jamMulai), 'Jam Selesai', jam(p.jamSelesai)) +
p2kRow('Tempat Pelaksanaan', p.tempat) +
p2kBandRow('C. PEMATERI') + pemRows +
p2kBandRow('D. ISI MATERI') +
p2kRow('Materi', p2kMateri()) + p2kRow('Modul', p2kModul())
));
const angka = (v)=> (String(v).trim() === '' ? '.....' : String(v).trim());
blocks.push(p2kTabel(
p2kBandRow('E. ISI KEGIATAN') +
'<tr><th class="p2k-th">Jumlah Peserta Hadir</th><td colspan="3">Hadir : '+esc(angka(p.hadir))+' orang<br>Sakit : '+esc(angka(p.sakit))+' orang<br>Alpa : '+esc(angka(p.alpa))+' orang</td></tr>'
).replace('class="p2k-tbl"','class="p2k-tbl p2k-nojoin"'));
const rk = (p.rangkuman||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
if(!rk.length) rk.push('');
rk.forEach((par, i)=>{
const last = i === rk.length - 1;
blocks.push('<table class="p2k-tbl p2k-nojoin"><colgroup><col style="width:23%"><col style="width:77%"></colgroup><tbody><tr><th class="p2k-th p2k-top '+(i===0?'':'p2k-nolabel')+'">'+(i===0?'Rangkuman Kegiatan':'&nbsp;')+'</th><td class="p2k-top p2k-rk'+(last?' p2k-rk-last':'')+'">'+(par ? esc(par) : '&nbsp;')+'</td></tr></tbody></table>');
});
const fotos = p2kFotoPertama();
let fotoHtml = '';
for(let i=0;i<4;i+=2){
const a = fotos[i], b = fotos[i+1];
if(!a && !b && i>0) break;
fotoHtml += '<div class="p2k-foto-row">' + [a,b].map(f=> f ? '<div class="p2k-foto"><img src="'+f.url+'" alt="Foto kegiatan"></div>' : '<div class="p2k-foto p2k-foto-kosong"></div>').join('') + '</div>';
}
blocks.push('<table class="p2k-tbl p2k-nojoin"><colgroup><col style="width:23%"><col style="width:77%"></colgroup><tbody><tr><th class="p2k-th p2k-top">Foto Kegiatan<br><span class="p2k-sub">(foto geotagging)</span></th><td class="p2k-top p2k-fotocell">'+fotoHtml+'</td></tr></tbody></table>');
pushPara('<h3 class="p2k-h p2k-gap">C. Simpulan</h3>', state.kesimpulan);
pushPara('<h3 class="p2k-h">D. Penutup</h3>', state.penutup);
return blocks;
}
function buildFlowBlocks(){
if(isP2K2()) return buildFlowBlocksP2K2();
const item = getSelectedRhk();
const blocks = [];
function pushPara(prefixHtml, text){
const paras = nl2pArr(text);
paras.forEach((p, i)=>{ blocks.push((i===0 ? prefixHtml : '') + p); });
}
pushPara('<h3>A. Pendahuluan</h3><p><b>1. Latar Belakang</b></p>', state.umum);
pushPara('<p><b>2. Maksud dan Tujuan</b></p>', state.maksud);
pushPara('<p><b>3. Ruang Lingkup</b></p>', state.ruang);
blocks.push(`<p><b>4. Dasar Hukum</b></p><ol class="p-list">${state.dasar.filter(d=>d.trim()).map(d=>`<li>${esc(d)}</li>`).join('') || '<li>&nbsp;</li>'}</ol>`);
const bHeader = '<h3>B. Kegiatan yang Dilaksanakan</h3>' +
`<p><b>Rencana Hasil Kerja (RHK):</b> ${esc(item ? item.rhk : '-')}</p>` +
`<p><b>Rencana Aksi:</b> ${esc(getSelectedAksiText() || '-')}</p>`;
pushPara(bHeader, state.bUraian);
pushPara('<h3>C. Hasil yang Dicapai</h3>', state.hasil);
pushPara('<h3>D. Kesimpulan dan Saran</h3>', state.kesimpulan);
pushPara('', state.saran);
pushPara('<h3>E. Penutup</h3>', state.penutup);
return blocks;
}
/* Susun blok-blok yang sudah diukur tingginya ke beberapa "halaman" (array of array),
tanpa pernah memotong isi: begitu satu halaman penuh sesuai margin kertas A4,
sisanya otomatis berpindah ke halaman berikutnya. */
function paginateFlowBlocks(blocksHtml, firstCap, otherCap){
const pages = [];
let current = [];
let currentHeight = 0;
let cap = firstCap;
blocksHtml.forEach(html=>{
if(html === '__PB__'){
if(current.length){ pages.push(current); current = []; currentHeight = 0; cap = otherCap; }
return;
}
const h = measureHeight(html);
if(current.length && currentHeight + h > cap){
pages.push(current);
current = [];
currentHeight = 0;
cap = otherCap;
}
current.push(html);
currentHeight += h;
});
if(current.length) pages.push(current);
return pages;
}
/* Setiap entri pada array yang dikembalikan mewakili SATU lembar kertas A4 penuh.
Bagian A-E dipaginasi otomatis (bisa lebih dari satu lembar sesuai banyaknya isi),
tanda tangan ditempel di halaman terakhir jika masih muat atau dipindah ke lembar
baru bila tidak. Dokumentasi Kegiatan dan Lampiran Lainnya masing-masing tetap
mendapat lembar A4 tersendiri (dipecah otomatis jika jumlah item banyak). */
function buildPaperPages(interactive){
const item = getSelectedRhk();
const judul = item ? item.indikator : 'Indikator Kinerja Individu';
const aksiText = getSelectedAksiText();
const namaJabatan = (JABATAN_META[state.jabatan]||{}).label || state.jabatan;
const ttdBlock = state.ttd
? `<div class="ttd-resizable" style="width:${state.ttd.width}px;height:${state.ttd.height}px;transform:translate(calc(-50% + ${state.ttd.offsetX||0}px), ${state.ttd.offsetY||0}px);" title="${interactive ? 'Seret untuk memindah posisi' : ''}">
<img src="${state.ttd.url}" alt="Tanda tangan">
${interactive ? '<div class="ttd-hint">Seret untuk pindah</div><div class="ttd-resize-handle" title="Seret untuk mengubah ukuran"></div>' : ''}
</div>`
: '';
const modeP2k = isP2K2();
const p2kTitle = ()=>{
const p = state.p2k2;
const tg = p2kTgl(p.tglKegiatan);
const tgl = tg ? tg.toUpperCase() : '.. ' + String(state.bulan||'').toUpperCase() + ' ' + (state.tahun||'');
const kec = (p.kec||'').trim(), kab = (p.kab||'').trim(), prov = (p.prov||'').trim();
const wil = [kec ? 'KECAMATAN ' + kec.toUpperCase() : '', kab ? (p.jenisKab === 'Kabupaten' ? 'KABUPATEN ' : 'KOTA ') + kab.toUpperCase() : '', prov ? 'PROVINSI ' + prov.toUpperCase() : ''].filter(Boolean).join(' ');
return '<div class="p2k-judul"><b>LAPORAN NOMOR ' + esc(p2kNomor(true)) + '<br>TENTANG<br>KEGIATAN PERTEMUAN PENINGKATAN KAPASITAS KELUARGA (P2K2)<br>PROGRAM KELUARGA HARAPAN (PKH)<br>TANGGAL ' + esc(tgl) + (wil ? ' DI ' + esc(wil) : '') + '</b></div>' +
'<div class="p2k-tglatas">Tanggal : ' + esc(p2kTgl(state.tanggal) || '..........................') + '</div>';
};
const headerHtml = modeP2k ? `
<div class="paper-head">
<img class="kop-img" src="${KOP_IMAGE_DATA_URL}" alt="Kop Surat Direktorat Perlindungan Sosial Non Kebencanaan">
</div>
${p2kTitle()}
` : `
<div class="paper-head">
<img class="kop-img" src="${KOP_IMAGE_DATA_URL}" alt="Kop Surat Direktorat Perlindungan Sosial Non Kebencanaan">
</div>
<div class="paper-rhk">${esc(judul)}</div>
<div class="paper-aksi">${esc(aksiText) || '-'}</div>
<div class="paper-period">Bulan ${esc(state.bulan)} Tahun ${esc(state.tahun)}</div>
<hr class="rule">
`;
const contHeaderHtml = ``;
const signHtml = `
<div class="sign-block"><div class="sign-box">
<div class="loc-date">${esc(state.lokasi)}, ${state.tanggal ? new Date(state.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '..........................'}</div>
<div class="jabatan">${esc(namaJabatan)},</div>
<div class="ttd-zone">${ttdBlock}</div>
<div class="nama">${esc(state.nama) || '(...........................)'}</div>
<div>NIP. ${esc(state.nip) || '.................................'}</div>
</div></div>
`;
const flowBlocks = buildFlowBlocks();
const headerH = measureHeight(headerHtml);
const contHeaderH = measureHeight(contHeaderHtml);
const signH = measureHeight(signHtml);
const firstCap = PAPER_CONTENT_H_PX - headerH;
const contCap = PAPER_CONTENT_H_PX - contHeaderH;
let contentPages = paginateFlowBlocks(flowBlocks, firstCap, contCap);
if(!contentPages.length) contentPages = [[]];
// Coba tempelkan blok tanda tangan pada halaman konten terakhir jika masih muat;
// jika tidak, buat lembar baru khusus tanda tangan agar tidak terpotong.
const lastCap = contentPages.length === 1 ? firstCap : contCap;
const lastPageHeight = contentPages[contentPages.length - 1]
.reduce((sum, html)=> sum + measureHeight(html), 0);
const signOnNewPage = (lastPageHeight + signH) > lastCap;
const pages = [];
contentPages.forEach((blocksOnPage, idx)=>{
const isFirst = idx === 0;
const isLastContentPage = idx === contentPages.length - 1;
let html = (isFirst ? headerHtml : contHeaderHtml) + '<div class="p-sec">' + blocksOnPage.join('') + '</div>';
if(isLastContentPage && !signOnNewPage) html += signHtml;
pages.push(html);
});
if(signOnNewPage) pages.push(contHeaderHtml + signHtml);
const DOK_PER_PAGE = 2; // foto 5.48in x 3.5in per halaman A4 (margin 18mm)
const LAMP_PER_PAGE = 1; // 1 halaman sumber (gambar/halaman PDF) per lembar A4 agar isinya terpampang penuh & terbaca
const dokList = modeP2k ? state.dok.slice(4) : state.dok;
if(dokList.length){
const totalDokPages = Math.ceil(dokList.length / DOK_PER_PAGE);
for(let i=0, p=1; i<dokList.length; i+=DOK_PER_PAGE, p++){
const chunk = dokList.slice(i, i+DOK_PER_PAGE);
pages.push(`
<div class="paper-page-title">Dokumentasi Kegiatan${totalDokPages>1?` (${p}/${totalDokPages})`:''}</div>
<div class="doc-grid-print">
${chunk.map(d=>`<figure><div class="doc-photo-frame"><img src="${d.url}"></div></figure>`).join('')}
</div>
`);
}
}
/* Setiap file yang diunggah pada "Lampiran Lainnya" (JPG langsung, atau tiap
halaman dari file PDF yang sudah dirender jadi gambar) mendapat SATU
lembar A4 tersendiri berisi gambar isinya secara penuh & terbaca —
sehingga banyaknya lembar lampiran otomatis mengikuti banyaknya
halaman/file yang diinput, persis seperti pratinjau. */
if(state.lamp.length){
const totalLampPages = Math.ceil(state.lamp.length / LAMP_PER_PAGE);
for(let i=0, p=1; i<state.lamp.length; i+=LAMP_PER_PAGE, p++){
const chunk = state.lamp.slice(i, i+LAMP_PER_PAGE);
pages.push(`
<div class="paper-page-title">Lampiran Lainnya${totalLampPages>1?` (${p}/${totalLampPages})`:''}</div>
<div class="lamp-doc-print">
${chunk.map(l=>`<figure><img src="${l.url}"></figure>`).join('')}
</div>
`);
}
}
return pages;
}
function paperPagesToHtml(pages){
return pages.map((content,i)=>`<div class="paper${i>0?' page-break':''}">${content}</div>`).join('');
}
function renderPreview(){
const container = document.getElementById('paper');
container.innerHTML = paperPagesToHtml(buildPaperPages(true));
attachTtdResizeHandle(container);
attachTtdDragHandle(container);
}
/* Menskalakan lembar A4 pratinjau (di kolom kanan yang kini 50%) agar tetap utuh & terbaca,
simetris dengan kolom kiri, tanpa memotong bagian lembar. */
function fitPreviewZoom(){
const col = document.querySelector('.preview-col');
const area = document.getElementById('paper');
if(!col || !area) return;
const availableWidth = col.clientWidth - 4;
const paperWidthPx = 794; // ~210mm pada 96dpi
let z = availableWidth / paperWidthPx;
z = Math.max(0.34, Math.min(1, z));
if('zoom' in area.style){
area.style.zoom = z;
} else {
area.style.transform = `scale(${z})`;
area.style.transformOrigin = 'top center';
}
}
window.addEventListener('resize', fitPreviewZoom);
/* =================== SIMPAN / EXPORT KE PDF =================== */
function namaFilePdf(){
// Format nama file: "RHK <no>_<Rencana Aksi yang dipilih>_<Bulan>.pdf"
const item = getSelectedRhk();
const rhkLabel = item ? ('RHK ' + item.no) : 'RHK';
const aksiText = getSelectedAksiText() || 'Rencana Aksi';
const bulan = state.bulan || '';
const raw = `${rhkLabel}_${aksiText}_${bulan}`;
let bersih = raw.replace(/[^a-zA-Z0-9_\-]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');
// Batasi panjang nama file (rencana aksi bisa berupa kalimat panjang) agar
// tetap aman disimpan di semua sistem operasi (Windows/macOS/Android/iOS).
if(bersih.length > 150) bersih = bersih.slice(0,150).replace(/_+$/g,'');
return bersih + '.pdf';
}
function setPrintBtnsState(loading){
['btnPrint','btnPrint2'].forEach(id=>{
const b = document.getElementById(id);
if(!b) return;
b.disabled = loading;
b.textContent = loading ? 'Menyimpan PDF...' : 'Pratinjau & Simpan ke PDF';
});
}
/* =================== MODAL PRATINJAU SEBELUM UNDUH PDF =================== */
const previewModalOverlay = document.getElementById('previewModalOverlay');
const previewModalBody = document.getElementById('previewModalBody');
function openPreviewModal(){
renderPreview(); // pastikan pratinjau memakai data terbaru
previewModalBody.innerHTML = paperPagesToHtml(buildPaperPages());
previewModalOverlay.classList.add('open');
previewModalBody.scrollTop = 0;
document.body.style.overflow = 'hidden';
}
function closePreviewModal(){
previewModalOverlay.classList.remove('open');
document.body.style.overflow = '';
}
document.getElementById('btnPrint').addEventListener('click', openPreviewModal);
document.getElementById('btnPrint2').addEventListener('click', openPreviewModal);
document.getElementById('btnClosePreviewModal').addEventListener('click', closePreviewModal);
document.getElementById('btnCancelPreviewModal').addEventListener('click', closePreviewModal);
previewModalOverlay.addEventListener('click', (e)=>{ if(e.target === previewModalOverlay) closePreviewModal(); });
function doPrint(){
doPrintAsync();
}
/* Menunggu semua gambar di dalam sebuah elemen selesai dimuat/didekode sebelum
di-capture ke kanvas. Ini mencegah error umum html2pdf/html2canvas yang terjadi
ketika ada foto dokumentasi atau tanda tangan yang belum sepenuhnya termuat. */
function waitForImagesReady(container, timeoutMs){
const imgs = Array.from(container.querySelectorAll('img'));
if(!imgs.length) return Promise.resolve();
const perImage = imgs.map(img=>{
return new Promise(resolve=>{
if(img.complete && img.naturalWidth > 0){ resolve(); return; }
const done = ()=>resolve();
img.addEventListener('load', done, { once:true });
img.addEventListener('error', done, { once:true });
if(img.decode){ img.decode().then(done).catch(()=>{}); }
});
});
const timeout = new Promise(resolve=>setTimeout(resolve, timeoutMs || 8000));
return Promise.race([Promise.all(perImage), timeout]);
}
/* =========================================================================
FALLBACK: CETAK / SIMPAN PDF VIA DIALOG BROWSER (100% OFFLINE)
-------------------------------------------------------------------------
Tidak bergantung pada library eksternal apa pun. Memakai fitur bawaan
setiap browser (window.print) yang pada sebagian besar sistem operasi
modern menyediakan tujuan cetak "Simpan sebagai PDF" / "Save as PDF" /
"Microsoft Print to PDF". Lembar A4 yang sama persis dengan pratinjau
dirender ke sebuah wadah khusus (.print-area) yang HANYA tampak saat
proses cetak berlangsung (lihat aturan @media print di CSS), sehingga
halaman lain dari aplikasi tidak ikut tercetak.
========================================================================= */
function printFallback(){
const old = document.getElementById('pdfPrintFallback');
if(old) old.remove();
const box = document.createElement('div');
box.id = 'pdfPrintFallback';
box.className = 'print-area';
box.innerHTML = paperPagesToHtml(buildPaperPages());
document.body.appendChild(box);
// Judul halaman dipakai browser sebagai usulan nama file di dialog
// "Simpan sebagai PDF" — disamakan dengan pola RHK_RencanaAksi_Bulan,
// lalu dikembalikan ke judul asli setelah dialog cetak ditutup.
const judulAsli = document.title;
document.title = namaFilePdf().replace(/\.pdf$/i,'');
let cleaned = false;
function cleanup(){
if(cleaned) return;
cleaned = true;
window.removeEventListener('afterprint', cleanup);
if(box && box.parentNode) box.remove();
document.title = judulAsli;
}
window.addEventListener('afterprint', cleanup);
// Jaga-jaga: sebagian browser/OS tidak selalu memicu event 'afterprint'.
setTimeout(cleanup, 60000);
setTimeout(function(){ window.print(); }, 60);
}
/* Merender SETIAP lembar .paper satu-per-satu ke kanvas lalu menempelkannya
sebagai satu halaman PDF A4 penuh (margin jsPDF = 0). Karena setiap
lembar sumber (210mm x 297mm, padding 18mm) dipetakan 1:1 ke satu
halaman PDF berukuran A4 penuh, margin yang tampil di hasil unduhan
PDF selalu identik & simetris dengan padding pada pratinjau — tidak
ada lagi pergeseran margin akibat pemotongan halaman otomatis. */
async function renderPapersToPdf(exportBox){
const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
const paperEls = Array.from(exportBox.querySelectorAll('.paper'));
if(!window.html2canvas || !jsPDFCtor || !paperEls.length) return false;
const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
for(let i=0; i<paperEls.length; i++){
const canvas = await window.html2canvas(paperEls[i], {
scale: 2,
useCORS: true,
backgroundColor: '#ffffff',
width: paperEls[i].offsetWidth,
height: paperEls[i].offsetHeight,
windowWidth: paperEls[i].offsetWidth
});
const imgData = canvas.toDataURL('image/jpeg', 0.98);
if(i > 0) pdf.addPage('a4', 'portrait');
pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
}
pdf.save(namaFilePdf());
return true;
}
async function doPrintAsync(){
const btn = document.getElementById('btnConfirmDownloadPdf');
setPrintBtnsState(true);
if(btn){ btn.disabled = true; btn.textContent = 'Menyimpan PDF...'; }
let engineReady = !!(window.html2canvas && window.jspdf && window.jspdf.jsPDF);
if(!engineReady){
// Komponen belum siap: coba muat ulang dari beberapa sumber CDN dahulu
// (mungkin sebelumnya gagal karena koneksi lambat, bukan benar-benar
// tanpa internet).
if(btn){ btn.textContent = 'Menyiapkan komponen PDF...'; }
engineReady = await ensurePdfEngine();
}
if(!engineReady){
// Semua sumber CDN gagal dimuat (kemungkinan besar tidak ada koneksi
// internet, atau domain CDN diblokir jaringan). Alihkan otomatis ke
// mekanisme cetak bawaan browser yang tidak memerlukan internet.
setPrintBtnsState(false);
if(btn){ btn.disabled = false; btn.textContent = 'Unduh PDF'; }
alert('Komponen unduh PDF otomatis (html2canvas/jsPDF) tidak dapat dimuat — kemungkinan besar karena tidak ada koneksi internet atau domain penyedianya diblokir jaringan.\nSebagai gantinya, aplikasi akan membuka dialog "Cetak" bawaan browser Anda. Pada dialog tersebut, pilih tujuan "Simpan sebagai PDF" / "Save as PDF" (atau "Microsoft Print to PDF" di Windows) untuk menyimpan laporan ini. Cara ini tidak memerlukan internet.');
printFallback();
return;
}
// Render ulang halaman-halaman kertas ke wadah ekspor tersendiri di luar layar,
// TANPA batasan tinggi/scroll (berbeda dari panel pratinjau di modal), agar
// hasil yang di-capture selalu utuh persis dan tidak terpotong oleh CSS.
const exportBox = document.createElement('div');
exportBox.id = 'pdfExportBox';
exportBox.style.position = 'fixed';
exportBox.style.left = '-99999px';
exportBox.style.top = '0';
exportBox.style.width = '210mm';
exportBox.style.background = '#ffffff';
exportBox.style.display = 'flex';
exportBox.style.flexDirection = 'column';
exportBox.style.alignItems = 'center';
exportBox.innerHTML = paperPagesToHtml(buildPaperPages());
document.body.appendChild(exportBox);
try{
await waitForImagesReady(exportBox, 8000);
// beri browser waktu satu frame untuk menyelesaikan layout/reflow sebelum di-capture
await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const ok = await renderPapersToPdf(exportBox);
if(!ok) throw new Error('Komponen PDF tidak lengkap.');
closePreviewModal();
}catch(err){
console.error('Gagal menyimpan PDF:', err);
alert('Terjadi kendala saat menyimpan PDF. Silakan coba lagi. Jika masalah berlanjut, coba kurangi ukuran/jumlah foto dokumentasi lalu ulangi.');
}finally{
exportBox.remove();
setPrintBtnsState(false);
if(btn){ btn.disabled = false; btn.textContent = 'Unduh PDF'; }
}
}
document.getElementById('btnConfirmDownloadPdf').addEventListener('click', doPrint);
document.getElementById('btnPrintFallback').addEventListener('click', function(){
renderPreview(); // pastikan data yang dicetak selalu yang terbaru
printFallback();
});
/* =================== LOGIN & KREDIT (BLOK TAMBAHAN - JANGAN DIHAPUS) =================== */
/* Override: pilih jabatan sekaligus simpan ke database */
/* Override: panggilan AI dengan pemotongan kredit */
/* Mulai cek login setelah semua siap */
/* =================== INIT =================== */
// PEMBARUAN: renderRoleList() TIDAK lagi dipanggil di sini — sekarang baru
// dipanggil dari masukKeAplikasi() setelah data RHK berhasil diambil dari
// server (lihat komentar keamanan di sana).
renderDasar();
bindFields();
renderSteps();
renderTtd();
window.addEventListener('load', fitPreviewZoom);
/*__AKHIR_BAGIAN_4_SELESAI__*/
/* ============ BLOK LOGIN & KREDIT (menimpa fungsi AI bawaan) ============ */
