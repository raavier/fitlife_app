// Mapa corporal em 3D: boneco estilizado montado com primitivas do three.js,
// uma malha por região muscular (espelhada), colorida pelo status de
// recuperação. Arraste para girar (OrbitControls), toque para selecionar.
// Carregado via React.lazy para não pesar o bundle inicial.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Musculo, RecuperacaoMusculo } from '../domain';

type Estados = Partial<Record<Musculo, RecuperacaoMusculo>>;

interface Props {
  estados: Estados;
  selecionado?: Musculo | null;
  onSelect: (m: Musculo) => void;
}

const COR = {
  pronto: 0x10b981,
  recuperando: 0xeab308,
  fadigado: 0xef4444,
  sem_dados: 0x334155,
  neutro: 0x1e293b,
};

function corDe(estados: Estados, m: Musculo): number {
  const e = estados[m];
  if (!e) return COR.sem_dados;
  if (e.fadiga <= 0.01) return COR.pronto;
  return COR[e.status];
}

type Forma =
  | { tipo: 'esfera'; r: number }
  | { tipo: 'capsula'; r: number; len: number; rotZ?: number; rotX?: number };

interface Regiao {
  musculo: Musculo;
  pos: [number, number, number]; // lado esquerdo; x>0 é espelhado
  forma: Forma;
  escala?: [number, number, number];
  espelhar?: boolean;
}

// Anatomia estilizada (unidades ~metros; y para cima, z+ é a frente).
const REGIOES: Regiao[] = [
  { musculo: 'trapezio', pos: [0.2, 2.62, -0.06], forma: { tipo: 'esfera', r: 1 }, escala: [0.24, 0.11, 0.18], espelhar: true },
  { musculo: 'peito', pos: [0.21, 2.35, 0.17], forma: { tipo: 'esfera', r: 1 }, escala: [0.24, 0.19, 0.1], espelhar: true },
  { musculo: 'core', pos: [0, 1.82, 0.18], forma: { tipo: 'esfera', r: 1 }, escala: [0.26, 0.34, 0.09] },
  { musculo: 'dorsal', pos: [0.2, 2.18, -0.16], forma: { tipo: 'esfera', r: 1 }, escala: [0.22, 0.3, 0.09], espelhar: true },
  { musculo: 'lombar', pos: [0, 1.72, -0.17], forma: { tipo: 'esfera', r: 1 }, escala: [0.22, 0.2, 0.08] },
  { musculo: 'ombro_anterior', pos: [0.5, 2.44, 0.11], forma: { tipo: 'esfera', r: 0.11 }, espelhar: true },
  { musculo: 'ombro_lateral', pos: [0.6, 2.49, 0], forma: { tipo: 'esfera', r: 0.12 }, espelhar: true },
  { musculo: 'ombro_posterior', pos: [0.5, 2.44, -0.11], forma: { tipo: 'esfera', r: 0.11 }, espelhar: true },
  { musculo: 'biceps', pos: [0.63, 2.1, 0.06], forma: { tipo: 'capsula', r: 0.085, len: 0.34, rotZ: 0.12 }, espelhar: true },
  { musculo: 'triceps', pos: [0.63, 2.1, -0.07], forma: { tipo: 'capsula', r: 0.085, len: 0.34, rotZ: 0.12 }, espelhar: true },
  { musculo: 'antebraco', pos: [0.7, 1.55, 0], forma: { tipo: 'capsula', r: 0.075, len: 0.42, rotZ: 0.08 }, espelhar: true },
  { musculo: 'gluteo', pos: [0.17, 1.34, -0.17], forma: { tipo: 'esfera', r: 0.16 }, espelhar: true },
  { musculo: 'quadriceps', pos: [0.21, 0.95, 0.09], forma: { tipo: 'capsula', r: 0.12, len: 0.5 }, espelhar: true },
  { musculo: 'posterior_coxa', pos: [0.21, 0.95, -0.1], forma: { tipo: 'capsula', r: 0.11, len: 0.5 }, espelhar: true },
  { musculo: 'adutores', pos: [0.09, 1.02, 0], forma: { tipo: 'capsula', r: 0.07, len: 0.4 }, espelhar: true },
  { musculo: 'abdutores', pos: [0.33, 1.15, 0], forma: { tipo: 'capsula', r: 0.07, len: 0.3 }, espelhar: true },
  { musculo: 'panturrilha', pos: [0.21, 0.34, -0.08], forma: { tipo: 'capsula', r: 0.095, len: 0.34 }, espelhar: true },
];

// Partes neutras (não clicáveis) que dão silhueta ao boneco.
const NEUTRAS: { pos: [number, number, number]; forma: Forma; escala?: [number, number, number]; espelhar?: boolean }[] = [
  { pos: [0, 3.02, 0], forma: { tipo: 'esfera', r: 0.24 } }, // cabeça
  { pos: [0, 2.7, 0], forma: { tipo: 'capsula', r: 0.09, len: 0.16 } }, // pescoço
  { pos: [0, 2.05, 0], forma: { tipo: 'capsula', r: 0.36, len: 0.75 }, escala: [1, 1, 0.62] }, // tronco
  { pos: [0, 1.4, 0], forma: { tipo: 'esfera', r: 1 }, escala: [0.4, 0.26, 0.3] }, // pelve
  { pos: [0.71, 1.2, 0], forma: { tipo: 'esfera', r: 0.09 }, espelhar: true }, // mãos
  { pos: [0.21, 0.62, 0], forma: { tipo: 'esfera', r: 0.11 }, espelhar: true }, // joelhos
  { pos: [0.21, 0.32, 0.03], forma: { tipo: 'capsula', r: 0.075, len: 0.42 }, espelhar: true }, // canela
  { pos: [0.21, 0.03, 0.1], forma: { tipo: 'esfera', r: 1 }, escala: [0.11, 0.07, 0.2], espelhar: true }, // pés
];

function criarGeometria(f: Forma): THREE.BufferGeometry {
  if (f.tipo === 'esfera') return new THREE.SphereGeometry(f.r, 24, 18);
  const g = new THREE.CapsuleGeometry(f.r, f.len, 6, 16);
  return g;
}

export default function BodyMap3D({ estados, selecionado, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const materiais = useRef(new Map<Musculo, THREE.MeshStandardMaterial>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Monta a cena uma única vez.
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const largura = el.clientWidth;
    const altura = 360;
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, largura / altura, 0.1, 50);
    camera.position.set(0, 2.1, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(largura, altura);
    el.appendChild(renderer.domElement);

    cena.add(new THREE.AmbientLight(0xffffff, 0.75));
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(2.5, 4, 3);
    cena.add(luz);
    const luzTras = new THREE.DirectionalLight(0x93c5fd, 0.5);
    luzTras.position.set(-2, 3, -3);
    cena.add(luzTras);

    const clicaveis: THREE.Mesh[] = [];
    const matNeutro = new THREE.MeshStandardMaterial({ color: COR.neutro, roughness: 0.75 });

    function addMesh(
      forma: Forma,
      pos: [number, number, number],
      escala: [number, number, number] | undefined,
      material: THREE.Material,
      espelhado: boolean,
      musculo?: Musculo,
    ) {
      const mesh = new THREE.Mesh(criarGeometria(forma), material);
      const x = espelhado ? -pos[0] : pos[0];
      mesh.position.set(x, pos[1], pos[2]);
      if (escala) mesh.scale.set(...escala);
      if (forma.tipo === 'capsula' && forma.rotZ) mesh.rotation.z = espelhado ? -forma.rotZ : forma.rotZ;
      if (forma.tipo === 'capsula' && forma.rotX) mesh.rotation.x = forma.rotX;
      if (musculo) {
        mesh.userData.musculo = musculo;
        clicaveis.push(mesh);
      }
      cena.add(mesh);
    }

    for (const n of NEUTRAS) {
      addMesh(n.forma, n.pos, n.escala, matNeutro, false);
      if (n.espelhar) addMesh(n.forma, n.pos, n.escala, matNeutro, true);
    }
    for (const r of REGIOES) {
      let mat = materiais.current.get(r.musculo);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({ color: COR.sem_dados, roughness: 0.55 });
        materiais.current.set(r.musculo, mat);
      }
      addMesh(r.forma, r.pos, r.escala, mat, false, r.musculo);
      if (r.espelhar) addMesh(r.forma, r.pos, r.escala, mat, true, r.musculo);
    }

    const controles = new OrbitControls(camera, renderer.domElement);
    controles.target.set(0, 1.7, 0);
    controles.enablePan = false;
    controles.minDistance = 2.5;
    controles.maxDistance = 8;
    controles.autoRotate = true;
    controles.autoRotateSpeed = 1.2;
    controles.addEventListener('start', () => (controles.autoRotate = false));

    // Toque/click seleciona músculo (só se não foi um arrasto).
    const raycaster = new THREE.Raycaster();
    let downX = 0;
    let downY = 0;
    function onDown(ev: PointerEvent) {
      downX = ev.clientX;
      downY = ev.clientY;
    }
    function onUp(ev: PointerEvent) {
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return; // arrastou
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(clicaveis, false);
      const musculo = hits[0]?.object.userData.musculo as Musculo | undefined;
      if (musculo) onSelectRef.current(musculo);
    }
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    let vivo = true;
    function animar() {
      if (!vivo) return;
      requestAnimationFrame(animar);
      controles.update();
      renderer.render(cena, camera);
    }
    animar();

    const aoRedimensionar = () => {
      const w = el.clientWidth;
      camera.aspect = w / altura;
      camera.updateProjectionMatrix();
      renderer.setSize(w, altura);
    };
    const observer = new ResizeObserver(aoRedimensionar);
    observer.observe(el);

    return () => {
      vivo = false;
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controles.dispose();
      renderer.dispose();
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      el.removeChild(renderer.domElement);
    };
    // materiais são atualizados no efeito abaixo — a cena não é reconstruída
  }, []);

  // Recolore quando os estados ou a seleção mudam.
  useEffect(() => {
    for (const [musculo, mat] of materiais.current) {
      mat.color.setHex(corDe(estados, musculo));
      const sel = selecionado === musculo;
      mat.emissive.setHex(sel ? 0xf8fafc : 0x000000);
      mat.emissiveIntensity = sel ? 0.35 : 0;
    }
  }, [estados, selecionado]);

  return (
    <div>
      <div ref={container} className="w-full touch-none overflow-hidden rounded-xl" style={{ height: 360 }} />
      <p className="mt-1 text-center text-xs text-slate-500">Arraste para girar · pinça para zoom · toque num músculo</p>
      <div className="mt-1 flex justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: '#10b981' }} /> Pronto</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: '#eab308' }} /> Recuperando</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} /> Fadigado</span>
      </div>
    </div>
  );
}
