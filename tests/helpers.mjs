// Test helpers.

/* An rng that makes the next dice come up as given: faces("15/20", "3/8") rolls a 15 on a d20, then a 3 on a d8.
   Throws if more dice are rolled than were scripted, so a test notices extra rolls. */
export function faces(...specs) {
  const queue = specs.map(s => s.split("/").map(Number));
  return () => {
    if (!queue.length) throw new Error("Ran out of scripted dice");
    const [value, sides] = queue.shift();
    return (value - 0.5) / sides;
  };
}
