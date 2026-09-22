import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import FirstFrame from './FirstFrame';
import Backdrop from './Backdrop';
import Planet from './Planet';
import Stars from './Stars';
import Meteor from './Meteor';
import GlassCards from './GlassCards';
import type { SceneLayout, SunDirection } from '../types';

/* Сцена в координатах страницы: X вправо, Y вверх, 1 единица = 1 CSS-пиксель, левый верхний угол
   канваса — (0, 0). Камера ортографическая, поэтому меши встают ровно на свои DOM-места.

   Камера отодвинута на 100 000 единиц. На проекцию это не влияет, но MeshTransmissionMaterial
   считает направление взгляда как normalize(cameraPosition − pos), то есть ждёт перспективную
   камеру. С далёкой камерой лучи почти параллельны, и преломление не перекашивает к краям экрана. */
const CAMERA_Z = 100000;

function PixelCamera() {
  const { width, height } = useThree(s => s.size);
  return <OrthographicCamera makeDefault position={[width / 2, -height / 2, CAMERA_Z]} near={CAMERA_Z - 4000} far={CAMERA_Z + 16000} />;
}

/* Рендер по требованию: 30 кадров/с вместо 60, пауза вне экрана (в фоновой вкладке rAF сам встаёт).
   При выключенной анимации тикер не работает — кадр рисуется только когда что-то изменилось. */
function Ticker({ enabled, tickMs }: { enabled: boolean; tickMs: number }) {
  const invalidate = useThree(s => s.invalidate);
  const gl = useThree(s => s.gl);

  useEffect(() => {
    invalidate();
    if (!enabled) return;
    let raf = 0, last = 0, onScreen = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!onScreen || now - last < tickMs) return;
      last = now;
      invalidate();
    };
    const io = new IntersectionObserver(([entry]) => { onScreen = entry?.isIntersecting ?? true; });
    io.observe(gl.domElement);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [enabled, tickMs, invalidate, gl]);

  return null;
}

/* Любое изменение раскладки или режима — повод перерисовать кадр, даже если анимация выключена */
function Redraw({ signal }: { signal: unknown }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); }, [signal, invalidate]);
  return null;
}

interface SkyProps {
  layout: SceneLayout;
  motion: boolean;
  glass: boolean;
  sun: SunDirection;
  spin: number;
  /** непрерывных кадров нет (анимация выключена или `prefers-reduced-motion`) — Planet/Backdrop
      ставят угол солнца сразу, без сглаживания, чтобы одного заказанного кадра хватило */
  reducedMotion: boolean;
  tickMs: number;
  onReady: () => void;
  onGlassReady: () => void;
}

export default function Sky({ layout, motion, glass, sun, spin, reducedMotion, tickMs, onReady, onGlassReady }: SkyProps) {
  const { width, height, planet, glow, fade, cards } = layout;
  return (
    <div className="stars" style={{ height }} aria-hidden="true">
      <Canvas flat frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}>
        <color attach="background" args={['#05030f']} />
        <PixelCamera />
        <Ticker enabled={motion} tickMs={tickMs} />
        <Redraw signal={layout} />
        {/* Без этого сигнала смена sun/spin не заказывала ни одного кадра при frameloop="demand":
            свет менялся в uniform-е, но канвас никогда не перерисовывался (CRITICAL финального ревью) */}
        <Redraw signal={spin} />
        <FirstFrame onReady={onReady} />

        <Backdrop width={width} height={height} planet={planet} glow={glow} fade={fade} sun={sun} spin={spin}
          motion={motion} reducedMotion={reducedMotion} />
        <Stars width={width} planet={planet} fade={fade} motion={motion} />
        <Planet planet={planet} fade={fade} motion={motion} sun={sun} spin={spin} reducedMotion={reducedMotion} />
        <Meteor width={width} planet={planet} motion={motion} />
        {glass && <GlassCards cards={cards} motion={motion} onReady={onGlassReady} />}
      </Canvas>
    </div>
  );
}
