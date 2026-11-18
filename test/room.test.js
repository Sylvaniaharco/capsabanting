import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/engine/room.js';
import { mulberry32 } from '../src/engine/cards.js';
import { botAction } from '../src/engine/bot.js';
import { minEntry } from '../src/engine/wallet.js';

const A = { id: 'aaaaaaaaaaaa', name: 'Ani', avatar: 1 };
const B = { id: 'bbbbbbbbbbbb', name: 'Budi', avatar: 1 };
const rnd = () => mulberry32(9);
const ranked = (k, coins = 1000) => ({ key: `key${k}key${k}key${k}`, userId: `g:${k}`, name: `P${k}`, avatar: k, rating: 1000, coins });

/** Jalankan meja sampai ronde selesai: manusia dimainkan bot "dari luar" lewat act(), sisanya step(). */
function runHand(room, t0, humanLevel = 'normal', online = () => true) {
  let now = t0;
  for (let i = 0; i < 3000 && room.status === 'playing'; i++) {
    const g = room.game;
    const s = room.seats[g.turn];
    if (!s.bot && !s.left && !s.auto && online(s.id)) {
      const r = R.act(room, g.turn, botAction(g, g.turn, humanLevel, mulberry32(i)), now);
      assert.ok(r.ok, r.error);
    } else {
      now = R.due(room, online).at;
      assert.ok(R.step(room, now, online), 'step harus jalan');
    }
  }
  assert.equal(room.status, 'result');
  return now;
}

test('meja teman: gabung, mulai diisi bot, ronde selesai, poin dijumlah nol', () => {
  const room = R.createRoom('ABCDE', A, 0);
  assert.ok(R.join(room, B).ok);
  assert.notEqual(room.seats[1].avatar, room.seats[0].avatar, 'avatar tidak kembar');
  assert.ok(!R.start(room, B.id, 5, 0, rnd()).ok, 'hanya host');
  assert.ok(R.start(room, A.id, 5, 0, rnd()).ok);
  assert.equal(room.seats.filter((s) => s.bot).length, 2);
  assert.ok(!R.join(room, { id: 'cccccccccccc', name: 'C' }).ok, 'sudah mulai');
  runHand(room, 0);
  assert.equal(room.totals.reduce((a, b) => a + b), 0);
  assert.ok(R.next(room, A.id, 6, 1, rnd()).ok);
  assert.equal(room.round, 2);
  assert.ok(room.game.hands[room.game.turn].includes(0), 'pemegang 3♦ jalan pertama tiap ronde');
});

test('aksi divalidasi server: bukan giliran / kursi bot / langkah pertama tanpa 3♦ ditolak', () => {
  const room = R.createRoom('ABCDE', A, 0);
  R.join(room, B);
  R.start(room, A.id, 11, 0, rnd());
  const g = room.game;
  const other = g.turn === 0 ? 1 : 0;
  assert.ok(!R.act(room, other, { t: 'pass' }, 0).ok);
  if (g.turn < 2) {
    const notThree = g.hands[g.turn].find((c) => c !== 0);
    assert.ok(!R.act(room, g.turn, { t: 'play', cards: [notThree] }, 0).ok);
    assert.ok(!R.act(room, g.turn, { t: 'play', cards: [51 === notThree ? 50 : 51].filter((c) => !g.hands[g.turn].includes(c)) }, 0).ok, 'kartu orang lain');
  }
  assert.ok(!R.act(room, 3, { t: 'pass' }, 0).ok, 'kursi bot tidak bisa diatur pemain');
});

test('waktu habis 2x = main otomatis, pemain bisa mengambil alih', () => {
  const room = R.createRoom('ABCDE', A, 0);
  R.start(room, A.id, 3, 0, rnd());
  let now = 0, timeouts = 0;
  while (room.status === 'playing' && timeouts < 2) {
    const d = R.due(room);
    now = d.at;
    if (d.kind === 'timeout') timeouts++;
    R.step(room, now);
  }
  if (room.status === 'playing') {
    assert.ok(room.seats[0].auto);
    R.takeover(room, 0);
    assert.ok(!room.seats[0].auto);
  }
});

test('pemain putus: gilirannya dimainkan bot setelah sebentar', () => {
  const room = R.createRoom('ABCDE', A, 0);
  R.join(room, B);
  R.start(room, A.id, 21, 1000, rnd());
  let now = 1000;
  while (room.seats[room.game.turn].bot) { now = R.due(room).at; R.step(room, now); }
  const off = () => false;
  const d = R.due(room, off);
  assert.equal(d.kind, 'offline');
  assert.ok(d.at - room.turnAt <= R.OFFLINE_TURN_MS);
  assert.ok(R.step(room, d.at, off));
});

test('latihan berjalan ratusan ronde tanpa macet (semua kursi otomatis)', () => {
  const room = R.createPractice(A, 'hard', 77, 0);
  room.seats[0].auto = true;
  let now = 0;
  for (let h = 0; h < 150; h++) {
    now = runHand(room, now);
    assert.equal(room.totals.reduce((a, b) => a + b), 0);
    assert.ok(R.next(room, A.id, 1000 + h, now).ok);
    room.seats[0].auto = true;
  }
});

test('viewFor: tidak memuat id, userId, saldo, atau kartu lawan', () => {
  const room = R.createRanked('RNKED', 10, 0);
  R.reserve(room, { key: 'kkkkkkkkkkkk', userId: 'g:secret', name: 'Ani', avatar: 2, rating: 1100, coins: 98765 }, 0);
  R.startRanked(room, 9, 20000, rnd());
  const v = R.viewFor(room, 0);
  const s = JSON.stringify(v);
  assert.ok(!s.includes('g:secret') && !s.includes('kkkkkkkkkkkk'));
  assert.equal(v.ranked.rating, 1100);
  assert.equal(v.ranked.coins, 98765, 'saldo sendiri boleh');
  assert.equal(v.ranked.stake, 10);
  assert.equal(v.game.hand.length, 13);
  for (const c of room.game.hands[1]) assert.ok(!v.game.hand.includes(c));
  assert.ok(!JSON.stringify(R.viewFor(room, 1)).includes('98765'), 'saldo orang lain tidak bocor');
});

test('Ranked: koin kurang dari minimal meja ditolak', () => {
  const room = R.createRanked('RNKED', 10, 0);
  assert.equal(R.reserve(room, ranked(1, minEntry(10) - 1), 0).ok, false);
  assert.ok(R.reserve(room, ranked(1, minEntry(10)), 0).ok);
});

test('Ranked: mulai setelah waktu tunggu, bot isi kursi, kabur ditandai, settle koin = poin x taruhan', () => {
  const room = R.createRanked('RNKED', 5, 0);
  assert.ok(R.reserve(room, ranked(1), 0).ok);
  assert.equal(R.rankedDue(room, 1000), null);
  assert.ok(R.reserve(room, ranked(2), 1000).ok);
  assert.equal(R.reserve(room, { ...ranked(2), key: 'other0000000' }, 1000).key, ranked(2).key, 'satu akun satu kursi');
  assert.equal(R.rankedDue(room, R.RANKED_WAIT_MS), 'start');
  R.startRanked(room, 4, R.RANKED_WAIT_MS, rnd());
  assert.equal(room.seats.filter((s) => s.bot).length, 2);
  assert.ok(R.joinable(room));
  assert.ok(R.reserve(room, ranked(3), 20000).ok);
  assert.equal(room.pending.length, 1);
  R.leave(room, ranked(2).key); // kabur di tengah ronde
  const now = runHand(room, 20000);
  assert.deepEqual(room.last.abandoned, room.seats.map((s) => s.userId === 'g:2'));
  assert.deepEqual(room.last.coins, room.last.points.map((p) => p * 5));
  const p = R.settlePayload(room);
  assert.match(p.gameId, /^RNKED:1:[a-z0-9]+$/);
  assert.equal(p.stake, 5);
  assert.equal(p.seats.length, 4);
  assert.equal(p.seats[p.winner].left, 0);
  assert.equal(p.seats.find((s) => s.userId === 'g:2').abandoned, true);
  assert.ok(p.seats.every((s) => Number.isInteger(s.left) && Number.isInteger(s.twos) && !('points' in s)));
  assert.equal(R.rankedDue(room, now + 1e6), null, 'belum diselesaikan di server akun');
  const i1 = room.seats.findIndex((s) => s.userId === 'g:1');
  R.applySettle(room, { 'g:1': { delta: 12, rating: 1012, tier: 'bronze', coinDelta: -40, coins: 960, bonus: 100 } });
  const v = R.viewFor(room, i1);
  assert.equal(v.last.myRating, 12);
  assert.equal(v.last.coins[i1], -40);
  assert.equal(v.last.bonus, 100);
  assert.equal(v.ranked.coins, 960);
  assert.equal(R.rankedDue(room, now + R.RANKED_NEXT_MS), 'next');
  const out = R.nextRanked(room, 5, now + R.RANKED_NEXT_MS, rnd());
  assert.ok(!out.closed);
  assert.ok(!room.seats.some((s) => s.userId === 'g:2'), 'yang kabur dilepas');
  assert.ok(room.seats.some((s) => s.userId === 'g:3'), 'yang menunggu masuk');
  assert.equal(room.round, 2);
});

test('Ranked: saldo habis setelah ronde → dilepas sebelum ronde berikutnya', () => {
  const room = R.createRanked('RNKED', 5, 0);
  R.reserve(room, ranked(1), 0);
  R.startRanked(room, 8, R.RANKED_WAIT_MS, rnd());
  const now = runHand(room, R.RANKED_WAIT_MS);
  R.applySettle(room, { 'g:1': { delta: -5, rating: 995, tier: 'bronze', coinDelta: -950, coins: 50, bonus: 0 } });
  const out = R.nextRanked(room, 9, now + R.RANKED_NEXT_MS, rnd());
  assert.ok(out.closed);
  assert.match(out.removed[ranked(1).key], /Koin tidak cukup/);
});

test('Ranked: putus lama = kabur, putus sebentar tidak', () => {
  const room = R.createRanked('RNKED', 5, 0);
  R.reserve(room, ranked(1), 0);
  R.reserve(room, ranked(2), 0);
  R.startRanked(room, 8, 1000, rnd());
  R.markOnline(room, ranked(2).key, false, 1000 - R.ABANDON_MS);
  const online = (id) => id !== ranked(2).key;
  runHand(room, 1000, 'normal', online);
  assert.equal(room.last.abandoned[room.seats.findIndex((s) => s.userId === 'g:2')], true);
  assert.equal(room.last.abandoned[room.seats.findIndex((s) => s.userId === 'g:1')], false);
});

test('Ranked: kursi yang dipesan tapi tidak pernah tersambung dihitung kabur, lalu dilepas', () => {
  const room = R.createRanked('RNKED', 5, 0);
  R.reserve(room, ranked(1), 1000);
  R.reserve(room, ranked(2), 1000);
  R.markOnline(room, ranked(1).key, true, 1100); // hanya P1 yang tersambung
  R.startRanked(room, 8, R.RANKED_WAIT_MS + R.ABANDON_MS, rnd());
  const online = (id) => id === ranked(1).key;
  const now = runHand(room, R.RANKED_WAIT_MS + R.ABANDON_MS, 'normal', online);
  const i2 = room.seats.findIndex((s) => s.userId === 'g:2');
  assert.equal(room.last.abandoned[i2], true);
  R.applySettle(room, {});
  const out = R.nextRanked(room, 3, now + R.RANKED_NEXT_MS, rnd());
  assert.ok(!room.seats.some((s) => s.userId === 'g:2'));
  assert.ok(out.removed[ranked(2).key]);
});
