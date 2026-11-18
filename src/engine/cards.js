// Kartu = angka 0..51. rank = c >> 2 (0 = "3" … 11 = "A", 12 = "2"), suit = c & 3 (0 ♦ wajik, 1 ♣ keriting, 2 ♥ hati, 3 ♠ sekop).
// Angka kartu sekaligus nilainya: kartu lebih besar = rank lebih tinggi, kalau rank sama bunga lebih tinggi (3♦ = 0 terendah, 2♠ = 51 tertinggi).
// Murni (tanpa DOM) — dipakai browser, Node (tes/simulasi), dan Worker.
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const R2 = 12;
export const SUIT_CHARS = ['♦', '♣', '♥', '♠'];
const SUIT_KEYS = 'dchs';

export const rankOf = (c) => c >> 2;
export const suitOf = (c) => c & 3;
export const isRed = (c) => (c & 3) === 0 || (c & 3) === 2;
export const card = (rank, suit = 0) => rank * 4 + suit;
export const cardName = (c) => RANKS[c >> 2] + SUIT_CHARS[c & 3];
export const isTwo = (c) => c >> 2 === R2;
export const countTwos = (cards) => cards.filter(isTwo).length;

/** Urut dari kecil ke besar (tampilan tangan: 3♦ di kiri, 2♠ di kanan). */
export const sortHand = (cards) => [...cards].sort((a, b) => a - b);

/** Jumlah kartu per rank (array 13). */
export function counts(cards) {
  const c = new Array(13).fill(0);
  for (const x of cards) c[x >> 2]++;
  return c;
}

/** Untuk tes: '3d 3s 10h Ac 2s' → kartu. Tanpa bunga ('3 3 4') diisi otomatis dari ♦ ke atas. */
export function parseCards(str) {
  const used = new Set();
  return str.trim().split(/\s+/).filter(Boolean).map((t) => {
    const T = t.toUpperCase();
    const last = t.slice(-1).toLowerCase();
    const hasSuit = SUIT_KEYS.includes(last) && t.length > 1;
    const rank = RANKS.indexOf(hasSuit ? T.slice(0, -1) : T);
    if (rank < 0) throw new Error('Kartu tidak dikenal: ' + t);
    let c;
    if (hasSuit) c = card(rank, SUIT_KEYS.indexOf(last));
    else {
      let s = 0;
      while (used.has(card(rank, s)) && s < 4) s++;
      if (s > 3) throw new Error('Kartu lebih dari 4: ' + t);
      c = card(rank, s);
    }
    if (used.has(c)) throw new Error('Kartu dobel: ' + t);
    used.add(c);
    return c;
  });
}

/** RNG berseed (mulberry32). Jangan pakai Math.random() di engine. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Campur seed + angka lain jadi seed baru (keputusan bot yang bisa diulang). */
export const mixSeed = (seed, n) => (Math.imul((seed >>> 0) ^ 0x9e3779b9, 2654435761) + Math.imul(n + 1, 40503)) >>> 0;

export function shuffledDeck(rng) {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Bagi 13 kartu ke 4 pemain. */
export function deal(rng, players = 4, size = 13) {
  const d = shuffledDeck(rng);
  return Array.from({ length: players }, (_, p) => sortHand(d.slice(p * size, p * size + size)));
}
