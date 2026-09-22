import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

export function StarField({ timeline, count }: { timeline: React.RefObject<TimelineState>; count: number }) {
  const points = useRef<Points<BufferGeometry, PointsMaterial>>(null)
  const geometry = useMemo(() => {
    const random = seededRandom(71092)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const radius = 18 + random() * 62
      const theta = random() * Math.PI * 2
      const y = (random() - 0.5) * 48
      positions[i * 3] = Math.cos(theta) * radius
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = -15 - random() * 90
    }
    const value = new BufferGeometry()
    value.setAttribute('position', new BufferAttribute(positions, 3))
    return value
  }, [count])

  useFrame(({ clock }) => {
    if (!points.current) return
    const p = timeline.current?.progress ?? 0
    points.current.material.opacity = smoothstep(0.18, 0.34, p) * 0.75
    points.current.material.size = 0.045 + Math.sin(clock.elapsedTime * 0.45) * 0.005
    points.current.rotation.z = clock.elapsedTime * 0.003
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.05}
        color="#fff0c2"
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
