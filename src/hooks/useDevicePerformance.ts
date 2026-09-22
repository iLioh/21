import { useEffect, useMemo, useState } from 'react'

export interface DeviceProfile {
  isMobile: boolean
  isLowPower: boolean
  reducedMotion: boolean
  dpr: [number, number]
  flowerCount: number
  particleCount: number
}

const query = (value: string) =>
  typeof window !== 'undefined' && window.matchMedia(value).matches

export function useDevicePerformance(): DeviceProfile {
  const [viewport, setViewport] = useState(() => ({
    mobile: query('(max-width: 700px), (pointer: coarse)'),
    reduced: query('(prefers-reduced-motion: reduce)'),
  }))

  useEffect(() => {
    const onChange = () => setViewport({
      mobile: query('(max-width: 700px), (pointer: coarse)'),
      reduced: query('(prefers-reduced-motion: reduce)'),
    })
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])

  return useMemo(() => {
    const cores = navigator.hardwareConcurrency ?? 4
    const isLowPower = viewport.mobile || cores <= 4
    return {
      isMobile: viewport.mobile,
      isLowPower,
      reducedMotion: viewport.reduced,
      dpr: viewport.mobile ? [1, 1.4] : [1, 1.85],
      flowerCount: viewport.reduced ? 45 : isLowPower ? 75 : 125,
      particleCount: viewport.reduced ? 120 : isLowPower ? 280 : 560,
    }
  }, [viewport])
}
