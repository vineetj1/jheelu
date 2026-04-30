# Jheel Birthday Surprise 💖

This is a single-file static website (HTML/CSS/JS) with:
- Welcome screen with pulsing heart
- 3×3 romantic puzzle (drag-to-swap + tap-to-swap)
- Special message page
- Playful proposal interaction (No button runs away, Yes grows)
- Confetti celebrations + floating hearts/sparkles
- Background music toggle + final video section

## Run it

Just open `index.html` in a browser.

If your browser blocks some media when opening as a file, run a tiny local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Customize (important)

Put your own files into `assets/`:
- `assets/puzzle.jpg` — image used for the puzzle (square-ish looks best)
- `assets/message.jpg` — image on the message page
- `assets/music.mp3` — romantic instrumental (used by the Music toggle)
- `assets/video.mp4` — the final video

To edit the heartfelt message text, open `script.js` and change the string in `initMessageText()`.

