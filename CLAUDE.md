# WadahQRIS

Platform web untuk berbagi & menemukan kode QRIS pembayaran bagi **masjid, yayasan, dan UMKM** di Indonesia. Tujuannya sebagai kanal donasi/sedekah dan community commerce: siapa saja bisa submit QRIS, orang lain bisa telusuri QRIS yang sudah terverifikasi.

Pemilik: Askar. Komunikasi dalam Bahasa Indonesia, permintaan perubahan biasanya bertahap dan bernomor.

## Filosofi Pengembangan

- **Demo-first** (fase awal, sudah selesai): tampilan & fitur diselesaikan dulu sebelum komit ke infrastruktur. Kini **sudah live** di Firebase Hosting dengan config produksi terpasang — perubahan kode berdampak ke situs produksi setelah di-deploy ulang.
- Copy/tone bernuansa filosofis & trust-oriented (contoh: tombol submit = "Amanahkan ke wadah").
- Referensi desain: **Kitabisa** (warna-warni, playful, terasa seperti gerakan komunitas).

## Arsitektur

- **Frontend**: satu file HTML tunggal, tanpa build toolchain. Firebase SDK versi *compat* via CDN gstatic (`firebase-app-compat.js` + `firebase-firestore-compat.js` + `firebase-auth-compat.js`).
- **Backend/DB**: Firebase Firestore (koleksi `qris`) + Firebase Authentication (email/password untuk admin).
- **Logo**: PNG (tiga figur manusia abstrak naik dari simbol infinity + ikon QR), di-embed sebagai base64 di HTML, background putih dihapus & dikompres.

### Struktur data — dua koleksi (teks & gambar dipisah)
Sejak optimasi load, **gambar dipisah dari dokumen teks** supaya list tidak mengunduh base64 massal:
- **`qris`** (ringan, dimuat semua di list via `onSnapshot`): `id`, `name`, `address`, `category` (🕌 Masjid / 🛍️ UMKM / 📌 Lainnya), `city`, `district`, `uploadedAt`, `status` (`pending` / `approved`). **Tidak ada gambar di sini.**
- **`qris_media`** (id **sama persis** dengan dokumen `qris` pasangannya): `dataUrl` (base64 JPEG QRIS) + `photoUrl` (base64 foto pendukung, opsional). **Diambil satu per satu hanya saat detail dibuka** (`loadMedia()` → `db.collection("qris_media").doc(id).get()`), lalu di-cache di objek item.

Upload menulis kedua dokumen sekaligus dalam **satu `db.batch()`** (id di-generate lebih dulu via `db.collection("qris").doc()`). Hapus juga membatch delete keduanya. Edit admin hanya menyentuh field teks di `qris` (gambar di `qris_media` immutable).

**Kompatibel mundur (tanpa migrasi wajib):** entri LAMA yang masih menyimpan `dataUrl`/`photoUrl` inline di dokumen `qris` tetap berfungsi — `listen()` memetakan semua field, jadi item lama sudah punya `dataUrl` → `loadMedia()` langsung return dan memakai gambar inline; hanya entri BARU (tanpa `dataUrl` di `qris`) yang di-fetch dari `qris_media`. Konsekuensinya, entri lama masih ikut terunduh base64-nya di list sampai dimigrasi. Migrasi penuh (pindahkan gambar lama ke `qris_media` + ramping­kan dokumen `qris`) bersifat opsional dan **harus server-side** (Admin SDK / Console) karena `firestore.rules` sengaja melarang mengubah/menghapus `dataUrl` lewat klien.

Gambar QRIS otomatis di-resize & dikompres ke JPEG (maks 1000px, kualitas 85%) sebelum disimpan → ~150–350KB per gambar. Dinaikkan dari 500px/72% karena hasil unduhan terasa kecil/buram untuk dicetak; 1000px setara file asli dari penyedia QRIS dan tajam dicetak sampai ±8 cm @300 DPI. Foto pendukung (opsional) di-resize maks 900px kualitas 80% (dinaikkan dari 420px/65% yang terasa terlalu buram). `compress()` punya pengaman: kualitas turun bertahap (step 6%, minimal 50%) sampai base64 < `cap` (QRIS 560K, foto pendukung 380K) agar tidak ditolak `firestore.rules` (batas `dataUrl` 600K, `photoUrl` 400K — kini divalidasi di blok `qris_media`). Dokumen `qris_media` maks ±940K, di bawah batas 1MB Firestore; dokumen `qris` sendiri kini hanya beberapa ratus byte teks.

## Kondisi Saat Ini (paling baru)

- **Layout text-first**: bukan grid thumbnail QR (karena thumbnail QR secara visual tidak bisa dibedakan). Kartu menampilkan nama + kota; QR baru muncul di detail sheet saat diklik.
- **Gambar lazy-load (koleksi `qris_media`)**: list `onSnapshot` hanya memuat teks dari koleksi `qris` — ringan, tidak lagi menyeret ~200–450KB base64 per entri. Gambar QRIS/foto pendukung diambil satu per satu saat detail dibuka (`loadMedia()`), sambil menampilkan spinner di `.qris-frame.loading`; hasilnya di-cache di objek item (buka-ulang & unduh/bagikan tidak fetch lagi). Ini menjawab isu skala (100 entri dulu ≈ 20–45MB sekali muat → kini hanya teks). Lihat "Struktur data — dua koleksi".
- **Loading state anti-flash**: saat memuat, empty-state "Wadah ini masih kosong" **tidak** ditampilkan selama masih loading — hanya kalau server memastikan hasilnya kosong (`snap.metadata.fromCache === false`). Snapshot kosong dari cache/koneksi awal diabaikan; skeleton tetap tampil sampai data server tiba (penting di in-app browser Instagram yang butuh ~3 dtk). Ada pengaman timeout 10 dtk. Sebelumnya sempat pakai guard `fromCache`-only lalu debounce 1,5 dtk — keduanya masih memunculkan flash, jadi diganti pendekatan ini.
- **In-app browser Instagram**: Firestore dipaksa `experimentalForceLongPolling` (`db.settings`) karena koneksi streaming WebChannel sering gagal di WKWebView Instagram/Facebook → data tak muncul sampai refresh. Long-polling lebih andal di in-app browser & proxy ketat.
- **Filter lokasi**: 39 wilayah Indonesia dengan dropdown kecamatan (hardcoded). Daerah yang punya 2 tingkat administrasi bernama sama dipisah jadi dua entri, mis. "Bogor (Kota)" & "Bogor (Kabupaten)" — berlaku untuk Bogor, Bekasi, Tangerang, Bandung, Semarang, Malang, Cirebon (masing-masing dengan daftar kecamatan resmi lengkap). Kabupaten tanpa kota kembar (Karawang, Ponorogo, Banyumas, Indramayu) ditulis polos tanpa akhiran; kecamatan Purwokerto (4 kecamatan) ada di bawah "Banyumas". Dropdown kecamatan disembunyikan sampai kota dipilih. Ada opsi khusus **"Others"** (konstanta `NOLOC`) untuk QRIS yang tempatnya tidak diketahui — label "Others" dipilih user karena terasa lebih sopan daripada "Tanpa lokasi": muncul di form upload & edit sebagai "❓ Others — lokasi tidak diketahui", disimpan sebagai teks kota biasa (lolos rules tanpa perubahan), dan di filter selalu tampil paling bawah dengan ikon ❓; teks count/empty-state punya kalimat khusus ("X QRIS di Others").
- **Alur upload 4 langkah**: identitas/kategori → lokasi → foto QRIS → foto pendukung (opsional).
- **Sistem approval**: upload masuk sebagai `status: pending`, hanya tampil di galeri publik setelah admin approve. Galeri publik query `.where('status','==','approved')`; panel admin pending query `.where('status','==','pending')`.
- **Keamanan (arsitektur terbaru)**: sudah pindah dari PIN client-side ke **Firebase Authentication (email/password)** + **Firestore Security Rules**. Rules: publik boleh read + create (hanya `pending`, dengan validasi field & batas ukuran); approve/delete hanya untuk admin yang terautentikasi. Sudah ada file pendamping `firestore.rules` dan panduan `CARA-PASANG-KEAMANAN.md`.
- **Panel admin**: statistik live (jumlah pending, jumlah approved, jumlah kota tercakup) + CTA "tinjau sekarang".
- **Pencarian teks**: kotak cari di header (`#fSearch`) yang memfilter lewat nama, kota, kecamatan, & alamat sekaligus. Bekerja bareng filter kategori/kota, dan juga di antrean pending (bantu admin cari 1 titipan). Punya tombol clear, state kosong khusus ("🔍 Tidak ada hasil untuk …"), dan count kontekstual ("X hasil untuk …"). Ditambahkan agar tampilan tetap user-friendly saat isi mencapai ~100 QRIS.
- **Edit entri (admin)**: admin bisa memperbaiki typo/data lewat sheet `#eSheet` — field nama, kategori, kota, kecamatan, alamat (gambar QRIS & status TIDAK bisa diubah di sini). Dua titik masuk: tombol "✏️ Perbaiki data" di detail sheet, dan tombol "✏ Edit" di kartu approved. Fungsi `window.editEntry(id)` + `#eSave`. **Wajib sinkron dengan `firestore.rules`**: rule `update` kini punya 2 cabang — (a) setujui (`status`→`approved`), (b) perbaiki data (hanya 5 field teks, dengan validasi seperti create; `dataUrl`/`photoUrl`/`status`/`uploadedAt` immutable).
- **Bypass admin (TESTING)**: hanya aktif saat `LIVE=false` — tombol/link Admin langsung masuk mode admin tanpa login, dan approve/tolak/hapus/edit bekerja di data demo lokal. Ditandai komentar `BYPASS testing` di kode. Karena config asli sudah terpasang (`LIVE=true`), bypass ini sekarang **nonaktif** di produksi; tetap sebaiknya dihapus dari kode suatu saat.
- **Hubungi kami (WhatsApp)**: tombol pill kecil "💬 Hubungi kami" (`#waBtn`) di footer bawah daftar → buka `wa.me` dengan pesan awal. Nomor di konstanta `WA_NUMBER` (format `62xxx`, tanpa `+`/`0`) — sudah diisi nomor pengurus asli. Helper: `waLink(text)` + `hubungiWA(text)` (bisa dipakai ulang mis. untuk "laporkan QRIS ini").
- **Entry admin pindah ke footer**: tombol "🔑 Admin" di header dihapus (99% pengunjung bukan pengurus). Sekarang link kecil "Masuk sebagai pengurus" (`#adminBtn`, class `.admin-link`) di footer, di bawah tombol WA. Saat aktif berubah jadi "🔓 Keluar mode pengurus"; panel admin di atas tetap punya tombol Keluar.
- **Paginasi list**: render 30 kartu dulu (`PAGE=30`), lalu tombol "Tampilkan X lainnya" (`.more`, `window.showMore()`). Counter `shown` di-reset otomatis tiap kombinasi filter/pencarian berubah (dilacak via `lastKey`). Count di atas tetap menghitung total hasil.
- **Safe-area iOS**: header pakai `padding-top: calc(14px + var(--safe-t))` dengan `--safe-t: env(safe-area-inset-top)` supaya tidak ketutupan Dynamic Island/notch. Ada simulasi kecil: jika halaman berjalan di dalam iframe (`self !== top`, yakni pratinjau), `--safe-t`/`--safe-b` di-set manual 59px/24px — aman untuk produksi karena di tab/HP asli kondisi ini tidak terpenuhi.
- **Bugfix penting**: `.toast` diberi `pointer-events:none`. Sebelumnya toast tersembunyi (opacity 0) tetap menangkap klik dan menutupi tombol footer sheet di layar sempit → "Simpan perubahan"/"Batal"/"Lanjut" tidak bisa diklik.
- **Data demo**: 35 sampel bervariasi (32 approved + 3 pending) — semua kategori, termasuk kota di luar daftar (Purwokerto) untuk menguji jalur "Kota lainnya", entri "Others" (lokasi tidak diketahui), entri tanpa alamat/kecamatan, dan tanggal menyebar.
- **Persistence**: `firebaseConfig` asli sudah terpasang → `LIVE=true`, data dari Firestore (`listen()`/`db.collection("qris")`). Situs sudah di-deploy ke Firebase Hosting. Mode demo (array `items` di-seed dari konstanta `DEMO`) hanya aktif kalau config kembali jadi placeholder — kode & data demo masih ada di file sebagai fallback pengembangan.

> Catatan: dokumen `rangkuman-proyek-galeri-qris.md` versi lama masih menyebut PIN admin `888999` (client-side). Itu sudah **digantikan** oleh Firebase Auth + Firestore Rules di atas. Anggap PIN sudah usang.

## Yang Perlu Dilanjutkan

- [x] `firebaseConfig` asli sudah terpasang di kode (project `wadahqris`) → `LIVE=true`, kode memakai Firestore; bypass admin & data demo otomatis nonaktif.
- [x] `WA_NUMBER` sudah diisi nomor pengurus asli.
- [x] Deploy ke Firebase Hosting sudah dilakukan (HTML jadi `public/index.html`; update = `firebase deploy --only hosting`).
- [ ] Pasang custom domain di Firebase Hosting (atur DNS TXT + A record di provider domain — opsi yang disebut: Niagahoster/Rumahweb).
- [ ] (Nanti) Pertimbangkan notifikasi admin saat ada upload baru menunggu (mis. email via Firebase Functions, atau cek manual berkala).
- [x] (Skala ~100+ QRIS) Isu "onSnapshot menyeret semua base64" **sudah diatasi** — tapi **bukan** lewat Firebase Storage seperti rencana lama, melainkan **memisah gambar ke koleksi Firestore `qris_media`** yang di-fetch hanya saat detail dibuka. Alasan memilih ini daripada Storage: keamanan tetap pola yang sama (tidak perlu mengizinkan tulis publik ke Storage yang rawan spam/file sampah tanpa moderasi), kode unduh/bagikan tak berubah (tetap base64), dan tetap satu model rules. List kini hanya memuat teks. Lihat "Struktur data — dua koleksi". (Kalau kelak butuh Storage sungguhan mis. untuk gambar >1MB atau CDN, itu migrasi terpisah.)

## Menambah kota / kecamatan

Semua wilayah ada di satu objek `const WILAYAH = { "Kota":["Kecamatan", …] }` di `<script>`. Tambah kota = satu baris baru (sebelum `"Lainnya":[]`); tambah kecamatan = tambah item di array kota. Dropdown filter, form upload, dan form edit semua membaca objek ini — tidak ada tempat lain yang perlu diubah. Penulisan harus konsisten persis (kapital & spasi) karena filter mencocokkan teks. Kota di luar daftar tetap tertangani lewat opsi "Kota lainnya…".

## Keputusan Penting & Prinsip

- Thumbnail QR tidak bermakna di list → pola yang benar: kartu text-first, QR reveal-on-detail.
- Sistem admin berbasis PIN dengan secret di client fundamental tidak aman → arsitektur benar = server-side auth + Firestore Rules.
- **Tidak** bisa melacak nominal donasi hanya dari gambar QRIS → butuh payment gateway terpisah dengan arsitektur berbeda (belum feasible sekarang, dicatat sebagai pertimbangan masa depan).
- **Ditolak user**: auto-validasi checksum/format QR (jsQR + cek CRC) → verifikasi keaktifan QRIS dilakukan **manual** oleh admin (scan sendiri pakai e-wallet sebelum approve).
- **Ditolak user**: OneDrive sebagai database (butuh login Microsoft, tidak ada query/filter, rawan race condition).
- SVG hasil AI (koordinat) tidak bisa menyamai kualitas kurva tool vektor profesional → untuk logo pakai AI image generator atau tool profesional.

## File Proyek

- `wadahqris.html` — file HTML tunggal, satu-satunya file aplikasi (HTML + CSS + JS + logo base64 jadi satu). `firebaseConfig` dan `WA_NUMBER` sudah terisi nilai produksi. **Ini file inti proyek** — semua tampilan, warna, komponen, dan logika ada di sini. Untuk kerja desain/UI, file inilah yang dibawa. Inilah satu-satunya file yang di-deploy ke Hosting (jadi `public/index.html`).
- `wadahqris-mobile.html` — halaman pratinjau: bingkai iPhone 15 Pro (Dynamic Island, home indicator) yang memuat `wadahqris.html` via iframe. **Alat bantu desain saja — jangan ikut di-deploy.**
- `wadahqris.backup-YYYYMMDD.html` — salinan cadangan bertanggal (mis. sebelum perubahan besar). Bukan file kerja.
- `firestore.rules` — Firestore Security Rules. Harus sinkron dengan logika di `wadahqris.html` (mis. rule `update` mengizinkan setujui + perbaiki data). Kini ada **dua blok**: `qris` (teks; create publik pending, tanpa field gambar) dan `qris_media` (gambar; create publik dengan batas ukuran/tipe, read hanya bila entri induk approved via `get()`, immutable, delete admin).
- `CARA-PASANG-KEAMANAN.md` — panduan setup keamanan (Firebase Auth + Rules).
