import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Group, InstancedMesh, MathUtils, Mesh, Object3D } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

interface FlowerFieldProps {
  timeline: React.RefObject<TimelineState>
  count: number
}

interface FlowerDatum {
  x: number
  z: number
  height: number
  size: number
  lean: number
  phase: number
  color: Color
}

const PETALS = 14

export function FlowerField({ timeline, count }: FlowerFieldProps) {
  const group = useRef<Group>(null)
  const stems = useRef<InstancedMesh>(null)
  const centers = useRef<InstancedMesh>(null)
  const petals = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const flowers = useMemo<FlowerDatum[]>(() => {
    const random = seededRandom(621987)
    return Array.from({ length: count }, (_, index) => {
      const laneBias = index < 8 ? (index % 2 ? 1 : -1) * (1.2 + random() * 1.5) : (random() - 0.5) * 15
      return {
        x: laneBias,
        z: 7 - random() * 27,
        height: 1.1 + random() * 2.2,
        size: 0.42 + random() * 0.55,
        lean: (random() - 0.5) * 0.22,
        phase: random() * Math.PI * 2,
        color: new Color().setHSL(0.115 + random() * 0.025, 0.84, 0.48 + random() * 0.1),
      }
    })
  }, [count])

  useLayoutEffect(() => {
    flowers.forEach((flower, flowerIndex) => {
      dummy.position.set(flower.x, flower.height * 0.5 - 0.65, flower.z)
      dummy.rotation.set(0, 0, flower.lean)
      dummy.scale.set(0.075 * flower.size, flower.height, 0.075 * flower.size)
      dummy.updateMatrix()
      stems.current?.setMatrixAt(flowerIndex, dummy.matrix)

      dummy.position.set(flower.x + flower.lean * flower.height * 0.6, flower.height - 0.55, flower.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(flower.size)
      dummy.updateMatrix()
      centers.current?.setMatrixAt(flowerIndex, dummy.matrix)
      centers.current?.setColorAt(flowerIndex, new Color('#553016'))

      for (let petalIndex = 0; petalIndex < PETALS; petalIndex += 1) {
        const index = flowerIndex * PETALS + petalIndex
        const angle = (petalIndex / PETALS) * Math.PI * 2 + (flowerIndex % 3) * 0.04
        const radius = flower.size * 0.5
        dummy.position.set(
          flower.x + flower.lean * flower.height * 0.6 + Math.cos(angle) * radius,
          flower.height - 0.55 + Math.sin(angle) * radius,
          flower.z - 0.01,
        )
        dummy.rotation.set(0.12 * Math.sin(angle), 0.06 * Math.cos(angle), angle - Math.PI / 2)
        dummy.scale.set(flower.size * 0.27, flower.size * 0.72, flower.size * 0.1)
        dummy.updateMatrix()
        petals.current?.setMatrixAt(index, dummy.matrix)
        petals.current?.setColorAt(index, flower.color)
      }
    })
    if (stems.current) stems.current.instanceMatrix.needsUpdate = true
    if (centers.current) {
      centers.current.instanceMatrix.needsUpdate = true
      if (centers.current.instanceColor) centers.current.instanceColor.needsUpdate = true
    }
    if (petals.current) {
      petals.current.instanceMatrix.needsUpdate = true
      if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true
    }
  }, [dummy, flowers])

  useFrame(({ clock }) => {
    if (!group.current) return
    const p = timeline.current?.progress ?? 0
    const fade = 1 - smoothstep(0.11, 0.26, p)
    group.current.visible = fade > 0.01
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.005
    group.current.position.x = Math.sin(clock.elapsedTime * 0.35) * 0.03
    group.current.scale.setScalar(MathUtils.lerp(0.96, 1.02, fade))
    group.current.traverse((object) => {
      if ('material' in object) {
        const material = (object as Mesh).material
        if (!Array.isArray(material)) {
          material.transparent = true
          material.opacity = fade
        }
      }
    })
  })

  return (
    <group ref={group}>
      <instancedMesh ref={stems} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.55, 0.78, 1, 7]} />
        <meshStandardMaterial color="#31552b" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={petals} args={[undefined, undefined, count * PETALS]} castShadow>
        <sphereGeometry args={[1, 9, 5]} />
        <meshStandardMaterial color="#eeb526" roughness={0.48} metalness={0.03} emissive="#8d4d02" emissiveIntensity={0.12} vertexColors />
      </instancedMesh>
      <instancedMesh ref={centers} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[0.48, 14, 8]} />
        <meshStandardMaterial color="#4a2b16" roughness={0.9} vertexColors />
      </instancedMesh>
      <mesh position={[0, -0.72, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color="#09140c" roughness={1} transparent opacity={0.86} />
      </mesh>
    </group>
  )
}
