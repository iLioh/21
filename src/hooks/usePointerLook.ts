import { useEffect, useRef } from 'react'
import { Vector2 } from 'three'

export function usePointerLook() {
  const target = useRef(new Vector2())
  const current = useRef(new Vector2())
  const dragging = useRef(false)

  useEffect(() => {
    const setFromPointer = (event: PointerEvent) => {
      const isTouch = event.pointerType === 'touch'
      if (isTouch && !dragging.current) return
      target.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      )
    }
    const onDown = (event: PointerEvent) => {
      dragging.current = true
      setFromPointer(event)
    }
    const onUp = () => {
      dragging.current = false
      target.current.set(0, 0)
    }
    const onLeave = () => target.current.set(0, 0)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', setFromPointer)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', setFromPointer)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return { target, current }
}
