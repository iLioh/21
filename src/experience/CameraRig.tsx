import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Euler, MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { usePointerLook } from '../hooks/usePointerLook'
import type { DeviceProfile } from '../hooks/useDevicePerformance'
import { smoothstep } from '../utils/math'
import { computeKinematicsFromProgress } from '../utils/kinematics'

interface CameraRigProps {
  timeline: React.RefObject<TimelineState>
  profile: DeviceProfile
  restartToken: number
}

export function CameraRig({ timeline, profile, restartToken }: CameraRigProps) {
  const { camera, size } = useThree()
  const pointer = usePointerLook()
  const vectors = useMemo(() => ({
    position: new Vector3(),
    lookAt: new Vector3(),
    baseQuaternion: new Quaternion(),
    offsetQuaternion: new Quaternion(),
    rotation: new Euler(),
  }), [])

  useEffect(() => {
    camera.position.set(0, 1.35, 8)
    camera.quaternion.identity()
    const perspective = camera as PerspectiveCamera
    perspective.fov = size.height > size.width ? 62 : 50
    perspective.updateProjectionMatrix()
    pointer.target.current.set(0, 0)
    pointer.current.current.set(0, 0)
  }, [camera, restartToken, size.height, size.width, pointer])

  useFrame((_, delta) => {
    const p = timeline.current?.progress ?? 0
    const state = computeKinematicsFromProgress(p, profile.reducedMotion)
    const reduced = profile.reducedMotion

    // 1. Desplazamiento en Z: deriva estrictamente de journeyProgress (integral de travelSpeed)
    // Coordenada continua: 8.0 (campo) -> -36.5 (frente al girasol completo a z = -48)
    const targetZ = 8.0 - 44.5 * state.journeyProgress

    // 2. Altitud en Y: ascenso continuo a órbita durante el impulso de despegue (0.11 -> 0.24)
    // 1.35 (campo) -> 14.5 (órbita terrestre) -> 16.0 (alineación horizontal con el sol girasol)
    const departureClimb = smoothstep(0.11, 0.24, p)
    const spaceDrift = smoothstep(0.24, 0.76, p)
    const targetY = 1.35 + 13.15 * departureClimb + 1.5 * spaceDrift

    // 3. Balanceo sutil en X que se asienta hacia el girasol
    const settle = smoothstep(0.76, 0.92, p)
    const targetX = Math.sin(p * 6.2) * (reduced ? 0.05 : 0.16) * (1 - settle)

    vectors.position.set(targetX, targetY, targetZ)
    camera.position.copy(vectors.position)

    // Interacción mouse / touch: orientación sutil durante el viaje;
    // al llegar al girasol final (p >= 0.78), la cámara se estabiliza para permitir la inspección 3D del girasol
    const inspectSettle = smoothstep(0.78, 0.88, p)
    const mobileActive = profile.isMobile && pointer.target.current.lengthSq() > 0.0001
    const returnSpeed = mobileActive ? 5 : profile.isMobile ? 0.55 : 2.1
    pointer.current.current.lerp(pointer.target.current, 1 - Math.exp(-delta * returnSpeed))
    const maxAngle = MathUtils.degToRad(reduced ? 5 : 12) * (1 - inspectSettle)

    // Orientación de la cámara:
    // Al despegar y ascender en órbita (0.11 -> 0.48), la cámara se inclina para encuadrar majestuosamente
    // la Tierra curvada abajo (0, -10.8, -0.5). Conforme la Tierra se aleja en el espacio profundo,
    // la cámara se nivela suavemente hacia el horizonte en -Z, alineándose con el girasol-sol en (0, 16, -48).
    const earthLook = smoothstep(0.11, 0.19, p) * (1 - smoothstep(0.36, 0.48, p))
    const sunflowerLook = smoothstep(0.76, 0.92, p)
    const lookY = targetY + 0.18 - earthLook * 12.0 - sunflowerLook * 0.95
    const lookZ = targetZ - MathUtils.lerp(10.0, 8.0, earthLook)
    vectors.lookAt.set(0, lookY, lookZ)

    vectors.baseQuaternion.setFromRotationMatrix(
      new Matrix4().lookAt(camera.position, vectors.lookAt, camera.up),
    )
    vectors.rotation.set(
      -pointer.current.current.y * maxAngle,
      -pointer.current.current.x * maxAngle,
      -pointer.current.current.x * 0.018,
      'YXZ',
    )
    vectors.offsetQuaternion.setFromEuler(vectors.rotation)
    camera.quaternion.copy(vectors.baseQuaternion).multiply(vectors.offsetQuaternion)

    // FOV: se abre UNA SOLA VEZ por impulso y se relaja lentamente como estabilización natural
    const perspective = camera as PerspectiveCamera
    const baseFov = size.height > size.width ? 62 : 50
    const boostFov = reduced ? 2 : 10
    perspective.fov = baseFov + state.fovImpulse * boostFov
    perspective.updateProjectionMatrix()
  })

  return null
}
