// Гидросамолёт бита «2002 · PS2»: Small Airplane by Vojtěch Balák, CC-BY 3.0 (poly.pizza/m/7cvx6ex-xfL),
// assets/3d/LICENSE-plane-CC-BY-3.0.txt. Перекрашен в пастель, свет — солнце с тенью стиля B; поплавки — свои боксы.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COMMON, U } from './glsl.js';

const COL = { White: '#EDE8DE', Red: '#D98A78', Gray: '#7D8590', Black: '#2A2E35' };
function mat(col) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uC: { value: new THREE.Color(col) } }),
    vertexShader: `varying vec3 vN; varying vec3 vWp; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vWp = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: COMMON + `uniform vec3 uC; varying vec3 vN; varying vec3 vWp;
      void main(){ if (uShadowPass > .5) { gl_FragColor = vec4(0.); return; }
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; vec3 V = normalize(cameraPosition - vWp);
        vec3 c = uC * lightAt(vWp, n, 1.);
        float fres = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
        c += skyRefl(reflect(-V, n)) * fres * .4 + uSunCol * pow(max(dot(reflect(-V, n), uSunDir), 0.), 80.) * .8;
        float d = distance(cameraPosition, vWp); gl_FragColor = vec4(applyFog(c, d, vWp.y), depthA(d)); }`,
  });
}
export async function buildPlane() {
  const g = await new GLTFLoader().loadAsync('assets/3d/plane.glb');
  const root = g.scene;
  root.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map(m => mat(COL[m.name] || '#' + m.color.getHexString())); o.material = Array.isArray(o.material) ? nm : nm[0]; o.frustumCulled = false; } });
  // поплавки гидросамолёта
  const fm = mat('#EDE8DE');
  for (const sx of [-1.4, 1.4]) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(.32, 4.6, 6, 12), fm); f.rotation.x = Math.PI / 2; f.position.set(sx, -1.6, 1.6); root.add(f);
    const st = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.1, .08), mat('#7D8590')); st.position.set(sx, -1.0, 2.4); root.add(st); }
  const grp = new THREE.Group(); grp.add(root); grp.visible = false;
  return grp;
}
