// Koin (salinan src/engine/wallet.js repo landlord/capsa) — ikut sistem Mahjong Kung2 (worker/coins.js + src/engine/ranked.js di repo games-mahjong0hk).
// Dua saldo: koin akun (server akun, dompet bersama, hanya Ranked; angka di sini untuk tampilan & cek awal) dan koin meja bot (di HP).
// Saldo awal 1000; meja 5 / 10 / 20 koin per poin; saldo minimal masuk 100 / 5.000 / 10.000; saldo tidak bisa di bawah 0;
// kalau saldo kurang dari minimal meja termurah, direset ke 1000 jam 00:01 WIB berikutnya; Ranked pertama tiap hari = bonus harian.
export const STAKES = [5, 10, 20];
export const STAKE_MIN = { 5: 100, 10: 5000, 20: 10000 };
export const minEntry = (stake) => STAKE_MIN[stake] ?? Infinity;
export const isStake = (n) => STAKES.includes(Number(n));
export const START_COINS = 1000;
export const DAILY_BONUS = 100;
const WIB_MS = 7 * 3600e3;

/** Nomor "hari" WIB; hari baru mulai jam 00:01 WIB. */
export const wibDay = (ts) => Math.floor((ts + WIB_MS - 60e3) / 86400e3);
export const nextResetAt = (ts) => (wibDay(ts) + 1) * 86400e3 - WIB_MS + 60e3;

/** Dompet meja bot (HP): { coins, day } -> setelah reset harian (bangkrut + sudah lewat 00:01 WIB = kembali ke START_COINS). */
export function normalizeWallet(w, now) {
  const today = wibDay(now);
  if (!w || !Number.isFinite(w.coins) || !Number.isFinite(w.day)) return { coins: START_COINS, day: today };
  if (w.coins < minEntry(STAKES[0]) && today > w.day) return { coins: START_COINS, day: today };
  return { coins: Math.max(0, Math.floor(w.coins)), day: w.day };
}

export const coinDelta = (netPoints, stake) => Math.round(netPoints * stake);
export const applyDelta = (coins, delta) => Math.max(0, coins + delta);
export const allowedStakes = (coins) => STAKES.filter((s) => coins >= minEntry(s));
export const isBroke = (coins) => coins < minEntry(STAKES[0]);
