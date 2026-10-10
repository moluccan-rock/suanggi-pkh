# Panduan Deploy — Suanggi PKH (Versi REST API + Frontend Statis)

Panduan ini untuk pengguna yang **belum pernah** memakai Git/GitHub sama sekali. Ikuti dari atas ke bawah, jangan lompat langkah.

Struktur hasil migrasi:
```
migrasi-github/
├── Kode.gs              -> backend, di-deploy ke script.google.com
├── index.html           -> frontend
├── style.css            -> frontend
├── app.js               -> frontend (edit GAS_URL di sini)
└── PANDUAN_DEPLOY.md    -> file ini
```

---

## 1. Backend (Google Apps Script)

1. Buka https://script.google.com di browser, login dengan akun Google yang sama dengan yang punya database Sheets/Drive aplikasi ini.
2. Klik **Proyek Baru** (New project).
3. Di panel kiri, klik file `Code.gs` yang otomatis dibuat, lalu:
   - Hapus semua isinya.
   - Ganti nama file (klik ikon ⋮ di sebelah "Code.gs" → Rename) menjadi `Kode` (akan jadi `Kode.gs`).
   - Buka file `Kode.gs` dari folder `migrasi-github/` hasil migrasi ini, copy **seluruh isinya**, paste ke editor.
4. Simpan (Ctrl+S / Cmd+S atau ikon disket).
5. **Deploy sebagai Web App**:
   - Klik tombol **Deploy** (kanan atas) → **New deployment**.
   - Klik ikon gerigi ⚙️ di samping "Select type" → pilih **Web app**.
   - Isi:
     - **Execute as**: `Me` (akun Anda sendiri — supaya akses ke Sheets/Drive memakai izin Anda, bukan izin orang yang membuka aplikasi).
     - **Who has access**: `Anyone` (supaya bisa dipanggil dari frontend publik di GitHub Pages).
   - Klik **Deploy**.
   - Kalau diminta otorisasi ("Review permissions"), ikuti: pilih akun Google Anda → klik **Advanced** → **Go to [nama proyek] (unsafe)** → **Allow**. (Peringatan "unsafe" ini normal untuk skrip buatan sendiri yang belum di-review Google, bukan tanda bahaya.)
   - Setelah berhasil, akan muncul **Web app URL** yang diakhiri `/exec`. **COPY URL ini** — Anda akan butuh di Langkah 2.

6. **Pasang 2 trigger otomatis** (WAJIB, sekali saja):
   - Di panel kiri, klik ikon jam ⏰ **Triggers**.
   - **Trigger 1 — aktivasi otomatis saat Admin ubah Status jadi "Aktif" di Sheet:**
     - Klik **+ Add Trigger**.
     - Choose which function to run: `aktivasiOtomatisSaatDiedit`
     - Select event source: `From spreadsheet`
     - Select event type: `On edit`
     - Klik **Save** (izinkan otorisasi bila diminta).
   - **Trigger 2 — pengecekan kadaluwarsa otomatis setiap jam:**
     - Klik **+ Add Trigger** lagi.
     - Choose which function to run: `cekKadaluwarsaOtomatis`
     - Select event source: `Time-driven`
     - Select type of time based trigger: `Hour timer`
     - Select hour interval: `Every hour` (atau "Every 6 hours" untuk hemat kuota)
     - Klik **Save**.

7. (Opsional, kalau fitur AI ingin dipakai) Isi API key AI di **Project Settings → Script Properties**: tambahkan salah satu dari `GEMINI_API_KEY`, `QWEN_API_KEY`, atau `ANTHROPIC_API_KEY`.

---

## 2. Mengisi GAS_URL di app.js

1. Buka file `app.js` (di folder `migrasi-github/`) dengan editor teks apa pun (Notepad, VS Code, dll).
2. Cari baris paling atas:
   ```js
   const GAS_URL = 'PASTE_URL_WEB_APP_ANDA_DI_SINI';
   ```
3. Ganti `PASTE_URL_WEB_APP_ANDA_DI_SINI` dengan URL `/exec` yang Anda copy di Langkah 1.6. Hasilnya kira-kira:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/AKfycb.......XYZ/exec';
   ```
4. Simpan file.

---

## 3. Frontend (GitHub Pages) — langkah dari nol

### 3.1 Install Git
- **Windows**: download dari https://git-scm.com/download/win, jalankan installer, klik Next terus sampai selesai (default sudah cukup).
- **Mac**: buka Terminal, ketik `git --version` — kalau belum ada, macOS akan menawarkan instalasi Xcode Command Line Tools, klik Install.
- Setelah install, buka Terminal (Mac/Linux) atau Git Bash/Command Prompt (Windows), cek dengan:
  ```bash
  git --version
  ```

### 3.2 Buat akun & repository di GitHub
1. Buka https://github.com, buat akun kalau belum punya (Sign up).
2. Setelah login, klik tombol **+** di kanan atas → **New repository**.
3. Isi **Repository name**, misalnya `suanggi-pkh`.
4. Pastikan dipilih **Public**.
5. **JANGAN** centang "Add a README file" (biar tidak konflik nanti).
6. Klik **Create repository**. Anda akan melihat halaman kosong dengan instruksi — biarkan tab ini terbuka, kita akan pakai URL-nya.

### 3.3 Siapkan folder project di komputer
1. Buat folder baru di komputer Anda, misalnya `suanggi-pkh`.
2. Masukkan 3 file frontend hasil migrasi ke folder itu: `index.html`, `style.css`, `app.js` (yang `GAS_URL`-nya sudah diisi di Langkah 2). **Jangan masukkan `Kode.gs`** — itu backend, tidak perlu ikut ke GitHub Pages.

### 3.4 Push pertama kali (perintah terminal siap-copy)
Buka Terminal/Git Bash/Command Prompt, masuk ke folder tadi, lalu jalankan baris per baris:

```bash
cd path/ke/folder/suanggi-pkh
git init
git add index.html style.css app.js
git commit -m "Deploy awal frontend Suanggi PKH"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/suanggi-pkh.git
git push -u origin main
```

Ganti `USERNAME-ANDA/suanggi-pkh` dengan URL repository Anda sendiri (lihat di halaman repo GitHub yang tadi dibuat, biasanya tertulis persis di instruksi "…or push an existing repository from the command line").

> **Jika diminta login**: GitHub tidak lagi menerima password biasa lewat terminal. Anda akan diminta **Personal Access Token (PAT)** sebagai pengganti password:
> 1. Di GitHub, klik foto profil → **Settings** → scroll ke **Developer settings** (paling bawah kiri) → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
> 2. Beri nama, centang scope `repo`, klik **Generate token**.
> 3. **Copy token itu** (hanya muncul sekali!).
> 4. Saat terminal minta "Password", paste token tersebut (bukan password akun GitHub Anda).

### 3.5 Aktifkan GitHub Pages
1. Di halaman repository GitHub Anda, klik tab **Settings**.
2. Di panel kiri, klik **Pages**.
3. Di bagian **Build and deployment** → **Source**, pilih **Deploy from a branch**.
4. Di **Branch**, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
5. Tunggu 1-2 menit, lalu refresh halaman — akan muncul URL situs Anda, biasanya berbentuk:
   ```
   https://USERNAME-ANDA.github.io/suanggi-pkh/
   ```

### 3.6 Redeploy setelah ada perubahan file
Setiap kali Anda mengubah `index.html`/`style.css`/`app.js` di komputer, upload ulang dengan:
```bash
cd path/ke/folder/suanggi-pkh
git add index.html style.css app.js
git commit -m "Update frontend"
git push
```
GitHub Pages otomatis memperbarui situs beberapa saat setelah push berhasil.

---

## 4. Test end-to-end

Lakukan urutan ini SETELAH backend di-deploy (Langkah 1) dan frontend sudah live di GitHub Pages (Langkah 3):

1. **Buka URL GitHub Pages** di browser (mode penyamaran/incognito disarankan supaya tidak terganggu cache lama).
2. **Buka DevTools browser** (F12) → tab **Network**, biarkan terbuka selama testing berikutnya untuk mengawasi error.
3. **Test Daftar**: isi form pendaftaran (Nama, NIP, No. WA, jumlah hari) → submit → pastikan muncul pesan sukses, dan cek di Google Sheet "USERS" baris baru benar-benar muncul.
4. **Aktivasi manual (Admin)**: di Google Sheet, ubah dropdown Status baris tersebut jadi "Aktif" — pastikan toast konfirmasi muncul di Sheets dan kolom Token/TanggalExpired terisi.
5. **Test Login**: di halaman web, login dengan NIP + Token yang baru dibuat → pastikan masuk ke gerbang "Pilih Jabatan".
6. **Test Ajukan Perpanjangan**: (opsional) ubah manual tanggal expired di Sheet jadi tanggal lampau, login lagi → harus muncul form perpanjangan, ajukan, cek Sheet ter-update.
7. **Test Pilih RHK**: pilih jabatan → pilih 1 RHK & 1 rencana aksi → lanjut ke Edit Laporan, pastikan field-field A-E terisi otomatis.
8. **Test Generate Laporan + PDF**: isi/lengkapi laporan → klik "Pratinjau & Simpan ke PDF" → pastikan modal pratinjau tampil wajar → unduh PDF → buka file PDF-nya, pastikan isinya sesuai.
9. **Cek tab Network** sepanjang testing di atas: pastikan setiap request ke `.../exec` berstatus `200 OK` dan **TIDAK ADA** error merah bertuliskan CORS (`blocked by CORS policy`, dll). Kalau ada error CORS, pastikan header fetch di `app.js` memang `text/plain;charset=utf-8` (bukan `application/json`) dan deployment Web App memakai "Who has access: Anyone".

---

## 5. Catatan penting

**Aplikasi GAS versi LAMA (HtmlService + iframe, yang masih dipanggil lewat `doGet()` membuka `index.html` di dalam Apps Script) TETAP DIBIARKAN JALAN sebagai cadangan** selama versi REST API + frontend statis ini masih dalam tahap pengujian. **JANGAN hapus atau undeploy versi lama** sampai Anda benar-benar yakin versi baru berjalan sempurna untuk semua pengguna. Kedua versi aman berjalan berdampingan karena memakai database Google Sheets yang sama persis (skema 9 kolom tidak diubah sama sekali oleh migrasi ini).
