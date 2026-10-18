// Oakhollow's blacksmith: upgrade gear (+1 to +3), buy new gear, sell what you don't need.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { ITEMS, STOCK, MAX_UPGRADE } from "../data/items.js";
import { upgradeItem, upgradeCost, describeItem, itemName, groupPack, makeItem, baseOf, SLOTS } from "../rules/items.js";
import { buyItem, sellItem, sellPrice } from "../rules/gear.js";
import { text, panel, button, ListView, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const TABS = ["upgrade", "buy", "sell"];
const GREETING = "Steel's hot. What'll it be?";
const UPGRADE_HELP = { weapon: "+1 to hit and damage", shield: "+1 AC", armour: "+1 AC" };

export class Blacksmith extends Phaser.Scene {
  constructor() { super("Blacksmith"); }

  create() {
    uiCamera(this);
    this.tab = "upgrade";
    this.current = null;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "BLACKSMITH", { color: COLORS.gold });
    this.goldText = text(this, WIDTH - 70, 9, "", { color: COLORS.gold }).setOrigin(1, 0);
    button(this, WIDTH - 34, 13, 56, 18, "LEAVE", () => this.close());
    this.input.keyboard.on("keydown-ESC", () => this.close());

    this.tabs = Object.fromEntries(TABS.map((t, i) => [t, button(this, 46 + i * 82, 38, 76, 18, t.toUpperCase(), () => this.showTab(t))]));

    panel(this, 6, 52, 300, 140);
    this.list = new ListView(this, 10, 56, 292, 8, row => this.pick(row));
    panel(this, 312, 52, 162, 140);
    this.name = text(this, 318, 58, "", { color: COLORS.gold, wordWrap: { width: 150 } });
    this.desc = text(this, 318, 76, "", { wordWrap: { width: 150 }, lineSpacing: 4 });
    this.action = button(this, 393, 176, 140, 22, "", () => this.doAction());

    panel(this, 6, 198, 468, 66);
    this.add.image(28, 230, "hero", heroFrame("down")).setTint(0xc8a27a); // the smith, until they get a sprite of their own
    this.say = text(this, 50, 208, GREETING, { wordWrap: { width: 410 }, lineSpacing: 5 });

    this.showTab("upgrade");
  }

  showTab(tab) {
    this.tab = tab;
    for (const t of TABS) this.tabs[t].setActive(t === tab);
    this.current = null;
    this.list.clearSelection();
    this.refresh();
  }

  rows() {
    const h = state.hero, gold = h.gold;
    if (this.tab === "upgrade") {
      const worn = SLOTS.map(s => h.equipment[s]).filter(Boolean);
      const carried = h.inventory.filter(i => SLOTS.includes(baseOf(i).type));
      return [...worn, ...carried].map(item => {
        const cost = upgradeCost(item);
        return { item, worn: worn.includes(item), label: itemName(item), right: cost === null ? "MAX" : `${cost}g`, color: cost !== null && cost > gold ? COLORS.dim : COLORS.text };
      });
    }
    if (this.tab === "buy") {
      return STOCK.map(base => ({ base, item: makeItem(base), label: ITEMS[base].name, right: `${ITEMS[base].cost}g`, color: ITEMS[base].cost > gold ? COLORS.dim : COLORS.text }));
    }
    return groupPack(h.inventory).map(g => ({ item: g.item, label: g.name + (g.count > 1 ? ` x${g.count}` : ""), right: `${sellPrice(g.item)}g` }));
  }

  refresh() {
    this.goldText.setText(`${state.hero.gold} GOLD`);
    this.list.setItems(this.rows());
    if (!this.list.items.length) {
      this.say.setText(this.tab === "sell" ? "Your pack's empty. Nothing to sell." : "You've nothing I can work on.");
    }
    this.showDetail();
  }

  pick(row) {
    this.current = row;
    this.showDetail();
  }

  showDetail() {
    const row = this.current;
    if (!row) {
      this.name.setText("");
      this.desc.setText(this.tab === "upgrade" ? "Pick something to improve." : this.tab === "buy" ? "Pick something to buy." : "Pick something to sell. Take gear off to sell it.");
      this.action.setVisible(false);
      return;
    }
    this.action.setVisible(true);
    const gold = state.hero.gold;
    this.name.setText(itemName(row.item));
    if (this.tab === "upgrade") {
      const cost = upgradeCost(row.item), type = baseOf(row.item).type;
      const next = cost === null ? `Already +${MAX_UPGRADE}, as good as it gets.` : `Next: +${row.item.upgrade + 1}, ${UPGRADE_HELP[type]}.`;
      this.desc.setText(`${describeItem(row.item)}\n${row.worn ? "(worn)\n" : ""}${next}`);
      this.action.setLabel(cost === null ? "MAXED" : `UPGRADE ${cost}g`).setEnabled(cost !== null && cost <= gold);
    } else if (this.tab === "buy") {
      const cost = ITEMS[row.base].cost;
      this.desc.setText(describeItem(row.item));
      this.action.setLabel(`BUY ${cost}g`).setEnabled(cost <= gold);
    } else {
      this.desc.setText(describeItem(row.item));
      this.action.setLabel(`SELL ${sellPrice(row.item)}g`).setEnabled(true);
    }
  }

  doAction() {
    const row = this.current, h = state.hero;
    if (!row) return;
    let r, line;
    if (this.tab === "upgrade") {
      r = upgradeItem(h, row.item.uid);
      line = r.ok ? `*clang clang* There. Your ${itemName(r.item)} is better than new. (${r.cost} gold)` : r.reason;
    } else if (this.tab === "buy") {
      r = buyItem(h, row.base);
      line = r.ok ? `A fine ${itemName(r.item)}. It's in your pack. (${r.cost} gold)` : r.reason;
    } else {
      r = sellItem(h, row.item.uid);
      line = r.ok ? `I'll give you ${r.price} gold for the ${r.name}. Done.` : r.reason;
    }
    this.say.setText(line).setColor(r.ok ? COLORS.text : COLORS.bad);
    sfx(!r.ok ? "back" : this.tab === "upgrade" ? "clang" : "coin");
    const keep = this.list.selected;
    this.refresh();
    // Stay on the same row so you can upgrade again, or buy/sell another, with one more tap.
    if (keep >= 0 && keep < this.list.items.length) this.list.select(keep);
    else { this.current = null; this.showDetail(); }
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
