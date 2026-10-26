import { useEffect, useMemo, useRef, useState } from 'react'
import { ClueImage } from '../challenges/StageView'
import { challengeById, mediaAsset } from '../engine/logic'
import type { Challenge, ChallengeType, Pack } from '../engine/types'
import { bundledUrl } from '../media/library'
import { useGame } from '../state/store'

const MARKS_KEY = 'spooknight-review-marks'
const CURSOR_KEY = 'spooknight-review-cursor'

type Verdict = 'good' | 'change' | 'cut'
type Filter = 'open' | 'change' | 'cut' | 'good' | 'all'

interface ReviewMark {
  verdict: Verdict
  note: string
  at: number
}

interface QueueItem {
  roundTitle: string
  roundId: string
  indexInRound: number
  roundSize: number
  question: Challenge
}

const TYPE_LABEL: Record<ChallengeType, string> = {
  'image-stage': 'Picture',
  'audio-stage': 'Sound',
  'text-stage': 'Spoken clues',
  'fact-or-fright': 'Fact or fib',
  'which-came-first': 'Which came first',
  'higher-lower': 'Higher or lower',
  timeline: 'Timeline',
  'monster-match': 'Matching',
  'video-stage': 'Clip',
  lightning: 'Lightning round',
  costume: 'Costume pieces',
}

const VERDICT_LABEL: Record<Verdict, string> = {
  good: 'Good enough',
  change: 'Needs a change',
  cut: 'Cut',
}

export function ReviewScreen() {
  const pack = useGame().pack
  const queue = useMemo(() => buildQueue(pack), [pack])
  const [marks, setMarks] = useState<Record<string, ReviewMark>>(loadMarks)
  const [filter, setFilter] = useState<Filter>('open')
  const [cursor, setCursor] = useState(() => localStorage.getItem(CURSOR_KEY) ?? '')
  const [draft, setDraft] = useState('')
  const [draftFor, setDraftFor] = useState('')
  const [hint, setHint] = useState('')
  const [fallback, setFallback] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const filtered = useMemo(() => queue.filter((item) => matches(item, marks, filter)), [queue, marks, filter])
  const item = filtered.find((entry) => entry.question.id === cursor) ?? filtered[0]
  const shownId = item?.question.id ?? ''
  if (shownId !== draftFor) {
    setDraftFor(shownId)
    setDraft(marks[shownId]?.note ?? '')
    setHint('')
  }
  const nightIndex = item ? queue.findIndex((entry) => entry.question.id === item.question.id) : -1
  const counts = countMarks(queue, marks)

  useEffect(() => {
    if (cursor) localStorage.setItem(CURSOR_KEY, cursor)
  }, [cursor])

  useEffect(() => {
    if (!item) return
    if (item.question.id !== cursor) setCursor(item.question.id)
  }, [item, cursor])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        decide('change')
        return
      }
      if (typing) return
      const key = event.key.toLowerCase()
      if (key === 'arrowright' || key === 'j') {
        event.preventDefault()
        step(1)
      } else if (key === 'arrowleft' || key === 'k') {
        event.preventDefault()
        step(-1)
      } else if (key === 'a') {
        event.preventDefault()
        decide('good')
      } else if (key === 'c') {
        event.preventDefault()
        noteRef.current?.focus()
      } else if (key === 'x') {
        event.preventDefault()
        decide('cut')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function step(direction: number) {
    if (!item) return
    const index = filtered.findIndex((entry) => entry.question.id === item.question.id)
    const next = filtered[index + direction]
    if (next) setCursor(next.question.id)
  }

  function decide(verdict: Verdict) {
    if (!item) return
    const note = draft.trim()
    if (verdict === 'change' && !note) {
      setHint('Write what should change, then save it.')
      noteRef.current?.focus()
      return
    }
    const index = filtered.findIndex((entry) => entry.question.id === item.question.id)
    const next = filtered[index + 1] ?? filtered[index - 1]
    const updated = {
      ...marks,
      [item.question.id]: { verdict, note, at: Date.now() },
    }
    localStorage.setItem(MARKS_KEY, JSON.stringify(updated))
    setMarks(updated)
    setHint('')
    if (next && next.question.id !== item.question.id) {
      setCursor(next.question.id)
      setDraft(updated[next.question.id]?.note ?? '')
    } else {
      setDraft(note)
    }
  }

  function clearMark() {
    if (!item || !marks[item.question.id]) return
    const updated = { ...marks }
    delete updated[item.question.id]
    localStorage.setItem(MARKS_KEY, JSON.stringify(updated))
    setMarks(updated)
    setDraft('')
    setHint('Mark cleared. This question is open again.')
  }

  function jumpRound(roundId: string) {
    const match = filtered.find((entry) => entry.roundId === roundId) ?? queue.find((entry) => entry.roundId === roundId)
    if (!match) return
    if (!filtered.some((entry) => entry.question.id === match.question.id)) setFilter('all')
    setCursor(match.question.id)
  }

  async function copyNotes() {
    const text = formatReview(queue, marks)
    try {
      await navigator.clipboard.writeText(text)
      setFallback('')
      setHint('Copied. Paste that into the chat when you want these changes made.')
    } catch {
      setFallback(text)
      setHint('Clipboard was blocked. Select the notes in the box and copy them.')
    }
  }

  const rounds = queue.filter((entry, index) => queue.findIndex((other) => other.roundId === entry.roundId) === index)

  return (
    <div className="host calm review">
      <header className="calm-bar">
        <div>
          <p className="eyebrow">Question review</p>
          <strong>{counts.open} still open</strong>
        </div>
        <a className="text-button" href="#/host">Back to the game</a>
        <button type="button" onClick={copyNotes}>Copy notes</button>
      </header>

      <div className="review-filters">
        <FilterButton current={filter} id="open" count={counts.open} label="Still open" onPick={setFilter} />
        <FilterButton current={filter} id="change" count={counts.change} label="Needs a change" onPick={setFilter} />
        <FilterButton current={filter} id="cut" count={counts.cut} label="Cut" onPick={setFilter} />
        <FilterButton current={filter} id="good" count={counts.good} label="Good enough" onPick={setFilter} />
        <FilterButton current={filter} id="all" count={queue.length} label="All" onPick={setFilter} />
        <label className="review-round">
          Round
          <select value={item?.roundId ?? ''} onChange={(event) => jumpRound(event.target.value)}>
            {rounds.map((entry) => (
              <option key={entry.roundId || 'extras'} value={entry.roundId}>{entry.roundTitle}</option>
            ))}
          </select>
        </label>
      </div>

      {fallback && (
        <textarea className="review-fallback" readOnly value={fallback} onFocus={(event) => event.currentTarget.select()} />
      )}

      {!item && (
        <section className="play-card">
          <h1>{emptyTitle(filter)}</h1>
          <p className="notes">{emptyCopy(filter, counts)}</p>
        </section>
      )}

      {item && (
        <div className="review-layout">
          <article className="play-card">
            <p className="eyebrow">
              {item.roundTitle} · {item.indexInRound} of {item.roundSize}
              {nightIndex >= 0 ? ` · night ${nightIndex + 1} of ${queue.length}` : ''}
            </p>
            <p className="answer-label">Answer</p>
            <p className="big-answer">{item.question.answer || '—'}</p>
            {item.question.alternateAnswers.length > 0 && (
              <p className="also-accept">Also accept: {item.question.alternateAnswers.join(', ')}</p>
            )}
            <p className="review-meta">
              {TYPE_LABEL[item.question.type]} · {item.question.difficulty} · {item.question.audience} · {pointsLine(item.question)}
              {marks[item.question.id] && (
                <span className={`review-status ${marks[item.question.id].verdict}`}>
                  {VERDICT_LABEL[marks[item.question.id].verdict]}
                </span>
              )}
            </p>
            <QuestionBody question={item.question} pack={pack} />
          </article>

          <aside className="play-card review-decide">
            <h2>Your call</h2>
            <p className="notes">A marks it good enough. C writes a change. X cuts it. Arrows move without deciding.</p>
            <label>
              What should change?
              <textarea
                ref={noteRef}
                value={draft}
                placeholder="Too obscure, the third clue gives it away, wrong movie…"
                onChange={(event) => {
                  setDraft(event.target.value)
                  setHint('')
                }}
              />
            </label>
            <button type="button" className="verdict-good" onClick={() => decide('good')}>Good enough</button>
            <button type="button" className="primary" onClick={() => decide('change')}>Save the change</button>
            <button type="button" className="danger" onClick={() => decide('cut')}>Cut this question</button>
            {marks[item.question.id] && (
              <button type="button" onClick={clearMark}>Clear this mark</button>
            )}
            <div className="review-nav">
              <button type="button" onClick={() => step(-1)} disabled={filtered[0]?.question.id === item.question.id}>Previous</button>
              <button type="button" onClick={() => step(1)} disabled={filtered[filtered.length - 1]?.question.id === item.question.id}>Next</button>
            </div>
            {hint && <p className="notes">{hint}</p>}
          </aside>
        </div>
      )}
    </div>
  )
}

function FilterButton({
  current,
  id,
  count,
  label,
  onPick,
}: {
  current: Filter
  id: Filter
  count: number
  label: string
  onPick: (id: Filter) => void
}) {
  return (
    <button type="button" className={current === id ? 'on' : ''} onClick={() => onPick(id)}>
      {label} ({count})
    </button>
  )
}

function QuestionBody({ question, pack }: { question: Challenge; pack: Pack }) {
  const pictures = [
    ...question.stages.filter((stage) => stage.image).map((stage) => ({
      key: stage.id,
      mediaId: stage.image!.mediaId,
      effect: stage.image!.effect,
      caption: stage.label,
    })),
    ...(question.answerMediaId
      ? [{ key: `${question.id}-answer`, mediaId: question.answerMediaId, effect: { kind: 'none' as const }, caption: 'Shown with the answer' }]
      : []),
  ]

  return (
    <>
      {question.instructions && <p>{question.instructions}</p>}
      {question.choices && question.choices.length > 0 && (
        <ol className="book-clues">
          {question.choices.map((choice) => <li key={choice}>{choice}</li>)}
        </ol>
      )}
      {pictures.length > 0 && (
        <div className={`review-frames ${pictures.length === 1 ? 'solo' : ''}`}>
          {pictures.map((picture) => (
            <figure key={picture.key}>
              <ClueImage
                image={{
                  mediaId: picture.mediaId,
                  url: bundledUrl(mediaAsset(pack, picture.mediaId)) ?? '',
                  effect: picture.effect,
                }}
              />
              <figcaption>{picture.caption}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {question.type !== 'lightning' && question.stages.map((stage, index) => {
        const text = stage.publicText || stage.audio?.description || stage.video?.description
        if (!text) return null
        return (
          <div key={stage.id} className="review-clue">
            <p className="eyebrow">{stage.label || `Clue ${index + 1}`} · {stage.points} pts</p>
            <p>{text}</p>
          </div>
        )
      })}
      {question.type === 'lightning' && (
        <div className="review-clue">
          <p className="eyebrow">Every prompt in this round</p>
          <p className="notes">Say which prompts to change or cut. The room hears one at a time.</p>
          <ol className="book-clues">
            {(question.lightningPrompts ?? []).map((prompt) => (
              <li key={prompt.id}><strong>{prompt.prompt}</strong> — {prompt.answer}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="review-host">
        {question.factTruth !== undefined && <p>{question.factTruth ? 'This statement is a fact.' : 'This statement is a fib.'}</p>}
        {question.pair && (
          <p>
            First: {question.pair.first === 'a' ? question.pair.a : question.pair.b}
            {question.pair.detail ? ` — ${question.pair.detail}` : ''}
          </p>
        )}
        {question.higherLower && (
          <p>
            Shown: {question.higherLower.shown.label} ({question.higherLower.shown.value} {question.higherLower.shown.unit}).
            Hidden: {question.higherLower.hidden.label} is {question.higherLower.hidden.value}.
          </p>
        )}
        {question.timelineItems && (
          <p>Order: {[...question.timelineItems].sort((a, b) => a.order - b.order).map((entry) => entry.label).join(' · ')}</p>
        )}
        {question.matchPairs && question.matchPairs.map((pair) => <p key={pair.id}>{pair.left} → {pair.right}</p>)}
        {question.bonuses && question.bonuses.map((bonus) => (
          <p key={bonus.id}>Bonus ({bonus.points}): {bonus.prompt} — {bonus.answer}</p>
        ))}
        {question.hostNotes && <p>{question.hostNotes}</p>}
      </div>
    </>
  )
}

function buildQueue(pack: Pack): QueueItem[] {
  const listed = new Set<string>()
  const items: QueueItem[] = []
  for (const round of pack.rounds) {
    const questions = round.questionIds
      .map((id) => challengeById(pack, id))
      .filter((question): question is Challenge => Boolean(question))
    questions.forEach((question, index) => {
      listed.add(question.id)
      items.push({
        roundTitle: round.enabled ? round.title : `${round.title} (hidden)`,
        roundId: round.id,
        indexInRound: index + 1,
        roundSize: questions.length,
        question,
      })
    })
  }
  const extras = pack.challenges.filter((question) => !listed.has(question.id))
  extras.forEach((question, index) => {
    items.push({
      roundTitle: 'Not in a round',
      roundId: '',
      indexInRound: index + 1,
      roundSize: extras.length,
      question,
    })
  })
  return items
}

function matches(item: QueueItem, marks: Record<string, ReviewMark>, filter: Filter) {
  const verdict = marks[item.question.id]?.verdict
  if (filter === 'all') return true
  if (filter === 'open') return !verdict
  return verdict === filter
}

function countMarks(queue: QueueItem[], marks: Record<string, ReviewMark>) {
  const counts = { open: 0, good: 0, change: 0, cut: 0 }
  for (const item of queue) {
    const verdict = marks[item.question.id]?.verdict
    if (!verdict) counts.open += 1
    else counts[verdict] += 1
  }
  return counts
}

function pointsLine(question: Challenge) {
  if (question.scoring.mode === 'wager') return 'Players wager'
  if (question.scoring.mode === 'decreasing' && question.stages.length > 1) {
    return `${question.stages.map((stage) => stage.points).join(' → ')} points`
  }
  return `${question.scoring.basePoints} points`
}

function emptyTitle(filter: Filter) {
  if (filter === 'open') return 'Every question has a mark'
  if (filter === 'change') return 'No changes waiting'
  if (filter === 'cut') return 'Nothing is marked to cut'
  if (filter === 'good') return 'Nothing is marked good enough yet'
  return 'This pack has no questions'
}

function emptyCopy(filter: Filter, counts: { open: number; change: number; cut: number; good: number }) {
  if (filter === 'open') {
    return `${counts.good} good enough, ${counts.change} need a change, ${counts.cut} cut. Copy the notes and paste them in the chat to apply them.`
  }
  return 'Switch piles, or go back to the ones still open.'
}

function formatReview(queue: QueueItem[], marks: Record<string, ReviewMark>) {
  const lines = ['Spooknight question review', '']
  const groups: Verdict[] = ['change', 'cut', 'good']
  let any = false
  for (const verdict of groups) {
    const items = queue.filter((item) => marks[item.question.id]?.verdict === verdict)
    if (items.length === 0) continue
    any = true
    lines.push(`## ${VERDICT_LABEL[verdict]} (${items.length})`)
    for (const item of items) {
      const note = marks[item.question.id]?.note
      lines.push(`- ${item.question.title} (${item.question.id}) — ${item.roundTitle}`)
      if (note) lines.push(`  ${note}`)
    }
    lines.push('')
  }
  if (!any) lines.push('No marks yet.')
  return lines.join('\n').trim()
}

function loadMarks(): Record<string, ReviewMark> {
  try {
    const raw = localStorage.getItem(MARKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ReviewMark>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
