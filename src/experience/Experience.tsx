import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useRef } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import type { DeviceProfile } from '../hooks/useDevicePerformance'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import type { ExperiencePhase } from '../types/experience'
import { timelineConfig } from '../config/experience'
import { computeKinematicsFromProgress } from '../utils/kinematics'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { GoldenDust } from './effects/GoldenDust'
import { StarField } from './effects/StarField'
import { FlowerField } from './scenes/FlowerField'
import { EarthDeparture } from './scenes/EarthDeparture'
import { SpaceTransition } from './scenes/SpaceTransition'
import { SunflowerSun } from './scenes/SunflowerSun'
import { WarpTunnel } from './scenes/WarpTunnel'
import { SpeedLines } from './effects/SpeedLines'

interface ExperienceProps {
  timeline: React.RefObject<TimelineState>
  activeRef: React.RefObject<boolean>
  elapsedRef: React.RefObject<number>
  onPhaseChange: (phase: ExperiencePhase) => void
  profile: DeviceProfile
  restartToken: number
}

function TimelineDriver({
  timeline,
  activeRef,
  elapsedRef,
  onPhaseChange,
  reducedMotion,
}: {
  timeline: React.RefObject<TimelineState>
  activeRef: React.RefObject<boolean>
  elapsedRef: React.RefObject<number>
  onPhaseChange: (phase: ExperiencePhase) => void
  reducedMotion: boolean
}) {
  const currentPhaseRef = useRef<ExperiencePhase>('INTRO')

  useFrame((_, delta) => {
    if (!activeRef.current) {
      currentPhaseRef.current = 'INTRO'
      return
    }
    const pace = reducedMotion ? 1.3 : 1
    const total = timelineConfig.finalEnd * pace
    const dt = Math.min(delta, 0.05)
    elapsedRef.current = (elapsedRef.current ?? 0) + dt
    const p = Math.min(1, elapsedRef.current / total)
    const state = computeKinematicsFromProgress(p, reducedMotion)
    if (timeline.current) {
      Object.assign(timeline.current, state)
    }

    const elapsed = elapsedRef.current
    let nextPhase: ExperiencePhase = 'ASCENDING'
    if (elapsed >= timelineConfig.revealEnd * pace) {
      nextPhase = 'FINAL'
    } else if (elapsed >= timelineConfig.approachEnd * pace) {
      nextPhase = 'REVEAL'
    } else if (elapsed >= timelineConfig.warpEnd * pace) {
      nextPhase = 'APPROACH'
    } else if (elapsed >= timelineConfig.spaceEnd * pace) {
      nextPhase = 'WARP'
    } else if (elapsed >= timelineConfig.ascendEnd * pace) {
      nextPhase = 'SPACE'
    }

    if (nextPhase !== currentPhaseRef.current) {
      currentPhaseRef.current = nextPhase
      onPhaseChange(nextPhase)
    }
  }, -1)

  return null
}

function World({ timeline, activeRef, elapsedRef, onPhaseChange, profile, restartToken }: ExperienceProps) {
  return (
    <>
      <TimelineDriver
        timeline={timeline}
        activeRef={activeRef}
        elapsedRef={elapsedRef}
        onPhaseChange={onPhaseChange}
        reducedMotion={profile.reducedMotion}
      />
      <CameraRig timeline={timeline} profile={profile} restartToken={restartToken} />
      <SpaceTransition timeline={timeline} />
      <EarthDeparture timeline={timeline} />
      <Lighting timeline={timeline} />
      <FlowerField timeline={timeline} count={profile.flowerCount} />
      <StarField timeline={timeline} count={profile.isLowPower ? 620 : 1100} />
      <GoldenDust timeline={timeline} count={profile.isLowPower ? 260 : 540} />
      <WarpTunnel timeline={timeline} count={profile.particleCount} />
      <SpeedLines timeline={timeline} count={profile.isLowPower ? 180 : 360} />
      <SunflowerSun timeline={timeline} particleCount={profile.particleCount} />
      <AdaptiveDpr pixelated />
      {!profile.isLowPower && !profile.reducedMotion && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.82} luminanceThreshold={0.64} luminanceSmoothing={0.5} mipmapBlur />
          <DepthOfField focusDistance={0.02} focalLength={0.028} bokehScale={0.55} height={360} />
          <Vignette eskil={false} offset={0.18} darkness={0.72} />
        </EffectComposer>
      )}
      {profile.isLowPower && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.65} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.66} />
        </EffectComposer>
      )}
    </>
  )
}

export function Experience(props: ExperienceProps) {
  return (
    <div className="canvas-shell" aria-hidden="true">
      <Canvas
        dpr={props.profile.dpr}
        camera={{ position: [0, 1.35, 8], fov: props.profile.isMobile ? 62 : 50, near: 0.1, far: 160 }}
        gl={{ antialias: !props.profile.isLowPower, alpha: false, powerPreference: 'high-performance' }}
        shadows={!props.profile.isLowPower}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
          gl.outputColorSpace = SRGBColorSpace
          gl.setClearColor('#42a1eb')
        }}
      >
        <Suspense fallback={null}>
          <World {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
