#!/usr/bin/env node
// Builds into-the-mesh.html from the one source for the adapter story,
// C:\Users\jeffr\Desktop\AgentMesh\docs\stories\the-adapter.json (the explainer
// and the video read the same file). Never hand-edit into-the-mesh.html: change
// the story and run
//
//   node tools/build-adapter-page.mjs      (from the repo root)
//
// The head, header and footer are taken from put-your-agent-on-the-mesh.html,
// so this page always wears the same cream chrome as the page that links to it.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFlight } from "./adapter-flight.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORY = process.env.ADAPTER_STORY ?? join(root, "..", "AgentMesh", "docs", "stories", "the-adapter.json");
const story = JSON.parse(readFileSync(STORY, "utf8"));
const tpl = readFileSync(join(root, "put-your-agent-on-the-mesh.html"), "utf8");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cut = (from, to) => {
  const a = tpl.indexOf(from);
  const b = to ? tpl.indexOf(to, a) : tpl.length;
  if (a < 0 || b < 0) throw new Error(`template marker not found: ${from} .. ${to}`);
  return tpl.slice(a, b);
};

const url = "https://agentmesh.ai/into-the-mesh.html";
const title = `${story.title}: one plug for any agent | AgentMesh`;
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
    /* The fly-through (tools/adapter-flight.mjs). The stage keeps one shape,
       wide on a desktop and tall on a phone; the camera fits to it. */
    .ad-stage{ position:relative; width:100%; aspect-ratio:21 / 9; }
    .ad-stage svg{ position:absolute; inset:0; display:block; width:100%; height:100%; }
    .ad-globe{ pointer-events:none; opacity:0; }
    .ad-world .t-lab{ font-size:34px; }
    .ad-world .t-tag{ font-size:22px; }
    .ad-world .t-small{ font-size:15px; }
    .ad-world .t-agent{ font-size:16px; }
    .ad-world .t-big{ font-size:120px; }
    .ad-cell rect, .ad-cell circle, .ad-place .ad-shape *, .ad-box *{ transition:stroke-width .3s, fill .3s, stroke .3s; }
    .ad-cell.on > rect:first-child{ stroke:#FF8A5C; stroke-width:3.5; fill:rgba(255,138,92,.18); }
    .ad-prongs.on rect{ fill:#FF8A5C; stroke:#ECE8E0; stroke-width:2; }
    .ad-cell.on > circle:first-child{ stroke:#FF8A5C; stroke-width:3; }
    .ad-cell.on .ad-lamp{ fill:#FF8A5C; r:4.5; }
    .ad-place .ad-tag, .ad-box .ad-tag, .ad-held, .ad-allowed{ opacity:0; transition:opacity .4s; }
    .ad-place.on .ad-tag, .ad-box.on .ad-tag, .on.ad-held, .on .ad-held, .ad-allowed.on{ opacity:1; }
    .ad-place.on .ad-shape > :first-child, .ad-box.on > :first-child{ stroke-width:5; }
    .ad-agent .ad-halo{ transition:opacity .4s; }
    .ad-agent.on .ad-halo{ opacity:1; }
    .ad-cap{ display:flex; gap:18px; align-items:flex-start; justify-content:space-between; padding:10px 26px 16px; min-height:112px; }
    .ad-lead{ margin:0 0 6px; font-family:var(--disp); font-size:1.35rem; line-height:1.35; color:#ECE8E0; }
    .ad-num{ font-family:var(--wire); font-size:12px; letter-spacing:.1em; color:#AEB4BE; margin-right:6px; vertical-align:.2em; }
    @media (max-width:620px){
      .ad-stage{ aspect-ratio:1 / 1; }
      .ad-cap{ min-height:250px; }
      .ad-run .t-agent{ font-size:30px; } .ad-run .t-lab{ font-size:36px; }
      .ad-world .t-lab{ font-size:46px; } .ad-world .t-tag{ font-size:30px; } .ad-world .t-small{ font-size:19px; } .ad-world .t-agent{ font-size:20px; }
    }
    .ad-say{ margin:0; font-size:.98rem; line-height:1.5; color:#AEB4BE; max-width:70ch; }
    .ad-say .n{ color:#ECE8E0; font-weight:500; }
    .ad-pause{ flex:none; font:inherit; font-family:var(--wire); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:#ECE8E0;
      background:transparent; border:1.5px solid rgba(236,232,224,.5); border-radius:10px; padding:8px 14px; cursor:pointer; }
    .ad-pause:focus-visible{ outline:2px solid #ECE8E0; outline-offset:2px; }
    @media (max-width:620px){ .ad-cap{ flex-direction:column; padding:4px 18px 18px; } .ad-lead{ font-size:1.15rem; } }
    .ad-part{ padding:52px 0 20px; border-top:1px solid var(--line); }
    .ad-part h2{ margin:0 0 10px; font-size:clamp(2rem,3.4vw,2.9rem); }
    .ad-part > p{ margin:0 0 26px; font-size:1.1rem; color:var(--dim); max-width:60ch; }
    .ad-cards{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
    .ad-card{ border:1.5px solid var(--line); border-radius:16px; padding:20px 20px 18px; background:var(--paper-2, transparent); }
    .ad-card h3{ margin:0 0 4px; font-size:1.25rem; }
    .ad-card .m{ display:inline-block; margin:0 0 10px; font-family:var(--wire); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); }
    .ad-card p{ margin:0; font-size:1rem; line-height:1.55; color:var(--dim); }
    .ad-next{ padding:40px 0 8px; font-size:1.1rem; color:var(--dim); }
    .lc-end{ padding:64px 0 88px; border-top:1px solid var(--line); }
    .lc-end h2{ margin:0 0 16px; font-size:clamp(2rem,3.4vw,2.9rem); }
    .lc-end p{ margin:0 0 24px; font-size:1.1rem; color:var(--dim); }
    @media (max-width:620px){ .ad-head{ padding:44px 0 8px; } }
  </style>
`;

// The fly-through (adapter-flight.mjs): the world the camera flies through,
// and the timeline it follows, both made from the story's beats.
const flight = buildFlight(story);
const client = readFileSync(join(root, "tools", "adapter-flight.client.js"), "utf8");

const parts = story.parts.map((p) => {
  const comps = story.components.filter((c) => c.part === p.id);
  return `    <section class="ad-part" id="${esc(p.id)}">
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.line)}</p>
      <div class="ad-cards">
${comps.map((c) => `        <div class="ad-card" id="${esc(c.id)}"><h3>${esc(c.name)}</h3><p>${esc(c.line)}</p></div>`).join("\n")}
      </div>
    </section>`;
}).join("\n\n");

const main = `<main class="wrap">
    <div class="ad-head">
      <p class="kicker">The adapter</p>
      <h1>${esc(story.headline)}</h1>
      <p>${esc(story.lede)}</p>
    </div>
    <div class="ad-fig">
      <div class="ad-stage">
        <svg class="ad-world" viewBox="0 0 1080 300" role="img" aria-label="${esc(flight.aria)}">${flight.world}</svg>
        <svg class="ad-globe" viewBox="0 12 640 520" aria-hidden="true" focusable="false"><defs><radialGradient id="ad-glow" cx="42%" cy="38%" r="60%"><stop offset="0" stop-color="rgba(236,232,224,0.07)"/><stop offset=".6" stop-color="rgba(124,147,255,0.05)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs></svg>
      </div>
      <div class="ad-cap">
        <div><p class="ad-lead"><span class="ad-num"></span> <span class="ad-says"></span></p><p class="ad-say"><b class="n"></b> <span class="t"></span></p></div>
        <button class="ad-pause" type="button" aria-label="Pause the animation">Pause</button>
      </div>
    </div>
    <script>
    const FLIGHT = ${JSON.stringify(flight.timeline)};
${client}
    </script>

${parts}

    <p class="ad-next">How it fits the whole picture: <a href="put-your-agent-on-the-mesh.html">Put your agent on the mesh</a>.</p>
  </main>

  <section class="lc-end">
    <div class="wrap">
      <h2>Plug yours in.</h2>
      <p>AgentMesh is in beta. Join the waitlist, and we will write when a place opens.</p>
      <a class="btn btn-primary" href="waitlist.html?from=into-the-mesh">Join the waitlist</a>
    </div>
  </section>

`;

const page = `${head}${style}${header}${main}${footer}`;
if (/[\u2014]|&mdash;/.test(page.replace(/<!--[\s\S]*?-->/g, ""))) throw new Error("an em dash reached the page; reword the story");
writeFileSync(join(root, "into-the-mesh.html"), page);
console.log(`into-the-mesh.html written from ${STORY}: ${story.components.length} parts in ${story.parts.length} groups`);
