# 从 map.js 的建筑格栅提取平滑外轮廓（去掉斜向建筑的锯齿台阶），输出 data/outlines.js
import json, base64, struct
import numpy as np, cv2
s = open('data/map.js', encoding='utf-8').read()
D = json.loads(s[s.index('{'):s.rindex('}') + 1])
W, H = D['w'], D['h']
def unrle(b):
    raw = base64.b64decode(b); out = np.zeros(W * H, np.uint16); p = 0
    for i in range(0, len(raw), 4):
        v, c = struct.unpack('<HH', raw[i:i + 4]); out[p:p + c] = v; p += c
    return out.reshape(H, W)
bid = unrle(D['bid'])
S = 4
out = {}
ys, xs = np.nonzero(bid)
boxes = {}
for y, x in zip(ys, xs):
    b = int(bid[y, x]); bb = boxes.get(b)
    if bb is None: boxes[b] = [x, y, x, y]
    else:
        if x < bb[0]: bb[0] = x
        if y < bb[1]: bb[1] = y
        if x > bb[2]: bb[2] = x
        if y > bb[3]: bb[3] = y
for b, (x0, y0, x1, y1) in boxes.items():
    sub = (bid[y0:y1 + 1, x0:x1 + 1] == b).astype(np.uint8)
    big = np.kron(sub, np.ones((S, S), np.uint8))
    big = np.pad(big, 1)
    cs, hier = cv2.findContours(big, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    rings = []
    for i, c in enumerate(cs):
        if cv2.contourArea(c) < S * S * 0.9: continue
        ap = cv2.approxPolyDP(c, S * 0.7, True).reshape(-1, 2)
        if len(ap) < 3: continue
        pts = []
        for px, py in ap:
            # 像素中心 → 格坐标（向外补 1/(2S)）
            pts += [round(((px - 1 + 0.5) / S + x0) * 10), round(((py - 1 + 0.5) / S + y0) * 10)]
        rings.append(pts)
    if rings: out[b] = rings
js = 'window.MAP_OUTLINES=' + json.dumps(out, separators=(',', ':')) + ';\n'
open('data/outlines.js', 'w').write(js)
print(len(out), len(js))
