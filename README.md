<img width="1174" height="986" alt="image" src="https://github.com/user-attachments/assets/1e04dba3-e7b0-453b-a969-6e88cd5d1b69" />

# Guitar Fretboard App

Cross-platform desktop app (macOS, Windows, Linux) built with Electron. Shows interactive guitar fretboard, detects played notes in real-time via microphone, highlights them, visualizes scales, and suggests matching scales.[1]

## Quick Start

```
brew install node  # or download from nodejs.org
git clone <repo>
cd project
npm install
npm run build
npm start
```

Requires microphone access. Tested on macOS with fish shell.

## Features

- Fretboard render with Canvas (6-7 strings, 24+ frets).
- Tunings: standard EADGBE, Drop D, Open G.
- Real-time pitch detection (Web Audio API + YIN algo).
- Scale highlighter (major, minor, pentatonic, modes).
- Scale suggestions from detected notes.
- Dark/light themes.

## Tech Stack

- Electron (main process + renderer).
- React (UI).
- Canvas API (fretboard draw).
- Web Audio API (mic input, pitch detect).
- Firebase (user scales/presets).

## Build & Package

```
npm run build:dev
npm run package:mac    # or :win, :linux
```

Outputs in `dist/`. For App Store, use electron-builder config.[1]

## Dev Roadmap

Phase 1 (done?): Electron + React setup, basic fretboard, mic input, pitch to note map.

Phase 2: Scales data (JSON), highlight UI, tuning switch.

Phase 3: Scale finder (note freq match), themes, custom scales.

Phase 4: ECS for perf (entities: notes/scales), TypedArrays, workers.

Phase 5: Firebase save, freemium (pro scales), package/distribute.

## Audio Notes

Pitch detect uses autocorrelation in worker thread. Freq to note: MIDI num = 69 + 12*log2(f/440). Fret pos calc from string base + semitones.[1]

## Improvements Queue

- Tonal center set manual.
- Chord-scale theory (Cochrane).
- Circle of 5ths view.
- Backing tracks gen.
- Genre-based licks.

Fork or PR for contribs. MIT license.


ECS Architecture: Optimized entity-component-system for maximum performance
TypedArrays: Using primitive arrays (Float32Array, Int32Array) for better memory efficiency
Web Workers: Offloading physics calculations to separate threads
SharedArrayBuffer: Zero-copy communication between threads
Angular Integration: Angular components 
Memory Optimization: Pre-allocated memory structures and object pools
Manual Change Detection: Optimized Angular change detection without ngZone
