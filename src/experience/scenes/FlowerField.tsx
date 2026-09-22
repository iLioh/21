import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Euler,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { TimelineState } from '../../hooks/useExperienceTimeline'
import { seededRandom, smoothstep } from '../../utils/math'

interface FlowerFieldProps {
  timeline: React.RefObject<TimelineState>
  count: number
}

interface FlowerDatum {
  x: number
  z: number
  groundY: number
  height: number
  size: number
  lean: number
  rotX: number
  rotY: number
}

const PETALS = 16
const GRASS_TUFT_RATIO = 16

/**
 * Genera la textura del corazón del girasol:
 * Fondo marrón chocolate cálido aterciopelado (idéntico al del sol girasol),
 * cubierto con cientos de puntos de semillas y flósculos en espiral de Fibonacci (proporción áurea).
 */
function createCenterTextures() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2

  // 1. Fondo marrón chocolate cálido y luminoso (evita que se vuelva negro en sombras)
  const bgGrad = ctx.createRadialGradient(half, half, 8, half, half, half)
  bgGrad.addColorStop(0, '#422413')
  bgGrad.addColorStop(0.35, '#543019')
  bgGrad.addColorStop(0.70, '#653a1e')
  bgGrad.addColorStop(1, '#3b2010')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, size, size)

  // 2. Semillas y flósculos en espiral áurea (Golden angle: ~137.508°)
  const dotCount = 420
  const goldenAngle = 2.39996323
  for (let i = 1; i <= dotCount; i++) {
    const norm = i / dotCount
    const r = Math.sqrt(norm) * (half * 0.94)
    const theta = i * goldenAngle
    const x = half + Math.cos(theta) * r
    const y = half + Math.sin(theta) * r

    const dotR = 2.2 + norm * 2.8

    // Paleta viva de flósculos botánicos como en el girasol cósmico:
    // - Núcleo: marrón chocolate cálido (#5a3219, #734020)
    // - Zona media: marrón ámbar vivo (#9c5924, #b86d28)
    // - Corona exterior: puntos dorados radiantes (#d98a28, #f5ac36, #ffbe4a)
    let dotColor = '#5c3319'
    let highlightColor = '#7a4524'
    if (norm > 0.65) {
      dotColor = norm > 0.85 ? '#e09228' : '#c47822'
      highlightColor = '#ffc85a'
    } else if (norm > 0.32) {
      dotColor = '#8e4f20'
      highlightColor = '#b5682e'
    }

    // Dibujar punto
    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fillStyle = dotColor
    ctx.fill()

    // Resalte luminoso en el punto para volumen físico
    ctx.beginPath()
    ctx.arc(x - dotR * 0.28, y - dotR * 0.28, dotR * 0.44, 0, Math.PI * 2)
    ctx.fillStyle = highlightColor
    ctx.fill()
  }

  // 3. Mapa de relieve (bump map) en escala de grises
  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = size
  bumpCanvas.height = size
  const bumpCtx = bumpCanvas.getContext('2d')!
  bumpCtx.fillStyle = '#808080'
  bumpCtx.fillRect(0, 0, size, size)

  for (let i = 1; i <= dotCount; i++) {
    const norm = i / dotCount
    const r = Math.sqrt(norm) * (half * 0.94)
    const theta = i * goldenAngle
    const x = half + Math.cos(theta) * r
    const y = half + Math.sin(theta) * r
    const dotR = 2.2 + norm * 2.8

    const bumpGrad = bumpCtx.createRadialGradient(x - dotR * 0.22, y - dotR * 0.22, 0, x, y, dotR)
    bumpGrad.addColorStop(0, '#ffffff')
    bumpGrad.addColorStop(0.60, '#b8b8b8')
    bumpGrad.addColorStop(1, '#808080')
    bumpCtx.fillStyle = bumpGrad
    bumpCtx.beginPath()
    bumpCtx.arc(x, y, dotR, 0, Math.PI * 2)
    bumpCtx.fill()
  }

  const texture = new CanvasTexture(canvas)
  const bumpTexture = new CanvasTexture(bumpCanvas)
  return { texture, bumpTexture }
}

const groundVertex = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const groundFragment = `
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec2 pos = vWorldPos.xz;

    float macro = noise(pos * 0.42) * 0.6 + noise(pos * 1.1) * 0.4;
    float b1 = noise(vec2(pos.x * 12.0, pos.y * 3.5));
    float b2 = noise(vec2(pos.x * 24.0, pos.y * 7.0)) * 0.5;
    float bladePattern = b1 + b2;

    vec3 grassDeep   = vec3(0.18, 0.42, 0.10);
    vec3 grassLush   = vec3(0.30, 0.62, 0.16);
    vec3 grassSun    = vec3(0.48, 0.78, 0.22);
    vec3 cloverGold  = vec3(0.56, 0.82, 0.26);
    vec3 richEarth   = vec3(0.28, 0.20, 0.11);

    vec3 baseGrass = mix(grassDeep, grassLush, smoothstep(0.32, 0.78, bladePattern));
    baseGrass = mix(baseGrass, grassSun, smoothstep(0.52, 0.94, bladePattern) * 0.65);
    vec3 meadow = mix(baseGrass, cloverGold, smoothstep(0.58, 0.92, macro) * 0.35);
    meadow = mix(meadow, richEarth, smoothstep(0.12, 0.28, noise(pos * 0.75)) * 0.22);

    vec3 sunDir = normalize(vec3(0.35, 0.88, 0.32));
    float sunDiff = max(0.52, dot(vNormal, sunDir));
    vec3 finalColor = meadow * (0.80 + sunDiff * 0.55);

    float dist = length(vUv - vec2(0.5)) * 2.0;
    float edgeAlpha = 1.0 - smoothstep(0.74, 1.0, dist);

    gl_FragColor = vec4(finalColor, uOpacity * edgeAlpha);
  }
`

export function FlowerField({ timeline, count }: FlowerFieldProps) {
  const group = useRef<Group>(null)
  const stems = useRef<InstancedMesh>(null)
  const centers = useRef<InstancedMesh>(null)
  const petals = useRef<InstancedMesh>(null)
  const grassMesh = useRef<InstancedMesh>(null)
  const groundMaterial = useRef<ShaderMaterial>(null)
  const groundUniforms = useMemo(() => ({ uOpacity: { value: 1 } }), [])
  const centerTextures = useMemo(createCenterTextures, [])

  // Matrices de composición para orientación 3D libre de gimbal lock
  const matrices = useMemo(() => ({
    headMatrix: new Matrix4(),
    childMatrix: new Matrix4(),
    worldMatrix: new Matrix4(),
    stemMatrix: new Matrix4(),
    headPos: new Vector3(),
    headEuler: new Euler(),
    headQuat: new Quaternion(),
    childPos: new Vector3(),
    childEuler: new Euler(),
    childQuat: new Quaternion(),
    childScale: new Vector3(),
    dummy: new Object3D(),
  }), [])

  // Distribución orgánica botánica de girasoles:
  // - Mayor densidad de flores
  // - Posiciones naturales escalonadas en profundidad y altura (sin líneas planas artificiales)
  // - Apertura frontal que enmarca el camino hacia adelante sin tapar la lente
  const flowers = useMemo<FlowerDatum[]>(() => {
    const random = seededRandom(942187)
    const list: FlowerDatum[] = []
    const targetCount = Math.max(count, 85)
    let attempts = 0
    const maxAttempts = targetCount * 70

    while (list.length < targetCount && attempts < maxAttempts) {
      attempts += 1
      const zNorm = random()
      // Profundidad de z = 5.2 a z = -18.5
      const z = 5.2 - Math.pow(zNorm, 0.78) * 23.7

      // Despeje frontal: cerca de la cámara (z > 3.2), abrir el centro para encuadre
      let x = 0
      if (z > 3.0) {
        // Enmarcar a los costados del campo visual
        const side = random() < 0.5 ? -1 : 1
        x = side * (1.65 + Math.pow(random(), 0.7) * 4.8)
      } else if (z < -3.5 && random() < 0.45) {
        // En el fondo profundo, campo continuo expansivo
        x = (random() - 0.5) * 23.0
      } else {
        // Zona media con curva orgánica natural
        const pathX = Math.sin(z * 0.18) * 0.65
        const side = random() < 0.5 ? -1 : 1
        const distFromCenter = 1.25 + Math.pow(random(), 0.75) * 8.5
        x = pathX + side * distFromCenter
      }

      // Dentro del perímetro circular del suelo
      if (Math.hypot(x, z + 3.5) > 23.5) continue

      // Distancia mínima para que no se encimen entre sí
      const minDist = z > 1.0 ? 0.72 : 0.56
      const tooClose = list.some((f) => Math.hypot(f.x - x, f.z - z) < minDist)
      if (tooClose) continue

      // Relieve suave del suelo y alturas botánicas escalonadas (1.30m a 2.05m)
      const groundY = -0.70 + Math.sin(x * 0.3) * 0.08 + Math.cos(z * 0.25) * 0.06
      const height = 1.32 + random() * 0.68 + (z > 2.0 ? (random() - 0.5) * 0.25 : 0)
      const size = 0.44 + random() * 0.24

      // Heliotropismo: orientados con suave inclinación hacia el sol y la cámara
      const lean = (random() - 0.5) * 0.12 + (x > 0 ? -0.03 : 0.03)
      const rotX = -0.10 + (random() - 0.5) * 0.08
      const rotY = (x > 0 ? -0.09 : 0.09) + (random() - 0.5) * 0.10

      list.push({
        x,
        z,
        groundY,
        height,
        size,
        lean,
        rotX,
        rotY,
      })
    }

    return list
  }, [count])

  // Pasto 3D
  const grassTufts = useMemo(() => {
    const random = seededRandom(41829)
    const grassCount = flowers.length * GRASS_TUFT_RATIO
    return Array.from({ length: grassCount }, () => {
      const radius = Math.pow(random(), 0.55) * 18.0
      const angle = random() * Math.PI * 2
      return {
        x: Math.cos(angle) * radius,
        z: -3.5 + Math.sin(angle) * radius,
        height: 0.30 + random() * 0.38,
        width: 0.75 + random() * 0.5,
        rotation: random() * Math.PI * 2,
        tilt: (random() - 0.5) * 0.22,
      }
    })
  }, [flowers.length])

  useLayoutEffect(() => {
    const {
      headMatrix,
      childMatrix,
      worldMatrix,
      headPos,
      headEuler,
      headQuat,
      childPos,
      childEuler,
      childQuat,
      childScale,
      dummy,
    } = matrices

    flowers.forEach((flower, flowerIndex) => {
      // 1. Tallo: anclado en el suelo y extendiéndose hacia la cabeza
      dummy.position.set(flower.x, flower.groundY + flower.height * 0.5, flower.z)
      dummy.rotation.set(0, 0, flower.lean)
      dummy.scale.set(0.065 * flower.size, flower.height, 0.065 * flower.size)
      dummy.updateMatrix()
      stems.current?.setMatrixAt(flowerIndex, dummy.matrix)

      // 2. Sistema de coordenadas local de la cabeza floral:
      // Elimina cualquier rotación desfasada (bug de Pac-Man/almeja plegada)
      const headX = flower.x + flower.lean * flower.height * 0.55
      const headY = flower.groundY + flower.height
      const headZ = flower.z

      headPos.set(headX, headY, headZ)
      headEuler.set(flower.rotX, flower.rotY, flower.lean * 0.7, 'YXZ')
      headQuat.setFromEuler(headEuler)
      headMatrix.compose(headPos, headQuat, new Vector3(1, 1, 1))

      // 3. Disco central marrón chocolate con textura de semillas:
      // En coordenadas locales de la cabeza: centrado y ligeramente al frente (+Z local)
      childPos.set(0, 0, 0.02)
      childQuat.identity()
      childScale.set(flower.size * 0.95, flower.size * 0.95, flower.size * 0.35)
      childMatrix.compose(childPos, childQuat, childScale)
      worldMatrix.multiplyMatrices(headMatrix, childMatrix)
      centers.current?.setMatrixAt(flowerIndex, worldMatrix)

      // 4. Pétalos dorados:
      // En coordenadas locales de la cabeza: radio en plano XY, ligeramente detrás del disco (-0.01 Z local)
      for (let petalIndex = 0; petalIndex < PETALS; petalIndex += 1) {
        const index = flowerIndex * PETALS + petalIndex
        const angle = (petalIndex / PETALS) * Math.PI * 2 + (flowerIndex % 4) * 0.03
        const radius = flower.size * 0.52

        childPos.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.01)
        // El pétalo apunta radialmente hacia afuera en el plano local de la flor
        childEuler.set(0.05, 0, angle - Math.PI / 2, 'ZXY')
        childQuat.setFromEuler(childEuler)
        childScale.set(flower.size * 0.22, flower.size * 0.72, flower.size * 0.08)
        childMatrix.compose(childPos, childQuat, childScale)

        worldMatrix.multiplyMatrices(headMatrix, childMatrix)
        petals.current?.setMatrixAt(index, worldMatrix)
      }
    })

    if (stems.current) stems.current.instanceMatrix.needsUpdate = true
    if (centers.current) centers.current.instanceMatrix.needsUpdate = true
    if (petals.current) petals.current.instanceMatrix.needsUpdate = true

    // 5. Pasto 3D
    grassTufts.forEach((tuft, index) => {
      dummy.position.set(tuft.x, -0.70 + tuft.height * 0.48, tuft.z)
      dummy.rotation.set(tuft.tilt, tuft.rotation, tuft.tilt * 0.5)
      dummy.scale.set(tuft.width, tuft.height, tuft.width)
      dummy.updateMatrix()
      grassMesh.current?.setMatrixAt(index, dummy.matrix)
    })
    if (grassMesh.current) grassMesh.current.instanceMatrix.needsUpdate = true
  }, [flowers, grassTufts, matrices])

  useFrame(({ clock }) => {
    if (!group.current) return
    const p = timeline.current?.progress ?? 0
    const fade = 1 - smoothstep(0.11, 0.22, p)
    group.current.visible = fade > 0.01

    // Brisa suave en el jardín
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.003
    group.current.position.x = Math.sin(clock.elapsedTime * 0.35) * 0.02
    group.current.scale.setScalar(MathUtils.lerp(0.96, 1.02, fade))

    if (groundMaterial.current) {
      groundMaterial.current.uniforms.uOpacity.value = fade * 0.95
    }
    group.current.traverse((object) => {
      if ('material' in object && object !== groundMaterial.current) {
        const material = (object as Mesh).material
        if (!Array.isArray(material) && material !== groundMaterial.current) {
          material.transparent = true
          material.opacity = fade
        }
      }
    })
  })

  return (
    <group ref={group}>
      {/* Tallos de los girasoles (verde vegetal mate) */}
      <instancedMesh ref={stems} args={[undefined, undefined, flowers.length]} castShadow>
        <cylinderGeometry args={[0.55, 0.78, 1, 7]} />
        <meshStandardMaterial color="#3c7324" roughness={0.68} metalness={0.0} />
      </instancedMesh>

      {/* Pétalos de amarillo girasol dorado cálido auténtico (#ffb703 / Pantone 123 C) */}
      <instancedMesh ref={petals} args={[undefined, undefined, flowers.length * PETALS]} castShadow>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial
          color="#ffb703"
          roughness={0.34}
          metalness={0.0}
          emissive="#5c3300"
          emissiveIntensity={0.07}
        />
      </instancedMesh>

      {/* Corazón del girasol: 3D abombado marrón chocolate con espiral áurea de semillas y puntos */}
      <instancedMesh ref={centers} args={[undefined, undefined, flowers.length]} castShadow>
        <sphereGeometry args={[0.50, 24, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          map={centerTextures.texture}
          bumpMap={centerTextures.bumpTexture}
          bumpScale={0.06}
          roughness={0.82}
          metalness={0.02}
          emissive="#40200e"
          emissiveIntensity={0.25}
        />
      </instancedMesh>

      {/* Pasto 3D: briznas esbeltas de césped fresco */}
      <instancedMesh ref={grassMesh} args={[undefined, undefined, grassTufts.length]} castShadow={false}>
        <cylinderGeometry args={[0.008, 0.032, 0.48, 3]} />
        <meshStandardMaterial
          color="#3f8220"
          roughness={0.58}
          metalness={0.0}
          emissive="#102806"
          emissiveIntensity={0.04}
        />
      </instancedMesh>

      {/* Suelo de pradera soleada con shader de césped e iluminación diurna */}
      <mesh position={[0, -0.70, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[26, 64]} />
        <shaderMaterial
          ref={groundMaterial}
          uniforms={groundUniforms}
          vertexShader={groundVertex}
          fragmentShader={groundFragment}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
