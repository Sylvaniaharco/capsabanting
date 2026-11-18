# capsabanting — "Capsa Banting Kung2"

Capsa Banting (Big Two aturan rumah) 4 pemain di browser: lawan 3 bot (Latihan atau meja koin HP 5/10/20), meja bareng teman (kode, tanpa rating),
atau Ranked (akun & koin bersama, meja 5/10/20, rating Capsa Banting sendiri). Repo GitHub `Sylvaniaharco/capsabanting`, Worker Cloudflare
`capsa-banting`, live di https://sylvaniaharco.com/games/capsabanting/. Saudara dari games-mahjong0hk, capsa, dan landlord (Doudizhu) —
pola, tampilan, dan akun sama (dibangun dari pola repo landlord). README menjelaskan aturan & config.

## Cara kerja dengan Teddy (pemilik)

- Bahasa: Indonesia santai, to the point. Campur Inggris boleh.
- Langsung eksekusi pakai asumsi terbaik; sebut asumsinya singkat. Tanya hanya kalau benar-benar krusial.
- Hasil dulu, penjelasan singkat. Jangan over-engineering; kalau sesuatu gak perlu, bilang.
- Kalau nemu masalah (bug, risiko keamanan, data janggal), langsung kasih tahu walau gak ditanya.
- Semua kerja masuk GitHub (repo ini), bukan file lepas.

## Stack & deploy

- Frontend HTML/JS/CSS murni (ES modules), tanpa framework/bundler/dependensi npm. Backend: Worker `capsa-banting` (`worker/index.js`, API di
  `/games/capsabanting/api/*`) + Durable Object `BantingRoom` (satu per meja, SQLite bawaan) dan `BantingLobby` (satu global: pencari meja Ranked,
  antrean per meja taruhan). Tanpa D1.
- Akun & koin ada di Worker Mahjong. Ranked memanggilnya lewat service binding `MAHJONG` → entrypoint `CapsaBantingGate` (`redeem` tiket →
  id/nama/saldo/rating, `settle` hasil ronde → koin + rating). Deploy gagal kalau Worker Mahjong belum punya `CapsaBantingGate`: perubahan di dua
  repo → merge Mahjong dulu.
- `npm run build` menyalin `index.html`, `manifest.webmanifest`, `css`, `src`, `avatars`, `icons` ke `dist/games/capsabanting/` + mengisi `sw.js`
  dan `version.json`. File/folder statis baru → daftarkan di `scripts/build.mjs`.
- Deploy otomatis Cloudflare dari `main` (build `npm run build`, deploy `npx wrangler deploy`). **Merge/push ke `main` = langsung live.**
  CI `.github/workflows/test.yml` (npm test + build) harus hijau sebelum merge. Migrasi DO: tambah tag baru, jangan ubah yang lama.
  `name` di `wrangler.jsonc` harus tetap `capsa-banting`. Route `sylvaniaharco.com/games/capsabanting*` (lebih spesifik dari route Capsa).
- Izin tetap dari Teddy (sama dengan repo lain): setelah selesai, buat PR dan squash-merge ke `main` tanpa tanya, asal `npm test` lolos
  dan CI hijau; kabari Teddy nomor PR + isinya. Kalau branch kerja sudah pernah di-squash-merge, mulai lagi dari `origin/main`.

## Perintah

```bash
npm test            # node --test test/*.test.js (±40 tes, termasuk 600 ronde bot vs bot)
npm run sim         # 3000 ronde bot vs bot + statistik
npm run dev         # static :8080 (lawan bot saja)
npm run dev:online  # build + wrangler dev (meja teman). Ranked lokal: lihat README
```

## Aturan kode

- `src/engine/` murni (tanpa DOM), dipakai browser, Node, dan Worker. Jangan pakai `Math.random()` di engine; pakai `mulberry32`/`mixSeed`.
- **Semua angka aturan di `src/engine/rules.config.js`** (urutan straight, kartu pertama 3♦, pengali sisa kartu, bonus kartu 2, waktu giliran).
  Ubah aturan → update README + tes (`test/combos.test.js`, `test/game.test.js`). **Poin juga dihitung ulang di server akun**
  (repo games-mahjong0hk `worker/banting.js`, `bantingPoints`) — ubah rumus poin = ubah di sana juga, kalau tidak settle Ranked ditolak/beda.
- Kartu = 0..51 (`rank*4 + suit`, 3♦ = 0, 2♠ = 51), jadi angka kartu = nilainya untuk satu kartu. `combos.js`: `classify` (jenis + `key`),
  `beats` (jumlah kartu sama; 5 kartu: jenis dulu baru `key`), `allMoves` (dipangkas, untuk bot & Saran; pemain boleh kombinasi sah apa pun).
- `game.js`: satu ronde (state deterministik dari seed + urutan aksi, `applyAction`, `checkPlay`, `viewFor`, `scoreHands`). Pass tidak mengunci;
  `trick.passes` = jumlah pass sejak langkah terakhir, 3 pass → putaran baru. `viewFor` tidak boleh memuat tangan lawan atau seed.
- `room.js`: logika meja murni untuk tiga jenis meja (`friends`, `ranked`, `practice`). `worker/room.js` hanya penyimpanan + WebSocket + alarm
  (`R.due` / `R.step`); lawan bot (`src/net/local.js`) memakai fungsi yang sama di HP. Server memvalidasi semua aksi (`R.act` → `applyAction`).
  `seat.id` (id HP / kunci kursi Ranked), `seat.userId`, dan saldo orang lain **tidak pernah** masuk `viewFor`.
- Ranked: hasil tiap ronde → `settlePayload` (`left` & `twos` per kursi, tanpa poin) → `env.MAHJONG.settle` (aman diulang; gagal → coba lagi
  lewat alarm, setelah 8x ronde dianggap tanpa koin). Bentuk payload harus cocok dengan `cleanBantingSettle` di repo games-mahjong0hk.
  Kursi yang dipesan tapi tidak pernah tersambung dihitung kabur setelah `ABANDON_MS` (`offSince` diisi saat `reserve`).
- **Dua saldo** (pola Doudizhu/Capsa): koin akun (server, bersama semua game) hanya bergerak di Ranked; koin meja bot (`cbt-wallet` di
  localStorage, tidak bisa dipercaya) hanya untuk lawan bot, dibayar di `practiceCoins` (`src/main.js`), ronde ditinggal dihitung kalah lewat
  `cbt-pending`. Koin akun **tidak boleh** berubah dari permainan lawan bot atau dari angka yang dihitung di HP.
- Bot (`bot.js`) hanya boleh membaca tangan sendiri + info publik (jumlah kartu, kartu keluar). Tes `bot tidak mengintip` menjaga ini.
  Bot di server: Ranked = Sulit, meja teman = level pilihan pembuat meja, kursi yang keluar/putus = Sedang/Sulit. Bot dijalankan di alarm DO:
  jaga tetap murah (±1 ms per langkah; `fiveCandidates` dibatasi 24).
- Teks UI bahasa Indonesia lewat `tx('...')` (atau `data-t` di HTML); terjemahan English di `src/ui/lang-en.js`, dicek `test/i18n.test.js`.
- Akun: `src/ui/account.js` memanggil API Mahjong dari origin yang sama (`/me` termasuk saldo, `/config`, `/auth/logout`, `/auth/ticket`,
  `/errors` mode `capsabanting`, `/capsabanting/leaderboard`, `/capsabanting/me`). Login `?next=capsabanting`. Aktif hanya dari `/games/capsabanting/`.
- Bot = karakter Mahjong Kung2 (`src/engine/roster.js` + `avatars/` disalin dari repo landlord/capsa/mahjong). Avatar pemain ikut `hkmj-settings-v1`.

## UI yang perlu diingat

- Ukuran dari `--vw`/`--vh` (`fit()` di `src/main.js`), kelas `.portrait` kalau layar tegak; di portrait tangan jadi 2 baris (`.hand.rows`) dan
  kolom Pengali & Kartu 2 di tabel hasil disembunyikan (`.c-x`, rinciannya ada di bawah angka poin). Cek di HP landscape (915×412) dan
  portrait (412×915) sebelum merge.
- Kursi tampilan: 0 = saya (bawah), 1 = kanan (giliran berikutnya), 2 = atas, 3 = kiri (`toSeat`). Efek dipicu dari `game.log` (id naik terus
  per ronde) di `playEffects`.
- `manifest.webmanifest`: jangan pakai `"orientation": "landscape"` / `display: fullscreen`, jangan ganti `id` (pengalaman di Mahjong/Capsa).
- Ikon: sumbernya `icons/icon.svg`; PNG dibuat `node scripts/icons.cjs` (butuh Playwright, hanya kalau desain berubah) dan ikut di-commit.
