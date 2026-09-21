import { experienceConfig } from '../../config/experience'

interface FinalMessageProps {
  visible: boolean
  onReplay: () => void
}

export function FinalMessage({ visible, onReplay }: FinalMessageProps) {
  return (
    <section className={`final-overlay ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className="final-copy">
        <h2 className="final-line second">{experienceConfig.finalMessage}</h2>
        <button className="replay-button icon-only" onClick={onReplay} tabIndex={visible ? 0 : -1} aria-label="Volver a verlo">
          <span aria-hidden="true">↻</span>
        </button>
      </div>
    </section>
  )
}
