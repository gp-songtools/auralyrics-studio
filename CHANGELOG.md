# Changelog

All notable changes to AuraLyrics Studio, newest first. The app has no version numbers, so entries are grouped by date.

## 2026-11-09 — Joins the GP Song Tools

### Added

- **Changelog** page, and **Changelog**, **Privacy & credits** and **More GP Song Tools** links at the bottom of the page.
- **Remember key on this device** option for your Groq or OpenAI key. It's off by default; unticking it deletes the saved key.

### Changed

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
