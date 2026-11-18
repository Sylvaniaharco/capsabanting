// SEMUA aturan Capsa Banting (versi Teddy) ada di sini. Ubah angka/flag di file ini saja — engine, bot, dan server membacanya.
// Setelah mengubah aturan: jalankan `npm test` (tes membaca config ini) dan update README bagian "Aturan".
// Catatan: hitungan poin Ranked juga dihitung ulang di server akun (repo games-mahjong0hk, worker/banting.js) — ubah poin = ubah di sana juga.

export const RULES = Object.freeze({
  players: 4,
  handSize: 13,

  // ---------- urutan ----------
  // Rank: 0 = "3" … 11 = "A", 12 = "2" (tertinggi). Bunga: 0 ♦ wajik < 1 ♣ keriting < 2 ♥ hati < 3 ♠ sekop.

  // ---------- straight ----------
  // Urutan rank yang boleh membentuk straight: 5 rank BERURUTAN di daftar ini = straight; kartu penentunya = rank paling kanan.
  // Default aturan Teddy: 3..A, kartu 2 tidak boleh, tidak memutar (terendah 3-4-5-6-7, tertinggi 10-J-Q-K-A).
  // Contoh varian: [0..12] = 2 boleh di ujung atas (J-Q-K-A-2 tertinggi);
  //                [11, 12, 0, 1, ..., 10] = memutar (A-2-3-4-5 terendah) — kartu penentu tetap kartu paling kanan.
  straightOrder: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),

  // ---------- jalan pertama ----------
  firstCard: 0, // 3♦: di ronde PERTAMA meja, pemegangnya jalan pertama dan kartu pertama wajib mengandung kartu ini (null = bebas)
  winnerLeads: true, // ronde berikutnya: pemenang ronde sebelumnya jalan duluan, bebas (tanpa kewajiban 3♦). false = pemegang 3♦ tiap ronde

  // ---------- kasih menang (aturan rumah Teddy) ----------
  // Pemain sesudahmu tinggal 1 kartu & putaran satu-satuan: kamu wajib keluarkan kartu TERTINGGI-mu. Kalau kamu keluarkan kartu satu yang
  // lebih kecil, atau pass padahal kartu tertinggimu bisa menutup, lalu dia langsung habis → kamu bayar poin semua yang kalah.
  payAll: true,

  // ---------- poin (aturan rumah Teddy) ----------
  // Tiap pemain kalah: poin = sisa kartu × pengali + jumlah kartu 2 yang tersisa × twoBonus (bonus TIDAK ikut dikali).
  // Pengali dari sisa kartu: tier pertama yang `max`-nya >= sisa kartu.
  multTiers: Object.freeze([
    Object.freeze({ max: 4, x: 1 }),
    Object.freeze({ max: 8, x: 2 }),
    Object.freeze({ max: 12, x: 3 }),
    Object.freeze({ max: 13, x: 4 }),
  ]),
  twoBonus: 4,

  // ---------- waktu (online & latihan) ----------
  turnSeconds: 20,
});

/** Gabungkan perubahan aturan (mis. untuk tes) tanpa mengubah default. */
export function makeRules(over = {}) {
  return Object.freeze({ ...RULES, ...over });
}
