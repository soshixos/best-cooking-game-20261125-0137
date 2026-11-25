// Dapur Soshixos — every tuning number, colour and layout rect in one place.
// Logical field 1280x720; the renderer scales it to the window.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const BEST_KEY = 'dapur-soshixos.best';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const COOK_SECONDS = 4;
export const BURN_SECONDS = 4;
export const TICKET_SECONDS = 45;
export const MAX_TICKETS = 3;
export const PLATE_SLOTS = 3;

export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', key: '1', color: '#f3e5c0', dark: '#8a6d3b', cook: false, glyph: 'N' },
  { id: 'ayam', name: 'Ayam', key: '2', color: '#e8913a', dark: '#7a3c00', cook: true, glyph: 'A' },
  { id: 'telur', name: 'Telur', key: '3', color: '#f7d774', dark: '#8a6d00', cook: true, glyph: 'T' },
  { id: 'cabai', name: 'Cabai', key: '4', color: '#e23b3b', dark: '#ffffff', cook: false, glyph: 'C' },
  { id: 'sayur', name: 'Sayur', key: '5', color: '#58b368', dark: '#0d3d16', cook: false, glyph: 'S' },
  { id: 'saus', name: 'Saus', key: '6', color: '#a05a2c', dark: '#ffffff', cook: false, glyph: 'K' },
];

export const RECIPES = [
  { id: 'nasi-ayam', name: 'Nasi Ayam Pedas', items: ['nasi', 'ayam', 'cabai'], price: 25 },
  { id: 'nasi-telur', name: 'Nasi Telur Sayur', items: ['nasi', 'telur', 'sayur'], price: 22 },
  { id: 'ayam-pedas', name: 'Ayam Saus Pedas', items: ['ayam', 'cabai', 'saus'], price: 28 },
  { id: 'telur-sayur', name: 'Telur Sayur Saus', items: ['telur', 'sayur', 'saus'], price: 20 },
  { id: 'nasi-saus', name: 'Nasi Ayam Saus', items: ['nasi', 'ayam', 'saus'], price: 26 },
];

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id);
}
export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

// ---- Layout (shared by render + input hit-testing) ----
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 52 },
  board: { x: 16, y: 60, w: 1248, h: 108 },
  ticket: { w: 396, h: 92, gap: 28 },
  bins: { x: 16, y: 192, w: 196, h: 112, gap: 16 },
  stove: { x: 16, y: 330, w: 400, h: 250 },
  burner: { w: 168, h: 150, gap: 32 },
  plate: { x: 470, y: 330, w: 340, h: 250 },
  serve: { x: 864, y: 330, w: 400, h: 250 },
  trash: { x: 470, y: 596, w: 340, h: 52 },
  startButton: { x: 490, y: 520, w: 300, h: 64 },
};

export function binRect(index) {
  const b = LAYOUT.bins;
  return { x: b.x + index * (b.w + b.gap), y: b.y, w: b.w, h: b.h };
}
export function ticketRect(index) {
  const t = LAYOUT.ticket;
  return { x: LAYOUT.board.x + 8 + index * (t.w + t.gap), y: LAYOUT.board.y + 8, w: t.w, h: t.h };
}
export function burnerRect(index) {
  const s = LAYOUT.stove;
  return { x: s.x + 24 + index * (LAYOUT.burner.w + LAYOUT.burner.gap), y: s.y + 74, w: LAYOUT.burner.w, h: LAYOUT.burner.h };
}
export function plateSlotRect(index) {
  const p = LAYOUT.plate;
  const size = 84;
  const total = PLATE_SLOTS * size + 2 * 18;
  const startX = p.x + (p.w - total) / 2;
  return { x: startX + index * (size + 18), y: p.y + 96, w: size, h: size };
}

export const PALETTE = {
  backdrop: '#1d140d',
  wall: '#f7d9a0',
  wallDark: '#eec27a',
  floor: '#8a5a2e',
  counter: '#c98f4e',
  counterTop: '#e8b878',
  board: '#3d2b1f',
  boardEdge: '#6b4a2f',
  panel: '#fff8e7',
  text: '#2b1d12',
  muted: '#7a5c3e',
  ticket: '#fff3d6',
  ticketUrgent: '#ffe0d6',
  stove: '#4a4a55',
  burnerOff: '#2c2c34',
  flame: '#ff8c1a',
  plate: '#ffffff',
  serve: '#2e7d32',
  serveReady: '#43a047',
  gold: '#f2c94c',
  red: '#d32f2f',
  green: '#2e7d32',
  ink: '#241708',
};
