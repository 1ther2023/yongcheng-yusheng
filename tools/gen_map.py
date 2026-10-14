# 数据获取：Overpass API (overpass-api.de)，查询：
# [out:json];(way["highway"](22.800,108.306,22.828,108.334);way["building"](...);way["natural"="water"](22.795,108.300,22.833,108.340);relation["natural"="water"](...);way["leisure"~"park|garden"](...);way["landuse"~"grass|forest|park"](...);way["railway"="rail"](...););out geom;
# 保存为 osm.json 后运行：python3 gen_map.py  -> map.js
# 由 OpenStreetMap 南宁市区真实数据生成游戏地图
import json, math, random, base64
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

random.seed(20271014)
LAT0, LAT1 = 22.800, 22.828
LON0, LON1 = 108.306, 108.334
TILE_M = 4.0
MLAT = 110574.0
MLON = 111320.0 * math.cos(math.radians((LAT0 + LAT1) / 2))
W = int((LON1 - LON0) * MLON / TILE_M)
H = int((LAT1 - LAT0) * MLAT / TILE_M)
print('map', W, H)

def proj(lat, lon):
    return ((lon - LON0) * MLON / TILE_M, (LAT1 - lat) * MLAT / TILE_M)

# tile types
GROUND, ROAD, MAJOR, WATER, GRASS, TREE, BUILD, RAIL, ALLEY, PLAZA = range(10)

els = json.load(open('osm.json'))['elements']

def ways_geom(e):
    if e['type'] == 'way':
        return [[proj(p['lat'], p['lon']) for p in e['geometry']]]
    return []

def assemble(members):
    segs = [[(p['lat'], p['lon']) for p in m['geometry']] for m in members if m.get('geometry')]
    rings = []
    while segs:
        cur = segs.pop(0)
        changed = True
        while changed and cur[0] != cur[-1]:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == cur[-1]:
                    cur += s[1:]; segs.pop(i); changed = True; break
                if s[-1] == cur[-1]:
                    cur += s[::-1][1:]; segs.pop(i); changed = True; break
                if s[-1] == cur[0]:
                    cur = s + cur[1:]; segs.pop(i); changed = True; break
                if s[0] == cur[0]:
                    cur = s[::-1] + cur[1:]; segs.pop(i); changed = True; break
        rings.append([proj(a, b) for a, b in cur])
    return rings

def mask_from(polys, holes=()):
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    for p in polys:
        if len(p) >= 3:
            d.polygon(p, fill=1)
    for p in holes:
        if len(p) >= 3:
            d.polygon(p, fill=0)
    return np.array(im, dtype=bool)

water_outer, water_inner = [], []
green, forest = [], []
for e in els:
    t = e.get('tags', {})
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank':
        if e['type'] == 'way':
            water_outer += ways_geom(e)
        else:
            water_outer += assemble([m for m in e['members'] if m.get('role') == 'outer'])
            water_inner += assemble([m for m in e['members'] if m.get('role') == 'inner'])
    elif t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass', 'park'):
        green += ways_geom(e)
    elif t.get('landuse') == 'forest':
        forest += ways_geom(e)

grid = np.zeros((H, W), dtype=np.uint8)
grid[mask_from(green)] = GRASS
grid[mask_from(forest)] = TREE
water = mask_from(water_outer, water_inner)
grid[water] = WATER
print('water tiles', water.sum())

# buildings
bid = np.zeros((H, W), dtype=np.uint16)
buildings = [None]
KINDMAP = {'hospital': 'hospital', 'retail': 'mall', 'commercial': 'office', 'office': 'office', 'apartments': 'residential',
           'residential': 'residential', 'dormitory': 'residential', 'hotel': 'hotel', 'public': 'gov', 'public_building': 'gov',
           'religious': 'temple', 'parking': 'parking', 'school': 'school'}

def tier(levels):
    if levels <= 3: return 1
    if levels <= 8: return 2
    if levels <= 20: return 3
    return 4

osm_b = []
for e in els:
    t = e.get('tags', {})
    if 'building' in t and e['type'] == 'way':
        poly = ways_geom(e)[0]
        osm_b.append((poly, t))
# larger first so smaller paint on top
osm_b.sort(key=lambda x: -abs(sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(x[0], x[0][1:]+x[0][:1]))))
for poly, t in osm_b:
    im = Image.new('L', (W, H), 0)
    ImageDraw.Draw(im).polygon(poly, fill=1, outline=1)
    m = np.array(im, dtype=bool) & (grid != WATER)
    if m.sum() == 0:
        continue
    name = t.get('name', '')
    kind = KINDMAP.get(t.get('building'), 'residential')
    if 'hospital' in t.get('building', '') or '医院' in name: kind = 'hospital'
    if t.get('amenity') == 'bank' or '银行' in name: kind = 'bank'
    if '百货' in name or '商场' in name or '购物' in name or '印象城' in name or '奥特莱斯' in name or '商厦' in name: kind = 'mall'
    if '宾馆' in name or '酒店' in name: kind = 'hotel'
    if '博物馆' in name or '剧院' in name or '戏院' in name or '剧场' in name or '科技馆' in name: kind = 'culture'
    if '政府' in name or '局' in name or '大会堂' in name or '委员会' in name or '党委' in name or '法院' in name: kind = 'gov'
    try:
        lv = int(float(t.get('building:levels', '0')))
    except Exception:
        lv = 0
    area = int(m.sum())
    if lv == 0:
        lv = {'residential': random.choice([6, 9, 18, 26]), 'mall': 6, 'office': 20, 'hospital': 12, 'hotel': 15, 'gov': 8,
              'culture': 3, 'temple': 1, 'bank': 6, 'parking': 6}.get(kind, 6)
        if area < 12: lv = min(lv, 3)
    buildings.append({'k': kind, 'h': tier(lv), 'n': name, 'lv': lv})
    bid[m] = len(buildings) - 1
    grid[m] = BUILD
print('osm buildings', len(buildings) - 1)

# roads
im = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(im)
WID = {'trunk': 8, 'primary': 7, 'secondary': 6, 'tertiary': 5, 'trunk_link': 4, 'primary_link': 4, 'secondary_link': 4,
       'tertiary_link': 3, 'residential': 3, 'unclassified': 3, 'living_street': 2, 'service': 2, 'pedestrian': 3,
       'footway': 1, 'path': 1, 'steps': 1, 'cycleway': 1, 'track': 2}
VAL = {'trunk': 3, 'primary': 3, 'secondary': 3, 'tertiary': 2, 'trunk_link': 2, 'primary_link': 2, 'secondary_link': 2,
       'tertiary_link': 2, 'residential': 2, 'unclassified': 2, 'living_street': 1, 'service': 1, 'pedestrian': 4,
       'footway': 1, 'path': 1, 'steps': 1, 'cycleway': 1, 'track': 1}
roadnames = []
order = sorted([e for e in els if 'highway' in e.get('tags', {})], key=lambda e: VAL.get(e['tags']['highway'], 0))
for e in order:
    t = e['tags']; hw = t['highway']
    if hw not in WID or t.get('tunnel') == 'yes' or t.get('area') == 'yes' and hw != 'pedestrian':
        continue
    g = ways_geom(e)[0]
    w = WID[hw]
    d.line(g, fill=VAL[hw], width=w, joint='curve')
    for p in g:
        r = w / 2
        d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=VAL[hw])
    if t.get('name') and hw in ('trunk', 'primary', 'secondary', 'tertiary') and len(g) > 1:
        mid = g[len(g)//2]
        roadnames.append([t['name'], round(mid[0]), round(mid[1])])
rail = Image.new('L', (W, H), 0)
for e in els:
    t = e.get('tags', {})
    if t.get('railway') == 'rail' and t.get('tunnel') != 'yes':
        ImageDraw.Draw(rail).line(ways_geom(e)[0], fill=1, width=3)
r = np.array(im)
railm = np.array(rail, dtype=bool)
grid[railm] = RAIL
grid[r == 1] = np.where(grid[r == 1] == WATER, ROAD, ALLEY)  # 小路 / 步道 (过水则为桥)
grid[r == 2] = ROAD
grid[r == 3] = MAJOR
grid[r == 4] = PLAZA
bid[r > 0] = 0
bid[railm] = 0
# 道路覆盖掉的建筑格
# 去重路名
seen = {}
for n, x, y in roadnames:
    seen.setdefault(n, []).append((x, y))
labels_roads = [[n, *v[len(v)//2]] for n, v in seen.items()]

# 程序生成填充建筑（OSM 未覆盖的城区：城中村/老小区）
road_any = (grid == ROAD) | (grid == MAJOR) | (grid == ALLEY) | (grid == PLAZA) | (grid == RAIL)
dist_road = ndimage.distance_transform_edt(~road_any)
free = (grid == GROUND) & (dist_road >= 2.0)
# 原有建筑周围留出1格
bmask = grid == BUILD
near_b = ndimage.binary_dilation(bmask, iterations=1)
free &= ~near_b
ys, xs = np.nonzero(free)
print('free tiles', len(xs))
proc = 0
# lot partition
y = 0
while y < H:
    lh = random.randint(5, 11)
    x = random.randint(0, 4)
    while x < W:
        lw = random.randint(5, 12)
        x0, y0, x1, y1 = x + random.choice([1,1,2]), y + random.choice([1,1,2]), min(W, x + lw), min(H, y + lh)
        if x1 - x0 >= 3 and y1 - y0 >= 3:
            sub = free[y0:y1, x0:x1]
            frac = sub.mean()
            if frac > 0.85 and random.random() > 0.12:
                m = np.zeros_like(free)
                m[y0:y1, x0:x1] = sub
                # 近大路 = 商铺; 否则城中村/老小区
                dmin = dist_road[y0:y1, x0:x1].min()
                if dmin < 3.5:
                    kind = random.choice(['shop', 'shop', 'shop', 'restaurant', 'pharmacy', 'hardware', 'convenience'])
                    h = random.choice([1, 2, 2])
                else:
                    kind = random.choice(['village', 'village', 'village', 'residential', 'residential', 'warehouse'])
                    h = random.choice([2, 2, 2, 3]) if kind == 'village' else random.choice([2, 3])
                    if kind == 'warehouse': h = 1
                buildings.append({'k': kind, 'h': h, 'n': '', 'lv': h * 3})
                bid[m] = len(buildings) - 1
                grid[m] = BUILD
                proc += 1
        x += lw
    y += lh
print('procedural buildings', proc)

# 少量指定特殊建筑（派出所、菜市场、五金批发）—选择指定坐标附近的程序建筑改种类
def nearest_building(lat, lon, prefer=None):
    px, py = proj(lat, lon)
    best, bd = None, 1e9
    for yy in range(max(0, int(py) - 60), min(H, int(py) + 60), 2):
        for xx in range(max(0, int(px) - 60), min(W, int(px) + 60), 2):
            b = bid[yy, xx]
            if b and (prefer is None or buildings[b]['k'] in prefer):
                dd = (xx - px) ** 2 + (yy - py) ** 2
                if dd < bd:
                    bd, best = dd, b
    return best

specials = [
    (22.8202, 108.3133, 'police', '朝阳派出所', 2),
    (22.8105, 108.3205, 'police', '江滨警务站', 2),
    (22.8240, 108.3260, 'police', '新民路派出所', 2),
    (22.8150, 108.3125, 'market', '解放路菜市场', 1),
    (22.8230, 108.3180, 'market', '朝阳农贸市场', 1),
    (22.8120, 108.3270, 'hardware', '五金批发店', 1),
    (22.8030, 108.3180, 'pharmacy', '大参林药房', 1),
    (22.8215, 108.3225, 'pharmacy', '一心堂药店', 1),
    (22.8250, 108.3165, 'restaurant', '老友粉店', 1),
    (22.8178, 108.3138, 'restaurant', '中山路夜市档口', 1),
    (22.8080, 108.3290, 'school', '南宁市第三中学(虚构分校)', 3),
]
for lat, lon, k, n, h in specials:
    b = nearest_building(lat, lon, prefer=('shop', 'village', 'residential', 'restaurant', 'convenience', 'hardware', 'pharmacy', 'warehouse'))
    if b:
        buildings[b].update({'k': k, 'n': n, 'h': h})

# 门：每栋建筑在临路一侧选择1~3个门
walk = (grid != BUILD) & (grid != WATER)
doors = []
by_b = {}
bys, bxs = np.nonzero(bid)
for yy, xx in zip(bys, bxs):
    by_b.setdefault(int(bid[yy, xx]), []).append((xx, yy))
for b, tiles in by_b.items():
    cands = []
    for (xx, yy) in tiles:
        for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)):
            nx, ny = xx + dx, yy + dy
            if 0 <= nx < W and 0 <= ny < H and walk[ny, nx]:
                cands.append((dist_road[ny, nx] + (0 if dy == 1 else 0.6), nx, ny))
    if not cands:
        continue
    cands.sort()
    n = 1 if len(tiles) < 120 else (2 if len(tiles) < 400 else 3)
    chosen = []
    for c in cands:
        if all((c[1] - o[0]) ** 2 + (c[2] - o[1]) ** 2 > 100 for o in chosen):
            chosen.append((c[1], c[2]))
        if len(chosen) >= n:
            break
    for (dx, dy) in chosen:
        doors.append([dx, dy, b])
    buildings[b]['a'] = len(tiles)
print('doors', len(doors))

# 地标（真实坐标）
LM = [
    ('朝阳广场', 22.82183, 108.31709, 3), ('民族广场', 22.8167, 108.32803, 2), ('人民公园', 22.8270, 108.3255, 2),
    ('自治区人民医院', 22.80500, 108.32390, 5), ('南宁百货大楼', 22.8200, 108.3163, 3), ('印象城', 22.8175, 108.3188, 3),
    ('三街两巷', 22.8168, 108.3150, 2), ('中山路美食街', 22.8150, 108.3165, 2), ('邕江大桥', 22.8065, 108.3170, 4),
    ('广西博物馆', 22.81489, 108.33105, 2), ('南宁火车站', 22.8262, 108.3115, 4), ('梦之岛', 22.8098, 108.33179, 3),
    ('和平商场', 22.82021, 108.31394, 3), ('城市奥特莱斯', 22.80951, 108.32466, 3), ('自治区政府', 22.81865, 108.32399, 4),
    ('邕江', 22.8030, 108.3120, 1), ('水岸都市', 22.80879, 108.31189, 2), ('大和平批发城', 22.82303, 108.31265, 3),
]
landmarks = [[n, *map(round, proj(a, b)), dg] for n, a, b, dg in LM]

def snap(px, py):
    px, py = int(px), int(py)
    for r in range(0, 30):
        for yy in range(py - r, py + r + 1):
            for xx in range(px - r, px + r + 1):
                if 0 <= xx < W and 0 <= yy < H and walk[yy, xx] and grid[yy, xx] != RAIL:
                    return [xx, yy]
    return [px, py]

EX = [  # 撤离点
    ('地铁1号线·火车站站', 22.8253, 108.3127, 'metro'), ('地铁·朝阳广场站D出口', 22.82116, 108.31696, 'metro'),
    ('地铁·新民路站', 22.8175, 108.3245, 'metro'), ('地铁·民族广场站', 22.8180, 108.3300, 'metro'),
    ('邕江码头·冲锋舟', 22.8075, 108.3095, 'boat'), ('江滨·民兵卡口', 22.8078, 108.3255, 'checkpoint'),
    ('人民公园北门·救援车', 22.8272, 108.3238, 'truck'),
]
extracts = [[n, *snap(*proj(a, b)), k] for n, a, b, k in EX]
DP = [('朝阳路口', 22.8215, 108.3150), ('民生路', 22.8130, 108.3180), ('友爱南路', 22.8200, 108.3090),
      ('桃源路', 22.8045, 108.3290), ('民族大道', 22.8165, 108.3310), ('人民东路', 22.8235, 108.3215),
      ('江北大道', 22.8090, 108.3150), ('新民路', 22.8215, 108.3260)]
deploys = [[n, *snap(*proj(a, b))] for n, a, b in DP]

# 行道树（绿城南宁）：大路边人行道
trees = []
edge = (grid == GROUND) & (dist_road >= 1) & (dist_road < 2)
ey, ex = np.nonzero(edge)
for yy, xx in zip(ey, ex):
    if (xx * 7 + yy * 13) % 9 == 0 and random.random() < 0.55:
        trees.append([int(xx), int(yy)])
gy, gx = np.nonzero(grid == GRASS)
for yy, xx in zip(gy, gx):
    if random.random() < 0.03:
        trees.append([int(xx), int(yy)])
fy, fx = np.nonzero(grid == TREE)
for yy, xx in zip(fy, fx):
    if random.random() < 0.15:
        trees.append([int(xx), int(yy)])
print('trees', len(trees))

def rle(arr):
    flat = arr.flatten().tolist()
    out = []
    i = 0
    n = len(flat)
    while i < n:
        v = flat[i]; j = i
        while j < n and flat[j] == v and j - i < 65535:
            j += 1
        out.append((v, j - i)); i = j
    b = bytearray()
    for v, c in out:
        b += int(v).to_bytes(2, 'little') + int(c).to_bytes(2, 'little')
    return base64.b64encode(bytes(b)).decode()

data = {
    'w': W, 'h': H, 'tileM': TILE_M, 'bbox': [LAT0, LON0, LAT1, LON1],
    'grid': rle(grid), 'bid': rle(bid),
    'buildings': [None] + [[b['k'], b['h'], b['n'], b.get('a', 0)] for b in buildings[1:]],
    'doors': doors, 'landmarks': landmarks, 'roads': labels_roads, 'extracts': extracts, 'deploys': deploys, 'trees': trees,
    'attribution': '地图数据 © OpenStreetMap contributors (ODbL)',
}
s = 'window.MAP_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':'), default=int) + ';\n'
open('map.js', 'w').write(s)
print('size KB', len(s) // 1024)

# 预览
pal = np.array([[233, 223, 200], [150, 150, 150], [110, 110, 115], [90, 150, 180], [150, 190, 110], [80, 140, 70],
                [180, 120, 100], [90, 70, 60], [200, 190, 170], [220, 210, 180]], dtype=np.uint8)
img = pal[grid]
Image.fromarray(img).save('preview.png')
