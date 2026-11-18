import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCards as P } from '../src/engine/cards.js';
import { newHand, applyAction } from '../src/engine/game.js';
import { botAction, hints, timeoutAction } from '../src/engine/bot.js';
import { playOut } from '../src/engine/sim.js';
import { mulberry32 } from '../src/engine/cards.js';

function fixed(hands, turn = 0) {
  const g = newHand(1);
  g.hands = hands.map(P);
  g.turn = turn;
  g.first = false;
  return g;
}

test('600 ronde bot vs bot (semua level) tanpa langkah ilegal / macet', () => {
  const lv = ['easy', 'normal', 'hard'];
  for (let i = 0; i < 600; i++) playOut(100 + i, [0, 1, 2, 3].map((k) => lv[(i + k) % 3]));
});

test('langkah pertama bot (semua level) selalu mengandung 3♦', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    for (let s = 0; s < 30; s++) {
      const g = newHand(s);
      const a = botAction(g, g.turn, level, mulberry32(s));
      assert.ok(a.cards.includes(0), `${level} seed ${s}`);
      assert.ok(applyAction(g, g.turn, a).ok);
    }
  }
});

test('Mudah: memimpin kartu terendah, mengikuti dengan kartu terendah yang bisa', () => {
  const g = fixed(['5d 9c Kh 2s', '4d 10c Jh Ks', '4c 6d 7d 8d', '4h 6h 7c 8h']);
  assert.deepEqual(botAction(g, 0, 'easy').cards, P('5d'));
  applyAction(g, 0, { t: 'play', cards: P('9c') });
  assert.deepEqual(botAction(g, 1, 'easy').cards, P('10c'));
  applyAction(g, 1, { t: 'play', cards: P('10c') });
  assert.deepEqual(botAction(g, 2, 'easy'), { t: 'pass' }, 'tidak ada yang bisa melawan');
});

test('Sedang: simpan kartu 2 kalau aman, buang kartu 2 kalau ada lawan tinggal sedikit', () => {
  // memimpin: tangan 3 kartu kecil + 2. Lawan masih banyak → tidak memimpin dengan 2
  const safe = fixed(['4d 6c 9h 2s', '3c 5d 6d 7d 8d 9d 10d Jd Qd', '3h 5h 6h 7h 8h 9h 10h Jh Qh', '3s 5s 6s 7s 8s 9s 10s Js Qs']);
  assert.ok(!botAction(safe, 0, 'normal', () => 0.5).cards.includes(P('2s')[0]));
  // mengikuti single 10: lawan berikutnya tinggal 1 kartu → keluarkan 2
  const g = fixed(['4d 6c 9h 2s', '3c', '3h 5h 6h 7h 8h 9h 10h Jh Qh', '10s 5s']);
  g.turn = 3;
  applyAction(g, 3, { t: 'play', cards: P('10s') });
  assert.equal(g.turn, 0);
  assert.deepEqual(botAction(g, 0, 'normal', () => 0.5), { t: 'play', cards: P('2s') });
});

test('Sulit: menghadang lawan yang hampir habis (tidak pass kalau bisa melawan)', () => {
  const g = fixed(['4d 6c 9h Jd Qc Kd', '8c', '3h 5h 6h 7h 8h 9h 10h Jh Qh', '7s 5s']);
  g.turn = 3;
  applyAction(g, 3, { t: 'play', cards: P('7s') });
  const a = botAction(g, 0, 'hard', () => 0.5);
  assert.equal(a.t, 'play');
});

test('Sulit: utamakan turun dari 5 ke 4 kartu', () => {
  // 5 kartu, ikut single: Sulit memilih main (turun ke 4 = pengali x1) daripada pass
  const g = fixed(['4d 6c 9h Jd Kc', '3c 5d 6d 7d 8d 9d 10d Jc Qd', '3h 5h 6h 7h 8h 9h 10h Jh Qh', '3s 5s 6s 7s 8s 9s 10s Js Qs']);
  g.turn = 3;
  applyAction(g, 3, { t: 'play', cards: P('8s') });
  assert.equal(botAction(g, 0, 'hard', () => 0.5).t, 'play');
});

test('Saran & waktu habis', () => {
  const g = newHand(3);
  const h = hints(g, g.turn);
  assert.ok(h.length && h.every((cards) => cards.includes(0)), 'saran langkah pertama mengandung 3♦');
  assert.deepEqual(timeoutAction(g, g.turn), { t: 'play', cards: [0] });
  applyAction(g, g.turn, { t: 'play', cards: [0] });
  assert.deepEqual(timeoutAction(g, g.turn), { t: 'pass' });
});

test('bot tidak mengintip: menukar isi tangan lawan tidak mengubah keputusan', () => {
  for (let s = 0; s < 40; s++) {
    const g = newHand(s);
    applyAction(g, g.turn, botAction(g, g.turn, 'hard', mulberry32(1)));
    const seat = g.turn;
    const a1 = botAction(g, seat, 'hard', mulberry32(2));
    // acak ulang kartu lawan (jumlahnya tetap)
    const others = [0, 1, 2, 3].filter((k) => k !== seat);
    const pool = others.flatMap((k) => g.hands[k]).reverse();
    const g2 = { ...g, hands: g.hands.map((h, k) => (k === seat ? h : pool.splice(0, h.length).sort((x, y) => x - y))) };
    assert.deepEqual(botAction(g2, seat, 'hard', mulberry32(2)), a1);
  }
});
