import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MathUtils, MeshStandardMaterial, Object3D } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { computeKinematicsFromProgress } from '../../utils/kinematics'

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
    // Paleta botánica auténtica de pétalos de girasol radiantes en el espacio (amarillo dorado / cadmio cálido)
    const petalPalette = [
      new Color('#ffb703'),
      new Color('#ffc107'),
      new Color('#ffd026'),
      new Color('#ffa200'),
      new Color('#ffcb37'),
    ]
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
        color: petalPalette[Math.floor(random() * petalPalette.length)],
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
    const state = computeKinematicsFromProgress(p)
    const travelSpeed = state.travelSpeed
    const visualWarp = state.visualWarp

    // Visibilidad centralizada:
    // Aparece al entrar al crucero en el espacio profundo y se disuelve al aproximarse al girasol
    const enter = smoothstep(0.24, 0.34, p)
    const exit = 1 - smoothstep(0.78, 0.90, p)
    const visibility = enter * exit

    // Velocidad de partículas gobernada exclusivamente por travelSpeed:
    // - En crucero (travelSpeed = 1.0): 13.5 (estrictamente constante e hipnótica)
    // - En impulso 2 (travelSpeed: 1.0 -> 2.4): aceleración monotónica continua de 13.5 -> 32.4 (sin picos intermedios ni retrocesos)
    // - En desaceleración (travelSpeed: 2.4 -> 0): desaceleración suave y progresiva junto con la cámara
    const BASE_PARTICLE_SPEED = 13.5
    const particleTravelSpeed = BASE_PARTICLE_SPEED * travelSpeed

    // visualWarp se utiliza exclusivamente para intensificar el efecto visual del impulso 2:
    // estiramiento/longitud (streak effect), escala y bloom/glow emisivo
    // Se estira UNA SOLA VEZ y se estabiliza suavemente durante la aproximación
    const stretch = 1.0 + visualWarp * 1.6
    const speedGlow = travelSpeed > 1 ? (travelSpeed - 1) * 0.15 : 0
    const stepDelta = Math.min(delta, 0.05)

    data.forEach((petal, index) => {
      petal.z += stepDelta * petal.speed * particleTravelSpeed
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
        petal.size * 0.22 * (1 + visualWarp * 0.4),
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
      material.opacity = visibility * 0.94
      material.emissiveIntensity = 0.52 + visualWarp * 0.58 + speedGlow * 1.2
    }
  })

  return (
    <instancedMesh ref={petals} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[1, 8, 5]} />
      <meshStandardMaterial
        color="#ffc107"
        emissive="#d48000"
        emissiveIntensity={0.52}
        roughness={0.28}
        metalness={0.0}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
