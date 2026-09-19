import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import Backdrop from './Backdrop.jsx';
import Planet from './Planet.jsx';
import Stars from './Stars.jsx';
import Meteor from './Meteor.jsx';
import GlassCards from './GlassCards.jsx';

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
function Ticker({ enabled }) {
  const invalidate = useThree(s => s.invalidate);
  const gl = useThree(s => s.gl);

  useEffect(() => {
    invalidate();
    if (!enabled) return;
    let raf = 0, last = 0, onScreen = true;
    const tick = now => {
      raf = requestAnimationFrame(tick);
      if (!onScreen || now - last < 33) return;
      last = now;
      invalidate();
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
    io.observe(gl.domElement);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [enabled, invalidate, gl]);

  return null;
}

/* Любое изменение раскладки или режима — повод перерисовать кадр, даже если анимация выключена */
function Redraw({ signal }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); }, [signal, invalidate]);
  return null;
}

export default function Sky({ layout, motion, glass }) {
  const { width, height, planet, glow, fade, cards } = layout;
  return (
    <div className="stars" style={{ height }} aria-hidden="true">
      <Canvas flat frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}>
        <color attach="background" args={['#05030f']} />
        <PixelCamera />
        <Ticker enabled={motion} />
        <Redraw signal={layout} />

        <Backdrop width={width} height={height} planet={planet} glow={glow} fade={fade} />
        <Stars width={width} planet={planet} fade={fade} motion={motion} />
        <Planet planet={planet} fade={fade} motion={motion} />
        <Meteor width={width} planet={planet} motion={motion} />
        {glass && <GlassCards cards={cards} motion={motion} />}
      </Canvas>
    </div>
  );
}
