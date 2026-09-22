import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  MathUtils,
  PointLight,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'
import { ProceduralSunflower } from '../models/ProceduralSunflower'

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,248,205,0.85)')
  gradient.addColorStop(0.2, 'rgba(255,198,60,0.58)')
  gradient.addColorStop(0.55, 'rgba(235,120,15,0.12)')
  gradient.addColorStop(0.85, 'rgba(215,80,0,0.02)')
  gradient.addColorStop(1, 'rgba(200,60,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return new CanvasTexture(canvas)
}

function plantAuraTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,210,80,0.22)')
  gradient.addColorStop(0.45, 'rgba(245,140,30,0.08)')
  gradient.addColorStop(0.8, 'rgba(210,85,10,0.02)')
  gradient.addColorStop(1, 'rgba(180,50,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return new CanvasTexture(canvas)
}

export function SunflowerSun({
  timeline,
  particleCount,
}: {
  timeline: React.RefObject<TimelineState>
  particleCount: number
}) {
  const group = useRef<Group>(null)
  const interactiveGroup = useRef<Group>(null)
  const halo = useRef<Sprite>(null)
  const plantAura = useRef<Sprite>(null)
  const orbit = useRef<Points<BufferGeometry, PointsMaterial>>(null)
  const backLight1 = useRef<PointLight>(null)
  const backLight2 = useRef<PointLight>(null)

  const haloMap = useMemo(glowTexture, [])
  const auraMap = useMemo(plantAuraTexture, [])

  // Estado del controlador de interacción 3D
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const targetRot = useRef({ x: 0, y: 0 })
  const currentRot = useRef({ x: 0, y: 0 })

  // Nube de polen estelar sutil
  const orbitGeometry = useMemo(() => {
    const random = seededRandom(8113)
    const count = Math.max(80, Math.floor(particleCount * 0.45))
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const radius = 3.6 + random() * 5.5
      const angle = random() * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.85 - 0.5
      positions[index * 3 + 2] = (random() - 0.5) * 4.5
      const color = new Color(index % 4 === 0 ? '#fff2aa' : '#f5b128')
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    return geometry
  }, [particleCount])

  // Detección de arrastre táctil y con mouse para rotar en 3D
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const p = timeline.current?.progress ?? 0
      if (p < 0.72) return
      if ((e.target as HTMLElement)?.closest('button')) return
      isDraggingRef.current = true
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      document.body.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }

      targetRot.current.y += dx * 0.0078
      targetRot.current.x = MathUtils.clamp(
        targetRot.current.x + dy * 0.0075,
        -0.85,
        0.85,
      )
    }

    const onPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        const p = timeline.current?.progress ?? 0
        document.body.style.cursor = p >= 0.76 ? 'grab' : ''
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.body.style.cursor = ''
    }
  }, [timeline])

  useFrame(({ clock }, delta) => {
    const p = timeline.current?.progress ?? 0
    const appear = smoothstep(0.46, 0.68, p)
    const reveal = smoothstep(0.76, 0.90, p)

    if (group.current) {
      group.current.visible = appear > 0.001
      group.current.position.y = 15.6 + Math.sin(clock.elapsedTime * 0.35) * 0.08
    }

    // Modo exhibición continuo suave cuando no hay arrastre
    if (p >= 0.76 && !isDraggingRef.current) {
      targetRot.current.y += delta * 0.14
    }

    const factor = 1 - Math.exp(-delta * 12)
    currentRot.current.y = MathUtils.lerp(currentRot.current.y, targetRot.current.y, factor)
    currentRot.current.x = MathUtils.lerp(currentRot.current.x, targetRot.current.x, factor)

    if (interactiveGroup.current) {
      interactiveGroup.current.rotation.y = currentRot.current.y
      interactiveGroup.current.rotation.x = currentRot.current.x
    }

    if (p >= 0.78 && !isDraggingRef.current && document.body.style.cursor !== 'grab') {
      document.body.style.cursor = 'grab'
    } else if (p < 0.72 && document.body.style.cursor === 'grab') {
      document.body.style.cursor = ''
    }

    // Corona solar suave y comedida (no cegadora)
    if (halo.current) {
      const material = halo.current.material as SpriteMaterial
      material.opacity = appear * (0.52 - reveal * 0.12)
      const baseScale = MathUtils.lerp(2.2, 9.5, appear)
      const pulse = baseScale + Math.sin(clock.elapsedTime * 1.1) * 0.22
      halo.current.scale.setScalar(pulse)
    }

    // Aura difusa suave que rodea la planta sin empañar el cielo cósmico
    if (plantAura.current) {
      const auraMat = plantAura.current.material as SpriteMaterial
      auraMat.opacity = reveal * 0.28
      const auraPulse = 1.0 + Math.sin(clock.elapsedTime * 0.8) * 0.03
      plantAura.current.scale.set(9.5 * auraPulse, 14 * auraPulse, 1)
    }

    // Luces suaves de silueta (sin deslumbrar el espacio)
    if (backLight1.current) {
      backLight1.current.intensity = MathUtils.lerp(0, 1.2, reveal)
    }
    if (backLight2.current) {
      backLight2.current.intensity = MathUtils.lerp(0, 0.65, reveal)
    }

    if (orbit.current) {
      orbit.current.material.opacity = appear * (0.18 + reveal * 0.35)
      orbit.current.rotation.z = clock.elapsedTime * 0.035
      orbit.current.rotation.y = Math.sin(clock.elapsedTime * 0.11) * 0.18
    }
  })

  return (
    <group ref={group} position={[0, 15.6, -48]} visible={false}>
      {/* ── HALO Y AURA SOLAR SUAVES Y ARMONIOSOS ── */}
      <sprite ref={halo} position={[0, 1.35, -1.0]} scale={[9.5, 9.5, 1]}>
        <spriteMaterial map={haloMap} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <sprite ref={plantAura} position={[0, -0.2, -1.2]} scale={[9.5, 14, 1]}>
        <spriteMaterial map={auraMap} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </sprite>

      {/* ── LUCES DE SILUETA SUAVES ── */}
      <pointLight ref={backLight1} position={[0, 1.35, -2.0]} color="#ffa726" intensity={0} distance={12} decay={1.8} />
      <pointLight ref={backLight2} position={[0, -1.2, -1.8]} color="#ffb74d" intensity={0} distance={10} decay={1.8} />
      <pointLight position={[0, 1.35, 2.6]} color="#fff3e0" intensity={1.4} distance={14} decay={1.8} />

      {/* ── CONTENEDOR 3D INTERACTIVO ── */}
      <group ref={interactiveGroup}>
        <ProceduralSunflower timeline={timeline} />
      </group>

      {/* ── POLEN Y CHISPAS DORADAS ── */}
      <points ref={orbit} geometry={orbitGeometry}>
        <pointsMaterial size={0.065} transparent opacity={0} vertexColors depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  )
}
