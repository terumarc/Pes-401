"""Renderiza los trofeos como modelos 3D (SDF + raymarching) y los convierte
en sprite sheets de pixel art: N fotogramas girando sobre el eje vertical."""
import sys, numpy as np
from PIL import Image

W, H = 40, 56          # resolución final del sprite (píxeles)
SS = 4                 # supersampling
FRAMES = 16
VIEW_W, VIEW_H = 1.3, 1.86   # tamaño del encuadre en unidades del modelo
ELEV = np.radians(14)  # cámara ligeramente desde arriba

MAT = {
    1: ("gold", np.array([1.0, 0.74, 0.28]), 1.0),
    2: ("silver", np.array([0.86, 0.89, 0.94]), 1.0),
    3: ("wood", np.array([0.42, 0.24, 0.13]), 0.15),
    4: ("ruby", np.array([0.78, 0.12, 0.2]), 0.5),
    5: ("green", np.array([0.22, 0.82, 0.55]), 0.6),
    6: ("dark", np.array([0.13, 0.15, 0.19]), 0.3),
}

# ---------------- primitivas SDF (p: Nx3) ----------------
def length(v): return np.sqrt((v * v).sum(-1))

def sd_box(p, c, b, r=0.01):
    q = np.abs(p - c) - (np.array(b) - r)
    return length(np.maximum(q, 0)) + np.minimum(q.max(-1), 0) - r

def sd_sphere(p, c, r): return length(p - c) - r

def sd_cyl(p, cy, h, r):  # cilindro vertical centrado en (0,cy,0)
    q = p - np.array([0, cy, 0])
    d = np.stack([np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2) - r, np.abs(q[:, 1]) - h], -1)
    return np.minimum(d.max(-1), 0) + length(np.maximum(d, 0))

def sd_round_cone(p, y0, r1, r2, h):  # cono redondeado vertical desde y0
    q = p - np.array([0, y0, 0])
    qx = np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2); qy = q[:, 1]
    b = (r1 - r2) / h; a = np.sqrt(max(1 - b * b, 1e-6))
    k = -qx * b + qy * a  # dot(q,(-b,a))
    d1 = np.sqrt(qx ** 2 + qy ** 2) - r1
    d2 = np.sqrt(qx ** 2 + (qy - h) ** 2) - r2
    d3 = qx * a + qy * b - r1
    return np.where(k < 0, d1, np.where(k > a * h, d2, d3))

def sd_torus_y(p, cy, R, r):  # anillo horizontal
    q = p - np.array([0, cy, 0])
    return np.sqrt((np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2) - R) ** 2 + q[:, 1] ** 2) - r

def sd_torus_xy(p, cx, cy, R, r, sy=1.0):  # anillo vertical (asas), sy estira en vertical
    q = p - np.array([cx, cy, 0])
    rad = np.sqrt(q[:, 0] ** 2 + (q[:, 1] / sy) ** 2)
    return np.sqrt((rad - R) ** 2 + q[:, 2] ** 2) - r

def sd_ellipsoid(p, c, rr):
    q = (p - c) / np.array(rr)
    k0 = length(q); k1 = length(q / np.array(rr))
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)

def hollow_cone(p, y0, r1, r2, h, wall=.03):
    outer = sd_round_cone(p, y0, r1, r2, h)
    inner = sd_round_cone(p, y0 + .06, max(r1 - wall, .01), r2 - wall, h)
    return np.maximum(np.maximum(outer, -inner), p[:, 1] - (y0 + h))

# ---------------- modelos ----------------
def league(p):
    parts = [
        (sd_box(p, [0, .07, 0], [.29, .07, .29]), 3),
        (sd_box(p, [0, .185, 0], [.23, .05, .23]), 3),
        (sd_cyl(p, .255, .025, .17), 1),
        (sd_round_cone(p, .27, .075, .035, .3), 1),
        (sd_sphere(p, [0, .47, 0], .065), 1),
        (hollow_cone(p, .6, .07, .3, .6), 1),
        (sd_torus_y(p, 1.2, .3, .03), 1),
        (sd_torus_xy(p, .31, .98, .13, .03), 1),
        (sd_torus_xy(p, -.31, .98, .13, .03), 1),
    ]
    return parts

def champions(p):
    return [
        (sd_box(p, [0, .06, 0], [.25, .06, .25]), 3),
        (sd_round_cone(p, .12, .2, .05, .2), 2),
        (sd_cyl(p, .42, .1, .04), 2),
        (hollow_cone(p, .5, .06, .27, .62), 2),
        (sd_torus_y(p, 1.12, .27, .028), 2),
        (sd_torus_xy(p, .27, .78, .21, .035, sy=1.9), 2),
        (sd_torus_xy(p, -.27, .78, .21, .035, sy=1.9), 2),
    ]

def cup(p):
    bowl = np.maximum(sd_sphere(p, [0, .8, 0], .3), p[:, 1] - .96)
    lid = np.maximum(sd_ellipsoid(p, np.array([0, .96, 0]), [.3, .13, .3]), .96 - p[:, 1])
    return [
        (sd_box(p, [0, .07, 0], [.27, .07, .27]), 3),
        (sd_box(p, [0, .155, 0], [.275, .018, .275]), 4),
        (sd_round_cone(p, .17, .16, .05, .16), 1),
        (sd_cyl(p, .43, .1, .035), 1),
        (sd_sphere(p, [0, .44, 0], .055), 1),
        (bowl, 1),
        (sd_torus_y(p, .86, .292, .045), 4),
        (lid, 1),
        (sd_cyl(p, 1.13, .05, .028), 1),
        (sd_sphere(p, [0, 1.21, 0], .055), 1),
        (sd_torus_xy(p, .33, .84, .1, .027), 1),
        (sd_torus_xy(p, -.33, .84, .1, .027), 1),
    ]

def conference(p):
    return [
        (sd_cyl(p, .06, .06, .25), 6),
        (sd_torus_y(p, .115, .245, .018), 5),
        (sd_round_cone(p, .13, .08, .17, .62), 2),
        (sd_round_cone(p, .75, .17, .07, .48), 2),
        (sd_torus_y(p, .8, .3, .032), 5),
        (sd_sphere(p, [0, 1.3, 0], .055), 5),
    ]

MODELS = {"league": league, "champions": champions, "cup": cup, "conference": conference}

def scene(fn, p):
    parts = fn(p)
    d = np.stack([x[0] for x in parts], -1)
    i = d.argmin(-1)
    mats = np.array([x[1] for x in parts])[i]
    return d.min(-1), mats

def rot_y(p, a):
    c, s = np.cos(a), np.sin(a)
    return np.stack([c * p[:, 0] + s * p[:, 2], p[:, 1], -s * p[:, 0] + c * p[:, 2]], -1)

def render(fn, angle):
    w, h = W * SS, H * SS
    xs = (np.arange(w) + .5) / w * VIEW_W - VIEW_W / 2
    ys = (1 - (np.arange(h) + .5) / h) * VIEW_H + 0.02
    X, Y = np.meshgrid(xs, ys)
    # cámara ortográfica inclinada: dirección hacia -z y algo hacia abajo
    ce, se = np.cos(ELEV), np.sin(ELEV)
    fwd = np.array([0, -se, -ce]); up = np.array([0, ce, -se]); right = np.array([1., 0, 0])
    center = np.array([0, .68, 0])
    ro = center + X.reshape(-1, 1) * right + (Y.reshape(-1, 1) - .68 - 0.02) * up - fwd * 3
    rd = np.broadcast_to(fwd, ro.shape)
    t = np.zeros(len(ro)); hit = np.zeros(len(ro), bool); mat = np.zeros(len(ro), int)
    f = lambda q: scene(fn, rot_y(q, angle))
    for _ in range(90):
        alive = ~hit & (t < 6)
        if not alive.any(): break
        p = ro[alive] + rd[alive] * t[alive, None]
        d, m = f(p)
        idx = np.where(alive)[0]
        done = d < 1e-3
        hit[idx[done]] = True; mat[idx[done]] = m[done]
        t[idx[~done]] += np.maximum(d[~done] * .9, 1e-3)
    img = np.zeros((len(ro), 4))
    if hit.any():
        p = ro[hit] + rd[hit] * t[hit, None]
        e = 1e-3
        n = np.stack([f(p + np.array(v))[0] - f(p - np.array(v))[0]
                      for v in ([e, 0, 0], [0, e, 0], [0, 0, e])], -1)
        n /= np.maximum(length(n)[:, None], 1e-9)
        L = np.array([-.55, .7, .45]); L /= np.linalg.norm(L)
        V = -fwd
        diff = np.clip(n @ L, 0, 1)
        Hv = (L + V); Hv /= np.linalg.norm(Hv)
        spec = np.clip(n @ Hv, 0, 1) ** 40
        refl = rd[hit] - 2 * (rd[hit] * n).sum(-1, keepdims=True) * n
        env = np.clip(.55 + .45 * refl[:, 1:2], .25, 1)  # cielo claro arriba, suelo oscuro
        col = np.zeros((hit.sum(), 3))
        for k, (_, base, metal) in MAT.items():
            sel = mat[hit] == k
            if not sel.any(): continue
            b = base
            c = b * (.3 + .6 * diff[sel, None]) * (1 - .45 * metal) + b * env[sel] * metal * .8
            c += spec[sel, None] * (.9 * metal + .15)
            col[sel] = c
        img[hit, :3] = np.clip(col, 0, 1)
        img[hit, 3] = 1
    img = img.reshape(h, w, 4)
    # downsample con alfa
    img = img.reshape(H, SS, W, SS, 4).mean((1, 3))
    rgb = np.where(img[..., 3:4] > 0, img[..., :3] / np.maximum(img[..., 3:4], 1e-6), 0)
    return rgb, img[..., 3]

def quantize(frames, k=11, seed=1):
    pts = np.concatenate([f[0][f[1] > .5] for f in frames])
    rng = np.random.default_rng(seed)
    cent = pts[rng.choice(len(pts), k, replace=False)]
    for _ in range(40):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(-1).argmin(1)
        for i in range(k):
            if (lab == i).any(): cent[i] = pts[lab == i].mean(0)
    return cent

def to_pixel(rgb, a, cent, outline=np.array([20, 13, 6])):
    mask = a > .5
    lab = ((rgb[..., None, :] - cent[None, None]) ** 2).sum(-1).argmin(-1)
    out = np.zeros((H, W, 4), np.uint8)
    out[mask, :3] = (cent[lab[mask]] * 255).astype(np.uint8); out[mask, 3] = 255
    m = np.pad(mask, 1)
    edge = m[:-2, 1:-1] | m[2:, 1:-1] | m[1:-1, :-2] | m[1:-1, 2:]
    edge &= ~mask
    out[edge, :3] = outline; out[edge, 3] = 255
    return out

if __name__ == "__main__":
    outdir = sys.argv[1]
    for name, fn in MODELS.items():
        frames = [render(fn, 2 * np.pi * i / FRAMES) for i in range(FRAMES)]
        cent = quantize(frames)
        sheet = np.concatenate([to_pixel(r, a, cent) for r, a in frames], 1)
        Image.fromarray(sheet, "RGBA").save(f"{outdir}/{name}.png", optimize=True)
        print(name, sheet.shape)
