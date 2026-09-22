import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

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
    // En el jardín de día (p < 0.11): polen dorado brillante flotando bajo el sol
    // En el espacio: polvo estelar que acompaña el viaje
    const gardenPollen = (0.50 - smoothstep(0.09, 0.22, p) * 0.25) * (1 - smoothstep(0.76, 0.88, p))
    const spaceDust = smoothstep(0.12, 0.28, p) * 0.45 * (1 - smoothstep(0.76, 0.88, p))
    ref.current.material.opacity = gardenPollen + spaceDust
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.025
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.18) * 0.12
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.075} color="#ffe475" transparent opacity={0.35} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
    </points>
  )
}
