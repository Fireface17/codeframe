// Общие куски GLSL стиля B: хеши, шум, туман, состояния механик (подгрузка кольцом, клин взгляда, LOD, каркас «не в кадре»).
// Кадр — функция t: всё «случайное» — хеш от координат и id, время приходит только через uTime.
// Непрозрачные материалы пишут в альфу глубину (0 — рядом, 1 — даль/небо): по ней пост делает мягкую резкость дальнего плана.
export const COMMON = /* glsl */`
uniform float uTime;
uniform vec3 uFogCol; uniform float uFogNear, uFogFar, uFogMax; uniform vec3 uSkyCol;
uniform vec2 uHero; uniform vec2 uDir;
uniform float uHalf, uRange, uRingR, uMech, uWedge, uRing, uLod, uLod1, uLod2, uFront, uVoid, uDepthScale;
uniform vec4 uGrid;   // avX0, avStep, stZ0, stStep
uniform vec4 uBay;    // cx, cz, rx, rz
uniform float uSeaZ, uLampSp, uLampOff;
uniform vec3 uLampCol;
// день: солнце (ключ) с тенью, небо (заполнение), отсвет земли; «глина» — модель без отрисовки
uniform sampler2D tShadow; uniform mat4 uSunMat; uniform vec3 uSunDir, uSunCol, uAmbSky, uAmbGround, uSkyHor, uSkyTop;
uniform float uShadowPass, uShadowTexel, uClay;
// середина разворота: граница видимости — вертикальная плоскость через героя; за ней (по нормали) — глина
uniform vec4 uSplit;   // nx, nz, включено, ширина шва
uniform float uWedgeClay, uOccl, uExplode, uRetro, uDim, uMerge, uScanZ, uRingY;
uniform vec4 uMergeRect; uniform vec3 uHl;   // x, z, радиус волны подсветки простых домов   // фильм: вне клина — глина; перекрытие; «рассыпание»; эпоха PS2
float wedgeOf(vec2 p, float r);
float voidAt(vec3 wp){ return max(max(uVoid, uSplit.z * step(0., dot(wp.xz - uHero, uSplit.xy))), uWedgeClay * (1. - wedgeOf(wp.xz, 0.))); }
float seamAt(vec3 wp, float fw){ return uSplit.z * (1. - smoothstep(uSplit.w, uSplit.w + fw * 2., abs(dot(wp.xz - uHero, uSplit.xy)))); }
float shadowAt(vec3 wp, vec3 n){
  vec4 sc = uSunMat * vec4(wp + n * .25, 1.); vec3 p = sc.xyz / sc.w * .5 + .5;
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1. || p.z > 1.) return 1.;
  // мягкий край: 16 отсчётов по спирали радиусом 2,5 текселя, поворот — хеш пикселя мира (детерминированно)
  float s = 0., rot = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  for (int i = 0; i < 16; i++) { float fi = float(i) + .5; float r = 2.5 * sqrt(fi / 16.); float a = fi * 2.39996 + rot;
    s += step(p.z - .0007, texture2D(tShadow, p.xy + vec2(cos(a), sin(a)) * r * uShadowTexel).r); }
  return s / 16.;
}
vec3 lightAt(vec3 wp, vec3 n, float ao){
  float sh = shadowAt(wp, n);
  float ndl = max(dot(n, uSunDir), 0.);
  vec3 sky = mix(uAmbGround, uAmbSky, n.y * .5 + .5);
  return sky * ao + uSunCol * ndl * sh;
}
// отражение неба в стекле: снизу — горизонт, сверху — зенит
vec3 skyRefl(vec3 r){ return mix(uSkyHor, uSkyTop, smoothstep(-.05, .45, r.y)); }
const vec3 CLAY = vec3(.4, .385, .36);   // тёплая серая глина

float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }

// воздушная перспектива: от uFogNear до uFogFar даль уходит в дымку #2A3346 (не в чёрное), у земли гуще
float fogF(float d, float y){ float f = smoothstep(uFogNear, uFogFar, d); f = pow(f, .85) * uFogMax; return clamp(f * (.8 + .2 * exp(-max(y, 0.) / 90.)), 0., 1.); }
vec3 applyFog(vec3 c, float d, float y){ return mix(c, uFogCol, fogF(d, y)); }
float depthA(float d){ return clamp(d / uDepthScale, 0., 1.); }

float inWater(vec2 p){ vec2 d = (p - uBay.xy) / uBay.zw; return max(step(uSeaZ, p.y), step(dot(d, d), 1.)); }
// центр клетки подгрузки (2×2 квартала) для точки
vec2 cellCenter(vec2 p){
  float ci = floor((p.x - uGrid.x) / (2. * uGrid.y)), cj = floor((p.y - uGrid.z) / (2. * uGrid.w));
  return vec2(uGrid.x + (ci + .5) * 2. * uGrid.y, uGrid.z + (cj + .5) * 2. * uGrid.w);
}
// 1 — клетка в памяти, 0 — на диске (кольцо подгрузки вокруг героя)
float loadOf(vec2 cell){ if (uRing < .5) return 1.; float d = length(cell - uHero); return smoothstep(uRingR + 25., uRingR - 25., d); }
// 1 — в клине взгляда (рисуется), 0 — вне
float wedgeOf(vec2 p, float r){ if (uWedge < .5) return 1.; vec2 v = p - uHero; float d = length(v); if (d < r + 2.) return 1.;
  float a = acos(clamp(dot(v / d, uDir), -1., 1.)) - atan(r / d);
  return (1. - smoothstep(uHalf - .015, uHalf + .015, a)) * (1. - smoothstep(uRange - 6., uRange + 6., d - r)); }
`;

export const U = {
  uTime: { value: 0 }, uFogCol: { value: null }, uFogNear: { value: 60 }, uFogFar: { value: 600 }, uFogMax: { value: .85 }, uSkyCol: { value: null },
  uHero: { value: null }, uDir: { value: null },
  uHalf: { value: .6 }, uRange: { value: 300 }, uRingR: { value: 300 }, uMech: { value: 0 }, uWedge: { value: 0 }, uRing: { value: 0 },
  uLod: { value: 0 }, uLod1: { value: 600 }, uLod2: { value: 900 }, uFront: { value: 0 }, uVoid: { value: 0 }, uDepthScale: { value: 900 },
  uGrid: { value: null }, uBay: { value: null }, uSeaZ: { value: 700 }, uLampSp: { value: 28 }, uLampOff: { value: 14 }, uLampCol: { value: null },
  tShadow: { value: null }, uSunMat: { value: null }, uSunDir: { value: null }, uSunCol: { value: null }, uAmbSky: { value: null }, uAmbGround: { value: null },
  uSkyHor: { value: null }, uSkyTop: { value: null }, uShadowPass: { value: 0 }, uShadowTexel: { value: 1 / 4096 }, uClay: { value: 0 }, uSplit: { value: null },
  uWedgeClay: { value: 0 }, uOccl: { value: 0 }, uExplode: { value: 0 }, uRetro: { value: 0 }, uDim: { value: 0 }, uMerge: { value: 0 }, uScanZ: { value: 1e5 }, uRingY: { value: 0 },
  uMergeRect: { value: null }, uHl: { value: null },
};
