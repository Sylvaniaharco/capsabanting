// Kombinasi kartu Capsa Banting: kenali jenis, bandingkan, dan buat daftar langkah yang sah. Murni (tanpa DOM).
// Kombinasi = { type, n, key }:
//   type  jenis (lihat TYPES), n = jumlah kartu (1 / 2 / 3 / 5), key = angka pembanding di dalam jenis yang sama (lebih besar = lebih kuat).
// Mengikuti = jumlah kartu sama dan nilainya lebih tinggi. Kombinasi 5 kartu: jenis yang lebih tinggi selalu menang
// (straight < flush < full house < four of a kind + 1 < straight flush); jenis sama → key.
import { RULES } from './rules.config.js';
import { rankOf, suitOf, counts } from './cards.js';

export const TYPES = ['single', 'pair', 'triple', 'straight', 'flush', 'fullhouse', 'quad', 'straightflush'];
export const FIVE = ['straight', 'flush', 'fullhouse', 'quad', 'straightflush'];
export const TYPE_NAMES = {
  single: 'Satu', pair: 'Pasang', triple: 'Tris', straight: 'Straight', flush: 'Flush', fullhouse: 'Full house',
  quad: 'Four of a kind', straightflush: 'Straight flush',
};

/**
 * Posisi straight: kartu-kartu (rank berbeda semua) membentuk 5 posisi berurutan di rules.straightOrder?
 * -> indeks posisi kartu teratas (penentu) atau -1.
 */
function straightTop(cards, order) {
  const pos = cards.map((c) => order.indexOf(rankOf(c)));
  if (pos.some((p) => p < 0)) return -1;
  pos.sort((a, b) => a - b);
  for (let i = 1; i < pos.length; i++) if (pos[i] !== pos[0] + i) return -1;
  return pos.at(-1);
}

/** Jenis kombinasi dari sekumpulan kartu (sudah dicek tidak dobel), atau null kalau tidak sah. */
export function classify(cards, rules = RULES) {
  const n = cards.length;
  if (!n) return null;
  const max = Math.max(...cards);
  if (n === 1) return { type: 'single', n, key: cards[0] };
  const cnt = counts(cards);
  const ranks = cnt.map((c, r) => (c ? r : -1)).filter((r) => r >= 0);
  if (n === 2 || n === 3) return ranks.length === 1 ? { type: n === 2 ? 'pair' : 'triple', n, key: max } : null;
  if (n !== 5) return null;
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  if (ranks.length === 5) {
    const top = straightTop(cards, rules.straightOrder);
    if (top >= 0) {
      const topCard = cards.find((c) => rankOf(c) === rules.straightOrder[top]);
      const key = top * 4 + suitOf(topCard); // kartu tertinggi, kalau sama lihat bunganya
      return { type: flush ? 'straightflush' : 'straight', n, key };
    }
  }
  if (flush) return { type: 'flush', n, key: max }; // kartu tertinggi, kalau sama lihat bunganya
  if (ranks.length === 2) {
    const big = ranks.find((r) => cnt[r] >= 3);
    if (cnt[big] === 4) return { type: 'quad', n, key: big };
    return { type: 'fullhouse', n, key: big };
  }
  return null;
}

/** Peringkat jenis untuk perbandingan: kombinasi 5 kartu memakai urutan FIVE. */
const tier = (c) => (c.n === 5 ? FIVE.indexOf(c.type) : 0);

/** Apakah kombinasi `c` mengalahkan `prev`? (jumlah kartu harus sama) */
export function beats(c, prev) {
  if (!prev) return true;
  if (!c || c.n !== prev.n) return false;
  if (tier(c) !== tier(prev)) return tier(c) > tier(prev);
  return c.key > prev.key;
}

/** Kartu `cards` semuanya ada di `hand` dan tidak dobel? */
export function owns(hand, cards) {
  if (!Array.isArray(cards) || !cards.length || cards.length > hand.length) return false;
  const set = new Set(hand);
  const seen = new Set();
  for (const c of cards) {
    if (!Number.isInteger(c) || !set.has(c) || seen.has(c)) return false;
    seen.add(c);
  }
  return true;
}

function choose(arr, k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push(acc.slice()); return out; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    choose(arr, k, i + 1, acc, out);
    acc.pop();
  }
  return out;
}

/**
 * Langkah yang mungkin dari tangan: [{ cards, combo }]. Satu/pasang/tris: semua pilihan bunga. Kombinasi 5 kartu: dipangkas supaya cepat
 * (straight: kartu terendah tiap rank kecuali kartu teratas yang dicoba semua bunganya; flush: tiap kartu teratas + 4 kartu terendah
 * sebunga; full house: tris + pasang terendah; four: + kartu pelengkap termurah) — cukup untuk bot & tombol Saran.
 * Pemain bebas mengeluarkan kombinasi sah apa pun (dicek classify), bukan hanya yang ada di daftar ini.
 */
export function allMoves(hand, rules = RULES, only = 0) {
  const by = Array.from({ length: 13 }, () => []);
  const bySuit = [[], [], [], []];
  for (const c of [...hand].sort((a, b) => a - b)) { by[rankOf(c)].push(c); bySuit[suitOf(c)].push(c); }
  const out = [];
  const seen = new Set();
  const push = (cards) => {
    const k = [...cards].sort((a, b) => a - b).join();
    if (seen.has(k)) return;
    seen.add(k);
    const combo = classify(cards, rules);
    if (combo) out.push({ cards: [...cards].sort((a, b) => a - b), combo });
  };
  const want = (n) => !only || only === n;
  for (let r = 0; r < 13; r++) {
    const g = by[r];
    if (want(1)) for (const c of g) push([c]);
    if (want(2)) for (const p of choose(g, 2)) push(p);
    if (want(3)) for (const t of choose(g, 3)) push(t);
  }
  if (!want(5) || hand.length < 5) return out;
  const order = rules.straightOrder;
  // straight (& straight flush kalau kebetulan sebunga)
  for (let s = 0; s + 4 < order.length; s++) {
    const rs = order.slice(s, s + 5);
    if (!rs.every((r) => by[r].length)) continue;
    const base = rs.slice(0, 4).map((r) => by[r][0]);
    for (const top of by[rs[4]]) push([...base, top]);
  }
  // straight flush & flush per bunga
  for (const suited of bySuit) {
    if (suited.length < 5) continue;
    const ranks = new Set(suited.map(rankOf));
    for (let s = 0; s + 4 < order.length; s++) {
      const rs = order.slice(s, s + 5);
      if (rs.every((r) => ranks.has(r))) push(rs.map((r) => suited.find((c) => rankOf(c) === r)));
    }
    for (let i = 4; i < suited.length; i++) push([...suited.slice(0, 4), suited[i]]);
  }
  // full house & four of a kind
  for (let r = 0; r < 13; r++) {
    if (by[r].length >= 3) {
      for (let p = 0; p < 13; p++) if (p !== r && by[p].length >= 2) push([...by[r].slice(0, 3), ...by[p].slice(0, 2)]);
    }
    if (by[r].length === 4) {
      const rest = hand.filter((c) => rankOf(c) !== r).sort((a, b) => a - b);
      const lone = rest.find((c) => by[rankOf(c)].length === 1);
      for (const k of [rest[0], lone]) if (k !== undefined) push([...by[r], k]);
    }
  }
  return out;
}

/** Langkah sah untuk mengikuti `prev` (atau semua langkah memimpin kalau prev null). */
export function legalMoves(hand, prev, rules = RULES) {
  const all = allMoves(hand, rules, prev ? prev.n : 0);
  return prev ? all.filter((m) => beats(m.combo, prev)) : all;
}
