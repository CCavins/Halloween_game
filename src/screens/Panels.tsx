import { useEffect, useState } from 'react'
import { CATEGORIES, type Challenge, type ChallengeType, type ImageKind } from '../engine/types'
import { uid } from '../engine/logic'
import { exportPack, importPackFile } from '../content/packFile'
import { hydrateMediaLibrary, idbDelete, idbPut } from '../media/library'
import {
  addQuestionToRound,
  applyRandomizer,
  blankChallenge,
  deleteChallenge,
  listSaveSlots,
  newGame,
  removeMedia,
  replacePack,
  resetGame,
  resumeGame,
  saveGame,
  upsertChallenge,
  upsertMedia,
  useGame,
} from '../state/store'

export function CreatorPanel() {
  const state = useGame()
  const [id, setId] = useState(state.questionId)
  const current = state.pack.challenges.find((item) => item.id === id) ?? state.pack.challenges[0]
  const [draft, setDraft] = useState<Challenge | undefined>(current)
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    const next = state.pack.challenges.find((item) => item.id === id)
    if (next) setDraft(next)
  }, [id, state.pack.challenges])

  if (!draft) return null
  const stage = draft.stages[stageIndex]

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>Game creator</h2>
        <label>
          Edit
          <select value={draft.id} onChange={(event) => setId(event.target.value)}>
            {state.pack.challenges.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
        <label>
          New type
          <select
            value=""
            onChange={(event) => {
              if (!event.target.value) return
              const created = blankChallenge(event.target.value as ChallengeType)
              upsertChallenge(created)
              addQuestionToRound(state.roundId, created.id)
              setId(created.id)
            }}
          >
            <option value="">Create…</option>
            {['image-stage', 'audio-stage', 'text-stage', 'video-stage', 'fact-or-fright', 'which-came-first', 'higher-lower', 'timeline', 'monster-match', 'lightning'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="editor-grid">
        <div className="form-stack">
          <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Instructions<textarea value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></label>
          <label>Answer<input value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} /></label>
          <label>Alternate answers<input value={draft.alternateAnswers.join(' | ')} onChange={(event) => setDraft({ ...draft, alternateAnswers: event.target.value.split('|').map((item) => item.trim()).filter(Boolean) })} /></label>
          <label>Host notes<textarea value={draft.hostNotes} onChange={(event) => setDraft({ ...draft, hostNotes: event.target.value })} /></label>
          <div className="split">
            <label>Category
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value, tags: Array.from(new Set([event.target.value, ...draft.tags])) })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>Difficulty
              <select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Challenge['difficulty'] })}>
                {['easy', 'medium', 'hard', 'expert'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Audience
              <select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value as Challenge['audience'] })}>
                {['family', 'teen', 'mature'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label>Choices, one per line<textarea value={(draft.choices ?? []).join('\n')} onChange={(event) => setDraft({ ...draft, choices: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label>
          <label>Tags<input value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
          <div className="split">
            <label>Base points<input type="number" value={draft.scoring.basePoints} onChange={(event) => setDraft({ ...draft, scoring: { ...draft.scoring, basePoints: Number(event.target.value) } })} /></label>
            <label>Penalty<input type="number" value={draft.scoring.penalty ?? 0} onChange={(event) => setDraft({ ...draft, scoring: { ...draft.scoring, penalty: Number(event.target.value) } })} /></label>
            <label>Timer seconds<input type="number" value={draft.timerSec ?? 30} onChange={(event) => setDraft({ ...draft, timerSec: Number(event.target.value) })} /></label>
          </div>
          <h3>Clues</h3>
          {draft.stages.map((item, index) => (
            <button type="button" key={item.id} className={index === stageIndex ? 'active' : ''} onClick={() => setStageIndex(index)}>
              {item.label} · {item.points} pts
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDraft({ ...draft, stages: [...draft.stages, { id: uid('stage'), label: `Clue ${draft.stages.length + 1}`, points: 20, publicText: '' }] })}
          >
            Add clue
          </button>
          {stage && (
            <div className="stage-editor">
              <label>Label<input value={stage.label} onChange={(event) => updateStage(draft, stageIndex, { label: event.target.value }, setDraft)} /></label>
              <label>Points at this clue<input type="number" value={stage.points} onChange={(event) => updateStage(draft, stageIndex, { points: Number(event.target.value) }, setDraft)} /></label>
              <label>Public text<textarea value={stage.publicText ?? ''} onChange={(event) => updateStage(draft, stageIndex, { publicText: event.target.value }, setDraft)} /></label>
              <label>Image id<input value={stage.image?.mediaId ?? ''} onChange={(event) => updateStage(draft, stageIndex, { image: event.target.value ? { mediaId: event.target.value, effect: stage.image?.effect ?? { kind: 'none' } } : undefined }, setDraft)} /></label>
              <label>Effect
                <select
                  value={stage.image?.effect.kind ?? 'none'}
                  onChange={(event) => {
                    const kind = event.target.value as ImageKind
                    updateStage(draft, stageIndex, {
                      image: { mediaId: stage.image?.mediaId ?? '', effect: { ...stage.image?.effect, kind } },
                    }, setDraft)
                  }}
                >
                  {['none', 'crop', 'blur', 'pixelate', 'silhouette', 'zoom', 'mask', 'brightness'].map((kind) => <option key={kind}>{kind}</option>)}
                </select>
              </label>
              <label>Blur / pixel / zoom<input type="number" value={stage.image?.effect.blur ?? stage.image?.effect.pixelSize ?? stage.image?.effect.zoom ?? 0} onChange={(event) => {
                const value = Number(event.target.value)
                const kind = stage.image?.effect.kind
                const effect = { ...stage.image?.effect, kind: kind ?? 'blur', blur: kind === 'blur' ? value : stage.image?.effect.blur, pixelSize: kind === 'pixelate' ? value : stage.image?.effect.pixelSize, zoom: kind === 'zoom' ? value : stage.image?.effect.zoom }
                updateStage(draft, stageIndex, { image: { mediaId: stage.image?.mediaId ?? '', effect } }, setDraft)
              }} /></label>
              <label>Audio or motif id<input value={stage.audio?.mediaId ?? ''} placeholder="motif:howl" onChange={(event) => updateStage(draft, stageIndex, { audio: event.target.value ? { mediaId: event.target.value, start: stage.audio?.start ?? 0, end: stage.audio?.end ?? 2, description: stage.audio?.description ?? '' } : undefined }, setDraft)} /></label>
              <label>Clip end (seconds)<input type="number" step="0.1" value={stage.audio?.end ?? stage.video?.end ?? 0} onChange={(event) => {
                const end = Number(event.target.value)
                if (stage.audio) updateStage(draft, stageIndex, { audio: { ...stage.audio, end } }, setDraft)
                if (stage.video) updateStage(draft, stageIndex, { video: { ...stage.video, end } }, setDraft)
              }} /></label>
              <label>What the host hears<textarea value={stage.audio?.description ?? stage.video?.description ?? ''} onChange={(event) => {
                if (stage.audio) updateStage(draft, stageIndex, { audio: { ...stage.audio, description: event.target.value } }, setDraft)
                else updateStage(draft, stageIndex, { video: { mediaId: stage.video?.mediaId ?? 'story:porch', start: 0, end: stage.video?.end ?? 1, description: event.target.value } }, setDraft)
              }} /></label>
            </div>
          )}
          <div className="row">
            <button type="button" className="primary" onClick={() => upsertChallenge(draft)}>Save question</button>
            <button type="button" onClick={() => addQuestionToRound(state.roundId, draft.id)}>Add to current round</button>
            <button type="button" className="danger" onClick={() => { if (confirm('Delete this question?')) { deleteChallenge(draft.id); setId(state.pack.challenges[0]?.id ?? '') } }}>Delete</button>
          </div>
        </div>
        <aside className="preview-pane">
          <p className="eyebrow">Audience preview · clue {stageIndex + 1}</p>
          <p>{stage?.publicText}</p>
          {stage?.image && <p>Image {stage.image.mediaId} · {stage.image.effect.kind}</p>}
          {stage?.audio && <p>Audio {stage.audio.mediaId} through {stage.audio.end}s. {stage.audio.description}</p>}
          <p className="detail">Answer stays on this laptop: {draft.answer}</p>
        </aside>
      </div>
    </div>
  )
}

function updateStage(draft: Challenge, index: number, patch: Partial<Challenge['stages'][number]>, setDraft: (challenge: Challenge) => void) {
  const stages = draft.stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage))
  setDraft({ ...draft, stages })
}

export function MediaPanel() {
  const state = useGame()
  const [message, setMessage] = useState('')
  return (
    <div className="panel">
      <header className="panel-head">
        <h2>Media library</h2>
        <label className="file-button">
          Upload
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const id = uid('media')
              const asset = {
                id,
                title: file.name,
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                source: 'operator-upload',
                licenseNotes: 'Uploaded by the host. Confirm you have the right to play this.',
                generationPrompt: '',
                bundledPath: undefined,
              }
              await idbPut({ ...asset, blob: file })
              await hydrateMediaLibrary()
              upsertMedia(asset)
            }}
          />
        </label>
        <button type="button" onClick={() => void exportPack(state.pack)}>Export pack</button>
        <label className="file-button">
          Import pack
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                replacePack(await importPackFile(file))
                setMessage('Pack imported.')
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Import failed')
              }
            }}
          />
        </label>
      </header>
      {message && <p>{message}</p>}
      <ul className="media-list">
        {state.pack.media.map((asset) => (
          <li key={asset.id}>
            <strong>{asset.title}</strong>
            <span>{asset.id} · {asset.contentType}</span>
            <label>License notes<input value={asset.licenseNotes ?? ''} onChange={(event) => upsertMedia({ ...asset, licenseNotes: event.target.value })} /></label>
            <label>Generation prompt<textarea value={asset.generationPrompt ?? ''} onChange={(event) => upsertMedia({ ...asset, generationPrompt: event.target.value })} /></label>
            <button type="button" onClick={() => { void idbDelete(asset.id); removeMedia(asset.id) }}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RandomPanel() {
  const [minutes, setMinutes] = useState(45)
  const [difficulty, setDifficulty] = useState<'any' | 'easy' | 'medium' | 'hard' | 'expert'>('any')
  const [kids, setKids] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  return (
    <div className="panel">
      <h2>Game night randomizer</h2>
      <p>Builds a mixed night from the library. Similar challenges are not stacked together.</p>
      <label>Minutes<input type="number" min={15} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
      <label>Difficulty ceiling
        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>
          <option value="any">Any</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={kids} onChange={(event) => setKids(event.target.checked)} /> Kids are playing</label>
      <div className="tag-grid">
        {CATEGORIES.map((category) => (
          <label key={category} className="check">
            <input
              type="checkbox"
              checked={categories.includes(category)}
              onChange={(event) => setCategories(event.target.checked ? [...categories, category] : categories.filter((item) => item !== category))}
            />
            {category}
          </label>
        ))}
      </div>
      <button type="button" className="primary" onClick={() => applyRandomizer({ minutes, difficulty, categories, kids })}>Build the night</button>
    </div>
  )
}

export function HistoryPanel() {
  const state = useGame()
  const [name, setName] = useState('Saturday spooknight')
  const [slots, setSlots] = useState(listSaveSlots())
  return (
    <div className="panel">
      <h2>Save and history</h2>
      <div className="row">
        <input value={name} onChange={(event) => setName(event.target.value)} />
        <button type="button" onClick={() => { saveGame(name); setSlots(listSaveSlots()) }}>Save game</button>
        <button type="button" onClick={() => { if (confirm('Start a new game? Scores return to zero. Teams stay.')) newGame() }}>New game</button>
        <button type="button" className="danger" onClick={() => { if (confirm('Reset the whole night, including teams and edits in this browser?')) resetGame() }}>Reset game</button>
      </div>
      <h3>Saved games</h3>
      <ul>
        {slots.map((slot) => (
          <li key={slot.id}>
            {slot.name} · {new Date(slot.at).toLocaleString()}
            <button type="button" onClick={() => resumeGame(slot.id)}>Resume</button>
          </li>
        ))}
      </ul>
      <h3>Past results</h3>
      <ul>
        {state.history.map((entry) => (
          <li key={entry.id}>{new Date(entry.at).toLocaleString()} — {entry.winners.join(', ') || 'No winner'} ({entry.teams.map((team) => `${team.name} ${team.score}`).join(', ')})</li>
        ))}
      </ul>
    </div>
  )
}
