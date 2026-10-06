import { useEffect, useRef, useState } from 'react'
import type { ImageEffect, PublicStage, PublicState } from '../engine/types'
import { displayUrl } from '../media/library'

export function StageView({ state }: { state: PublicState }) {
  const type = state.challengeType
  return (
    <div className="stage-view">
      {state.instructions && <p className="prompt">{state.instructions}</p>}
      {type === 'fact-or-fright' && (
        <div className="fact-card">
          <p className="eyebrow">Fact or Fright</p>
          <blockquote>{state.factStatement}</blockquote>
          {state.factTruth === undefined ? (
            <p className="choice-row"><span>Fact</span><span>Fright</span></p>
          ) : (
            <p className={`verdict ${state.factTruth ? 'good' : 'bad'}`}>{state.factTruth ? 'Fact' : 'Fright'}</p>
          )}
        </div>
      )}
      {type === 'which-came-first' && state.pair && (
        <div className="pair-board">
          <article>{state.pair.a}</article>
          <p>or</p>
          <article>{state.pair.b}</article>
          {state.pair.first && (
            <p className="verdict good">First: {state.pair.first === 'a' ? state.pair.a : state.pair.b}</p>
          )}
          {state.pair.detail && <p className="detail">{state.pair.detail}</p>}
        </div>
      )}
      {type === 'higher-lower' && state.higherLower && (
        <div className="hl-board">
          <p className="eyebrow">{state.higherLower.shown.unit}</p>
          <p className="hl-value">{state.higherLower.shown.value}</p>
          <p className="hl-label">{state.higherLower.shown.label}</p>
          <p className="hl-ask">Is the next one higher or lower?</p>
          <p className="hl-hidden">{state.higherLower.hiddenLabel}</p>
          {state.higherLower.direction && (
            <p className="verdict good">
              {state.higherLower.direction === 'higher' ? 'Higher' : 'Lower'}
              {state.higherLower.hiddenValue !== undefined ? ` · ${state.higherLower.hiddenValue}` : ''}
            </p>
          )}
        </div>
      )}
      {type === 'timeline' && state.timeline && (
        <ol className="timeline-board">
          {state.timeline.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <span>{item.order ?? index + 1}</span>
              {item.label}
            </li>
          ))}
        </ol>
      )}
      {type === 'monster-match' && state.match && (
        <div className="match-board">
          <div>
            {state.match.left.map((item) => <p key={item}>{item}</p>)}
          </div>
          <div>
            {state.match.right.map((item) => <p key={item}>{item}</p>)}
          </div>
          {state.match.pairs && (
            <ul className="match-key">
              {state.match.pairs.map((pair) => (
                <li key={pair.left}>{pair.left} → {pair.right}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {type === 'lightning' && state.lightning && (
        <div className="lightning-board">
          <p className="eyebrow">{state.lightning.index + 1} of {state.lightning.count}</p>
          <p className="bolt">{state.lightning.prompt}</p>
          {state.lightning.answer && <p className="verdict good">{state.lightning.answer}</p>}
        </div>
      )}
      {state.stage?.image && <ClueImage image={state.stage.image} />}
      {state.stage?.video && <StoryClip end={state.stage.video.end} cueId={state.mediaCue?.id ?? state.stageIndex} />}
      {state.stage?.audio && <ListenCard end={state.stage.audio.end} />}
      {state.stage?.publicText && type !== 'lightning' && type !== 'fact-or-fright' && (
        <p className="clue-copy">{state.stage.publicText}</p>
      )}
      {state.choices && state.choices.length > 0 && (
        <ol className="choices">
          {state.choices.map((choice) => <li key={choice}>{choice}</li>)}
        </ol>
      )}
      {state.bonuses && state.bonuses.length > 0 && (
        <ul className="bonus-list">
          {state.bonuses.map((bonus) => (
            <li key={bonus.prompt}>Bonus {bonus.points}: {bonus.prompt}{bonus.answer ? ` — ${bonus.answer}` : ''}</li>
          ))}
        </ul>
      )}
      {state.answerRevealed && state.answerText && type !== 'lightning' && (
        <p className="answer-banner">{state.answerText}</p>
      )}
    </div>
  )
}

function ListenCard({ end }: { end: number }) {
  return (
    <div className="listen-card" aria-label="Audio clue">
      <div className="bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <p>Listen</p>
      <p className="detail">{end.toFixed(1)} seconds</p>
    </div>
  )
}

function StoryClip({ end, cueId }: { end: number; cueId: number }) {
  const [time, setTime] = useState(0)
  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const loop = (now: number) => {
      const elapsed = Math.min(end, (now - started) / 1000)
      setTime(elapsed)
      if (elapsed < end) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [end, cueId])
  const frame = Math.min(3, Math.floor(time))
  return (
    <div className="story-clip" aria-label="Short original scene">
      <PorchFrame frame={frame} />
      <p className="detail">{time.toFixed(1)}s</p>
    </div>
  )
}

function PorchFrame({ frame }: { frame: number }) {
  return (
    <svg viewBox="0 0 160 90" className="story-svg" role="img">
      <rect width="160" height="90" fill="#100c14" />
      <circle cx="126" cy="18" r="8" fill="#f4e7c8" opacity={frame > 1 ? 0.9 : 0.2} />
      {frame > 1 && <path d="M18 70 L34 42 L50 70 Z" fill="#241628" />}
      {frame > 0 && <rect x="70" y="40" width="16" height="24" fill="#3a2414" stroke="#e7b15a" />}
      {frame > 2 && <path d="M78 40 C74 30 74 24 78 18 C82 24 82 30 78 40 Z" fill="#ffb03a" />}
      {frame === 0 && <circle cx="40" cy="62" r="3" fill="#ffb03a" />}
      <path d="M0 78 H160 V90 H0 Z" fill="#1a1210" />
    </svg>
  )
}

export function ClueImage({ image }: { image: NonNullable<PublicStage['image']> }) {
  const src = displayUrl(image.mediaId, image.url)
  if (!src) return <p className="missing-media">The picture is waiting in the media library.</p>
  return (
    <div className="clue-frame">
      <EffectImage src={src} effect={image.effect} />
      {image.credit && <p className="poster-credit">{image.credit}</p>}
    </div>
  )
}

function EffectImage({ src, effect }: { src: string; effect: ImageEffect }) {
  if (effect.kind === 'pixelate') return <PixelImage src={src} block={effect.pixelSize ?? 16} />
  if (effect.kind === 'crop' && effect.crop) return <CropImage src={src} crop={effect.crop} />
  if (effect.kind === 'mask') return <MaskedImage src={src} mask={effect.mask ?? 'door'} reveal={effect.reveal ?? 0.2} />
  const filter = filtersFor(effect)
  const zoom = effect.kind === 'zoom' ? effect.zoom ?? 1 : 1
  return (
    <div className={`effect-stage ${effect.kind === 'silhouette' ? 'silhouette' : ''}`}>
      <img src={src} alt="" crossOrigin="anonymous" style={{ filter, transform: `scale(${zoom})`, objectFit: effect.kind === 'none' ? 'contain' : 'cover' }} />
    </div>
  )
}

function filtersFor(effect: ImageEffect): string | undefined {
  if (effect.kind === 'blur') return `blur(${effect.blur ?? 12}px)`
  if (effect.kind === 'brightness') return `brightness(${effect.brightness ?? 0.4})`
  if (effect.kind === 'silhouette') return 'brightness(0)'
  return undefined
}

function CropImage({ src, crop }: { src: string; crop: { x: number; y: number; w: number; h: number } }) {
  const w = Math.max(crop.w, 1)
  const h = Math.max(crop.h, 1)
  return (
    <div className="effect-stage">
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          width: `${10000 / w}%`,
          height: `${10000 / h}%`,
          left: `${-(crop.x / w) * 100}%`,
          top: `${-(crop.y / h) * 100}%`,
          maxWidth: 'none',
          objectFit: 'fill',
        }}
      />
    </div>
  )
}

function MaskedImage({ src, mask, reveal }: { src: string; mask: string; reveal: number }) {
  const open = Math.min(1, Math.max(0, reveal))
  return (
    <div className={`effect-stage mask-${mask}`}>
      <img src={src} alt="" crossOrigin="anonymous" />
      {mask === 'flashlight' ? (
        <div className="flashlight" style={{ ['--reveal' as string]: `${20 + open * 80}%` }} />
      ) : mask === 'fog' ? (
        <div className="fog-mask" style={{ opacity: 1 - open }} />
      ) : (
        <>
          <div className="shutter left" style={{ transform: `translateX(${-open * 105}%)` }} />
          <div className="shutter right" style={{ transform: `translateX(${open * 105}%)` }} />
        </>
      )}
    </div>
  )
}

function PixelImage({ src, block }: { src: string; block: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const width = 960
      const height = 540
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return
      const size = Math.max(2, block)
      const sw = Math.max(1, Math.round(width / size))
      const sh = Math.max(1, Math.round(height / size))
      const small = document.createElement('canvas')
      small.width = sw
      small.height = sh
      const smallContext = small.getContext('2d')
      if (!smallContext) return
      smallContext.drawImage(image, 0, 0, sw, sh)
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, width, height)
      context.drawImage(small, 0, 0, width, height)
    }
    image.src = src
  }, [src, block])
  return <canvas ref={ref} className="pixel-canvas" />
}

export function useClock(running: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    let frame = 0
    const loop = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [running])
  return now
}
