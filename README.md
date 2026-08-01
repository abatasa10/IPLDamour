# D'AMOUR - Aplikasi Sistem IPL Perumahan

Aplikasi Manajemen Iuran Pemeliharaan Lingkungan (IPL) Perumahan D'AMOUR yang modern, responsif, dan siap dideploy ke **GitHub Pages**.

---

## 🌟 Fitur Utama

1. **Dashboard Analytics & Realtime Chart**:
   - Stat Cards KPI (Total Rumah, Menunggak, Lunas Bulan Ini, Saldo Kas).
   - Donut Chart Status Tagihan (Chart.js).
   - Bar Chart Grafik Pembayaran 6 Bulan Terakhir.
   - Ringkasan Tagihan, Pengeluaran Terakhir, & Kas Masuk vs Keluar.

2. **Master Data Rumah**:
   - Pencarian real-time berdasarkan Blok/No, Nama Pemilik, atau Nomor HP.
   - Filter & pagination data warga.
   - Tambah, Edit, dan Hapus unit rumah.

3. **Master Komponen & Setting Target IPL**:
   - Pengaturan komponen iuran (Satpam, Sampah, Listrik & Wifi, Tambahan Developer).
   - Perhitungan alokasi **Kas Otomatis (AUTO Sisa)**.
   - Pengaturan target nominal IPL per kelompok iuran.

4. **Perhitungan IPL (Rincian Formula)**:
   - Kalkulasi otomatis pembagian iuran per rumah (`Total Biaya / Jumlah Rumah`).
   - Rincian transparan sebelum dibulatkan.

5. **Tagihan, Pembayaran & Integrasi WhatsApp**:
   - Pencatatan konfirmasi pembayaran lunas.
   - Fitur **Kirim WA Pengingat** otomatis langsung membuka pesan WhatsApp ke nomor HP warga dengan template tagihan.

6. **Pengaturan & Backup Data**:
   - Export backup data ke file `data.json`.
   - Restore data dari file `.json`.
   - Reset ke data default awal kapan saja.

---

## 🚀 Cara Deploy ke GitHub Pages

1. **Buat Repository Baru di GitHub**:
   - Buka GitHub -> **New Repository**.
   - Beri nama repository (misal: `IPL` atau `damour-ipl`).
   - Biarkan publik (Public).

2. **Upload File Proyek**:
   - Push atau Upload seluruh file berikut ke repository Anda:
     - `index.html`
     - `styles.css`
     - `app.js`
     - `data.json`
     - `README.md`

   *Contoh command git:*
   ```bash
   git init
   git add .
   git commit -m "Initial commit D'AMOUR IPL System"
   git branch -M main
   git remote add origin https://github.com/USERNAME/IPL.git
   git push -u origin main
   ```

3. **Aktifkan GitHub Pages**:
   - Masuk ke menu **Settings** di repository GitHub Anda.
   - Pilih menu **Pages** di sidebar kiri.
   - Pada bagian **Build and deployment -> Source**, pilih **Deploy from a branch**.
   - Branch: pilih `main` dan folder `/ (root)`.
   - Klik **Save**.
   - Tunggu 1-2 menit, web Anda akan dapat diakses secara publik pada URL:
     `https://USERNAME.github.io/IPL/`

---

## 📊 Integrasi Google Spreadsheet (Opsional)

Aplikasi ini dapat disinkronkan dengan Google Spreadsheet Anda:
1. Buka Google Spreadsheet Anda.
2. Klik **File** -> **Bagikan (Share)** -> **Publikasikan ke web (Publish to web)**.
3. Pilih Sheet data -> format **CSV**.
4. Salin link publikasi tersebut ke aplikasi di menu **Pengaturan & Sync**.

---

## 📁 Struktur File

- `index.html` : Halaman tunggal SPA & Layout UI.
- `styles.css` : Styling sistem UI HSL, Modal, & Responsive Design.
- `app.js`     : Logika perhitungan IPL, Chart.js, CRUD, & LocalStorage store.
- `data.json`  : Database awal (31 unit rumah & histori transaksi).
- `README.md`  : Dokumen panduan ini.
