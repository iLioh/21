import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MathUtils, Object3D } from 'three'
import type { Group } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'

interface ProceduralSunflowerProps {
  timeline: React.RefObject<TimelineState>
}

export function ProceduralSunflower({ timeline }: ProceduralSunflowerProps) {
  const group = useRef<Group>(null)
  const seeds = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const random = useMemo(() => seededRandom(1229), [])
  const petals = useMemo(() => {
    const layers = [
      { count: 28, radius: 3.02, width: 0.56, length: 2.25, z: 0, offset: 0 },
      { count: 23, radius: 2.55, width: 0.52, length: 1.85, z: 0.28, offset: Math.PI / 23 },
      { count: 17, radius: 2.1, width: 0.48, length: 1.45, z: 0.5, offset: Math.PI / 17 },
    ]
    return layers.flatMap((layer, layerIndex) =>
      Array.from({ length: layer.count }, (_, index) => {
        const angle = (index / layer.count) * Math.PI * 2 + layer.offset
        const variation = 0.92 + random() * 0.15
        return {
          key: `${layerIndex}-${index}`,
          position: [Math.cos(angle) * layer.radius, Math.sin(angle) * layer.radius, layer.z] as [number, number, number],
          rotation: [0.08 * Math.sin(angle), -0.12 * Math.cos(angle), angle - Math.PI / 2] as [number, number, number],
          scale: [layer.width * variation, layer.length * variation, 0.19] as [number, number, number],
          color: new Color().setHSL(0.115 + random() * 0.018, 0.88, 0.49 + random() * 0.08),
        }
      }),
    )
  }, [random])

  useLayoutEffect(() => {
    const count = 210
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let index = 0; index < count; index += 1) {
      const radius = 1.72 * Math.sqrt(index / count)
      const angle = index * goldenAngle
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.3 + (1 - radius / 1.72) * 0.18)
      dummy.rotation.set(0, 0, angle)
      const size = 0.055 + (index % 7) * 0.004
      dummy.scale.set(size, size * 1.35, size)
      dummy.updateMatrix()
      seeds.current?.setMatrixAt(index, dummy.matrix)
      seeds.current?.setColorAt(index, new Color(index % 3 === 0 ? '#c17b25' : '#50301c'))
    }
    if (seeds.current) {
      seeds.current.instanceMatrix.needsUpdate = true
      if (seeds.current.instanceColor) seeds.current.instanceColor.needsUpdate = true
    }
  }, [dummy])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const reveal = smoothstep(NORMALIZED_MILESTONES.sunflowerRevealStart, NORMALIZED_MILESTONES.sunflowerRevealEnd, timeline.current?.progress ?? 0)
    const targetScale = MathUtils.lerp(0.7, 1, reveal)
    group.current.scale.setScalar(MathUtils.lerp(group.current.scale.x, targetScale, 1 - Math.exp(-delta * 2.5)))
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.018
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.012
  })

  return (
    <group ref={group}>
      {petals.map((petal) => (
        <mesh key={petal.key} position={petal.position} rotation={petal.rotation} scale={petal.scale} castShadow>
          <sphereGeometry args={[1, 15, 7]} />
          <meshPhysicalMaterial
            color={petal.color}
            emissive="#a94e00"
            emissiveIntensity={0.22}
            roughness={0.46}
            metalness={0.02}
            clearcoat={0.15}
            clearcoatRoughness={0.8}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.68]} scale={[1.92, 1.92, 0.58]} castShadow>
        <sphereGeometry args={[1, 42, 28]} />
        <meshStandardMaterial color="#3e2417" roughness={0.92} emissive="#321304" emissiveIntensity={0.2} />
      </mesh>
      <instancedMesh ref={seeds} args={[undefined, undefined, 210]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial color="#6d411f" roughness={0.78} vertexColors />
      </instancedMesh>
    </group>
  )
}
