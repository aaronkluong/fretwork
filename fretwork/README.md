# Fretwork Web Client

Next.js web interface for Fretwork, a guitar transcription and tablature tool.

## Features
- **File Upload**: Supports JAMS (JSON), MIDI, and audio files (WAV/MP3).
- **Interactive Tablature**: Real-time rendering of fretboard positions and fingerings powered by alphaTab.
- **ASCII Export**: Plain-text tab output with automatic scaling for screen width.
- **Harmonic Context**: Shows key, tempo, and chord progressions.
- **Dark Mode**: Supports system and manual theme toggles.

## Tech Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Tab Rendering**: [@coderline/alphatab](https://www.alphatab.net/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) via [@opennextjs/cloudflare](https://opennext.js.org/)

## Development

```bash
pnpm install
pnpm dev
```

## Validation

```bash
pnpm lint           # Style check
pnpm check-types    # Type check
pnpm test           # Unit tests
```

## Deployment

```bash
pnpm run pages:build    # Build for Cloudflare Pages
pnpm run pages:deploy   # Deploy via Wrangler
```
