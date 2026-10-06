# Spooknight

A Halloween party game for a host laptop and a second Chrome window on the TV.

The host runs the night from the control dashboard. Players watch the audience display. The two windows stay in sync with a `BroadcastChannel`, so both need to be open in Chrome on the same computer. Send the audience window to the TV over HDMI and press F there for fullscreen.

Play it at [https://ccavins.github.io/Halloween_game/](https://ccavins.github.io/Halloween_game/).

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/Halloween_game/#/host`.

## How to host a night

1. Open the host page.
2. Press **Open Audience Display** and move that window to the TV.
3. Click the audience window and press **F** for fullscreen.
4. Name the teams, pick a theme, and turn on **Family mode** if kids are playing.
5. Press **Start game**.
6. Use **Reveal question**, **Reveal next clue**, and the team **Correct** buttons.
7. Press **Show Scores** whenever the room should look at the standings. **Back to Game** returns the TV to the same question.

### Shortcuts

Space reveals the next clue. T starts or pauses the timer. C marks the active team correct. X marks them incorrect. A reveals the answer. N goes to the next question. S toggles the scoreboard on the TV. R replays the current clip. Keys 1 through 9 select a team.

## What is included

The sample pack, Spooknight, demonstrates poster reveals, blur, pixelation, silhouettes, door and flashlight masks, zoomed objects, audio motifs, quotes, emoji, timelines, monster matching, fact-or-fright, higher-or-lower, lightning, and a wagered final. Artwork and melodies in the pack are original. Famous titles appear only as text questions. Bring your own posters, songs, and clips if you have the right to play them. The game does not load those files from other websites.

Family mode hides questions marked teen or mature.

## Your own questions

Use **create** in the host dashboard to add a question, clues, answers, and point drops. Use **media** to upload files. Each asset can store a generation prompt and a license note. **Export pack** downloads a zip with `pack.json` and a `media` folder. **Import pack** loads that zip back into this browser. Uploads stay in this browser’s storage.

**random** builds a mixed game from the library for a length of time you choose.

## Themes

Cinematic Haunted House, Retro Horror / VHS, Classic Halloween, Neon Monster Arcade, Family Halloween, and Gothic Mansion. Reduced motion turns off the decorative animation.
