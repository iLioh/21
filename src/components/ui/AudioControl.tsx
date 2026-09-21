import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface AudioControlProps {
  started: boolean
  restartToken: number
}

export function AudioControl({ started, restartToken }: AudioControlProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [available, setAvailable] = useState(true)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const audio = new Audio('/audio/music.mp3')
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    const unavailable = () => setAvailable(false)
    audio.addEventListener('error', unavailable)
    audioRef.current = audio
    return () => {
      gsap.killTweensOf(audio)
      audio.pause()
      audio.removeEventListener('error', unavailable)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !started || !available) return
    audio.currentTime = 0
    void audio.play().then(() => {
      gsap.to(audio, { volume: 0.28, duration: 3, ease: 'power2.out' })
    }).catch(() => setAvailable(false))
  }, [started, restartToken, available])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const nextMuted = !muted
    setMuted(nextMuted)
    gsap.to(audio, { volume: nextMuted ? 0 : 0.28, duration: 0.6, ease: 'power2.out' })
  }, [muted])

  if (!started || !available) return null

  return (
    <button className="audio-control" onClick={toggle} aria-label={muted ? 'Activar música' : 'Silenciar música'}>
      <span className={`sound-wave ${muted ? 'is-muted' : ''}`} aria-hidden="true">
        <i /><i /><i />
      </span>
    </button>
  )
}
