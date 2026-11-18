// Bot Capsa Banting: 3 level (Mudah / Sedang / Sulit). Murni; hanya membaca yang boleh diketahui kursinya sendiri:
// tangan sendiri, jumlah kartu lawan, kartu yang sudah keluar. Tidak pernah mengintip tangan lawan.
// Keputusan bisa diulang: semua acak dari `rnd` (RNG berseed) yang diberikan pemanggil.
//
// - Mudah : keluarkan kartu/kombinasi terendah yang bisa dimainkan (memimpin = kartu terendah).
// - Sedang: susun tangan jadi kombinasi (5 kartu, tris, pasang, satu), simpan kartu 2 & kombinasi kuat; tapi kalau ada lawan tinggal
//           sedikit kartunya, kartu 2 segera dibuang (tiap kartu 2 yang tersisa = denda +4).
// - Sulit : Sedang + utamakan turun dari 5 → 4 dan 9 → 8 kartu (menghindari lompatan pengali), dan menghadang lawan yang hampir habis.
import { rankOf, counts, R2 } from './cards.js';
import { allMoves, legalMoves, FIVE } from './combos.js';
import { mustLead, prevCombo, multOf } from './game.js';

export const LEVELS = { easy: 'Mudah', normal: 'Sedang', hard: 'Sulit' };
export const DEFAULT_LEVEL = 'normal';
export const validLevel = (v) => Object.hasOwn(LEVELS, v);

const FEW = 5; // lawan dengan kartu segini atau kurang = "hampir habis" (hasil simulasi: 5 paling bagus)
const strongFive = (c) => c.n === 5 && FIVE.indexOf(c.type) >= 2; // full house ke atas
const hasTwo = (cards) => cards.some((c) => rankOf(c) === R2);

// ---------- susunan tangan ----------
/** Sisa kartu (tanpa kombinasi 5) dipecah per rank: tris, pasang, satu. -> { units, lowSingles } */
function groupsOf(cards) {
  const cnt = counts(cards);
  let units = 0, lowSingles = 0;
  for (let r = 0; r < 13; r++) {
    const c = cnt[r];
    if (!c) continue;
    if (c === 4) units += 2; // dua pasang
    else units += 1;
    if (c === 1 && r < 9) lowSingles++;
  }
  return { units, lowSingles };
}

const minus = (cards, take) => { const s = new Set(take); return cards.filter((c) => !s.has(c)); };

const baseCost = (cards) => {
  const g = groupsOf(cards);
  return g.units + g.lowSingles * 0.35 - cards.filter((c) => rankOf(c) === R2).length * 0.4;
};

/** Calon kombinasi 5 kartu dari tangan (dipangkas: yang paling membantu susunan dulu, maks 24) — dihitung sekali per keputusan. */
export function fiveCandidates(hand, rules) {
  if (hand.length < 5) return [];
  return allMoves(hand, rules, 5)
    .map((f) => ({ set: new Set(f.cards), cards: f.cards, bonus: strongFive(f.combo) ? 0.3 : 0, v: baseCost(minus(hand, f.cards)) }))
    .sort((a, b) => a.v - b.v)
    .slice(0, 24);
}

/**
 * Nilai susunan terbaik dari kartu `cards`: perkiraan berapa kali harus "jalan" untuk habis (lebih kecil = lebih bagus).
 * Memakai 0–2 kombinasi 5 kartu dari `fives` (calon dari tangan penuh yang masih utuh di `cards`), sisanya per rank.
 */
export function planCost(cards, fives) {
  const has = new Set(cards);
  const ok = fives.filter((f) => f.cards.every((c) => has.has(c)));
  let best = baseCost(cards);
  for (let i = 0; i < ok.length; i++) {
    const r1 = cards.filter((c) => !ok[i].set.has(c));
    best = Math.min(best, 1 - ok[i].bonus + baseCost(r1));
    if (r1.length < 5) continue;
    for (let j = i + 1; j < ok.length; j++) {
      if (ok[j].cards.some((c) => ok[i].set.has(c))) continue;
      best = Math.min(best, 2 - ok[i].bonus - ok[j].bonus + baseCost(r1.filter((c) => !ok[j].set.has(c))));
    }
  }
  return best;
}

function info(g, seat) {
  const N = g.rules.players;
  const n = g.hands.map((h) => h.length);
  const opps = [...Array(N).keys()].filter((s) => s !== seat);
  const minOpp = Math.min(...opps.map((s) => n[s]));
  const next = (seat + 1) % N;
  return { n, opps, minOpp, next, nextN: n[next] };
}

/** Langkah yang boleh sekarang (memperhatikan aturan 3♦ di langkah pertama). */
export function botMoves(g, seat) {
  const prev = prevCombo(g);
  let moves = legalMoves(g.hands[seat], prev, g.rules);
  if (g.first) moves = moves.filter((m) => m.cards.includes(g.rules.firstCard));
  return moves;
}

const lowFirst = (a, b) => a.combo.key - b.combo.key || a.cards.length - b.cards.length;

function chooseEasy(g, seat) {
  const moves = botMoves(g, seat);
  if (!moves.length) return null;
  if (mustLead(g)) {
    // memimpin: kartu terendah (langkah pertama: 3♦)
    const low = Math.min(...g.hands[seat]);
    return moves.find((m) => m.cards.length === 1 && m.cards[0] === low) || moves.sort(lowFirst)[0];
  }
  return moves.sort((a, b) => FIVE.indexOf(a.combo.type) - FIVE.indexOf(b.combo.type) || a.combo.key - b.combo.key)[0];
}

function chooseSmart(g, seat, hard, rnd) {
  const hand = g.hands[seat];
  const moves = botMoves(g, seat);
  if (!moves.length) return null;
  const lead = mustLead(g);
  const I = info(g, seat);
  const danger = I.minOpp <= FEW; // ada lawan hampir habis
  const finisher = moves.find((m) => m.cards.length === hand.length);
  if (finisher) return finisher;
  const fives = fiveCandidates(hand, g.rules);
  const now = planCost(hand, fives);
  const N = hand.length;

  const score = (m) => {
    const rest = minus(hand, m.cards);
    let v = planCost(rest, fives) - now; // < 0 = langkah yang memang bagian dari susunan
    const c = m.combo;
    const twos = m.cards.filter((x) => rankOf(x) === R2).length;
    // nilai kartu yang dikeluarkan: kartu kecil dulu
    v += (c.n === 5 ? FIVE.indexOf(c.type) * 0.15 + (c.key % 52) * 0.004 : rankOf(m.cards.at(-1)) * 0.05);
    if (!danger) {
      if (twos) v += 1.1 * twos; // simpan kartu 2
      if (strongFive(c) && !lead) v += 0.6; // simpan kombinasi kuat untuk mengambil giliran nanti
    } else {
      // ada lawan hampir habis: kartu 2 di tangan = denda +4 tiap kartu → buang
      v -= 0.9 * twos;
      if (hard) v -= m.cards.length * 0.12; // kurangi kartu secepatnya
    }
    if (lead) {
      v -= m.cards.length * 0.08; // memimpin: buang banyak kartu sekaligus
      // lawan berikutnya tinggal 1 kartu: jangan memimpin satu kartu kecil
      if (I.nextN === 1 && c.n === 1) v += hard ? 2.5 - rankOf(m.cards[0]) * 0.15 : 1.2;
      if (hard && I.minOpp === 1 && c.n === 1) v += 0.8;
      if (hard && I.minOpp === 2 && c.n === 2) v += 1;
    }
    if (hard) {
      // lompatan pengali: 13→12, 9→8, 5→4 kartu
      const before = multOf(N, g.rules), after = multOf(rest.length, g.rules);
      if (after < before) v -= 0.9;
    }
    return v;
  };

  let best = null, bestV = Infinity;
  for (const m of moves) {
    const v = score(m);
    if (v < bestV) { bestV = v; best = m; }
  }
  if (lead) return best;

  // ikut atau pass?
  let passV = 0.45; // pass = kehilangan tempo sedikit
  if (danger) passV += hard ? 3 : 1.4; // lawan hampir habis: hadang
  const lastBy = g.trick.last?.seat;
  if (hard && lastBy !== undefined && I.n[lastBy] <= 2) passV += 2; // yang barusan main hampir habis: wajib dihadang
  if (hard && multOf(N, g.rules) > multOf(N - best.cards.length, g.rules)) passV += 0.8; // bisa turun pengali
  if (!hard && rnd() < 0.03) return null; // Sedang sesekali "lupa"
  return bestV <= passV ? best : null;
}

/**
 * Aksi bot untuk kursi `seat` (giliran sendiri). level: 'easy' | 'normal' | 'hard'. rnd: RNG berseed.
 * -> { t:'play', cards } | { t:'pass' }
 */
export function botAction(g, seat, level = DEFAULT_LEVEL, rnd = Math.random) {
  if (g.phase !== 'play') return null;
  if (!validLevel(level)) level = DEFAULT_LEVEL;
  const m = level === 'easy' ? chooseEasy(g, seat) : chooseSmart(g, seat, level === 'hard', rnd);
  if (m) return { t: 'play', cards: m.cards };
  if (mustLead(g)) return { t: 'play', cards: [lowestPlay(g, seat)] }; // pengaman: memimpin tidak boleh pass
  return { t: 'pass' };
}

/** Kartu terendah yang sah untuk memimpin (langkah pertama = 3♦). */
const lowestPlay = (g, seat) => (g.first ? g.rules.firstCard : Math.min(...g.hands[seat]));

/** Waktu habis: mengikuti = pass; memimpin = kartu terendah (langkah pertama = 3♦). */
export function timeoutAction(g, seat) {
  if (!mustLead(g)) return { t: 'pass' };
  return { t: 'play', cards: [lowestPlay(g, seat)] };
}

/**
 * Saran untuk pemain (tombol "Saran"): daftar langkah dari yang paling disarankan. Indeks berputar tiap ditekan.
 * Yang pertama = pilihan bot Sulit, lalu sisanya urut dari terkecil (kombinasi 5 kartu kuat paling akhir).
 */
export function hints(g, seat) {
  if (g.phase !== 'play' || g.turn !== seat) return [];
  const moves = botMoves(g, seat).sort((a, b) => (a.combo.n === 5 ? FIVE.indexOf(a.combo.type) * 100 : 0) + a.combo.key
    - ((b.combo.n === 5 ? FIVE.indexOf(b.combo.type) * 100 : 0) + b.combo.key));
  const pick = chooseSmart(g, seat, true, () => 0.5);
  const out = [];
  const seen = new Set();
  for (const m of pick ? [pick, ...moves] : moves) {
    const k = m.cards.join();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m.cards);
  }
  return out;
}

export { hasTwo };
