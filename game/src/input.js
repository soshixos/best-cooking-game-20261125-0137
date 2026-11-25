// Keyboard + mouse input. Pointer clicks are translated to logical 1280x720
// coordinates and hit-tested against the layout rects; one-shot presses are
// queued as bit flags and taken once by the loop.
import { FIELD, INGREDIENTS, LAYOUT, binRect, burnerRect, plateSlotRect } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_RESTART = 8;
export const ACTION_CLEAR = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const CLEAR = new Set(['Backspace', 'Delete']);

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Which interactive zone a logical point falls in, or null. */
export function zoneAt(x, y) {
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (inside(x, y, binRect(i))) return { type: 'ingredient', index: i };
  }
  for (let i = 0; i < 2; i += 1) {
    if (inside(x, y, burnerRect(i))) return { type: 'burner', index: i };
  }
  if (inside(x, y, LAYOUT.serve)) return { type: 'serve' };
  if (inside(x, y, LAYOUT.trash)) return { type: 'clear' };
  for (let i = 0; i < 3; i += 1) {
    if (inside(x, y, plateSlotRect(i))) return { type: 'plate', index: i };
  }
  if (inside(x, y, LAYOUT.startButton)) return { type: 'confirm' };
  return null;
}

export function createInput(canvas, onZone) {
  let actions = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (CLEAR.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CLEAR;
    } else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= INGREDIENTS.length && !event.repeat) {
        onZone({ type: 'ingredient', index: n - 1 });
      } else return;
    } else if (event.code === 'KeyB') {
      if (!event.repeat) onZone({ type: 'burner', index: 0 });
      else return;
    } else if (event.code === 'KeyN') {
      if (!event.repeat) onZone({ type: 'burner', index: 1 });
      else return;
    } else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    const zone = zoneAt(point.x, point.y);
    if (zone) {
      if (zone.type === 'confirm') actions |= ACTION_CONFIRM;
      else if (zone.type === 'serve') actions |= ACTION_SERVE;
      else if (zone.type === 'clear') actions |= ACTION_CLEAR;
      else onZone(zone);
    } else {
      actions |= ACTION_CONFIRM;
    }
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
