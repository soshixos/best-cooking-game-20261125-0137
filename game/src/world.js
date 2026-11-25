// Dapur Soshixos rules and state — no drawing, no browser in here.
// Flow: click a ready ingredient -> straight onto the plate. Click a raw
// ingredient (Ayam / Telur) -> it goes on a free burner and cooks. Click a
// burner when its item is DONE -> it moves to the plate. Leave it too long
// after DONE and it burns; click the burner to throw it away. When the plate
// holds exactly one ticket's recipe, serve it at the window before the
// ticket's timer runs out. A shift lasts SHIFT_SECONDS.

import {
  BURN_SECONDS, COOK_SECONDS, FIELD, INGREDIENTS, MAX_TICKETS, PLATE_SLOTS,
  RECIPES, SHIFT_SECONDS, TICKET_SECONDS, ingredientById, recipeById,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRE = 4;
export const EVENT_BURN = 8;
export const EVENT_COOK_DONE = 16;
export const EVENT_OVER = 32;

export function createWorld(random) {
  const state = {
    phase: 'title', // title | play | over
    elapsed: 0,
    shiftLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    tickets: [], // { id, recipeId, timeLeft, maxTime }
    burners: [
      { item: null }, // { id, progress, done, burnLeft, burnt }
      { item: null },
    ],
    plate: [], // { id }
    servedDish: null, // { recipeId, timer } — last dish sitting on the serving counter
    toast: null, // { text, timer }
    spawnTimer: 14,
    ticketSeq: 0,
  };

  function say(text) {
    state.toast = { text, timer: 2.4 };
  }

  function reset() {
    state.phase = 'title';
    state.elapsed = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.coins = 0;
    state.served = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.tickets = [];
    state.burners = [{ item: null }, { item: null }];
    state.plate = [];
    state.servedDish = null;
    state.toast = null;
    state.spawnTimer = 14;
    state.ticketSeq = 0;
  }

  function spawnTicket() {
    if (state.tickets.length >= MAX_TICKETS) return;
    const used = new Set(state.tickets.map((t) => t.recipeId));
    const free = RECIPES.filter((r) => !used.has(r.id));
    const pool = free.length ? free : RECIPES;
    const recipe = pool[Math.floor(random() * pool.length)];
    state.ticketSeq += 1;
    state.tickets.push({ id: state.ticketSeq, recipeId: recipe.id, timeLeft: TICKET_SECONDS, maxTime: TICKET_SECONDS });
  }

  function startShift() {
    reset();
    state.phase = 'play';
    spawnTicket();
    spawnTicket();
    say('Shift dimulai! Sajikan pesanan sebelum waktunya habis.');
  }

  function plateIds() {
    return state.plate.map((p) => p.id).sort();
  }

  function matchingTicket() {
    const ids = plateIds();
    if (ids.length === 0) return null;
    return state.tickets.find((ticket) => {
      const want = recipeById(ticket.recipeId).items.slice().sort();
      return want.length === ids.length && want.every((id, i) => id === ids[i]);
    }) || null;
  }

  /** Click an ingredient bin (or press its key). Returns true when it did something. */
  function addIngredient(id) {
    if (state.phase !== 'play') return false;
    const ing = ingredientById(id);
    if (!ing) return false;
    if (state.plate.some((p) => p.id === id) || state.burners.some((b) => b.item && b.item.id === id)) {
      say(`${ing.name} sudah ada — jangan dobel.`);
      return false;
    }
    if (ing.cook) {
      const burner = state.burners.find((b) => b.item === null);
      if (!burner) {
        say('Kompor penuh! Tunggu masakan selesai.');
        return false;
      }
      burner.item = { id, progress: 0, done: false, burnLeft: BURN_SECONDS, burnt: false };
      return true;
    }
    if (state.plate.length >= PLATE_SLOTS) {
      say('Piring penuh! Sajikan dulu.');
      return false;
    }
    state.plate.push({ id });
    return true;
  }

  /** Click a burner: DONE item moves to the plate, burnt item is thrown away. */
  function clickBurner(index) {
    if (state.phase !== 'play') return false;
    const burner = state.burners[index];
    if (!burner || !burner.item) return false;
    if (burner.item.burnt) {
      burner.item = null;
      say('Masakan gosong dibuang!');
      return true;
    }
    if (!burner.item.done) {
      say('Masih dimasak… sabar!');
      return false;
    }
    if (state.plate.length >= PLATE_SLOTS) {
      say('Piring penuh! Sajikan dulu.');
      return false;
    }
    state.plate.push({ id: burner.item.id });
    burner.item = null;
    return true;
  }

  function clearPlate() {
    if (state.phase !== 'play' || state.plate.length === 0) return false;
    state.plate = [];
    say('Piring dikosongkan.');
    return true;
  }

  function removePlateItem(index) {
    if (state.phase !== 'play') return false;
    if (index < 0 || index >= state.plate.length) return false;
    state.plate.splice(index, 1);
    return true;
  }

  /** Serve the plate at the window (or Space). */
  function serve() {
    if (state.phase !== 'play') return 0;
    if (state.plate.length === 0) {
      say('Piring kosong — masak dulu!');
      return 0;
    }
    const ticket = matchingTicket();
    if (!ticket) {
      state.coins = Math.max(0, state.coins - 8);
      state.combo = 0;
      state.plate = [];
      say('Salah resep! -8 koin, kombo hilang.');
      return EVENT_WRONG;
    }
    const recipe = recipeById(ticket.recipeId);
    const timeBonus = Math.round((ticket.timeLeft / ticket.maxTime) * 10);
    const comboBonus = state.combo * 2;
    const earned = recipe.price + timeBonus + comboBonus;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.tickets = state.tickets.filter((t) => t.id !== ticket.id);
    state.plate = [];
    state.servedDish = { recipeId: recipe.id, timer: 6 };
    say(`+${earned} koin! ${recipe.name} tersaji.`);
    return EVENT_SERVE;
  }

  function step(dt) {
    if (state.phase !== 'play') return 0;
    let events = 0;
    state.elapsed += dt;
    state.shiftLeft -= dt;
    if (state.toast) {
      state.toast.timer -= dt;
      if (state.toast.timer <= 0) state.toast = null;
    }
    if (state.servedDish) {
      state.servedDish.timer -= dt;
      if (state.servedDish.timer <= 0) state.servedDish = null;
    }
    // Cooking.
    for (const burner of state.burners) {
      const item = burner.item;
      if (!item) continue;
      if (!item.done) {
        item.progress += dt / COOK_SECONDS;
        if (item.progress >= 1) {
          item.progress = 1;
          item.done = true;
          events |= EVENT_COOK_DONE;
          say(`${ingredientById(item.id).name} matang! Ambil cepat!`);
        }
      } else if (!item.burnt) {
        item.burnLeft -= dt;
        if (item.burnLeft <= 0) {
          item.burnt = true;
          events |= EVENT_BURN;
          say(`${ingredientById(item.id).name} GOSONG! Klik kompor untuk buang.`);
        }
      }
    }
    // Tickets.
    for (let i = state.tickets.length - 1; i >= 0; i -= 1) {
      state.tickets[i].timeLeft -= dt;
      if (state.tickets[i].timeLeft <= 0) {
        state.tickets.splice(i, 1);
        state.combo = 0;
        events |= EVENT_EXPIRE;
        say('Pesanan kedaluwarsa!');
      }
    }
    // New tickets arrive faster as the shift goes on.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnTicket();
      const rush = Math.max(9, 14 - Math.floor(state.elapsed / 45));
      state.spawnTimer = rush;
    }
    if (state.shiftLeft <= 0) {
      state.shiftLeft = 0;
      state.phase = 'over';
      events |= EVENT_OVER;
    }
    return events;
  }

  function stars() {
    if (state.served >= 10) return 3;
    if (state.served >= 7) return 2;
    if (state.served >= 4) return 1;
    return 0;
  }

  reset();
  return {
    state, reset, startShift, step, addIngredient, clickBurner,
    clearPlate, removePlateItem, serve, matchingTicket, stars,
  };
}
