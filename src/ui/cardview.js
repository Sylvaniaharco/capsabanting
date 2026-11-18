// Elemen kartu (DOM). size: 'big' (tangan sendiri) atau 'mini' (kartu yang keluar di meja / sisa kartu).
import { RANKS, rankOf, suitOf, isRed } from '../engine/cards.js';

const suitSvg = (s) => `<svg class="su" viewBox="0 0 24 24" aria-hidden="true"><use href="#su${s}"/></svg>`;
const SUIT_WORDS = ['wajik', 'keriting', 'hati', 'sekop'];

export function cardEl(c, size = 'big') {
  const el = document.createElement('div');
  el.dataset.c = c;
  const r = rankOf(c), s = suitOf(c);
  el.className = `card ${size} ${isRed(c) ? 'red' : 'blk'}`;
  el.setAttribute('aria-label', `${RANKS[r]} ${SUIT_WORDS[s]}`);
  const ix = `<span class="ix${r === 7 ? ' ten' : ''}"><b>${RANKS[r]}</b>${suitSvg(s)}</span>`;
  const art = r >= 8 && r <= 10 ? `<span class="court"><b>${RANKS[r]}</b>${suitSvg(s)}</span>` : `<span class="pip">${suitSvg(s)}</span>`;
  el.innerHTML = ix + art;
  return el;
}

export function backEl(size = 'mini') {
  const el = document.createElement('div');
  el.className = `card ${size} back`;
  return el;
}
