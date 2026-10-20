// The shops. A smith upgrades gear (Oakhollow's blacksmith to +3, Brannoc's forge in Fenwatch to +5), sells gear and
// buys back what you don't need; the apothecary and the herbalist sell potions and buy things back too. Which shop is in
// data.shop (a key of SHOPS).
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { ITEMS, SHOPS, MAX_UPGRADE } from "../data/items.js";
import { upgradeItem, upgradeCost, describeItem, itemName, groupPack, makeItem, baseOf, isUpgradable, SLOTS } from "../rules/items.js";
import { companionGear, COMPANIONS } from "../rules/party.js";
import { buyItem, sellItem, sellPrice } from "../rules/gear.js";
import { text, panel, button, ListView, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const UPGRADE_HELP = { weapon: "+1 to hit and damage", bow: "+1 to hit and damage", shield: "+1 AC", armour: "+1 AC" };

export class Shop extends Phaser.Scene {
  constructor() { super("Shop"); }

  create(data = {}) {
    uiCamera(this);
    this.shop = SHOPS[data.shop] || SHOPS.blacksmith;
    this.max = this.shop.maxUpgrade || MAX_UPGRADE;
    const tabs = this.shop.tabs;
    this.current = null;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, this.shop.title, { color: COLORS.gold });
    this.goldText = text(this, WIDTH - 70, 9, "", { color: COLORS.gold }).setOrigin(1, 0);
    button(this, WIDTH - 34, 13, 56, 18, "LEAVE", () => this.close());
    this.input.keyboard.on("keydown-ESC", () => this.close());

    this.tabs = Object.fromEntries(tabs.map((t, i) => [t, button(this, 46 + i * 82, 38, 76, 18, t.toUpperCase(), () => this.showTab(t))]));

    panel(this, 6, 52, 300, 140);
    this.list = new ListView(this, 10, 56, 292, 8, row => this.pick(row));
    panel(this, 312, 52, 162, 140);
    this.name = text(this, 318, 58, "", { color: COLORS.gold, wordWrap: { width: 150 } });
    this.desc = text(this, 318, 76, "", { wordWrap: { width: 150 }, lineSpacing: 4 });
    this.action = button(this, 393, 176, 140, 22, "", () => this.doAction());

    panel(this, 6, 198, 468, 66);
    this.add.image(28, 230, "hero", heroFrame("down")).setTint(this.shop.tint); // the shopkeeper, until they get a sprite of their own
    this.say = text(this, 50, 208, this.shop.greeting, { wordWrap: { width: 410 }, lineSpacing: 5 });

    this.showTab(tabs[0]);
  }

  showTab(tab) {
    this.tab = tab;
    for (const t of this.shop.tabs) this.tabs[t].setActive(t === tab);
    this.current = null;
    this.list.clearSelection();
    this.refresh();
  }

  rows() {
    const h = state.hero, gold = h.gold;
    if (this.tab === "upgrade") {
      const worn = SLOTS.map(s => h.equipment[s]).filter(Boolean);
      const friend = companionGear(h);
      const carried = h.inventory.filter(isUpgradable);
      return [...worn, ...friend, ...carried].map(item => {
        const cost = upgradeCost(item, this.max);
        return { item, worn: worn.includes(item), friend: friend.includes(item), label: itemName(item), right: cost === null ? "MAX" : `${cost}g`, color: cost !== null && cost > gold ? COLORS.dim : COLORS.text };
      });
    }
    if (this.tab === "buy") {
      return this.shop.stock.map(base => ({ base, item: makeItem(base), label: ITEMS[base].name, right: `${ITEMS[base].cost}g`, color: ITEMS[base].cost > gold ? COLORS.dim : COLORS.text }));
    }
    return groupPack(h.inventory).filter(g => baseOf(g.item).type !== "key").map(g => ({ item: g.item, label: g.name + (g.count > 1 ? ` x${g.count}` : ""), right: `${sellPrice(g.item)}g` }));
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
    const row = this.current, h = state.hero;
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
      const cost = upgradeCost(row.item, this.max), type = baseOf(row.item).type;
      const next = cost === null ? `Already +${row.item.upgrade}, as good as ${this.max > MAX_UPGRADE ? "it gets" : "this forge can make it"}.` : `Next: +${row.item.upgrade + 1}, ${UPGRADE_HELP[type]}.`;
      const who = row.worn ? "(worn)\n" : row.friend ? `(${COMPANIONS[h.companion.id].name}'s)\n` : "";
      this.desc.setText(`${describeItem(row.item)}\n${who}${next}`);
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
      r = upgradeItem(h, row.item.uid, this.max);
      line = r.ok ? `*clang clang* There. Your ${itemName(r.item)} is better than new. (${r.cost} gold)` : r.reason;
    } else if (this.tab === "buy") {
      r = buyItem(h, row.base, this.shop.stock);
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
