// A tiny conversation engine. A script is a set of nodes:
//   { speaker, text, choices: [{ label, to, if }], to, enter }
// - `start` (a node id, or a function of the game state and { object }) picks the first node.
// - `text` can be a function (state, ctx) so it can mention the last check or a reward.
// - `choices` with an `if` (a function of the state) only show when it returns true.
// - A node with no choices shows "Continue" and goes to `to`, or ends the conversation if there is no `to`.
// - `enter(state, ctx)` runs on arrival: make a check, set flags, hand out rewards, emit an event for the screen
//   (like starting a battle), or redirect with ctx.goto(id).
// No Phaser here; the Dialogue scene only shows what this returns.
import { abilityCheck, describeCheck } from "../rules/checks.js";
import { roll } from "../rules/dice.js";

export const END = null;

export function startConversation(script, state, { rng = Math.random, object = null } = {}) {
  const convo = { script, state, rng, object, node: null, ended: false, events: [], lastCheck: null };
  const first = typeof script.start === "function" ? script.start(state, { object }) : script.start;
  goTo(convo, first);
  return convo;
}

/* What to show now: { speaker, text, choices: [{ label }] }, or null once the conversation is over. */
export function view(convo) {
  if (convo.ended) return null;
  const node = convo.script.nodes[convo.node];
  const text = typeof node.text === "function" ? node.text(convo.state, context(convo)) : node.text;
  return { speaker: node.speaker || "", text, choices: visibleChoices(convo, node).map(c => ({ label: c.label })) };
}

/* Picks choice `index` of the current view (0 for "Continue"). */
export function choose(convo, index = 0) {
  if (convo.ended) return convo;
  const node = convo.script.nodes[convo.node];
  const choice = visibleChoices(convo, node)[index];
  if (!choice) return convo;
  goTo(convo, choice.to);
  return convo;
}

/* Events the screen should act on (e.g. { type: "battle" }), handed over once. */
export function takeEvents(convo) {
  const e = convo.events;
  convo.events = [];
  return e;
}

function visibleChoices(convo, node) {
  if (node.choices?.length) return node.choices.filter(c => !c.if || c.if(convo.state));
  return [{ label: node.to ? "Continue" : "Close", to: node.to ?? END }];
}

function goTo(convo, id) {
  for (let hops = 0; hops < 20; hops++) {
    if (id === END || id === undefined) { convo.ended = true; return; }
    const node = convo.script.nodes[id];
    if (!node) throw new Error(`Dialogue: no node "${id}"`);
    convo.node = id;
    let redirect;
    if (node.enter) node.enter(convo.state, { ...context(convo), goto: next => { redirect = next; } });
    // A node with no text is just a step (a check, an effect); carry on to where it points.
    if (redirect !== undefined) { id = redirect; continue; }
    if (!node.text) { id = node.to ?? END; continue; }
    return;
  }
  throw new Error("Dialogue: too many redirects");
}

function context(convo) {
  return {
    rng: convo.rng,
    object: convo.object,
    lastCheck: convo.lastCheck,
    checkText: convo.lastCheck ? describeCheck(convo.lastCheck) : "",
    check(ability, dc, opts) {
      convo.lastCheck = abilityCheck(convo.state.hero, ability, dc, convo.rng, opts);
      return convo.lastCheck;
    },
    roll: expr => roll(expr, convo.rng).total,
    emit: event => convo.events.push(event),
    remember: (key, value) => { convo[key] = value; },
    recall: key => convo[key],
  };
}
