import sys, glob, os
from PIL import Image, ImageDraw
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
files = sorted(glob.glob(d + '/*.png'))
if len(sys.argv) > 4: files = [f for f in files if any(k in f for k in sys.argv[4].split(','))]
ims = [Image.open(f).convert('RGB') for f in files]
w = 360; hs = [int(i.height * w / i.width) for i in ims]; h = max(hs)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 24)), 'white')
dr = ImageDraw.Draw(sheet)
for k, (im, f) in enumerate(zip(ims, files)):
    x, y = (k % cols) * w, (k // cols) * (h + 24)
    sheet.paste(im.resize((w, int(im.height * w / im.width))), (x, y + 24))
    dr.text((x + 4, y + 4), os.path.basename(f), fill='black')
sheet.save(out)
