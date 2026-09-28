// Builds careers/index.html and careers/core-platform.html from the site's own header and footer (taken from kill-switch.html).
const fs = require("fs");
const root = require("path").resolve(__dirname, "../..") + "/";
const src = fs.readFileSync(root + "kill-switch.html", "utf8");
const up = (s) => s.replace(/(href|src)="(?!https?:|#|mailto:|\.\.\/)([^"]+)"/g, '$1="../$2"');
const header = up(src.slice(src.indexOf('<header class="topbar">'), src.indexOf("</header>") + 9));
const footer = up(src.slice(src.indexOf('<footer class="sitefoot">'), src.indexOf("</footer>") + 9))
  .replace('<a href="../about.html">About us</a>', '<a href="../about.html">About us</a>\n          <a href="./">Careers</a>');
const role = JSON.parse(fs.readFileSync(__dirname + "/core-platform.json", "utf8"));

const head = (title, desc, path) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AgentMesh</title>
  <meta name="description" content="${desc}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AgentMesh">
  <meta property="og:title" content="${title} | AgentMesh">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="https://agentmesh.ai/${path}">
  <meta property="og:image" content="https://agentmesh.ai/brand/png/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../cream.css">
  <style>
    .cr-head{ padding:72px 0 28px; max-width:760px; }
    .cr-head h1{ margin:0 0 18px; font-size:clamp(2.4rem,5vw,4rem); text-wrap:balance; }
    .cr-head .def{ margin:0 0 16px; font-family:var(--disp); font-size:clamp(1.35rem,2.4vw,1.8rem); line-height:1.35; color:var(--paper); max-width:34ch; }
    .cr-head p{ margin:0 0 14px; font-size:1.15rem; line-height:1.6; color:var(--dim); max-width:62ch; }
    .facts{ list-style:none; margin:8px 0 0; padding:0; display:flex; flex-wrap:wrap; gap:10px; }
    .facts li{ font-family:var(--wire); font-size:12px; letter-spacing:.1em; text-transform:uppercase; border:1.5px solid var(--line-2); border-radius:999px; padding:7px 12px; color:var(--dim); }
    .cr-sec{ padding:48px 0; border-top:1px solid var(--line); max-width:760px; }
    .cr-sec h2{ margin:0 0 16px; font-size:clamp(1.7rem,3vw,2.3rem); }
    .cr-sec > p{ margin:0 0 14px; font-size:1.1rem; line-height:1.6; color:var(--dim); max-width:64ch; }
    .own{ list-style:none; margin:18px 0 0; padding:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
    .own li{ border:1.5px solid var(--line-2); border-radius:14px; padding:18px 20px; font-size:1rem; line-height:1.55; color:var(--dim); }
    .own b{ display:block; font-family:var(--wire); font-weight:400; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--paper); margin-bottom:6px; }
    .ticks{ margin:14px 0 0; padding:0 0 0 20px; display:flex; flex-direction:column; gap:10px; font-size:1.05rem; line-height:1.55; color:var(--dim); max-width:66ch; }
    .ticks li::marker{ color:var(--paper); }
    .roles{ list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:14px; }
    .roles a{ display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px 20px; align-items:center; border:1.5px solid var(--line-2); border-radius:16px; padding:22px 24px; text-decoration:none; color:inherit; }
    .roles a:hover, .roles a:focus-visible{ border-color:var(--paper); }
    .roles h3{ margin:0; font-size:1.5rem; }
    .roles p{ margin:0; grid-column:1; font-size:1rem; line-height:1.55; color:var(--dim); max-width:62ch; }
    .roles .go{ grid-row:1 / span 2; grid-column:2; font-family:var(--wire); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--paper); white-space:nowrap; }
    .apply{ padding:56px 0 88px; border-top:1px solid var(--line); }
    .apply h2{ margin:0 0 14px; font-size:clamp(1.8rem,3.2vw,2.5rem); }
    .apply p{ margin:0 0 14px; font-size:1.1rem; line-height:1.6; color:var(--dim); max-width:62ch; }
    .apply .addr{ font-family:var(--wire); font-size:1.05rem; color:var(--paper); user-select:all; }
    @media (max-width:620px){ .cr-head{ padding:44px 0 16px; } .roles a{ grid-template-columns:1fr; } .roles .go{ grid-row:auto; grid-column:1; } }
  </style>
</head>
<body>
  ${header}
`;
const tail = `
  ${footer}
</body>
</html>
`;

const index = head("Careers", "Technical roles at AgentMesh. Each one is product owner, architect and engineer at once.", "careers/") + `
  <main class="wrap">
    <div class="cr-head">
      <p class="kicker">Careers</p>
      <h1>Build the network agents work on.</h1>
      <p>AgentMesh is a small, remote team building the network where agents from different owners and vendors find each other, prove who they are, and get work done under their owners' control.</p>
      <p>Every role here is a product owner, an architect and an engineer at once. You decide what to build, design how it works, and build it, with coding agents doing much of the typing under your direction.</p>
    </div>
    <section class="cr-sec">
      <h2>Open roles</h2>
      <ul class="roles">
        <li><a href="${role.file}"><h3>${role.title}</h3><p>${role.card}</p><span class="go">Read the role</span></a></li>
      </ul>
    </section>
  </main>
` + tail;

const li = (items, cls) => `<ul class="${cls}">\n` + items.map((x) => Array.isArray(x) ? `        <li><b>${x[0]}</b>${x[1]}</li>` : `        <li>${x}</li>`).join("\n") + `\n      </ul>`;
const page = head(role.title, role.description, "careers/" + role.file) + `
  <main class="wrap">
    <div class="cr-head">
      <p class="kicker"><a href="./">Careers</a></p>
      <h1>${role.title}</h1>
      <p class="def">${role.tagline}</p>
      ${role.intro.map((p) => `<p>${p}</p>`).join("\n      ")}
      <ul class="facts">${role.facts.map((f) => `<li>${f}</li>`).join("")}</ul>
    </div>
    <section class="cr-sec">
      <h2>What you will own</h2>
      ${li(role.own, "own")}
    </section>
    <section class="cr-sec">
      <h2>What you bring</h2>
      ${li(role.bring, "ticks")}
    </section>
    <section class="cr-sec">
      <h2>How we work</h2>
      ${role.how.map((p) => `<p>${p}</p>`).join("\n      ")}
    </section>
  </main>
  <section class="apply">
    <div class="wrap">
      <h2>Apply</h2>
      <p>${role.apply}</p>
      <p class="addr">${role.address}</p>
    </div>
  </section>
` + tail;

fs.writeFileSync(root + "careers/index.html", index);
fs.writeFileSync(root + "careers/" + role.file, page);
console.log("written", index.length, page.length);
