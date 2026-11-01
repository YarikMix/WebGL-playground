import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { sampleFlight, samplePose, type AuthFlight } from '../auth/flight';
import AuthPlanet from './AuthPlanet';
import FirstFrame from './FirstFrame';

interface AuthSceneProps {
  flight: AuthFlight;
  motion: boolean;
  switchRef: RefObject<HTMLButtonElement | null>;
  onArrive: (startedAt: number) => void;
  onReady: () => void;
}

export default function AuthScene({ flight, motion, switchRef, onArrive, onReady }: AuthSceneProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const arrived = useRef<number | null>(null);
  const size = useThree(s => s.size);
  const gl = useThree(s => s.gl);
  const invalidate = useThree(s => s.invalidate);
  const point = useMemo(() => new THREE.Vector3(), []);
  const narrow = size.width < 700 || size.width / size.height < 1.55;
  const mainRadius = Math.min(size.width * .427, 260);
  const fov = narrow ? THREE.MathUtils.radToDeg(2 * Math.atan(1.65 / Math.sqrt(3 ** 2 + .8 ** 2 + 1.8 ** 2 - 1.65 ** 2) * size.height / (2 * mainRadius))) : 44;
  useEffect(() => {
    const button = switchRef.current;
    return () => button?.removeAttribute('style');
  }, [switchRef]);
  const stars = useMemo(() => {
    let seed = 17;
    const rnd = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    const positions = new Float32Array(1100 * 3);
    for (let i = 0; i < 1100; i++) positions.set([(rnd() - .5) * 100, (rnd() - .5) * 65, -4 - rnd() * 90], i * 3);
    return positions;
  }, []);

  useFrame(() => {
    const cam = camera.current;
    if (!cam) return;
    const sample = sampleFlight(flight, performance.now());
    if (flight.startedAt !== null && !sample.done) invalidate();
    const pose = samplePose(sample.progress);
    cam.position.set(...pose.eye);
    if (narrow) cam.position.set(-11 + 22 * sample.progress, pose.eye[1], 1.8 + .2 * Math.sin(Math.PI * sample.progress));
    cam.lookAt(...pose.lookAt);
    cam.updateMatrixWorld();
    if (sample.done && flight.startedAt !== null && arrived.current !== flight.startedAt) {
      arrived.current = flight.startedAt;
      onArrive(flight.startedAt);
    }
    const button = switchRef.current;
    if (!button || flight.startedAt !== null) return;
    const other = flight.mode === 'login' ? 8 : -8;
    point.set(other, 0, 0).applyMatrix4(cam.matrixWorldInverse);
    const canvasRect = gl.domElement.getBoundingClientRect();
    const parentRect = button.offsetParent?.getBoundingClientRect();
    // Проекция силуэта сферы: расстояние до центра недооценивает размер сбоку от оптической оси.
    const depth = -point.z, denominator = depth * depth - 1.65 ** 2;
    const scale = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    button.style.left = `${canvasRect.left - (parentRect?.left ?? 0) + size.width / 2 + point.x * depth / denominator * scale}px`;
    button.style.top = `${canvasRect.top - (parentRect?.top ?? 0) + size.height / 2 - point.y * depth / denominator * scale}px`;
    button.style.width = `${Math.max(44, 3.3 * Math.sqrt(depth * depth + point.x * point.x - 1.65 ** 2) / denominator * scale)}px`;
    button.style.height = `${Math.max(44, 3.3 * Math.sqrt(depth * depth + point.y * point.y - 1.65 ** 2) / denominator * scale)}px`;
  });

  return <>
    <PerspectiveCamera ref={camera} makeDefault fov={fov} near={.1} far={200} />
    <AuthPlanet position={[-8, 0, 0]} cool={false} motion={motion} />
    <AuthPlanet position={[8, 0, 0]} cool motion={motion} />
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry>
      <pointsMaterial color="#d8ceff" size={.065} sizeAttenuation transparent opacity={.68} depthWrite={false} />
    </points>
    <FirstFrame onReady={onReady} />
  </>;
}
