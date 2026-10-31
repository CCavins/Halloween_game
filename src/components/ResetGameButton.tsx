import { useEffect, useId, useState, type ReactNode } from 'react'
import { resetGame } from '../state/store'

type Step = 'closed' | 'warn' | 'final'

export function ResetGameButton({
  className,
  children = 'Reset game',
}: {
  className?: string
  children?: ReactNode
}) {
  const [step, setStep] = useState<Step>('closed')
  const titleId = useId()
  const open = step !== 'closed'

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStep('closed')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function runReset() {
    resetGame()
    setStep('closed')
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setStep('warn')}>
        {children}
      </button>
      {open && (
        <div className="confirm-backdrop" onClick={() => setStep('closed')}>
          <div
            className="confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            {step === 'warn' ? (
              <>
                <p className="eyebrow">Reset game</p>
                <h2 id={titleId}>Are you sure?</h2>
                <p className="confirm-copy">
                  All scores return to zero and you start from the beginning. Progress and question edits in this browser are cleared. Team names stay.
                </p>
                <div className="confirm-actions">
                  <button type="button" className="text-button" onClick={() => setStep('closed')}>Cancel</button>
                  <button type="button" className="primary" onClick={() => setStep('final')}>Continue</button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">Last chance</p>
                <h2 id={titleId}>Reset the game now?</h2>
                <p className="confirm-copy">This cannot be undone.</p>
                <div className="confirm-actions">
                  <button type="button" className="text-button" onClick={() => setStep('closed')}>Cancel</button>
                  <button type="button" className="danger" onClick={runReset}>Yes, reset</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
