import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import FirstFrame from './FirstFrame';
import type { CardRect } from '../types';

/* Liquid glass средствами drei, без собственного шейдера.
   На месте каждой DOM-карточки стоит настоящая 3D-плита со скруглёнными рёбрами, а
   MeshTransmissionMaterial преломляет сцену за ней по настоящим нормалям: плоская грань почти
   не искажает фон, фаска работает как линза. Блики дают карта окружения из световых панелей
   и точечный свет, который ходит за курсором.

   transmissionSampler — материал читает общий буфер преломления three.js, и сцена за стёклами
   рендерится один раз на кадр. Без него каждая плита рендерила бы сцену в собственный буфер. */

const RADIUS = 18;   // совпадает с border-radius карточки в CSS
const BEVEL = 8;     // ширина фаски. У RoundedBox из drei она жёстко равна радиусу — 18px выглядят как толстая рама
const DEPTH = 28;

/* Плита: контур со скруглением (RADIUS − BEVEL), выдавленный с фаской BEVEL, — снаружи выходит ровно RADIUS */
function useSlabGeometry(w: number, h: number): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const iw = w - 2 * BEVEL, ih = h - 2 * BEVEL, r = RADIUS - BEVEL;
    const shape = new THREE.Shape();
    shape.absarc(r, r, r, -Math.PI / 2, -Math.PI, true);
    shape.absarc(r, ih - r, r, Math.PI, Math.PI / 2, true);
    shape.absarc(iw - r, ih - r, r, Math.PI / 2, 0, true);
    shape.absarc(iw - r, r, r, 0, -Math.PI / 2, true);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH - 2 * BEVEL, bevelEnabled: true, bevelSize: BEVEL, bevelThickness: BEVEL, bevelSegments: 10, curveSegments: 10,
    });
    extruded.center();
    const smooth = toCreasedNormals(extruded, 0.4);   // без этого фаска гранёная: у ExtrudeGeometry нормали по граням
    extruded.dispose();
    return smooth;
  }, [w, h]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/* Карточка блокнота — не больше ~360×280 CSS-px; плита экрана входа — одна на весь `.auth-card`,
   ~900×420, в разы крупнее. PointerLight (intensity=5, decay=0) и roughness=0.1 ниже подобраны на
   сетке блокнотов: там блик — узкое пятно, которое пробегает по многим мелким граням и не
   задерживается на одном месте дольше кадра-двух. На одной большой плоской плите то же зеркальное
   отражение точечного света превращается в неподвижный (пока курсор не двигают) яркий шар прямо
   на пейзаже формы — задача 6, критерий приёмки. `card.large` — явный признак от вызывающей
   стороны (useSceneLayout ставит его по классу `auth-card`), не вывод из площади: связь с
   размерами конкретной вёрстки была бы такой же хрупкой, но неявной. */
function Slab({ card }: { card: CardRect }) {
  const geometry = useSlabGeometry(card.w, card.h);
  const large = card.large;
  return (
    <mesh geometry={geometry} position={[card.x, -card.y, DEPTH / 2 + 20]}>
      {/* Для большой плиты гасим два механизма, которые на ней работают против нас.
          Хроматическая аберрация расщепляет каждый точечный источник за стеклом на красную
          и синюю каёмку — а за карточкой стоят мерцающие звёзды (Stars.tsx, alpha ходит
          по синусу), и они превращались в пульсирующие цветные точки. Высокая шероховатость
          раздувала их же в пятна: она была поднята ради блика от PointerLight, но на экране
          входа этот источник не нужен (см. ниже), поэтому размытие можно вернуть к обычному.
          У карточек блокнотов всё остаётся как было. */}
      <MeshTransmissionMaterial
        transmissionSampler
        transmission={1}
        thickness={60}
        roughness={0.1}
        ior={1.4}
        chromaticAberration={large ? 0 : 0.5}
        anisotropicBlur={large ? 0 : 0.3}
        samples={6}
        color="#ffffff"
        attenuationColor={large ? '#140b33' : undefined}
        attenuationDistance={large ? 190 : undefined}
        envMapIntensity={large ? 0.55 : 1}
      />
    </mesh>
  );
}

function PointerLight({ motion }: { motion: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const target = useRef({ x: -2000, y: 2000 });     // без курсора свет стоит слева сверху
  const gl = useThree(s => s.gl);
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = gl.domElement.getBoundingClientRect();
      target.current = { x: e.clientX - r.left, y: -(e.clientY - r.top) };
      invalidate();                                   // при выключенной анимации блик всё равно отвечает
    };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, [gl, invalidate]);

  useFrame(() => {
    if (!light.current) return;
    const p = light.current.position, k = motion ? 0.18 : 1;   // инерция только когда идёт анимация
    p.x += (target.current.x - p.x) * k;
    p.y += (target.current.y - p.y) * k;
  });

  // decay=0: сцена измеряется в пикселях, физическое затухание по квадрату расстояния погасило бы свет
  return <pointLight ref={light} position={[-2000, 2000, 260]} intensity={5} decay={0} color="#efe9ff" />;
}

interface GlassCardsProps {
  cards: CardRect[];
  motion: boolean;
  /** первый кадр со стёклами на экране — DOM-карточки можно делать прозрачными */
  onReady: () => void;
}

export default function GlassCards({ cards, motion, onReady }: GlassCardsProps) {
  /* Точечный свет за курсором нужен сетке блокнотов: там блик пробегает по мелким граням.
     На одной большой плите он превращался в неподвижный яркий шар поверх полей формы — ради
     его размытия и поднимали шероховатость, а та раздувала звёзды за стеклом в пятна. Проще
     не зажигать источник там, где он мешает: на экране входа блики даёт карта окружения. */
  const hasLarge = cards.some(c => c.large);
  return (
    <>
      {/* Окружение рисуется один раз из световых панелей — файлов HDR не нужно.
          Камера смотрит строго вдоль Z, поэтому верхняя фаска отражает только то, что лежит в плоскости X=0,
          а боковая — в плоскости Y=0. Панели стоят по осям и сделаны широкими: от их углового размера
          зависит толщина блика на фаске. Панель за камерой даёт слабый отсвет на плоских гранях. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 8, 4]} scale={[24, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} color="#e6dcff" position={[-8, 0, 4]} scale={[10, 24, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#8b6cff" position={[8, 0, 4]} scale={[10, 24, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#d08bff" position={[0, -8, 4]} scale={[24, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} color="#9d8cff" position={[0, 0, 10]} scale={[30, 30, 1]} target={[0, 0, 0]} />
      </Environment>
      {!hasLarge && <PointerLight motion={motion} />}
      {cards.map((card, i) => <Slab key={i} card={card} />)}
      {cards.length > 0 && <FirstFrame onReady={onReady} />}
    </>
  );
}
