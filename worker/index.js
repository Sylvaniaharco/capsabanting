// Worker capsa-banting: file statis game + API meja online di /games/capsabanting/api/*
//
// Meja bareng teman TANPA koin/rating, jadi tidak perlu login: pemain dikenali dari id acak buatan HP-nya (kunci kursinya) + nama.
// Ranked WAJIB memverifikasi akun lewat server akun bersama (Worker games-mahjong0hk, service binding MAHJONG → CapsaBantingGate):
// klien membawa tiket sekali pakai dari /games/mahjonghk/api/auth/ticket, di sini ditukar jadi id akun + nama + saldo koin + rating.
// Koin & rating hanya berubah di server akun (CapsaBantingGate.settle), tidak pernah dari angka kiriman HP.
// Tidak ada secret / variabel yang perlu diisi untuk Worker ini.
import { BantingRoom } from './room.js';
import { BantingLobby } from './lobby.js';
import { STAKES, minEntry } from '../src/engine/wallet.js';
import { validId, cleanName, ROOM_CODE } from '../src/engine/room.js';
import { clampAvatar } from '../src/engine/roster.js';
import { validLevel } from '../src/engine/bot.js';

export { BantingRoom, BantingLobby };

const BASE = '/games/capsabanting';
const API = BASE + '/api';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function randomCode() {
  const b = crypto.getRandomValues(new Uint8Array(5));
  return [...b].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
}

/** Tolak permintaan dari situs lain: POST & WebSocket wajib dari origin game sendiri. */
function badOrigin(req, url) {
  const ws = req.headers.get('Upgrade') === 'websocket';
  if (!ws && (req.method === 'GET' || req.method === 'HEAD')) return false;
  const origin = req.headers.get('Origin');
  if (!origin) return ws;
  return origin !== url.origin;
}

const userFrom = (id, name, avatar) => (validId(id) ? { id, name: cleanName(name), avatar: clampAvatar(avatar) ?? 0 } : null);
const body = async (req) => {
  try { return JSON.parse((await req.text()).slice(0, 600)); } catch { return {}; }
};

async function handleApi(req, env, url) {
  const path = url.pathname.slice(API.length);
  if (badOrigin(req, url)) return json({ error: 'Origin tidak diizinkan' }, 403);

  if (path === '/config') return json({ online: true, ranked: !!env.MAHJONG });

  // ---------- Ranked (akun bersama, koin dompet bersama + rating Capsa Banting) ----------
  if (path === '/ranked/join' && req.method === 'POST') {
    if (!env.MAHJONG) return json({ error: 'Ranked belum tersedia' }, 503);
    const b = await body(req);
    const stake = Number(b.stake);
    if (!STAKES.includes(stake)) return json({ error: 'Meja tidak dikenal' }, 400);
    let user = null;
    try {
      user = await env.MAHJONG.redeem(b.ticket);
    } catch (e) {
      console.error('redeem gagal', String(e?.message || e));
      return json({ error: 'Server akun tidak menjawab, coba lagi' }, 503);
    }
    if (!user) return json({ error: 'Login tidak dikenali. Masuk lagi dengan Google.' }, 401);
    const lobby = env.LOBBY.get(env.LOBBY.idFromName('main'));
    const res = await lobby.assign(stake, { userId: user.id, name: cleanName(user.name), avatar: clampAvatar(b.avatar) ?? 0, rating: user.rating, coins: user.coins });
    // masih duduk di meja Ranked lain → dikembalikan ke sana (walau saldo sekarang kurang untuk meja yang dipilih)
    if (!res.ok) return json({ error: res.error === 'Koin tidak cukup untuk meja ini' ? `Meja ${stake} butuh saldo minimal ${minEntry(stake)} koin` : res.error }, res.error === 'Koin tidak cukup untuk meja ini' ? 403 : 409);
    return json({ code: res.code, key: res.key, stake: res.stake ?? stake, resumed: !!res.resumed });
  }

  // ---------- meja bareng teman ----------
  if (path === '/rooms' && req.method === 'POST') {
    const b = await body(req);
    const user = userFrom(b.id, b.name, b.avatar);
    if (!user) return json({ error: 'Data pemain tidak lengkap' }, 400);
    const level = validLevel(b.level) ? b.level : 'normal';
    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      const r = await env.ROOMS.get(env.ROOMS.idFromName(code)).init(code, user, level);
      if (r.ok) return json({ code });
    }
    return json({ error: 'Gagal membuat meja' }, 500);
  }

  const m = path.match(/^\/rooms\/([A-Z0-9]{5})(\/ws)?$/);
  if (m && ROOM_CODE.test(m[1])) {
    const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
    const id = url.searchParams.get('id');
    if (!m[2]) {
      if (req.method !== 'GET') return json({ error: 'Tidak ditemukan' }, 404);
      return json(await stub.info(validId(id) ? id : ''));
    }
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'Butuh WebSocket' }, 426);
    const user = userFrom(id, url.searchParams.get('name'), url.searchParams.get('av'));
    if (!user) return json({ error: 'Data pemain tidak lengkap' }, 400);
    if ((await stub.info(user.id)).status === 'none') return json({ error: 'Meja tidak ditemukan' }, 404);
    const h = new Headers(req.headers);
    h.set('X-User', JSON.stringify(user));
    return stub.fetch(new Request(req.url, { headers: h }));
  }
  return json({ error: 'Tidak ditemukan' }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith(API + '/')) {
      try {
        return await handleApi(req, env, url);
      } catch (e) {
        console.error(e);
        return json({ error: 'Server error' }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },
};
