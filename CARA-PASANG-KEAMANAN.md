# Cara Pasang Keamanan WadahQRIS

Ada **3 hal** yang harus dikerjakan. Nomor 2 adalah yang benar-benar mengamankan — jangan dilewat.

---

## 1. Buat akun admin

1. Firebase Console → **Authentication** → tab **Sign-in method**
2. Aktifkan **Email/Password** → Save
3. Tab **Users** → **Add user**
4. Isi email dan kata sandi kamu → Add user

> Pakai kata sandi yang panjang (minimal 12 karakter). Ini satu-satunya kunci ke seluruh wadah.

5. Setelah akun jadi, **salin User UID**-nya (deretan huruf-angka di kolom kanan). Kamu butuh ini di langkah berikutnya.

**Tidak ada pendaftaran publik.** Orang lain tidak bisa bikin akun sendiri — hanya kamu yang bisa menambah user lewat Console.

---

## 2. Pasang Firestore Rules ← INI YANG PENTING

1. Buka file `firestore.rules`
2. Cari baris `'GANTI_DENGAN_UID_ADMIN'` → ganti dengan UID dari langkah 1
3. Firebase Console → **Firestore Database** → tab **Rules**
4. Hapus semua isinya, paste isi `firestore.rules`
5. Klik **Publish**

**Kenapa ini yang penting:** selama Rules kamu masih `allow read, write: if true` (mode test), siapa pun bisa buka console browser dan menghapus seluruh isi database — tanpa perlu menyentuh tombol apa pun di websitemu. Rules ini yang menutup lubang itu.

Setelah Publish, coba tes di console browser saat **belum login**:

```js
firebase.firestore().collection('qris').doc('ID_APAPUN').delete()
```

Harus muncul `permission-denied`. Kalau berhasil terhapus, berarti Rules belum aktif — ulangi langkah ini.

---

## 3. Isi config di HTML

Buka `wadahqris.html`, cari di bagian atas `<script>`:

```js
const firebaseConfig = {
  apiKey:"PASTE_API_KEY", ...
};
```

Ganti dengan config asli dari **Project Settings → Your apps → Web app**.

> **`apiKey` bukan rahasia.** Firebase memang mendesainnya untuk terpampang di kode publik. Yang menjaga datamu adalah Rules, bukan kunci ini. Jadi jangan panik melihatnya di View Source.

---

## Yang sekarang dijaga server (bukan cuma disembunyikan di browser)

| Serangan | Hasil |
|---|---|
| Ketik `isAdmin = true` di console | Tombol muncul, tapi **setiap klik ditolak server** |
| Delete lewat Firestore API langsung | `permission-denied` |
| Approve QRIS sendiri lewat console | `permission-denied` |
| Upload langsung `status: "approved"` | `permission-denied` — dipaksa `pending` |
| Baca antrean pending orang lain | `permission-denied` |
| Upload file 50MB untuk habiskan kuota | Ditolak — batas 400KB |
| Upload data sampah / field aneh | Ditolak — hanya 9 field yang diizinkan |
| Admin nakal menukar gambar QRIS diam-diam | Ditolak — update hanya boleh ubah `status` |

---

## Yang masih terbuka (dan memang disengaja)

**Upload tetap bebas untuk publik** — itu inti aplikasinya. Artinya orang masih bisa spam antrean `pending` dengan gambar sampah. Yang aman adalah **apa yang tayang**, karena hanya kamu yang bisa menyetujui.

Kalau nanti spam jadi masalah, opsinya:
- **App Check** (reCAPTCHA) — memblokir bot, gratis, paling mudah dipasang
- **Cloud Functions** dengan rate limit per IP
- Wajib login Google untuk upload — tapi ini mengurangi jumlah orang yang mau berbagi

Belum perlu sekarang. Pasang kalau sudah terasa.

---

## Kalau lupa kata sandi

Firebase Console → Authentication → Users → klik titik tiga di baris akunmu → **Reset password**.
