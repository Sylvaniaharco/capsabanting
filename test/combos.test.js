import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCards as P, card } from '../src/engine/cards.js';
import { classify, beats, legalMoves, FIVE } from '../src/engine/combos.js';
import { makeRules } from '../src/engine/rules.config.js';

const C = (s) => classify(P(s));
const wins = (a, b) => beats(C(a), C(b));

test('urutan kartu: 3 terendah, 2 tertinggi; bunga ♦ < ♣ < ♥ < ♠', () => {
  assert.ok(wins('2d', 'As'));
  assert.ok(wins('4d', '3s'));
  assert.ok(wins('3c', '3d') && wins('3h', '3c') && wins('3s', '3h'));
  assert.equal(P('3d')[0], 0);
  assert.equal(P('2s')[0], 51);
});

test('jenis kombinasi dikenali', () => {
  assert.equal(C('7h').type, 'single');
  assert.equal(C('7h 7s').type, 'pair');
  assert.equal(C('7h 7s 7d').type, 'triple');
  assert.equal(C('3d 4c 5h 6s 7d').type, 'straight');
  assert.equal(C('3h 8h Jh Kh 2h').type, 'flush');
  assert.equal(C('9d 9c 9h Ks Kd').type, 'fullhouse');
  assert.equal(C('9d 9c 9h 9s 3d').type, 'quad');
  assert.equal(C('5s 6s 7s 8s 9s').type, 'straightflush');
  for (const bad of ['7h 8h', '7h 7s 8d', '3d 4d 5d 6d', '3d 4c 5h 6s 8d', '3d 3c 5h 5s 8d', '3d 3c 3h 3s', '3d 4c 5h 6s 7d 8c']) {
    assert.equal(C(bad), null, bad);
  }
});

test('straight: 2 tidak boleh, tidak memutar; terendah 3-7, tertinggi 10-A', () => {
  assert.equal(C('Jd Qc Kh As 2d'), null, 'J-Q-K-A-2 bukan straight');
  assert.equal(C('Ad 2c 3h 4s 5d'), null, 'A-2-3-4-5 bukan straight');
  assert.equal(C('2d 3c 4h 5s 6d'), null);
  assert.equal(C('10d Jc Qh Ks Ad').type, 'straight');
  assert.ok(wins('10d Jc Qh Ks Ad', '9d 10c Jh Qs Kd'));
  assert.ok(wins('4d 5c 6h 7s 8d', '3d 4c 5h 6s 7s'));
  // kartu tertinggi sama → lihat bunganya
  assert.ok(wins('3d 4c 5h 6s 7s', '3s 4s 5h 6d 7h'));
  assert.ok(!wins('3s 4s 5h 6d 7h', '3d 4c 5h 6s 7s'));
});

test('straight gampang diubah lewat satu konstanta (straightOrder)', () => {
  const withTwo = makeRules({ straightOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
  assert.equal(classify(P('Jd Qc Kh As 2d'), withTwo).type, 'straight');
  const wrap = makeRules({ straightOrder: [11, 12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  assert.equal(classify(P('Ad 2c 3h 4s 5d'), wrap).type, 'straight');
  assert.ok(beats(classify(P('3d 4c 5h 6s 7d'), wrap), classify(P('Ad 2c 3h 4s 5s'), wrap)), 'A-2-3-4-5 terendah');
});

test('urutan 5 kartu: straight < flush < full house < four + 1 < straight flush', () => {
  const order = ['10d Jc Qh Ks Ad', '3h 5h 7h 9h Jh', '3d 3c 3h 4s 4d', '3d 3c 3h 3s 4d', '3c 4c 5c 6c 7c'];
  for (let i = 0; i < order.length; i++) for (let j = 0; j < order.length; j++) {
    assert.equal(wins(order[i], order[j]), i > j, `${order[i]} vs ${order[j]}`);
  }
  assert.deepEqual(order.map((s) => C(s).type), FIVE);
});

test('perbandingan sejenis', () => {
  // flush: kartu tertinggi, kalau sama lihat bunganya
  assert.ok(wins('3d 4d 5d 6d Ad', '8s 9s 10s Js Ks'));
  assert.ok(wins('3s 4s 5s 6s As', '8h 9h 10h Jh Ah'));
  // full house: angka tris
  assert.ok(wins('4d 4c 4h 3s 3d', '3c 3h 3s 2d 2c'));
  // four: angka quad
  assert.ok(wins('5d 5c 5h 5s 3d', '4d 4c 4h 4s 2s'));
  // straight flush: kartu tertinggi lalu bunga
  assert.ok(wins('4d 5d 6d 7d 8d', '3s 4s 5s 6s 7s'));
  assert.ok(wins('3s 4s 5s 6s 7s', '3h 4h 5h 6h 7h'));
  // pasang & tris: angka, kalau sama bunga tertinggi
  assert.ok(wins('9d 9c', '8h 8s'));
  assert.ok(wins('9d 9s', '9c 9h'));
  assert.ok(!wins('9c 9h', '9d 9s'));
  assert.ok(wins('2d 2c 2h', 'As Ah Ad'));
});

test('hanya bisa dilawan kombinasi dengan jumlah kartu sama', () => {
  assert.ok(!wins('2s 2h', '3d'));
  assert.ok(!wins('3c 4c 5c 6c 7c', '2s 2h 2d'));
  assert.ok(!wins('2s', '3d 3c'));
});

test('legalMoves: semua langkah yang dihasilkan sah & mengalahkan', () => {
  const hand = P('3d 4c 5h 6s 7d 7c 7h 9h 9s Jh Qh Kh 2s');
  const prev = C('5d 6c 7s 8d 9d');
  const moves = legalMoves(hand, prev);
  assert.ok(moves.length > 0);
  for (const m of moves) assert.ok(beats(m.combo, prev) && m.cards.every((c) => hand.includes(c)));
  assert.ok(moves.some((m) => m.combo.type === 'fullhouse'));
  assert.equal(legalMoves(hand, C('2d')).length, 1, 'cuma 2♠ yang mengalahkan 2♦');
  assert.equal(card(12, 3), 51);
});
