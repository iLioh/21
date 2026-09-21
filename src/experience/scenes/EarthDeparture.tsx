import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BackSide, Group, ShaderMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'

const earthVertex = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const earthFragment = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main() {
    vec3 n = normalize(vPosition);
    float continents = noise(n * 3.5 + vec3(uTime*.008,0.,0.));
    continents += noise(n * 8.0) * .34;
    float land = smoothstep(.60,.72,continents);
    vec3 ocean = mix(vec3(.006,.035,.09), vec3(.018,.15,.23), max(0.0,n.y));
    vec3 earth = mix(ocean, vec3(.075,.17,.085), land);
    float clouds = smoothstep(.63,.78,noise(n*11.0 + vec3(uTime*.015,0.,0.)));
    earth = mix(earth, vec3(.72,.78,.78), clouds*.32);
    float light = max(.08, dot(normalize(vNormal), normalize(vec3(-.6,.8,1.))));
    float city = step(.79, noise(n*26.0)) * (1.0-land*.45) * smoothstep(.1,.65,-n.y+.3);
    earth = earth * (.16 + light*.92) + vec3(1.0,.48,.08)*city*.8;
    gl_FragColor = vec4(earth, uOpacity);
  }
`

const atmosphereVertex = `
  varying vec3 vNormal;
  void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`

const atmosphereFragment = `
  uniform float uOpacity;
  varying vec3 vNormal;
  void main(){
    float rim=pow(1.0-max(0.0,dot(vNormal,vec3(0.,0.,1.))),2.2);
    gl_FragColor=vec4(vec3(.12,.42,1.0)*rim*1.7, rim*uOpacity);
  }
`

export function EarthDeparture({ timeline }: { timeline: React.RefObject<TimelineState> }) {
  const group = useRef<Group>(null)
  const surface = useRef<ShaderMaterial>(null)
  const atmosphere = useRef<ShaderMaterial>(null)
  const earthUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 } }), [])
  const atmosphereUniforms = useMemo(() => ({ uOpacity: { value: 0.8 } }), [])

  useFrame(({ clock }) => {
    const p = timeline.current?.progress ?? 0
    const emerge = smoothstep(NORMALIZED_MILESTONES.impulse1Start + 0.01, NORMALIZED_MILESTONES.impulse1End, p)
    const fade = emerge * (1 - smoothstep(NORMALIZED_MILESTONES.earthDepartureEnd - 0.04, NORMALIZED_MILESTONES.earthDepartureEnd + 0.05, p))
    if (group.current) {
      group.current.visible = fade > 0.002
      group.current.rotation.y = clock.elapsedTime * 0.018
    }
    if (surface.current) {
      surface.current.uniforms.uTime.value = clock.elapsedTime
      surface.current.uniforms.uOpacity.value = fade
    }
    if (atmosphere.current) atmosphere.current.uniforms.uOpacity.value = fade * 0.9
  })

  return (
    <group ref={group} position={[0, -10.8, -0.5]} rotation={[0.08, 0, -0.08]}>
      <mesh>
        <sphereGeometry args={[10, 64, 48]} />
        <shaderMaterial ref={surface} uniforms={earthUniforms} vertexShader={earthVertex} fragmentShader={earthFragment} transparent />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[10, 64, 48]} />
        <shaderMaterial ref={atmosphere} uniforms={atmosphereUniforms} vertexShader={atmosphereVertex} fragmentShader={atmosphereFragment} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  )
}
