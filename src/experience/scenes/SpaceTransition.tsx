import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, ShaderMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'

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
    float cloud = noise(dir * 3.2 + vec3(uTime * .012, 0., 0.));
    cloud *= noise(dir * 7.0 - vec3(0., uTime * .008, 0.));
    float horizon = smoothstep(-.7, .6, dir.y);
    vec3 field = mix(vec3(.025,.018,.014), vec3(.008,.014,.04), horizon);
    vec3 nebula = vec3(.12,.065,.18) * smoothstep(.35,.75,cloud) + vec3(.16,.09,.018) * smoothstep(.52,.78,cloud);
    vec3 color = mix(vec3(.012,.009,.008), field + nebula * .72, uSpace);
    gl_FragColor = vec4(color, 1.0);
  }
`

export function SpaceTransition({ timeline }: { timeline: React.RefObject<TimelineState> }) {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSpace: { value: 0 } }), [])

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
    material.current.uniforms.uSpace.value = smoothstep(NORMALIZED_MILESTONES.impulse1End, NORMALIZED_MILESTONES.earthDepartureEnd + 0.04, timeline.current?.progress ?? 0)
  })

  return (
    <mesh scale={90} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} side={BackSide} depthWrite={false} />
    </mesh>
  )
}
