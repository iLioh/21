import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { PointLight } from 'three'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { smoothstep } from '../utils/math'

export function Lighting({ timeline }: { timeline: React.RefObject<TimelineState> }) {
  const warm = useRef<PointLight>(null)

  useFrame(() => {
    if (!warm.current) return
    const p = timeline.current?.progress ?? 0
    warm.current.intensity = 3 + smoothstep(0.5, 0.82, p) * 18
  })

  return (
    <>
      <ambientLight intensity={0.32} color="#a8b5d8" />
      <hemisphereLight args={['#c8d1f2', '#1b1208', 0.75]} />
      <directionalLight position={[-6, 12, 8]} intensity={2.2} color="#ffe2a1" />
      <pointLight ref={warm} position={[0, 16, -45]} intensity={3} distance={42} decay={1.4} color="#ffb52e" />
    </>
  )
}
