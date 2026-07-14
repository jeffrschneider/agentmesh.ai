// build-spec.mjs — generate spec.html (wire-styled) from the canonical SPEC.md.
// Usage: node tools/build-spec.mjs [path-to-SPEC.md]
// Default source: ../AgentMesh/SPEC.md (falls back to GitHub raw).
// Regenerate whenever the spec changes; spec.html is a committed artifact.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ?? resolve(ROOT, "../AgentMesh/SPEC.md");
const RAW_URL = "https://raw.githubusercontent.com/jeffrschneider/AgentMesh/main/SPEC.md";

let md, commit = "";
try {
  md = readFileSync(SRC, "utf8");
  try {
    commit = execSync(`git -C "${resolve(ROOT, "../AgentMesh")}" rev-parse --short HEAD`, { encoding: "utf8" }).trim();
  } catch { /* no local repo info */ }
} catch {
  md = await (await fetch(RAW_URL)).text();
}

md = md.replace(/\r\n/g, "\n");

// Pull version/status/date from the header block.
const meta = {};
for (const [k, re] of Object.entries({
  version: /\*\*Version:\*\*\s*(.+)/,
  status: /\*\*Status:\*\*\s*(.+)/,
  date: /\*\*Date:\*\*\s*(.+)/,
})) meta[k] = (md.match(re) ?? [,"?"])[1].trim();

// Drop the md title + version block; the page hero renders them as chips.
const mdBody = md.replace(/^# .*\n+\*\*Version:\*\*[\s\S]*?\*\*Date:\*\*.*\n/, "");
marked.setOptions({ gfm: true, breaks: false });
let body = marked.parse(mdBody);

// Anchor the headings ourselves (stable slugs; marked no longer ships ids).
const slugCount = new Map();
const toc = [];
body = body.replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
  const text = inner.replace(/<[^>]+>/g, "");
  let slug = text.toLowerCase()
    .replace(/&amp;/g, "and").replace(/[^\w\s.§-]/g, "")
    .replace(/\./g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const n = slugCount.get(slug) ?? 0;
  slugCount.set(slug, n + 1);
  if (n) slug = `${slug}-${n}`;
  if (lvl === "2") toc.push({ slug, text });
  return `<h${lvl} id="${slug}">${inner}<a class="hl" href="#${slug}">#</a></h${lvl}>`;
});

const tocHtml = toc.map(t => `<a href="#${t.slug}">${t.text}</a>`).join("\n            ");
const generated = new Date().toISOString().slice(0, 10);

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Specification: AgentMesh</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root{
      --ink:#0A1417; --panel:#0F1D22; --line:#1C2E33;
      --paper:#E7EFEC; --dim:#7C918C; --faint:#4A5D5A;
      --signal:#F2A93B; --verify:#43D6A6; --address:#6BA8FF; --broadcast:#B69CFF;
      --disp:'Space Grotesk', sans-serif;
      --body:'IBM Plex Sans', system-ui, sans-serif;
      --wire:'IBM Plex Mono', ui-monospace, monospace;
    }
    *{ box-sizing:border-box; }
    html{ scroll-behavior:smooth; scroll-padding-top:20px; }
    html,body{ margin:0; }
    body{ background:var(--ink); color:var(--paper); font-family:var(--body);
      font-size:16px; line-height:1.65; -webkit-font-smoothing:antialiased;
      background-image:
        linear-gradient(var(--line) 1px, transparent 1px),
        linear-gradient(90deg, var(--line) 1px, transparent 1px);
      background-size:64px 64px, 64px 64px; background-position:-1px -1px;
    }
    body::before{ content:""; position:fixed; inset:0; z-index:0; pointer-events:none;
      background:
        radial-gradient(80% 45% at 30% 0%, rgba(242,169,59,.10), transparent 60%),
        radial-gradient(70% 50% at 100% 10%, rgba(67,214,166,.08), transparent 55%),
        linear-gradient(180deg, rgba(10,20,23,.72), var(--ink) 62%);
    }
    a{ color:inherit; }
    .layout{ position:relative; z-index:1; display:grid; grid-template-columns:248px 1fr; min-height:100vh; }
    .rail{ border-right:1px solid var(--line); padding:26px 22px; position:sticky; top:0; align-self:start; height:100vh; overflow-y:auto; }
    .brand{ font-family:var(--wire); font-weight:600; font-size:.82rem; letter-spacing:.02em;
      display:flex; align-items:center; gap:9px; color:var(--paper); text-decoration:none; margin-bottom:30px; }
    .brand .dot{ width:9px; height:9px; border-radius:2px; background:var(--signal);
      box-shadow:0 0 0 3px rgba(242,169,59,.15), 8px 0 0 -2px var(--verify), 16px 0 0 -2px var(--address); }
    .rail .grp{ font-family:var(--wire); font-size:.64rem; letter-spacing:.18em; text-transform:uppercase;
      color:var(--faint); margin:16px 0 4px; }
    .rail .grp:first-child{ margin-top:0; }
    .rail nav a{ display:block; font-family:var(--wire); font-size:.8rem; color:var(--dim);
      text-decoration:none; padding:6px 0; border-left:2px solid transparent; padding-left:12px; margin-left:-12px; }
    .rail nav a:hover{ color:var(--paper); }
    .rail nav a.on{ color:var(--paper); border-left-color:var(--signal); }
    .rail .foot{ margin-top:26px; padding-top:18px; border-top:1px solid var(--line);
      font-family:var(--wire); font-size:.72rem; color:var(--faint); }
    .main{ min-width:0; }
    .wrap{ max-width:900px; margin:0 auto; padding:0 40px; }
    .eyebrow{ font-family:var(--wire); font-size:.76rem; letter-spacing:.04em; color:var(--dim); }
    .eyebrow .tag{ color:var(--signal); }
    .hero{ padding:64px 0 30px; border-bottom:1px solid var(--line); }
    .hero .eyebrow{ margin-bottom:18px; display:block; }
    .hero h1{ font-family:var(--disp); font-weight:700; letter-spacing:-.02em;
      font-size:clamp(2rem,4.2vw,2.8rem); margin:0 0 12px; }
    .metas{ display:flex; gap:10px; flex-wrap:wrap; margin:14px 0 0; }
    .metas span{ font-family:var(--wire); font-size:.74rem; color:var(--dim);
      border:1px solid var(--line); border-radius:100px; padding:4px 12px; background:var(--panel); }
    .metas span b{ color:var(--signal); font-weight:600; }
    .canon{ margin-top:14px; font-family:var(--wire); font-size:.76rem; color:var(--faint); }
    .canon a{ color:var(--verify); }

    .toc{ margin:26px 0 0; border:1px solid var(--line); border-radius:12px; background:var(--panel);
      padding:16px 18px; columns:2; column-gap:28px; }
    .toc a{ display:block; font-family:var(--wire); font-size:.78rem; color:var(--dim);
      text-decoration:none; padding:3px 0; break-inside:avoid; }
    .toc a:hover{ color:var(--signal); }

    .spec{ padding:10px 0 70px; }
    .spec h1{ display:none; } /* page hero replaces the md title */
    .spec h2{ font-family:var(--disp); font-weight:700; letter-spacing:-.02em; font-size:1.7rem;
      margin:54px 0 14px; padding-top:22px; border-top:1px solid var(--line); }
    .spec h3{ font-family:var(--disp); font-weight:700; font-size:1.2rem; margin:34px 0 10px; }
    .spec h4{ font-family:var(--disp); font-weight:600; font-size:1.02rem; margin:26px 0 8px; }
    .spec .hl{ opacity:0; margin-left:8px; font-family:var(--wire); font-size:.8em;
      color:var(--signal); text-decoration:none; }
    .spec h2:hover .hl, .spec h3:hover .hl, .spec h4:hover .hl{ opacity:1; }
    .spec p, .spec li{ color:var(--dim); max-width:76ch; }
    .spec strong{ color:var(--paper); font-weight:600; }
    .spec code{ font-family:var(--wire); font-size:.86em; color:var(--verify);
      background:rgba(67,214,166,.07); border:1px solid rgba(67,214,166,.15);
      border-radius:5px; padding:1px 5px; }
    .spec pre{ background:var(--panel); border:1px solid var(--line); border-radius:12px;
      padding:16px 18px; overflow-x:auto; line-height:1.7; }
    .spec pre code{ background:none; border:0; padding:0; color:var(--paper); font-size:.82rem; }
    .spec blockquote{ margin:18px 0; border:1px solid var(--line); border-left:3px solid var(--signal);
      border-radius:10px; background:var(--panel); padding:12px 18px; }
    .spec blockquote p{ margin:6px 0; }
    .spec table{ border-collapse:collapse; margin:18px 0; display:block; overflow-x:auto;
      border:1px solid var(--line); border-radius:10px; }
    .spec th{ font-family:var(--wire); font-size:.72rem; letter-spacing:.1em; text-transform:uppercase;
      color:var(--faint); text-align:left; padding:10px 14px; background:rgba(255,255,255,.015);
      border-bottom:1px solid var(--line); white-space:nowrap; }
    .spec td{ padding:9px 14px; border-bottom:1px solid var(--line); font-size:.9rem;
      color:var(--dim); vertical-align:top; }
    .spec tr:last-child td{ border-bottom:0; }
    .spec td:first-child{ color:var(--paper); font-family:var(--wire); font-size:.84rem; }
    .spec hr{ border:0; border-top:1px solid var(--line); margin:40px 0; }
    .spec a{ color:var(--verify); }
    footer{ padding:14px 0 60px; }
    footer .wrap{ font-family:var(--wire); font-size:.78rem; color:var(--faint); display:flex; gap:14px; }
    footer a{ color:var(--dim); text-decoration:none; }
    @media (max-width:900px){
      .layout{ grid-template-columns:1fr; }
      .rail{ position:static; height:auto; border-right:0; border-bottom:1px solid var(--line); }
      .toc{ columns:1; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="rail">
      <a class="brand" href="index.html"><span class="dot"></span>AGENTMESH</a>
      <nav>
        <div class="grp">learn</div>
        <a href="index.html">/ overview</a>
        <a href="how-it-works.html">/ how-it-works</a>
        <a href="architecture.html">/ architecture</a>
        <a href="topologies.html">/ topologies</a>
        <a href="world-wide-mesh.html">/ world-wide-mesh</a>
        <div class="grp">build</div>
        <a href="getting-started.html">/ getting-started</a>
        <a href="use-cases.html">/ use-cases</a>
        <a href="examples.html">/ examples</a>
        <a href="sdks.html">/ sdks</a>
        <a href="a2a-bridge.html">/ a2a-bridge</a>
        <div class="grp">operate</div>
        <a href="running-a-mesh.html">/ running-a-mesh</a>
        <a href="run-a-test-node.html">/ run-a-test-node</a>
        <div class="grp">reference</div>
        <a class="on" href="spec.html">/ specification</a>
        <a href="reference.html">/ reference</a>
        <a href="faq.html">/ faq</a>
        <a href="claude-code.html">/ claude-code</a>
      </nav>
      <div class="foot">v0.2 · the signed interconnect<br>github.com/jeffrschneider/AgentMesh</div>
    </aside>
    <main class="main">
      <div class="wrap hero">
        <span class="eyebrow"><span class="tag">agentmesh</span> · protocol specification</span>
        <h1>AgentMesh Protocol Specification</h1>
        <div class="metas">
          <span>version <b>${meta.version}</b></span>
          <span>status <b>${meta.status}</b></span>
          <span>date <b>${meta.date}</b></span>
        </div>
        <p class="canon">Rendered ${generated}${commit ? ` from commit <a href="https://github.com/jeffrschneider/AgentMesh/commit/${commit}">${commit}</a>` : ""}.
          The canonical source is
          <a href="https://github.com/jeffrschneider/AgentMesh/blob/main/SPEC.md">SPEC.md on GitHub</a>.</p>
        <div class="toc">
            ${tocHtml}
        </div>
      </div>
      <div class="wrap spec">
${body}
      </div>
      <footer>
        <div class="wrap">
          <span>AgentMesh · open protocol for agent-to-agent communication</span>
          <a href="https://github.com/jeffrschneider/AgentMesh">GitHub ↗</a>
        </div>
      </footer>
    </main>
  </div>
</body>
</html>
`;

writeFileSync(resolve(ROOT, "spec.html"), page);
console.log(`spec.html written: ${(page.length / 1024).toFixed(0)} KB, ${toc.length} sections, ${meta.version} (${meta.date})${commit ? ", commit " + commit : ""}`);
