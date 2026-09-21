import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'

export function GoldenDust({ timeline, count }: { timeline: React.RefObject<TimelineState>; count: number }) {
  const ref = useRef<Points<BufferGeometry, PointsMaterial>>(null)
  const geometry = useMemo(() => {
    const random = seededRandom(34712)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 28
      positions[i * 3 + 1] = random() * 23
      positions[i * 3 + 2] = 7 - random() * 68
    }
    const value = new BufferGeometry()
    value.setAttribute('position', new BufferAttribute(positions, 3))
    return value
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const p = timeline.current?.progress ?? 0
    ref.current.material.opacity = (0.08 + smoothstep(NORMALIZED_MILESTONES.impulse1Start, NORMALIZED_MILESTONES.impulse1End, p) * 0.5) *
      (1 - smoothstep(NORMALIZED_MILESTONES.impulse2End, NORMALIZED_MILESTONES.approachEnd, p))
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.025
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.18) * 0.12
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.065} color="#ffca51" transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
    </points>
  )
}
