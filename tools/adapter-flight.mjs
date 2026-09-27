// The adapter fly-through: one world drawn in SVG, and a timeline a camera
// follows through it, both made from the adapter story (the-adapter.json).
// build-adapter-page.mjs puts the world and the timeline on the page, and
// tools/adapter-flight.client.js plays the timeline in the browser.
//
// The world, left to right: your agent and its plug; the line out through
// the prongs into the mesh, with the mesh's clusters around it and its places
// along it (the transport, an inbox, the file store, naming, the registry,
// the catalog, rooms); the other company's plug, drawn mirrored, and its
// agent. Below it all, the process runner and three agents. The last beat is
// the home page's globe, drawn by the client over the world.
//
// Colour never carries meaning alone: yours is a solid ring, theirs a dashed
// one, a part in use gets a thick outline and a tint, and a place the message
// has passed shows a check and its words.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const up = (s) => esc(String(s).toUpperCase());
const r1 = (v) => Math.round(v * 10) / 10;

const FG = "#ECE8E0", DIM = "#AEB4BE", YOURS = "#FF8A5C", THEIRS = "#8FB0FF", INK = "#141007";
const MONO = "'Geist Mono', monospace", SANS = "Geist, sans-serif";

// The plug's own geometry, as the page has always drawn it.
const CELL_W = 158, CELL_H = 58, GAP = 12, X0 = 262, Y0 = 92;
const HOUSING_X = X0 - 22, HOUSING_W = 3 * CELL_W + 2 * GAP + 44, PRONG_X = HOUSING_X + HOUSING_W;
const LINE_Y = 152;
// The other company's plug is the same drawing mirrored about x = M / 2.
const M = 5186;

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/** One plug. `side` is "a" (yours) or "b" (theirs); map turns the drawing's x into the world's. */
function plug(story, side, map) {
  const inside = story.components.filter((c) => c.part === "inside");
  const mir = side === "b";
  const rx = (x, w) => Math.min(map(x), map(x + w));
  const stops = {};
  const dash = mir ? ' stroke-dasharray="9 6"' : "";
  const cells = inside.map((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = X0 + col * (CELL_W + GAP), y = Y0 + row * (CELL_H + GAP);
    stops[c.id] = { x: map(x + 14), y: y + CELL_H / 2 };
    const cx = map(x + CELL_W / 2);
    return `<g class="ad-cell" data-l="${side}:${esc(c.id)}"><rect x="${rx(x, CELL_W)}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="10" fill="none" stroke="${FG}" stroke-width="1.5"/>
      <text x="${cx}" y="${y + 25}" text-anchor="middle" font-size="15" fill="${FG}" font-family="${SANS}">${esc(c.name)}</text>
      <text x="${cx}" y="${y + 44}" text-anchor="middle" font-size="11" fill="${DIM}" font-family="${MONO}" letter-spacing="1">${up(c.does)}</text></g>`;
  }).join("\n");
  stops["local-interface"] = { x: map(196), y: LINE_Y };
  stops.presence = { x: map(PRONG_X - 26), y: 78 };
  stops.connection = { x: map(PRONG_X + 27), y: LINE_Y };
  const sock = mir ? `M${map(176)} 112 h-40 v80 h40` : `M176 112 h40 v80 h-40`;
  const svg = `<g class="ad-plug" data-plug="${side}">
    <line x1="${map(108)}" y1="${LINE_Y}" x2="${map(176)}" y2="${LINE_Y}" stroke="${mir ? THEIRS : YOURS}" stroke-width="2.5"${mir ? ' stroke-dasharray="6 4"' : ""}/>
    <path d="${sock}" fill="none" stroke="${FG}" stroke-width="2"/>
    <text x="${map(196)}" y="236" text-anchor="middle" font-size="11" fill="${DIM}" font-family="${MONO}" letter-spacing="1">SOCKET</text>
    <rect x="${rx(HOUSING_X, HOUSING_W)}" y="60" width="${HOUSING_W}" height="180" rx="20" fill="rgba(236,232,224,.04)" stroke="${FG}" stroke-width="2.5"${dash}/>
    <text x="${map(HOUSING_X + 18)}" y="84" text-anchor="${mir ? "end" : "start"}" font-size="11" fill="${DIM}" font-family="${MONO}" letter-spacing="1.2">${mir ? "THEIR PLUG" : "INSIDE THE PLUG"}</text>
    <g class="ad-cell" data-l="${side}:presence"><circle cx="${map(PRONG_X - 26)}" cy="78" r="6" fill="none" stroke="${FG}" stroke-width="2"/><circle class="ad-lamp" cx="${map(PRONG_X - 26)}" cy="78" r="2.5" fill="${FG}"/></g>
    <text x="${map(PRONG_X - 38)}" y="82" text-anchor="${mir ? "start" : "end"}" font-size="11" fill="${DIM}" font-family="${MONO}" letter-spacing="1">PRESENCE</text>
    ${cells}
    <g class="ad-cell ad-prongs" data-l="${side}:connection"><rect x="${rx(PRONG_X, 54)}" y="118" width="54" height="16" rx="3" fill="${FG}"/><rect x="${rx(PRONG_X, 54)}" y="170" width="54" height="16" rx="3" fill="${FG}"/></g>
    <text x="${map(PRONG_X + 40)}" y="264" text-anchor="middle" font-size="11" fill="${DIM}" font-family="${MONO}" letter-spacing="1">ONE WAY OUT</text>
  </g>`;
  return { svg, stops };
}

/** An agent: a solid ring for yours, a dashed one for theirs. */
function agent(x, y, r, theirs, label, key, labelY) {
  const stroke = theirs ? THEIRS : YOURS;
  return `<g class="ad-agent${theirs ? " theirs" : ""}"${key ? ` data-l="${key}"` : ""}>
    <circle class="ad-halo" cx="${x}" cy="${y}" r="${r + 12}" fill="none" stroke="${stroke}" stroke-width="2" opacity="0"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${stroke}" stroke-width="2.5"${theirs ? ' stroke-dasharray="7 5"' : ""}/>
    <circle cx="${x}" cy="${y}" r="${Math.round(r * 0.35)}" fill="${stroke}"/>
    ${label ? `<text class="t-agent" x="${x}" y="${labelY ?? y + r + 28}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1.2">${up(label)}</text>` : ""}
  </g>`;
}

/** The pictures for the places along the line, each centred on (x, y). */
const SHAPES = {
  transport: (x, y) => `<rect x="${x - 170}" y="${y - 26}" width="340" height="52" rx="26" fill="rgba(143,176,255,.08)" stroke="${FG}" stroke-width="2.5"/>
    <rect x="${x - 150}" y="${y - 12}" width="300" height="24" rx="12" fill="none" stroke="${FG}" stroke-width="1.5" stroke-dasharray="10 6"/>`,
  inboxes: (x, y) => `<path d="M${x - 150} ${y - 50} h100 l14 22 h72 l14 -22 h100 v100 h-300 z" fill="rgba(236,232,224,.05)" stroke="${FG}" stroke-width="2.5"/>
    <text class="ad-held t-small" data-l="inbox-held" x="${x}" y="${y + 30}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1.2">WAITING FOR ITS READER</text>`,
  files: (x, y) => `<path d="M${x - 100} ${y - 60} v120 a100 26 0 0 0 200 0 v-120" fill="rgba(236,232,224,.05)" stroke="${FG}" stroke-width="2.5"/>
    <ellipse cx="${x}" cy="${y - 60}" rx="100" ry="26" fill="none" stroke="${FG}" stroke-width="2.5"/>
    <text class="t-small" x="${x}" y="${y + 30}" text-anchor="middle" fill="${DIM}" font-family="${MONO}" letter-spacing="1.2">SHARED STORE</text>`,
  naming: (x, y) => `<path d="M${x} ${y - 78} l74 26 v44 c0 44 -36 70 -74 86 c-38 -16 -74 -42 -74 -86 v-44 z" fill="rgba(236,232,224,.05)" stroke="${FG}" stroke-width="2.5"/>
    <text class="t-small" x="${x}" y="${y + 8}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1">NAME</text>`,
  registry: (x, y) => `<rect x="${x - 70}" y="${y - 58}" width="150" height="96" rx="10" fill="none" stroke="${DIM}" stroke-width="2"/>
    <rect x="${x - 86}" y="${y - 44}" width="150" height="96" rx="10" fill="#1B1E25" stroke="${FG}" stroke-width="2.5"/>
    <line x1="${x - 66}" y1="${y - 16}" x2="${x + 30}" y2="${y - 16}" stroke="${FG}" stroke-width="2"/><line x1="${x - 66}" y1="${y + 8}" x2="${x + 44}" y2="${y + 8}" stroke="${DIM}" stroke-width="2"/><line x1="${x - 66}" y1="${y + 30}" x2="${x + 14}" y2="${y + 30}" stroke="${DIM}" stroke-width="2"/>`,
  catalog: (x, y) => [0, 1, 2].flatMap((c) => [0, 1].map((r) => `<rect x="${x - 96 + c * 66}" y="${y - 56 + r * 62}" width="56" height="50" rx="8" fill="${c === 1 && r === 0 ? "rgba(255,138,92,.16)" : "none"}" stroke="${FG}" stroke-width="2"/>`)).join(""),
  rooms: (x, y) => `<rect x="${x - 120}" y="${y - 58}" width="240" height="116" rx="40" fill="rgba(236,232,224,.05)" stroke="${FG}" stroke-width="2.5"/>
    <circle cx="${x - 56}" cy="${y}" r="16" fill="none" stroke="${YOURS}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${THEIRS}" stroke-width="2.5" stroke-dasharray="5 4"/><circle cx="${x + 56}" cy="${y}" r="16" fill="none" stroke="${FG}" stroke-width="2.5"/>`,
};

export function buildFlight(story) {
  const byId = Object.fromEntries(story.components.map((c) => [c.id, c]));
  const placeBy = Object.fromEntries((story.places ?? []).map((p) => [p.id, p]));
  const beats = story.storyboard;
  const beat = (id) => beats.find((b) => b.id === id);
  const B = beats.map((b) => b.id);
  if (B.length !== 7) throw new Error(`the fly-through expects seven beats, the story has ${B.length}`);

  const A = plug(story, "a", (x) => x);
  const P = plug(story, "b", (x) => M - x);

  // ── the timeline ────────────────────────────────────────────────────────
  const cam = [], dot = [], tw = [], lights = [], caps = [], starts = [];
  const C = (t, cx, cy, w, h, lin) => cam.push({ t: r1(t), cx: r1(cx), cy: r1(cy), w: r1(w), h: r1(h), ...(lin ? { lin: 1 } : {}) });
  const D = (t, x, y, lin) => dot.push({ t: r1(t), x: r1(x), y: r1(y), ...(lin ? { lin: 1 } : {}) });
  const L = (key, t0, t1) => lights.push({ key, t0: r1(t0), t1: r1(t1) });
  const part = (id) => ({ name: byId[id].name, line: byId[id].line });
  const place = (id) => ({ name: placeBy[id].name, line: placeBy[id].line });
  const capsFor = []; // [t0, t1, sub]
  const S = (t0, t1, sub) => capsFor.push([r1(t0), r1(t1), sub]);

  // b1: close on your agent, working alone.
  let t = 0;
  starts.push(t);
  C(0, 74, 152, 250, 190);
  C(4.6, 90, 152, 280, 210);
  // b2: the plug slides on, and the camera flies inside it with the message.
  t = 5;
  starts.push(t);
  tw.push({ sel: '[data-plug="a"]', kind: "x", keys: [{ t: 0, v: 300 }, { t: 5.0, v: 300 }, { t: 6.4, v: 0 }] });
  tw.push({ sel: '[data-plug="a"]', kind: "op", keys: [{ t: 0, v: 0 }, { t: 5.0, v: 0 }, { t: 5.9, v: 1 }] });
  C(6.6, 330, 152, 640, 340);
  const dotOp = { sel: ".ad-dot", kind: "op", keys: [{ t: 0, v: 0 }, { t: 6.4, v: 0 }, { t: 6.8, v: 1 }] };
  tw.push(dotOp);
  D(0, 74, LINE_Y); D(6.8, 74, LINE_Y);
  let s = 6.8;
  const walk = beat(B[1]).focus;
  for (const id of walk) {
    const at = A.stops[id];
    D(s + 0.8, at.x, at.y);
    C(s + 0.8, at.x + 40, Math.max(at.y, 120), 400, 250);
    L(`a:${id}`, s + 0.7, s + 2.3);
    S(s + 0.7, s + 2.3, part(id));
    s += 2.3;
    D(s, at.x, at.y);
  }
  // b3: out through the prongs, pull back to the whole mesh, then the
  // machinery underneath: the transport, an inbox, the file store.
  t = s;
  starts.push(t);
  const out = A.stops.connection;
  D(t + 0.8, out.x, out.y); C(t + 0.8, out.x + 60, 160, 520, 340);
  L("a:connection", t + 0.7, t + 2.6); S(t + 0.7, t + 2.6, part("connection"));
  D(t + 2.6, out.x, out.y);
  C(t + 2.9, 2560, 130, 4400, 2500);       // the pull back: clusters joined into one mesh
  C(t + 4.4, 2560, 130, 4400, 2500);
  tw.push({ sel: ".ad-meshword", kind: "op", keys: [{ t: 0, v: 0 }, { t: t + 2.6, v: 0 }, { t: t + 3.1, v: 1 }, { t: t + 4.4, v: 1 }, { t: t + 4.9, v: 0 }] });
  const PL = PLACES;
  const pass = (id, tt) => { L(`p:${id}`, tt, TEND_B5); };
  let u = t + 4.4;
  // the transport
  const tr = PL.transport;
  C(u + 1.6, tr.x + 60, 170, 980, 720); D(u + 1.6, tr.x, LINE_Y);
  pass("transport", u + 1.5); S(u + 1.5, u + 4.2, place("transport"));
  u += 4.2; D(u, tr.x, LINE_Y);
  // the inbox: the message goes in, waits, and is delivered
  const ib = PL.inboxes;
  C(u + 1.0, ib.x + 60, 250, 980, 720); D(u + 1.0, ib.x, LINE_Y); D(u + 1.6, ib.x, ib.y - 8);
  pass("inboxes", u + 1.5); S(u + 1.4, u + 5.0, place("inboxes"));
  L("inbox-held", u + 1.6, u + 3.6);
  u += 3.6; D(u, ib.x, ib.y - 8); D(u + 0.6, ib.x, LINE_Y); u += 0.6;
  // the file: pieces into the store, the message carries only a reference
  const fl = PL.files;
  C(u + 1.2, fl.x + 40, 60, 980, 720); D(u + 1.2, fl.x - 60, LINE_Y);
  pass("files", u + 1.1); S(u + 1.0, u + 4.6, place("files"));
  const fu = u + 1.3;
  [0, 1, 2].forEach((k) => {
    tw.push({ sel: `.ad-piece[data-k="${k}"]`, kind: "xy", keys: [{ t: 0, v: [fl.x - 250, fl.y - 30] }, { t: fu + k * 0.35, v: [fl.x - 250, fl.y - 30] }, { t: fu + 1.1 + k * 0.35, v: [fl.x - 30 + k * 30, fl.y - 20] }] });
    tw.push({ sel: `.ad-piece[data-k="${k}"]`, kind: "op", keys: [{ t: 0, v: 0 }, { t: fu - 0.2, v: 0 }, { t: fu, v: 1 }, { t: fu + 1.1 + k * 0.35, v: 1 }, { t: fu + 1.5 + k * 0.35, v: 0 }] });
  });
  tw.push({ sel: ".ad-file", kind: "op", keys: [{ t: 0, v: 0 }, { t: fu - 0.6, v: 0 }, { t: fu - 0.2, v: 1 }, { t: fu + 2.0, v: 1 }, { t: fu + 2.4, v: 0.25 }] });
  const refOn = fu + 2.2;
  tw.push({ sel: ".ad-ref", kind: "op", keys: [{ t: 0, v: 0 }, { t: refOn, v: 0 }, { t: refOn + 0.3, v: 1 }] });
  u += 4.6; D(u, fl.x - 60, LINE_Y);
  // b4: on along the line past the mesh's own services.
  t = u;
  starts.push(t);
  for (const id of beat(B[3]).places ?? []) {
    const p = PL[id];
    C(t + 1.1, p.x + 60, p.y < LINE_Y ? 60 : 250, 980, 720); D(t + 1.1, p.x, LINE_Y);
    pass(id, t + 1.0); S(t + 0.9, t + 2.7, place(id));
    t += 2.7; D(t, p.x, LINE_Y);
  }
  // b5: into the other company's plug; its admission lets the message through.
  starts.push(t);
  const pin = P.stops.connection, adm = P.stops.admission;
  C(t + 1.2, pin.x - 40, 160, 520, 340); D(t + 1.2, pin.x, pin.y);
  L("b:connection", t + 1.1, t + 2.6); S(t + 1.1, t + 2.6, part("connection"));
  D(t + 2.2, pin.x, pin.y);
  C(t + 3.0, adm.x - 20, 150, 430, 270); D(t + 3.0, adm.x, adm.y);
  L("b:admission", t + 2.9, t + 5.4); L("b-allowed", t + 3.2, t + 7.6); S(t + 2.6, t + 5.4, part("admission"));
  D(t + 5.0, adm.x, adm.y);
  const theirs = { x: M - 74, y: LINE_Y };
  C(t + 6.0, theirs.x - 70, 152, 620, 340); D(t + 6.0, theirs.x, theirs.y);
  L("their-agent", t + 6.0, t + 7.8);
  t += 7.8;
  dotOp.keys.push({ t: r1(t - 0.4), v: 1 }, { t: r1(t), v: 0 });
  const TEND_B5v = t;
  // b6: widen; the process runner hands one piece of work to three agents
  // (one of them a partner's), and the pieces come back as one result.
  starts.push(t);
  C(t + 1.8, 2900, 650, 5200, 2600);
  C(t + 3.2, RUN.cx - 20, RUN.cy, 1110, 720);
  const w0 = t + 3.6;
  L("runner", w0 - 0.2, w0 + 5.2);
  RUN.agents.forEach((a, k) => {
    const d = k * 0.25;
    tw.push({ sel: `.ad-work[data-k="${k}"]`, kind: "xy", keys: [{ t: 0, v: [RUN.rx, RUN.cy] }, { t: w0 + d, v: [RUN.rx, RUN.cy] }, { t: w0 + 1.3 + d, v: [a.x - 50, a.y] }, { t: w0 + 2.6 + d, v: [a.x - 50, a.y] }, { t: w0 + 3.9 + d, v: [RUN.ox, RUN.cy] }] });
    tw.push({ sel: `.ad-work[data-k="${k}"]`, kind: "op", keys: [{ t: 0, v: 0 }, { t: w0 - 0.1, v: 0 }, { t: w0 + 0.1, v: 1 }, { t: w0 + 3.9 + d, v: 1 }, { t: w0 + 4.2 + d, v: 0 }] });
    L(`b6:${k}`, w0 + 1.3 + d, w0 + 2.7 + d);
  });
  L("result", w0 + 4.3, w0 + 6.4);
  t = w0 + 6.4;
  // b7: pull out until the mesh is the turning globe.
  starts.push(t);
  C(t + 0.2, RUN.cx - 20, RUN.cy, 1120, 740);
  C(t + 3.2, 2600, 600, 140000, 80000);
  tw.push({ sel: ".ad-w", kind: "op", keys: [{ t: 0, v: 1 }, { t: t + 1.6, v: 1 }, { t: t + 2.6, v: 0 }] });
  const GLOBE = r1(t + 1.3);
  const T = r1(t + 7.6);

  // Placeholders resolved now that the ends are known.
  for (const l of lights) if (l.t1 === TEND_B5) l.t1 = r1(TEND_B5v);
  const beatCaps = starts.map((s0, i) => ({ t0: r1(s0), t1: r1(starts[i + 1] ?? T), n: i + 1, says: beats[i].says }));

  const timeline = { T, GLOBE, total: beats.length, cam, dot, tw, lights, beats: beatCaps, subs: capsFor.map(([t0, t1, sub]) => ({ t0, t1, ...sub })) };

  // ── the world ───────────────────────────────────────────────────────────
  const clusters = CLUSTERS.map((c, i) => {
    const nodes = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2 + hash(i * 31 + k) * 0.6;
      const rr = 0.35 + hash(i * 17 + k * 3) * 0.55;
      return { x: c.x + Math.cos(a) * c.rx * rr, y: c.y + Math.sin(a) * c.ry * rr, th: hash(i * 7 + k) < 0.35 };
    });
    const links = nodes.map((n, k) => { const m = nodes[(k + 3) % 8]; return `<line x1="${r1(n.x)}" y1="${r1(n.y)}" x2="${r1(m.x)}" y2="${r1(m.y)}"/>`; }).join("");
    const dots = nodes.map((n) => `<circle cx="${r1(n.x)}" cy="${r1(n.y)}" r="14" fill="#1B1E25" stroke="${n.th ? THEIRS : FG}" stroke-width="3"${n.th ? ' stroke-dasharray="6 5"' : ""}/>`).join("");
    return `<g class="ad-cluster"><ellipse cx="${c.x}" cy="${c.y}" rx="${c.rx}" ry="${c.ry}" fill="rgba(143,176,255,.05)" stroke="rgba(236,232,224,.4)" stroke-width="3" stroke-dasharray="14 10"/>
      <g stroke="rgba(236,232,224,.3)" stroke-width="2.5">${links}</g>${dots}
      <text class="t-tag" x="${c.x}" y="${c.y - c.ry - 22}" text-anchor="middle" fill="${DIM}" font-family="${MONO}" letter-spacing="2">${c.label}</text></g>`;
  }).join("\n");
  const joins = JOINS.map(([a, b]) => { const p = CLUSTERS[a], q = b === "line" ? null : CLUSTERS[b];
    return q ? `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>` : `<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${LINE_Y}"/>`; }).join("");

  const places = Object.entries(PLACES).map(([id, p]) => {
    const pl = placeBy[id];
    if (!pl) throw new Error(`the story has no place called ${id}`);
    const above = p.y < LINE_Y;
    const edge = above ? p.y + 90 : p.y - 90;
    const nameY = above ? p.y - 150 : p.y + 150, tagY = above ? p.y - 106 : p.y + 194;
    const stub = id === "transport" ? "" : `<line x1="${p.x}" y1="${LINE_Y}" x2="${p.x}" y2="${edge}" stroke="${THEIRS}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
    const ny = id === "transport" ? p.y - 70 : nameY, ty = id === "transport" ? p.y + 92 : tagY;
    return `<g class="ad-place" data-l="p:${id}">${stub}<g class="ad-shape">${SHAPES[id](p.x, p.y)}</g>
      <text class="t-lab" x="${p.x}" y="${ny}" text-anchor="middle" fill="${FG}" font-family="${SANS}">${esc(pl.name)}</text>
      <text class="t-tag ad-tag" x="${p.x}" y="${ty}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1.5">✓ ${up(pl.tag)}</text></g>`;
  }).join("\n");

  const lab = beat(B[5]).labels ?? {};
  const runLab = beat(B[5]).labels?.runner ?? "The process runner";
  const their = beat(B[4]).labels?.their_agent ?? "Another company's agent";
  const miniPlug = (x, y, theirs) => `<g><rect x="${x - 86}" y="${y - 16}" width="36" height="32" rx="6" fill="none" stroke="${FG}" stroke-width="2.5"${theirs ? ' stroke-dasharray="6 4"' : ""}/><rect x="${x - 102}" y="${y - 10}" width="16" height="6" rx="2" fill="${FG}"/><rect x="${x - 102}" y="${y + 4}" width="16" height="6" rx="2" fill="${FG}"/><line x1="${x - 50}" y1="${y}" x2="${x - 36}" y2="${y}" stroke="${FG}" stroke-width="2.5"/></g>`;
  const runner = `<g class="ad-run">
    <g stroke="${THEIRS}" stroke-width="2.5" stroke-dasharray="7 6" fill="none">
      ${RUN.agents.map((a) => `<path d="M${RUN.rx + 70} ${RUN.cy} C${RUN.rx + 150} ${RUN.cy} ${a.x - 200} ${a.y} ${a.x - 102} ${a.y}"/><path d="M${a.x + 38} ${a.y} C${a.x + 120} ${a.y} ${RUN.ox - 170} ${RUN.cy} ${RUN.ox - 90} ${RUN.cy}"/>`).join("")}
    </g>
    <g data-l="runner" class="ad-box"><path d="M${RUN.rx - 70} ${RUN.cy} l35 -60 h70 l35 60 l-35 60 h-70 z" fill="#1B1E25" stroke="${FG}" stroke-width="3"/>
      <text class="t-small" x="${RUN.rx}" y="${RUN.cy + 6}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1">RUNNER</text></g>
    <text class="t-lab" x="${RUN.rx}" y="${RUN.cy + 110}" text-anchor="middle" fill="${FG}" font-family="${SANS}">${esc(runLab)}</text>
    ${RUN.agents.map((a, k) => `${miniPlug(a.x - 0, a.y, a.theirs)}${agent(a.x, a.y, 36, a.theirs, (lab.agents ?? [])[k] ?? "", `b6:${k}`, a.y - 56)}`).join("\n")}
    <g data-l="result" class="ad-box"><rect x="${RUN.ox - 90}" y="${RUN.cy - 50}" width="180" height="100" rx="14" fill="#1B1E25" stroke="${FG}" stroke-width="3"/>
      <text class="t-small" x="${RUN.ox}" y="${RUN.cy + 6}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1">${up(lab.result ?? "One result")}</text>
      <text class="t-tag ad-tag" x="${RUN.ox}" y="${RUN.cy + 96}" text-anchor="middle" fill="${FG}" font-family="${MONO}" letter-spacing="1.5">✓ BACK TOGETHER</text></g>
    ${RUN.agents.map((_, k) => `<g class="ad-work" data-k="${k}" opacity="0"><rect x="-13" y="-13" width="26" height="26" rx="5" fill="${YOURS}" stroke="${INK}" stroke-width="2.5"/></g>`).join("")}
  </g>`;

  const world = `<g class="ad-w">
    <g class="ad-mesh"><g stroke="rgba(236,232,224,.22)" stroke-width="3" stroke-dasharray="14 10">${joins}</g>${clusters}</g>
    <text class="ad-meshword t-big" x="2560" y="-960" text-anchor="middle" fill="${FG}" font-family="${SANS}" opacity="0">Clusters in many regions, joined into one mesh</text>
    <line x1="${PRONG_X + 54}" y1="${LINE_Y}" x2="${M - PRONG_X - 54}" y2="${LINE_Y}" stroke="${THEIRS}" stroke-width="3" stroke-dasharray="10 7"/>
    ${places}
    <g class="ad-file" opacity="0"><path d="M${PLACES.files.x - 280} ${PLACES.files.y - 70} h44 l16 16 v64 h-60 z" fill="#1B1E25" stroke="${FG}" stroke-width="2.5"/>
      <text class="t-small" x="${PLACES.files.x - 250}" y="${PLACES.files.y + 36}" text-anchor="middle" fill="${DIM}" font-family="${MONO}" letter-spacing="1">A LARGE FILE</text></g>
    ${[0, 1, 2].map((k) => `<g class="ad-piece" data-k="${k}" opacity="0"><rect x="-11" y="-11" width="22" height="22" rx="3" fill="${FG}" stroke="${INK}" stroke-width="2"/></g>`).join("")}
    ${agent(74, LINE_Y, 34, false, "Your agent", "your-agent", 214)}
    ${A.svg}
    ${P.svg}
    <text class="ad-allowed" data-l="b-allowed" x="${adm.x - 65}" y="258" text-anchor="middle" font-size="13" fill="${FG}" font-family="${MONO}" letter-spacing="1.2">✓ ALLOWED IN</text>
    ${agent(theirs.x, theirs.y, 34, true, their, "their-agent", 214)}
    ${runner}
    <g class="ad-dot" style="transform:translate(74px,${LINE_Y}px)"><circle r="9" fill="${YOURS}" stroke="${INK}" stroke-width="2"/><rect x="-4" y="-3" width="8" height="6" rx="1" fill="${INK}"/>
      <g class="ad-ref" opacity="0"><rect x="12" y="-34" width="52" height="22" rx="5" fill="${INK}" stroke="${FG}" stroke-width="1.5"/><text x="38" y="-18.5" text-anchor="middle" font-size="11" fill="${FG}" font-family="${MONO}" letter-spacing="1">REF</text></g></g>
  </g>`;

  const aria = `An animation in ${beats.length} beats. ${beats.map((b) => b.says).join(" ")}`;
  return { world, timeline, aria };
}

// Placeholders the timeline fills: the lights for passed places stay on until b5 ends.
const TEND_B5 = -1;

// Where the places sit along the line (x) and whether above or below it (y).
const PLACES = {
  transport: { x: 1250, y: LINE_Y },
  inboxes: { x: 1780, y: 400 },
  files: { x: 2300, y: -100 },
  naming: { x: 2800, y: -100 },
  registry: { x: 3220, y: 400 },
  catalog: { x: 3640, y: -100 },
  rooms: { x: 4060, y: 400 },
};
// The mesh's clusters, above and below the line.
const CLUSTERS = [
  { x: 1300, y: -560, rx: 330, ry: 170, label: "CLUSTER · REGION ONE" },
  { x: 2560, y: -700, rx: 380, ry: 180, label: "CLUSTER · REGION TWO" },
  { x: 3860, y: -560, rx: 330, ry: 170, label: "CLUSTER · REGION THREE" },
  { x: 1500, y: 880, rx: 340, ry: 170, label: "CLUSTER" },
  { x: 2700, y: 960, rx: 380, ry: 180, label: "CLUSTER" },
  { x: 3900, y: 880, rx: 330, ry: 170, label: "CLUSTER" },
];
const JOINS = [[0, 1], [1, 2], [3, 4], [4, 5], [0, "line"], [2, "line"], [3, "line"], [5, "line"], [1, "line"], [4, "line"]];
// The process runner's scene, below everything.
const RUN = {
  cx: 2740, cy: 1780, rx: 2380, ox: 3110,
  agents: [
    { x: 2740, y: 1560, theirs: false },
    { x: 2740, y: 1780, theirs: false },
    { x: 2740, y: 2000, theirs: true },
  ],
};
