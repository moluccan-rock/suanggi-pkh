/**
 * ============================================================
 *  Kode.gs - BACKEND "Suanggi PKH: Bukti Dukung Laporan Bulanan"
 *  Google Apps Script sebagai REST API murni (GAS-PRO-API)
 * ------------------------------------------------------------
 *  VERSI INI adalah hasil MIGRASI dari versi sebelumnya yang berupa
 *  Web App HtmlService + iframe (Kode.js + index.html + styles.html +
 *  script.html, dipanggil dari browser lewat google.script.run).
 *
 *  Sekarang backend ini TIDAK LAGI menyajikan HTML sama sekali — murni
 *  menerima & mengembalikan JSON lewat doGet()/doPost() (ContentService),
 *  supaya frontend bisa berdiri sendiri sebagai file statis (HTML/CSS/JS
 *  vanilla) yang di-deploy terpisah (mis. ke GitHub Pages) dan memanggil
 *  backend ini lewat fetch(), bukan lagi lewat google.script.run.
 *
 *  SELURUH logika bisnis (validasi, rate limiting, skema Sheet, AI
 *  provider routing, dsb.) DISALIN APA ADANYA dari versi sebelumnya —
 *  TIDAK ADA perubahan logika, hanya cara aplikasi ini "dipanggil" dari
 *  luar yang berubah total.
 *
 *  ISI FILE INI:
 *   1. doGet()/doPost()  : entry point REST API (ContentService JSON)
 *   2. buildResponse()   : helper membungkus hasil jadi JSON response
 *   3. Database OTOMATIS : spreadsheet "DB_Suanggi_PKH" sheet "USERS"
 *                          dibuat otomatis saat pertama kali dipakai
 *                          (TIDAK perlu dibuat manual lagi)
 *   4. Login & user      : daftarUser, loginDenganToken, ajukanPerpanjangan, updateUserRole
 *   5. Fitur AI          : callClaudeAI_() - provider dipilih otomatis:
 *                          - ada GEMINI_API_KEY      -> pakai Google Gemini (diprioritaskan)
 *                          - jika tidak, QWEN_API_KEY -> pakai Qwen (murah)
 *                          - jika tidak, ANTHROPIC_API_KEY -> pakai Claude
 *
 *  DAFTAR ACTION YANG TERSEDIA LEWAT POST (lihat doPost di bawah):
 *   - 'daftarUser'            -> daftarUser(nama, nip, noWa, jumlahHariDiminta)
 *   - 'loginDenganToken'      -> loginDenganToken(nip, token)
 *   - 'ajukanPerpanjangan'    -> ajukanPerpanjangan(nip, jumlahHariDiminta)
 *   - 'ambilDataJabatan'      -> ambilDataJabatan(nip, token)
 *   - 'updateUserRole'        -> updateUserRole(nip, token, role)
 *   - 'sempurnakanDenganAI'   -> sempurnakanDenganAI(nip, token, prompt)
 *
 *  SENGAJA TIDAK DIEKSPOS lewat HTTP (hanya bisa dijalankan manual dari
 *  Apps Script Editor, pertahanan berlapis selain pastikanAdmin_()):
 *  adminBuatToken, nonaktifkanUser, tambahHariAkses, debugCekToken,
 *  migrasiLabelStatusLama, cariSemuaDatabaseTerduplikasi, buatDatabaseOtomatis,
 *  siapkanFolderProyekManual.
 * ============================================================
 */

/* ==================== 1. ENTRY POINT REST API (doGet / doPost) ==================== */

/**
 * doGet(e) — HANYA untuk operasi pembacaan yang AMAN tanpa data sensitif
 * di URL. Realistisnya aplikasi ini TIDAK memiliki action doGet yang aman
 * (semua operasi butuh NIP/Token, yang tidak boleh ikut nyangkut di log
 * URL/akses), sehingga doGet selalu menolak dan mengarahkan ke POST.
 */
function doGet(e) {
  return buildResponse({ success: false, message: 'Gunakan POST untuk semua operasi API.' });
}

/**
 * doPost(e) — satu-satunya pintu masuk untuk SEMUA operasi API aplikasi ini.
 * Body request berupa JSON: { "action": "<namaAction>", ...parameter lain }.
 * Setiap action dibungkus try/catch sendiri supaya kegagalan satu action
 * tidak pernah membuat seluruh endpoint mengembalikan error HTTP mentah —
 * klien selalu menerima JSON yang konsisten.
 */
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return buildResponse({ success: false, message: 'Body permintaan bukan JSON yang valid.' });
  }

  var action = payload.action;

  try {
    switch (action) {
      case 'daftarUser':
        return buildResponse(daftarUser(payload.nama, payload.nip, payload.noWa, payload.jumlahHariDiminta));

      case 'loginDenganToken':
        return buildResponse(loginDenganToken(payload.nip, payload.token));

      case 'ajukanPerpanjangan':
        return buildResponse(ajukanPerpanjangan(payload.nip, payload.jumlahHariDiminta));

      case 'ambilDataJabatan':
        // PENTING: ambilDataJabatan() di versi asli MELEMPAR EXCEPTION
        // (throw new Error) saat sesi tidak valid, bukan mengembalikan
        // objek {success:false,...} seperti fungsi lain. Di sini exception
        // itu ditangkap dan diubah jadi respons JSON biasa, supaya klien
        // REST tidak pernah menerima HTTP error mentah dari GAS.
        try {
          return buildResponse(ambilDataJabatan(payload.nip, payload.token));
        } catch (errJabatan) {
          return buildResponse({ success: false, message: errJabatan.message });
        }

      case 'updateUserRole':
        return buildResponse(updateUserRole(payload.nip, payload.token, payload.role));

      case 'sempurnakanDenganAI':
        return buildResponse(sempurnakanDenganAI(payload.nip, payload.token, payload.prompt));

      default:
        return buildResponse({ success: false, message: 'Action tidak dikenal: ' + action });
    }
  } catch (err) {
    return buildResponse({ success: false, message: err.message });
  }
}

/* ==================== 2. UTILITIES: BUNGKUS RESPONS JSON ==================== */

/**
 * Bungkus data apa pun (object, string, dsb.) jadi response JSON
 * ber-Content-Type application/json, siap diterima fetch() di frontend.
 */
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==================== 3. DATABASE OTOMATIS + FOLDER PROYEK TERPUSAT ==================== */

var DB_NAME       = 'e-Suanggi'; // disesuaikan dengan nama spreadsheet yang sekarang benar-benar Anda pakai
var DB_SHEET_NAME = 'USERS';
var DB_PROP_KEY   = 'DB_SHEET_ID';
var FOLDER_NAME    = 'Suanggi PKH - Web App'; // SEMUA file terkait (database, proyek skrip) dikumpulkan ke sini

/**
 * Cari atau buat folder proyek terpusat di Drive. Dipanggil setiap kali
 * database diakses, supaya file yang tercecer otomatis "ditarik" ke sini.
 */
function siapkanFolderProyek_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

/**
 * Pindahkan sebuah file ke folder proyek (kalau belum di sana). Aman dipanggil
 * berkali-kali (idempotent) — tidak akan duplikat/rusak kalau file memang
 * sudah ada di folder yang benar.
 */
function pindahkanKeFolderProyek_(file, folderProyek) {
  var parents = file.getParents();
  var sudahDiFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === folderProyek.getId()) { sudahDiFolder = true; break; }
  }
  if (!sudahDiFolder) {
    folderProyek.addFile(file);
    // Hapus dari SEMUA folder lama (bukan cuma root) supaya file benar-benar
    // "pindah" ke satu folder proyek, bukan malah nyangkut di 2 folder sekaligus.
    var rootParents = file.getParents();
    while (rootParents.hasNext()) {
      var p = rootParents.next();
      if (p.getId() !== folderProyek.getId()) p.removeFile(file);
    }
  }
}

/**
 * Mengambil sheet USERS. Jika spreadsheet / sheet belum ada, dibuat OTOMATIS
 * lengkap dengan header-nya, dan selalu ditempatkan di folder proyek terpusat.
 *
 * PERBAIKAN PENTING (mencegah "1 aplikasi = banyak database tercecer"):
 * Versi SEBELUMNYA, kalau SpreadsheetApp.openById(savedId) gagal (mis. file
 * sempat error/telat sinkron), kode DIAM-DIAM membuat spreadsheet BARU —
 * inilah kemungkinan besar penyebab munculnya beberapa file "DB_Suanggi_PKH"
 * berbeda di Drive Anda. Sekarang: kalau ID yang tersimpan di Script
 * Properties gagal dibuka, fungsi ini GAGAL DENGAN JELAS (throw Error)
 * alih-alih diam-diam membuat duplikat baru — supaya masalah langsung
 * ketahuan, bukan malah menambah kekacauan.
 */
function getDbSheet() {
  var props = PropertiesService.getScriptProperties();
  var folderProyek = siapkanFolderProyek_();
  var ss = null;

  var savedId = props.getProperty(DB_PROP_KEY);
  if (savedId) {
    try {
      ss = SpreadsheetApp.openById(savedId);
    } catch (err) {
      throw new Error(
        'Database (ID: ' + savedId + ') tersimpan di Script Properties tapi GAGAL dibuka: ' + err.message + '. ' +
        'Kemungkinan file terhapus/dipindah/akses berubah. Jalankan fungsi cariSemuaDatabaseTerduplikasi() ' +
        'untuk melihat file "DB_Suanggi_PKH" yang ada di Drive Anda, lalu perbaiki manual nilai ' +
        'DB_SHEET_ID di Project Settings > Script Properties.'
      );
    }
  }

  if (!ss) {
    // Baru pertama kali dipakai (savedId belum ada sama sekali) — cari file
    // existing dulu (siapa tahu sudah pernah dibuat manual), baru kalau
    // benar-benar tidak ada, bikin baru.
    var files = DriveApp.getFilesByName(DB_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
      if (files.hasNext()) {
        Logger.log('⚠️ PERINGATAN: ditemukan LEBIH DARI SATU file bernama "' + DB_NAME + '" di Drive. ' +
          'Dipakai yang pertama ditemukan (ID: ' + ss.getId() + '). Jalankan cariSemuaDatabaseTerduplikasi() ' +
          'untuk melihat & membereskan duplikatnya secara manual.');
      }
    } else {
      ss = SpreadsheetApp.create(DB_NAME);
    }
    props.setProperty(DB_PROP_KEY, ss.getId());
  }

  // PERBAIKAN BUG: sebelumnya pemindahan file ke folder proyek (termasuk
  // memindah file PROYEK SKRIP ITU SENDIRI) dijalankan di jalur kritis ini —
  // yaitu SETIAP kali ada yang mendaftar/login/dsb. Kalau operasi Drive API
  // ini gagal karena SATU SAJA sebab (izin, kuota, dsb.), SELURUH aplikasi
  // ikut error ("Terjadi error tak dikenal"), padahal ini cuma soal
  // "kerapian folder", bukan fungsi inti. Sekarang dibungkus try/catch, dan
  // pemindahan file proyek skrip dipisah ke fungsi manual siapkanFolderProyekManual()
  // — dijalankan sekali saja oleh Admin, tidak lagi menumpang di setiap akses database.
  try {
    pindahkanKeFolderProyek_(DriveApp.getFileById(ss.getId()), folderProyek);
  } catch (e) {
    Logger.log('Peringatan: gagal memindah spreadsheet ke folder proyek (diabaikan, tidak mengganggu fungsi utama): ' + e.message);
  }

  var headers = ['NIP', 'Nama', 'NoWA', 'Token', 'Status', 'Kredit', 'Role', 'JoinDate', 'TanggalExpired'];
  var sheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!sheet) {
    var first = ss.getSheets()[0];
    if (first && first.getName() !== DB_SHEET_NAME) {
      first.setName(DB_SHEET_NAME);
      sheet = first;
    } else {
      sheet = ss.insertSheet(DB_SHEET_NAME);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285F4')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // PERBAIKAN BUG: sheet lama (dari versi kode sebelumnya, mis. skema berbasis
    // Email) tidak otomatis mendapat header baru karena blok di atas hanya
    // berjalan saat sheet BENAR-BENAR belum ada. Di sini kita cek: kalau baris
    // header yang tersimpan TIDAK SAMA dengan skema NIP+Token terbaru, header
    // ditimpa ulang (HANYA baris 1 / label kolom) — data pengguna di baris
    // bawahnya sama sekali tidak disentuh/dihapus.
    var currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var headersMatch = headers.every(function (h, i) { return currentHeaders[i] === h; });
    if (!headersMatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285F4')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      Logger.log('Header sheet USERS diperbarui otomatis ke skema NIP+Token terbaru.');
    }
  }

  // Terapkan dropdown pilihan di kolom Status (E), supaya Admin cukup KLIK
  // pilihan langsung di Sheet (Aktif / Nonaktif / Menunggu Diaktifkan) tanpa
  // perlu buka Apps Script Editor. Diterapkan ke rentang luas (baris 2-2000)
  // supaya baris pendaftar baru ke depannya otomatis ikut dapat dropdown ini.
  terapkanDropdownStatus_(sheet);

  return sheet;
}

/**
 * OPSIONAL: jalankan manual sekali (tombol Run) jika ingin melihat
 * URL database di Log eksekusi. TIDAK wajib - database sudah auto-create.
 */
/**
 * UNTUK ADMIN — jalankan SEKALI SAJA manual dari Apps Script Editor untuk
 * memindahkan file PROYEK SKRIP ini sendiri ke folder proyek terpusat
 * ("Suanggi PKH - Web App"). Sengaja DIPISAH dari getDbSheet() (yang
 * berjalan di jalur kritis setiap pendaftaran/login) supaya kalau operasi
 * ini gagal (mis. karena izin), TIDAK ikut merusak fungsi utama aplikasi.
 */
function siapkanFolderProyekManual() {
  pastikanAdmin_();
  var folderProyek = siapkanFolderProyek_();
  try {
    pindahkanKeFolderProyek_(DriveApp.getFileById(ScriptApp.getScriptId()), folderProyek);
    Logger.log('Berhasil. File proyek skrip sudah dipindah ke folder: ' + folderProyek.getUrl());
    return 'Berhasil dipindah ke: ' + folderProyek.getUrl();
  } catch (e) {
    Logger.log('Gagal memindah file proyek skrip: ' + e.message);
    return 'Gagal: ' + e.message;
  }
}

function buatDatabaseOtomatis() {
  pastikanAdmin_();
  var sheet = getDbSheet();
  var url = sheet.getParent().getUrl();
  Logger.log('Database siap: ' + url);
  Logger.log('Folder proyek: ' + siapkanFolderProyek_().getUrl());
  return url;
}

/**
 * ALAT DIAGNOSA — jalankan manual dari Apps Script Editor untuk melihat
 * SEMUA file bernama "DB_Suanggi_PKH" yang ada di Drive Anda, mana yang
 * SEDANG AKTIF dipakai aplikasi (cocok dengan DB_SHEET_ID di Script
 * Properties), dan mana yang AMAN DIHAPUS (duplikat/tidak terpakai).
 * Hasilnya tercetak rapi di Log Eksekusi (View > Logs).
 */
function cariSemuaDatabaseTerduplikasi() {
  pastikanAdmin_();
  var idAktif = PropertiesService.getScriptProperties().getProperty(DB_PROP_KEY);
  var files = DriveApp.getFilesByName(DB_NAME);
  var daftar = [];
  while (files.hasNext()) {
    var f = files.next();
    daftar.push({
      id: f.getId(),
      url: f.getUrl(),
      terakhirDiubah: f.getLastUpdated(),
      folder: (function () { var p = f.getParents(); return p.hasNext() ? p.next().getName() : '(root Drive)'; })()
    });
  }

  if (daftar.length === 0) {
    Logger.log('Tidak ditemukan file "' + DB_NAME + '" sama sekali di Drive Anda.');
    return 'Tidak ada file ditemukan.';
  }

  var out = 'Ditemukan ' + daftar.length + ' file bernama "' + DB_NAME + '":\n\n';
  daftar.forEach(function (d, i) {
    var statusLabel = (d.id === idAktif) ? '✅ AKTIF DIPAKAI APLIKASI (JANGAN DIHAPUS)' : '❌ TIDAK TERPAKAI (aman dihapus manual via Drive)';
    out += (i + 1) + '. ' + statusLabel + '\n' +
           '   ID     : ' + d.id + '\n' +
           '   URL    : ' + d.url + '\n' +
           '   Folder : ' + d.folder + '\n' +
           '   Terakhir diubah: ' + d.terakhirDiubah + '\n\n';
  });
  out += (idAktif ? ('ID aktif aplikasi saat ini (DB_SHEET_ID): ' + idAktif) : 'PERINGATAN: DB_SHEET_ID belum tersimpan di Script Properties sama sekali.');

  Logger.log(out);
  return out;
}

/* ==================== 3.5 DATA RHK/INDIKATOR/AKSI (RAHASIA — hanya dikirim SETELAH login) ==================== */
/*
 * PEMBARUAN KEAMANAN: data ini SEBELUMNYA tertanam langsung di script.html
 * (kode yang dikirim ke browser SEMUA orang yang buka link, walau belum
 * login — hanya disembunyikan lewat CSS). Sekarang dipindah ke server dan
 * HANYA dikirim ke klien setelah sesi NIP+Token tervalidasi lewat
 * ambilDataJabatan(), sehingga orang yang belum login sama sekali tidak
 * bisa melihat isi RHK/Indikator/Rencana Aksi ini walau lewat DevTools.
 */
var JABATAN_DATA_SERVER = {"KATIM PROV": [{"no": 1, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksanannya penyaluran bansos kepada Keluarga Penerima Manfaat (KPM ) PKH tepat sasaran dan tepat  jumlah", "indikator": "Laporan Penyaluran bansos", "aksi": ["Melaksanakan supervisi Kebijakan Bantuan Sosial Kepada ASN PPPK (katimkab/KatimKot)", "Melakukan edukasi dan sosialisasi pencairan secara tunai dan non tunai", "Melaksanakan Supervisi Permasalahan Bantuan Sosial", "Melaksanakan Monitoring/Pemantauan Penyaluran Bantuan Sosial", "Melaksanakan Penelitian penyaluran bantuan Sosial"]}, {"no": 2, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya pertemuan P2K2 sesuai dengan ketentuan", "indikator": "Laporan pertemuan P2K2", "aksi": ["Melaksanakan Pertemuan Peningkatan Kemampuan Keluarga (P2K2)", "Melakukan Supervisi pelaksanaan P2K2 kepada ASN PPPK Katimkab/katimkot"]}, {"no": 3, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi Komitmen  Pendidikan,Kesehatan dan Kesejahteraan Sosial  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Verifikasi Komitmen dan Pendampingan KPM", "aksi": ["Melaksanakan Verifikasi Komitmen Pendidikan,Kesehatan dan Kesejahteraan Sosial", "Melakukan pendampingan, mediasi, dan fasilitasi kepada KPM PKH dalam proses perubahan perilaku, pola pikir yang mandiri dan produktif", "Melaksanakan supervisi Verifikasi Komitmen Kepada ASN PPPK (katimkab/KatimKot)"]}, {"no": 4, "rhkPimpinan": "Meningkatnya Peran Pendamping Penerima Bantuan Sosial Bersyarat(Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data KPM graduasi yang disusun sesuai dengan instrumen dan ketentuan", "indikator": "Rekapitulasi Data KPM graduasi", "aksi": ["Melakukan Usulan KPM Graduasi", "Melakukan Usulan KPM PPSE (Program Pemberdayaan Sosial Ekonomi)"]}, {"no": 5, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi, Validasi dan Permutakhiran Data KPM  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Data Verifikasi, Validasi dan pemutakhiran data KPM", "aksi": ["Melaksanakan Pemutakhiran Data", "Melaksanakan proses bisnis PKH yang meliputi verifikasi validasi calon penerima bantuan sosial", "Melaksanakan supervisi Verifikasi, Validasi dan pemutakhiran Kepada ASN PPPK (katimkab/KatimKot)"]}, {"no": 6, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya kegiatan kasus adaptif (Respon kasus/pengaduan/kebencanaan/kerentanan) disusun secara lengkap dan akurat", "indikator": "persentase penyelesaian laporan kasus adaptif (Respon kasus/kebencanaan/kerentanan)", "aksi": ["Melaksanakan Respon Kasus/Pengaduan/kebencanaan/Kerentanan"]}, {"no": 7, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data Analisis Laporan Bulanan yang disusun sesuai dengan Ketentuan", "indikator": "Laporan Bulanan ASN PPPK", "aksi": ["Membuat laporan bulanan pelaksanaan PKH dan laporan lainnya."]}, {"no": 8, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya direktif pimpinan sesuai dengan penugasan ;  program Kementrian Sosial)", "indikator": "laporan pelaksana Tugas direktif", "aksi": ["Melaksanakan Tindak Lanjut Hasil Pemeriksaan (TLHP)", "Melakukan sosialisasi kebijakan dan bisnis proses PKH kepada aparat pemerintah tingkat kecamatan, desa/ kelurahan, KPM PKH, dan masyarakat umum secara berkala melalui Pertemuan  atau media sosial dll", "Mengikuti Rapat Koordinasi,Sosialisasi Kebijakan Proses Bisnis PKH dan Penguatan Kapasitas SDM.", "Melakukan Pengawasan dan edukasi kepada Pendamping Sosial di Wilayah Kerja", "Melakukan koordinasi dan sinkronisasi dengan instansi terkait di tingkat provinsi", "Berkoodinasi dengan Katim Kabupaten/Kota berkaitan dengan pelaksanaan program ke ASN PPPK", "Melakukan Evaluasi Kinerja dan Menyusun Pelaporan ASN PPPK (Katimkab/Kota)", "Tugas Lainnya (Penugasan lainnya program Kementrian Sosial)"]}, {"no": 9, "rhkPimpinan": "Penugasan Direktif Pimpinan", "rhk": "Terlaksananya Penyebaran Berita Baik Kementrian Sosial", "indikator": "Presentase Penyelesaian Penugasan Direktif Pimpinan", "aksi": ["Berperan aktif dalam memanfaatkan, menggunakan, melibatkan dan menyebarkan Media Sosial untuk menyampaikan semua program di Kementerian Sosial"]}], "KATIM KABKOT": [{"no": 1, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksanannya penyaluran bansos kepada Keluarga Penerima Manfaat (KPM ) PKH tepat sasaran dan tepat  jumlah", "indikator": "Laporan Penyaluran bansos", "aksi": ["Melaksanakan supervisi Kebijakan Bantuan Sosial Kepada ASN PPPK", "Melakukan edukasi dan sosialisasi pencairan secara tunai dan non tunai", "Melaksanakan Supervisi Permasalahan Bantuan Sosial", "Melaksanakan Monitoring/Pemantauan Penyaluran Bantuan Sosial", "Melaksanakan Penelitian penyaluran bantuan Sosial"]}, {"no": 2, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya pertemuan P2K2 sesuai dengan ketentuan", "indikator": "Laporan pertemuan P2K2", "aksi": ["Melaksanakan Pertemuan Peningkatan Kemampuan Keluarga (P2K2)", "Melakukan Supervisi pelaksanaan P2K2 kepada ASN PPPK Katimkab/katimkot"]}, {"no": 3, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi Komitmen  Pendidikan,Kesehatan dan Kesejahteraan Sosial  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Verifikasi Komitmen dan Pendampingan KPM", "aksi": ["Melaksanakan Verifikasi Komitmen Pendidikan,Kesehatan dan Kesejahteraan Sosial", "Melakukan pendampingan, mediasi, dan fasilitasi kepada KPM PKH dalam proses perubahan perilaku, pola pikir yang mandiri dan produktif", "Melaksanakan supervisi Verifikasi Komitmen Kepada ASN PPPK"]}, {"no": 4, "rhkPimpinan": "Meningkatnya Peran Pendamping Penerima Bantuan Sosial Bersyarat(Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data KPM graduasi yang disusun sesuai dengan instrumen dan ketentuan", "indikator": "Rekapitulasi Data KPM graduasi", "aksi": ["Melakukan Usulan KPM Graduasi", "Melakukan Usulan KPM PPSE (Program Pemberdayaan Sosial Ekonomi)"]}, {"no": 5, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi, Validasi dan Permutakhiran Data KPM  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Data Verifikasi, Validasi dan pemutakhiran data KPM", "aksi": ["Melaksanakan Pemutakhiran Data", "Melaksanakan proses bisnis PKH yang meliputi verifikasi validasi calon penerima bantuan sosial", "Melaksanakan supervisi Verifikasi, Validasi dan pemutakhiran Kepada ASN PPPK"]}, {"no": 6, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya kegiatan kasus adaptif (Respon kasus/pengaduan/kebencanaan/kerentanan) disusun secara lengkap dan akurat", "indikator": "persentase penyelesaian laporan kasus adaptif (Respon kasus/kebencanaan/kerentanan)", "aksi": ["Melaksanakan Respon Kasus/Pengaduan/kebencanaan/Kerentanan"]}, {"no": 7, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data Analisis Laporan Bulanan yang disusun sesuai dengan Ketentuan", "indikator": "Laporan Bulanan ASN PPPK", "aksi": ["Membuat laporan bulanan pelaksanaan PKH dan laporan lainnya."]}, {"no": 8, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya direktif pimpinan sesuai dengan penugasan ;  program Kementrian Sosial)", "indikator": "laporan pelaksana Tugas direktif", "aksi": ["Melaksanakan Tindak Lanjut Hasil Pemeriksaan (TLHP)", "Melakukan sosialisasi kebijakan dan bisnis proses PKH kepada aparat pemerintah tingkat kecamatan, desa/ kelurahan, KPM PKH, dan masyarakat umum secara berkala melalui Pertemuan  atau media sosial dll", "Mengikuti Rapat Koordinasi,Sosialisasi Kebijakan Proses Bisnis PKH dan Penguatan Kapasitas SDM.", "Melakukan Pengawasan dan edukasi kepada Pendamping Sosial di Wilayah Kerja", "Melakukan koordinasi dan sinkronisasi dengan instansi terkait di tingkat Kabupaten Kota", "Berkoodinasi dengan ASN PPPK berkaitan dengan pelaksanaan program ke ASN PPPK", "Melakukan Evaluasi Kinerja dan Menyusun Pelaporan ASN PPPK", "Tugas Lainnya (Penugasan lainnya program Kementrian Sosial)"]}, {"no": 9, "rhkPimpinan": "Penugasan Direktif Pimpinan", "rhk": "Terlaksananya Penyebaran Berita Baik Kementrian Sosial", "indikator": "Presentase Penyelesaian Penugasan Direktif Pimpinan", "aksi": ["Berperan aktif dalam memanfaatkan, menggunakan, melibatkan dan menyebarkan Media Sosial untuk menyampaikan semua program di Kementerian Sosial"]}], "OPERATOR LAYANAN": [{"no": 1, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksanannya penyaluran bansos kepada Keluarga Penerima Manfaat (KPM ) PKH tepat sasaran dan tepat  jumlah", "indikator": "Laporan Penyaluran bansos", "aksi": ["Melakukan edukasi dan sosialisasi pencairan secara tunai dan non tunai", "Melaksanakan Supervisi Permasalahan Bantuan Sosial", "Melaksanakan Monitoring/Pemantauan Penyaluran Bantuan Sosial", "Melaksanakan Penelitian penyaluran bantuan Sosial"]}, {"no": 2, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya pertemuan P2K2 sesuai dengan ketentuan", "indikator": "Laporan pertemuan P2K2", "aksi": ["Melaksanakan Pertemuan Peningkatan Kemampuan Keluarga (P2K2)"]}, {"no": 3, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi Komitmen  Pendidikan,Kesehatan dan Kesejahteraan Sosial  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Verifikasi Komitmen data KPM", "aksi": ["Melaksanakan Verifikasi Komitmen Pendidikan,Kesehatan dan Kesejahteraan Sosial", "Melakukan pendampingan, mediasi, fasilitasi, dan advokasi kepada KPM PKH dalam proses perubahan perilaku, pola pikir yang mandiri dan produktif"]}, {"no": 4, "rhkPimpinan": "Meningkatnya Peran Pendamping Penerima Bantuan Sosial Bersyarat(Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data KPM graduasi yang disusun sesuai dengan instrumen dan ketentuan", "indikator": "Rekapitulasi Data KPM graduasi", "aksi": ["Melakukan Usulan KPM Graduasi", "Melakukan Usulan KPM PPSE (Program Pemberdayaan Sosial Ekonomi)"]}, {"no": 5, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi, Validasi dan Permutakhiran Data KPM  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Data Verifikasi, Validasi dan pemutakhiran data KPM", "aksi": ["Melaksanakan Pemutakhiran Data", "Melaksanakan proses bisnis PKH yang meliputi verifikasi validasi calon penerima bantuan sosial"]}, {"no": 6, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya kegiatan kasus adaptif (Respon kasus/kerentanan/bencana) disusun secara lengkap dan akurat", "indikator": "persentase penyelesaian laporan kasus adaptif (Respon kasus/bencana/kerentanan)", "aksi": ["Melaksanakan Respon Kasus/Pengaduan/kebencanaan/Kerentanan"]}, {"no": 7, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya direktif pimpinan sesuai dengan penugasan ;  program Kementrian Sosial)", "indikator": "laporan pelaksana Tugas direktif", "aksi": ["Melaksanakan Tindak Lanjut Hasil Pemeriksaan (TLHP)", "Melakukan sosialisasi kebijakan dan bisnis proses PKH kepada aparat pemerintah tingkat kecamatan, desa/ kelurahan, KPM PKH, dan masyarakat umum secara berkala melalui Pertemuan  atau media sosial dll", "Tugas Lainnya (Penugasan lainnya program Kementrian Sosial)"]}, {"no": 8, "rhkPimpinan": "Penugasan Direktif Pimpinan", "rhk": "Terlaksananya Penyebaran Berita Baik Kementrian Sosial", "indikator": "Presentase Penyelesaian Penugasan Direktif Pimpinan", "aksi": ["Berperan aktif dalam memanfaatkan, menggunakan, melibatkan dan menyebarkan Media Sosial untuk menyampaikan semua program di Kementerian Sosial"]}], "PENGELOLA LAYANAN OPERATOR": [{"no": 1, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksanannya penyaluran bansos kepada Keluarga Penerima Manfaat (KPM ) PKH tepat sasaran dan tepat  jumlah", "indikator": "Laporan Penyaluran bansos", "aksi": ["Melakukan edukasi dan sosialisasi pencairan secara tunai dan non tunai", "Melaksanakan Supervisi Permasalahan Bantuan Sosial", "Melaksanakan Monitoring/Pemantauan Penyaluran Bantuan Sosial", "Melaksanakan Penelitian penyaluran bantuan Sosial"]}, {"no": 2, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya pertemuan P2K2 sesuai dengan ketentuan", "indikator": "Laporan pertemuan P2K2", "aksi": ["Melaksanakan Pertemuan Peningkatan Kemampuan Keluarga (P2K2)"]}, {"no": 3, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi Komitmen  Pendidikan,Kesehatan dan Kesejahteraan Sosial  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Verifikasi Komitmen data KPM", "aksi": ["Melaksanakan Verifikasi Komitmen Pendidikan,Kesehatan dan Kesejahteraan Sosial", "Melakukan pendampingan, mediasi, fasilitasi, dan advokasi kepada KPM PKH dalam proses perubahan perilaku, pola pikir yang mandiri dan produktif"]}, {"no": 4, "rhkPimpinan": "Meningkatnya Peran Pendamping Penerima Bantuan Sosial Bersyarat(Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data KPM graduasi yang disusun sesuai dengan instrumen dan ketentuan", "indikator": "Rekapitulasi Data KPM graduasi", "aksi": ["Melakukan Usulan KPM Graduasi", "Melakukan Usulan KPM PPSE (Program Pemberdayaan Sosial Ekonomi)"]}, {"no": 5, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi, Validasi dan Permutakhiran Data KPM  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Data Verifikasi, Validasi dan pemutakhiran data KPM", "aksi": ["Melaksanakan Pemutakhiran Data", "Melaksanakan proses bisnis PKH yang meliputi verifikasi validasi calon penerima bantuan sosial"]}, {"no": 6, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya kegiatan kasus adaptif (Respon kasus/kerentanan/bencana) disusun secara lengkap dan akurat", "indikator": "persentase penyelesaian laporan kasus adaptif (Respon kasus/bencana/kerentanan)", "aksi": ["Melaksanakan Respon Kasus/Pengaduan/kebencanaan/Kerentanan"]}, {"no": 7, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Pengumpulan dan Pengolahan Data Laporan Bulanan", "indikator": "Laporan Bulanan ASN PPPK", "aksi": ["Membuat laporan bulanan pelaksanaan PKH dan laporan lainnya."]}, {"no": 8, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya direktif pimpinan sesuai dengan penugasan ;  program Kementrian Sosial)", "indikator": "laporan pelaksana Tugas direktif", "aksi": ["Melaksanakan Tindak Lanjut Hasil Pemeriksaan (TLHP)", "Melakukan sosialisasi kebijakan dan bisnis proses PKH kepada aparat pemerintah tingkat kecamatan, desa/ kelurahan, KPM PKH, dan masyarakat umum secara berkala melalui Pertemuan  atau media sosial dll", "Tugas Lainnya (Penugasan lainnya program Kementrian Sosial)"]}, {"no": 9, "rhkPimpinan": "Penugasan Direktif Pimpinan", "rhk": "Terlaksananya Penyebaran Berita Baik Kementrian Sosial", "indikator": "Presentase Penyelesaian Penugasan Direktif Pimpinan", "aksi": ["Berperan aktif dalam memanfaatkan, menggunakan, melibatkan dan menyebarkan Media Sosial untuk menyampaikan semua program di Kementerian Sosial"]}], "PENATA LAYANAN OPERASIONAL": [{"no": 1, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya penyaluran bansos kepada Keluarga Penerima Manfaat (KPM ) PKH tepat sasaran dan tepat  jumlah", "indikator": "Laporan Penyaluran bansos", "aksi": ["Melakukan edukasi dan sosialisasi pencairan secara tunai dan non tunai", "Melaksanakan Supervisi Permasalahan Bantuan Sosial", "Melaksanakan Monitoring/Pemantauan Penyaluran Bantuan Sosial", "Melaksanakan Penelitian penyaluran bantuan Sosial"]}, {"no": 2, "rhkPimpinan": "Meningkatnya kemampuan KPM bantuan sosial dalam melaksanakan tanggung jawab terhadap diri sendiri dan atau keluarga", "rhk": "Terlaksananya pertemuan P2K2 sesuai dengan ketentuan", "indikator": "Laporan pertemuan P2K2", "aksi": ["Melaksanakan Pertemuan Peningkatan Kemampuan Keluarga (P2K2)"]}, {"no": 3, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi Komitmen  Pendidikan,Kesehatan dan Kesejahteraan Sosial  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Verifikasi Komitmen dan Pendampingan KPM", "aksi": ["Melaksanakan Verifikasi Komitmen Pendidikan,Kesehatan dan Kesejahteraan Sosial", "Melakukan pendampingan, mediasi, dan fasilitasi kepada KPM PKH dalam proses perubahan perilaku, pola pikir yang mandiri dan produktif"]}, {"no": 4, "rhkPimpinan": "Meningkatnya Peran Pendamping Penerima Bantuan Sosial Bersyarat(Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data KPM graduasi yang di susun sesuai dengan instrumen dan ketentuan", "indikator": "Rekapitulasi Data KPM graduasi", "aksi": ["Melakukan Usulan KPM Graduasi", "Melakukan Usulan KPM PPSE (Program Pemberdayaan Sosial Ekonomi)"]}, {"no": 5, "rhkPimpinan": "Ketepatan sasaran dan pemanfaatan Bantuan Sosial Bersyarat oleh Keluarga Miskin dan Rentan melalui Skema Penyaluran yang Digital, Inklusif, dan Adaptif (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya Verifikasi, Validasi dan Permutakhiran Data KPM  secara akurat sesuai dengan ketentuan.", "indikator": "Laporan Data Verifikasi, Validasi dan pemutakhiran data KPM", "aksi": ["Melaksanakan Pemutakhiran Data", "Melaksanakan proses bisnis PKH yang meliputi verifikasi validasi calon penerima bantuan sosial"]}, {"no": 6, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya kegiatan kasus adaptif (Respon kasus/pengaduan/kebencanaan/kerentanan) disusun secara lengkap dan akurat", "indikator": "persentase penyelesaian laporan kasus adaptif (Respon kasus/kebencanaan/kerentanan)", "aksi": ["Melaksanakan Respon Kasus/Pengaduan/kebencanaan/Kerentanan"]}, {"no": 7, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Tersedianya Data Analisis Laporan Bulanan yang disusun sesuai dengan Ketentuan", "indikator": "Laporan Bulanan ASN PPPK", "aksi": ["Membuat laporan bulanan pelaksanaan PKH dan laporan lainnya."]}, {"no": 8, "rhkPimpinan": "Meningkatnya Kualitas Komunikasi dan Keterbukaan Informasi Publik Perlindungan Sosial Korban Non Kebencanaan (Penugasan dari Direktur Jenderal Perlinjamsos)", "rhk": "Terlaksananya direktif pimpinan sesuai dengan penugasan ;  program Kementrian Sosial)", "indikator": "laporan pelaksana Tugas direktif", "aksi": ["Melaksanakan Tindak Lanjut Hasil Pemeriksaan (TLHP)", "Melakukan sosialisasi kebijakan dan bisnis proses PKH kepada aparat pemerintah tingkat kecamatan, desa/ kelurahan, KPM PKH, dan masyarakat umum secara berkala melalui Pertemuan  atau media sosial dll", "Mengikuti Rapat Koordinasi,Sosialisasi Kebijakan Proses Bisnis PKH dan Penguatan Kapasitas SDM.", "Tugas Lainnya (Penugasan lainnya program Kementrian Sosial)"]}, {"no": 9, "rhkPimpinan": "Penugasan Direktif Pimpinan", "rhk": "Terlaksananya Penyebaran Berita Baik Kementrian Sosial", "indikator": "Presentase Penyelesaian Penugasan Direktif Pimpinan", "aksi": ["Berperan aktif dalam memanfaatkan, menggunakan, melibatkan dan menyebarkan Media Sosial untuk menyampaikan semua program di Kementerian Sosial"]}]};

var JABATAN_META_SERVER = {
"KATIM PROV": {label:"Ketua Tim Provinsi", desc:"Koordinator PKH tingkat Provinsi"},
"KATIM KABKOT": {label:"Ketua Tim Kabupaten/Kota", desc:"Koordinator PKH tingkat Kabupaten/Kota"},
"OPERATOR LAYANAN": {label:"Operator Layanan", desc:"Pengelola layanan operasional PKH"},
"PENGELOLA LAYANAN OPERATOR": {label:"Pengelola Layanan Operator", desc:"Pengelolaan layanan & data operator"},
"PENATA LAYANAN OPERASIONAL": {label:"Penata Layanan Operasional", desc:"Pendamping Sosial PKH di lapangan"}
};

/**
 * Dipanggil klien SETELAH login berhasil (NIP+Token divalidasi ulang di
 * sini juga — tidak cukup mengandalkan validasi saat login saja, karena
 * fungsi ini bisa dipanggil kapan saja secara terpisah).
 */
function ambilDataJabatan(nip, token) {
  var sesi = validasiSesi_(nip, token);
  if (!sesi.ok) throw new Error(sesi.message);
  return { success: true, jabatanData: JABATAN_DATA_SERVER, jabatanMeta: JABATAN_META_SERVER };
}

/* ==================== 4. LOGIN & USER (Berbasis NIP + Token) ==================== */
/*
 * ALUR (Fase Uji Coba — Manual):
 *   1. User mendaftar (Nama, NIP, No.WA/Telegram) via daftarUser() -> status "Menunggu Diaktifkan".
 *   2. ADMIN memverifikasi (manual, mis. via chat/WA) lalu menjalankan adminBuatToken(nip)
 *      dari Apps Script Editor (pilih fungsi -> Run). Fungsi ini membuat token unik,
 *      mengaktifkan akun, memberi 3 kredit trial gratis, dan menampilkan hasilnya di
 *      Log Eksekusi (View > Logs) supaya Admin tinggal salin & kirim manual ke
 *      WhatsApp/Telegram/Email pendaftar.
 *   3. User login dengan NIP + Token via loginDenganToken().
 *   4. Setelah trial 3 kredit habis, user menghubungi Admin untuk membeli paket kredit
 *      tambahan; Admin tinggal jalankan topUpKredit(nip, jumlah) dari Editor.
 *
 * CATATAN UNTUK FASE OTOMATIS (nanti, setelah aplikasi final):
 *   adminBuatToken() dan topUpKredit() sudah dipisah rapi sehingga nanti tinggal
 *   dipanggil otomatis dari alur konfirmasi pembayaran (mis. webhook payment gateway),
 *   tanpa perlu mengubah logika login/kredit yang sudah ada.
 */

/**
 * Terapkan dropdown pilihan di kolom Status (kolom E) sheet USERS, supaya
 * Admin cukup KLIK pilihan langsung di Google Sheets (Aktif / Nonaktif /
 * Menunggu Diaktifkan / Kadaluwarsa) tanpa perlu buka Apps Script Editor sama sekali.
 * Diterapkan ke rentang luas (baris 2 s.d. 2000) supaya pendaftar baru ke
 * depannya otomatis ikut dapat dropdown ini juga.
 */
function terapkanDropdownStatus_(sheet) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Menunggu Diaktifkan', 'Aktif', 'Nonaktif', 'Kadaluwarsa'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, 1999, 1).setDataValidation(rule); // kolom E, baris 2-2000
}

/**
 * MIGRASI SEKALI-JALAN (khusus Admin): label status "Menunggu Token" yang
 * dipakai versi kode sebelumnya diganti nama jadi "Menunggu Diaktifkan"
 * (lebih akurat — karena token sebenarnya sudah otomatis dibuat sejak
 * pendaftaran/pengajuan, yang masih ditunggu hanyalah aktivasi Admin).
 * Jalankan SEKALI SAJA dari Apps Script Editor kalau Anda punya baris lama
 * di Sheet yang masih bertuliskan "Menunggu Token" dari sebelum perubahan
 * ini, supaya seragam dengan dropdown yang baru.
 */
function migrasiLabelStatusLama() {
  pastikanAdmin_();
  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  var jumlah = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][4]).trim() === 'Menunggu Token') {
      sheet.getRange(i + 1, 5).setValue('Menunggu Diaktifkan');
      jumlah++;
    }
  }
  Logger.log(jumlah + ' baris berhasil dimigrasi dari "Menunggu Token" -> "Menunggu Diaktifkan".');
  return jumlah + ' baris berhasil dimigrasi.';
}

/**
 * =================================================================
 * TRIGGER OTOMATIS: AKTIVASI LANGSUNG DARI GOOGLE SHEETS
 * -----------------------------------------------------------------
 * PEMBARUAN PENTING: kolom "Kredit" sekarang berarti JUMLAH HARI PAKAI
 * (bukan lagi jumlah pemakaian AI). Misalnya Kredit=25 berarti akun aktif
 * 25 hari sejak Admin mengaktifkan, lalu otomatis kembali ke gerbang login.
 *
 * Begitu Admin mengubah dropdown Status (kolom E) sebuah baris menjadi
 * "Aktif", fungsi ini OTOMATIS:
 *   - Membuatkan Token (kalau kolom Token masih kosong — biasanya sudah
 *     terisi otomatis sejak pendaftaran, lihat daftarUser())
 *   - Menghitung TanggalExpired = HARI INI + jumlah hari di kolom Kredit
 *     (kalau Kredit masih kosong/0, dipakai default 3 hari)
 *   - Menampilkan notifikasi Toast di pojok kanan bawah Sheets berisi
 *     token + nomor WA/Telegram tujuan, siap disalin untuk dikirim manual.
 *
 * CARA MENGAKTIFKAN (WAJIB, sekali saja — fungsi ini TIDAK berjalan
 * otomatis sebelum dipasang sebagai trigger, karena proyek ini adalah
 * skrip mandiri/standalone, bukan skrip yang terikat langsung ke Sheet):
 *   1. Di Apps Script Editor, klik ikon jam pasir/alarm ⏰ "Triggers" di
 *      panel kiri.
 *   2. Klik "+ Add Trigger" (kanan bawah).
 *   3. Choose which function to run: aktivasiOtomatisSaatDiedit
 *   4. Select event source: From spreadsheet
 *   5. Select event type: On edit
 *   6. Klik Save. Kalau diminta otorisasi, izinkan.
 * Setelah itu, tiap kali Anda mengubah dropdown Status di Sheet, otomatis
 * langsung berjalan — tidak perlu buka Apps Script lagi untuk aktivasi.
 * =================================================================
 */
function aktivasiOtomatisSaatDiedit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== DB_SHEET_NAME) return; // hanya proses edit di sheet USERS
    if (range.getColumn() !== 5) return; // hanya proses kalau yang diedit kolom E (Status)

    var row = range.getRow();
    if (row === 1) return; // abaikan kalau yang diedit baris header

    var statusBaru = String(range.getValue() || '').trim();
    if (statusBaru !== 'Aktif') return; // hanya bereaksi saat status diubah JADI Aktif

    var nip = sheet.getRange(row, 1).getValue();
    var nama = sheet.getRange(row, 2).getValue();
    var noWa = sheet.getRange(row, 3).getValue();
    var tokenSaatIni = String(sheet.getRange(row, 4).getValue() || '').trim();
    var jumlahHari = Number(sheet.getRange(row, 6).getValue()) || 0;
    if (jumlahHari <= 0) jumlahHari = 3; // fallback trial default kalau Admin belum isi

    var tokenBaru = tokenSaatIni;
    if (!tokenSaatIni) {
      tokenBaru = generateToken_();
      sheet.getRange(row, 4).setValue(tokenBaru);
    }

    // Hitung tanggal kedaluwarsa: HARI INI + jumlah hari di kolom Kredit
    var tglExpired = new Date();
    tglExpired.setDate(tglExpired.getDate() + jumlahHari);
    sheet.getRange(row, 6).setValue(jumlahHari); // pastikan kolom Kredit terisi angka yg valid (kalau tadi fallback)
    sheet.getRange(row, 9).setValue(tglExpired); // kolom I: TanggalExpired

    var tglLabel = Utilities.formatDate(tglExpired, Session.getScriptTimeZone(), 'dd MMMM yyyy');
    var pesanWa = 'Halo ' + nama + ', pendaftaran Suanggi PKH Anda telah diverifikasi. ' +
      'Silakan login dengan NIP: ' + nip + ' dan Token: ' + tokenBaru + '. ' +
      'Masa aktif akun Anda: ' + jumlahHari + ' hari (berlaku sampai ' + tglLabel + ').';

    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Token: ' + tokenBaru + ' | Aktif ' + jumlahHari + ' hari (s.d. ' + tglLabel + ') | Kirim ke WA/Telegram: ' + noWa + '\n' + pesanWa,
      '✅ Akun ' + nama + ' diaktifkan',
      15
    );
    Logger.log('Aktivasi otomatis — ' + pesanWa);
  } catch (err) {
    Logger.log('Gagal memproses aktivasi otomatis: ' + err.message);
  }
}

/**
 * =================================================================
 *  CEK KADALUWARSA OTOMATIS BERBASIS WAKTU (proaktif, bukan menunggu login)
 * -----------------------------------------------------------------
 *  Sebelumnya, Status di Sheet baru berubah jadi "Kadaluwarsa" KALAU ada
 *  user yang mencoba login setelah TanggalExpired lewat (reaktif — Admin
 *  tidak tahu akun mana yang sudah kadaluwarsa kalau user-nya belum coba
 *  login lagi). Fungsi ini membuat Sheet SELALU mencerminkan status asli,
 *  dicek berkala lewat trigger waktu (time-driven), tanpa perlu ada yang
 *  login dulu.
 *
 *  CARA MENGAKTIFKAN (WAJIB, sekali saja):
 *   1. Di Apps Script Editor, klik ikon jam pasir/alarm ⏰ "Triggers" di
 *      panel kiri.
 *   2. Klik "+ Add Trigger".
 *   3. Choose which function to run: cekKadaluwarsaOtomatis
 *   4. Select event source: Time-driven
 *   5. Select type of time based trigger: Hour timer
 *   6. Select hour interval: Every hour (atau "Every 6 hours" kalau ingin
 *      lebih hemat kuota — cukup responsif untuk kebutuhan ini).
 *   7. Klik Save.
 *  Setelah itu, setiap jam sistem otomatis memeriksa SEMUA baris berstatus
 *  "Aktif" — begitu TanggalExpired-nya lewat, Status langsung diubah jadi
 *  "Kadaluwarsa" di Sheet, walau belum ada user yang mencoba login.
 * =================================================================
 */
function cekKadaluwarsaOtomatis() {
  try {
    var sheet = getDbSheet();
    var data = sheet.getDataRange().getValues();
    var sekarang = new Date();
    var jumlahDiubah = 0;

    for (var i = 1; i < data.length; i++) {
      var status = data[i][4];
      var tglExpired = data[i][8];
      if (status === 'Aktif' && tglExpired && new Date(tglExpired) < sekarang) {
        sheet.getRange(i + 1, 5).setValue('Kadaluwarsa');
        jumlahDiubah++;
        Logger.log('Akun NIP ' + data[i][0] + ' (' + data[i][1] + ') otomatis ditandai Kadaluwarsa — TanggalExpired sudah lewat sejak ' + tglExpired);
      }
    }

    if (jumlahDiubah > 0) {
      Logger.log('cekKadaluwarsaOtomatis: ' + jumlahDiubah + ' akun ditandai Kadaluwarsa.');
    }
  } catch (err) {
    Logger.log('Gagal menjalankan cekKadaluwarsaOtomatis: ' + err.message);
  }
}

/**
 * Generate kode token unik, mudah dibaca & diketik manual (8 karakter, huruf besar + angka).
 */
function generateToken_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O/1/I agar tidak tertukar saat dibaca
  var token = '';
  for (var i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Menentukan email tujuan notifikasi admin. Default: email pemilik skrip
 * (otomatis, tanpa perlu setting apa pun). Bisa ditimpa manual dengan mengisi
 * Script Property 'ADMIN_EMAIL' (Project Settings > Script Properties) jika
 * Anda ingin notifikasi dikirim ke email lain.
 */
function getAdminEmail_() {
  var override = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (override) return override;
  try { return Session.getEffectiveUser().getEmail(); } catch (e) { return null; }
}

/**
 * Kirim email notifikasi ke Admin setiap ada pendaftar baru, lengkap dengan
 * perintah siap-pakai untuk mengaktifkan akun tersebut. Dibungkus try/catch
 * supaya kegagalan kirim email TIDAK menggagalkan proses pendaftaran user
 * (mis. jika kuota MailApp harian habis).
 */
function kirimNotifikasiPendaftarBaru_(nama, nip, noWa, jumlahHari, token) {
  try {
    var adminEmail = getAdminEmail_();
    if (!adminEmail) return;

    var subject = '🔔 Pendaftar Baru Suanggi PKH: ' + nama;
    var body =
      'Ada pendaftar baru yang menunggu aktivasi:\n\n' +
      'Nama              : ' + nama + '\n' +
      'NIP               : ' + nip + '\n' +
      'No. WA/Telegram   : ' + noWa + '\n' +
      'Jumlah hari diminta: ' + jumlahHari + ' hari\n' +
      'Token (sudah otomatis dibuat): ' + token + '\n' +
      'Waktu daftar      : ' + new Date().toLocaleString('id-ID') + '\n\n' +
      '── Cara mengaktifkan (cukup 1 klik, tidak perlu buka Apps Script) ──\n' +
      '1. Buka Google Sheet database (sheet "USERS").\n' +
      '2. Cari baris dengan NIP ' + nip + '.\n' +
      '3. Setelah pembayaran terverifikasi, klik dropdown kolom Status di baris itu, pilih "Aktif".\n' +
      '4. Sistem otomatis menghitung masa aktif ' + jumlahHari + ' hari dan menampilkan token siap kirim di notifikasi Sheets.\n\n' +
      'Token untuk dikirim manual ke WA/Telegram di atas: ' + token;

    MailApp.sendEmail(adminEmail, subject, body);
  } catch (e) {
    Logger.log('Gagal mengirim notifikasi email pendaftar baru: ' + e.message);
  }
}

/**
 * Pendaftaran akun baru. Token SUDAH LANGSUNG DIBUAT saat mendaftar (kolom
 * Token tidak lagi kosong) — Admin TIDAK perlu membuatkan token lagi,
 * cukup verifikasi pembayaran lalu ubah dropdown Status jadi "Aktif" di
 * Sheet (token & jumlah hari yang diminta sudah tersedia di baris itu).
 */
function daftarUser(nama, nip, noWa, jumlahHariDiminta) {
  nip = bersihkanKarakterTersembunyi_(nip).slice(0, 30);
  noWa = amanUntukSheet_(noWa, 30);
  nama = amanUntukSheet_(nama, 100);
  var hari = Math.floor(Number(jumlahHariDiminta) || 0);
  if (hari <= 0) hari = 3;    // fallback kalau tidak diisi/tidak valid
  if (hari > 7) hari = 7;     // batas MAKSIMAL permintaan akses: 7 hari (tidak boleh lebih)

  if (!nip) return { status: 'error', message: 'NIP wajib diisi.' };
  if (!noWa) return { status: 'error', message: 'No. WhatsApp/Telegram wajib diisi.' };
  if (!nama) return { status: 'error', message: 'Nama lengkap wajib diisi.' };

  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nip) {
      return { status: 'error', message: 'NIP ini sudah terdaftar. Jika sudah punya token, silakan langsung Masuk.' };
    }
  }

  var token = generateToken_();
  // Baris baru: NIP, Nama, NoWA, Token(SUDAH TERISI), Status, Kredit(=hari diminta), Role, JoinDate, TanggalExpired(kosong)
  sheet.appendRow([nip, nama, noWa, token, 'Menunggu Diaktifkan', hari, '', new Date(), '']);
  kirimNotifikasiPendaftarBaru_(nama, nip, noWa, hari, token);
  return { status: 'success', message: 'Pendaftaran diterima. Admin akan memverifikasi pembayaran lalu mengaktifkan akses Anda selama ' + hari + ' hari.' };
}

/**
 * Login dengan NIP + Token. Dipanggil setiap kali aplikasi dibuka
 * (baik input manual maupun auto-login dari token tersimpan di browser).
 */
/**
 * Cegah "formula injection": teks yang diawali = + - @ akan dieksekusi
 * Google Sheets sebagai RUMUS (mis. =IMPORTXML(...)) saat ditulis lewat kode.
 * Data dari formulir publik WAJIB dinetralkan dengan apostrof di depannya.
 */
function amanUntukSheet_(s, maks) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, maks || 100);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/**
 * Bersihkan string dari SEMUA jenis spasi (termasuk yang tak terlihat mata:
 * non-breaking space, zero-width space/joiner, BOM) yang sering ikut
 * ter-copy-paste dari sumber seperti Log Eksekusi atau chat WhatsApp/Telegram,
 * dan menyebabkan perbandingan token/NIP gagal walau terlihat identik.
 */
function bersihkanKarakterTersembunyi_(s) {
  return String(s || '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
}

function loginDenganToken(nip, token) {
  nip = bersihkanKarakterTersembunyi_(nip);
  token = bersihkanKarakterTersembunyi_(token).toUpperCase();

  if (!nip || !token) {
    return { status: 'error', message: 'NIP dan Token wajib diisi.' };
  }
  if (terlaluBanyakGagal_(nip)) {
    return { status: 'error', message: 'Terlalu banyak percobaan login yang salah. Silakan coba lagi dalam 15 menit.' };
  }

  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (bersihkanKarakterTersembunyi_(data[i][0]) === nip) {
      var tokenTersimpan = bersihkanKarakterTersembunyi_(data[i][3]).toUpperCase();
      var status = data[i][4];
      var tglExpired = data[i][8]; // kolom I: TanggalExpired

      if (status === 'Menunggu Diaktifkan' || !tokenTersimpan) {
        return { status: 'error', message: 'Akun Anda belum diaktifkan Admin. Mohon tunggu token dikirim ke WhatsApp/Telegram Anda.' };
      }
      if (status === 'Nonaktif') {
        return { status: 'error', message: 'Akun ini telah dinonaktifkan. Hubungi Admin.' };
      }
      if (tokenTersimpan === token && status === 'Kadaluwarsa') {
        return {
          status: 'expired',
          message: 'Masa aktif akun Anda sudah berakhir. Silakan ajukan perpanjangan token di bawah ini.',
          data: { nip: data[i][0], nama: data[i][1] }
        };
      }
      if (tokenTersimpan !== token) {
        catatGagalLogin_(nip);
        return { status: 'error', message: 'Token salah. Periksa kembali kode yang dikirim Admin.' };
      }
      resetGagalLogin_(nip);

      // PEMBARUAN: cek masa aktif berbasis tanggal (Kredit = jumlah hari pakai).
      // Kalau sudah lewat TanggalExpired, akses ditolak dengan status KHUSUS
      // 'expired' (beda dari 'error' biasa) supaya klien tahu harus menampilkan
      // form "Ajukan Perpanjangan", bukan sekadar pesan token salah.
      var tglEfektif = hitungExpiredJikaKosong_(sheet, i + 1, data[i]); // tetap benar walau trigger belum dipasang
      if (tglEfektif < new Date()) {
        sheet.getRange(i + 1, 5).setValue('Kadaluwarsa'); // tandai di Sheet juga biar Admin lihat jelas
        return {
          status: 'expired',
          message: 'Masa aktif akun Anda sudah berakhir. Silakan ajukan perpanjangan token di bawah ini.',
          data: { nip: data[i][0], nama: data[i][1] }
        };
      }

      return {
        status: 'success',
        data: {
          nip:    data[i][0],
          nama:   data[i][1],
          noWa:   data[i][2],
          kredit: Number(data[i][5]) || 0,
          role:   data[i][6],
          tanggalExpired: tglEfektif.toISOString()
        }
      };
    }
  }
  return { status: 'error', message: 'NIP tidak ditemukan. Silakan daftar terlebih dahulu.' };
}

/**
 * Diajukan user dari gerbang login saat token kedaluwarsa (atau ingin
 * menambah masa pakai). TOKEN BARU LANGSUNG DIBUAT & DITULIS ke Sheet saat
 * pengajuan ini diproses (tidak menunggu Admin aktifkan) — Admin tinggal
 * verifikasi pembayaran, lihat token baru yang sudah muncul di kolom Token,
 * lalu ubah dropdown Status jadi "Aktif" untuk mengunci masa aktifnya dan
 * mengirim token baru tersebut ke user.
 */
function ajukanPerpanjangan(nip, jumlahHariDiminta) {
  nip = bersihkanKarakterTersembunyi_(nip);
  var hari = Math.floor(Number(jumlahHariDiminta) || 0);
  if (!nip) return { status: 'error', message: 'NIP wajib diisi.' };
  if (hari <= 0 || hari > 7) return { status: 'error', message: 'Jumlah hari yang diminta tidak valid. Maksimal pengajuan akses adalah 7 hari.' };

  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (bersihkanKarakterTersembunyi_(data[i][0]) === nip) {
      var nama = data[i][1];
      var noWa = data[i][2];
      // Cegah penyalahgunaan: orang lain TIDAK boleh mengubah status akun yang
      // masih aktif/berlaku lewat form ini. Hanya akun yang memang sudah
      // kedaluwarsa (atau ditandai Kadaluwarsa) yang boleh mengajukan perpanjangan.
      var sudahLewat = data[i][8] && new Date(data[i][8]) < new Date();
      if (data[i][4] !== 'Kadaluwarsa' && !sudahLewat) {
        return { status: 'error', message: 'Akun ini belum kedaluwarsa, tidak perlu perpanjangan.' };
      }

      var tokenBaru = generateToken_(); // TOKEN BARU — auto-generate saat ajukan, bukan menunggu Admin klik Aktif
      sheet.getRange(i + 1, 4).setValue(tokenBaru);        // Token (kolom D) langsung terisi token baru
      sheet.getRange(i + 1, 5).setValue('Menunggu Diaktifkan'); // Status: menunggu verifikasi ulang
      sheet.getRange(i + 1, 6).setValue(hari);             // Kredit: jumlah hari BARU yang diminta
      // PENTING: kosongkan TanggalExpired LAMA di sini. Kalau tidak dikosongkan,
      // tanggal kedaluwarsa yang SUDAH LEWAT itu akan tetap terbaca saat user
      // login dengan token baru (hitungExpiredJikaKosong_ hanya menghitung ULANG
      // kalau kolom ini kosong) — sehingga token baru "ditolak" sebagai kadaluwarsa
      // padahal baru saja aktif. Mengosongkannya memastikan tanggal expired baru
      // selalu dihitung ulang dari nol (hari ini + Kredit) begitu akun aktif lagi,
      // baik lewat trigger aktivasiOtomatisSaatDiedit MAUPUN lewat login pertama
      // setelah Admin mengaktifkan (jaga-jaga kalau trigger onEdit belum terpasang).
      sheet.getRange(i + 1, 9).setValue('');
      kirimNotifikasiPerpanjangan_(nama, nip, noWa, hari, tokenBaru);
      return { status: 'success', message: 'Permintaan perpanjangan diterima. Admin akan memverifikasi pembayaran dan mengaktifkan kembali akses Anda selama ' + hari + ' hari.' };
    }
  }
  return { status: 'error', message: 'NIP tidak ditemukan.' };
}

function kirimNotifikasiPerpanjangan_(nama, nip, noWa, jumlahHari, tokenBaru) {
  try {
    var adminEmail = getAdminEmail_();
    if (!adminEmail) return;
    var subject = '🔁 Permintaan Perpanjangan Token: ' + nama;
    var body =
      'Ada permintaan PERPANJANGAN akses dari user lama:\n\n' +
      'Nama               : ' + nama + '\n' +
      'NIP                : ' + nip + '\n' +
      'No. WA/Telegram    : ' + noWa + '\n' +
      'Jumlah hari diminta: ' + jumlahHari + ' hari\n' +
      'Token baru (sudah otomatis dibuat): ' + tokenBaru + '\n\n' +
      '── Cara mengaktifkan (cukup 1 klik) ──\n' +
      'Buka Google Sheet database, cari baris NIP ' + nip + ' — token baru di atas SUDAH terisi di kolom Token. ' +
      'Setelah pembayaran terverifikasi, ubah dropdown Status jadi "Aktif" untuk mengunci masa aktif ' + jumlahHari + ' hari, ' +
      'lalu kirim token baru ini ke WA/Telegram user: ' + tokenBaru;
    MailApp.sendEmail(adminEmail, subject, body);
  } catch (e) {
    Logger.log('Gagal mengirim notifikasi perpanjangan: ' + e.message);
  }
}

/* ==================== KEAMANAN: PENGAMAN FUNGSI ADMIN & VALIDASI SESI ==================== */
/*
 * PENTING (keamanan produk berbayar): di Google Apps Script, SEMUA fungsi yang
 * namanya TIDAK berakhiran garis bawah "_" bisa dipanggil siapa pun dari
 * konsol browser lewat google.script.run — termasuk fungsi admin seperti
 * adminBuatToken atau debugCekToken. Tanpa pengaman, orang iseng bisa
 * mengaktifkan akun sendiri atau membaca token orang lain. Karena itu semua
 * fungsi khusus Admin sekarang WAJIB lolos pastikanAdmin_() dulu, yang hanya
 * meloloskan PEMILIK proyek yang menjalankannya dari Apps Script Editor.
 */
function pastikanAdmin_() {
  var aktif = '', pemilik = '';
  try { aktif = Session.getActiveUser().getEmail(); } catch (e) {}
  try { pemilik = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (!aktif || !pemilik || aktif !== pemilik) {
    throw new Error('Akses ditolak. Fungsi ini khusus Admin (pemilik proyek), hanya bisa dijalankan dari Apps Script Editor.');
  }
}

/**
 * Jika akun berstatus Aktif tapi TanggalExpired masih kosong (mis. trigger
 * aktivasi belum dipasang), hitung otomatis: hari ini + jumlah hari di kolom
 * Kredit (default 3), lalu simpan ke Sheet. Membuat sistem tetap benar walau
 * Admin hanya mengubah dropdown tanpa trigger.
 */
function hitungExpiredJikaKosong_(sheet, barisSheet, dataBaris) {
  var tgl = dataBaris[8];
  if (tgl) return new Date(tgl);
  var hari = Number(dataBaris[5]) || 0;
  if (hari <= 0) hari = 3;
  var baru = new Date();
  baru.setDate(baru.getDate() + hari);
  sheet.getRange(barisSheet, 9).setValue(baru);
  return baru;
}

/**
 * Validasi sesi di sisi SERVER untuk setiap aksi sensitif (mis. panggilan AI):
 * NIP+Token harus cocok, status Aktif, dan masa aktif belum lewat. Klien
 * TIDAK boleh dipercaya begitu saja karena kodenya bisa dimanipulasi.
 */
function validasiSesi_(nip, token) {
  nip = bersihkanKarakterTersembunyi_(nip);
  token = bersihkanKarakterTersembunyi_(token).toUpperCase();
  if (!nip || !token) return { ok: false, message: 'Sesi tidak valid. Silakan login kembali.' };

  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (bersihkanKarakterTersembunyi_(data[i][0]) === nip) {
      var tokenTersimpan = bersihkanKarakterTersembunyi_(data[i][3]).toUpperCase();
      if (!tokenTersimpan || tokenTersimpan !== token) return { ok: false, message: 'Sesi tidak valid. Silakan login kembali.' };
      if (data[i][4] !== 'Aktif') return { ok: false, message: 'Akun Anda tidak aktif. Silakan login kembali atau hubungi Admin.' };
      var tglExpired = hitungExpiredJikaKosong_(sheet, i + 1, data[i]);
      if (tglExpired < new Date()) return { ok: false, expired: true, message: 'Masa aktif akun Anda telah berakhir. Silakan login kembali untuk mengajukan perpanjangan.' };
      return { ok: true, row: i + 1, data: data[i] };
    }
  }
  return { ok: false, message: 'Sesi tidak valid. Silakan login kembali.' };
}

/* --- Pembatasan percobaan login salah (anti tebak-tebakan token) --- */
var BATAS_GAGAL_LOGIN = 10;       // maksimal percobaan salah per NIP
var JEDA_GAGAL_LOGIN_DETIK = 900; // 15 menit

function terlaluBanyakGagal_(nip) {
  return (Number(CacheService.getScriptCache().get('gagal_' + nip)) || 0) >= BATAS_GAGAL_LOGIN;
}
function catatGagalLogin_(nip) {
  var cache = CacheService.getScriptCache();
  var n = (Number(cache.get('gagal_' + nip)) || 0) + 1;
  cache.put('gagal_' + nip, String(n), JEDA_GAGAL_LOGIN_DETIK);
}
function resetGagalLogin_(nip) {
  CacheService.getScriptCache().remove('gagal_' + nip);
}

/**
 * ALAT DIAGNOSA (khusus Admin) — jalankan manual dari Apps Script Editor kalau
 * login masih gagal padahal token terlihat sama persis. Contoh:
 * debugCekToken('198210102025211081')
 */
function debugCekToken(nip) {
  pastikanAdmin_();
  nip = bersihkanKarakterTersembunyi_(nip);
  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (bersihkanKarakterTersembunyi_(data[i][0]) === nip) {
      var rawToken = data[i][3];
      var hasil =
        'Baris ke-' + (i + 1) + ' di Sheet\n' +
        'NIP tersimpan   : [' + data[i][0] + ']\n' +
        'Nama            : [' + data[i][1] + ']\n' +
        'Token tersimpan : [' + rawToken + ']\n' +
        'Panjang token   : ' + String(rawToken).length + ' karakter\n' +
        'Kode ASCII tiap karakter token: ' + String(rawToken).split('').map(function (c) { return c.charCodeAt(0); }).join(', ') + '\n' +
        'Status          : [' + data[i][4] + ']\n' +
        'Kredit (hari)   : ' + data[i][5] + '\n' +
        'TanggalExpired  : ' + data[i][8];
      Logger.log(hasil);
      return hasil;
    }
  }
  Logger.log('NIP ' + nip + ' tidak ditemukan di sheet manapun yang sedang dipakai skrip ini.');
  return 'NIP tidak ditemukan.';
}

/**
 * UNTUK ADMIN (opsional — cara utama tetap dropdown Status di Sheet).
 * Aktifkan akun lewat kode: adminBuatToken('198501012010011001', 25)
 * -> token dibuat kalau belum ada, Kredit = 25 hari, Status Aktif, masa aktif
 * dihitung mulai hari ini. Token & pesan siap kirim muncul di Log Eksekusi.
 */
function adminBuatToken(nip, jumlahHari) {
  pastikanAdmin_();
  nip = String(nip || '').trim();
  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nip) {
      var row = i + 1;
      var token = String(data[i][3] || '').trim() || generateToken_();
      var hari = Number(jumlahHari) || Number(data[i][5]) || 3;
      var tglExpired = new Date();
      tglExpired.setDate(tglExpired.getDate() + hari);

      sheet.getRange(row, 4).setValue(token);        // Token
      sheet.getRange(row, 5).setValue('Aktif');      // Status
      sheet.getRange(row, 6).setValue(hari);         // Kredit = jumlah hari
      sheet.getRange(row, 9).setValue(tglExpired);   // TanggalExpired

      var nama = data[i][1];
      var noWa = data[i][2];
      var tglLabel = Utilities.formatDate(tglExpired, Session.getScriptTimeZone(), 'dd MMMM yyyy');
      var pesan = 'NIP ' + nip + ' (' + nama + ') diaktifkan.\n' +
                  'Token       : ' + token + '\n' +
                  'Masa aktif  : ' + hari + ' hari (s.d. ' + tglLabel + ')\n' +
                  'Kirim manual ke WA/Telegram: ' + noWa + '\n\n' +
                  'Contoh pesan ke user:\n' +
                  '"Halo ' + nama + ', pendaftaran Suanggi PKH Anda telah diverifikasi. ' +
                  'Silakan login dengan NIP: ' + nip + ' dan Token: ' + token + '. Masa aktif ' + hari + ' hari."';
      Logger.log(pesan);
      return { status: 'success', token: token, hari: hari, message: pesan };
    }
  }
  Logger.log('NIP ' + nip + ' tidak ditemukan di database.');
  return { status: 'error', message: 'NIP tidak ditemukan.' };
}

/**
 * UNTUK ADMIN: nonaktifkan akun (mis. penyalahgunaan). Cara mudah: ubah
 * dropdown Status di Sheet jadi "Nonaktif". Atau via kode: nonaktifkanUser('NIP')
 */
function nonaktifkanUser(nip) {
  pastikanAdmin_();
  nip = String(nip || '').trim();
  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nip) {
      sheet.getRange(i + 1, 5).setValue('Nonaktif');
      return 'OK. NIP ' + nip + ' dinonaktifkan.';
    }
  }
  return 'NIP tidak ditemukan.';
}

/**
 * UNTUK ADMIN: TAMBAH hari akses user (perpanjangan cepat tanpa lewat dropdown).
 * Contoh: tambahHariAkses('198501012010011001', 30) -> masa aktif diperpanjang 30 hari
 * (dihitung dari tanggal kedaluwarsa saat ini kalau masih berlaku, atau dari
 * hari ini kalau sudah lewat), status jadi Aktif.
 */
function tambahHariAkses(nip, jumlahHari) {
  pastikanAdmin_();
  nip = String(nip || '').trim();
  var hari = Number(jumlahHari) || 0;
  if (hari <= 0) return 'Jumlah hari tidak valid.';
  var sheet = getDbSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nip) {
      var row = i + 1;
      var sekarang = new Date();
      var dasar = (data[i][8] && new Date(data[i][8]) > sekarang) ? new Date(data[i][8]) : sekarang;
      dasar.setDate(dasar.getDate() + hari);
      sheet.getRange(row, 5).setValue('Aktif');
      sheet.getRange(row, 6).setValue(hari);
      sheet.getRange(row, 9).setValue(dasar);
      var hasil = 'OK. NIP ' + nip + ' diperpanjang ' + hari + ' hari, berlaku sampai ' + Utilities.formatDate(dasar, Session.getScriptTimeZone(), 'dd MMMM yyyy');
      Logger.log(hasil);
      return hasil;
    }
  }
  return 'NIP tidak ditemukan.';
}

/**
 * Simpan jabatan/role yang dipilih user. Divalidasi dengan NIP+Token supaya
 * orang lain tidak bisa mengubah data pengguna lain.
 */
function updateUserRole(nip, token, role) {
  var sesi = validasiSesi_(nip, token);
  if (!sesi.ok) return false;
  getDbSheet().getRange(sesi.row, 7).setValue(String(role || '').slice(0, 100));
  return true;
}

/* ==================== 6. FITUR AI (GEMINI / QWEN / ANTHROPIC) ==================== */

var AI_SYSTEM_PROMPT = 'Anda adalah penulis laporan kinerja profesional yang membantu pegawai Kementerian Sosial RI (Program Keluarga Harapan) menyusun laporan bulanan resmi dalam bahasa Indonesia. ' +
  'ATURAN NADA TULISAN — WAJIB DIPATUHI:\n' +
  '1) HUMANIS: tulis seperti pegawai sungguhan yang menceritakan pekerjaannya, bukan seperti mesin yang mengulang-ulang template kaku. Variasikan struktur kalimat, hindari pengulangan frasa pembuka yang itu-itu saja antar paragraf.\n' +
  '2) NORMATIF: tetap sesuai kaidah bahasa Indonesia baku dan tata naskah dinas resmi Kementerian Sosial — sopan, lugas, dan bertanggung jawab (tidak berlebihan/bombastis, tidak mengklaim keberhasilan tanpa dasar).\n' +
  '3) AKADEMIS: gunakan istilah teknis bidang perlindungan sosial/PKH secara tepat, susun logika sebab-akibat yang runtut (kegiatan → proses → hasil), dan jaga konsistensi istilah dari awal sampai akhir paragraf.\n' +
  'ATURAN KETAATAN KONTEKS — WAJIB DIPATUHI:\n' +
  '- Isi tulisan HARUS relevan dan konsisten dengan Rencana Hasil Kerja (RHK), Indikator Kinerja, dan Rencana Aksi yang diberikan dalam instruksi pengguna. JANGAN mengarang kegiatan, program, atau capaian lain yang tidak berkaitan dengan konteks tersebut.\n' +
  '- Untuk data kuantitatif yang tidak diberikan (jumlah KPM, persentase, tanggal pasti, dsb.), JANGAN mengarang angka — gunakan placeholder eksplisit seperti "±... KPM", "...kali pertemuan", atau "[isi sesuai data lapangan]" agar pengguna tahu bagian mana yang wajib mereka lengkapi sendiri.\n' +
  'FORMAT JAWABAN: jawab LANGSUNG berupa teks laporan siap pakai saja (paragraf naratif utuh), TANPA judul, TANPA poin-poin bernomor, TANPA kalimat pembuka seperti "Berikut adalah..." atau penjelasan di luar teks laporan itu sendiri.';

/* Batas pemakaian AI per NIP (anti penyalahgunaan & pelindung biaya API) */
var BATAS_AI_PER_6JAM = 20;

/**
 * SATU-SATUNYA pintu AI yang boleh dipanggil dari aplikasi. Divalidasi di
 * SERVER: NIP+Token cocok, akun Aktif, masa aktif belum habis, panjang prompt
 * wajar, dan belum melewati batas pemakaian. (Sebelumnya fungsi AI bisa
 * dipanggil siapa pun dari konsol browser dan menguras kuota API Anda.)
 * Pemakaian AI TIDAK memotong hari akses — hari akses hanya berkurang
 * karena berjalannya waktu.
 */
function sempurnakanDenganAI(nip, token, prompt) {
  var sesi = validasiSesi_(nip, token);
  if (!sesi.ok) throw new Error(sesi.message);

  prompt = String(prompt || '');
  if (!prompt.trim()) throw new Error('Permintaan AI kosong.');
  if (prompt.length > 8000) throw new Error('Data yang dikirim ke AI terlalu panjang. Persingkat uraian yang sudah diketik, lalu coba lagi.');

  var cache = CacheService.getScriptCache();
  var kunci = 'ai_' + bersihkanKarakterTersembunyi_(nip);
  var terpakai = Number(cache.get(kunci)) || 0;
  if (terpakai >= BATAS_AI_PER_6JAM) {
    throw new Error('Batas pemakaian AI tercapai (' + BATAS_AI_PER_6JAM + ' kali per 6 jam). Silakan coba lagi nanti atau lengkapi uraian secara manual.');
  }
  cache.put(kunci, String(terpakai + 1), 21600); // 6 jam (batas maksimal CacheService)

  return callClaudeAI_(prompt);
}

/**
 * Pintu masuk AI. Provider dipilih OTOMATIS:
 *  - Ada GEMINI_API_KEY           -> Google Gemini (diprioritaskan)
 *  - Jika tidak, QWEN_API_KEY      -> Qwen (DashScope, biaya murah)
 *  - Jika tidak, ANTHROPIC_API_KEY -> Claude
 * Isi SALAH SATU (atau lebih dari satu, yang teratas dalam urutan prioritas
 * di atas yang akan dipakai) di: Project Settings > Script Properties.
 * API key TIDAK PERNAH dikirim ke browser pengguna — seluruh pemanggilan
 * terjadi di server (UrlFetchApp), key hanya hidup di Script Properties.
 */
function callClaudeAI_(prompt) {
  var props     = PropertiesService.getScriptProperties();
  var geminiKey = props.getProperty('GEMINI_API_KEY');
  var qwenKey   = props.getProperty('QWEN_API_KEY');
  var anthKey   = props.getProperty('ANTHROPIC_API_KEY');

  if (geminiKey) return callGeminiAI_(prompt, geminiKey);
  if (qwenKey) return callQwenAI_(prompt, qwenKey);
  if (anthKey) return callAnthropicAI_(prompt, anthKey);

  throw new Error('Fitur AI belum dikonfigurasi. Admin perlu mengisi GEMINI_API_KEY, QWEN_API_KEY, atau ANTHROPIC_API_KEY di Project Settings > Script Properties.');
}

/* --- Provider 0: GOOGLE GEMINI (diprioritaskan pertama) --- */
function callGeminiAI_(prompt, apiKey) {
  var model = 'gemini-3.6-flash'; // PEMBARUAN: gemini-2.5-flash sudah tidak tersedia untuk pengguna baru per pesan error Google
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      // API key dikirim lewat HEADER (bukan query string URL) supaya tidak
      // ikut tercatat di log akses/URL di mana pun — praktik paling aman.
      'x-goog-api-key': apiKey
    },
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      // PEMBARUAN: mulai Gemini 3.6 Flash, parameter sampling custom (temperature,
      // top_p, top_k) sudah deprecated/diabaikan Google — sengaja tidak disertakan lagi.
      // PERBAIKAN BUG: model Gemini 3.x punya proses "thinking" internal yang IKUT
      // memakan jatah maxOutputTokens. Kalau jatahnya kecil (1000) dan budget
      // thinking tidak dibatasi, seluruh token bisa habis untuk "berpikir" saja
      // sebelum sempat menulis jawaban — hasilnya teks kosong (finishReason:
      // MAX_TOKENS). thinkingLevel:'low' meminimalkan (Gemini 3.x tidak bisa
      // dimatikan total), dan maxOutputTokens dinaikkan agar tetap ada ruang
      // cukup untuk jawaban sesungguhnya di luar proses berpikir tsb.
      generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'low' } }
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var data = JSON.parse(response.getContentText());

  if (code !== 200) {
    var msg0 = (data && data.error && data.error.message) ? data.error.message : ('Permintaan AI Gemini gagal (status ' + code + ').');
    throw new Error(msg0);
  }

  var kandidat = (data.candidates && data.candidates[0]) || null;
  var text0 = kandidat && kandidat.content && kandidat.content.parts
    ? kandidat.content.parts.map(function (p) { return p.text || ''; }).join('\n').trim()
    : '';

  if (!text0) {
    var alasanKode = kandidat && kandidat.finishReason ? kandidat.finishReason : '';
    var pesanRamah = 'AI Gemini tidak mengembalikan teks.';
    if (alasanKode === 'MAX_TOKENS') {
      pesanRamah = 'AI Gemini kehabisan jatah token sebelum sempat menulis jawaban (biasanya karena data konteks terlalu panjang). Coba klik tombol "Sempurnakan dengan AI" sekali lagi, atau persingkat uraian yang sudah diketik manual sebelumnya.';
    } else if (alasanKode === 'SAFETY' || alasanKode === 'RECITATION') {
      pesanRamah = 'AI Gemini menolak permintaan ini karena filter keamanan (finishReason: ' + alasanKode + '). Coba ubah sedikit redaksi uraian/data yang sudah Anda isi, lalu coba lagi.';
    } else if (alasanKode) {
      pesanRamah = 'AI Gemini tidak mengembalikan teks (finishReason: ' + alasanKode + ').';
    }
    throw new Error(pesanRamah);
  }
  return text0;
}

/* --- Provider 1: QWEN (DashScope, mode kompatibel OpenAI) --- */
function callQwenAI_(prompt, apiKey) {
  var response = UrlFetchApp.fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify({
      model: 'qwen-plus',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ]
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var data = JSON.parse(response.getContentText());

  if (code !== 200) {
    var msg = (data && data.error && data.error.message) ? data.error.message : ('Permintaan AI gagal (status ' + code + ').');
    throw new Error(msg);
  }

  var text = String(data.choices[0].message.content || '').trim();
  if (!text) throw new Error('AI tidak mengembalikan teks.');
  return text;
}

/* --- Provider 2: ANTHROPIC CLAUDE --- */
function callAnthropicAI_(prompt, apiKey) {
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var data = JSON.parse(response.getContentText());

  if (code !== 200) {
    var msg2 = (data && data.error && data.error.message) ? data.error.message : ('Permintaan AI gagal (status ' + code + ').');
    throw new Error(msg2);
  }

  var text2 = (data.content || [])
    .map(function (c) { return c.type === 'text' ? c.text : ''; })
    .join('\n')
    .trim();
  if (!text2) throw new Error('AI tidak mengembalikan teks.');
  return text2;
}