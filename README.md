# projeto-instagram

An AI-driven pipeline that turns an Instagram creator's Reels into a **communication profile**: a prescriptive, self-contained Markdown guide to that creator's voice. You can later hand the profile to an AI together with any piece of copy and have it rewritten in the creator's style.

The project is built with [Claude Code](https://claude.com/claude-code): three **MCP servers** (Node.js) collect and prepare the data, and a set of **Skills** analyse it.

## How it works

```
@account ──► instagram-videos ──► lista.csv (all videos, views, likes)
                                     │
                                     ▼
             instagram-top-videos-download ──► 1_<shortcode>.mp4 … N_<shortcode>.mp4  (most liked first)
                                     │
                                     ▼
                     video-transcricao ──► 1_<shortcode>.txt … (spoken text only)
                                     │
                                     ▼
   ig-analise-ganchos · ig-analise-retencao · ig-analise-storytelling · ig-analise-vocabulario
                       (all read ig-contexto as their lens)
                                     │
                                     ▼
                ig-perfil-comunicacao ──► perfil-<creator>.md
```

1. **Collect.** List every public video of the account with its basic metrics.
2. **Select and download.** Rank the videos by likes and download the top N.
3. **Transcribe.** Extract the audio and transcribe it with the OpenAI API.
4. **Analyse.** Run one Skill per dimension: hooks, retention, storytelling, vocabulary.
5. **Synthesise.** Merge the analyses into a single communication profile.

## Project structure

```
.
├── .mcp.json                  # MCP servers registered for Claude Code
├── .claude/skills/            # analysis Skills (see below)
├── .spec/<perfil-…>/spec.md   # per-creator task checklist + execution log
├── prompts/                   # the prompts used to generate each part of the project
└── resources/
    ├── docs/                  # Excalidraw diagrams (overview, MCP)
    ├── mcps/                  # the MCP servers (Node.js)
    ├── templates/             # perfil-influenciador.md, the spec template for a new creator
    └── videos/<account>/      # all data for one account (CSV, .mp4, .txt, analyses)
```

## MCP servers

All three are Node.js (ES modules) stdio servers using `@modelcontextprotocol/sdk` and `zod`. Each lives in `resources/mcps/<name>` and has its own README.

| MCP | Tools | What it does |
|-----|-------|--------------|
| `instagram-videos` | `fetch_account_videos` (`username`, `maxPages?`) | Uses Instagram's public web API, **without login**, to list all of an account's videos with views, likes, comments, duration and caption. Goes through as many pages as possible. Saves `resources/videos/<account>/lista.csv`, newest first. Re-runs merge by `shortcode` and update metrics. |
| `instagram-top-videos-download` | `download_top_videos` (`csvPath`, `count`) | Reads a `lista.csv`, sorts it by **likes only** and resolves each `shortcode`'s `.mp4` URL through the public GraphQL endpoint. Streams the videos to the CSV's folder as `<rank>_<shortcode>.mp4`. |
| `video-transcricao` | `transcrever_video` (`videoPath`, `force?`), `transcrever_pasta` (`folderPath`, `force?`, `recursive?`) | Extracts speech-optimised audio with a portable ffmpeg (nothing to install) and transcribes it with the OpenAI API. Files over 25 MB are split automatically. Writes a clean `.txt` next to each video and skips videos already transcribed unless `force` is set. |

All three are fault-tolerant: an access or download error on one page or video is recorded and skipped, and whatever was obtained is kept.

## Skills

Located in `.claude/skills/`. Each analysis Skill accepts pasted text **or** a folder of transcriptions. It looks for the creator's *recurring patterns* across all videos and anchors its findings in literal quotes.

| Skill | Purpose |
|-------|---------|
| `ig-contexto` | The base lens: how Reels actually work (hooks, retention, lo-fi tone, comment triggers, loops, Brazilian internet culture). It analyses nothing alone; every other Skill reads it first. |
| `ig-analise-ganchos` | The first seconds: hook types, why they stop the scroll, repeated opening patterns. |
| `ig-analise-retencao` | What keeps people watching: pattern interrupts, curiosity gaps, mid-video re-hooks, engagement triggers, closing loop/CTA. |
| `ig-analise-storytelling` | Narrative construction: story arc, characters and concrete examples, open loops and payoffs, argument structure, emotional beats. |
| `ig-analise-vocabulario` | How the creator talks: slang, catchphrases, forms of address, sentence complexity, profanity, cultural references. |
| `ig-perfil-comunicacao` | Synthesis: merges the four analyses (or runs them from raw transcriptions) into a prescriptive profile with voice principles, examples bank, an "avoid" list and a step-by-step "how to apply to a copy" checklist. |

## Setup

Requirements: **Node.js 18+** and Claude Code.

1. Install each MCP's dependencies:

   ```bash
   cd resources/mcps/instagram-videos && npm install
   ```
   ```bash
   cd resources/mcps/instagram-top-videos-download && npm install
   ```
   ```bash
   cd resources/mcps/video-transcricao && npm install
   ```

2. Create a `.env` file in the project root with your OpenAI key (used only by `video-transcricao`; see `resources/mcps/video-transcricao/.example.env`):

   ```
   OPENAI_API_KEY=sk-...
   # optional, default whisper-1
   # OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
   ```

3. Register the servers in `.mcp.json` so Claude Code loads them:

   ```json
   {
     "mcpServers": {
       "instagram-videos": { "command": "node", "args": ["resources/mcps/instagram-videos/index.js"] },
       "instagram-top-videos-download": { "command": "node", "args": ["resources/mcps/instagram-top-videos-download/index.js"] },
       "video-transcricao": { "command": "node", "args": ["resources/mcps/video-transcricao/index.js"] }
     }
   }
   ```

Optional environment variables: `OUTPUT_DIR` (where `instagram-videos` writes; default `resources/videos`) and `IG_POSTS_DOC_ID` (overrides the GraphQL `doc_id` used for listing posts).

## Generating a profile for a new creator

1. Copy `resources/templates/perfil-influenciador.md` to `.spec/perfil-<slug>/spec.md` and replace `{{NOME}}`, `{{CONTA}}` and `{{SLUG}}`.
2. Ask Claude Code to execute the spec. It runs the three MCPs, then the four analysis Skills inside `resources/videos/<account>/`, then `ig-perfil-comunicacao`. It ticks the checklist and appends to the spec's execution log as it goes.
3. The output ends up in `resources/videos/<account>/`:

   ```
   lista.csv                     # all videos and metrics
   1_<shortcode>.mp4 / .txt …    # top videos and their transcriptions
   ig-analise-ganchos.md
   ig-analise-retencao.md
   ig-analise-storytelling.md
   ig-analise-vocabulario.md
   perfil-<slug>.md              # the final communication profile
   ```

`.spec/perfil-michamenezes/spec.md` is a fully executed example; `.spec/perfil-hanah/spec.md` is in progress.

## Limitations

- **Instagram rate limits anonymous access.** Both Instagram MCPs often get `401 "Please wait a few minutes"` (`require_login`) after a few requests from the same IP. Nothing breaks: the run saves what it got, and running it again later fills the gaps. The `michamenezes` log shows 5 failed attempts followed by a full successful run hours later.
- **Instagram's internal endpoints and `doc_id`s change without notice**, so the Instagram MCPs may need updating from time to time.
- Transcription uses the paid OpenAI API.
- `.mp4` files are large; keep them out of version control.
