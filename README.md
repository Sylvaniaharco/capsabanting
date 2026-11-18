# Capsa Banting Kung2

Capsa Banting (Big Two versi rumah) 4 pemain di browser, satu keluarga dengan **Mahjong Kung2**, **Capsa Kung2**, dan **Doudizhu Kung2**
(akun, koin & tampilan sama). Live di **https://sylvaniaharco.com/games/capsabanting/** (Worker `capsa-banting`, repo ini).

- **Lawan 3 bot** (Mudah / Sedang / Sulit) — tanpa login, jalan di HP (juga offline). Meja **Latihan** (tanpa koin) atau meja koin
  **5 / 10 / 20** pakai koin meja bot di HP (saldo awal 1.000, minimal 100 / 5.000 / 10.000, reset ke 1.000 jam 00.01 WIB kalau bangkrut).
  Ronde bermeja koin yang ditinggal (keluar / app ditutup) dihitung kalah.
- **Main bareng teman** — buat meja, bagikan kode 5 huruf / link `…/games/capsabanting/#room=KODE`. Kursi kosong diisi bot. Tanpa rating & koin.
- **Ranked** — butuh login Google (akun bersama). Pilih meja **5 / 10 / 20 koin per poin** (koin akun yang sama dengan Mahjong, Capsa &
  Doudizhu). Pencari meja otomatis per meja; kalau 15 dtk belum ada lawan, kursi kosong diisi bot (🤖, level Sulit).
  Tiap ronde: koin = poin × meja (saldo tidak bisa di bawah 0, yang kabur tidak dapat untung), **bonus harian** 100 koin untuk Ranked
  pertama hari itu, dan rating Capsa Banting sendiri (Elo, tier Bronze → Master), papan peringkat & riwayat ronde.

## Aturan (versi Teddy)

52 kartu tanpa joker, 4 pemain × 13 kartu. Urutan angka 3 < 4 < … < K < A < 2; bunga ♦ wajik < ♣ keriting < ♥ hati < ♠ sekop.

- Ronde pertama meja: pemegang 3♦ jalan pertama, dan langkah pertama wajib mengandung 3♦. Ronde berikutnya: **pemenang ronde
  sebelumnya jalan duluan**, bebas (tidak wajib 3♦).
- Kombinasi: satu, pasang, tris, dan 5 kartu. Hanya bisa dilawan kombinasi dengan **jumlah kartu sama** dan nilai lebih tinggi.
- 5 kartu (rendah → tinggi): straight < flush < full house < four of a kind + 1 < straight flush. Jenis lebih tinggi selalu menang.
  - Straight & straight flush: kartu tertinggi, kalau sama lihat bunganya. Flush: kartu tertinggi, kalau sama lihat bunganya.
  - Full house: angka tris. Four: angka quad. Pasang & tris: angkanya, kalau sama bunga tertinggi.
- Straight: 2 tidak boleh, tidak memutar (terendah 3-4-5-6-7, tertinggi 10-J-Q-K-A). Bisa diubah lewat satu konstanta `straightOrder`.
- Pass boleh dan **tidak mengunci**: yang pass boleh main lagi saat gilirannya datang. Semua pemain lain pass → pemain terakhir yang main
  memimpin putaran baru dengan kombinasi bebas.
- Boleh menutup permainan pakai kartu 2. Ronde langsung selesai begitu ada yang habis kartunya.
- **Kasih menang = bayar semua:** kalau pemain sesudahmu tinggal 1 kartu dan putarannya satu kartu (atau kamu memimpin), kamu wajib
  keluarkan kartu **tertinggimu**. Kalau kamu keluarkan satu kartu yang lebih kecil, atau pass padahal kartu tertinggimu bisa menutup, lalu
  dia langsung habis, kamu membayar poin semua yang kalah (yang kalah lain 0). Memimpin pasang/tris/5 kartu tidak melanggar.

**Poin (aturan rumah Teddy).** Tiap pemain kalah: `sisa kartu × pengali + jumlah kartu 2 yang tersisa × 4` (bonus kartu 2 tidak dikali).
Pengali: sisa 1–4 = ×1, 5–8 = ×2, 9–12 = ×3, 13 = ×4. Pemenang menerima jumlah semua yang kalah (total 0). Contoh: sisa 4 dengan satu 2 = 8;
sisa 5 dengan satu 2 = 14; sisa 9 dengan dua 2 = 35; sisa 13 dengan empat 2 = 68; sisa 3 tanpa 2 = 3.
Layar akhir ronde menampilkan per pemain: sisa kartu, pengali, jumlah kartu 2 (+4 per kartu), poin, perubahan koin, dan total.

Keputusan yang diambil saat membuat (ubah di `src/engine/rules.config.js` kalau maunya lain):

- "Kasih menang" hanya untuk pemain tepat sebelum si pemenang dan hanya kalau pemenang habis di langkah berikutnya.
  Waktu habis / main otomatis selalu memilih langkah yang aman (tidak kena bayar semua).
- Four of a kind wajib + 1 kartu (bukan 4 kartu polos); four & straight flush tidak bisa melawan satu/pasang/tris (jumlah kartu harus sama).
- Selesai ronde, sisa kartu semua pemain dibuka.

### `src/engine/rules.config.js`

| Flag | Default | Arti |
| --- | --- | --- |
| `straightOrder` | `[3..A]` | urutan rank pembentuk straight (5 berurutan di daftar ini); tambah 2 / buat memutar di sini |
| `firstCard` | `0` (3♦) | ronde pertama: pemegangnya jalan pertama + langkah pertama wajib mengandung kartu ini (`null` = bebas) |
| `winnerLeads` | `true` | ronde berikutnya pemenang sebelumnya jalan duluan, bebas (`false` = pemegang 3♦ tiap ronde) |
| `payAll` | `true` | kasih menang = bayar semua |
| `multTiers` | 4/8/12/13 → ×1/×2/×3/×4 | pengali sisa kartu |
| `twoBonus` | 4 | tambahan per kartu 2 yang tersisa |
| `turnSeconds` | 20 | waktu giliran (online & lawan bot) |

Poin Ranked dihitung ulang di server akun (repo games-mahjong0hk `worker/banting.js`) — ubah poin di sini = ubah di sana juga.

## Bot

`src/engine/bot.js`, berjalan di server (meja online & Ranked) dan di HP (lawan bot, tombol Saran). Bot hanya membaca tangan sendiri,
jumlah kartu lawan, dan kartu yang sudah keluar (dites dengan menukar tangan lawan).

- **Mudah:** keluarkan kartu/kombinasi terendah yang bisa dimainkan (memimpin = kartu terendah).
- Sedang & Sulit tidak pernah "kasih menang" (kalau pemain sesudahnya tinggal 1 kartu: satu kartu = kartu tertinggi, tidak pass kalau bisa
  menutup). Mudah tidak memperhatikan ini.
- **Sedang:** menyusun tangan jadi kombinasi (maks 2 kombinasi 5 kartu + tris/pasang/satu), menyimpan kartu 2 & kombinasi kuat; kalau ada lawan
  tinggal ≤ 5 kartu, kartu 2 segera dibuang (denda +4 tiap kartu).
- **Sulit:** Sedang + utamakan turun dari 5→4, 9→8, 13→12 kartu (menghindari lompatan pengali), menghadang lawan yang hampir habis (tidak pass,
  tidak memimpin satu kartu kecil kalau lawan berikutnya tinggal 1).
- Simulasi 3000 ronde (`npm run sim`, ±0,9 ms/ronde): poin rata-rata Mudah −3,4 / Sedang +1,1 / Sulit +2,4 per ronde.

## Stack

Sama persis dengan Doudizhu: HTML/JS/CSS murni (ES modules), tanpa framework, tanpa bundler, tanpa dependensi npm.
Server: Cloudflare Worker `capsa-banting` + Durable Object (SQLite bawaan DO, **tanpa D1**):

| Bagian | File |
| --- | --- |
| Aturan (semua angka) | `src/engine/rules.config.js` |
| Kartu, kombinasi, satu ronde & skor | `src/engine/cards.js`, `combos.js`, `game.js` |
| Bot 3 level + Saran | `src/engine/bot.js` |
| Logika meja (teman, Ranked, lawan bot) | `src/engine/room.js` (murni, dites) |
| Koin (angka meja, dompet HP) | `src/engine/wallet.js` |
| Worker / DO meja / pencari meja Ranked | `worker/index.js`, `worker/room.js` (`BantingRoom`), `worker/lobby.js` (`BantingLobby`) |
| Klien | `src/main.js`, `src/net/online.js`, `src/net/local.js`, `src/ui/*` |

**Akun:** tidak ada sistem login baru. Halaman memanggil `/games/mahjonghk/api/me` (satu origin → cookie login `mjsid` ikut), login lewat
`/games/mahjonghk/api/auth/google?next=capsabanting`. Ranked: HP minta tiket sekali pakai (`POST /games/mahjonghk/api/auth/ticket`), Worker
Capsa Banting menukarnya lewat **service binding** `MAHJONG` → entrypoint `CapsaBantingGate` di Worker `games-mahjong0hk`. Koin & rating
tiap ronde diselesaikan di sana (`settle`, aman diulang; poin dihitung ulang dari sisa kartu, bukan dari angka kiriman).

## Main di lokal

```bash
npm test            # node --test test/*.test.js (kombinasi, poin, bot + 600 ronde simulasi, meja/Ranked, i18n, akun)
npm run sim         # 3000 ronde bot vs bot: cek langkah ilegal/macet + statistik
npm run dev         # python3 -m http.server 8080 → http://localhost:8080 (hanya lawan bot)
npm run dev:online  # build + wrangler dev (meja teman jalan; buka /games/capsabanting/)
```

Ranked lokal butuh Worker Mahjong ikut jalan: di repo games-mahjong0hk `npm run build && npx wrangler dev` (port 8787, `.dev.vars` berisi
`DEV_LOGIN=1`), di sini `npm run build && npx wrangler dev --port 8788 --inspector-port 9331` (binding `MAHJONG` harus `[connected]`), lalu
proxy satu origin (`/games/mahjonghk` → 8787, `/games/capsabanting` → 8788) dan login tes lewat
`/games/mahjonghk/api/auth/dev?name=Ani&next=capsabanting`.

## Deploy & variabel

- Cloudflare Workers & Pages → Import repository ini; build `npm run build`, deploy `npx wrangler deploy`, production branch `main`.
  **Merge/push ke `main` = langsung live.** Route `sylvaniaharco.com/games/capsabanting*` ada di `wrangler.jsonc` (lebih spesifik dari
  route Capsa `sylvaniaharco.com/games/capsa*`, jadi Cloudflare memakai Worker ini untuk alamat itu).
- **Tidak ada variabel/secret** untuk Worker ini. Service binding `MAHJONG` (→ `games-mahjong0hk`, entrypoint `CapsaBantingGate`) dan
  Durable Object ada di `wrangler.jsonc`. Worker Mahjong harus sudah ter-deploy dengan `CapsaBantingGate` sebelum Worker ini.
- Error JavaScript dari HP masuk dashboard admin Mahjong (bagian error, mode `capsabanting`).
