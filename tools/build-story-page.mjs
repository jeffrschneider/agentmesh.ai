#!/usr/bin/env node
// Builds a page from one AgentMesh story file (AgentMesh/docs/stories/<id>.json,
// format agentmesh-story-v1), the same source an explainer or video reads.
//
//   node tools/build-story-page.mjs acting-for-people     -> acting-for-people.html
//
// The page: a headline and lede, a figure drawn from the story's `layers`
// (a stack, top to bottom, each told apart by its label and outline), then one
// section per part with a card per component. Head, header and footer come
// from put-your-agent-on-the-mesh.html so every story page wears the same
// cream chrome. The adapter keeps its own builder (build-adapter-page.mjs)
// because its figure is a plug, not a stack.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const id = process.argv[2];
if (!id || !/^[a-z0-9-]+$/.test(id)) { console.error("usage: node tools/build-story-page.mjs <story-id>"); process.exit(2); }
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORY = process.env.STORY_FILE ?? join(root, "..", "AgentMesh", "docs", "stories", `${id}.json`);
const story = JSON.parse(readFileSync(STORY, "utf8"));
const tpl = readFileSync(join(root, "put-your-agent-on-the-mesh.html"), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cut = (from, to) => {
  const a = tpl.indexOf(from);
  const b = to ? tpl.indexOf(to, a) : tpl.length;
  if (a < 0 || b < 0) throw new Error(`template marker not found: ${from} .. ${to}`);
  return tpl.slice(a, b);
};

const url = `https://agentmesh.ai/${id}.html`;
const title = `${story.title} | AgentMesh`;
const head = cut("<!DOCTYPE html>", "<style>")
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(story.lede)}"`)
  .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
  .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(story.lede)}"`)
  .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
const header = cut("</head>", '<main class="wrap">');
const footer = cut('  <footer class="sitefoot">');

const style = `<style>
    .ad-head{ padding:72px 0 16px; }
    .ad-head h1{ margin:0 0 18px; font-size:clamp(2.6rem,5vw,4.4rem); }
    .ad-head p{ margin:0; font-size:1.2rem; line-height:1.6; color:var(--dim); max-width:62ch; }
    .ad-fig{ margin:36px 0 12px; background:var(--st-bg); color:var(--st-fg); border-radius:22px; overflow:hidden; }
    .ad-fig svg{ display:block; width:100%; height:auto; }
    .ad-part{ padding:52px 0 20px; border-top:1px solid var(--line); }
    .ad-part h2{ margin:0 0 10px; font-size:clamp(2rem,3.4vw,2.9rem); }
    .ad-part > p{ margin:0 0 26px; font-size:1.1rem; color:var(--dim); max-width:60ch; }
    .ad-cards{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
    .ad-card{ border:1.5px solid var(--line); border-radius:16px; padding:20px 20px 18px; }
    .ad-card h3{ margin:0 0 4px; font-size:1.25rem; }
    .ad-card .m{ display:inline-block; margin:0 0 10px; font-family:var(--wire); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); }
    .ad-card p{ margin:0; font-size:1rem; line-height:1.55; color:var(--dim); }
    .lc-end{ padding:64px 0 88px; border-top:1px solid var(--line); }
    .lc-end h2{ margin:0 0 16px; font-size:clamp(2rem,3.4vw,2.9rem); }
    .lc-end p{ margin:0 0 24px; font-size:1.1rem; color:var(--dim); }
    @media (max-width:620px){ .ad-head{ padding:44px 0 8px; } }
  </style>
`;

// The layers, left to right on a wide screen: each a box with its label and a
// line under it, joined by arrows. Outlines alternate solid and dashed so the
// boxes are told apart without colour.
/** Words into lines of at most `max` characters, so a line fits its box. */
function wrap(text, max) {
  const lines = [];
  for (const word of String(text).split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines;
}

function layersSvg() {
  const L = story.layers ?? [];
  if (!L.length) return "";
  const w = 230, h = 120, gap = 44, x0 = 30, y = 60;
  const W = x0 * 2 + L.length * w + (L.length - 1) * gap;
  const boxes = L.map((l, i) => {
    const x = x0 + i * (w + gap);
    const arrow = i < L.length - 1
      ? `<line x1="${x + w + 6}" y1="${y + h / 2}" x2="${x + w + gap - 10}" y2="${y + h / 2}" stroke="#ECE8E0" stroke-width="2"/><path d="M${x + w + gap - 12} ${y + h / 2 - 6} L${x + w + gap - 4} ${y + h / 2} L${x + w + gap - 12} ${y + h / 2 + 6} Z" fill="#ECE8E0"/>`
      : "";
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="rgba(236,232,224,.04)" stroke="${i === 0 ? "#FF8A5C" : "#ECE8E0"}" stroke-width="${i === 0 ? 3 : 2}"${i % 2 ? ' stroke-dasharray="7 5"' : ""}/>
      <text x="${x + w / 2}" y="${y + 52}" text-anchor="middle" font-size="17" fill="#ECE8E0" font-family="Geist, sans-serif">${esc(l.label)}</text>
      <text x="${x + w / 2}" y="${y + 78}" text-anchor="middle" font-size="12" fill="#AEB4BE" font-family="'Geist Mono', monospace">${wrap(l.sub, 24).map((line, k) => `<tspan x="${x + w / 2}" dy="${k ? 16 : 0}">${esc(line)}</tspan>`).join("")}</text>
      ${arrow}`;
  }).join("\n");
  return `<svg viewBox="0 0 ${W} 240" role="img" aria-label="${esc(L.map((l) => `${l.label}: ${l.sub}`).join(", then "))}.">${boxes}</svg>`;
}

const parts = story.parts.map((p) => {
  const comps = story.components.filter((c) => c.part === p.id);
  return `    <section class="ad-part" id="${esc(p.id)}">
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.line)}</p>
      <div class="ad-cards">
${comps.map((c) => `        <div class="ad-card" id="${esc(c.id)}"><h3>${esc(c.name)}</h3><span class="m">${esc(c.metaphor)}</span><p>${esc(c.line)}</p></div>`).join("\n")}
      </div>
    </section>`;
}).join("\n\n");

const fig = layersSvg();
const main = `<main class="wrap">
    <div class="ad-head">
      <p class="kicker">${esc(story.title)}</p>
      <h1>${esc(story.headline)}</h1>
      <p>${esc(story.lede)}</p>
    </div>
${fig ? `    <div class="ad-fig">${fig}</div>\n` : ""}
${parts}
  </main>

  <section class="lc-end">
    <div class="wrap">
      <h2>Bring your agents in, safely.</h2>
      <p>AgentMesh is in beta. Join the waitlist, and we will write when a place opens.</p>
      <a class="btn btn-primary" href="waitlist.html?from=${esc(id)}">Join the waitlist</a>
    </div>
  </section>

`;

const page = `${head}${style}${header}${main}${footer}`;
if (/[—]|&mdash;/.test(page.replace(/<!--[\s\S]*?-->/g, ""))) throw new Error("an em dash reached the page; reword the story");
writeFileSync(join(root, `${id}.html`), page);
console.log(`${id}.html written from ${STORY}: ${story.components.length} cards in ${story.parts.length} sections`);
