/* AgentMesh scenario world: the drawing engine shared by the scenarios
   overview and its worked-example pages.

   Everything is drawn as SVG in one 1600 by 720 world: people and their
   agents stand on the ground at y = 700, buildings rise behind them, and the
   mesh runs underneath as a band of nodes. A page describes its own cast,
   journeys and chapters, and calls AMWorld.player() to run it. render(t) is a
   pure function of the clock, so a chapter can be jumped to, paused, shown as
   a still for reduced motion, or drawn again as a still picture elsewhere.

   Colours come from the page's own tokens: amber is you, blue is other
   people and businesses, violet is a software vendor, slate is government,
   mint is delivered. Every pair also differs in shape, never in colour alone. */
(function (root) {
  var W = {};
  var TAU = Math.PI * 2;
  W.TAU = TAU;
  W.GROUND = 700;
  W.AS = 0.82;

  /* ---- small maths ---- */
  function clamp(v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function easeOut(u) { u = clamp(u); return 1 - (1 - u) * (1 - u); }
  function easeBack(u) { u = clamp(u); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
  function bump(t, a, b) { return Math.sin(Math.PI * seg(t, a, b)); }
  function frac(x) { return x - Math.floor(x); }
  function n1(v) { return (+v).toFixed(1); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  W.u = { clamp: clamp, seg: seg, easeInOut: easeInOut, easeOut: easeOut, easeBack: easeBack, bump: bump, frac: frac, n1: n1, esc: esc };

  /* ---- colours, read from the page tokens, and one shared <defs> ---- */
  function cssv(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, p) { var x = rgb(a), y = rgb(b); return '#' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * p).toString(16).padStart(2, '0'); }).join(''); }
  function lum(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
  var PAL = W.PAL = {};
  W.readColors = function () {
    var bg = cssv('--bg', '#F3F4F0'), surface = cssv('--surface', '#FBFBF8'), surface2 = cssv('--surface-2', '#E9ECE6');
    var fg = cssv('--fg', '#0D1B1E'), line = cssv('--line', '#D4DAD3'), strong = cssv('--line-strong', '#B7C1B9');
    var dark = lum(bg) < 0.35;
    var set = { bg: bg, surface: surface, surface2: surface2, fg: fg, line: line, strong: strong, dark: dark,
      amber: cssv('--st-yours', '#F2A93B'), blue: cssv('--st-theirs', '#8AA5FF'), violet: cssv('--st-vendor', '#B9A0FF'), slate: cssv('--st-gov', '#9AABB5'), mint: cssv('--st-ok', '#43D6A6'),
      ink: '#0D1B1E', pill: dark ? mix(surface, '#ffffff', 0.05) : '#FFFFFF' };
    Object.keys(set).forEach(function (k) { PAL[k] = set[k]; });
    var d = '';
    ['amber', 'blue', 'violet', 'slate', 'mint'].forEach(function (k) {
      d += '<linearGradient id="g_' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + mix(PAL[k], '#ffffff', 0.42) + '"/><stop offset="1" stop-color="' + PAL[k] + '"/></linearGradient>';
      PAL['d_' + k] = mix(PAL[k], '#000000', 0.22);
    });
    d += '<linearGradient id="bandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + mix(surface, PAL.amber, dark ? 0.16 : 0.20) + '"/><stop offset="1" stop-color="' + mix(surface, PAL.amber, dark ? 0.26 : 0.34) + '"/></linearGradient>';
    d += '<linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (dark ? mix(surface, '#ffffff', 0.10) : '#FFFFFF') + '"/><stop offset="1" stop-color="' + (dark ? mix(surface, '#ffffff', 0.04) : surface2) + '"/></linearGradient>';
    d += '<radialGradient id="softShadow"><stop offset="0" stop-color="' + (dark ? '#000' : '#3a4a66') + '" stop-opacity="' + (dark ? 0.5 : 0.22) + '"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>';
    PAL.edge = mix(PAL.amber, dark ? '#ffffff' : '#000000', dark ? 0.05 : 0.18);
    PAL.human = dark ? mix(fg, surface, 0.18) : mix(fg, surface, 0.12);
    var host = document.getElementById('am-world-defs');
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.setAttribute('id', 'am-world-defs'); host.setAttribute('width', '0'); host.setAttribute('height', '0'); host.setAttribute('aria-hidden', 'true');
      host.style.position = 'absolute'; host.style.left = '-9999px';
      document.body.appendChild(host);
    }
    host.innerHTML = '<defs>' + d + '</defs>';
  };

  /* ---- the mesh underneath ---- */
  var UP = W.UP = [], LO = W.LO = [], EDGES = [], k;
  for (k = 0; k < 15; k++) UP.push([70 + k * 105, 772 + (k % 2 ? 6 : -4)]);
  for (k = 0; k < 14; k++) LO.push([122 + k * 105, 818 + (k % 2 ? -5 : 4)]);
  for (k = 0; k < UP.length; k++) {
    if (k < UP.length - 1) EDGES.push([UP[k], UP[k + 1]]);
    if (k < LO.length) { EDGES.push([UP[k], LO[k]]); EDGES.push([UP[k + 1], LO[k]]); }
    if (k < LO.length - 1) EDGES.push([LO[k], LO[k + 1]]);
  }
  function nearest(x) { var b = 0, bd = 1e9; UP.forEach(function (p, i) { var d = Math.abs(p[0] - x); if (d < bd) { bd = d; b = i; } }); return b; }
  W.nearest = nearest;
  W.head = function (c) { return [c.x, W.GROUND - 92]; };

  /* ---- journeys, built step by step ---- */
  function Path(kind, at, t0) { this.p = at; this.t = t0; this.pop = t0; this.legs = []; this.kinds = [[0, kind]]; this.thinks = []; this.lands = []; }
  Path.prototype.go = function (b, dur, lift, node) { this.legs.push({ a: this.p, b: b, t0: this.t, t1: this.t + dur, lift: lift, node: node }); this.p = b; this.t += dur; return this; };
  Path.prototype.wait = function (d, who) { if (who) this.thinks.push({ id: who, t0: this.t, t1: this.t + d }); this.legs.push({ a: this.p, b: this.p, t0: this.t, t1: this.t + d, lift: 0 }); this.t += d; return this; };
  Path.prototype.via = function (b, hop) {
    var n0 = nearest(this.p[0]), n1n = nearest(b[0]), dir = n1n >= n0 ? 1 : -1, i;
    this.go(UP[n0], 0.55, 46, 'U' + n0);
    for (i = n0; i !== n1n; i += dir) this.go(UP[i + dir], hop || 0.2, 12, 'U' + (i + dir));
    return this.go(b, 0.55, 46);
  };
  /* a landing: a badge (and optionally a label) where the journey arrives */
  Path.prototype.land = function (id, kind, label, at) { this.lands.push({ id: id, t: this.t, kind: kind || 'delivered', label: label, at: at }); return this; };
  Path.prototype.as = function (kind) { this.kinds.push([this.t, kind]); return this; };
  Path.prototype.end = function (extra) { this.stop = this.t + (extra || 0.35); return this; };
  Path.prototype.kindAt = function (t) { var r = this.kinds[0][1]; this.kinds.forEach(function (q) { if (t >= q[0]) r = q[1]; }); return r; };
  W.Path = Path;

  function bez(a, b, lift, u) { var cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift, v = 1 - u; return [v * v * a[0] + 2 * v * u * cx + u * u * b[0], v * v * a[1] + 2 * v * u * cy + u * u * b[1]]; }
  function payloadAt(j, t) {
    if (t < j.pop || t > j.stop) return null;
    var pos = j.legs[0].a, moving = false, q, lg;
    for (q = 0; q < j.legs.length; q++) {
      lg = j.legs[q];
      if (t >= lg.t0 && t < lg.t1) { pos = bez(lg.a, lg.b, lg.lift, easeInOut((t - lg.t0) / (lg.t1 - lg.t0))); moving = lg.a !== lg.b; break; }
      if (t >= lg.t1) pos = lg.b;
    }
    var last = j.legs[j.legs.length - 1].t1, scale = 1;
    if (t < j.pop + 0.4) scale = easeBack(seg(t, j.pop, j.pop + 0.4));
    else if (t > last) scale = 1 - easeOut(seg(t, last + 0.05, j.stop));
    return { pos: pos, moving: moving, scale: Math.max(0, scale), kind: j.kindAt(t) };
  }
  W.payloadAt = payloadAt;

  /* ---- small drawings ---- */
  function star(x, y, s, rot, col, o) { return '<path transform="translate(' + n1(x) + ',' + n1(y) + ') rotate(' + rot.toFixed(0) + ') scale(' + s.toFixed(2) + ')" d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4Z" fill="' + col + '" fill-opacity="' + o.toFixed(2) + '"/>'; }
  function check(col, w) { return '<path d="M-7,0 L-2,6 L8,-6" fill="none" stroke="' + (col || '#fff') + '" stroke-width="' + (w || 4.5) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function badge(x, y, sc, kind) {
    var inner;
    if (kind === 'screen') inner = '<path d="M0,-17 L14,-11 L14,1 C14,10 7,16 0,19 C-7,16 -14,10 -14,1 L-14,-11 Z" fill="' + PAL.mint + '"/><path d="M-6,1 L-1,6 L7,-4" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (kind === 'mandate') inner = '<circle r="16" fill="' + PAL.violet + '"/><path d="M-8,-3 L0,-9 L8,-3 M-6,-2 V7 M0,-2 V7 M6,-2 V7 M-9,8 H9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
    else if (kind === 'stamp') inner = '<rect x="-15" y="-15" width="30" height="30" rx="6" fill="' + PAL.slate + '"/><path d="M-7,1 L-2,6 L8,-5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (kind === 'ok') inner = '<rect x="-16" y="-16" width="32" height="32" rx="9" fill="' + PAL.amber + '"/>' + check('#fff');
    else if (kind === 'link') inner = '<circle r="16" fill="' + PAL.mint + '"/><path d="M-3,4 a5,5 0 0 1 0,-7 l3,-3 a5,5 0 0 1 7,7 l-1.5,1.5 M3,-4 a5,5 0 0 1 0,7 l-3,3 a5,5 0 0 1 -7,-7 l1.5,-1.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>';
    else if (kind === 'cut') inner = '<rect x="-15" y="-15" width="30" height="30" rx="6" fill="' + PAL.slate + '"/><path d="M-6,-6 L6,6 M6,-6 L-6,6" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
    else if (kind === 'held') inner = '<rect x="-16" y="-16" width="32" height="32" rx="9" fill="' + PAL.amber + '"/><path d="M-9,1 L-6,-7 H6 L9,1 V8 H-9 Z M-9,1 H-4 L-2.5,4 H2.5 L4,1 H9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>';
    else if (kind === 'bell') inner = '<circle r="16" fill="' + PAL.amber + '"/><path d="M-7,4 V-1 a7,7 0 0 1 14,0 V4 l2,3 H-9 Z M-2,9 a2.5,2.5 0 0 0 4,0" fill="#fff"/>';
    else inner = '<circle r="16" fill="' + PAL.mint + '"/>' + check('#fff');
    return '<g transform="translate(' + n1(x) + ',' + n1(y) + ') scale(' + sc.toFixed(3) + ')"><circle r="23" fill="' + PAL.pill + '" stroke="' + PAL.strong + '" stroke-width="1.5"/>' + inner + '</g>';
  }
  W.badge = badge;
  function pill(cx, cy, text, fs, o, align, tone) {
    var w = text.length * fs * 0.56 + fs * 1.3, h = fs * 1.6;
    if (align === 'l') cx += w / 2; else if (align === 'r') cx -= w / 2;
    var stroke = tone ? PAL[tone] : PAL.strong;
    return '<g' + (o != null ? ' opacity="' + clamp(o).toFixed(2) + '"' : '') + '><rect x="' + n1(cx - w / 2) + '" y="' + n1(cy - h / 2 + 2) + '" width="' + n1(w) + '" height="' + n1(h) + '" rx="' + n1(h / 2) + '" fill="' + PAL.fg + '" fill-opacity="0.07"/>' +
      '<rect x="' + n1(cx - w / 2) + '" y="' + n1(cy - h / 2) + '" width="' + n1(w) + '" height="' + n1(h) + '" rx="' + n1(h / 2) + '" fill="' + PAL.pill + '" stroke="' + stroke + '" stroke-width="' + (tone ? 2 : 1) + '"/>' +
      '<text x="' + n1(cx) + '" y="' + n1(cy + fs * 0.35) + '" text-anchor="middle" font-size="' + n1(fs) + '" fill="' + PAL.fg + '">' + esc(text) + '</text></g>';
  }
  W.pill = pill;
  W.pillWidth = function (text, fs) { return text.length * fs * 0.56 + fs * 1.3; };
  /* a building's name, with the relationship (B2C, B2B, B2G) as an amber tag above it */
  W.labelTag = function (cx, cy, text, tagO, tag, fs) {
    var f2 = fs * 0.82, s = pill(cx, cy, text, f2);
    if (tag && tagO > 0.01) s += pill(cx, cy - f2 * 1.8, tag, f2 * 0.85, clamp(tagO), null, 'amber');
    return s;
  };
  /* a speech bubble; side 'r' puts the tail on the right */
  W.bubble = function (x, y, text, fs, o, tag, side) {
    if (o <= 0.01) return '';
    var w = text.length * fs * 0.53 + fs * 1.6, h = fs * 1.9, left = side === 'r' ? x - w : x, g = '';
    g += '<rect x="' + n1(left) + '" y="' + n1(y - h + 3) + '" width="' + n1(w) + '" height="' + n1(h) + '" rx="' + n1(fs * 0.7) + '" fill="' + PAL.fg + '" fill-opacity="0.07"/>';
    g += '<path d="M' + n1(left + fs * 0.7) + ',' + n1(y - h) + ' H' + n1(left + w - fs * 0.7) + ' Q' + n1(left + w) + ',' + n1(y - h) + ' ' + n1(left + w) + ',' + n1(y - h + fs * 0.7) + ' V' + n1(y - fs * 0.7) + ' Q' + n1(left + w) + ',' + n1(y) + ' ' + n1(left + w - fs * 0.7) + ',' + n1(y) +
      (side === 'r' ? ' H' + n1(x - fs * 0.6) + ' L' + n1(x - fs * 0.1) + ',' + n1(y + fs * 0.8) + ' L' + n1(x - fs * 1.6) + ',' + n1(y) : '') +
      ' H' + n1(left + (side === 'r' ? fs * 0.7 : fs * 1.8)) + (side === 'r' ? '' : ' L' + n1(left + fs * 0.4) + ',' + n1(y + fs * 0.8) + ' L' + n1(left + fs * 0.9) + ',' + n1(y)) +
      ' H' + n1(left + fs * 0.7) + ' Q' + n1(left) + ',' + n1(y) + ' ' + n1(left) + ',' + n1(y - fs * 0.7) + ' V' + n1(y - h + fs * 0.7) + ' Q' + n1(left) + ',' + n1(y - h) + ' ' + n1(left + fs * 0.7) + ',' + n1(y - h) + 'Z" fill="' + PAL.pill + '" stroke="' + PAL.strong + '"/>';
    g += '<text x="' + n1(left + fs * 0.8) + '" y="' + n1(y - h / 2 + fs * 0.35) + '" font-size="' + n1(fs) + '" fill="' + PAL.fg + '" style="font-family:var(--body);font-weight:600">' + esc(text) + '</text>';
    if (tag) g += pill(left + (side === 'r' ? w - fs * 0.4 : fs * 0.4), y - h - fs * 0.35, tag, fs * 0.72, null, side === 'r' ? 'r' : 'l', 'amber');
    return '<g opacity="' + clamp(o).toFixed(2) + '">' + g + '</g>';
  };

  /* ---- characters ---- */
  function agentSVG(a, x, ground, s, st) {
    var col = a.color, body = 'url(#g_' + col + ')', dark = PAL['d_' + col], INK = PAL.ink;
    var squash = st.squash || 0, jump = st.jump || 0;
    var bd = { squircle: { cy: -62, w: 104, h: 92, eyeY: -66 }, round: { cy: -58, w: 104, h: 104, eyeY: -62 }, capsule: { cy: -70, w: 84, h: 122, eyeY: -84 }, hat: { cy: -60, w: 100, h: 96, eyeY: -64 } }[a.type];
    var cy = bd.cy, w = bd.w, h = bd.h, ey = bd.eyeY, g = '';
    var armY = cy + 8, aw = w / 2 + 2, armR = st.armR == null ? 12 : st.armR, armL = st.armL == null ? -12 : st.armL;
    g += '<g transform="translate(' + aw + ',' + armY + ') rotate(' + armR.toFixed(0) + ')"><ellipse cx="0" cy="16" rx="11" ry="21" fill="' + dark + '"/></g>';
    g += '<g transform="translate(' + (-aw) + ',' + armY + ') rotate(' + armL.toFixed(0) + ')"><ellipse cx="0" cy="16" rx="11" ry="21" fill="' + dark + '"/></g>';
    g += '<ellipse cx="-22" cy="-6" rx="16" ry="9" fill="' + dark + '"/><ellipse cx="22" cy="-6" rx="16" ry="9" fill="' + dark + '"/>';
    if (a.type === 'round') g += '<path d="M-42,-86 L-38,-124 L-12,-102 Z" fill="' + body + '"/><path d="M42,-86 L38,-124 L12,-102 Z" fill="' + body + '"/><path d="M-37,-95 L-35,-114 L-22,-103 Z" fill="#fff" fill-opacity="0.55"/><path d="M37,-95 L35,-114 L22,-103 Z" fill="#fff" fill-opacity="0.55"/>';
    if (a.type === 'round') g += '<circle cx="0" cy="' + cy + '" r="' + (w / 2) + '" fill="' + body + '"/>';
    else g += '<rect x="' + (-w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (a.type === 'capsule' ? w / 2 : 36) + '" fill="' + body + '"/>';
    g += '<ellipse cx="' + (-w * 0.18) + '" cy="' + (cy - h * 0.30) + '" rx="' + (w * 0.22) + '" ry="' + (h * 0.10) + '" fill="#fff" fill-opacity="0.38"/>';
    if (a.type === 'squircle' && !a.gov) g += '<path d="M0,' + (cy - h / 2) + ' L0,' + (cy - h / 2 - 20) + '" stroke="' + dark + '" stroke-width="5" stroke-linecap="round"/><circle cx="0" cy="' + (cy - h / 2 - 25) + '" r="8" fill="#fff"/>';
    if (a.gov) g += '<path d="M-30,' + (cy - h / 2 + 2) + ' L0,' + (cy - h / 2 - 22) + ' L30,' + (cy - h / 2 + 2) + ' Z" fill="' + dark + '"/><rect x="-26" y="' + (cy - h / 2 - 4) + '" width="52" height="7" rx="2" fill="#fff" fill-opacity="0.7"/>';
    if (a.type === 'capsule') g += '<path d="M0,' + (cy - h / 2) + ' Q8,' + (cy - h / 2 - 22) + ' 24,' + (cy - h / 2 - 20) + '" stroke="' + dark + '" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="26" cy="' + (cy - h / 2 - 21) + '" r="6.5" fill="#fff"/>';
    if (a.type === 'hat') g += '<path d="M-22,' + (cy - h / 2 + 4) + ' L0,' + (cy - h / 2 - 40) + ' L22,' + (cy - h / 2 + 4) + ' Z" fill="' + INK + '" fill-opacity="0.85"/><circle cx="0" cy="' + (cy - h / 2 - 42) + '" r="7" fill="#fff"/>';
    var ex = a.type === 'capsule' ? 17 : 21, lx = (st.lookX || 0) * 4, ly = (st.lookY || 0) * 3.5, blink = st.blink ? 0.12 : 1, sx;
    for (sx = -1; sx <= 1; sx += 2) {
      g += '<g transform="translate(' + (sx * ex) + ',' + ey + ') scale(1,' + blink + ')"><circle r="12" fill="#fff"/><circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="6.6" fill="' + INK + '"/><circle cx="' + (lx + 2.2).toFixed(1) + '" cy="' + (ly - 2.4).toFixed(1) + '" r="2.2" fill="#fff"/></g>';
      g += '<ellipse cx="' + (sx * (ex + 14)) + '" cy="' + (ey + 14) + '" rx="8" ry="5" fill="#fff" fill-opacity="0.4"/>';
    }
    var happy = st.happy || 0, think = st.think || 0;
    if (think > 0.4) g += '<circle cx="0" cy="' + (ey + 18) + '" r="4.5" fill="' + INK + '"/>';
    else if (happy > 0.45) g += '<path d="M-11,' + (ey + 12) + ' Q0,' + (ey + 34) + ' 11,' + (ey + 12) + ' Z" fill="' + INK + '"/><path d="M-6,' + (ey + 21) + ' Q0,' + (ey + 28) + ' 6,' + (ey + 21) + ' Q0,' + (ey + 18) + ' -6,' + (ey + 21) + 'Z" fill="' + PAL.amber + '"/>';
    else g += '<path d="M-9,' + (ey + 14) + ' Q0,' + (ey + 22) + ' 9,' + (ey + 14) + '" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    var sy = s * (1 - squash), sxs = s * (1 + squash), jf = 1 - jump / 260;
    return '<ellipse cx="' + x + '" cy="' + (ground + 4) + '" rx="' + n1(62 * s * jf) + '" ry="' + n1(11 * s * jf) + '" fill="url(#softShadow)"/>' +
      '<g transform="translate(' + n1(x) + ',' + n1(ground - jump) + ') scale(' + sxs.toFixed(3) + ',' + sy.toFixed(3) + ')">' + g + '</g>';
  }
  function personSVG(x, ground, s, st) {
    var c = PAL.human, g = '', wave = st.wave || 0;
    g += '<path d="M-34,0 C-34,-58 -24,-84 0,-84 C24,-84 34,-58 34,0 Z" fill="' + c + '"/>';
    g += '<circle cx="0" cy="-108" r="24" fill="' + c + '"/>';
    g += '<g transform="translate(26,-64) rotate(' + (-30 - 60 * wave).toFixed(0) + ')"><rect x="-7" y="-4" width="14" height="40" rx="7" fill="' + c + '"/></g>';
    if (st.phone) g += '<g transform="translate(-20,-56) rotate(-12)"><rect x="-12" y="-20" width="24" height="38" rx="5" fill="' + PAL.pill + '" stroke="' + PAL.amber + '" stroke-width="3"/><rect x="-7" y="-14" width="14" height="22" rx="2" fill="' + PAL.amber + '" fill-opacity="' + (st.glow ? 0.95 : 0.55) + '"/></g>';
    if (st.laptop) g += '<g transform="translate(0,-40)"><rect x="-40" y="-26" width="80" height="50" rx="6" fill="' + PAL.pill + '" stroke="' + PAL.strong + '" stroke-width="3"/><rect x="-32" y="-18" width="64" height="34" rx="3" fill="' + PAL.blue + '" fill-opacity="' + (st.glow ? 0.7 : 0.35) + '"/><rect x="-50" y="24" width="100" height="8" rx="4" fill="' + PAL.strong + '"/></g>';
    return '<ellipse cx="' + x + '" cy="' + (ground + 4) + '" rx="' + n1(42 * s) + '" ry="' + n1(9 * s) + '" fill="url(#softShadow)"/><g transform="translate(' + n1(x) + ',' + n1(ground - (st.jump || 0)) + ') scale(' + s.toFixed(3) + ')">' + g + '</g>';
  }
  W.agentSVG = agentSVG;
  W.personSVG = personSVG;

  /* ---- things that travel ---- */
  W.payloadSVG = function (p, t, ps) {
    var x = p.pos[0], y = p.pos[1], s = p.scale * ps * (1 + (p.moving ? 0 : 0.04 * Math.sin(t * 8))), wob = p.moving ? Math.sin(t * 12) * 5 : Math.sin(t * 6) * 3, g;
    var am = PAL.amber, amD = PAL.d_amber, bl = PAL.blue;
    function page(lines, seal, sealCol) {
      var q = '<path d="M-22,-28 H12 L24,-16 V28 H-22 Z" fill="#fff" stroke="' + lines + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M12,-28 V-16 H24" fill="none" stroke="' + lines + '" stroke-width="3" stroke-linejoin="round"/><path d="M-13,-10 H12 M-13,0 H14 M-13,10 H4" stroke="' + lines + '" stroke-width="3.2" stroke-linecap="round"/>';
      if (seal) q += '<circle cx="16" cy="20" r="13" fill="' + sealCol + '" stroke="#fff" stroke-width="3"/><path d="M10,20 L14.5,24.5 L22,15" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
      return q;
    }
    switch (p.kind) {
      case 'envelope': g = '<rect x="-29" y="-21" width="58" height="42" rx="9" fill="#fff" stroke="' + am + '" stroke-width="4"/><path d="M-26,-16 L0,4 L26,-16" fill="none" stroke="' + am + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="0" cy="9" r="6" fill="' + am + '"/>'; break;
      case 'envelope-blue': g = '<rect x="-29" y="-21" width="58" height="42" rx="9" fill="#fff" stroke="' + bl + '" stroke-width="4" stroke-dasharray="7 5"/><path d="M-26,-16 L0,4 L26,-16" fill="none" stroke="' + bl + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="0" cy="9" r="6" fill="' + bl + '"/>'; break;
      case 'request': g = '<rect x="-32" y="-25" width="64" height="46" rx="15" fill="' + am + '" stroke="' + amD + '" stroke-width="3"/><path d="M-16,19 L-27,34 L-2,20 Z" fill="' + am + '" stroke="' + amD + '" stroke-width="3" stroke-linejoin="round"/><path d="M-14,17 L-2,17" stroke="' + am + '" stroke-width="6"/><text y="10" text-anchor="middle" font-size="32" font-weight="700" fill="' + PAL.ink + '">?</text>'; break;
      case 'receipt': g = '<path d="M-22,-28 H22 V26 L15,20 L8,26 L0,20 L-8,26 L-15,20 L-22,26 Z" fill="#fff" stroke="' + PAL.mint + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M-12,-14 H12 M-12,-4 H8" stroke="' + PAL.mint + '" stroke-width="3.2" stroke-linecap="round"/><path d="M-7,8 L-2,13 L8,2" fill="none" stroke="' + PAL.d_mint + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'; break;
      case 'card': g = '<rect x="-30" y="-22" width="60" height="44" rx="10" fill="' + bl + '" stroke="' + PAL.d_blue + '" stroke-width="3"/><path d="M-18,-8 H18 M-18,4 H8" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'; break;
      case 'check': g = '<circle r="24" fill="' + PAL.mint + '" stroke="' + PAL.d_mint + '" stroke-width="3"/><path d="M-10,0 L-3,8 L11,-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'; break;
      case 'doc': g = page(bl, false); break;
      case 'signed': g = page(bl, true, PAL.mint); break;
      case 'filing': g = page(PAL.slate, true, PAL.slate); break;
      case 'quote': g = '<rect x="-30" y="-24" width="60" height="48" rx="10" fill="#fff" stroke="' + bl + '" stroke-width="3.5" stroke-dasharray="7 5"/><text y="9" text-anchor="middle" font-size="26" font-weight="700" fill="' + PAL.d_blue + '">$</text>'; break;
      case 'calendar': g = '<rect x="-26" y="-22" width="52" height="46" rx="8" fill="#fff" stroke="' + am + '" stroke-width="3.5"/><path d="M-26,-8 H26" stroke="' + am + '" stroke-width="3.5"/><path d="M-14,-28 V-16 M14,-28 V-16" stroke="' + amD + '" stroke-width="4" stroke-linecap="round"/><rect x="-14" y="0" width="10" height="9" rx="2" fill="' + am + '"/>'; break;
      case 'alert': g = '<circle r="24" fill="' + am + '" stroke="' + amD + '" stroke-width="3"/><path d="M0,-12 V3" stroke="' + PAL.ink + '" stroke-width="5" stroke-linecap="round"/><circle cy="11" r="3.2" fill="' + PAL.ink + '"/>'; break;
      case 'invite': g = '<rect x="-26" y="-26" width="52" height="52" rx="8" fill="#fff" stroke="' + am + '" stroke-width="3.5"/><rect x="-16" y="-16" width="12" height="12" fill="' + PAL.ink + '"/><rect x="4" y="-16" width="12" height="12" fill="' + PAL.ink + '"/><rect x="-16" y="4" width="12" height="12" fill="' + PAL.ink + '"/><rect x="6" y="6" width="5" height="5" fill="' + PAL.ink + '"/><rect x="12" y="12" width="5" height="5" fill="' + PAL.ink + '"/>'; break;
      case 'coin': g = '<circle r="22" fill="' + am + '" stroke="' + amD + '" stroke-width="3"/><circle r="15" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/><text y="8" text-anchor="middle" font-size="22" font-weight="700" fill="' + PAL.ink + '">$</text>'; break;
      default: g = '<circle r="20" fill="' + am + '"/>';
    }
    return '<g transform="translate(' + n1(x) + ',' + n1(y) + ') rotate(' + wob.toFixed(1) + ') scale(' + s.toFixed(3) + ')">' + g + '</g>';
  };
  W.trail = function (j, t, ps) {
    var out = '', kk, pr;
    for (kk = 1; kk <= 6; kk++) { pr = payloadAt(j, t - kk * 0.05); if (pr && pr.moving) out += '<circle cx="' + n1(pr.pos[0]) + '" cy="' + n1(pr.pos[1]) + '" r="' + n1((7 - kk * 0.8) * ps) + '" fill="' + PAL.amber + '" fill-opacity="' + (0.5 - kk * 0.07).toFixed(2) + '"/>'; }
    return out;
  };

  /* a landing: a badge pops above whoever received it, with an optional label */
  W.landing = function (l, t, fs, x, y) {
    var dt = t - l.t, s = '', u, o, i, a, r, pal = [PAL.amber, PAL.mint, PAL.blue, PAL.violet, PAL.amber, PAL.mint];
    if (dt < 0 || dt > 2.6) return '';
    u = seg(dt, 0, 0.35); o = 1 - seg(dt, 1.9, 2.5);
    if (o > 0) s += '<g opacity="' + o.toFixed(2) + '">' + badge(x, y - 26 * easeOut(u), easeBack(u) * 1.05, l.kind) + '</g>';
    if (l.label && o > 0) { var lw = W.pillWidth(l.label, fs), vx0 = W.view ? W.view.x : 0, vx1 = W.view ? W.view.x + W.view.w : 1600; s += pill(clamp(x, vx0 + lw / 2 + 10, vx1 - lw / 2 - 10), y - 70 - 10 * easeOut(u), l.label, fs, o * seg(dt, 0.15, 0.45)); }
    for (i = 0; i < 6; i++) { u = seg(dt, i * 0.04, i * 0.04 + 0.9); if (u <= 0 || u >= 1) continue; a = (i / 6) * TAU; r = 30 + 56 * easeOut(u); s += star(x + Math.cos(a) * r, y - 26 + Math.sin(a) * r * 0.8, 0.8 + 0.3 * (i % 2), i * 30 + u * 90, pal[i], 1 - u); }
    return s;
  };

  /* ---- scenery ---- */
  W.sky = function (t, loop) {
    var out = '', q;
    for (q = 0; q < 9; q++) {
      var bx = 80 + q * 185 + 34 * Math.sin(TAU * (t / loop + q / 9)), by = 180 + ((q * 131) % 420) + 24 * Math.cos(TAU * (t / loop * 2 + q / 5)), br = 36 + (q % 4) * 22;
      out += '<circle cx="' + n1(bx) + '" cy="' + n1(by) + '" r="' + br + '" fill="' + PAL.surface2 + '" fill-opacity="0.55"/>';
    }
    return out + '<path d="M0,' + W.GROUND + ' H1600" stroke="' + PAL.strong + '" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round"/>';
  };
  /* the mesh band, its edges and nodes; nodes a journey just passed glow */
  W.mesh = function (t, journeys, loop) {
    var out = '', nodeE = {};
    journeys.forEach(function (jj) { jj.legs.forEach(function (l) { if (l.node && t >= l.t1) { var en = Math.exp(-(t - l.t1) / 0.5); nodeE[l.node] = Math.max(nodeE[l.node] || 0, en); } }); });
    out += '<ellipse cx="800" cy="852" rx="790" ry="18" fill="url(#softShadow)"/>';
    out += '<path d="M20,795 C20,760 80,748 180,752 C340,758 460,744 620,748 C780,752 900,760 1060,752 C1220,744 1380,752 1500,750 C1560,750 1585,770 1585,795 C1585,828 1550,846 1480,842 C1320,836 1180,850 1020,846 C860,842 740,852 580,848 C420,844 300,852 160,846 C70,846 20,830 20,795 Z" fill="url(#bandG)" stroke="' + PAL.surface + '" stroke-opacity="0.9" stroke-width="3"/>';
    var eg = '', dash = (-frac(t / loop * 60) * 16).toFixed(1);
    EDGES.forEach(function (ed) { eg += '<line x1="' + ed[0][0] + '" y1="' + ed[0][1] + '" x2="' + ed[1][0] + '" y2="' + ed[1][1] + '" stroke="' + PAL.edge + '" stroke-opacity="0.45" stroke-width="3.5"/><line x1="' + ed[0][0] + '" y1="' + ed[0][1] + '" x2="' + ed[1][0] + '" y2="' + ed[1][1] + '" stroke="#fff" stroke-opacity="0.85" stroke-width="3" stroke-dasharray="0.1 16" stroke-dashoffset="' + dash + '"/>'; });
    out += '<g stroke-linecap="round">' + eg + '</g>';
    UP.forEach(function (p, i) { var en = nodeE['U' + i] || 0; if (en > 0.02) out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + n1(14 + 26 * (1 - en)) + '" fill="' + PAL.amber + '" fill-opacity="' + (0.45 * en).toFixed(2) + '"/>'; out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="' + PAL.pill + '" stroke="' + PAL.edge + '" stroke-width="3.5"/>'; });
    LO.forEach(function (p) { out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7.5" fill="' + PAL.pill + '" stroke="' + PAL.edge + '" stroke-width="3"/>'; });
    return out;
  };
  /* the AgentMesh label on the band; it glides between x positions with a short trail */
  W.meshPill = function (x, fs, t, moving) {
    var y = 798 + 5 * Math.sin(t * 1.7), g = '';
    for (var q = 1; q <= 4 && moving > 0.05; q++) g += '<circle cx="' + n1(x - q * 22 * moving) + '" cy="' + n1(y) + '" r="' + n1(7 - q) + '" fill="' + PAL.amber + '" fill-opacity="' + (0.45 * moving * (1 - q / 5)).toFixed(2) + '"/>';
    return g + pill(x, y, 'AgentMesh', fs, null, null, 'amber');
  };
  /* glide a value through stops at given times; returns [value, moving] */
  W.glide = function (t, stops) {
    var v = stops[0][1], mv = 0, q, a, b, u;
    for (q = 1; q < stops.length; q++) {
      a = stops[q - 1]; b = stops[q];
      if (t >= b[0] + b[2]) v = b[1];
      else if (t >= b[0]) { u = easeInOut(seg(t, b[0], b[0] + b[2])); v = a[1] + (b[1] - a[1]) * u; mv = Math.max(mv, Math.sin(Math.PI * seg(t, b[0], b[0] + b[2]))); break; }
      else break;
    }
    return [v, mv];
  };

  /* buildings */
  W.company = function (o, inside, fs, opts) {
    if (o <= 0.01) return '';
    opts = opts || {};
    var G = W.GROUND, g = '';
    g += '<ellipse cx="835" cy="' + (G + 6) + '" rx="340" ry="14" fill="url(#softShadow)"/>';
    if (!opts.frontOnly) {
      g += '<rect x="720" y="430" width="440" height="' + (G - 430) + '" rx="18" fill="' + PAL.surface2 + '" fill-opacity="' + (0.25 + 0.55 * inside).toFixed(2) + '" stroke="' + PAL.strong + '" stroke-width="2.5" stroke-dasharray="' + (inside > 0.5 ? '0' : '10 8') + '"/>';
      g += '<path d="M720,440 L940,384 L1160,440" fill="none" stroke="' + PAL.strong + '" stroke-width="2.5" stroke-linejoin="round" opacity="' + (0.35 + 0.65 * inside).toFixed(2) + '"/>';
      if (inside > 0.02 && !opts.noBoard) {
        g += '<g opacity="' + clamp(inside).toFixed(2) + '"><rect x="752" y="470" width="376" height="42" rx="12" fill="' + PAL.pill + '" stroke="' + PAL.strong + '"/>';
        for (var b = 0; b < 4; b++) g += '<rect x="' + (768 + b * 90) + '" y="482" width="70" height="18" rx="6" fill="' + [PAL.blue, PAL.blue, PAL.violet, PAL.mint][b] + '" fill-opacity="0.55"/>';
        g += '</g>';
      }
    }
    g += '<rect x="520" y="470" width="200" height="' + (G - 470) + '" rx="10" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2.5"/>';
    g += '<rect x="512" y="466" width="216" height="30" rx="9" fill="' + PAL.blue + '" stroke="' + PAL.strong + '" stroke-width="1.5"/><circle cx="534" cy="481" r="7" fill="' + PAL.pill + '"/><rect x="548" y="477" width="80" height="8" rx="4" fill="' + PAL.pill + '" fill-opacity="0.8"/>';
    g += '<rect x="536" y="' + (G - 104) + '" width="34" height="104" rx="5" fill="' + PAL.surface2 + '" stroke="' + PAL.strong + '" stroke-width="2"/><circle cx="563" cy="' + (G - 52) + '" r="3" fill="' + PAL.strong + '"/>';
    g += '<rect x="592" y="540" width="110" height="70" rx="8" fill="' + PAL.surface2 + '" stroke="' + PAL.strong + '" stroke-width="1.5" opacity="0.8"/>';
    var lab = W.labelTag(620, 446, opts.name || 'A company', opts.tagO || 0, opts.tag, fs);
    if (inside > 0.05 && (opts.hideInside || 0) < 0.99 && !opts.frontOnly && opts.insideName !== '') lab += pill(940, 404, opts.insideName || 'Inside the company', fs, inside * (1 - (opts.hideInside || 0)));
    return '<g opacity="' + o.toFixed(2) + '">' + g + lab + '</g>';
  };
  W.otherCompany = function (o, fs, opts) {
    if (o <= 0.01) return '';
    opts = opts || {};
    var G = W.GROUND, g = '<ellipse cx="1286" cy="' + (G + 6) + '" rx="120" ry="12" fill="url(#softShadow)"/>';
    g += '<path d="M1192,' + G + ' V520 L1232,492 V520 L1272,492 V520 L1312,492 V520 L1352,492 V520 L1380,520 V' + G + ' Z" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2.5" stroke-linejoin="round"/>';
    g += '<rect x="1350" y="440" width="18" height="70" rx="3" fill="' + PAL.surface2 + '" stroke="' + PAL.strong + '" stroke-width="2"/>';
    for (var w = 0; w < 3; w++) g += '<rect x="' + (1210 + w * 56) + '" y="548" width="40" height="28" rx="5" fill="' + PAL.blue + '" fill-opacity="0.35" stroke="' + PAL.strong + '" stroke-width="1.5"/>';
    return '<g opacity="' + o.toFixed(2) + '">' + g + W.labelTag(1286, 418, opts.name || 'Another company', opts.tagO == null ? 1 : opts.tagO, opts.tag === undefined ? 'B2B' : opts.tag, fs) + '</g>';
  };
  W.government = function (o, fs, opts) {
    if (o <= 0.01) return '';
    opts = opts || {};
    var G = W.GROUND, g = '<ellipse cx="1492" cy="' + (G + 6) + '" rx="110" ry="12" fill="url(#softShadow)"/>';
    g += '<path d="M1396,522 L1492,468 L1588,522 Z" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2.5" stroke-linejoin="round"/>';
    g += '<rect x="1404" y="522" width="176" height="18" rx="3" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2"/>';
    [1420, 1460, 1524, 1564].forEach(function (cx) { g += '<rect x="' + (cx - 9) + '" y="540" width="18" height="' + (G - 560) + '" rx="3" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2"/>'; });
    g += '<rect x="1396" y="' + (G - 20) + '" width="192" height="20" rx="3" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2"/>';
    return '<g opacity="' + o.toFixed(2) + '">' + g + W.labelTag(1492, 418, opts.name || 'Government', opts.tagO == null ? 1 : opts.tagO, opts.tag === undefined ? 'B2G' : opts.tag, fs) + '</g>';
  };
  /* a small shop or office in the people's part of the world (x is its centre) */
  W.smallPlace = function (x, o, fs, name, tone) {
    if (o <= 0.01) return '';
    var G = W.GROUND, col = PAL[tone || 'blue'], g = '<ellipse cx="' + x + '" cy="' + (G + 6) + '" rx="100" ry="11" fill="url(#softShadow)"/>';
    g += '<rect x="' + (x - 80) + '" y="540" width="160" height="' + (G - 540) + '" rx="10" fill="url(#wallG)" stroke="' + PAL.strong + '" stroke-width="2.5"/>';
    g += '<rect x="' + (x - 88) + '" y="532" width="176" height="24" rx="8" fill="' + col + '" stroke="' + PAL.strong + '" stroke-width="1.5"/>';
    g += '<rect x="' + (x - 60) + '" y="580" width="52" height="40" rx="5" fill="' + PAL.surface2 + '" stroke="' + PAL.strong + '" stroke-width="1.5"/><rect x="' + (x + 12) + '" y="' + (G - 84) + '" width="34" height="84" rx="4" fill="' + PAL.surface2 + '" stroke="' + PAL.strong + '" stroke-width="2"/>';
    return '<g opacity="' + o.toFixed(2) + '">' + g + pill(x, 508, name, fs * 0.82) + '</g>';
  };

  /* ---- the cast, drawn with their reactions to journeys ---- */
  /* cast: [{id, x, person?, color, type, label, mine?, small?, gov?}]
     opts: { journeys, opacity(c), pose(c, t) -> {wave, phone, laptop, glow, armR, happy}, FS, ls } */
  W.drawCast = function (cast, t, opts) {
    var out = '', G = W.GROUND, js = opts.journeys || [];
    var pays = js.map(function (jj) { return payloadAt(jj, t); }).filter(Boolean).map(function (p) { return p.pos; });
    var thinks = [], lands = [];
    js.forEach(function (j) { j.thinks.forEach(function (q) { thinks.push(q); }); j.lands.forEach(function (l) { lands.push(l); }); });
    cast.forEach(function (c, ci) {
      var o = opts.opacity ? opts.opacity(c) : 1;
      if (o <= 0.01) return;
      var pose = (opts.pose && opts.pose(c, t)) || {};
      var think = thinks.some(function (q2) { return q2.id === c.id && t >= q2.t0 && t < q2.t1; }) ? 1 : 0;
      var happy = pose.happy || 0, jump = 0, armR = pose.armR == null ? 12 : pose.armR, armL = -12;
      lands.forEach(function (l) { if (l.id === c.id) { var b = bump(t, l.t, l.t + 1.1); if (b > 0) { if (b > 0.2) { happy = 1; armR = -140; armL = 140; } jump = Math.max(jump, 18 * Math.abs(Math.sin(seg(t, l.t, l.t + 1.1) * Math.PI * 2))); } } });
      var g = '';
      if (c.person) {
        g += personSVG(c.x, G, c.small ? 0.7 : 0.86, { wave: (pose.wave || 0) * (0.6 + 0.4 * Math.sin(t * 12)), phone: pose.phone, laptop: pose.laptop, glow: pose.glow, jump: jump * 0.6 });
      } else {
        var lookX = 0, lookY = 0.3 * Math.sin(t * 0.8 + ci);
        if (pays.length) { var best = null, bd = 1e9; pays.forEach(function (p) { var d = Math.hypot(p[0] - c.x, p[1] - (G - 80)); if (d < bd) { bd = d; best = p; } }); if (best && bd < 380) { lookX = clamp((best[0] - c.x) / 160, -1, 1); lookY = clamp((best[1] - (G - 80)) / 200, -1, 1); } }
        g += agentSVG(c, c.x, G, W.AS, { jump: jump, happy: happy, think: think, armR: armR, armL: armL, lookX: lookX, lookY: lookY, blink: frac(t / 5 + ci * 0.31) < 0.04, squash: 0.025 * Math.sin(TAU * (t / 2.3 + ci * 0.25)) });
        if (think) g += '<g transform="translate(' + (c.x + 34) + ',' + (G - 166) + ')"><rect x="-26" y="-16" width="52" height="30" rx="15" fill="' + PAL.pill + '" stroke="' + PAL.strong + '"/>' + [0, 1, 2].map(function (z) { return '<circle cx="' + (-12 + z * 12) + '" cy="0" r="' + (3.6 + 1.8 * Math.max(0, Math.sin(t * 9 - z * 1.2))).toFixed(1) + '" fill="' + PAL.fg + '"/>'; }).join('') + '</g>';
      }
      if (c.label) g += pill(c.x, G + 26, c.label, Math.min(opts.FS * (opts.labelScale || 0.86), 19 * (opts.ls || 1)), null, null, c.mine ? 'amber' : null);
      out += '<g opacity="' + o.toFixed(2) + '">' + g + '</g>';
    });
    return out;
  };
  /* journeys in flight: trails, payloads and landings (landing positions come from the cast) */
  W.drawJourneys = function (journeys, cast, t, FS, PS, labelOf) {
    var by = {}, out = '';
    cast.forEach(function (c) { by[c.id] = c; });
    journeys.forEach(function (jj) { out += W.trail(jj, t, PS); });
    journeys.forEach(function (jj) { var p = payloadAt(jj, t); if (p) out += W.payloadSVG(p, t, PS); });
    journeys.forEach(function (jj) {
      jj.lands.forEach(function (l) {
        var x, y;
        if (l.at) { x = l.at[0]; y = l.at[1]; } else if (l.id && by[l.id]) { x = by[l.id].x; y = W.GROUND - 196; } else return;
        out += W.landing(l, t, FS, x, y);
      });
    });
    return out;
  };

  /* ---- the player: chapters, scrubber, pause, still pictures ----
     opts: { root (figure.screen), acts [{s,h,d}], loop, viewAt(t), render(t, view, ls),
             rest [t per chapter], steps (ol whose li match the chapters), vignettes [{el, t, view}] } */
  var players = [];
  W.player = function (opts) {
    var root = opts.root, svg = root.querySelector('svg.stage'), box = root.querySelector('.stage-box');
    var chap = root.querySelector('.chap'), chapN = root.querySelector('.chap-n'), chapH = root.querySelector('.chap-h'), chapD = root.querySelector('.chap-d');
    var segs = [].slice.call(root.querySelectorAll('.chapters button')), fills = segs.map(function (b) { return b.querySelector('.fill'); });
    var playBtn = root.querySelector('.play'), steps = opts.steps ? [].slice.call(opts.steps.querySelectorAll(':scope > li')) : [];
    var ACTS = opts.acts, LOOP = opts.loop, LS = 1, lastAct = -1, total = ACTS.length;
    function actAt(t) { var ai = 0, q; for (q = 0; q < ACTS.length; q++) if (t >= ACTS[q].s) ai = q; return ai; }
    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) {}
    var T = opts.start || 0.3, playing = !reduced, onScreen = true;
    var qs = /[?&]t=([0-9.]+)/.exec(location.search);
    if (qs) { T = parseFloat(qs[1]); playing = false; }
    if (reduced) T = opts.rest[opts.rest.length - 1];
    function setPlaying(p) { playing = p; if (playBtn) { playBtn.classList.toggle('paused', !p); playBtn.setAttribute('aria-label', p ? 'Pause the animation' : 'Play the animation'); } }
    function updateUI(t) {
      var ai = actAt(t);
      if (ai !== lastAct) {
        lastAct = ai;
        if (chap) { chap.classList.remove('in'); void chap.offsetWidth; chap.classList.add('in'); }
        if (chapN) chapN.innerHTML = (ai + 1 < 10 ? '0' : '') + (ai + 1) + '<small>/' + (total < 10 ? '0' : '') + total + '</small>';
        if (chapH) chapH.textContent = ACTS[ai].h;
        if (chapD) chapD.textContent = ACTS[ai].d || '';
        segs.forEach(function (b, q) { b.classList.toggle('cur', q === ai); if (q === ai) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        steps.forEach(function (li, q) { li.classList.toggle('now', q === ai); li.classList.toggle('done', q < ai); });
        if (opts.onAct) opts.onAct(ai);
      }
      fills.forEach(function (f, q) { var s = ACTS[q].s, e2 = q < ACTS.length - 1 ? ACTS[q + 1].s : LOOP; f.style.transform = 'scaleX(' + (t >= e2 ? 1 : t <= s ? 0 : (t - s) / (e2 - s)).toFixed(4) + ')'; });
    }
    function draw() {
      var v = opts.viewAt(T);
      svg.setAttribute('viewBox', n1(v.x) + ' ' + n1(v.y) + ' ' + n1(v.w) + ' ' + n1(v.h));
      W.view = v; svg.innerHTML = opts.render(T, v, LS);
      updateUI(T);
    }
    function drawVignettes() {
      (opts.vignettes || []).forEach(function (vg) {
        var w = vg.el.clientWidth || 500, v = vg.view;
        vg.el.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
        vg.el.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        W.view = v; vg.el.innerHTML = opts.render(vg.t, v, clamp(830 / w, 1.4, 2.2));
      });
    }
    function fit() { var w = box.clientWidth || 900; LS = clamp(900 / w, 1, 1.8); }
    function jump(q) { T = playing ? ACTS[q].s + 0.001 : opts.rest[q]; draw(); }
    setPlaying(playing);
    if (playBtn) playBtn.addEventListener('click', function () { setPlaying(!playing); });
    segs.forEach(function (b, q) { b.addEventListener('click', function () { jump(q); }); });
    steps.forEach(function (li, q) {
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', function () { jump(q); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(q); } });
    });
    fit(); draw(); drawVignettes();
    if (window.ResizeObserver) new ResizeObserver(function () { fit(); draw(); }).observe(box);
    window.addEventListener('resize', drawVignettes);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(box);
    var p = { tick: function (dt) { if (playing && onScreen && !document.hidden) { T += dt; if (T >= LOOP) T -= LOOP; draw(); } }, redraw: function () { draw(); drawVignettes(); } };
    players.push(p);
    return p;
  };
  var last = 0;
  function frame(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    players.forEach(function (p) { p.tick(dt); });
    requestAnimationFrame(frame);
  }
  W.start = function () {
    W.readColors();
    function retheme() { W.readColors(); players.forEach(function (p) { p.redraw(); }); }
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme); } catch (err) {}
    if (window.MutationObserver) new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { players.forEach(function (p) { p.redraw(); }); });
    requestAnimationFrame(frame);
  };

  root.AMWorld = W;
})(window);
