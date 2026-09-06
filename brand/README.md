# AgentMesh mark

Lattice, amber + mint, with the wordmark set as a weight split.

| Color | Hex | Token on the site |
|---|---|---|
| Amber | `#F2A93B` | `--signal` |
| Mint | `#43D6A6` | `--verify` |
| Ink (favicon chip) | `#0A1417` | `--ink` |
| Paper (quiet tiles, favicon) | `#E7EFEC` at 22% | `--paper` |

The two quiet tiles are drawn in `currentColor` at 35%, so the mark takes the
color of whatever it sits in and works on ink or on white with no second file.

## Files

- **agentmesh-mark.svg** — the mark. Transparent, no chip. Use in-page, in decks,
  anywhere it sits on a known ground.
- **agentmesh-favicon.svg** — the 16px cut. Strokes are replaced with filled
  tiles at low opacity, because a 2px stroke on a 32 grid is half a pixel in a
  tab, and it carries the ink chip so it reads on a light tab bar. Same geometry.
- **agentmesh-mark-mono.svg** — one color. For stamps, print, embroidery, and
  anywhere the palette can't come along.
- **agentmesh-lockup.svg** — horizontal lockup, mark plus wordmark. The wordmark
  is live text in Space Grotesk; convert to outlines for print or for any context
  where the font won't be available.
- **header-snippet.html** — drop-in replacement for the site header's `.brand`
  block, with the CSS it needs.

## The wordmark

Space Grotesk, `Agent` at 500 and `Mesh` at 700, letter-spacing `-0.01em`.
The compound is carried by weight, not by case or punctuation. Don't add a
space, don't hyphenate, don't set it in all caps — the weight split is doing
the work that the capital M used to do.

## Clear space and minimum size

Clear space on all sides: the width of one tile (a quarter of the mark).
Minimum size for the mark alone: 16px. Minimum for the lockup: 120px wide —
below that, use the mark on its own.

## Raster sizes

SVG is the source; these are exports for the places that can't take one.

- **png/mark-light-{16,32,64,128,256,512}.png** — transparent, quiet tiles in
  paper. For dark grounds.
- **png/mark-dark-{16,32,64,128,256,512}.png** — same, quiet tiles in ink.
  For light grounds.
- **png/favicon-{16,32,48,64,180,192,512}.png** — the favicon cut with its chip.
- **png/lockup-light@2x.png**, **png/lockup-dark@2x.png** — mark plus wordmark,
  transparent, 2x for retina.
- **png/og-image.png** — 1200x630 social card, for og:image and twitter:image.
- **favicon.ico** — 16/32/48 in one file, for browsers that still ask for it.
- **apple-touch-icon.png** — 180x180, what iOS uses when a page is saved to
  the home screen.

favicon.ico and apple-touch-icon.png sit at the site root, where browsers and
iOS find them without a link tag. The og-image needs meta tags to be used:

    <meta property="og:image" content="https://agentmesh.ai/brand/png/og-image.png">
    <meta name="twitter:image" content="https://agentmesh.ai/brand/png/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
