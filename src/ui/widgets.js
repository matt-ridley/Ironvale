// Small UI pieces for menu screens: buttons and a paged, tappable list.
import { FONT, COLORS, WIDTH, HEIGHT, ZOOM } from "../config.js";

/* Menu scenes are laid out on the 480 x 270 grid; this zooms their camera to fill the double-size canvas. */
export function uiCamera(scene) {
  scene.cameras.main.setZoom(ZOOM).centerOn(WIDTH / 2, HEIGHT / 2);
}

export const text = (scene, x, y, str, opts = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: "8px", color: COLORS.text, ...opts });

export function panel(scene, x, y, w, h, fill = COLORS.panel) {
  return scene.add.rectangle(x, y, w, h, fill).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge);
}

/* A button centred on x, y. setEnabled(false) greys it out and ignores taps. */
export function button(scene, x, y, w, h, label, onTap) {
  const bg = scene.add.rectangle(x, y, w, h, COLORS.bg).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true });
  const t = text(scene, x, y, label).setOrigin(0.5);
  const b = {
    bg, text: t, enabled: true, active: false,
    setEnabled(on) { b.enabled = on; bg.setAlpha(on ? 1 : 0.4); t.setAlpha(on ? 1 : 0.4); return b; },
    setLabel(s) { t.setText(s); return b; },
    setActive(on) { b.active = on; bg.setFillStyle(on ? COLORS.panelEdge : COLORS.bg); return b; },
    setVisible(v) { bg.setVisible(v); t.setVisible(v); return b; },
  };
  bg.on("pointerover", () => { if (b.enabled && !b.active) bg.setFillStyle(COLORS.panel); });
  bg.on("pointerout", () => { if (!b.active) bg.setFillStyle(COLORS.bg); });
  bg.on("pointerup", () => { if (b.enabled) onTap(); });
  return b;
}

/* A list of rows ({ label, right, color }) with one selected. Shows `rows` at a time with < > paging. */
export class ListView {
  constructor(scene, x, y, w, rows, onSelect, rowH = 14) {
    Object.assign(this, { scene, x, y, w, rows, rowH, onSelect, items: [], page: 0, selected: -1 });
    this.highlight = scene.add.rectangle(x, y, w, rowH, COLORS.panelEdge).setOrigin(0).setVisible(false);
    this.rowViews = Array.from({ length: rows }, (_, i) => {
      const ry = y + i * rowH;
      const hit = scene.add.rectangle(x, ry, w, rowH, 0x000000, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => this.select(this.page * rows + i));
      return { left: text(scene, x + 4, ry + 3, ""), right: text(scene, x + w - 4, ry + 3, "").setOrigin(1, 0), hit };
    });
    const py = y + rows * rowH + 10;
    this.prev = button(scene, x + w - 48, py, 20, 14, "<", () => this.showPage(this.page - 1));
    this.next = button(scene, x + w - 14, py, 20, 14, ">", () => this.showPage(this.page + 1));
    this.pageText = text(scene, x + 4, py - 4, "", { color: COLORS.dim });
  }

  get pages() { return Math.max(1, Math.ceil(this.items.length / this.rows)); }

  /* Replaces the rows. Keeps the selection by index when it still exists. */
  setItems(items, keep = true) {
    this.items = items;
    if (!keep || this.selected >= items.length) this.selected = items.length ? Math.min(Math.max(this.selected, 0), items.length - 1) : -1;
    this.showPage(this.selected >= 0 ? Math.floor(this.selected / this.rows) : 0);
  }

  showPage(p) {
    this.page = Math.min(Math.max(p, 0), this.pages - 1);
    this.rowViews.forEach((v, i) => {
      const item = this.items[this.page * this.rows + i];
      v.left.setText(item ? item.label : "").setColor(item?.color || COLORS.text);
      v.right.setText(item ? item.right || "" : "").setColor(item?.color || COLORS.dim);
      v.hit.input.enabled = !!item;
    });
    const many = this.pages > 1;
    this.prev.setVisible(many).setEnabled(this.page > 0);
    this.next.setVisible(many).setEnabled(this.page < this.pages - 1);
    this.pageText.setText(many ? `${this.page + 1}/${this.pages}` : "");
    this.placeHighlight();
  }

  select(i) {
    if (i < 0 || i >= this.items.length) return;
    this.selected = i;
    this.placeHighlight();
    this.onSelect(this.items[i], i);
  }

  clearSelection() {
    this.selected = -1;
    this.placeHighlight();
  }

  placeHighlight() {
    const row = this.selected - this.page * this.rows;
    this.highlight.setVisible(this.selected >= 0 && row >= 0 && row < this.rows).setY(this.y + row * this.rowH);
  }
}
