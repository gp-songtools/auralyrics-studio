# Changelog

All notable changes to AuraLyrics Studio, newest first. The app has no version numbers, so entries are grouped by date.

## 2026-11-18 — Song spec

### Added

- **Lyrics from the song spec**: when Lyricpad has saved lyrics to the song spec (the song file the GP Song Tools share in this browser), **Use these lyrics** above the LRC editor puts them in, with section tags like [Verse] removed, ready to sync with Auto-Align, Whisper or Tap-to-Sync. A **Song spec** panel shows what the file holds. AuraLyrics only reads the song spec and never changes it; without one, nothing changes.

## 2026-11-17 — Beat engine, camera punch and flash; visualizer and logo layers

### Added

- **Logos & images** in the Visualizer tab: add up to 3 pictures (a logo, an artist photo, a channel badge) that sit above the visualizers and particles and below the lyrics. Each one can be shown as is (transparent PNGs keep their transparency), as a circle or as a rounded square, with an optional outline in any colour, plus opacity and rotation. Make it **spin**, **pulse** to a part of the song (Kick, Bass, Melody, Vocal or Classic), or both. **Camera punch moves this layer** is on by default; untick it to keep the logo still while the picture punches. Logos look the same in exported videos as in the preview.
- Each logo is its own box in the layout editor (**Logo 1**, **Logo 2**…). Logo boxes keep their proportions when you drag a corner; hold Shift to resize freely.
- Your logos are remembered in this browser after a reload. **Remove image**, deleting the logo or **Reset settings** removes the saved copy.
- **Visualizer layers**: stack up to 6 visualizers in the Visualizer tab. Each layer has its own pattern, **Reacts to**, reactivity, glow and opacity, plus new options: its own **palette** (or follow the global one), **blend** (Normal, Add, Screen), **mirror** left/right and up/down, and **rotation**. Add, duplicate, delete, hide and reorder layers in the new **Layers** list; the top of the list draws in front.
- Every layer is its own box in the layout editor (**Viz 1**, **Viz 2**…), so you can move and resize each one separately. Selecting a layer in the list or on the canvas selects it in both places.
- **Beat & Camera** in the Visualizer tab: a shared beat engine that listens separately to the **Kick**, **Bass**, **Melody** and **Vocal** parts of the song, with a **Beat release** slider for how quickly reactions fade.
- **Camera punch** zooms the whole picture in on each beat and eases back; the lyrics stay still unless you tick **Camera punch moves the lyrics too**. **Flash** briefly lights the picture white or in your palette's accent colour on strong beats. Pick which part of the song drives them with **Punch & flash follow**. Both are off until you turn them up, and both appear in exported videos exactly as in the preview.
- **Reacts to** choices for the visualizer, particles, background-image pulse, turntable bounce and lyric text pulse, with amount sliders for the particles, background pulse, turntable bounce and text pulse. **Classic** keeps the original bass reaction.

### Changed

- Your saved visualizer becomes the first layer, so it looks exactly the same after the update.
- The visualizer's **Reacts to** choice moved from Beat & Camera into the layer settings, since each layer now has its own.
- The analyser now looks at the song in finer detail, so spectrum bars give the bass several bars of its own instead of a couple.
- Pulse Rings now uses the shared beat engine, so its shockwaves land on the kick even when a busy bassline plays in the same range.
- The turntable's bounce has its own amount slider; it no longer depends on the lyrics' text-pulse checkbox.

### Fixed

- The VU Meter needle now moves in fast-rendered videos when it follows the whole song (**Classic**); before, it stayed at rest.
- Double-clicking a box in the layout editor resets it again.

## 2026-11-16 — Fast render

### Added

- **Fast render** for video export in Chrome and Edge: instead of recording while the song plays, the app renders every frame on its own and encodes it, usually much faster than real time and with no dropped frames. The export pane shows frames done, the time left and a **Cancel** button, and the finished-video window says how long the render took.
- Under the format picker you can see which method your browser will use: **Fast render**, or **Real-time recording** in browsers that can't encode that format (for example Firefox, or MP4 where the browser has no AAC encoder). Real-time recording works as before.

### Changed

- Exporting the same song with the same settings now gives the same video every time.
- Animations (particles, starfield, turntable, beat rings and meters) now move at the same speed at 30 and 60 FPS and on fast or slow screens.
- Starting a fast render downloads the free Mediabunny video library from jsDelivr once. Nothing you make is uploaded.

## 2026-11-09 — Joins the GP Song Tools

### Added

- **Changelog** page, and **Changelog**, **Privacy & credits** and **More GP Song Tools** links at the bottom of the page.
- **Remember key on this device** option for your Groq or OpenAI key. It's off by default; unticking it deletes the saved key.

### Changed

- The browser tab now shows AuraLyrics Studio's own icon, 🎬, the same one as on the GP Song Tools menu, on every page.
- Your Groq or OpenAI key is no longer saved automatically. Unless you tick Remember, it is forgotten when you close the tab. If you saved a key before this change, it stays saved and the box shows ticked.
- AuraLyrics Studio now counts visits with Cloudflare Web Analytics: anonymous totals only, with no cookies. It never sees your audio, lyrics, videos or key. The Privacy & credits page explains what it reports.

### Fixed

- On phones, the page no longer scrolls sideways. The Demo Song and Export Video buttons at the top now show just their icons on narrow screens.

## 2026-11-09 — First release

### Added

- **Music visualizer and lyric video maker** that runs entirely in your browser: load a WAV, M4A or MP3 (or the built-in demo song), customise the visuals and export an MP4 or WebM video.
- **Lyrics:** load an `.lrc` file, or transcribe the vocals with **Whisper** in your browser (tiny, base or small model, remembered) or with **Groq** or **OpenAI** using your own key. **Align to my lyrics** keeps the lines you pasted and takes only the timing from the transcription.
- **Visualizer modes** including Pulse Rings, Mirror Bars, Inferno Spectrum, Spiral Burst, VU Meter, LED Meter and Dot Spectrum, with a **Visualizer Opacity** slider.
- **Layout editor:** drag and resize the visualizer, turntable and lyrics on the frame. Shift keeps proportions, Alt turns off snapping, arrow keys nudge, and double-click resets. The editor never appears in exports.
- **Palette editor:** edit the colours with a live preview and save your own named palettes.
- **Particle motion:** Drift (with a direction), Radial Burst, Implode, Swirl and Vortex, with a speed slider.
- **Background image** with Cover, Contain or Stretch fit, dim, blur and pulse-with-bass.
- Your settings, layout, palettes, cover art and background image are kept in this browser between visits. **Reset settings** clears them.

### Changed

- Cloud transcription uploads a 16 kHz mono copy of the song, so full songs fit the 25 MB limit, and asks for word-level timing.
- On desktop, the video preview stays in place while the settings beside and below it scroll on their own.
- The left pane has three tabs (Audio / Lyrics, Visualizer, Lyrics), and the pane under the preview holds only the video export settings.
