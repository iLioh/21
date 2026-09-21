import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Euler, MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { usePointerLook } from '../hooks/usePointerLook'
import type { DeviceProfile } from '../hooks/useDevicePerformance'
import { smoothstep } from '../utils/math'
import { NORMALIZED_MILESTONES } from '../config/experience'

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
    const state = timeline.current
    const p = state?.progress ?? 0
    const journey = state?.journeyProgress ?? 0
    const boostAmount = state?.boostAmount ?? 0
    const reduced = profile.reducedMotion

    // 1. Desplazamiento en Z: deriva estrictamente de journeyProgress (integral de travelSpeed)
    // Coordenada continua: 8.0 (campo) -> -39.0 (frente al girasol a z = -48)
    const targetZ = 8.0 - 47.0 * journey

    // 2. Altitud en Y: una única trayectoria suave de salida de la Tierra hacia el espacio
    const departureClimb = smoothstep(NORMALIZED_MILESTONES.impulse1Start, NORMALIZED_MILESTONES.earthDepartureEnd, p)
    const spaceDrift = smoothstep(NORMALIZED_MILESTONES.earthDepartureEnd, NORMALIZED_MILESTONES.approachEnd, p)
    const targetY = 1.35 + 13.85 * departureClimb + 1.15 * spaceDrift

    // 3. Balanceo sutil en X que se asienta hacia el girasol
    const settle = smoothstep(NORMALIZED_MILESTONES.approachEnd, NORMALIZED_MILESTONES.sunflowerRevealEnd, p)
    const targetX = Math.sin(p * 6.2) * (reduced ? 0.05 : 0.16) * (1 - settle)

    vectors.position.set(targetX, targetY, targetZ)
    camera.position.lerp(vectors.position, 1 - Math.exp(-delta * 12.0))

    // Interacción mouse / touch: únicamente orientación sutil
    const mobileActive = profile.isMobile && pointer.target.current.lengthSq() > 0.0001
    const returnSpeed = mobileActive ? 5 : profile.isMobile ? 0.55 : 2.1
    pointer.current.current.lerp(pointer.target.current, 1 - Math.exp(-delta * returnSpeed))
    const maxAngle = MathUtils.degToRad(reduced ? 5 : 12)

    // Orientación de la cámara:
    // Al despegar mira suavemente hacia la Tierra abajo; en el espacio apunta al girasol-sol (0, 16, -48)
    const earthLook = smoothstep(NORMALIZED_MILESTONES.impulse1Start + 0.02, NORMALIZED_MILESTONES.impulse1End, p) *
      (1 - smoothstep(NORMALIZED_MILESTONES.impulse1End + 0.02, NORMALIZED_MILESTONES.earthDepartureEnd, p))
    const sunLock = smoothstep(NORMALIZED_MILESTONES.earthDepartureEnd, NORMALIZED_MILESTONES.sunAppearEnd, p)

    vectors.lookAt.set(
      0,
      MathUtils.lerp(camera.position.y + 0.18 - earthLook * 10, 16.0, sunLock),
      MathUtils.lerp(camera.position.z - MathUtils.lerp(10, 8, earthLook), -48.0, sunLock),
    )
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
    vectors.baseQuaternion.multiply(vectors.offsetQuaternion)
    camera.quaternion.slerp(vectors.baseQuaternion, 1 - Math.exp(-delta * 3.4))

    // FOV: derivado estrictamente de boostAmount (únicamente activo en impulso 1 e impulso 2)
    // Durante desaceleración boostAmount es 0, por lo que el FOV se mantiene estable en baseFov
    const perspective = camera as PerspectiveCamera
    const baseFov = size.height > size.width ? 62 : 50
    const boostFov = reduced ? 2 : 10
    const targetFov = baseFov + boostAmount * boostFov
    perspective.fov = MathUtils.lerp(perspective.fov, targetFov, 1 - Math.exp(-delta * 6.0))
    perspective.updateProjectionMatrix()
  })

  return null
}
