import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, Points, PointsMaterial, Sprite, SpriteMaterial } from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { NORMALIZED_MILESTONES } from '../../config/experience'
import { ProceduralSunflower } from '../models/ProceduralSunflower'

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,239,172,1)')
  gradient.addColorStop(0.18, 'rgba(255,190,50,.9)')
  gradient.addColorStop(0.5, 'rgba(239,117,5,.25)')
  gradient.addColorStop(1, 'rgba(255,105,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return new CanvasTexture(canvas)
}

export function SunflowerSun({ timeline, particleCount }: { timeline: React.RefObject<TimelineState>; particleCount: number }) {
  const group = useRef<Group>(null)
  const halo = useRef<Sprite>(null)
  const orbit = useRef<Points<BufferGeometry, PointsMaterial>>(null)
  const texture = useMemo(glowTexture, [])
  const orbitGeometry = useMemo(() => {
    const random = seededRandom(8113)
    const count = Math.max(90, Math.floor(particleCount * 0.55))
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const radius = 4 + random() * 6.5
      const angle = random() * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.72
      positions[index * 3 + 2] = (random() - 0.5) * 5
      const color = new Color(index % 4 === 0 ? '#fff1a6' : '#f2ae25')
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    return geometry
  }, [particleCount])

  useFrame(({ clock }) => {
    const p = timeline.current?.progress ?? 0
    const appear = smoothstep(NORMALIZED_MILESTONES.sunAppearStart, NORMALIZED_MILESTONES.sunAppearEnd, p)
    const reveal = smoothstep(NORMALIZED_MILESTONES.sunflowerRevealStart, NORMALIZED_MILESTONES.sunflowerRevealEnd, p)
    if (group.current) {
      group.current.visible = appear > 0.002
      group.current.position.y = 16 + Math.sin(clock.elapsedTime * 0.28) * 0.08
    }
    if (halo.current) {
      const material = halo.current.material as SpriteMaterial
      material.opacity = appear * (1.0 - reveal * 0.48)
      const pulse = 16 + Math.sin(clock.elapsedTime * 1.1) * 0.35
      halo.current.scale.setScalar(pulse)
    }
    if (orbit.current) {
      orbit.current.material.opacity = appear * (0.28 + reveal * 0.48)
      orbit.current.rotation.z = clock.elapsedTime * 0.035
      orbit.current.rotation.y = Math.sin(clock.elapsedTime * 0.11) * 0.18
    }
  })

  return (
    <group ref={group} position={[0, 16, -48]} visible={false}>
      <sprite ref={halo} position={[0, 0, -1.8]} scale={[16, 16, 1]}>
        <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <ProceduralSunflower timeline={timeline} />
      <points ref={orbit} geometry={orbitGeometry}>
        <pointsMaterial size={0.075} transparent opacity={0} vertexColors depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  )
}
