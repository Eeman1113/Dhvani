"""
Cuts a generated icon sheet into one PNG per icon, by grid cell.

Connected-component slicing is wrong for these: a rain icon is a cloud plus a
dozen separate dashes, and component slicing would hand back thirteen
"icons". The sheets are laid out on a known grid, so each component is
assigned to a cell by its centroid and everything in a cell is cropped
together.
"""
import sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

src = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
cols, rows = int(sys.argv[3]), int(sys.argv[4])
names = sys.argv[5].split(",")
out_dir.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert("RGBA")
a = np.asarray(im)[..., 3]
H, W = a.shape
ink = a > 40

lab, n = ndimage.label(ink, structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
cells = {}
for i, sl in enumerate(objs, start=1):
    ys, xs = sl
    cy = (ys.start + ys.stop) / 2
    cx = (xs.start + xs.stop) / 2
    col = min(cols - 1, int(cx / (W / cols)))
    row = min(rows - 1, int(cy / (H / rows)))
    key = row * cols + col
    b = cells.setdefault(key, [W, H, 0, 0])
    b[0] = min(b[0], xs.start); b[1] = min(b[1], ys.start)
    b[2] = max(b[2], xs.stop);  b[3] = max(b[3], ys.stop)

written = 0
for key in sorted(cells):
    if key >= len(names):
        continue
    name = names[key].strip()
    if not name:
        continue
    x0, y0, x1, y1 = cells[key]
    pad = 10
    crop = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)))
    # potrace reads a bitmap, so flatten ink to black on white
    # Traced detail scales with input resolution, and these are displayed at
    # about 56 px. Anything finer is bytes nobody can see.
    if max(crop.width, crop.height) > 200:
        k = 200 / max(crop.width, crop.height)
        crop = crop.resize((max(1, int(crop.width * k)), max(1, int(crop.height * k))), Image.LANCZOS)
    rgba = np.array(crop)
    alpha = rgba[..., 3]
    flat = np.where(alpha > 100, 0, 255).astype(np.uint8)
    Image.fromarray(flat, "L").save(out_dir / f"{name}.png")
    written += 1
    print(f"  {name:<12} {crop.width}x{crop.height}")
print(f"{written} icons -> {out_dir}")
