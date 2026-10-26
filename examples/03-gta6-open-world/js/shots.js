// Камеры стиль-кадров B (точка 1b). t ∈ [0,1) — (а) из-за спины, через плечо; [1,2) — (а2) после разворота: «не в кадре —
// не рисуется», каркас; [2,3) — (б) город-остров сверху; [3,4) — (в) горизонт, дальние кварталы — одна модель.
// Внутри секунды камера дрейфует (наезд 2–3 %), чтобы подкадры и замер были честными.
(function () {
  const C = window.CITY, H = C.hero;
  const lerp = (a, b, k) => a + (b - a) * k;
  const L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const SUN_HOOK = [-.5, .57, -.65];   // хук: солнце сбоку-спереди слева — контровой по герою, длинные тени поперёк тротуара
  const SHOTS = [
    // (а) за плечом героя, идущего по тротуару вдоль витрин; лёгкое покачивание шага; край маркизы над камерой — в расфокусе
    { id: 'a_behind', pos: [H.x + .72, 1.9, H.z + 4.2], pos2: [H.x + .7, 1.9, H.z + 4.05], bob: .025,
      target: [H.x - 6.5, 1.5, H.z - 40], fov: 55, hero: true, sun: SUN_HOOK, sat: 1.13, ao: 1, fg: 2.6,
      fog: [160, 1500, .4], dof: 4, shadow: [H.x - 4, H.z - 40, 75], mech: {} },
    // (а2-середина) разворот на полпути: справа ещё цветной город, слева — глина; граница видимости проходит по кадру
    { id: 'a2_mid', pos: [H.x + .3, 1.75, H.z + .4], pos2: [H.x + .3, 1.75, H.z + .35],
      target: [H.x - 60, 5, H.z - 2], fov: 60, hero: false, sun: SUN_HOOK, sat: 1.13, ao: 1, split: [0, 1],
      fog: [160, 1500, .4], dof: 3, shadow: [H.x - 30, H.z, 80], mech: {} },
    // (а2-после) разворот завершён: за спиной — глина и светлый каркас под тем же небом
    { id: 'a2_turned', pos: [H.x - .4, 1.8, H.z - 1.2], pos2: [H.x - .4, 1.8, H.z - 1.1],
      target: [H.x - 9, 3.5, H.z + 90], fov: 58, hero: false, void: true, sun: SUN_HOOK, ao: 1,
      fog: [160, 1500, .4], dof: 3, shadow: [H.x - 6, H.z + 45, 80], mech: {} },
    // (б) город-остров сверху: кольцо целиком, бухта с пляжем в кадре
    { id: 'b_island', pos: [H.x + 30, 1180, H.z + 470], pos2: [H.x + 30, 1160, H.z + 462],
      target: [H.x + 10, 0, H.z + 70], fov: 42, hero: true,
      fog: [1400, 3200, .35], dof: 0, shadow: [H.x, H.z + 60, 360], mech: { wedge: 1, ring: 1, ringR: 200, wedgeHalf: 0.62, wedgeRange: 200, heading: 0, front: 1 } },
    // (в) горизонт с воды: пляж с зонтами, пастельные отели, башни разного стекла
    { id: 'c_horizon', pos: [150, 12, 430], pos2: [150, 12, 423],
      target: [75, 52, -400], fov: 27, hero: false,
      fog: [400, 2000, .4], dof: 3, shadow: [80, -100, 720], mech: { lod: 1, lod1: 650, lod2: 662 } },
  ];
  // крупные планы для проверки детализации: один ар-деко с пилоном у героя и одна башня с «короной»
  const B = C.buildings;
  // крупный план ар-деко ближнего плана (фасад настоящей геометрией): дом на авеню справа от героя, фасад на запад (к солнцу)
  const deco = B.filter(b => b.deco && b.floors >= 4 && Math.abs(b.x0 - 19) < 1 && (b.z0 + b.z1) / 2 < H.z - 15 && (b.z0 + b.z1) / 2 > H.z - 150)
    .sort((a, b) => (b.balc || 0) - (a.balc || 0) || b.floors - a.floors)[0];
  if (deco) { const cz = (deco.z0 + deco.z1) / 2, hh = deco.h;
    SHOTS.push({ id: 'd_deco', pos: [deco.x0 - 16, 2.6, cz + 13], pos2: [deco.x0 - 15.8, 2.6, cz + 12.8], target: [deco.x0, hh * .5, cz - 2], fov: 50, hero: false, sun: SUN_HOOK, ao: 1, sat: .85,
      fog: [300, 2000, .3], dof: 0, shadow: [deco.x0, cz, 45], mech: {}, deco: deco.id }); }
  const tw = B.filter(b => b.extra && b.extra.length >= 2 && b.cap !== 'land').sort((a, b) => b.topAll - a.topAll)[0] || B.find(b => b.crown === 1);
  if (tw) { const cx = (tw.x0 + tw.x1) / 2, cz = (tw.z0 + tw.z1) / 2;
    SHOTS.push({ id: 'e_tower', pos: [cx - 55, tw.topAll * .55, cz + 95], pos2: [cx - 54, tw.topAll * .55, cz + 94], target: [cx, tw.topAll * .78, cz], fov: 50, hero: false, fog: [400, 2400, .3], dof: 0, shadow: [cx, cz, 120], mech: {} }); }
  function shotAt(t) {
    const i = Math.max(0, Math.min(SHOTS.length - 1, Math.floor(t)));
    const s = SHOTS[i], k = t - i;
    const cam = L3(s.pos, s.pos2, k * k * (3 - 2 * k));
    if (s.bob) cam[1] += s.bob * Math.sin(t * Math.PI * 2 * 1.8);   // покачивание шага (1,8 шага/с)
    return { ...s, i, k, cam };
  }
  window.SHOTS = SHOTS;
  window.shotAt = shotAt;
})();
