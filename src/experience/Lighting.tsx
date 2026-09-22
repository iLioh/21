import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils } from 'three'
import type { AmbientLight, DirectionalLight, HemisphereLight, PointLight } from 'three'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { smoothstep } from '../utils/math'

export function Lighting({ timeline }: { timeline: React.RefObject<TimelineState> }) {
  const sunLight = useRef<DirectionalLight>(null)
  const hemiLight = useRef<HemisphereLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const warm = useRef<PointLight>(null)

  useFrame(() => {
    const p = timeline.current?.progress ?? 0
    // Transición de día soleado en la Tierra (p < 0.11) a iluminación cósmica en el espacio (p > 0.32)
    const dayToSpace = smoothstep(0.11, 0.34, p)

    if (sunLight.current) {
      sunLight.current.intensity = MathUtils.lerp(3.8, 1.2, dayToSpace)
    }
    if (hemiLight.current) {
      hemiLight.current.intensity = MathUtils.lerp(1.9, 0.45, dayToSpace)
    }
    if (ambient.current) {
      ambient.current.intensity = MathUtils.lerp(1.2, 0.28, dayToSpace)
    }
    if (warm.current) {
      warm.current.intensity = 0.6 + smoothstep(0.46, 0.78, p) * 3.8
    }
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={1.2} color="#fff4e0" />
      <hemisphereLight ref={hemiLight} args={['#9cd5ff', '#4a6828', 1.9]} />
      <directionalLight ref={sunLight} position={[8, 18, 10]} intensity={3.8} color="#fff8e7" castShadow />
      <pointLight ref={warm} position={[0, 16, -45]} intensity={2} distance={45} decay={1.4} color="#ffb52e" />
    </>
  )
}
