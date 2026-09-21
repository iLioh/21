import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MathUtils, MeshStandardMaterial, Object3D } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

interface PetalDatum {
  x: number
  y: number
  z: number
  speed: number
  size: number
  rotationX: number
  rotationY: number
  rotationZ: number
  spinX: number
  spinY: number
  spinZ: number
  color: Color
}

export function WarpTunnel({ timeline, count }: { timeline: React.RefObject<TimelineState>; count: number }) {
  const petals = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const data = useMemo<PetalDatum[]>(() => {
    const random = seededRandom(90182)
    return Array.from({ length: count }, () => {
      const radius = 1.4 + Math.pow(random(), 0.6) * 17
      const angle = random() * Math.PI * 2
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -5 - random() * 76,
        speed: 0.65 + random() * 1.15,
        size: 0.14 + random() * 0.3,
        rotationX: random() * Math.PI,
        rotationY: random() * Math.PI,
        rotationZ: random() * Math.PI,
        spinX: (random() - 0.5) * 1.2,
        spinY: (random() - 0.5) * 1.5,
        spinZ: (random() - 0.5) * 2.1,
        color: new Color().setHSL(0.105 + random() * 0.035, 0.88, 0.48 + random() * 0.12),
      }
    })
  }, [count])

  useLayoutEffect(() => {
    data.forEach((petal, index) => petals.current?.setColorAt(index, petal.color))
    if (petals.current?.instanceColor) petals.current.instanceColor.needsUpdate = true
  }, [data])

  useFrame(({ camera, clock }, delta) => {
    if (!petals.current) return
    const p = timeline.current?.progress ?? 0
    const enter = smoothstep(0.1, 0.21, p)
    const exit = 1 - smoothstep(0.72, 0.83, p)
    const visibility = enter * exit
    const intensity = timeline.current?.intensity ?? 0
    const travelSpeed = 9 + intensity * 27

    data.forEach((petal, index) => {
      petal.z += delta * petal.speed * travelSpeed
      if (petal.z > 3) petal.z -= 81
      const flutter = Math.sin(clock.elapsedTime * (1.1 + petal.speed) + index * 0.37)
      dummy.position.set(petal.x + flutter * 0.08, petal.y + Math.cos(clock.elapsedTime + index) * 0.06, petal.z)
      dummy.rotation.set(
        petal.rotationX + clock.elapsedTime * petal.spinX,
        petal.rotationY + clock.elapsedTime * petal.spinY,
        petal.rotationZ + clock.elapsedTime * petal.spinZ,
      )
      const nearScale = MathUtils.clamp(1 + (petal.z + 45) / 70, 0.55, 1.4)
      dummy.scale.set(petal.size * 0.72 * nearScale, petal.size * 2.1 * nearScale, petal.size * 0.22)
      dummy.updateMatrix()
      petals.current?.setMatrixAt(index, dummy.matrix)
    })
    petals.current.instanceMatrix.needsUpdate = true
    petals.current.visible = visibility > 0.002
    petals.current.position.copy(camera.position)
    petals.current.quaternion.copy(camera.quaternion)
    const material = petals.current.material as MeshStandardMaterial
    if (!Array.isArray(material)) {
      material.opacity = visibility * 0.9
      material.emissiveIntensity = 0.16 + intensity * 0.24
    }
  })

  return (
    <instancedMesh ref={petals} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[1, 8, 5]} />
      <meshStandardMaterial
        color="#f2b72c"
        emissive="#b65b04"
        emissiveIntensity={0.18}
        roughness={0.48}
        metalness={0.02}
        transparent
        opacity={0}
        depthWrite={false}
        vertexColors
      />
    </instancedMesh>
  )
}
