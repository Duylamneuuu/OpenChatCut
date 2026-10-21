<p align="center">
  <img src="public/openchatcut-icon.png" width="96" alt="OpenChatCut" />
</p>

<h1 align="center">OpenChatCut</h1>

<p align="center">
  <a href="README_ZH.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>Open-source ChatCut alternative · agent-native · local-first AI video editor</strong>
</p>

<p align="center">
  Let Codex, Claude Code, and the built-in agent read, edit, and export real video projects that remain fully editable.
  Website: <a href="https://openchatcut.com">openchatcut.com</a>
</p>

<p align="center">
  <a href="#what-is-openchatcut">Introduction</a> ·
  <a href="#product-tour">Product Tour</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#using-openchatcut-with-codex--claude-code">Agent / MCP</a> ·
  <a href="#community">Community</a> ·
  <a href="#sponsors">Sponsors</a> ·
  <a href="#changelog">Changelog</a> ·
  <a href="#star-growth">Star Growth</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/0xsline/OpenChatCut"><img alt="GitHub Repository" src="https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github" /></a>
  <a href="https://discord.gg/bSGUAeWYkh"><img alt="Discord Community" src="https://img.shields.io/badge/Discord-Join_Community-5865F2?style=flat&logo=discord&logoColor=white" /></a>
  <img alt="Status" src="https://img.shields.io/badge/status-active_development-FF8A3D?style=flat" />
  <img alt="Local First" src="https://img.shields.io/badge/data-local_first-111827?style=flat" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white" />
  <img alt="Remotion" src="https://img.shields.io/badge/Remotion-4-0B84F3?style=flat" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-43-47848F?style=flat&logo=electron&logoColor=white" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-Agent_native-7C3AED?style=flat" />
  <a href="https://atomgit.com/Oxsline/openchatcut"><img alt="AtomGit G-Star" src="https://img.shields.io/badge/AtomGit-G--Star-DA203E?logo=gitcode&logoColor=white" /></a>
</p>

<p align="center">
  <a href="https://linux.do" alt="LINUX DO"><img src="https://shorturl.at/ggSqS" /></a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/openchatcut?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-openchatcut" target="_blank" rel="noopener noreferrer"><img alt="OpenChatCut - Open-source AI agent video editor with a real timeline | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1201995&amp;theme=light&amp;t=1784645557617" /></a>
</p>

<p align="center">
  <img src="assets/readme-pic/01-editor-overview.png" alt="OpenChatCut editor overview with the agent workspace, media pool, preview, and multitrack timeline" />
</p>

<p align="center">
  <sub>From a single instruction to a real timeline: agents, media, previews, motion graphics, transitions, effects, and multitrack audio all work together in one project.</sub>
</p>

---
## Sponsors

<p align="center">
  <a href="https://ofox.ai/?utm_source=github&utm_medium=sponsorship&utm_content=openchatcut"><img src="assets/readme-pic/ofox-logo.svg" width="300" alt="OfoxAI" /></a>
</p>

**OfoxAI: Text, image, and video AI in one platform**

OfoxAI is a unified API platform for text, image, and video AI, with video models from the Seedance, MiniMax (Hailuo), and Wan families. Choose models for AI applications, agents, creative ideation, image generation, and video assets through one platform.
[Explore OfoxAI models and APIs →](https://ofox.ai/?utm_source=github&utm_medium=sponsorship&utm_content=openchatcut)

<br />

If OpenChatCut helps you, you can support its continued development on Ko-fi or Afdian.

<p align="center">
  <a href="https://ko-fi.com/Y5N2241IP5">
    <img alt="Support me on Ko-fi" src="https://img.shields.io/badge/Support_me_on-Ko--fi-72a4f2?logo=kofi&amp;logoColor=white" />
  </a>
  <a href="https://www.ifdian.net/a/sline?utm_source=copylink&amp;utm_medium=link">
    <img alt="Support OpenChatCut on Afdian" src="https://img.shields.io/badge/Support_on-Afdian-946CE6" />
  </a>
</p>

---

## What is OpenChatCut?

OpenChatCut is an **open-source ChatCut alternative**: a video editor that brings **conversational agents** and **professional timeline editing** into the same workspace. It is independent open source (AGPL), not affiliated with the commercial ChatCut product.

**OpenChatCut = local video projects + multitrack timeline + AI agents + MCP + production-ready exports.**

It does not merely generate a video that can no longer be changed. Every edit is written to real tracks, clips, transitions, captions, effects, and media inside the project. You can continue editing manually, undo or redo changes, save versions, or hand the project to another agent.

OpenChatCut is built for creators and developers who want AI to participate in the actual editing workflow without giving up professional control, rather than starting over from an empty chat box or an immutable generated result.

- Website: [https://openchatcut.com](https://openchatcut.com)
- Open-source ChatCut alternative guide: [https://openchatcut.com/blog/open-source-chatcut-alternative](https://openchatcut.com/blog/open-source-chatcut-alternative)
- ChatCut vs OpenChatCut: [https://openchatcut.com/blog/chatcut-vs-openchatcut](https://openchatcut.com/blog/chatcut-vs-openchatcut)

- 🤖 **Agent-native**: the built-in agent and external MCP agents share the same editing tools.
- 🎞️ **Real timeline**: multiple video and audio tracks, transitions, effects, LUTs, zooms, and keyframes.
- 📝 **Transcript-driven editing**: word-level transcription, text-based cuts, pause handling, speakers, and linked captions.
- ✨ **Generation and media**: images, video, speech, music, sound effects, and online media search.
- 🧩 **Motion Graphics and WebGL**: editable motion templates, custom shaders, visual effects, and transitions.
- 👁️ **Visual geometry**: in-browser person segmentation and face-safe zones — captions avoid the speaker automatically, reframe follows the subject, and overlay graphics land in empty space.
- 📦 **Production-ready exports**: MP4, audio, captions, FCPXML, and complete project data.
- 🖥️ **Local-first**: projects and media stay on your machine by default, while API keys remain server-side.

## Community

Join the OpenChatCut community to discuss workflows, share feedback, and follow development:

- [Join Discord](https://discord.gg/bSGUAeWYkh)
- Scan the QR code below with WeChat.

<p align="center">
  <br />
  <img src="assets/readme-pic/wechat-community.jpg" width="220" alt="OpenChatCut WeChat community QR code" />
</p>

---

## Product Tour

The following screenshots show real OpenChatCut projects and editor states, not static mockups.

<table>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/02-project-dashboard.png" alt="OpenChatCut local project dashboard" /><br />
      <sub><b>Local project management</b> — Create, import, duplicate, export, and continue editing multiple real projects.</sub>
    </td>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/03-agent-transitions.png" alt="An agent generating music and editing transitions on a multitrack timeline" /><br />
      <sub><b>Complete agent-driven editing</b> — Generate music, invoke tools, and write transitions, captions, and multitrack media directly to the timeline.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/04-motion-graphics.png" alt="Agent tool execution history and the Motion Graphics library" /><br />
      <sub><b>Motion Graphics and agents</b> — Browse motion templates or let an agent generate and assemble editable MG clips.</sub>
    </td>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/05-effects.png" alt="OpenChatCut WebGL visual effects library" /><br />
      <sub><b>WebGL visual effects</b> — Apply pixelation, duotone, fisheye, kaleidoscope, softening, light leaks, and more directly to clips.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/06-zoom.png" alt="OpenChatCut camera movement and zoom effects library" /><br />
      <sub><b>Camera movement and zoom</b> — Push, pull, slow zoom, fast zoom, and eased camera effects work directly with the timeline.</sub>
    </td>
    <td width="50%" valign="top" align="center">
      <img src="assets/readme-pic/07-lut.png" alt="Comparing LUT color styles in OpenChatCut using a Tokyo Tower reference image" /><br />
      <sub><b>LUTs and color styles</b> — Compare camera transforms and film looks in real time against a consistent reference frame.</sub>
    </td>
  </tr>
</table>

---

## Why OpenChatCut?

Traditional editors excel at precise control. One-shot AI video generators excel at producing results quickly. OpenChatCut connects both approaches through one continuously editable project:

| Capability | Traditional timeline editor | One-shot AI video generation | **OpenChatCut** |
|---|:---:|:---:|:---:|
| Track- and clip-level precision | ✅ | ❌ | **✅** |
| Modify a project with natural language | ❌ | ✅ | **✅** |
| Inspectable and undoable changes | ✅ | Usually unavailable | **✅** |
| Linked transcript and visuals | Partial | ❌ | **✅** |
| Direct control from Codex / Claude Code | ❌ | ❌ | **✅ MCP** |
| Built-in and external agent collaboration | ❌ | ❌ | **✅ Shared tools** |
| Local projects and BYOK | Product-dependent | Usually cloud-based | **✅** |

The core editing loop:

```text
Describe the goal → Agent reads the project → Produces verifiable edits → Writes to the timeline
                  → Preview / adjust / undo → Captions and mixing → Export
```

---

## Core Capabilities

| Area | Implemented capabilities |
|---|---|
| Timeline | Multitrack editing, move, trim, split, ripple edits, snapping, keyframes, markers, undo, and redo |
| Visuals | WebGL effects, LUTs, chroma key, zoom, transitions, and custom shaders |
| Audio | Multiple audio tracks, sound effects, background music, voice-over recording, loudness, auto-ducking, and vocal isolation |
| Transcript | Transcription jobs, word-level editing, pause compression, search, speakers, and clip views |
| Captions | Automatic captions, named styles, translation, timeline overlays, and SRT export |
| Motion Graphics | Built-in templates, a secure sandbox, custom templates, and video rendering |
| AI generation | Image, video, speech, music, and sound-effect jobs with progress tracking |
| Media | Uploads, folders, online image/video/audio search, and Firecrawl visual-media fallback |
| Export | MP4, audio, captions, FCPXML, project import/export, export history, hardware-aware H.264 acceleration, and resource-aware export queueing |
| Publishing | Agent-driven publishing of finished renders to TikTok, Instagram, YouTube, LinkedIn, Facebook, X, Threads, Pinterest, and Bluesky via Upload-Post, with a preview and explicit confirmation first |
| Agent | Built-in conversational agent, skills, proposal-based edits, and external Streamable HTTP MCP |

---

## Community Resources

The [OpenChatCut resource library](https://openchatcut.com/resources) is a shared catalog for reusable MG animations, sound effects, transitions, visual effects, zooms, and LUTs.

<p align="center">
  <a href="https://openchatcut.com/resources">
    <img src="assets/readme-pic/08-community-resources.en.png" alt="OpenChatCut community resource library" />
  </a>
</p>

### Discover and install

- Hover visual cards to watch the complete result, or play audio resources before downloading.
- Copy a resource's install URL into OpenChatCut's Extension Center, or download its original package.
- Browse the website catalog inside the editor and manage installed extensions locally.

### Contribute a resource

1. Open [Contribute a resource](https://openchatcut.com/resources/submit) and choose its category.
2. Upload the resource and the category-specific preview inputs; the site renders the published preview.
3. Add the creator and license information, then submit it for review and publication.

Installable visual resources use the editor's `openchatcut-plugin@1` format and runtime validation. Official OpenChatCut resources use the MIT license; community contributors select a license during submission, and each published card identifies its creator and license.

---

## Use Cases

- **Talking-head and interview editing**: transcribe audio or video, remove mistakes, pauses, and repetition through text, then generate captions automatically.
- **Fast multiformat assembly**: import video, images, and audio, then let an agent create the rough cut, transitions, soundtrack, and pacing.
- **Short-form and social content**: reframe the canvas and generate titles, captions, voice-over, music, and visual packaging.
- **Motion Graphics**: use built-in templates or ask an agent to create editable motion-graphics clips.
- **Developer automation**: use MCP to let Codex, Claude Code, or another compatible client inspect and modify a real project.

## Workflow

1. Create a project and import local media.
2. Edit manually on the timeline or describe the result you want.
3. The agent reads project context and invokes editing tools.
4. Review the proposal and preview the result, then apply, adjust, or undo it.
5. Finish captions, audio, effects, and color.
6. Export video, audio, captions, FCPXML, or the complete project.

---

## Quick Start

### Desktop installers

Download the latest macOS, Windows, and Linux builds from [GitHub Releases](https://github.com/0xsline/OpenChatCut/releases/latest). The release currently includes DMG installers for Apple Silicon and Intel Macs, an x64 Windows installer, and an x64 Linux AppImage.

These are early builds. The macOS packages are not yet signed or notarized, so the operating system may require manual approval on first launch.

### Run from source

Requires Node.js 24.x and npm. The supported Node.js range is enforced by `package.json`, and `.nvmrc` selects the matching major version for Node version managers.

On Linux x64, `npm install` also downloads ONNX Runtime's optional CUDA provider (several hundred MB from NuGet). For a CPU-only install, run `ONNXRUNTIME_NODE_INSTALL=skip npm install` instead.

```bash
git clone https://github.com/0xsline/OpenChatCut.git
cd OpenChatCut
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:5199
```

The editor needs a browser [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts): open OpenChatCut at `http://localhost` or `http://127.0.0.1` on the machine running it, or serve it over HTTPS. Over plain HTTP from another device (a LAN IP or reverse proxy), browsers disable Web Crypto, WebCodecs, and the clipboard, so the project list still loads but the editor shows this requirement instead of opening.

Only add the model or media-service credentials you actually use to `.env.local`. Features without configured third-party credentials report the missing key explicitly; local timeline editing, built-in media, and other configured capabilities continue to work.

Development launches are isolated per Git checkout/worktree by default. `npm run dev` and
`npm run desktop:dev` keep that checkout's projects, imported media, generation jobs,
credentials, settings, and local authorization state under its own profile in
`~/.openchatcut/dev-profiles/`. Use `npm run dev:shared` only when you intentionally need
the legacy shared development store.

### Built-in Agent authentication

- **API keys:** open **Settings → Agent model**, choose a provider, and save its API key and model. Keys remain server-side.
- **ChatGPT subscription:** install the official Codex CLI 0.146.0 or newer, then open **Settings → Agent model → OpenAI · Codex**. Sign in through the browser or device-code flow, load the account's models, choose a model-specific reasoning effort (or keep its default), and select Codex from the chat model picker. OpenChatCut uses a dedicated Codex profile; the official CLI owns credential storage, token renewal, and logout, while OAuth tokens are never exposed to the browser.
- **Claude subscription:** OpenChatCut does not collect Claude OAuth credentials. Use Claude Code through the local MCP connection below. The built-in Agent can use Anthropic through an API key.

The built-in Agent always runs the model loop on the local server. Chat, drafts, and proposals survive page refreshes and local service restarts. Timeline changes still go through the active editor's validated, undoable commands.

### Agent local-path access (advanced)

Desktop agents can browse any local directory allowed by the operating system by default, including mounted media drives. `browse_local_media` lists folders and supported media, searches by filename or relative path and media type, and returns paginated results without importing. The agent can then use `import_assets` for up to 100 selected paths, `import_asset` for one path, or `import_folder` for a whole folder. Imports reuse media probing and reference registration, preserve source files, and skip duplicate content, including duplicates within one batch. Document files such as TXT, Markdown, DOCX, and PDF should be attached to chat instead. These tools require the desktop app.

To restrict local access, set a comma-separated value such as `AGENT_IMPORT_ROOTS=/Volumes/Media,D:\Projects` in `.env.local`; leave it empty for default unrestricted directory access. Explicit restrictions apply to both browsing and import. Source checkouts read the repository file at startup. Packaged desktop builds read it from Electron's user-data directory: `~/Library/Application Support/OpenChatCut/` on macOS, `%APPDATA%\OpenChatCut\` on Windows, and `$XDG_CONFIG_HOME/OpenChatCut/` (normally `~/.config/OpenChatCut/`) on Linux. Restart after editing the file.


Local H.264 exports automatically prefer VideoToolbox on macOS and NVENC on compatible Windows systems, then fall back to software encoding. Tune render concurrency and the heavy-export limit with `OPENCHATCUT_RENDER_CONCURRENCY` and `OPENCHATCUT_MAX_ACTIVE_EXPORTS`, disable hardware encoding with `OPENCHATCUT_DISABLE_HARDWARE_ENCODING`, or override FFmpeg-side encoder selection with `OPENCHATCUT_H264_ENCODER`; see [`.env.example`](.env.example).

On Apple Silicon, more render workers can slow down video-heavy exports even when VideoToolbox encoding is active. See [macOS render tuning](MACOS-RENDER-TUNING.md) for an M4 Max benchmark and a way to test your own workload. These measurements do not establish a default for other Macs or Windows.

### Desktop development

```bash
npm run desktop:dev
```

The desktop app uses an Electron shell with the same embedded services. The web development build and desktop build share project, agent, generation, and export logic.

### CutPilot Live

CutPilot Live is a demo mode inside the editor: while a clip plays, a decision loop keeps, cuts, trims, or covers each slice, and the timeline updates in place. Open it from the project dashboard (**Open demo**) or from the editor top bar (**CutPilot**). The page is also at `http://localhost:5199/#/cutpilot`.

Rule-only mode is the default. It needs no API key and no GPU. Local and hosted providers are optional OpenAI-compatible endpoints. A decision is sent to the stronger endpoint only when its confidence is below `CUTPILOT_CONFIDENCE_THRESHOLD` (default `0.6`). Keys stay in the server process.

The demo opens on a real interview excerpt: the first 51.3 seconds of **Anne Gaylor, “A Second Look At Religion”** (AndrewFFRF, 1980s interview, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Anne_Gaylor_clip_-_A_Second_Look_At_Religion.webm), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)). The file in the repo is a trim and an H.264 re-encode; the credit is in `public/cutpilot/ATTRIBUTION.txt`. A captioned 60-second stand-in is still in the clip menu. That stand-in is where “keep the jokes” has joke slices to flip. The interview does not contain a joke.

**Sprint 600** replays the selected clip’s slices until 600 decisions have been made, one every 100 ms, so the counter can reach 600 decisions in about a minute. The default live pass follows the preview clock instead, which is the one that shows cuts landing on the picture.

Type or speak a note while a run is in progress (`keep the jokes`, `slower pace`, `add b-roll on the desk shot`). The next slice uses the new note. On Windows, speech input depends on the browser's Web Speech API; typing always works.

#### Windows setup

Install [Node.js 24](https://nodejs.org/) (the range in `package.json` is `>=24 <25`) and git. From PowerShell, in the checkout:

```powershell
npm install
copy .env.example .env.local
npm run dev
```

`npm install` pulls `ffmpeg-static` and `@ffprobe-installer/ffprobe`. If those binaries are blocked, install FFmpeg yourself and point at it:

```powershell
$env:FFMPEG_PATH = "C:\ffmpeg\bin\ffmpeg.exe"
$env:FFPROBE_PATH = "C:\ffmpeg\bin\ffprobe.exe"
```

Then open `http://localhost:5199`, choose **Open demo**, leave the provider on **Rule only**, and press **Run**. No key is required.

Optional local model. Liquid d1-3B is a decision model: one forward pass, no generated tokens, served by a llama.cpp build that knows the `lfm2-d1` architecture (llama.cpp `b11756` / 0.7.0-dev or newer). The Q4_K_M GGUF is the file this repo was measured with.

```powershell
llama-server -m C:\models\d1-3B-Q4_K_M.gguf --port 8080 -np 1
$env:CUTPILOT_LOCAL_BASE_URL = "http://127.0.0.1:8080"
$env:CUTPILOT_LOCAL_MODEL = "LiquidAI/d1-3B-Q4_K_M"
$env:CUTPILOT_LOCAL_PROTOCOL = "systemone"
$env:CUTPILOT_PROVIDER = "local"
```

`CUTPILOT_LOCAL_PROTOCOL=systemone` posts one choice question to `/v1/systemone` (keep, cut, trim, or b-roll, with criteria). A base URL may be an origin (`http://127.0.0.1:8080`) or a prefix that already ends in `/v1`. llama.cpp `b11756` segfaults when one systemone request contains two questions and `--parallel` is left at its default. CutPilot sends a single question so the default server stays up. `-np 1` is the safe flag if you experiment with more than one question. `CUTPILOT_TIMEOUT_MS` raises the per-decision wait (the default is 15 seconds; a cold CPU pass can need longer).

Optional hosted model (OpenRouter, Gemini's OpenAI-compatible endpoint, or any other chat-completions server):

```powershell
$env:CUTPILOT_HOSTED_BASE_URL = "https://openrouter.ai/api/v1"
$env:CUTPILOT_HOSTED_API_KEY = "sk-or-..."
$env:CUTPILOT_HOSTED_MODEL = "google/gemini-2.5-flash"
$env:CUTPILOT_HOSTED_USD_PER_1K = "0.15"
$env:CUTPILOT_PROVIDER = "hosted"
```

Leave `*_USD_PER_1K` empty when you do not know the price. The counter then says the cost is unpriced instead of pretending it is zero. Set `CUTPILOT_ESCALATION_BASE_URL` (and its model, key, and protocol) to enable the confidence handoff. Restart `npm run dev` after changing `.env.local`.

#### Benchmark

The harness runs one labeled clip through each provider you name and prints measured latency and agreement. It does not fill in numbers for a provider that was not called.

```powershell
npm run cutpilot:bench
npm run cutpilot:bench -- --providers rule,local,hosted --steer
npx tsx scripts/cutpilot-benchmark.ts --labels samples/cutpilot/labels.sample.json --transcript samples/cutpilot/transcript.json --video public/cutpilot/sample.mp4
```

`npm run cutpilot:bench` scores the Anne Gaylor excerpt (`samples/cutpilot/talk/`). The stand-in paths above are the scripted joke clip.

`--steer` runs the clip twice and counts joke slices that flip from cut to keep after `keep the jokes, slower pace`. `--sprint` repeats the clip to 600 decisions and does not score labels. `--transcribe` replaces the transcript only when `CUTPILOT_WHISPER_CMD` or `CUTPILOT_WHISPER_MODEL` is set. `--apply-scenes` splits slices on ffmpeg scene cuts; the bundled labels will no longer match, so the script says so and skips the score.

Remote calls are reported as one upstream wait. Unless the endpoint itself separates compute from transport, **model milliseconds stay 0 and network milliseconds are the full round trip**. The rule provider is the opposite: model time is in-process and network time is 0. Executor time is the timeline reducer. Cost per 1,000 decisions is the mean of priced calls; missing prices print `not configured`.

`samples/cutpilot/labels.sample.json` is a tiny format example. It was produced by the rule baseline on `samples/cutpilot/transcript.json` with an empty directive. Agreement against that file restates the rubric. It is not a human-labeled set.

`samples/cutpilot/talk/labels.json` is one editorial pass on the interview transcript, not a multi-rater study. The rubric is in that file’s `about` field: cut the silence slices, keep the spoken argument (including the line longer than 7 seconds and the ASR substitutions), no trim, no b-roll. The words are whisper.cpp `base.en` with subword pieces joined. The stdout of the measured run is `samples/cutpilot/talk/benchmark-log.txt`.

#### Measured benchmark (2026-10-20)

Machine: Linux x86_64, 4 threads, no GPU. Local server: llama.cpp 0.7.0-dev build 11756, `llama-server -m d1-3B-Q4_K_M.gguf -c 2048 -t 4 -ngl 0 -np 1`, protocol `systemone`. Command: `npm run cutpilot:bench -- --providers rule,local,hosted --steer`. Hosted was not called. No OpenRouter, Gemini, Google, OpenAI, Groq, or Hugging Face key was set in the environment.

| Provider | Agreement | Macro F1 | Cut F1 | Chain-20 | Latency p50 / p95 / p99 (ms) | Model p50 / p95 / p99 | Network p50 / p95 / p99 | Executor p50 / p95 / p99 | USD / 1000 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| rule | 0.950 | 0.656 | 1.000 | 0.000 | 0.02 / 0.97 / 1.40 | 0.01 / 0.20 / 0.41 | 0.00 / 0.00 / 0.00 | 0.01 / 0.77 / 0.99 | 0.000000 |
| local, Liquid d1-3B Q4_K_M | 0.200 | 0.190 | 0.571 | 0.000 | 905.56 / 1044.97 / 1056.91 | 0.00 / 0.00 / 0.00 | 905.48 / 1044.89 / 1056.79 | 0.10 / 0.15 / 0.38 | not configured |
| hosted | skipped | | | | | | | | |

The rule row’s dollar figure is the in-process price of 0. The local row is unpriced: no `CUTPILOT_LOCAL_USD_PER_1K` was set, and the endpoint does not split compute from transport, so model milliseconds stay 0 and network milliseconds are the full round trip. Wall time for the 20 local decisions was 18331 ms.

The rule pass matched 19 of 20 labels. The miss is `s001`, which the rubric keeps and the rule trims because the slice is longer than 7 seconds. That single trim is why macro F1 is 0.656 (the trim class scores 0) and why chain-20 is 0 (the only 20-decision window contains the miss). Cut F1 is 1.000. Steerability was `0/0`: the interview has no joke slice, so “keep the jokes” had nothing to flip.

A second pass of the same server, same prompt, printed the local actions. They were 8 trim and 12 cut, and 0 keep. The 4 matches are the silence slices. The 16 speech misses had confidence from 0.11 to 0.57, under the 0.6 escalation threshold. No hosted endpoint was configured, so those low-confidence answers were not handed off.

#### Launch film

`promo/` is a Remotion composition, “CutPilot Live”, 30 seconds at 30 fps. `IntroducingCutPilot` is 1920×1080. `IntroducingCutPilotSquare` is the 1080×1080 cut of the same scenes. Frame timings live in `promo/timeline.ts`. The storyboard is `promo/storyboard.json`. It uses the repo’s existing `remotion`, `@remotion/bundler`, `@remotion/renderer`, and `@remotion/media` packages (there is no separate Remotion CLI dependency).

```powershell
npm run cutpilot:promo
node scripts/render-cutpilot-promo.mjs --stills 40,130,280,450,570,860
node scripts/render-cutpilot-promo.mjs --music
```

The picture is a light stage (`#FAFAFA`, deep lime `#4D7C0F`). Frames 720–779 are a pure white hold and are silent. The voiceover is Kokoro-82M (`af_heart`), committed at `public/cutpilot/promo-vo.wav`. Regenerate it with `npm run cutpilot:vo` after editing `promo/voiceover.txt`. Under it: four quiet synthesized ticks and a quiet original sine bed. `--music` lifts the bed. The bed and the ticks drop out for the white hold. On-screen lines stay, so the film still reads muted. Numbers on screen are the rule baseline and the measured rule latency in `samples/cutpilot/talk/benchmark-log.txt` (p50 0.02 ms, p99 1.40 ms). The silence chip is the interview’s 700 ms gap. The “um” and the two jokes are the captioned stand-in. “~10 decisions / second” is the sprint pace, not a measured model throughput.

That writes `/opt/cursor/artifacts/cutpilot-promo.mp4`, `/opt/cursor/artifacts/cutpilot-promo-square.mp4`, and a poster still at frame 860. Override the paths with `CUTPILOT_PROMO_OUT`, `CUTPILOT_PROMO_SQUARE`, and `CUTPILOT_PROMO_POSTER`. Chrome is `CC_BROWSER_EXECUTABLE`, or `/opt/google/chrome/chrome` when that binary is present. `--stills` writes preview frames under `/tmp/cutpilot-dl`.

```json
{
  "version": 1,
  "clipId": "my-clip",
  "fps": 30,
  "directive": "",
  "about": "One row per segment id from the transcript segmenter.",
  "labels": [
    { "segmentId": "s000", "action": "keep", "text": "Welcome back." },
    { "segmentId": "s002", "action": "cut", "text": "(silence)" }
  ]
}
```

`text` is optional and ignored by the scorer. Actions are `keep`, `cut`, `trim`, or `broll`. Segment ids come from the same segmenter the demo uses (silence gaps, sentence breaks, and a maximum slice length).

Regenerate the stand-in video, transcript, and rubric file with `npm run cutpilot:sample`. That command shells out to ffmpeg.

---

## Project Status

OpenChatCut is under active development. The editor, project format, and agent tools will continue to evolve. Prebuilt macOS, Windows, and Linux installers are published on [GitHub Releases](https://github.com/0xsline/OpenChatCut/releases); running from source remains the most transparent option for development and troubleshooting.

The core timeline, local projects, built-in media, and manual editing do not depend on cloud services. Connected features such as AI models, online media, generation, and transcription are enabled only after you configure the corresponding services.

---

## Using OpenChatCut with Codex / Claude Code

Install the single OpenChatCut Agent Skill:

```bash
npx skills add 0xsline/OpenChatCut
```

Then tell the agent `Set up OpenChatCut`. The installed router registers the
local MCP connection and loads the editor's 26 specialized skills on demand,
so the agent's skill list stays compact.

Custom skills live in a user-visible directory with the same layout as
`~/.codex/skills` / `~/.claude/skills`:

```text
~/.openchatcut/skills/<slug>/SKILL.md     (Windows: %USERPROFILE%\.openchatcut\skills\...)
```

Ask the agent to `manage_skill create` (or use the bundled *skill-creator*
workflow) and it writes the SKILL.md there — editable and shareable by hand.
Dropping a SKILL.md into that directory makes it available to the agent, and
selecting a workflow from the chat's `/` command or the creative-mode picker
activates it for the next message.

OpenChatCut exposes a Streamable HTTP MCP endpoint:

```text
http://localhost:5199/api/external-mcp/mcp
```

The repository's root `.mcp.json` already contains the local connection. Before using timeline tools, run OpenChatCut and open the target project. Project listing, creation, and navigation tools do not require the editor to remain open.

Codex app/CLI and Claude Code use the same session workflow:

1. Call `begin_edit_session` and keep the returned `editSessionId`. Set `approvalMode` to `manual` (the default) or `auto`.
2. Pass that id to every project read/edit tool. Changes are applied only to an isolated draft.
3. Call `review_edit_session` when the draft is ready.
4. In `manual` mode, review, preview, select, and approve or reject the proposal inside the open OpenChatCut project. In `auto` mode, `review_edit_session` applies the complete draft immediately. The client can poll `get_edit_session` for `applied`, `rejected`, or `discarded` status.

Approval in Codex or Claude controls whether the client may call a tool. OpenChatCut project approval is required only for `manual` sessions; `auto` sessions explicitly bypass that review. Either mode commits the applied operations atomically as one undo step.
If an `auto` session becomes stale, it returns an error instead of falling back to manual approval; discard it and start a new session.
Only draft-safe project read/edit tools are exposed in these sessions. Generation, export, project deletion, and other immediate side-effect tools stay unavailable because a rejected proposal could not roll them back.

### Codex

Add the following to your Codex configuration:

```toml
[mcp_servers.openchatcut]
url = "http://localhost:5199/api/external-mcp/mcp"
```

### Claude Code

```bash
claude mcp add --transport http openchatcut \
  http://localhost:5199/api/external-mcp/mcp
```

You can then describe an editing task directly to the agent:

```text
Start an OpenChatCut edit session. Read the draft, add a scratch sound effect
at 8 seconds on the second audio track, and add a glitch transition between
the adjacent video clips. Submit the draft for review and wait for the user to
approve it in OpenChatCut before reporting that the edit was applied.
```

External agents invoke the same internal editing tools and `EditorCore` commands as the editor itself. There are no separate project formats that can drift apart, and the live timeline is not changed while an external draft is being prepared.

### Qoder

Qoder is one-click too: the guide's **Connect** button writes the endpoint and
bearer token into Qoder's own settings file, keeping any unrelated settings and
MCP servers already there.

```text
~/.qoder/settings.json        (international build)
~/.qoder-cn/settings.json     (China build — written as well when installed)
```

```json
{
  "mcpServers": {
    "openchatcut": {
      "type": "http",
      "url": "http://localhost:5199/api/external-mcp/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

Restart Qoder afterwards to load the server.

### Qwen Work (千问办公)

千问办公 keeps custom MCP servers inside its own connector store rather than a
config file, so OpenChatCut cannot write this one for you. In the guide, use
**Copy config** on the 千问办公 card, then in 千问办公 open
连接器 → 自定义 MCP → 添加, paste the JSON, and save:

```json
{
  "mcpServers": {
    "openchatcut": {
      "type": "streamable-http",
      "url": "http://localhost:5199/api/external-mcp/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### Protecting MCP access

When exposing the MCP endpoint yourself, configure:

```bash
OPENCHATCUT_MCP_TOKEN=your-token
OPENCHATCUT_EDITOR_URL=https://your-editor.example.com
```

Clients must send `Authorization: Bearer <token>`. The current bridge is designed for a single user on one machine, not as a multi-tenant service.

---

## Architecture

<p align="center">
  <img src="assets/readme-pic/openchatcut-runtime.en.svg" alt="OpenChatCut runtime architecture connecting agents, MCP, EditorCore, local storage, preview, rendering, and export" />
</p>

<p align="center">
  <sub>One shared set of agent tools and EditorCore commands connects the built-in agent, external MCP clients, the real timeline, local data, and production exports.</sub>
</p>

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Editing core | Immutable timeline state, command layer, and proposal-based application |
| Agent | Vercel AI SDK 7 (Anthropic, OpenAI, Gemini, Kimi, Qwen, GLM, DeepSeek, MiniMax, Xiaomi MiMo, Mistral, xAI Grok by API key or SuperGrok/X Premium+ subscription sign-in, OpenRouter, OrcaRouter, OFox, Requesty, Cheaper Inference, and compatible APIs), Agent Skills, MCP SDK |
| Preview and visuals | Remotion Player, WebGL / GLSL |
| Server | Dual-host Vite / Electron plugins and a server-side keystore |
| Persistence | Shared local project store under `~/.openchatcut`, IndexedDB cache, configurable local media directory, optional Cloudflare R2 |
| Desktop | Electron 43 |
| Export | Remotion, FFmpeg, FCPXML, SRT |

### Directory Overview

| Directory | Responsibility |
|---|---|
| `src/editor/` | Timeline state and commands, independent of UI and LLMs |
| `src/agent/` | Agent assembly, tools, skills, progress, and settings |
| `src/library/` | Library UI for Motion Graphics, sound effects, transitions, effects, LUTs, and more |
| `src/transcript/` | Transcription, word-level editing, and transcript UI |
| `src/captions/` | Caption models, styles, controls, and preview layer |
| `src/gl/` | WebGL effects, transitions, and shader runtime |
| `src/generate/` | Clients for image, video, speech, music, and sound-effect generation |
| `src/persist/` | Project, chat, version, and media persistence |
| `server/plugins/` | Generation, transcription, media, export, and storage services |
| `desktop/` | Electron main process and embedded services |
| `remotion/` | Headless rendering and export pipeline |

---

## Data and Privacy

- Projects, chat history, and version data are stored in the shared local store under `~/.openchatcut`; IndexedDB provides a browser-side cache and legacy-data migration.
- User media is stored in a local media directory that you can back up or migrate.
- Whether AI requests leave your machine depends on the model, generation, or media services you configure.
- Unconfigured cloud features do not affect the local timeline or editing of existing media.
- When exposing MCP externally, configure a Bearer Token and restrict network access to the editor endpoint.

---

## Security Model

- API keys are only available to server-side configuration; vendor credentials must never be exposed to the browser through `VITE_`.
- LLM output, plugin packages, template code, and user input are validated at trust boundaries.
- Motion Graphics and shader code run in a restricted sandbox, with dedicated checks blocking malicious templates.
- Agents modify projects only through `EditorCore` commands, making edits traceable and undoable.
- MCP binds locally by default; public endpoints support Bearer Token authentication.
- Local media directories and R2 credentials are managed by the server and never written into project JSON.

---

### Fal.ai image and video generation

Fal.ai is an optional generation provider with an explicit image/video model catalog.
Configure it under **Settings → AI Generation → Image or Video → Fal.ai**.
See [Fal setup, supported models, and extension guide](FAL.md) for supported modes,
server-only credentials, and checks that do not spend generation credits.

## Development and Verification

```bash
# Type checking and production build
npm run build

# Core regression checks
npm test

# Static analysis
npm run lint

```

After changing the agent, timeline, preview, or export paths, run at least:

```bash
npx tsc -b --force
npm test
npm run build
```

---

## Technical Foundations

OpenChatCut is built with the following core projects and specifications:

| Project / specification | Role in OpenChatCut |
|---|---|
| [ChatCut-Inc/agent-plugin](https://github.com/ChatCut-Inc/agent-plugin) | Agent Skills foundation. OpenChatCut adapts the plugin's skill structure and workflows for its local editor, storage, MCP, and tool architecture. See the [Agent Skills attribution notice](src/agent/skills/NOTICE.md). |
| [Remotion](https://www.remotion.dev/) | Core foundation for React-based video preview, composition, and server-side rendering. |
| [Model Context Protocol](https://modelcontextprotocol.io/) | Protocol foundation that enables Codex, Claude Code, and other external agents to access projects and timeline tools. |
| [Vercel AI SDK](https://ai-sdk.dev/) | Provider-neutral model streaming and tool calling for the built-in Agent. |
| [tt-a1i/archify](https://github.com/tt-a1i/archify) | Tool used to define, validate, and generate the README's runtime architecture diagram. |

JianYing / CapCut draft export is powered by [capcut-cli](https://github.com/renezander030/capcut-cli).

This list covers the project's major technical foundations. It does not replace the licenses bundled with individual dependencies, fonts, or binaries. See `package-lock.json` for JavaScript dependency versions and [`assets/fonts/LICENSES.md`](assets/fonts/LICENSES.md) for font licenses.

---

## Changelog

See the bilingual [`CHANGELOG.md`](CHANGELOG.md) for notable changes, or browse all published packages on [GitHub Releases](https://github.com/0xsline/OpenChatCut/releases).

---

## Star Growth

<p align="center">
  <a href="https://www.star-history.com/?type=date&repos=0xsline%2FOpenChatCut">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=0xsline/OpenChatCut&type=date&theme=dark&legend=top-left&sealed_token=KKfeYtGGCjyG1QN9_Ev6Tvyyrcp5LW6bzOT8ZKED1EE0qNRqM3KrThzzbXWdcP6K-sr3vKbmoFZYDviSMtf8SI5UqAPYQf9v8qXCpM04S2C4LQTAKPbexT66SI3Q8pcHJJoMT7VCZnGp93LqIXZchAyYfTMmKy_y_LFOJ-_ruEq8GP1kVESXshaFzJfC" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=0xsline/OpenChatCut&type=date&legend=top-left&sealed_token=KKfeYtGGCjyG1QN9_Ev6Tvyyrcp5LW6bzOT8ZKED1EE0qNRqM3KrThzzbXWdcP6K-sr3vKbmoFZYDviSMtf8SI5UqAPYQf9v8qXCpM04S2C4LQTAKPbexT66SI3Q8pcHJJoMT7VCZnGp93LqIXZchAyYfTMmKy_y_LFOJ-_ruEq8GP1kVESXshaFzJfC" />
      <img alt="OpenChatCut Star History Chart" src="https://api.star-history.com/chart?repos=0xsline/OpenChatCut&type=date&legend=top-left&sealed_token=KKfeYtGGCjyG1QN9_Ev6Tvyyrcp5LW6bzOT8ZKED1EE0qNRqM3KrThzzbXWdcP6K-sr3vKbmoFZYDviSMtf8SI5UqAPYQf9v8qXCpM04S2C4LQTAKPbexT66SI3Q8pcHJJoMT7VCZnGp93LqIXZchAyYfTMmKy_y_LFOJ-_ruEq8GP1kVESXshaFzJfC" />
    </picture>
  </a>
</p>

---

## License

OpenChatCut is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE).
Third-party components and assets remain subject to their respective licenses.

---


## Contributing

1. Create a branch from `main`.
2. Add an executable check for non-trivial logic.
3. Run `npm test`, `npm run lint`, and `npm run build` before committing.
4. Open a Pull Request and include screenshots or acceptance evidence for UI or video-behavior changes.

Use [GitHub Issues](https://github.com/0xsline/OpenChatCut/issues) for bug reports and feature requests.
