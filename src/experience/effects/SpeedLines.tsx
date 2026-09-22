import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { computeKinematicsFromProgress } from '../../utils/kinematics'

interface LineDatum {
  x: number
  y: number
  z: number
  speed: number
  baseLength: number
  thickness: number
  radius: number
  angle: number
}

interface SpeedLinesProps {
  timeline: React.RefObject<TimelineState>
  count: number
}

export function SpeedLines({ timeline, count }: SpeedLinesProps) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  const lines = useMemo<LineDatum[]>(() => {
    const random = seededRandom(48192)
    return Array.from({ length: count }, () => {
      const radius = 0.7 + Math.pow(random(), 0.65) * 11.5
      const angle = random() * Math.PI * 2
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -3 - random() * 74,
        speed: 0.75 + random() * 0.9,
        baseLength: 2.2 + random() * 3.4,
        thickness: 0.016 + random() * 0.018,
        radius,
        angle,
      }
    })
  }, [count])

  useFrame(({ camera }, delta) => {
    if (!mesh.current) return
    const p = timeline.current?.progress ?? 0
    const state = computeKinematicsFromProgress(p)
    const travelSpeed = state.travelSpeed
    const visualWarp = state.visualWarp

    // Visibilidad:
    // Aparece suavemente al salir de la atmósfera y acelerar al espacio (0.15 -> 0.26)
    // y se disuelve suavemente al aproximarse al girasol gigante (0.80 -> 0.92)
    const enter = smoothstep(0.15, 0.26, p)
    const exit = 1 - smoothstep(0.80, 0.92, p)
    const visibility = enter * exit

    // Velocidad de avance de las líneas gobernada por travelSpeed
    // - En crucero (travelSpeed = 1.0): ~38 unidades/s
    // - En impulso 2 (travelSpeed: 1.0 -> 2.4): se dispara hasta ~91 unidades/s
    const LINE_SPEED = 38.0
    const currentSpeed = LINE_SPEED * travelSpeed

    // Estiramiento dinámico de las líneas blancas con la velocidad:
    // En crucero: longitud moderada y dinámica
    // En impulso 2 (warp): se estiran intensamente simulando hipervelocidad
    const stretch = 1.0 + (travelSpeed > 1 ? (travelSpeed - 1.0) * 2.2 : 0) + visualWarp * 2.8

    const stepDelta = Math.min(delta, 0.05)

    lines.forEach((line, index) => {
      line.z += stepDelta * line.speed * currentSpeed
      // Reciclado al pasar por detrás de la cámara
      if (line.z > 4) {
        line.z -= 75
      }

      // El cilindro base está orientado a lo largo de Y, lo rotamos para que se extienda a lo largo de Z (dirección de viaje)
      dummy.position.set(line.x, line.y, line.z)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      const length = line.baseLength * stretch
      dummy.scale.set(line.thickness, length, line.thickness)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })

    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.visible = visibility > 0.002
    mesh.current.position.copy(camera.position)
    mesh.current.quaternion.copy(camera.quaternion)

    const material = mesh.current.material as MeshBasicMaterial
    if (!Array.isArray(material)) {
      // Mayor transparencia: líneas sutiles y traslúcidas que se intensifican suavemente en warp
      material.opacity = visibility * (0.22 + visualWarp * 0.28)
    }
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshBasicMaterial
        color="#eaf2ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </instancedMesh>
  )
}
