"""
Cuts a generated sheet of isolated elements into individual trimmed PNGs.

The image models reliably produce a sheet with real alpha between the
elements, so each element is just a connected region of non-transparent
pixels. Labelling the alpha and cropping each blob apart is more dependable
than slicing on a fixed grid, which breaks the moment the model decides to
arrange things slightly differently.
"""
import sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

src = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
prefix = sys.argv[3]
min_frac = float(sys.argv[4]) if len(sys.argv) > 4 else 0.004
out_dir.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert("RGBA")
a = np.asarray(im)[..., 3]

# Close small gaps so a wispy edge does not split one cloud into three.
solid = ndimage.binary_closing(a > 24, np.ones((9, 9)))
lab, n = ndimage.label(solid)
total = a.size
kept = 0
for i, sl in enumerate(ndimage.find_objects(lab), start=1):
    m = lab[sl] == i
    if m.sum() / total < min_frac:
        continue
    y, x = sl
    crop = im.crop((x.start, y.start, x.stop, y.stop))
    # Zero out anything belonging to a neighbouring blob inside this bbox.
    ca = np.array(crop)
    ca[..., 3] = np.where(m, ca[..., 3], 0)
    kept += 1
    p = out_dir / f"{prefix}-{kept}.png"
    Image.fromarray(ca).save(p, optimize=True)
    print(f"{p.name}  {crop.width}x{crop.height}  {p.stat().st_size//1024}kB")
print(f"{kept} pieces from {n} regions")
