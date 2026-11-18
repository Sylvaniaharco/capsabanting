// Logika meja (murni): dipakai Durable Object BantingRoom (worker/room.js), mode Latihan di browser (src/net/local.js), dan dites di Node.
// Tiga jenis meja: 'friends' (kode meja, tanpa akun, poin saja), 'ranked' (akun bersama, koin dompet bersama + rating Capsa Banting),
// 'practice' (lawan 3 bot, di HP). Server yang membagi kartu; klien hanya menerima viewFor(room, seat): kartu sendiri + jumlah kartu lawan.
// id pemain / userId / saldo orang lain tidak pernah keluar.
import { newHand, applyAction, viewFor as gameView } from './game.js';
import { botAction, timeoutAction, validLevel, DEFAULT_LEVEL } from './bot.js';
import { RULES } from './rules.config.js';
import { mulberry32, mixSeed, countTwos } from './cards.js';
import { pickBots, clampAvatar } from './roster.js';
import { minEntry, isStake, STAKES } from './wallet.js';

export const GRACE_MS = 1500; // kelonggaran jaringan setelah waktu giliran habis
export const BOT_MS = 1100; // jeda bot sebelum main (biar terasa seperti orang)
export const OFFLINE_TURN_MS = 4000; // pemain putus: gilirannya dimainkan bot setelah segini (bukan menunggu waktu penuh)
export const AFK_LIMIT = 2; // waktu habis segini kali berturut-turut = dimainkan otomatis sampai pemain menekan "Main lagi sendiri"
export const ABANDON_MS = 45000; // Ranked: putus selama segini saat ronde selesai = dihitung kabur (penalti rating)
export const RANKED_WAIT_MS = 15000; // Ranked: tunggu pemain lain segini setelah pemain pertama duduk, lalu kursi kosong diisi bot
export const RANKED_NEXT_MS = 9000; // Ranked: jeda setelah ronde selesai sebelum ronde berikutnya
export const IDLE_HANDS = 2; // Ranked: dimainkan otomatis 2 ronde penuh berturut-turut = dikeluarkan
export const ROOM_CODE = /^[A-Z0-9]{5}$/;
export const validId = (s) => typeof s === 'string' && /^[a-z0-9]{12,40}$/.test(s);
export const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Pemain';

const N = RULES.players;
const human = (s) => s && !s.bot;
export const seatOf = (room, id) => room.seats.findIndex((s) => human(s) && s.id === id);
const activeHumans = (room) => room.seats.filter((s) => human(s) && !s.left);

function base(code, kind, now, level) {
  return {
    code, kind, status: 'lobby', hostId: null, createdAt: now, level: validLevel(level) ? level : DEFAULT_LEVEL,
    seats: new Array(N).fill(null), pending: [], round: 0, game: null, deadline: 0, turnAt: 0,
    totals: new Array(N).fill(0), last: null, startAt: 0, nextAt: 0, ranked: null,
  };
}
const seatFor = (u) => ({ id: u.id, name: cleanName(u.name), avatar: clampAvatar(u.avatar) ?? 0 });

export function createRoom(code, host, now, level = DEFAULT_LEVEL) {
  const r = base(code, 'friends', now, level);
  r.hostId = host.id;
  r.seats[0] = seatFor(host);
  return r;
}

/** Lawan bot: kamu + 3 bot, langsung mulai. stake 0 = Latihan tanpa koin; 5/10/20 = koin meja bot di HP (dihitung klien). */
export function createPractice(user, level, seed, now, stake = 0) {
  const r = base('LATIH', 'practice', now, level);
  r.stake = isStake(stake) ? Number(stake) : 0;
  r.hostId = user.id;
  r.seats[0] = seatFor(user);
  start(r, user.id, seed, now, mulberry32(mixSeed(seed, 5)));
  return r;
}

function noDupAvatar(room, seat, skip = -1) {
  const taken = new Set(room.seats.filter((s, k) => s && k !== skip && s !== seat).map((s) => s.avatar));
  for (let i = 0; i < 12 && taken.has(seat.avatar); i++) seat.avatar = (seat.avatar + 1) % 12;
}

/** Masuk meja teman (atau kembali ke kursi sendiri). -> { ok, seat } | { ok:false, error } */
export function join(room, user) {
  let seat = seatOf(room, user.id);
  if (seat >= 0) {
    room.seats[seat].left = false;
    return { ok: true, seat };
  }
  if (room.kind === 'ranked') return isPending(room, user.id) ? { ok: true, seat: -1 } : { ok: false, error: 'Kursi tidak ditemukan' };
  if (room.status !== 'lobby') return { ok: false, error: 'Permainan sudah mulai' };
  seat = room.seats.findIndex((s) => !s);
  if (seat < 0) return { ok: false, error: 'Meja penuh' };
  room.seats[seat] = seatFor(user);
  noDupAvatar(room, room.seats[seat]);
  return { ok: true, seat };
}

/** Keluar: di ruang tunggu kursinya dilepas; saat ronde jalan kursinya dimainkan bot (Ranked: dihitung kabur). */
export function leave(room, id) {
  room.pending = room.pending.filter((p) => p.id !== id);
  const seat = seatOf(room, id);
  if (seat < 0) return;
  if (room.status === 'lobby') room.seats[seat] = null;
  else room.seats[seat].left = true;
  fixHost(room);
}

export function fixHost(room, connected = () => true) {
  if (room.kind === 'ranked') return;
  const ok = (s) => human(s) && !s.left && connected(s.id);
  if (room.seats.some((s) => ok(s) && s.id === room.hostId)) return;
  const h = room.seats.find(ok);
  if (h) room.hostId = h.id;
}

/** Catat pemain tersambung/putus (dipakai untuk giliran pemain putus & hitung kabur di Ranked). */
export function markOnline(room, id, online, now) {
  for (const s of [...room.seats, ...room.pending]) {
    if (!human(s) || s.id !== id) continue;
    if (online) s.offSince = 0;
    else if (!s.offSince) s.offSince = now;
  }
}

const isAuto = (s) => !!s && (!!s.bot || !!s.left || !!s.auto);

function resetTurn(room, now) {
  room.turnAt = now;
  room.deadline = now + RULES.turnSeconds * 1000 + GRACE_MS;
}

function dealRound(room, seed, now) {
  room.round += 1;
  room.game = newHand(seed, RULES); // pemegang 3♦ jalan pertama
  room.status = 'playing';
  room.last = null;
  room.nextAt = 0;
  for (const s of room.seats) if (human(s)) s.autoHand = !!s.auto;
  resetTurn(room, now);
}

function fillBots(room, rnd) {
  const empty = room.seats.filter((s) => !s).length;
  if (!empty) return;
  const bots = pickBots(empty, room.seats.filter(Boolean).map((s) => s.avatar), rnd);
  room.seats = room.seats.map((s) => s || { ...bots.shift(), bot: true });
}

/** Host memulai meja teman / latihan: kursi kosong diisi bot. */
export function start(room, id, seed, now, rnd) {
  if (room.status !== 'lobby') return { ok: false, error: 'Permainan sudah mulai' };
  if (id !== room.hostId) return { ok: false, error: 'Hanya pembuat meja yang bisa memulai' };
  fillBots(room, rnd);
  dealRound(room, seed, now);
  return { ok: true };
}

/** Ronde berikutnya (meja teman / latihan, ditekan host di layar hasil). Kursi pemain yang keluar diganti bot. */
export function next(room, id, seed, now, rnd = mulberry32(seed)) {
  if (room.status !== 'result') return { ok: false, error: 'Ronde belum selesai' };
  if (id !== room.hostId) return { ok: false, error: 'Hanya pembuat meja yang bisa melanjutkan' };
  if (!activeHumans(room).length) return { ok: false, error: 'Tidak ada pemain' };
  room.seats = room.seats.map((s) => (human(s) && s.left ? null : s));
  fillBots(room, rnd);
  dealRound(room, seed, now);
  return { ok: true };
}

/** Aksi pemain (dari HP). Server tidak percaya klien: applyAction memeriksa giliran, kartu, aturan 3♦, dan kombinasinya. */
export function act(room, seat, msg, now) {
  if (room.status !== 'playing' || seat < 0) return { ok: false, error: 'Bukan waktunya' };
  const s = room.seats[seat];
  if (!human(s)) return { ok: false, error: 'Bukan kursimu' };
  const a = msg?.t === 'play' ? { t: 'play', cards: Array.isArray(msg.cards) ? msg.cards.slice(0, 13) : [] } : { t: String(msg?.t || '') };
  const res = applyAction(room.game, seat, a);
  if (!res.ok) return res;
  s.afk = 0;
  s.auto = false;
  s.idle = 0;
  after(room, now);
  return { ok: true };
}

/** Pemain mematikan "main otomatis" (setelah 2x waktu habis). */
export function takeover(room, seat) {
  const s = room.seats[seat];
  if (!human(s)) return { ok: false };
  s.auto = false;
  s.afk = 0;
  return { ok: true };
}

function after(room, now) {
  if (room.game.phase === 'done') finishHand(room, now);
  else resetTurn(room, now);
}

/**
 * Yang dijadwalkan berikutnya: { at, kind } atau null.
 * kind: 'bot' (kursi bot / keluar / otomatis), 'offline' (pemain putus), 'timeout', 'start' / 'next' / 'close' (Ranked).
 */
export function due(room, online = () => true) {
  if (room.status === 'playing') {
    const g = room.game;
    const s = room.seats[g.turn];
    if (isAuto(s)) return { at: room.turnAt + BOT_MS, kind: 'bot' };
    if (!online(s.id)) return { at: Math.min(room.deadline, room.turnAt + OFFLINE_TURN_MS), kind: 'offline' };
    return { at: room.deadline, kind: 'timeout' };
  }
  if (room.kind !== 'ranked') return null;
  if (room.status === 'lobby') {
    if (!activeHumans(room).length) return { at: room.createdAt + 60000, kind: 'close' };
    return { at: room.startAt, kind: 'start' };
  }
  if (room.status === 'result') return room.last?.settled ? { at: room.nextAt, kind: 'next' } : null; // menunggu server akun
  return null;
}

/** Kerjakan giliran otomatis yang sudah jatuh tempo (bot / pemain putus / waktu habis). -> true kalau ada yang berubah. */
export function step(room, now, online = () => true) {
  const d = due(room, online);
  if (!d || now < d.at || room.status !== 'playing') return false;
  const g = room.game;
  const seat = g.turn;
  const s = room.seats[seat];
  const rnd = mulberry32(mixSeed(g.seed, g.plays.length * 7 + seat));
  let a;
  if (d.kind === 'bot') a = botAction(g, seat, s.bot ? room.level : room.kind === 'ranked' ? 'hard' : 'normal', rnd);
  else if (d.kind === 'offline') a = botAction(g, seat, 'normal', rnd);
  else {
    a = timeoutAction(g, seat);
    s.afk = (s.afk || 0) + 1;
    if (s.afk >= AFK_LIMIT) s.auto = true;
  }
  let res = applyAction(g, seat, a);
  if (!res.ok) res = applyAction(g, seat, timeoutAction(g, seat)); // pengaman: tidak boleh macet
  after(room, now);
  return res.ok;
}

function finishHand(room, now) {
  const g = room.game;
  const r = g.result;
  r.points.forEach((p, i) => { room.totals[i] += p; });
  const abandoned = room.seats.map((s) => human(s) && (!!s.left || (!!s.offSince && now - s.offSince >= ABANDON_MS)));
  for (const s of room.seats) if (human(s)) s.idle = s.autoHand && s.auto ? (s.idle || 0) + 1 : 0;
  room.last = { round: room.round, winner: r.winner, points: r.points, rows: r.rows, abandoned };
  room.status = 'result';
  room.deadline = 0;
  if (room.kind === 'ranked') {
    room.last.settled = false;
    room.last.ratings = new Array(N).fill(null);
    room.last.coins = r.points.map((p) => p * room.ranked.stake); // sementara; angka pasti (saldo tidak bisa minus) dari server akun
    room.last.bonus = new Array(N).fill(0);
    room.nextAt = now + RANKED_NEXT_MS;
  }
}

// ---------- Ranked ----------
// Kursi dipesan server setelah akun diverifikasi server akun (reserve). seat.id = kunci rahasia kursi (dipakai klien untuk menyambung),
// seat.userId = id akun bersama, seat.coins = saldo akun terakhir yang diketahui (keduanya TIDAK PERNAH keluar ke klien lain).
// Tanpa host: mulai RANKED_WAIT_MS setelah pemain pertama, ronde berikutnya otomatis. Pemain baru saat ronde berjalan menunggu,
// lalu menggantikan bot di ronde berikutnya. Koin kurang dari minimal meja = dilepas sebelum ronde berikutnya.

export function createRanked(code, stake, now) {
  const r = base(code, 'ranked', now, 'hard');
  r.ranked = { stake: isStake(stake) ? Number(stake) : STAKES[0] };
  return r;
}

export const isPending = (room, id) => room.pending.some((p) => p.id === id);
const replaceable = (room) => room.seats.filter((s) => s && (s.bot || s.left)).length;

export function joinable(room) {
  if (room.kind !== 'ranked' || room.status === 'closed') return false;
  return room.status === 'lobby' ? room.seats.some((s) => !s) : room.pending.length < replaceable(room);
}

export function seatedUser(room, userId) {
  const s = room.seats.find((x) => human(x) && x.userId === userId) || room.pending.find((p) => p.userId === userId);
  return s ? { key: s.id, left: !!s.left } : null;
}

/** user = { key, userId, name, avatar, rating, coins } (sudah diverifikasi). Satu akun satu kursi. -> { ok, key } | { ok:false, error } */
export function reserve(room, user, now) {
  if (room.kind !== 'ranked' || room.status === 'closed') return { ok: false, error: 'Meja sudah ditutup' };
  const mine = room.seats.find((s) => human(s) && s.userId === user.userId) || room.pending.find((p) => p.userId === user.userId);
  if (mine) {
    mine.left = false;
    mine.auto = false;
    mine.afk = 0;
    mine.idle = 0;
    if (Number.isFinite(user.rating)) mine.rating = user.rating;
    if (Number.isFinite(user.coins)) mine.coins = user.coins;
    return { ok: true, key: mine.id };
  }
  if (!(user.coins >= minEntry(room.ranked.stake))) return { ok: false, error: 'Koin tidak cukup untuk meja ini' };
  if (!joinable(room)) return { ok: false, error: 'Meja penuh' };
  const seat = {
    id: user.key, userId: user.userId, name: cleanName(user.name), avatar: clampAvatar(user.avatar) ?? 0,
    rating: Number(user.rating) || 0, coins: Number(user.coins) || 0,
    offSince: now, // belum tersambung: kalau tidak pernah masuk meja, dihitung kabur setelah ABANDON_MS (markOnline mengosongkan ini)
  };
  if (room.status !== 'lobby') {
    room.pending.push(seat);
    return { ok: true, key: seat.id };
  }
  noDupAvatar(room, seat);
  room.seats[room.seats.findIndex((s) => !s)] = seat;
  const n = activeHumans(room).length;
  if (n === 1) room.startAt = now + RANKED_WAIT_MS;
  if (n === N) room.startAt = now;
  return { ok: true, key: seat.id };
}

/** Yang harus dikerjakan meja Ranked di luar giliran: 'start' | 'next' | 'close' | null. */
export function rankedDue(room, now) {
  if (room.kind !== 'ranked') return null;
  if (room.status === 'lobby') {
    if (!activeHumans(room).length) return now - room.createdAt > 60000 ? 'close' : null;
    return now >= room.startAt ? 'start' : null;
  }
  if (room.status === 'result' && room.last?.settled) return now >= room.nextAt ? 'next' : null;
  return null;
}

export function startRanked(room, seed, now, rnd) {
  fillBots(room, rnd);
  dealRound(room, seed, now);
}

/**
 * Ronde Ranked berikutnya. Kursi pemain yang keluar / kabur / tidak aktif / koinnya kurang dilepas, pemain yang menunggu masuk
 * (menggantikan kursi lepas atau bot), sisanya bot. Tidak ada pemain lagi → meja ditutup.
 * -> { closed, removed: { [kunci kursi]: alasan } }
 */
export function nextRanked(room, seed, now, rnd) {
  const min = minEntry(room.ranked.stake);
  const removed = {};
  const free = [];
  room.seats.forEach((s, i) => {
    if (!human(s)) return;
    const why = s.left ? 'keluar'
      : room.last?.abandoned?.[i] ? 'Koneksi putus terlalu lama, kursimu diisi bot'
        : (s.idle || 0) >= IDLE_HANDS ? 'Kamu dikeluarkan dari meja karena tidak aktif 2 ronde'
          : !(s.coins >= min) ? 'Koin tidak cukup untuk lanjut di meja ini' : '';
    if (!why) return;
    if (!s.left) removed[s.id] = why;
    room.seats[i] = null;
    free.push(i);
  });
  room.seats.forEach((s, i) => { if (s?.bot) free.push(i); });
  for (const p of room.pending) {
    if (!free.length) { removed[p.id] = 'Meja penuh, coba cari meja lagi'; continue; }
    if (!(p.coins >= min)) { removed[p.id] = 'Koin tidak cukup untuk lanjut di meja ini'; continue; }
    const i = free.shift();
    room.seats[i] = p;
    noDupAvatar(room, p, i);
    room.totals[i] = 0;
  }
  room.pending = [];
  if (!activeHumans(room).length) {
    room.status = 'closed';
    return { closed: true, removed };
  }
  // bot yang avatarnya bentrok dengan pemain baru diganti
  const humanAv = new Set(room.seats.filter(human).map((s) => s.avatar));
  room.seats.forEach((s, i) => { if (s?.bot && humanAv.has(s.avatar)) { room.seats[i] = null; room.totals[i] = 0; } });
  room.seats.forEach((s, i) => { if (!s) room.totals[i] = 0; });
  fillBots(room, rnd);
  dealRound(room, seed, now);
  return { closed: false, removed };
}

/**
 * Hasil ronde untuk server akun (CapsaBantingGate.settle di repo games-mahjong0hk, worker/banting.js `cleanBantingSettle`).
 * Server akun menghitung ulang poin dari `left` & `twos`, jadi poin tidak ikut dikirim. Bot tanpa userId.
 */
export function settlePayload(room) {
  const L = room.last;
  const hands = room.game.hands;
  return {
    gameId: `${room.code}:${L.round}:${room.createdAt.toString(36)}`,
    stake: room.ranked.stake, winner: L.winner,
    seats: room.seats.map((s, i) => ({
      ...(human(s) ? { userId: s.userId, name: s.name, bot: false, abandoned: !!L.abandoned[i] } : { userId: null, name: s.name, bot: true }),
      left: hands[i].length, twos: countTwos(hands[i]),
    })),
  };
}

/** Jawaban server akun: { [userId]: { delta, rating, tier, coinDelta, coins, bonus } }. */
export function applySettle(room, res) {
  room.seats.forEach((s, i) => {
    const r = human(s) && res ? res[s.userId] : null;
    if (!r) {
      if (human(s)) room.last.coins[i] = 0; // server akun tidak mencatat kursi ini: tidak ada koin yang berpindah
      return;
    }
    room.last.ratings[i] = r.delta;
    if (Number.isFinite(r.coinDelta)) room.last.coins[i] = r.coinDelta;
    room.last.bonus[i] = r.bonus || 0;
    s.rating = r.rating;
    s.tier = r.tier;
    if (Number.isFinite(r.coins)) s.coins = r.coins;
  });
  room.last.settled = true;
}

/** Yang boleh dilihat pemain di kursi `seat` (-1 = menunggu/penonton). Tanpa id pemain, userId, saldo, atau rating orang lain. */
export function viewFor(room, seat, online = () => true, viewerId = '') {
  const me = seat >= 0 ? room.seats[seat] : room.pending.find((p) => p.id === viewerId);
  const L = room.last;
  return {
    code: room.code, kind: room.kind, status: room.status, round: room.round, seat, level: room.level,
    host: room.seats.findIndex((s) => human(s) && s.id === room.hostId),
    seats: room.seats.map((s) => s && {
      name: s.name, avatar: s.avatar, bot: !!s.bot, left: !!s.left, auto: !!s.auto,
      online: !!s.bot || online(s.id),
    }),
    totals: room.totals,
    game: room.game && room.status !== 'lobby' ? gameView(room.game, seat) : null,
    deadline: room.status === 'playing' ? room.deadline : 0,
    turnAt: room.status === 'playing' ? room.turnAt : 0,
    stake: room.kind === 'ranked' ? room.ranked.stake : room.stake || 0,
    ranked: room.kind === 'ranked' ? {
      stake: room.ranked.stake, rating: me?.rating ?? null, tier: me?.tier ?? null, coins: me?.coins ?? null,
      waiting: seat < 0 && !!me, startAt: room.startAt, nextAt: room.nextAt,
    } : null,
    last: L && room.status === 'result' ? {
      round: L.round, winner: L.winner, points: L.points, rows: L.rows, abandoned: L.abandoned, settled: L.settled ?? true,
      coins: L.coins || null, bonus: seat >= 0 && L.bonus ? L.bonus[seat] : 0,
      myRating: seat >= 0 && L.ratings ? L.ratings[seat] : null,
    } : null,
  };
}
