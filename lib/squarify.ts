interface SquarifyItem {
  val: number;
  area?: number;
  rect?: { x: number; y: number; w: number; h: number };
  [key: string]: unknown;
}

function worstAspect(row: SquarifyItem[], rowArea: number, shortSide: number): number {
  if (rowArea <= 0 || shortSide <= 0) return Infinity;
  const rowLen = rowArea / shortSide;
  let worst = 0;
  for (const it of row) {
    const s = it.area! / rowLen;
    const r = Math.max(rowLen / s, s / rowLen);
    if (r > worst) worst = r;
  }
  return worst;
}

function placeRow(
  row: SquarifyItem[],
  rowArea: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (w >= h) {
    const rowW = rowArea / h;
    let ry = y;
    for (const it of row) {
      const itemH = it.area! / rowW;
      it.rect = { x, y: ry, w: rowW, h: itemH };
      ry += itemH;
    }
  } else {
    const rowH = rowArea / w;
    let rx = x;
    for (const it of row) {
      const itemW = it.area! / rowH;
      it.rect = { x: rx, y, w: itemW, h: rowH };
      rx += itemW;
    }
  }
}

export function squarify<T extends SquarifyItem>(
  items: T[],
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (!items.length || w <= 0 || h <= 0) return;
  const totalVal = items.reduce((s, it) => s + it.val, 0);
  if (totalVal <= 0) return;
  const totalArea = w * h;
  for (const it of items) it.area = (it.val / totalVal) * totalArea;

  let pos = 0;
  while (pos < items.length && w > 0.1 && h > 0.1) {
    if (pos === items.length - 1) {
      items[pos].rect = { x, y, w, h };
      break;
    }
    const ss = Math.min(w, h);
    let row = [items[pos]];
    let ra = items[pos].area!;
    let bw = worstAspect(row, ra, ss);
    let end = pos + 1;

    while (end < items.length) {
      const newArea = ra + items[end].area!;
      const newRow = row.concat(items[end]);
      const ww = worstAspect(newRow, newArea, ss);
      if (ww <= bw) {
        row = newRow;
        ra = newArea;
        bw = ww;
        end++;
      } else break;
    }

    placeRow(row, ra, x, y, w, h);
    if (w >= h) {
      const d = ra / h;
      x += d;
      w -= d;
    } else {
      const d = ra / w;
      y += d;
      h -= d;
    }
    pos = end;
  }
}
