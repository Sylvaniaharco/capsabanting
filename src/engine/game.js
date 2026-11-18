// Satu ronde Capsa Banting: bagi 13 kartu ke 4 pemain → pemegang 3♦ jalan pertama → main sampai ada yang habis → skor.
// Murni & deterministik dari seed + urutan aksi. applyAction(g, seat, action) mengubah state; viewFor(g, seat) = yang boleh dilihat
// satu pemain (tangan lawan tidak bocor sampai ronde selesai).
import { RULES } from './rules.config.js';
import { deal, mulberry32, sortHand, countTwos } from './cards.js';
import { classify, beats, owns } from './combos.js';

/** Ronde baru. Yang jalan pertama = pemegang rules.firstCard (3♦); kalau firstCard null, `starter`. */
export function newHand(seed, rules = RULES, starter = 0) {
  const N = rules.players;
  const hands = deal(mulberry32(seed >>> 0), N, rules.handSize);
  const holder = rules.firstCard == null ? starter : hands.findIndex((h) => h.includes(rules.firstCard));
  return {
    rules, seed: seed >>> 0, phase: 'play', hands, turn: holder, leader: holder,
    first: rules.firstCard != null, // langkah pertama ronde wajib mengandung firstCard
    trick: { last: null, passes: 0 }, // last = { seat, cards, combo } | null
    plays: [], // { seat, cards, combo } | { seat, pass: true } | { seat:-1, trick:true } (tanda putaran baru)
    playsBy: new Array(N).fill(0),
    result: null,
    seq: 0,
    log: [], // kejadian untuk efek: { k:'play'|'pass'|'trick'|'done', seat, type }
  };
}

const nextSeat = (g, s) => (s + 1) % g.rules.players;

/** Sedang memimpin putaran baru? (tidak bisa pass) */
export const mustLead = (g) => g.phase === 'play' && !g.trick.last;
export const prevCombo = (g) => (mustLead(g) ? null : g.trick.last.combo);

function pushLog(g, e) {
  e.id = ++g.seq;
  g.log.push(e);
  if (g.log.length > 40) g.log.shift();
}

/** Cek langkah tanpa mengubah state. -> { ok, combo } | { ok:false, error } */
export function checkPlay(g, seat, cards) {
  if (!owns(g.hands[seat], cards)) return { ok: false, error: 'Kartu tidak cocok' };
  if (g.first && !cards.includes(g.rules.firstCard)) return { ok: false, error: 'Langkah pertama harus mengandung 3♦' };
  const combo = classify(cards, g.rules);
  if (!combo) return { ok: false, error: 'Kombinasi tidak sah' };
  const prev = prevCombo(g);
  if (prev && combo.n !== prev.n) return { ok: false, error: 'Jumlah kartu harus sama' };
  if (prev && !beats(combo, prev)) return { ok: false, error: 'Kartu itu tidak bisa mengalahkan' };
  return { ok: true, combo };
}

/**
 * Aksi pemain di kursi `seat`: { t: 'play', cards: [..] } | { t: 'pass' }.
 * Pass tidak mengunci: pemain itu boleh main lagi saat gilirannya datang lagi. Semua pemain lain pass → yang terakhir main memimpin lagi.
 * -> { ok } | { ok:false, error }
 */
export function applyAction(g, seat, a) {
  if (!a || typeof a.t !== 'string') return { ok: false, error: 'Aksi tidak dikenal' };
  if (g.phase === 'done') return { ok: false, error: 'Ronde sudah selesai' };
  if (seat !== g.turn) return { ok: false, error: 'Bukan giliranmu' };
  const tr = g.trick;
  if (a.t === 'pass') {
    if (mustLead(g)) return { ok: false, error: 'Kamu harus mengeluarkan kartu' };
    g.plays.push({ seat, pass: true });
    pushLog(g, { k: 'pass', seat });
    tr.passes++;
    g.turn = nextSeat(g, seat);
    if (tr.passes >= g.rules.players - 1) {
      // semua lawan pass: yang terakhir main memimpin putaran baru dengan kombinasi bebas
      g.turn = tr.last.seat;
      g.leader = tr.last.seat;
      tr.last = null;
      tr.passes = 0;
      g.plays.push({ seat: -1, trick: true });
      pushLog(g, { k: 'trick', seat: g.turn });
    }
    return { ok: true };
  }
  if (a.t !== 'play') return { ok: false, error: 'Aksi tidak dikenal' };
  const chk = checkPlay(g, seat, a.cards);
  if (!chk.ok) return chk;
  const cards = sortHand(a.cards);
  const set = new Set(cards);
  g.hands[seat] = g.hands[seat].filter((c) => !set.has(c));
  g.first = false;
  tr.last = { seat, cards, combo: chk.combo };
  tr.passes = 0;
  g.plays.push({ seat, cards, combo: chk.combo });
  g.playsBy[seat]++;
  pushLog(g, { k: 'play', seat, type: chk.combo.type });
  if (!g.hands[seat].length) finish(g, seat);
  else g.turn = nextSeat(g, seat);
  return { ok: true };
}

/** Pengali dari sisa kartu (rules.multTiers). 0 kartu = 0. */
export function multOf(left, rules = RULES) {
  if (left <= 0) return 0;
  return (rules.multTiers.find((t) => left <= t.max) || rules.multTiers.at(-1)).x;
}

/** Poin yang dibayar satu pemain kalah: sisa × pengali + kartu 2 × twoBonus (bonus tidak dikali). */
export function penalty(left, twos, rules = RULES) {
  return left <= 0 ? 0 : left * multOf(left, rules) + twos * rules.twoBonus;
}

/**
 * Skor ronde dari tangan tersisa. -> { points:[per kursi], rows:[{ left, mult, twos, twoPts, base, pts }] }
 * Pemenang (0 kartu) menerima jumlah poin semua yang kalah, jadi totalnya 0.
 */
export function scoreHands(hands, winner, rules = RULES) {
  const rows = hands.map((h) => {
    const left = h.length, twos = countTwos(h), mult = multOf(left, rules);
    return { left, mult, twos, base: left * mult, twoPts: twos * rules.twoBonus, pts: penalty(left, twos, rules) };
  });
  const points = rows.map((r, i) => (i === winner ? 0 : -r.pts));
  points[winner] = -points.reduce((a, b) => a + b, 0);
  return { points, rows };
}

function finish(g, winner) {
  g.phase = 'done';
  g.turn = -1;
  const s = scoreHands(g.hands, winner, g.rules);
  g.result = { winner, points: s.points, rows: s.rows };
  pushLog(g, { k: 'done', seat: winner });
}

/** Kartu yang sudah keluar (publik). */
export const playedCards = (g) => g.plays.filter((p) => p.cards).flatMap((p) => p.cards);

/** Yang boleh dilihat kursi `seat` (-1 = penonton). Tangan lawan hanya jumlahnya; setelah ronde selesai sisa kartu semua dibuka. */
export function viewFor(g, seat) {
  const done = g.phase === 'done';
  return {
    phase: g.phase, turn: g.turn, leader: g.leader, first: g.first,
    hand: seat >= 0 ? g.hands[seat] : null,
    counts: g.hands.map((h) => h.length),
    last: g.trick.last, passes: g.trick.passes, mustLead: seat === g.turn && mustLead(g),
    plays: g.plays.slice(-160),
    result: done ? g.result : null,
    reveal: done ? g.hands : null,
    log: g.log.slice(-12), // tiap kejadian punya id naik terus: klien memutar efek untuk id yang belum pernah dilihat
  };
}
