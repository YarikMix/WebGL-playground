import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point3 } from '../auth/flight';
import { planetVertexShader, planetFragmentShader } from './planet-shaders';

export default function AuthPlanet({ position, cool, motion }: { position: Point3; cool: boolean; motion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uRadius: { value: 1368 }, uFade: { value: new THREE.Vector2(1000, 2000) },
    uPerspective: { value: 1 },
    uAtmosphereTint: { value: new THREE.Vector3(...(cool ? [0.39, 0.62, 1] : [0.545, 0.424, 1])) },
    uSun: { value: new THREE.Vector3(cool ? .45 : -.45, .55, .55).normalize() },
  }), [cool]);
  const atmosphere = useMemo(() => ({ tint: { value: new THREE.Color(cool ? '#7ba2ff' : '#b99aff') } }), [cool]);
  useFrame((state, delta) => {
    if (!motion || !mesh.current || !material.current) return;
    mesh.current.rotation.y += Math.min(delta, .1) * .018;
    material.current.uniforms.uTime!.value = state.clock.elapsedTime;
  });
  return (
    <group position={[...position]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.65, 96, 64]} />
        <shaderMaterial ref={material} vertexShader={planetVertexShader} fragmentShader={planetFragmentShader} uniforms={uniforms} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.76, 64, 32]} />
        <shaderMaterial uniforms={atmosphere} transparent depthWrite={false} blending={THREE.AdditiveBlending}
          vertexShader={`varying vec3 n; varying vec3 v;
            void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;v=-p.xyz;gl_Position=projectionMatrix*p;}`}
          fragmentShader={`uniform vec3 tint; varying vec3 n; varying vec3 v;
            void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,rim*.20);}`} />
      </mesh>
    </group>
  );
}
