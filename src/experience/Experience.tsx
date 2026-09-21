import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import type { DeviceProfile } from '../hooks/useDevicePerformance'
import type { TimelineState } from '../hooks/useExperienceTimeline'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { GoldenDust } from './effects/GoldenDust'
import { StarField } from './effects/StarField'
import { FlowerField } from './scenes/FlowerField'
import { EarthDeparture } from './scenes/EarthDeparture'
import { SpaceTransition } from './scenes/SpaceTransition'
import { SunflowerSun } from './scenes/SunflowerSun'
import { WarpTunnel } from './scenes/WarpTunnel'

interface ExperienceProps {
  timeline: React.RefObject<TimelineState>
  profile: DeviceProfile
  restartToken: number
}

function World({ timeline, profile, restartToken }: ExperienceProps) {
  return (
    <>
      <CameraRig timeline={timeline} profile={profile} restartToken={restartToken} />
      <SpaceTransition timeline={timeline} />
      <EarthDeparture timeline={timeline} />
      <Lighting timeline={timeline} />
      <FlowerField timeline={timeline} count={profile.flowerCount} />
      <StarField timeline={timeline} count={profile.isLowPower ? 620 : 1100} />
      <GoldenDust timeline={timeline} count={profile.isLowPower ? 260 : 540} />
      <WarpTunnel timeline={timeline} count={profile.particleCount} />
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
          gl.setClearColor('#02040a')
        }}
      >
        <Suspense fallback={null}>
          <World {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
