# ytube-mp3

A local web app for downloading YouTube videos as MP3 files. Paste one or more
YouTube URLs into a queue; they're downloaded and converted to MP3
**sequentially**, one at a time, then delivered to your browser via a
**Download** button. The server keeps no copy: the staged file is deleted the
moment the transfer completes.

- **Frontend**: React + Vite SPA, with live progress via Server-Sent Events (SSE)
- **Backend**: Express + [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg
- **Persistence**: queue and settings are stored in `data/state.json` and survive restarts

## Prerequisites

You need `yt-dlp` and `ffmpeg` available on your system. The server checks for
both at startup and shows a warning banner in the UI if either is missing.

### Option A: package manager (recommended if you have sudo)

```bash
sudo apt update && sudo apt install ffmpeg
pip install -U yt-dlp        # or: pipx install yt-dlp
```

### Option B: standalone binaries (no sudo/pip required)

Download the binaries into a local directory (e.g. `.bin/` in this project)
and point the app at them via `.env`:

```bash
mkdir -p .bin
curl -L -o .bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux
chmod +x .bin/yt-dlp

curl -L -o ffmpeg.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xJf ffmpeg.tar.xz
cp ffmpeg-*-static/ffmpeg ffmpeg-*-static/ffprobe .bin/
chmod +x .bin/ffmpeg .bin/ffprobe
rm -rf ffmpeg.tar.xz ffmpeg-*-static
```

Then create `.env` (see `.env.example`):

```bash
cp .env.example .env
```

```ini
YTDLP_PATH=./.bin/yt-dlp
FFMPEG_PATH=./.bin/ffmpeg
```

## Setup

```bash
npm install --ignore-scripts
```

> `--ignore-scripts` avoids `yt-dlp-exec`'s postinstall step, which tries to
> auto-download its own `yt-dlp` binary using Python and isn't needed here —
> this app always invokes the `yt-dlp`/`ffmpeg` binaries configured via
> `YTDLP_PATH`/`FFMPEG_PATH` (see `server/config.js`).

## Development

```bash
npm run dev
```

This runs the Express API (port 3010, auto-reloading via nodemon) and the
Vite dev server (port 5173, proxies `/api/*` to the Express server). Open
**http://localhost:5173**.

## Production

```bash
npm run build   # builds client/dist
npm start       # serves the SPA + API on a single port (default 3010)
```

Open **http://localhost:3010**.

## Configuration

All settings are editable from the Settings tab in the UI (`GET`/`PUT
/api/settings`), and persisted to `data/state.json`:

| Setting | Description | Default |
|---|---|---|
| Audio quality | Bitrate: 128 / 192 / 256 / 320 kbps | 192 |
| Filename template | Name of the file the browser saves (allowed placeholders: `%(title)s`, `%(id)s`, `%(uploader)s`, `%(upload_date)s`, `%(ext)s`) | `%(title)s.%(ext)s` |
| Max queue size | Reject additions beyond this | 100 |
| Cookies file | Optional path to a cookies.txt for age-restricted videos | (none) |
| Embed thumbnail | Embed video thumbnail as cover art | off |
| Embed metadata | Embed ID3 tags (title, uploader, etc.) | on |

Environment variables (`.env`, see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `PORT` | Express server port | 3010 |
| `DATA_DIR` | Where `state.json` is stored | `./data` |
| `STAGING_DIR` | Where finished MP3s wait to be downloaded | `$DATA_DIR/staging` |
| `FILE_RETENTION_MINUTES` | How long an undownloaded file is kept | 360 |
| `YTDLP_PATH` | Path or command name for yt-dlp | `yt-dlp` |
| `FFMPEG_PATH` | Path or command name for ffmpeg | `ffmpeg` |

## Docker (home server)

```bash
docker compose up -d --build
```

Then open **http://\<server-ip\>:3010**. `yt-dlp` and `ffmpeg` are baked into
the image, so nothing needs installing on the host.

- `HOST_PORT` overrides the published port (`HOST_PORT=8080 docker compose up -d`).
- State and staged files live in the `ytube-mp3-data` volume; nothing is
  written to the host filesystem.
- For age-restricted videos, uncomment the `./cookies:/cookies:ro` mount and
  set the cookies file to `/cookies/cookies.txt` in Settings.
- Pin a different yt-dlp release with
  `docker compose build --build-arg YTDLP_VERSION=2025.06.09`.

## Notes

- Files are never kept on the server: the MP3 is staged, streamed to your
  browser when you click **Download**, and deleted as soon as the transfer
  completes. A sweeper removes anything unclaimed after
  `FILE_RETENTION_MINUTES`.
- Pasted URLs are treated as single videos (`--no-playlist`), even if they
  contain playlist parameters.
- If the server is restarted mid-download, that item is automatically
  re-queued (at the front of the queue) on the next startup.
- Duplicate URLs are allowed — no deduplication is performed.
