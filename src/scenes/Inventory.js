// The inventory, opened over the world. Tap something you're wearing or carrying to see what it does and how it
// would change your stats, then equip it, take it off, or drink it.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { armourClass, weaponAttack } from "../rules/character.js";
import { equip, unequip, useItem, cantDrink, drinkText, describeItem, itemName, groupPack, baseOf, isPotion, SLOTS } from "../rules/items.js";
import { compareEquip, compareUnequip, averageDamage } from "../rules/gear.js";
import { text, panel, button, ListView, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const SLOT_TAG = { weapon: "WPN", shield: "SHD", armour: "ARM" };

export const damageText = a => `${a.damage}${a.damageBonus ? (a.damageBonus > 0 ? "+" : "") + a.damageBonus : ""}`;

/* A short note for a list row: damage for weapons, AC for armour and shields. */
export function itemTag(item) {
  const b = baseOf(item);
  if (b.type === "weapon") return b.damage + (item.upgrade ? `+${item.upgrade}` : "");
  if (b.type === "armour") return `AC ${b.baseAc + item.upgrade}`;
  if (b.type === "shield") return `+${b.ac + item.upgrade} AC`;
  return "";
}

export class Inventory extends Phaser.Scene {
  constructor() { super("Inventory"); }

  create() {
    uiCamera(this);
    this.current = null;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "INVENTORY", { color: COLORS.gold });
    this.goldText = text(this, WIDTH - 70, 9, "", { color: COLORS.gold }).setOrigin(1, 0);
    button(this, WIDTH - 34, 13, 56, 18, "CLOSE", () => this.close());
    this.input.keyboard.on("keydown-ESC", () => this.close());
    this.input.keyboard.on("keydown-I", () => this.close());

    panel(this, 6, 26, 192, 166);
    this.add.image(36, 68, "hero", heroFrame("down"));
    this.stats = text(this, 72, 36, "", { lineSpacing: 5 });
    text(this, 12, 110, "WORN", { color: COLORS.dim });
    this.worn = new ListView(this, 10, 122, 184, 3, row => this.pick(row, this.pack));

    panel(this, 204, 26, 270, 166);
    this.packTitle = text(this, 210, 32, "", { color: COLORS.dim });
    this.pack = new ListView(this, 208, 44, 262, 9, row => this.pick(row, this.worn));

    panel(this, 6, 198, 468, 66);
    this.name = text(this, 12, 204, "", { color: COLORS.gold });
    this.desc = text(this, 12, 218, "", { wordWrap: { width: 350 } });
    this.msg = text(this, 12, 232, "", { wordWrap: { width: 350 } });
    this.cmp = [text(this, 12, 248, ""), text(this, 100, 248, ""), text(this, 188, 248, "")];
    this.action = button(this, 422, 244, 92, 24, "", () => this.doAction());

    this.refresh();
    this.showDetail();
  }

  refresh() {
    const h = state.hero, a = weaponAttack(h);
    this.goldText.setText(`${h.gold} GOLD`);
    this.stats.setText([`LV ${h.level}`, `HP ${h.hp}/${h.maxHp}`, `AC ${armourClass(h)}`, `HIT +${a.bonus}`, `DMG ${damageText(a)}`].join("\n"));
    this.worn.setItems(SLOTS.map(slot => {
      const item = h.equipment[slot];
      return { kind: "worn", slot, item, label: item ? itemName(item) : "(nothing)", right: SLOT_TAG[slot], color: item ? COLORS.text : COLORS.dim };
    }));
    const groups = groupPack(h.inventory);
    this.packTitle.setText(`PACK (${h.inventory.length})`);
    this.pack.setItems(groups.length
      ? groups.map(g => ({ kind: "pack", item: g.item, label: g.name, right: g.count > 1 ? `x${g.count}` : itemTag(g.item) }))
      : []);
  }

  pick(row, other) {
    other.clearSelection();
    this.current = row;
    this.msg.setText("");
    this.showDetail();
  }

  showDetail() {
    const row = this.current, h = state.hero;
    for (const t of this.cmp) t.setText("");
    if (!row) {
      this.name.setText("");
      this.desc.setText(h.inventory.length ? "Tap an item to see what it does." : "Your pack is empty. Beat monsters for loot, or visit the blacksmith.");
      this.action.setVisible(false);
      return;
    }
    this.action.setVisible(true);
    if (!row.item) {
      this.name.setText(`No ${row.slot}`);
      this.desc.setText(`Pick something from your pack to wear.`);
      this.action.setLabel("TAKE OFF").setEnabled(false);
      return;
    }
    this.name.setText(itemName(row.item));
    this.desc.setText(describeItem(row.item));
    if (row.kind === "worn") {
      this.action.setLabel("TAKE OFF").setEnabled(true);
      this.showCompare(compareUnequip(h, row.slot));
    } else if (isPotion(row.item)) {
      const reason = cantDrink(h, row.item);
      this.action.setLabel("DRINK").setEnabled(!reason);
      if (reason) this.msg.setText(reason).setColor(COLORS.dim);
    } else {
      const c = compareEquip(h, row.item.uid);
      this.action.setLabel("EQUIP").setEnabled(c.ok);
      if (c.ok) this.showCompare(c);
      else this.msg.setText(c.reason).setColor(COLORS.bad);
    }
  }

  /* AC, to-hit and damage before > after, green when better and red when worse. */
  showCompare({ before: b, after: a }) {
    if (!a) return;
    const colour = d => (d > 0 ? COLORS.good : d < 0 ? COLORS.bad : COLORS.text);
    const part = (label, x, y, d) => (x === y ? `${label} ${x}` : `${label} ${x}>${y}`);
    this.cmp[0].setText(part("AC", b.ac, a.ac)).setColor(colour(a.ac - b.ac));
    this.cmp[1].setText(part("HIT", `+${b.bonus}`, `+${a.bonus}`)).setColor(colour(a.bonus - b.bonus));
    this.cmp[2].setText(part("DMG", damageText(b), damageText(a))).setColor(colour(averageDamage(a) - averageDamage(b)));
  }

  doAction() {
    const row = this.current, h = state.hero;
    if (!row?.item) return;
    let msg, ok = true;
    if (row.kind === "worn") {
      unequip(h, row.slot);
      msg = `You take off the ${itemName(row.item)}.`;
    } else if (isPotion(row.item)) {
      const r = useItem(h, row.item.uid);
      ok = r.ok;
      msg = r.ok ? drinkText(r) : r.reason;
    } else {
      const r = equip(h, row.item.uid);
      ok = r.ok;
      const off = r.unequipped?.length ? ` (${r.unequipped.map(itemName).join(", ")} back in your pack)` : "";
      msg = r.ok ? `You equip the ${itemName(row.item)}${off}.` : r.reason;
    }
    this.current = null;
    this.worn.clearSelection();
    this.pack.clearSelection();
    this.refresh();
    this.showDetail();
    this.desc.setText("");
    this.msg.setText(msg).setColor(ok ? COLORS.good : COLORS.bad);
    sfx(!ok ? "back" : isPotion(row.item) && row.kind !== "worn" ? "heal" : "clang");
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
