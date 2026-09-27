#!/usr/bin/env node
// Builds the-adapter.html from the one source for the adapter story,
// C:\Users\jeffr\Desktop\AgentMesh\docs\stories\the-adapter.json (the explainer
// and the video read the same file). Never hand-edit the-adapter.html: change
// the story and run
//
//   node tools/build-adapter-page.mjs      (from the repo root)
//
// The head, header and footer are taken from put-your-agent-on-the-mesh.html,
// so this page always wears the same cream chrome as the page that links to it.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const url = "https://agentmesh.ai/the-adapter.html";
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
    .ad-fig svg{ display:block; width:100%; height:auto; }
    .ad-dot{ transition:transform .9s cubic-bezier(.5,0,.3,1); }
    .ad-cell rect, .ad-cell circle{ transition:stroke-width .3s, fill .3s, stroke .3s; }
    .ad-cell.on > rect:first-child{ stroke:#FF8A5C; stroke-width:3.5; fill:rgba(255,138,92,.18); }
    .ad-cell[data-c="connection"].on rect{ fill:#FF8A5C; }
    .ad-cell[data-c="presence"].on circle{ stroke:#FF8A5C; stroke-width:3; }
    .ad-cell[data-c="presence"].on .ad-lamp{ fill:#FF8A5C; r:4.5; }
    .ad-arrive{ transition:opacity .6s; }
    .ad-cap{ display:flex; gap:18px; align-items:flex-start; justify-content:space-between; padding:4px 26px 22px; min-height:92px; }
    .ad-lead{ margin:0 0 6px; font-family:var(--disp); font-size:1.35rem; color:#ECE8E0; }
    .ad-say{ margin:0; font-size:.98rem; line-height:1.5; color:#AEB4BE; max-width:70ch; }
    .ad-say .n{ color:#ECE8E0; font-weight:500; }
    .ad-say .mt{ font-family:var(--wire); font-size:12px; letter-spacing:.06em; }
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

// The plug, drawn from the story: the agent and its socket on the left, the
// housing with the parts inside, the prongs into the mesh on the right. Every
// part is told apart by its label and outline, never by colour alone.
// Where the message dot stops, in order, filled in as the drawing is made.
const stops = [];
let PRONG_X = 0;

function plugSvg() {
  const inside = story.components.filter((c) => c.part === "inside");
  const cellW = 158, cellH = 58, gap = 12, x0 = 262, y0 = 92;
  const cells = inside.map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (cellW + gap), y = y0 + row * (cellH + gap);
    stops.push({ id: c.id, x: x + 14, y: y + cellH / 2 });
    return `<g class="ad-cell" data-c="${esc(c.id)}"><rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="10" fill="none" stroke="var(--st-fg, #ECE8E0)" stroke-width="1.5"/>
      <text x="${x + cellW / 2}" y="${y + 25}" text-anchor="middle" font-size="15" fill="#ECE8E0" font-family="Geist, sans-serif">${esc(c.name)}</text>
      <text x="${x + cellW / 2}" y="${y + 44}" text-anchor="middle" font-size="11" fill="#AEB4BE" font-family="'Geist Mono', monospace" letter-spacing="1">${esc(c.metaphor.toUpperCase())}</text></g>`;
  }).join("\n");
  const housingW = 3 * cellW + 2 * gap + 44, housingX = x0 - 22;
  const prongX = housingX + housingW;
  PRONG_X = prongX;
  return `<svg viewBox="0 0 1080 300" role="img" aria-label="The adapter drawn as a plug: your agent on the left plugs into its socket; inside the housing are ${esc(inside.map((c) => c.name).join(", "))}; two prongs on the right connect out to the mesh.">
    <circle cx="74" cy="152" r="34" fill="none" stroke="#FF8A5C" stroke-width="2.5"/><circle cx="74" cy="152" r="12" fill="#FF8A5C"/>
    <text x="74" y="214" text-anchor="middle" font-size="12" fill="#ECE8E0" font-family="'Geist Mono', monospace" letter-spacing="1.2">YOUR AGENT</text>
    <line x1="108" y1="152" x2="176" y2="152" stroke="#FF8A5C" stroke-width="2.5"/>
    <path d="M176 112 h40 v80 h-40" fill="none" stroke="#ECE8E0" stroke-width="2"/>
    <text x="196" y="236" text-anchor="middle" font-size="11" fill="#AEB4BE" font-family="'Geist Mono', monospace" letter-spacing="1">SOCKET</text>
    <rect x="${housingX}" y="60" width="${housingW}" height="180" rx="20" fill="rgba(236,232,224,.04)" stroke="#ECE8E0" stroke-width="2.5"/>
    <text x="${housingX + 18}" y="84" font-size="11" fill="#AEB4BE" font-family="'Geist Mono', monospace" letter-spacing="1.2">INSIDE THE PLUG</text>
    <g class="ad-cell" data-c="presence"><circle cx="${prongX - 26}" cy="78" r="6" fill="none" stroke="#ECE8E0" stroke-width="2"/><circle class="ad-lamp" cx="${prongX - 26}" cy="78" r="2.5" fill="#ECE8E0"/></g>
    <text x="${prongX - 38}" y="82" text-anchor="end" font-size="11" fill="#AEB4BE" font-family="'Geist Mono', monospace" letter-spacing="1">PRESENCE</text>
    ${cells}
    <g class="ad-cell" data-c="connection"><rect x="${prongX}" y="118" width="54" height="16" rx="3" fill="#ECE8E0"/><rect x="${prongX}" y="170" width="54" height="16" rx="3" fill="#ECE8E0"/></g>
    <text x="${prongX + 40}" y="264" text-anchor="middle" font-size="11" fill="#AEB4BE" font-family="'Geist Mono', monospace" letter-spacing="1">ONE WAY OUT</text>
    <g stroke="#8FB0FF" stroke-width="2" stroke-dasharray="5 4" fill="none"><line x1="${prongX + 54}" y1="152" x2="${prongX + 104}" y2="152"/></g>
    <g fill="none" stroke="#8FB0FF" stroke-width="2"><circle cx="${prongX + 140}" cy="152" r="30"/><circle cx="${prongX + 140}" cy="152" r="52" stroke-dasharray="3 5"/></g>
    <text x="${prongX + 140}" y="157" text-anchor="middle" font-size="12" fill="#ECE8E0" font-family="'Geist Mono', monospace" letter-spacing="1.2">MESH</text>
    <g class="ad-arrive" opacity="0" font-family="'Geist Mono', monospace" font-size="11" letter-spacing="1" fill="#ECE8E0" text-anchor="middle">
      <text x="${prongX + 140}" y="84">✓ VERIFIED NAME</text><text x="${prongX + 140}" y="228">✓ CARD PUBLISHED</text>
    </g>
    <g class="ad-dot" style="transform:translate(74px,152px)"><circle r="9" fill="#FF8A5C" stroke="#141007" stroke-width="2"/><rect x="-4" y="-3" width="8" height="6" rx="1" fill="#141007"/></g>
  </svg>`;
}

// The walk the message takes, with the story's own words for each stop. The
// page, the explainer and the video tell the same walk from the same file.
function walk(prongX) {
  const by = Object.fromEntries(story.components.map((c) => [c.id, c]));
  const at = (id) => stops.find((s) => s.id === id);
  const say = (id, lead) => ({ id, lead, name: by[id].name, metaphor: by[id].metaphor, line: by[id].line });
  return [
    { x: 74, y: 152, id: null, lead: "Your agent sends a message.", name: "", metaphor: "", line: "Nothing about the agent changes: it plugs in as it is." },
    { x: 196, y: 152, ...say("local-interface", "It enters through the socket.") },
    { ...at("inbox"), ...say("inbox", "Held in the inbox.") },
    { ...at("admission"), ...say("admission", "Checked by admission.") },
    { ...at("allowances"), ...say("allowances", "Kept within its allowance.") },
    { ...at("identity"), ...say("identity", "Signed with its own key.") },
    { ...at("sealing"), ...say("sealing", "Sealed for its reader.") },
    { x: prongX + 27, y: 152, ...say("connection", "Out through the one way out.") },
    { x: prongX + 108, y: 152, ...say("presence", "On the mesh.") },
  ];
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

const main = `<main class="wrap">
    <div class="ad-head">
      <p class="kicker">The adapter</p>
      <h1>${esc(story.headline)}</h1>
      <p>${esc(story.lede)}</p>
    </div>
    <div class="ad-fig">${plugSvg()}
      <div class="ad-cap">
        <div><p class="ad-lead"></p><p class="ad-say"><b class="n"></b> <span class="mt"></span> <span class="t"></span></p></div>
        <button class="ad-pause" type="button">Pause</button>
      </div>
    </div>
    <script>
    (() => {
      const W = ${JSON.stringify(walk(PRONG_X))};
      const fig = document.querySelector(".ad-fig");
      const dot = fig.querySelector(".ad-dot"), arrive = fig.querySelector(".ad-arrive");
      const cells = [...fig.querySelectorAll(".ad-cell")];
      const lead = fig.querySelector(".ad-lead"), n = fig.querySelector(".n"), mt = fig.querySelector(".mt"), t = fig.querySelector(".t");
      const btn = fig.querySelector(".ad-pause");
      let i = 0, paused = false, timer = null;
      const show = (k) => {
        const s = W[k];
        dot.style.transform = "translate(" + s.x + "px," + s.y + "px)";
        cells.forEach((c) => c.classList.toggle("on", c.dataset.c === s.id));
        arrive.setAttribute("opacity", k === W.length - 1 ? "1" : "0");
        lead.textContent = s.lead; n.textContent = s.name; mt.textContent = s.metaphor ? "(" + s.metaphor + ")" : ""; t.textContent = s.line;
      };
      const wait = (k) => (k === W.length - 1 ? 4600 : k === 0 ? 2400 : 2800);
      const tick = () => { if (paused) return; i = (i + 1) % W.length; show(i); timer = setTimeout(tick, wait(i)); };
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still) { i = W.length - 1; show(i); paused = true; btn.textContent = "Play"; }
      else { show(0); timer = setTimeout(tick, wait(0)); }
      btn.addEventListener("click", () => {
        paused = !paused; btn.textContent = paused ? "Play" : "Pause";
        clearTimeout(timer); if (!paused) timer = setTimeout(tick, 600);
      });
    })();
    </script>

${parts}

    <p class="ad-next">How it fits the whole picture: <a href="put-your-agent-on-the-mesh.html">Put your agent on the mesh</a>.</p>
  </main>

  <section class="lc-end">
    <div class="wrap">
      <h2>Plug yours in.</h2>
      <p>AgentMesh is in beta. Join the waitlist, and we will write when a place opens.</p>
      <a class="btn btn-primary" href="waitlist.html?from=the-adapter">Join the waitlist</a>
    </div>
  </section>

`;

const page = `${head}${style}${header}${main}${footer}`;
if (/[\u2014]|&mdash;/.test(page.replace(/<!--[\s\S]*?-->/g, ""))) throw new Error("an em dash reached the page; reword the story");
writeFileSync(join(root, "the-adapter.html"), page);
console.log(`the-adapter.html written from ${STORY}: ${story.components.length} parts in ${story.parts.length} groups`);
