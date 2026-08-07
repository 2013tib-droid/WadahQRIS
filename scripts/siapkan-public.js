/* Menyiapkan folder `public/` untuk Firebase Hosting.
 *
 * Firebase hanya mengunggah isi `public/` — dia tidak tahu apa-apa soal
 * `wadahqris.html`. Dulu penyalinan ini manual, dan sekali waktu terlewat:
 * deploy dilaporkan "berhasil" tapi situs menyajikan kode lama (counter
 * pengunjung mentok 0 berhari-hari). Sekarang dijalankan otomatis lewat
 * "predeploy" di firebase.json.
 *
 * Ditulis sebagai file skrip, bukan perintah satu baris di firebase.json,
 * supaya tidak bergantung pada shell: `mkdir -p`/`cp` tidak ada di cmd.exe
 * Windows, dan tanda kutip di `node -e "…"` diurai berbeda tiap shell.
 * Di sini firebase cukup men-spawn `node scripts/siapkan-public.js`.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sumber = path.join(root, "wadahqris.html");
const tujuan = path.join(root, "public", "index.html");

if (!fs.existsSync(sumber)) {
  console.error("Gagal: wadahqris.html tidak ditemukan di " + root);
  /* Sering terjadi di Windows: Explorer menyembunyikan ekstensi, jadi
     `wadahqris.html.txt` (hasil Ctrl+S, bukan "Download raw file") tampak
     bernama benar. Tunjukkan nama sebenarnya daripada menyuruh menebak. */
  const mirip = fs.readdirSync(root).filter(f => /wadahqris/i.test(f));
  if (mirip.length) {
    console.error("Yang ada di folder ini: " + mirip.join(", "));
    console.error("Ganti nama file yang benar menjadi persis `wadahqris.html`.");
  } else {
    console.error("Jalankan `firebase deploy` dari folder yang berisi firebase.json.");
  }
  process.exit(1);
}

/* Pemeriksaan kewarasan sebelum menyalin.
 *
 * Pernah terjadi: `wadahqris.html` ditimpa oleh isi balasan error dari
 * raw.githubusercontent.com (repo privat → badan respons "404: Not Found"
 * sepanjang belasan byte). Deploy tetap berjalan mulus dan situs produksi
 * berubah jadi tulisan "404: Not Found" — kegagalannya baru ketahuan dari
 * situs yang sudah live. Karena file aplikasi ini SELALU berukuran ratusan
 * KB dan selalu berupa halaman utuh, dua ciri itu cukup untuk menolak file
 * yang jelas bukan aplikasi, sebelum apa pun terunggah.
 */
const isi = fs.readFileSync(sumber, "utf8");
const MIN_KB = 50;
const masalah =
  isi.length < MIN_KB * 1024
    ? `ukurannya cuma ${Math.round(isi.length / 1024)} KB (aplikasi ini selalu >${MIN_KB} KB)`
    : !/<!DOCTYPE html>/i.test(isi)
    ? "tidak diawali <!DOCTYPE html>"
    : !isi.includes('id="list"')
    ? 'tidak berisi elemen daftar QRIS (id="list")'
    : null;

if (masalah) {
  console.error("Deploy DIBATALKAN: wadahqris.html " + masalah + ".");
  console.error("Isinya sekarang: " + JSON.stringify(isi.slice(0, 120)));
  console.error("");
  console.error("File aplikasi kemungkinan tertimpa. Pulihkan dari git:");
  console.error("  git fetch origin main");
  console.error("  git checkout origin/main -- wadahqris.html");
  process.exit(1);
}

fs.mkdirSync(path.dirname(tujuan), { recursive: true });
fs.copyFileSync(sumber, tujuan);

const kb = Math.round(fs.statSync(tujuan).size / 1024);
console.log(`wadahqris.html → public/index.html (${kb} KB)`);

/* Sisa file dari deploy lama tetap ikut terunggah dan bisa diakses lewat
   URL-nya. Bukan error, tapi pantas diingatkan sekali. */
const lain = fs.readdirSync(path.dirname(tujuan)).filter(f => f !== "index.html");
if (lain.length) {
  console.warn("Catatan: public/ juga berisi " + lain.join(", ") +
    " — file ini ikut ter-deploy. Hapus kalau tidak dipakai.");
}
