// Simulasi bot vs bot: node scripts/simulate.mjs [jumlah] — cek tidak ada langkah ilegal/macet, sebaran hasil, kekuatan level bot.
import { playOut } from '../src/engine/sim.js';

const N = Number(process.argv[2]) || 1000;
const t0 = Date.now();
const levels = ['easy', 'normal', 'hard'];
const pts = { easy: 0, normal: 0, hard: 0 }, games = { easy: 0, normal: 0, hard: 0 }, wins = { easy: 0, normal: 0, hard: 0 };
const leftDist = {};
let steps = 0, maxLoss = 0;
for (let i = 0; i < N; i++) {
  // 4 kursi: level diputar supaya adil (satu level muncul dua kali)
  const L = [0, 1, 2, 3].map((k) => levels[(k + i) % 3]);
  const r = playOut(1000 + i, L);
  steps += r.steps;
  const res = r.g.result;
  if (res.points.reduce((a, b) => a + b, 0) !== 0) throw new Error('skor tidak zero-sum');
  res.points.forEach((p, s) => {
    pts[L[s]] += p; games[L[s]]++;
    if (s === res.winner) wins[L[s]]++;
    else { leftDist[res.rows[s].left] = (leftDist[res.rows[s].left] || 0) + 1; maxLoss = Math.max(maxLoss, -p); }
  });
}
const ms = Date.now() - t0;
console.log(`${N} ronde, ${ms} ms (${(ms / N).toFixed(1)} ms/ronde, ${(ms / steps).toFixed(2)} ms/langkah)`);
for (const k of levels) console.log(`${k}: poin rata-rata ${(pts[k] / games[k]).toFixed(2)}/ronde · menang ${(100 * wins[k] / games[k]).toFixed(1)}%`);
console.log('sebaran sisa kartu yang kalah', leftDist, '· kalah terbesar', maxLoss);
