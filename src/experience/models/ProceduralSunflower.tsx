import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

interface ProceduralSunflowerProps {
  timeline: React.RefObject<TimelineState>
}

/** Genera una hoja 3D orgánica con nervadura central en V y curvatura botánica */
function createLeafBladeGeometry(length = 1.75, width = 0.92, segmentsL = 14, segmentsW = 8) {
  const geom = new BufferGeometry()
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= segmentsL; i++) {
    const u = i / segmentsL // 0 (base/pecíolo) a 1 (punta)
    const wEnvelope = Math.sin(Math.PI * Math.pow(u, 0.68)) * width
    const zArch = -Math.sin(u * Math.PI * 0.88) * 0.22 - (u > 0.55 ? (u - 0.55) * 0.28 : 0)

    for (let j = 0; j <= segmentsW; j++) {
      const v = (j / segmentsW) * 2 - 1
      const posX = v * wEnvelope * 0.5
      const posY = u * length
      const fold = Math.abs(v) * 0.11 * Math.sin(u * Math.PI)
      positions.push(posX, posY, zArch + fold)
      uvs.push((v + 1) * 0.5, u)
    }
  }

  const cols = segmentsW + 1
  for (let i = 0; i < segmentsL; i++) {
    for (let j = 0; j < segmentsW; j++) {
      const a = i * cols + j
      const b = (i + 1) * cols + j
      const c = (i + 1) * cols + (j + 1)
      const d = i * cols + (j + 1)
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geom.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * Genera un pétalo 3D botánico con punta redondeada y contorno suave,
 * idéntico al de un girasol real (sin puntas afiladas ni agujas).
 */
function createRoundedPetalGeometry(length = 2.05, width = 0.74, segmentsL = 16, segmentsW = 10) {
  const geom = new BufferGeometry()
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= segmentsL; i++) {
    const u = i / segmentsL // 0 (base) a 1 (punta redondeada)

    // Perfil de ancho suave y redondeado:
    // u < 0.22: ensanchamiento suave desde la base
    // 0.22 <= u <= 0.76: ancho pleno, ligeramente combado
    // u > 0.76: punta redondeada natural (arco semicircular elíptico suave)
    let wProfile = 0
    if (u < 0.22) {
      wProfile = Math.sin((u / 0.22) * (Math.PI / 2)) * 0.72 + 0.28
    } else if (u <= 0.76) {
      const mid = (u - 0.22) / 0.54
      wProfile = 1.0 - 0.05 * Math.pow(mid - 0.5, 2)
    } else {
      const tipT = (u - 0.76) / 0.24 // 0 a 1
      // Arco elíptico redondeado: sqrt(1 - tipT^2) que culmina en una punta suave y redondeada
      wProfile = Math.sqrt(Math.max(0, 1 - tipT * tipT)) * 0.95
    }
    const currentW = wProfile * width

    // Curvatura longitudinal suave: curvatura cóncava natural del pétalo
    const zArch = -Math.sin(u * Math.PI * 0.82) * 0.11

    for (let j = 0; j <= segmentsW; j++) {
      const v = (j / segmentsW) * 2 - 1 // -1 a 1
      const posX = v * currentW * 0.5
      const posY = u * length

      // Suave curvatura transversal acanalada
      const fold = (1 - v * v) * 0.038 * Math.sin(u * Math.PI)
      const posZ = zArch + fold

      positions.push(posX, posY, posZ)
      uvs.push((v + 1) * 0.5, u)
    }
  }

  const cols = segmentsW + 1
  for (let i = 0; i < segmentsL; i++) {
    for (let j = 0; j < segmentsW; j++) {
      const a = i * cols + j
      const b = (i + 1) * cols + j
      const c = (i + 1) * cols + (j + 1)
      const d = i * cols + (j + 1)
      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geom.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

export function ProceduralSunflower({ timeline }: ProceduralSunflowerProps) {
  const group = useRef<Group>(null)
  const seeds = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const random = useMemo(() => seededRandom(9281), [])

  // 1. Tallo botánico con curva en "S" (igual que la ilustración de referencia)
  const stemCurve = useMemo(() => {
    const points = [
      new Vector3(0, 1.35, -0.1),      // Conexión limpia con la parte trasera de la flor
      new Vector3(0.06, 0.75, 0.01),
      new Vector3(0.25, -0.1, 0.05),   // Curvatura hacia la derecha
      new Vector3(0.19, -0.95, 0.02),
      new Vector3(-0.12, -1.85, -0.04),// Inflexión suave hacia la izquierda
      new Vector3(-0.24, -2.75, -0.02),
      new Vector3(-0.05, -3.65, 0.03),
      new Vector3(0.12, -4.35, 0.01),  // Base del tallo
    ]
    return new CatmullRomCurve3(points)
  }, [])

  const stemGeometry = useMemo(() => new TubeGeometry(stemCurve, 64, 0.13, 14, false), [stemCurve])

  // Geometrías reusables
  const leafGeometry = useMemo(() => createLeafBladeGeometry(1.75, 0.95), [])
  const smallLeafGeometry = useMemo(() => createLeafBladeGeometry(1.35, 0.78), [])
  // Pétalos redondeados botánicos
  const petalOuterGeom = useMemo(() => createRoundedPetalGeometry(2.1, 0.74), [])
  const petalInnerGeom = useMemo(() => createRoundedPetalGeometry(1.75, 0.68), [])

  // 2. Definición de las 4 hojas a lo largo del tallo
  const leaves = useMemo(() => [
    {
      // Hoja superior derecha
      position: [0.24, 0.32, 0.05] as [number, number, number],
      rotation: [0.15, 0.25, -Math.PI / 3.2] as [number, number, number],
      scale: [1.1, 1.1, 1.1] as [number, number, number],
      petioleLength: 0.42,
      geom: leafGeometry,
    },
    {
      // Hoja media izquierda
      position: [-0.13, -1.25, -0.03] as [number, number, number],
      rotation: [0.2, -0.3, Math.PI / 2.9] as [number, number, number],
      scale: [1.18, 1.18, 1.18] as [number, number, number],
      petioleLength: 0.45,
      geom: leafGeometry,
    },
    {
      // Hoja inferior derecha
      position: [-0.22, -2.65, -0.02] as [number, number, number],
      rotation: [0.12, 0.28, -Math.PI / 3.4] as [number, number, number],
      scale: [1.05, 1.05, 1.05] as [number, number, number],
      petioleLength: 0.4,
      geom: leafGeometry,
    },
    {
      // Hoja inferior izquierda sutil
      position: [-0.04, -3.55, 0.03] as [number, number, number],
      rotation: [0.1, -0.22, Math.PI / 3.6] as [number, number, number],
      scale: [0.85, 0.85, 0.85] as [number, number, number],
      petioleLength: 0.32,
      geom: smallLeafGeometry,
    },
  ], [leafGeometry, smallLeafGeometry])

  // 3. Pétalos redondeados en doble capa con solapamiento armónico
  const petals = useMemo(() => {
    const flowerY = 1.35
    const outerCount = 26
    const innerCount = 22

    const outer = Array.from({ length: outerCount }, (_, index) => {
      const angle = (index / outerCount) * Math.PI * 2
      const variation = 0.95 + random() * 0.08
      return {
        key: `outer-${index}`,
        position: [
          Math.cos(angle) * 1.45,
          flowerY + Math.sin(angle) * 1.45,
          -0.02,
        ] as [number, number, number],
        rotation: [
          0.04 * Math.sin(angle),
          -0.04 * Math.cos(angle),
          angle - Math.PI / 2,
        ] as [number, number, number],
        scale: [variation, variation, variation] as [number, number, number],
        geom: petalOuterGeom,
      }
    })

    const inner = Array.from({ length: innerCount }, (_, index) => {
      const angle = (index / innerCount) * Math.PI * 2 + Math.PI / innerCount
      const variation = 0.93 + random() * 0.09
      return {
        key: `inner-${index}`,
        position: [
          Math.cos(angle) * 1.28,
          flowerY + Math.sin(angle) * 1.28,
          0.10,
        ] as [number, number, number],
        rotation: [
          0.08 * Math.sin(angle),
          -0.08 * Math.cos(angle),
          angle - Math.PI / 2,
        ] as [number, number, number],
        scale: [variation * 0.96, variation * 0.98, variation] as [number, number, number],
        geom: petalInnerGeom,
      }
    })

    return [...outer, ...inner]
  }, [petalOuterGeom, petalInnerGeom, random])

  // 4. Semillas en espiral áurea de Fibonacci en la cara frontal
  useLayoutEffect(() => {
    const count = 260
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const flowerY = 1.35
    for (let index = 0; index < count; index += 1) {
      const radius = 1.42 * Math.sqrt(index / count)
      const angle = index * goldenAngle
      // Colocación precisa sobre la superficie del domo frontal
      const zOffset = 0.11 + Math.sqrt(Math.max(0, 1.42 * 1.42 - radius * radius)) * 0.17 + 0.03
      dummy.position.set(
        Math.cos(angle) * radius,
        flowerY + Math.sin(angle) * radius,
        zOffset,
      )
      dummy.rotation.set(0, 0, angle)
      const size = 0.055 + (index % 5) * 0.003
      dummy.scale.set(size, size * 1.25, size)
      dummy.updateMatrix()
      seeds.current?.setMatrixAt(index, dummy.matrix)

      // Gradiente: centro chocolate profundo, periferia ámbar dorado cálido
      const isOuter = radius > 0.95
      const seedColor = isOuter
        ? (index % 3 === 0 ? '#e09825' : '#a35a1a')
        : (index % 2 === 0 ? '#5a2e15' : '#3a190b')
      seeds.current?.setColorAt(index, new Color(seedColor))
    }
    if (seeds.current) {
      seeds.current.instanceMatrix.needsUpdate = true
      if (seeds.current.instanceColor) seeds.current.instanceColor.needsUpdate = true
    }
  }, [dummy])

  // Animación de aparición suave sincronizada con el viaje
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const p = timeline.current?.progress ?? 0
    const appear = smoothstep(0.48, 0.72, p)
    const reveal = smoothstep(0.76, 0.90, p)
    const targetScale = appear * MathUtils.lerp(0.68, 0.94, reveal)

    group.current.scale.setScalar(
      MathUtils.lerp(group.current.scale.x, targetScale, 1 - Math.exp(-delta * 3.2)),
    )

    // Desvanecimiento de opacidad suave
    const opacity = smoothstep(0.49, 0.69, p)
    group.current.traverse((child) => {
      if ('material' in child) {
        const mat = (child as Mesh).material
        if (mat && !Array.isArray(mat)) {
          mat.opacity = opacity
        }
      }
    })
  })

  return (
    <group ref={group} scale={0}>
      {/* ── TALLO CURVO BOTÁNICO ── */}
      <mesh geometry={stemGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#2e731b"
          roughness={0.55}
          metalness={0.04}
          emissive="#0e3607"
          emissiveIntensity={0.22}
          transparent
          opacity={0}
        />
      </mesh>

      {/* ── 4 HOJAS 3D CON PECÍOLOS Y NERVADURAS ── */}
      {leaves.map((leaf, index) => (
        <group key={`leaf-${index}`} position={leaf.position}>
          <mesh
            position={[0, 0, 0]}
            rotation={leaf.rotation}
            scale={[0.055, leaf.petioleLength, 0.055]}
          >
            <cylinderGeometry args={[1, 1.1, 1, 8]} />
            <meshStandardMaterial
              color="#2a6d19"
              roughness={0.58}
              emissive="#0e3407"
              emissiveIntensity={0.18}
              transparent
              opacity={0}
            />
          </mesh>
          <mesh
            geometry={leaf.geom}
            position={[0, 0, 0]}
            rotation={leaf.rotation}
            scale={leaf.scale}
            castShadow
          >
            <meshPhysicalMaterial
              color="#2e761c"
              roughness={0.5}
              metalness={0.03}
              emissive="#0e3607"
              emissiveIntensity={0.2}
              sheen={0.75}
              sheenColor="#7ed957"
              sheenRoughness={0.35}
              side={DoubleSide}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}

      {/* ── PARTE TRASERA DEL GIRASOL: DORADA Y HERMOSA EN 360° ── */}
      {/* Cúpula trasera amarilla cálida (coincide con los pétalos y luce radiante desde atrás) */}
      <mesh position={[0, 1.35, -0.16]} scale={[1.48, 1.48, 0.22]} castShadow receiveShadow>
        <sphereGeometry args={[1, 36, 24]} />
        <meshPhysicalMaterial
          color="#ffb703"
          roughness={0.42}
          metalness={0.02}
          emissive="#b86800"
          emissiveIntensity={0.22}
          sheen={0.85}
          sheenColor="#ffe080"
          sheenRoughness={0.3}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Pequeño collar botánico verde sutil donde el tallo se une a la flor */}
      <mesh position={[0, 1.33, -0.15]} rotation={[Math.PI / 2, 0, 0]} scale={[0.24, 0.12, 0.24]}>
        <cylinderGeometry args={[0.22, 0.16, 0.2, 16]} />
        <meshStandardMaterial
          color="#2d711a"
          roughness={0.58}
          emissive="#0e3607"
          emissiveIntensity={0.18}
          transparent
          opacity={0}
        />
      </mesh>

      {/* ── PÉTALOS REDONDEADOS (NATURALES, SUAVES Y HERMOSOS) ── */}
      {petals.map((petal) => (
        <mesh
          key={petal.key}
          geometry={petal.geom}
          position={petal.position}
          rotation={petal.rotation}
          scale={petal.scale}
          castShadow
        >
          <meshPhysicalMaterial
            color="#ffbe0b"
            roughness={0.36}
            metalness={0.02}
            emissive="#c46a00"
            emissiveIntensity={0.24}
            sheen={0.9}
            sheenColor="#ffe47b"
            sheenRoughness={0.28}
            clearcoat={0.12}
            clearcoatRoughness={0.7}
            side={DoubleSide}
            transparent
            opacity={0}
          />
        </mesh>
      ))}

      {/* ── DISCO FRONTAL MARRÓN CHOCOLATE ── */}
      <mesh position={[0, 1.35, 0.10]} scale={[1.44, 1.44, 0.22]} castShadow>
        <sphereGeometry args={[1, 44, 28]} />
        <meshStandardMaterial
          color="#3c2114"
          roughness={0.92}
          emissive="#1f0f08"
          emissiveIntensity={0.2}
          transparent
          opacity={0}
        />
      </mesh>

      {/* ── 260 SEMILLAS EN ESPIRAL ÁUREA DE FIBONACCI ── */}
      <instancedMesh ref={seeds} args={[undefined, undefined, 260]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial
          color="#784218"
          roughness={0.78}
          metalness={0.0}
          transparent
          opacity={0}
        />
      </instancedMesh>
    </group>
  )
}
