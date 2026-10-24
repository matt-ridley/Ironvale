// The credits that roll after the ending (Act 4), from the save: who came along depends on what you did. The Credits
// scene shows them. No Phaser here.
import { callName, titleOf } from "./hero.js";

/* The lines that roll, given the save: the hero first, then everyone who came along, then the end. */
export function creditLines(state) {
  const f = state.flags, h = state.hero;
  const lines = ["IRONVALE", "", `${callName(h) || "The Hero"}, ${titleOf(f)}`, "", "", "THE WARDENS", "", "Colleen, the last of them", "Matt, their captain", "",
    "THE SISTERS", "", "Claire, of the wildwood", "Rachel, and Quill", "Megan, of Willowmere", "Robyn, of the Dawn", "",
    "AT THE KEEP", "", "Hild, steward", "Brannoc, smith"];
  if (f.matthewFound) lines.push("Corwin, archer");
  if (f.meganPledged) lines.push("Dunstan, mapmaker");
  if (f.refugeesHelped) lines.push("Snik and Grub, goblins");
  lines.push("Pip, Junior Warden", "");
  if (f.thorneSpared) lines.push("AND IN THE CELLS", "", "Aldric Thorne, scholar", "");
  lines.push("", "THE GREAT ONE", "", "Vorthax", "(it had a name, and you knew it)", "", "", "", "THE END", "", "...for now.");
  return lines;
}
