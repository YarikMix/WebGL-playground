import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/* Сообщает наружу, что кадр с этим компонентом уже на экране. useFrame вызывается до рендера,
   поэтому колбэк откладывается на следующий rAF: к этому моменту шейдеры скомпилированы и кадр
   нарисован. По этому сигналу страница меняет вёрстку — гасит CSS-фон, делает карточки прозрачными. */
export default function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}
