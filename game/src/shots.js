// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot that cooks
// what the first ticket needs and serves it, so every frame is what a real
// short game looks like and the same seed always gives the same frame.
import { STEP, recipeById } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function stepFor(world, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) world.step(STEP);
}

/** Cook + plate everything the given ticket needs, then serve it. */
function serveFirstTicket(world) {
  // Clean slate: a failed round must not leave a stale plate or burner behind.
  world.state.plate = [];
  world.state.burners = [{ item: null }, { item: null }];
  // Wait for a ticket to arrive if the board is momentarily empty.
  let waited = 0;
  while (world.state.tickets.length === 0 && world.state.phase === 'play' && waited < 20) {
    stepFor(world, 0.5);
    waited += 0.5;
  }
  const ticket = world.state.tickets[0];
  if (!ticket) return false;
  const recipe = recipeById(ticket.recipeId);
  if (!recipe) return false;
  for (const id of recipe.items) {
    world.addIngredient(id);
    stepFor(world, 0.2);
  }
  // Wait for the burner items to finish, then collect them to the plate.
  for (let i = 0; i < 60; i += 1) {
    stepFor(world, 0.2);
    for (let b = 0; b < 2; b += 1) {
      const item = world.state.burners[b].item;
      if (item && item.done && !item.burnt) world.clickBurner(b);
    }
    if (world.state.plate.length === recipe.items.length) break;
    if (world.state.phase !== 'play') return false;
  }
  if (world.state.plate.length !== recipe.items.length) return false;
  return world.serve() !== 0;
}

/** Start a second dish: 2 of 3 ingredients on the plate, one still cooking. */
function buildMidAssembly(world) {
  const ticket = world.state.tickets[0];
  if (!ticket) return;
  const recipe = recipeById(ticket.recipeId);
  if (!recipe) return;
  world.addIngredient(recipe.items[0]);
  stepFor(world, 0.2);
  world.addIngredient(recipe.items[1]);
  stepFor(world, 4.6);
  for (let b = 0; b < 2; b += 1) {
    const item = world.state.burners[b].item;
    if (item && item.done && !item.burnt) world.clickBurner(b);
  }
  stepFor(world, 0.5);
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0 };
  }

  world.startShift();
  if (name === 'end') {
    // A long, busy shift that ends with a real score on the board.
    for (let round = 0; round < 4 && world.state.phase === 'play'; round += 1) {
      serveFirstTicket(world);
    }
    world.state.shiftLeft = 0.4;
    stepFor(world, 1);
    return { screen: SCREEN_OVER, best: world.state.coins };
  }

  // PLAY: one dish served (visible on the serving counter), then a second
  // dish mid-assembly — 2 of 3 ingredients on the plate.
  serveFirstTicket(world);
  buildMidAssembly(world);
  return { screen: SCREEN_PLAY, best: world.state.coins };
}
