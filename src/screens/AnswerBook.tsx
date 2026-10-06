import { useEffect, useState } from 'react'
import { ClueImage } from '../challenges/StageView'
import { challengeById, mediaAsset } from '../engine/logic'
import type { Challenge, Pack, Round } from '../engine/types'
import { bundledUrl } from '../media/library'
import { displayLastSeen } from '../sync/channel'
import { initHost, resetGame, useGame } from '../state/store'

export function AnswerBook() {
  const state = useGame()
  const [linked, setLinked] = useState(false)
  useEffect(() => initHost(), [])
  useEffect(() => {
    const id = window.setInterval(() => setLinked(Date.now() - displayLastSeen() < 4500), 1000)
    return () => window.clearInterval(id)
  }, [])

  const listed = new Set<string>()
  const rounds = state.pack.rounds.map((round) => {
    const questions = round.questionIds
      .map((id) => challengeById(state.pack, id))
      .filter((question): question is Challenge => Boolean(question))
    questions.forEach((question) => listed.add(question.id))
    return { round, questions }
  })
  const extras = state.pack.challenges.filter((question) => !listed.has(question.id))

  return (
    <div className="host calm book">
      <header className="calm-bar">
        <div>
          <p className="eyebrow">Host only</p>
          <strong className={linked ? 'live' : 'idle'}>{linked ? 'TV still linked' : 'TV window not detected'}</strong>
        </div>
        <a className="text-button" href="#/host">Back to the game</a>
        <button type="button" className="danger" onClick={confirmReset}>Reset game</button>
      </header>
      <h1>Questions and answers</h1>
      <p className="notes">This list stays on the laptop. The television does not change while you read it.</p>
      {rounds.map(({ round, questions }) => (
        <RoundList key={round.id} round={round} questions={questions} pack={state.pack} />
      ))}
      {extras.length > 0 && (
        <section className="book-round">
          <h2>Not in a round</h2>
          {extras.map((question) => <QuestionCard key={question.id} question={question} pack={state.pack} />)}
        </section>
      )}
    </div>
  )
}

function RoundList({ round, questions, pack }: { round: Round; questions: Challenge[]; pack: Pack }) {
  return (
    <section className="book-round">
      <h2>{round.title}{round.enabled ? '' : ' · hidden'}</h2>
      {questions.map((question, index) => (
        <QuestionCard key={question.id} question={question} number={index + 1} pack={pack} />
      ))}
    </section>
  )
}

function QuestionCard({ question, number, pack }: { question: Challenge; number?: number; pack: Pack }) {
  const clues = question.type === 'lightning'
    ? (question.lightningPrompts ?? []).map((prompt) => `${prompt.prompt} — ${prompt.answer}`)
    : question.stages.map((stage) => stage.publicText || stage.audio?.description || stage.video?.description || stage.label).filter(Boolean)
  return (
    <article className="book-card">
      <p className="eyebrow">{number ? `${number}. ` : ''}{question.category} · {question.difficulty} · {question.audience}</p>
      <h3>{question.title}</h3>
      <p className="book-answer">{question.answer || '—'}</p>
      {question.alternateAnswers.length > 0 && <p className="notes">Also: {question.alternateAnswers.join(', ')}</p>}
      {question.factStatement && <p>{question.factStatement}{question.factTruth === undefined ? '' : question.factTruth ? ' — Fact' : ' — Fright'}</p>}
      {question.pair && <p>First: {question.pair.first === 'a' ? question.pair.a : question.pair.b}</p>}
      {question.higherLower && <p>{question.higherLower.shown.label} is {question.higherLower.shown.value}. {question.higherLower.hidden.label} is {question.higherLower.hidden.value}.</p>}
      {question.matchPairs && question.matchPairs.map((pair) => <p key={pair.id}>{pair.left} → {pair.right}</p>)}
      {question.timelineItems && <p>{[...question.timelineItems].sort((a, b) => a.order - b.order).map((item) => item.label).join(' · ')}</p>}
      {question.stages.some((stage) => stage.image) && (
        <div className="book-thumbs">
          {question.stages.filter((stage) => stage.image).map((stage) => (
            <figure key={stage.id}>
              <ClueImage
                image={{
                  mediaId: stage.image!.mediaId,
                  url: bundledUrl(mediaAsset(pack, stage.image!.mediaId)) ?? '',
                  effect: stage.image!.effect,
                }}
              />
              <figcaption>{stage.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {clues.length > 0 && (
        <ol className="book-clues">
          {clues.map((clue, index) => <li key={`${question.id}-${index}`}>{clue}</li>)}
        </ol>
      )}
    </article>
  )
}

function confirmReset() {
  if (confirm('Reset the game? Scores and teams go back to the start, and question edits in this browser are cleared.')) resetGame()
}
