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
