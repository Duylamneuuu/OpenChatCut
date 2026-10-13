# OpenChatCut Custom

This fork adds independent Codex, OpenCode, and Antigravity CLI choices to OpenChatCut, plus native media import and a read-only Ask mode. No CLI is the primary agent: the model selector determines which CLI handles a turn. An unavailable CLI reports its own error rather than switching providers.

The current custom version is **v0.2.16-custom.2**, built from **agent/color-grading-ai** for **Windows x64**. Custom builds are published as prereleases. Download them from [Duylamneuuu/OpenChatCut releases](https://github.com/Duylamneuuu/OpenChatCut/releases).

## Included changes

- Ask/Agent mode picker, a distinct Ask prompt, per-project mode persistence, and read-only continuation.
- OpenCode and Antigravity settings and MCP tool bridges, alongside Codex and the existing providers.
- Native media created by the selected CLI can be imported into the media pool and placed on the timeline. Antigravity uses its own native image generation; it does not call Codex.
- LUT intensity accepts zero, the taste profile persists in an ES module app, and the server tool catalog includes the grading and quick-edit tools.
- Local speech processing and quick-edit fixes for clips containing spoken audio.
- Scene detection, evidence thumbnails, and auto grading retry with CPU decoding when FFmpeg's compiled GPU support cannot initialize a usable device. Cancellation and unrelated media errors remain visible.
- GitHub CI checks the custom branch on Linux and Windows, with a separate macOS export frame synchronization check.
- Community LUT files are included in the headless render bundle, so their color grade is applied during export as well as preview. Export render concurrency scales its memory budget with the actual output dimensions.
- AI export tools expose resolution and frame-rate presets, including 3840 × 2160 at 60 fps. Export time and hardware encoding depend on the machine and media.
- The desktop updater uses this fork's custom release channel. Downloads and installation remain user initiated.

## Install and data

The portable ZIP is convenient when the app and working files should live on a chosen drive. Extract it into a writable directory and run **Start-OpenChatCut.cmd**. Its launcher creates a data directory beside the app. Move the entire extracted folder when moving a portable installation.

The Windows installer also lets you choose the installation directory. It does not bundle a user's projects, account credentials, CLI login sessions, or downloaded AI models. Existing accounts and CLI tools must be configured on the receiving machine.

Work in progress is saved in the app's project store. Export destinations are selected separately for each export. Keep a backup of the data directory before moving or replacing an existing installation.

## Optional AI services

Install and sign in to the CLI you want to use, then choose it in the model selector. OpenCode can use OpenCode Zen; free model availability is controlled by that provider. Native image generation depends on the chosen CLI's installed tools and account capabilities. OpenCode native image generation is not verified in this release.

Cloud image, video, voice, music, and SFX generation remain optional integrations requiring their own credentials. Local ASR, beat analysis, and semantic media models may need a separate model download. The app also includes the existing Remotion graphics workflow and sound library.

## Build from source

```powershell
git clone --branch agent/color-grading-ai https://github.com/Duylamneuuu/OpenChatCut.git
cd OpenChatCut
# Use Node 24.x; set npm, Electron, and electron-builder caches to your chosen drive.
npm ci
npm run lint
npm test
npm run verify:agent-skill
npm run verify:agent-local-media
npm run desktop:dist:win
node scripts/package-custom-portable.mjs
```

Do not change `desktop-dist` while electron-builder is packaging it. Custom prerelease tags must match the version in `package.json` and the lockfile.

Windows packages are unsigned; there is no Windows signing certificate included in this fork. macOS and Linux artifacts are not included in these custom releases.
