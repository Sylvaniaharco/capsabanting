// Pencari meja Ranked: satu Durable Object global ("main"). Menaruh pemain di meja Ranked yang masih bisa dimasuki,
// atau membuat meja baru. Menjaga satu akun hanya duduk di satu meja Ranked. (Pola yang sama dengan DdzLobby & CapsaLobby; antrean terpisah per meja taruhan 5/10/20.)
import { DurableObject } from 'cloudflare:workers';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => [...crypto.getRandomValues(new Uint8Array(5))].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
/** Kunci rahasia kursi: hanya diberikan ke pemain yang kursinya dipesan. */
const randomKey = () => [...crypto.getRandomValues(new Uint8Array(24))].map((x) => (x % 36).toString(36)).join('');

export class BantingLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = { open: {}, active: {} }; // open: taruhan -> kode meja yang masih menerima pemain; active: id akun -> kode meja
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get('state')) || this.state;
      if (typeof this.state.open !== 'object') this.state.open = {};
    });
  }

  room(code) {
    return this.env.ROOMS.get(this.env.ROOMS.idFromName(code));
  }

  /**
   * user = { userId, name, avatar, rating, coins } (sudah diverifikasi server akun). Satu akun satu meja Ranked: kalau masih duduk di
   * meja lain (taruhan apa pun), dikembalikan ke sana. -> { ok, code, key, stake } | { ok:false, error }
   */
  async assign(stake, user) {
    const st = this.state;
    const key = randomKey();
    try {
      const cur = st.active[user.userId];
      if (cur) {
        const seat = await this.room(cur).seated(user.userId);
        if (seat && !seat.left) {
          const res = await this.room(cur).reserve({ ...user, key });
          if (res.ok) return { ok: true, code: cur, key: res.key, resumed: true, stake: res.stake };
        }
        delete st.active[user.userId];
      }
      let lastError = 'Gagal mencari meja';
      for (let i = 0; i < 3; i++) {
        let code = st.open[stake];
        if (!code) {
          code = randomCode();
          if (!(await this.room(code).initRanked(code, stake)).ok) continue;
          st.open[stake] = code;
        }
        const res = await this.room(code).reserve({ ...user, key });
        if (res.error === 'Koin tidak cukup untuk meja ini') return { ok: false, error: res.error }; // mejanya tetap terbuka untuk orang lain
        if (!res.ok || !res.joinable) st.open[stake] = '';
        if (res.ok) {
          st.active[user.userId] = code;
          return { ok: true, code, key: res.key, stake };
        }
        lastError = res.error || lastError;
      }
      return { ok: false, error: lastError };
    } finally {
      // daftar akun aktif dibatasi (meja yang sudah tutup dibersihkan saat akun itu masuk lagi)
      const ids = Object.keys(st.active);
      if (ids.length > 5000) for (const id of ids.slice(0, ids.length - 5000)) delete st.active[id];
      await this.ctx.storage.put('state', st);
    }
  }

}
