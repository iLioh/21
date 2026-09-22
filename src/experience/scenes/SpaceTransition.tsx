import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Mesh, ShaderMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { smoothstep } from '../../utils/math'

const vertexShader = `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uSpace;
  varying vec3 vPos;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main() {
    vec3 dir = normalize(vPos);

    // ==================== 1. CIELO DIURNO (DAYTIME SKY) ====================
    // Gradiente celeste vivo y luminoso de verano
    float h = clamp((dir.y + 0.15) / 1.15, 0.0, 1.0);
    vec3 skyHorizon = vec3(0.68, 0.87, 0.98);    // Celeste claro luminoso en el horizonte
    vec3 skyMid     = vec3(0.26, 0.68, 0.96);    // Celeste veraniego puro, vibrante y alegre
    vec3 skyZenith  = vec3(0.12, 0.48, 0.92);    // Azul cielo profundo en el cenit
    vec3 daySky = mix(skyHorizon, skyMid, smoothstep(0.0, 0.42, h));
    daySky = mix(daySky, skyZenith, smoothstep(0.42, 1.0, h));

    // Sol diurno cálido y definido (sin quemar el cielo en blanco)
    vec3 sunDir = normalize(vec3(0.55, 0.72, -0.38));
    float sunDot = max(0.0, dot(dir, sunDir));
    float sunDisk = smoothstep(0.9982, 0.9998, sunDot);
    float sunCorona = pow(sunDot, 24.0) * 0.42 + pow(sunDot, 90.0) * 0.85;
    vec3 sunLight = vec3(1.0, 0.98, 0.92) * sunDisk * 3.0 + vec3(1.0, 0.92, 0.72) * sunCorona;
    daySky += sunLight;

    // Nubes sutiles, esponjosas y etéreas que dejan lucir el celeste
    vec3 cCoord = dir * 3.4 + vec3(uTime * 0.014, 0.0, uTime * 0.005);
    float c1 = noise(cCoord);
    float c2 = noise(cCoord * 2.2 + vec3(uTime * 0.008, 0.0, 0.0)) * 0.5;
    float c3 = noise(cCoord * 4.4) * 0.25;
    float cloudPattern = (c1 + c2 + c3) / 1.75;

    // Banda natural de nubes en la media altura del cielo
    float cloudBand = smoothstep(0.04, 0.24, dir.y) * (1.0 - smoothstep(0.52, 0.82, dir.y));
    float clouds = smoothstep(0.56, 0.84, cloudPattern) * cloudBand;

    // Nubes blancas algodonosas con borde bañado por el sol (opacidad sutil 0.38)
    vec3 cloudColor = mix(vec3(0.98, 0.95, 0.90), vec3(1.0, 1.0, 1.0), smoothstep(0.0, 0.4, dir.y));
    daySky = mix(daySky, cloudColor, clouds * 0.38);

    // ==================== 2. ESPACIO PROFUNDO (DEEP SPACE) ====================
    float spaceNoise = noise(dir * 3.2 + vec3(uTime * 0.012, 0.0, 0.0));
    spaceNoise *= noise(dir * 7.0 - vec3(0.0, uTime * 0.008, 0.0));
    vec3 nebula = vec3(0.12, 0.065, 0.18) * smoothstep(0.35, 0.75, spaceNoise) +
                  vec3(0.16, 0.09, 0.018) * smoothstep(0.52, 0.78, spaceNoise);
    vec3 spaceSky = vec3(0.008, 0.006, 0.012) + nebula * 0.72;

    // ==================== TRANSICIÓN DÍA -> ESPACIO ====================
    vec3 color = mix(daySky, spaceSky, uSpace);
    gl_FragColor = vec4(color, 1.0);
  }
`

export function SpaceTransition({ timeline }: { timeline: React.RefObject<TimelineState> }) {
  const meshRef = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSpace: { value: 0 } }), [])

  useFrame(({ camera, clock }) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position)
    }
    if (material.current) {
      material.current.uniforms.uTime.value = clock.elapsedTime
      material.current.uniforms.uSpace.value = smoothstep(0.12, 0.36, timeline.current?.progress ?? 0)
    }
  })

  return (
    <mesh ref={meshRef} scale={90} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} side={BackSide} depthWrite={false} />
    </mesh>
  )
}
