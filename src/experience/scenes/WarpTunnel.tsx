import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MathUtils, MeshStandardMaterial, Object3D } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'

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
    const state = timeline.current
    const p = state?.progress ?? 0
    const travelSpeed = state?.travelSpeed ?? 0
    const boostAmount = state?.boostAmount ?? 0

    // Visibilidad centralizada en los hitos:
    // Aparece al entrar al crucero en el espacio profundo y se disuelve al aproximarse al girasol
    const enter = smoothstep(NORMALIZED_MILESTONES.earthDepartureEnd - 0.04, NORMALIZED_MILESTONES.earthDepartureEnd + 0.04, p)
    const exit = 1 - smoothstep(NORMALIZED_MILESTONES.impulse2End + 0.03, NORMALIZED_MILESTONES.sunflowerRevealEnd - 0.04, p)
    const visibility = enter * exit

    // Velocidad de partículas gobernada exclusivamente por travelSpeed:
    // - En crucero (travelSpeed = 1.0): 13.5 (estrictamente constante e hipnótica)
    // - En impulso 2 (travelSpeed: 1.0 -> 2.4): aceleración monotónica continua de 13.5 -> 32.4 (sin picos intermedios ni retrocesos)
    // - En desaceleración (travelSpeed: 2.4 -> 0): desaceleración suave y progresiva junto con la cámara
    const BASE_PARTICLE_SPEED = 13.5
    const particleTravelSpeed = BASE_PARTICLE_SPEED * travelSpeed

    // boostAmount se utiliza exclusivamente para intensificar el efecto visual:
    // estiramiento/longitud (streak effect), escala y bloom/glow emisivo
    const stretch = 1.0 + boostAmount * 1.6
    const speedGlow = travelSpeed > 1 ? (travelSpeed - 1) * 0.15 : 0

    data.forEach((petal, index) => {
      petal.z += delta * petal.speed * particleTravelSpeed
      if (petal.z > 3) petal.z -= 81
      const flutter = Math.sin(clock.elapsedTime * (1.1 + petal.speed) + index * 0.37)
      dummy.position.set(petal.x + flutter * 0.08, petal.y + Math.cos(clock.elapsedTime + index) * 0.06, petal.z)
      dummy.rotation.set(
        petal.rotationX + clock.elapsedTime * petal.spinX,
        petal.rotationY + clock.elapsedTime * petal.spinY,
        petal.rotationZ + clock.elapsedTime * petal.spinZ,
      )
      const nearScale = MathUtils.clamp(1 + (petal.z + 45) / 70, 0.55, 1.4)
      dummy.scale.set(
        petal.size * 0.72 * nearScale,
        petal.size * 2.1 * nearScale * stretch,
        petal.size * 0.22 * (1 + boostAmount * 0.4),
      )
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
      material.emissiveIntensity = 0.16 + boostAmount * 0.45 + speedGlow
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
