// Пешеходы: Quaternius Ultimate Modular Characters (Casual_2, Punk, Suit, Worker — CC0), днём — лёгкая летняя одежда.
// Позиция — функция t: x фиксирован (тротуар), z = z0 + dir·speed·t в пределах участка; клип Walk или Idle.
import * as THREE from 'three';
import { loadHero } from './hero.js';

const C = window.CITY;
const FILES = ['Casual_2', 'Punk', 'Suit', 'Worker'];
const SKIN = ['#C99B7E', '#8E6450', '#E2B89A', '#6B4A3A'];
const DARK = { Hair: '#2A1E18', Eyebrows: '#2A1E18', Eye: '#101010' };
const CLOTH = ['#F2EFE8', '#3B5B8C', '#D98C6A', '#7FB8B0', '#E6D3A3', '#2E3440', '#C76B6B', '#9DB3D6'];   // лёгкая летняя одежда

export async function buildPeople() {
  const grp = new THREE.Group(), list = [];
  for (const [i, r] of C.people.rows.entries()) {
    const [x, z0, dir, speed, model, phase] = r;
    const recolor = new Proxy({}, { get: (_, k) => (k === 'Skin' || k === 'Skin_Darker') ? SKIN[i % SKIN.length] : DARK[k] || CLOTH[(i * 3 + String(k).length) % CLOTH.length] });
    const p = await loadHero(`assets/3d/people_${FILES[model]}.gltf`, { recolor, clip: speed > 0 ? 'Walk' : 'Idle', phase, noPose: true, keepLegs: true, rim: .7, height: 1.66 + (i % 5) * .04 });
    grp.add(p.group); list.push({ p, x, z0, dir, speed });
  }
  return {
    group: grp,
    update(t) {
      for (const o of list) {
        const span = 120, s = ((o.speed * t) % span + span) % span;
        const z = o.z0 + o.dir * (s - span / 2);
        o.p.group.position.set(o.x, 0, z);
        o.p.group.visible = !(o.x > 13 && z > C.hero.z - 12);   // не проходить сквозь объектив за плечом героя
        o.p.group.rotation.y = o.dir > 0 ? 0 : Math.PI;
        o.p.update(t);
      }
    },
  };
}
