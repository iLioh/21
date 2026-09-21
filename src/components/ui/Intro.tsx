import { experienceConfig } from '../../config/experience'

interface IntroProps {
  visible: boolean
  isMobile: boolean
  onStart: () => void
}

export function Intro({ visible, isMobile, onStart }: IntroProps) {
  return (
    <section className={`intro-overlay ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className="intro-copy">
        <p className="eyebrow">Todo comienza aquí</p>
        <h1>{experienceConfig.introText}</h1>
        <button className="begin-button" onClick={onStart} tabIndex={visible ? 0 : -1}>
          <span className="begin-orbit" aria-hidden="true" />
          {isMobile ? experienceConfig.introActionMobile : experienceConfig.introActionDesktop}
        </button>
      </div>
    </section>
  )
}
