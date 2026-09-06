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

## Where these live

This folder is the source of truth. Three files are also copied to the site
root, because that is where user agents look for them and nowhere else:

- `/favicon.svg` — what every page's `<link rel="icon">` points at
- `/favicon.ico` — requested at the root by browsers, with no link tag
- `/apple-touch-icon.png` — requested at the root by iOS, with no link tag

They are copies, not originals. Change the file here, then copy it out.

## Raster sizes

SVG is the source; these are exports for the places that can't take one.

- **png/mark-light-{16,32,64,128,256,512}.png** — transparent, quiet tiles in
  paper. For dark grounds.
- **png/mark-dark-{16,32,64,128,256,512}.png** — same, quiet tiles in ink.
  For light grounds.
- **png/favicon-{16,32,48,64,180,192,512}.png** — the favicon cut with its chip.
- **lockup/** — mark plus wordmark, no tagline. See below.
- **png/og-image.png** — 1200x630 social card, for og:image and twitter:image.
- **favicon.ico** — 16/32/48 in one file, for browsers that still ask for it.
- **png/apple-touch-icon.png** — 180x180 for iOS. Full-bleed and opaque, with
  square corners: iOS masks the icon into its own squircle, so an icon that
  arrives pre-rounded gets masked twice and its transparent corners composite
  to black. The chip cut (png/favicon-*.png) is the rounded, transparent one —
  correct for tabs and avatars, wrong for a home screen.
- **png/icon-{192,512}-maskable.png** — same full-bleed treatment, for an
  Android/PWA manifest whenever one gets added.

favicon.ico and apple-touch-icon.png sit at the site root, where browsers and
iOS find them without a link tag. The og-image needs meta tags to be used:

    <meta property="og:image" content="https://agentmesh.ai/brand/png/og-image.png">
    <meta name="twitter:image" content="https://agentmesh.ai/brand/png/og-image.png">
    <meta name="twitter:card" content="summary_large_image">


## Lockups: mark + name, no tagline

Names say what the artwork sits **on**, not what color the artwork is.
`on-dark` is light artwork for a dark ground; `on-light` is dark artwork for a
light ground.

**Transparent** (drop onto anything):

- `lockup/agentmesh-lockup-on-dark.svg` · `lockup/agentmesh-lockup-on-light.svg`
- `lockup/png/lockup-on-dark-{1x,2x,3x}.png`
- `lockup/png/lockup-on-light-{1x,2x,3x}.png`

1x is a 32px mark, 2x is 64px, 3x is 96px. Use the SVG wherever you can.

**Background baked in** (for anywhere transparency gets flattened badly —
email signatures, Office, some slide tools):

- `lockup/png/lockup-dark-bg.png` — on ink `#0A1417`
- `lockup/png/lockup-light-bg.png` — on white `#FFFFFF`
- `lockup/png/lockup-paper-bg.png` — on paper `#E7EFEC`

**Social cards, 1200x630, no tagline:**

- `lockup/png/social-dark-1200x630.png`
- `lockup/png/social-light-1200x630.png`

The tagline version is `png/og-image.png`, which sets "a network custom built
for agents" under the lockup on ink.

## Social

`social/` holds one file per platform slot, sized to that platform's spec.
Avatars are the mark alone — the wordmark is unreadable at avatar size, and
most platforms mask avatars into a circle, so the mark sits at 62% of the
square with the corners well inside the circle.

| File | Slot |
|---|---|
| `avatar-dark-{400,512,800}.png` | X, LinkedIn, GitHub, Slack, Discord, YouTube channel icon |
| `avatar-light-{400,512}.png` | the same, for platforms that frame avatars on white |
| `x-header-1500x500.png` | X profile header |
| `linkedin-cover-1128x191.png` | LinkedIn page cover (light variant included) |
| `youtube-banner-2560x1440.png` | YouTube channel art; lockup sits inside the 1546x423 safe area |
| `github-social-1280x640.png` | GitHub repo social preview (Settings → Social preview) |
| `square-1080x1080.png` | square post, dark and light |
| `../png/og-image.png` | Open Graph / X large card, with the tagline |
| `../lockup/png/social-{dark,light}-1200x630.png` | the same card without the tagline |

Not included, because nothing points at them yet: Facebook page cover
(820x312), Instagram profile (320x320). Ask and they take a minute.
