// Drawing only: world state + screen in, pixels out. 1280x720 logical field,
// scaled to fit the window. Flat colours, big readable labels — the screenshots
// must read at a glance: kitchen, order board, ingredients, dish mid-assembly,
// timers, plate ready to serve.
import {
  FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, binRect, burnerRect, ingredientById,
  plateSlotRect, recipeById, ticketRect,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function plateMatches(state) {
  if (state.plate.length === 0) return false;
  const ids = state.plate.map((p) => p.id).sort();
  return state.tickets.some((ticket) => {
    const want = recipeById(ticket.recipeId).items.slice().sort();
    return want.length === ids.length && want.every((id, i) => id === ids[i]);
  });
}

function starsFor(served) {
  if (served >= 10) return 3;
  if (served >= 7) return 2;
  if (served >= 4) return 1;
  return 0;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', bold = false) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function rect(x, y, w, h, color, radius = 0) {
    ctx.fillStyle = color;
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
    } else ctx.fillRect(x, y, w, h);
  }

  function outline(x, y, w, h, color, width = 2, radius = 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();
  }

  function ingredientDisc(cx, cy, r, ing, cooked = true, burnt = false) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = burnt ? '#1a1a1a' : ing.color;
    ctx.fill();
    ctx.strokeStyle = burnt ? '#000' : '#00000033';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(burnt ? 'X' : ing.glyph, cx, cy + r * 0.38, Math.round(r * 0.9), burnt ? '#fff' : ing.dark, 'center', true);
    if (ing.cook && !burnt) {
      text(cooked ? '✓' : '~', cx + r * 0.7, cy - r * 0.55, 20, cooked ? PALETTE.green : '#b26a00', 'center', true);
    }
  }

  function recipeIcons(recipe, x, y, r) {
    recipe.items.forEach((id, i) => {
      ingredientDisc(x + i * (r * 2 + 8) + r, y + r, r, ingredientById(id));
    });
  }

  function drawTopBar(state) {
    rect(0, 0, FIELD.width, LAYOUT.topBar.h, PALETTE.board);
    text('🍳  DAPUR SOSHIXOS', 20, 36, 28, '#ffd98a', 'left', true);
    const shiftUrgent = state.shiftLeft <= 30;
    text(`SHIFT  ${fmtTime(state.shiftLeft)}`, FIELD.width / 2, 37, 30, shiftUrgent ? '#ff8a80' : '#ffffff', 'center', true);
    text(`🪙 ${state.coins} koin`, 840, 36, 26, PALETTE.gold, 'left', true);
    text(`🍽 ${state.served}`, 1010, 36, 22, '#ffffff', 'left');
    text(`🔥 kombo x${state.combo}`, 1260, 36, 22, state.combo >= 3 ? '#ffab40' : '#ffffff', 'right', true);
  }

  function drawBoard(state) {
    const b = LAYOUT.board;
    rect(b.x, b.y, b.w, b.h, PALETTE.boardEdge, 12);
    text('📋  PAPAN PESANAN', b.x + 14, b.y + 24, 18, '#ffd98a', 'left', true);
    if (state.tickets.length === 0) {
      text('Belum ada pesanan — tunggu sebentar…', b.x + 14, b.y + 66, 20, '#ffffff', 'left');
      return;
    }
    state.tickets.forEach((ticket, i) => {
      const r = ticketRect(i);
      const recipe = recipeById(ticket.recipeId);
      const urgent = ticket.timeLeft <= 12;
      rect(r.x, r.y, r.w, r.h, urgent ? PALETTE.ticketUrgent : PALETTE.ticket, 10);
      outline(r.x, r.y, r.w, r.h, urgent ? PALETTE.red : '#c9a86a', 2, 10);
      text(`#${ticket.id}  ${recipe.name}`, r.x + 14, r.y + 28, 20, PALETTE.text, 'left', true);
      text(`Rp ${recipe.price}  •  ${fmtTime(ticket.timeLeft)}`, r.x + 14, r.y + 54, 18, urgent ? PALETTE.red : PALETTE.muted, 'left', true);
      // Timer bar.
      const frac = Math.max(0, ticket.timeLeft / ticket.maxTime);
      rect(r.x + 14, r.y + 66, r.w - 28, 12, '#e0cba8', 6);
      rect(r.x + 14, r.y + 66, (r.w - 28) * frac, 12, urgent ? PALETTE.red : PALETTE.green, 6);
      recipeIcons(recipe, r.x + r.w - 118, r.y + 8, 15);
    });
  }

  function drawBins(state) {
    text('BAHAN — klik / tekan 1-6', LAYOUT.bins.x, LAYOUT.bins.y - 10, 18, PALETTE.text, 'left', true);
    INGREDIENTS.forEach((ing, i) => {
      const r = binRect(i);
      const onPlate = state.plate.some((p) => p.id === ing.id);
      const cooking = state.burners.some((b) => b.item && b.item.id === ing.id);
      rect(r.x, r.y, r.w, r.h, onPlate || cooking ? '#ffe9b0' : PALETTE.panel, 12);
      outline(r.x, r.y, r.w, r.h, onPlate || cooking ? PALETTE.gold : '#c9a86a', onPlate || cooking ? 4 : 2, 12);
      ingredientDisc(r.x + r.w / 2, r.y + 46, 30, ing);
      text(ing.name, r.x + r.w / 2, r.y + 94, 22, PALETTE.text, 'center', true);
      text(ing.cook ? '🔥 perlu dimasak' : 'siap saji', r.x + r.w / 2, r.y + 112, 14, PALETTE.muted, 'center');
      rect(r.x + 8, r.y + 8, 26, 26, PALETTE.board, 6);
      text(ing.key, r.x + 21, r.y + 27, 17, '#ffd98a', 'center', true);
    });
  }

  function drawStove(state) {
    const s = LAYOUT.stove;
    rect(s.x, s.y, s.w, s.h, PALETTE.stove, 14);
    text('🔥  KOMPOR — klik saat DONE', s.x + 20, s.y + 34, 20, '#ffffff', 'left', true);
    state.burners.forEach((burner, i) => {
      const r = burnerRect(i);
      rect(r.x, r.y, r.w, r.h, PALETTE.burnerOff, 12);
      const item = burner.item;
      if (!item) {
        text('— kosong —', r.x + r.w / 2, r.y + r.h / 2 + 6, 18, '#8b93a3', 'center');
        return;
      }
      const ing = ingredientById(item.id);
      // Flame ring while cooking.
      if (!item.done && !item.burnt) {
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + 62, 46, 0, Math.PI * 2);
        ctx.strokeStyle = PALETTE.flame;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ingredientDisc(r.x + r.w / 2, r.y + 62, 34, ing, item.done, item.burnt);
      text(ing.name, r.x + r.w / 2, r.y + 118, 18, '#ffffff', 'center', true);
      if (item.burnt) {
        text('GOSONG! klik buang', r.x + r.w / 2, r.y + 142, 16, '#ff8a80', 'center', true);
      } else if (item.done) {
        rect(r.x + 14, r.y + 128, r.w - 28, 20, PALETTE.green, 10);
        text(`DONE — ambil! (${Math.ceil(item.burnLeft)}s)`, r.x + r.w / 2, r.y + 143, 15, '#ffffff', 'center', true);
      } else {
        rect(r.x + 14, r.y + 128, r.w - 28, 14, '#55555f', 7);
        rect(r.x + 14, r.y + 128, (r.w - 28) * item.progress, 14, PALETTE.flame, 7);
      }
    });
  }

  function drawPlate(state) {
    const p = LAYOUT.plate;
    const ready = plateMatches(state);
    rect(p.x, p.y, p.w, p.h, ready ? '#e8f5e9' : PALETTE.panel, 14);
    outline(p.x, p.y, p.w, p.h, ready ? PALETTE.green : '#c9a86a', ready ? 4 : 2, 14);
    text('🍽  PIRING', p.x + 20, p.y + 34, 20, PALETTE.text, 'left', true);
    text(`${state.plate.length}/${3} bahan`, p.x + p.w - 20, p.y + 34, 18, PALETTE.muted, 'right');
    // Plate circle.
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 150, 78, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.plate;
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 150, 56, 0, Math.PI * 2);
    ctx.strokeStyle = '#e0cba8';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const r = plateSlotRect(i);
      const item = state.plate[i];
      if (item) {
        ingredientDisc(r.x + r.w / 2, r.y + r.h / 2, 34, ingredientById(item.id));
        text(ingredientById(item.id).name, r.x + r.w / 2, r.y + r.h + 18, 15, PALETTE.text, 'center', true);
      } else {
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 30, 0, Math.PI * 2);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#c9a86a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (ready) {
      text('✅ RESEP COCOK — SAJIKAN!', p.x + p.w / 2, p.y + 232, 20, PALETTE.green, 'center', true);
    } else if (state.plate.length > 0) {
      text('Lengkapi sesuai tiket di papan pesanan', p.x + p.w / 2, p.y + 232, 15, PALETTE.muted, 'center');
    } else {
      text('Klik bahan untuk mulai meracik', p.x + p.w / 2, p.y + 232, 15, PALETTE.muted, 'center');
    }
  }

  function drawServe(state) {
    const s = LAYOUT.serve;
    const ready = plateMatches(state);
    rect(s.x, s.y, s.w, s.h, PALETTE.panel, 14);
    outline(s.x, s.y, s.w, s.h, ready ? PALETTE.green : '#c9a86a', ready ? 4 : 2, 14);
    text('🛎  JENDELA SAJI — klik / Spasi', s.x + 20, s.y + 34, 20, PALETTE.text, 'left', true);
    // Serving counter with the last served dish.
    rect(s.x + 20, s.y + 56, s.w - 40, 96, '#f3e5c0', 10);
    if (state.servedDish) {
      const recipe = recipeById(state.servedDish.recipeId);
      text(`✅ ${recipe.name} — tersaji!`, s.x + 36, s.y + 92, 20, PALETTE.green, 'left', true);
      recipeIcons(recipe, s.x + 36, s.y + 104, 13);
    } else {
      text('Belum ada hidangan tersaji', s.x + 36, s.y + 92, 20, PALETTE.muted, 'left');
      text('Sajikan resep yang cocok di sini', s.x + 36, s.y + 118, 16, PALETTE.muted, 'left');
    }
    // Big serve button.
    const bx = s.x + 20, by = s.y + 168, bw = s.w - 40, bh = 62;
    rect(bx, by, bw, bh, ready ? PALETTE.serveReady : '#9e9e9e', 12);
    text(ready ? '🔔  SAJIKAN SEKARANG  (Spasi)' : 'SAJIKAN  (Spasi)', bx + bw / 2, by + 40, 24, '#ffffff', 'center', true);
    if (state.toast) {
      text(state.toast.text, s.x + s.w / 2, s.y + 246, 17, PALETTE.text, 'center', true);
    }
  }

  function drawTrash(state) {
    const t = LAYOUT.trash;
    rect(t.x, t.y, t.w, t.h, '#efebe9', 10);
    outline(t.x, t.y, t.w, t.h, '#bcaaa4', 2, 10);
    text('🗑  Kosongkan piring  (Backspace)', t.x + t.w / 2, t.y + 34, 18, PALETTE.muted, 'center', true);
  }

  function drawKitchen(state) {
    // Wall + floor + counter band.
    rect(0, 0, FIELD.width, FIELD.height, PALETTE.wall);
    rect(0, 168, FIELD.width, 14, PALETTE.wallDark);
    rect(0, 596, FIELD.width, 124, PALETTE.floor);
    // Tile lines.
    ctx.strokeStyle = '#00000012';
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 168); ctx.stroke();
    }
    drawTopBar(state);
    drawBoard(state);
    drawBins(state);
    drawStove(state);
    drawPlate(state);
    drawServe(state);
    drawTrash(state);
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    rect(0, 0, FIELD.width, FIELD.height, '#00000088');
    rect(x, y, width, height, PALETTE.panel, 16);
    outline(x, y, width, height, PALETTE.gold, 3, 16);
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center', true);
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 128 + i * 34, 21, PALETTE.muted, 'center'));
    text(prompt, FIELD.width / 2, y + height - 34, 22, PALETTE.green, 'center', true);
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('🍳  DAPUR SOSHIXOS', [
        'Masak pesanan, sajikan tepat waktu, kejar kombo!',
        'Klik bahan (atau 1-6) • Ayam & Telur dimasak di kompor',
        'Klik kompor saat DONE • Sajikan di jendela (Spasi)',
        `Skor terbaik: ${best} koin`,
      ], 'Klik atau tekan Enter untuk mulai');
      // Start button hint drawn on the panel area.
      const b = LAYOUT.startButton;
      rect(b.x, b.y, b.w, b.h, PALETTE.serveReady, 12);
      text('▶  MULAI SHIFT', FIELD.width / 2, b.y + 42, 26, '#ffffff', 'center', true);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Jeda', ['Masakan menunggu…'], 'Tekan P untuk lanjut');
      return;
    }
    if (screen === SCREEN_OVER) {
      const n = starsFor(state.served);
      const stars = '★'.repeat(n) + '☆'.repeat(3 - n);
      drawPanel('⏰  SHIFT SELESAI!', [
        `${stars}`,
        `Koin: ${state.coins}   •   Hidangan disajikan: ${state.served}`,
        `Kombo terbaik: x${state.bestCombo}   •   Skor terbaik: ${best}`,
      ], 'Tekan R atau klik untuk main lagi');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
