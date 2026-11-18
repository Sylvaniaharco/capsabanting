import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCards as P } from '../src/engine/cards.js';
import { newHand, applyAction, viewFor, penalty, multOf, scoreHands, mustLead, faultOf } from '../src/engine/game.js';
import { RULES, makeRules } from '../src/engine/rules.config.js';
import { playOut } from '../src/engine/sim.js';

const act = (g, seat, a) => {
  const r = applyAction(g, seat, a);
  assert.ok(r.ok, `${seat} ${JSON.stringify(a)}: ${r.error}`);
};
const play = (g, seat, s) => act(g, seat, { t: 'play', cards: P(s) });
const pass = (g, seat) => act(g, seat, { t: 'pass' });

/** Tangan buatan: kursi 0 pegang 3♦. */
function fixed(hands) {
  const g = newHand(1);
  g.hands = hands.map(P);
  g.turn = 0;
  g.leader = 0;
  return g;
}

test('bagi kartu: 4 x 13, tidak ada yang dobel; pemegang 3♦ jalan pertama', () => {
  for (const seed of [1, 2, 3, 99]) {
    const g = newHand(seed);
    assert.deepEqual(g.hands.map((h) => h.length), [13, 13, 13, 13]);
    assert.equal(new Set(g.hands.flat()).size, 52);
    assert.ok(g.hands[g.turn].includes(0), 'giliran pertama = pemegang 3♦');
  }
});

test('langkah pertama wajib mengandung 3♦', () => {
  const g = fixed(['3d 5c 5h 9s', '4d 6c 7h 8s', '4c 6d 7d 8d', '4h 6h 7c 8h']);
  assert.equal(applyAction(g, 0, { t: 'play', cards: P('5c 5h') }).ok, false);
  assert.match(applyAction(g, 0, { t: 'play', cards: P('9s') }).error, /3♦/);
  assert.equal(applyAction(g, 0, { t: 'pass' }).ok, false, 'tidak bisa pass saat memimpin');
  play(g, 0, '3d');
  assert.equal(g.first, false);
  assert.equal(g.turn, 1);
});

test('pass tidak mengunci; semua lawan pass → yang terakhir main memimpin bebas', () => {
  const g = fixed(['3d 5c 5h 9s Ks', '4d 6c 7h 8s Kd', '4c 6d 7d 8d Kc', '4h 6h 7c 8h Kh']);
  play(g, 0, '3d');
  pass(g, 1);
  play(g, 2, '4c');
  pass(g, 3);
  play(g, 0, '9s'); // kursi 0 main lagi
  play(g, 1, 'Kd'); // kursi 1 tadi pass, sekarang boleh main
  pass(g, 2);
  pass(g, 3);
  assert.equal(g.turn, 0);
  pass(g, 0);
  assert.equal(g.turn, 1, 'semua lawan pass → kursi 1 memimpin');
  assert.ok(mustLead(g));
  play(g, 1, '6c'); // memimpin bebas (tidak perlu lebih besar dari K)
  assert.equal(applyAction(g, 2, { t: 'play', cards: P('6d 7d') }).ok, false, 'jumlah kartu harus sama');
  assert.equal(applyAction(g, 2, { t: 'play', cards: P('4c') }).ok, false, 'kartu sudah tidak ada');
});

test('boleh menutup permainan pakai kartu 2; ronde langsung selesai saat ada yang habis', () => {
  const g = fixed(['3d 2s', '4d 6c 7h 8s', '4c 6d 7d 8d 2d', '4h 6h 7c 8h 2c 2h']);
  play(g, 0, '3d');
  pass(g, 1);
  pass(g, 2);
  pass(g, 3);
  play(g, 0, '2s');
  assert.equal(g.phase, 'done');
  assert.equal(g.result.winner, 0);
  assert.equal(applyAction(g, 1, { t: 'pass' }).ok, false);
  // kursi 3 pass padahal 2♥-nya bisa menutup 3♦ saat kursi 0 tinggal 1 kartu = "kasih menang": bayar semua (4 + 14 + 20)
  assert.equal(g.result.payAll, 3);
  assert.deepEqual(g.result.points, [38, 0, 0, -38]);
  // tanpa aturan bayar semua: tiap yang kalah bayar sendiri (4 kartu tanpa 2 = 4; 5 kartu dengan satu 2 = 14; 6 kartu dengan dua 2 = 20)
  assert.deepEqual(scoreHands(g.hands, 0).points, [38, -4, -14, -20]);
});

test('kasih menang: pemain sesudahmu tinggal 1 kartu → wajib kartu tertinggi, kalau tidak bayar semua', () => {
  // kursi 1 memimpin 5♣ (bukan kartu tertingginya, K♠) padahal kursi 2 tinggal 1 kartu → kursi 2 habis → kursi 1 bayar semua
  const g = fixed(['3d 4c', '5c Ks', '9h', '6d 7d 8d']);
  g.first = false;
  g.turn = 1;
  play(g, 1, '5c');
  play(g, 2, '9h');
  assert.equal(g.result.winner, 2);
  assert.equal(g.result.payAll, 1);
  assert.deepEqual(g.result.points, [0, -6, 6, 0]); // 2 + 1 + 3 kartu, semua dibayar kursi 1
  // kalau kursi 1 memimpin kartu tertingginya lalu tetap kalah, bayar masing-masing
  const h = fixed(['3d 4c', '5c 6s', '7h', '6d 7d 8d']);
  h.first = false;
  h.turn = 1;
  play(h, 1, '6s');
  play(h, 2, '7h');
  assert.equal(h.result.payAll, -1);
  assert.deepEqual(h.result.points, [-2, -1, 6, -3]);
  // memimpin pasang tidak melanggar (yang tinggal 1 kartu tidak bisa ikut)
  const k = fixed(['3d 4c', '5c 5s Ks', '9h', '6d 7d 8d']);
  k.first = false;
  k.turn = 1;
  assert.equal(faultOf(k, 1, { t: 'play', cards: P('5c 5s') }), false);
  assert.equal(faultOf(k, 1, { t: 'play', cards: P('5c') }), true);
  assert.equal(faultOf(k, 1, { t: 'play', cards: P('Ks') }), false);
  // pass saat kartu tertinggi tidak bisa menutup: tidak melanggar
  const m = fixed(['2s 4c', '5c 6s', '9h', '6d 7d 8d']);
  m.first = false;
  play(m, 0, '2s');
  assert.equal(faultOf(m, 1, { t: 'pass' }), false);
  // yang lain (bukan pemain tepat sebelum si pemenang) tidak kena
  const n = fixed(['3d 4c', '5c 6s', 'Ah', '6d 7d 8d 2c']);
  n.first = false;
  n.turn = 3;
  play(n, 3, '6d'); // kursi 3 bukan sebelum kursi 2
  pass(n, 0);
  assert.equal(faultOf(n, 1, { t: 'play', cards: P('6s') }), false, '6♠ tertinggi kursi 1');
  play(n, 1, '6s');
  play(n, 2, 'Ah');
  assert.equal(n.result.payAll, -1);
});

test('ronde berikutnya: pemenang jalan duluan & bebas (tanpa 3♦); ronde pertama wajib 3♦', () => {
  const g = newHand(9, RULES, 2);
  assert.equal(g.turn, 2);
  assert.equal(g.first, false);
  const notThree = g.hands[2].find((c) => c !== 0);
  assert.ok(applyAction(g, 2, { t: 'play', cards: [notThree] }).ok);
  const first = newHand(9, RULES, -1);
  assert.ok(first.first && first.hands[first.turn].includes(0));
  const old = newHand(9, makeRules({ winnerLeads: false }), 2);
  assert.ok(old.first && old.hands[old.turn].includes(0), 'winnerLeads false = 3♦ tiap ronde');
});

test('hitungan poin aturan rumah Teddy', () => {
  assert.equal(penalty(4, 1), 8);
  assert.equal(penalty(5, 1), 14);
  assert.equal(penalty(9, 2), 35);
  assert.equal(penalty(13, 4), 68);
  assert.equal(penalty(3, 0), 3);
});

test('batas pengali: 4/5, 8/9, 12/13 kartu', () => {
  assert.deepEqual([4, 5].map((n) => multOf(n)), [1, 2]);
  assert.deepEqual([8, 9].map((n) => multOf(n)), [2, 3]);
  assert.deepEqual([12, 13].map((n) => multOf(n)), [3, 4]);
  assert.deepEqual([4, 5, 8, 9, 12, 13].map((n) => penalty(n, 0)), [4, 10, 16, 27, 36, 52]);
  assert.equal(multOf(1), 1);
  assert.equal(RULES.twoBonus, 4);
});

test('total poin satu ronde = 0 (hitung manual & 500 ronde bot)', () => {
  const s = scoreHands([P(''), P('3d 4d 5d 2s'), P('3c 4c 5c 6c 7c 2c'), P('3h 4h 5h 6h 7h 8h 9h 10h 2h 2d')], 0);
  assert.equal(s.points.reduce((a, b) => a + b, 0), 0);
  assert.deepEqual(s.rows.map((r) => r.twos), [0, 1, 1, 2]);
  for (let i = 0; i < 500; i++) {
    const { g } = playOut(7000 + i, ['easy', 'normal', 'hard', i % 2 ? 'hard' : 'easy']);
    assert.equal(g.result.points.reduce((a, b) => a + b, 0), 0);
    assert.equal(g.hands[g.result.winner].length, 0);
  }
});

test('viewFor: tangan lawan tidak bocor sampai ronde selesai', () => {
  const g = newHand(5);
  const v = viewFor(g, 1);
  assert.equal(v.hand.length, 13);
  assert.deepEqual(v.counts, [13, 13, 13, 13]);
  assert.ok(!('hands' in v) && v.reveal === null && !('seed' in v));
  const s = JSON.stringify(v);
  for (const c of g.hands[2]) assert.ok(!v.hand.includes(c));
  assert.ok(!s.includes('"rules"'));
});
