/* Общие куски GLSL для материалов сцены.

   Про uniform-ы во всех материалах сцены: R3F при создании <shaderMaterial> копирует обёртки
   ({ ...uniform }), поэтому запись в исходный объект `uniforms.uTime.value = t` до материала
   не доходит. Векторы при этом «работают» — копируется ссылка на тот же Vector2, — а числа
   молча застревают на значениях первого рендера. Поэтому значения всегда пишутся через ref
   на сам материал: `material.current.uniforms.uTime.value = t`. */

export const NOISE = /* glsl */ `
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i),                  hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float amp = 0.5, sum = 0.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(17.1, 3.7, 9.2);
    amp *= 0.5;
  }
  return sum / 0.9375;
}`;

/* Цвета в шейдерах подобраны «на глаз» в sRGB. three.js считает в линейном пространстве и сам
   кодирует результат под цель рендера: в sRGB для экрана и без кодирования для буфера
   преломления. Поэтому перед выводом цвет переводится в линейный — так планета выглядит
   одинаково и напрямую, и сквозь стекло карточек. */
export const OUTPUT = /* glsl */ `
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), alpha);
  #include <colorspace_fragment>`;

export const PALETTE = /* glsl */ `
const vec3 SPACE  = vec3(0.0196, 0.0118, 0.0588);   // #05030f, совпадает с фоном страницы
const vec3 VIOLET = vec3(0.545, 0.424, 1.0);
const vec3 ORCHID = vec3(0.816, 0.545, 1.0);`;
