import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Euler, MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { usePointerLook } from '../hooks/usePointerLook'
import type { DeviceProfile } from '../hooks/useDevicePerformance'
import { rangeProgress, smoothstep } from '../utils/math'

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
    const reduced = profile.reducedMotion
    const launch = smoothstep(0, 0.16, p)
    const earthDeparture = smoothstep(0.16, 0.32, p)
    const cruise = rangeProgress(p, 0.32, 0.61)
    const secondImpulse = smoothstep(0.61, 0.75, p)
    const settle = smoothstep(0.75, 0.84, p)

    vectors.position.set(
      Math.sin(p * 6.2) * (reduced ? 0.06 : 0.2) * (1 - settle),
      1.35 + 7 * launch + 6 * earthDeparture + 1.3 * cruise + 0.7 * secondImpulse,
      8 - 5 * launch - 5 * earthDeparture - 28 * cruise - 9 * secondImpulse,
    )
    camera.position.lerp(vectors.position, 1 - Math.exp(-delta * 3.2))

    const mobileActive = profile.isMobile && pointer.target.current.lengthSq() > 0.0001
    const returnSpeed = mobileActive ? 5 : profile.isMobile ? 0.55 : 2.1
    pointer.current.current.lerp(pointer.target.current, 1 - Math.exp(-delta * returnSpeed))
    const maxAngle = MathUtils.degToRad(reduced ? 5 : 12)

    const earthLook = smoothstep(0.08, 0.15, p) * (1 - smoothstep(0.3, 0.39, p))
    vectors.lookAt.set(
      0,
      camera.position.y + 0.18 - earthLook * 12,
      camera.position.z - MathUtils.lerp(10, 8, earthLook),
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

    const perspective = camera as PerspectiveCamera
    const firstBoost = smoothstep(0.005, 0.05, p) * (1 - smoothstep(0.12, 0.22, p))
    const finalBoost = smoothstep(0.59, 0.625, p) * (1 - smoothstep(0.7, 0.78, p))
    const impulseFov = Math.max(firstBoost, finalBoost)
    const baseFov = size.height > size.width ? 62 : 50
    perspective.fov = MathUtils.lerp(perspective.fov, baseFov + impulseFov * (reduced ? 2 : 10), 0.07)
    perspective.updateProjectionMatrix()
  })

  return null
}
