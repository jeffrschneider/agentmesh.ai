/* The adapter fly-through, played in the browser. FLIGHT (set just before
   this script by build-adapter-page.mjs) is the timeline made from the story:
   camera boxes, the message's path, tweens, lights and captions. The camera
   is the world SVG's viewBox. The last beat is the home page's globe, with
   the hero's own numbers, drawn in a second SVG over the world. */
(function () {
  var F = FLIGHT;
  var fig = document.querySelector('.ad-fig');
  if (!fig) return;
  var stage = fig.querySelector('.ad-stage');
  var svg = fig.querySelector('.ad-world');
  var gsvg = fig.querySelector('.ad-globe');
  var dot = svg.querySelector('.ad-dot');
  var numEl = fig.querySelector('.ad-num'), leadEl = fig.querySelector('.ad-says');
  var nEl = fig.querySelector('.ad-say .n'), mtEl = fig.querySelector('.ad-say .mt'), tEl = fig.querySelector('.ad-say .t');
  var btn = fig.querySelector('.ad-pause');

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
  function easeOut(v) { v = clamp01(v); return 1 - Math.pow(1 - v, 3); }
  function easeBack(v) { v = clamp01(v); var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* Where t falls among keys: the pair around it and how far along. */
  function seg(keys, t) {
    if (t <= keys[0].t) return { a: keys[0], b: keys[0], u: 0 };
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t < b.t) { var u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1; return { a: a, b: b, u: b.lin ? u : ease(u) }; }
    }
    var z = keys[keys.length - 1];
    return { a: z, b: z, u: 0 };
  }
  function lerp(a, b, u) { return a + (b - a) * u; }

  var tweens = F.tw.map(function (w) { return { w: w, els: [].slice.call(svg.querySelectorAll(w.sel)) }; });
  var lit = {};
  F.lights.forEach(function (l) { if (!lit[l.key]) lit[l.key] = [].slice.call(svg.querySelectorAll('[data-l="' + l.key + '"]')); });

  /* ── the globe, as the home page draws it ── */
  var Y = '#FF6B3D', T = '#7C93FF', LABEL = '#FFA177';
  var GN = 150, GR = 208, GCX = 320, GCY = 272, TILT = 0.38, G0 = F.GLOBE;
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  var GP = (function () {
    var pts = [{ x: 0, y: Math.sin(TILT), z: Math.cos(TILT), own: 'y' }];
    for (var i = 0; i < GN; i++) {
      var yy = 1 - (i + 0.5) / GN * 2, r = Math.sqrt(1 - yy * yy), th = i * 2.399963;
      pts.push({ x: Math.cos(th) * r, y: yy, z: Math.sin(th) * r, own: hash(i) < 0.3 ? 't' : 'n' });
    }
    var v0 = pts[0];
    pts.forEach(function (p, i) {
      var d = Math.max(-1, Math.min(1, p.x * v0.x + p.y * v0.y + p.z * v0.z));
      p.ap = i === 0 ? G0 + 0.7 : G0 + 1.0 + (Math.acos(d) / Math.PI) * 3.6 + hash(i + 900) * 0.35;
    });
    return pts;
  })();
  var GE = (function () {
    var seen = {}, out = [];
    for (var i = 0; i < GP.length; i++) {
      var d = [];
      for (var j = 0; j < GP.length; j++) { if (j !== i) d.push({ j: j, v: GP[i].x * GP[j].x + GP[i].y * GP[j].y + GP[i].z * GP[j].z }); }
      d.sort(function (p, q) { return q.v - p.v; });
      for (var m = 0; m < (i === 0 ? 5 : 3); m++) {
        var jj = d[m].j, key = Math.min(i, jj) + '-' + Math.max(i, jj);
        if (seen[key]) continue;
        seen[key] = 1;
        var A = i, B = jj;
        if (GP[A].ap > GP[B].ap) { var tmp = A; A = B; B = tmp; }
        out.push({ a: A, b: B, st: GP[A].ap + 0.05, dur: Math.max(0.35, GP[B].ap - GP[A].ap) });
      }
    }
    return out;
  })();
  function gproj(p, ang) {
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var x = p.x * ca + p.z * sa, z = -p.x * sa + p.z * ca, y = p.y, ct = Math.cos(TILT), st = Math.sin(TILT);
    return { x: x, y: y * ct - z * st, z: y * st + z * ct };
  }
  var gGlow = mk('circle', { fill: 'url(#ad-glow)', stroke: 'rgba(236,232,224,0.08)' }, gsvg);
  var gEdgeG = mk('g', {}, gsvg), gDotG = mk('g', {}, gsvg), gPulseG = mk('g', {}, gsvg);
  var gEdges = GE.map(function () { return mk('line', {}, gEdgeG); });
  var gDots = GP.map(function () { return mk('circle', {}, gDotG); });
  var gPulses = []; for (var pi = 0; pi < 36; pi++) gPulses.push(mk('circle', { r: 2, fill: '#FFF8EE' }, gPulseG));
  var gRing = mk('circle', { fill: 'none', stroke: Y, 'stroke-width': 1.5 }, gsvg);
  var gYou = mk('circle', { fill: Y, stroke: '#FFFFFF', 'stroke-width': 1.5 }, gsvg);
  var gYouLab = mk('text', { 'text-anchor': 'middle', fill: LABEL, 'font-family': "'Geist Mono', monospace", 'font-size': 11, 'letter-spacing': '1.5' }, gsvg);
  gYouLab.textContent = 'YOU';
  function hide(e) { e.setAttribute('visibility', 'hidden'); }
  function show(e) { e.setAttribute('visibility', 'visible'); }

  function drawGlobe(t) {
    var on = t >= G0;
    gsvg.style.opacity = on ? clamp01((t - G0 - 0.2) / 0.8) : 0;
    if (!on) return;
    var Z = 3.2 - 2.2 * easeOut((t - G0) / 2.4), ang = (t - G0) * 0.11;
    var PR = GP.map(function (p) { var q = gproj(p, ang); return { x: GCX + q.x * GR * Z, y: GCY + q.y * GR * Z, z: q.z }; });
    var gR = GR * Z;
    gGlow.setAttribute('cx', GCX); gGlow.setAttribute('cy', GCY); gGlow.setAttribute('r', gR);
    GE.forEach(function (e, i) {
      var el = gEdges[i], A = PR[e.a], B = PR[e.b], zAvg = (A.z + B.z) / 2, dr = easeOut((t - e.st) / e.dur);
      if (zAvg < -0.3 || dr <= 0) return hide(el);
      var dep = (zAvg + 1) / 2, a = 0.05 + 0.3 * dep * dep;
      var col = e.a === 0 ? 'rgba(255,107,61,0.75)' : (GP[e.a].own === 't' && GP[e.b].own === 't' ? 'rgba(124,147,255,' + Math.min(0.8, a * 1.6).toFixed(3) + ')' : 'rgba(236,232,224,' + a.toFixed(3) + ')');
      show(el);
      el.setAttribute('x1', A.x); el.setAttribute('y1', A.y);
      el.setAttribute('x2', A.x + (B.x - A.x) * dr); el.setAttribute('y2', A.y + (B.y - A.y) * dr);
      el.setAttribute('stroke', col); el.setAttribute('stroke-width', e.a === 0 ? 1.5 : 1);
    });
    for (var i = 1; i < GP.length; i++) {
      var el = gDots[i], P = PR[i], gp = GP[i];
      if (P.z < -0.5 || t < gp.ap) { hide(el); continue; }
      var pop = easeBack((t - gp.ap) / 0.4), dep2 = (P.z + 1) / 2, sz = (1.8 + 3.6 * dep2) * pop;
      show(el);
      el.setAttribute('cx', P.x); el.setAttribute('cy', P.y); el.setAttribute('r', Math.max(0, sz / 2));
      el.setAttribute('fill', gp.own === 't' ? T : '#ECE8E0'); el.setAttribute('opacity', (0.2 + 0.75 * dep2).toFixed(3));
    }
    hide(gDots[0]);
    for (var k = 0; k < 36; k++) {
      var pe = gPulses[k];
      if (t <= G0 + 1.6) { hide(pe); continue; }
      var PER = 1.5, u = (t + hash(k + 500) * PER) / PER, cyc = Math.floor(u), fr = u - cyc;
      var ed = GE[(k * 131 + cyc * 977) % GE.length];
      if (t < ed.st + ed.dur + 0.1) { hide(pe); continue; }
      var from = PR[ed.a], to = PR[ed.b];
      if (hash(cyc * 7 + k) < 0.5) { var sw = from; from = to; to = sw; }
      if ((from.z + to.z) / 2 < -0.15) { hide(pe); continue; }
      show(pe);
      pe.setAttribute('cx', from.x + (to.x - from.x) * fr); pe.setAttribute('cy', from.y + (to.y - from.y) * fr);
      pe.setAttribute('opacity', Math.sin(fr * Math.PI).toFixed(3));
    }
    var Y0 = PR[0], yp = Math.max(0, easeBack((t - GP[0].ap) / 0.4));
    var yr = ((t - GP[0].ap) % 1.4 + 1.4) % 1.4;
    gYou.setAttribute('cx', Y0.x); gYou.setAttribute('cy', Y0.y); gYou.setAttribute('r', 6 * yp);
    gRing.setAttribute('cx', Y0.x); gRing.setAttribute('cy', Y0.y); gRing.setAttribute('r', 7 + yr * 22);
    gRing.setAttribute('opacity', t > GP[0].ap ? (0.7 * (1 - yr / 1.4)).toFixed(3) : 0);
    gYouLab.setAttribute('x', Y0.x); gYouLab.setAttribute('y', Y0.y - 22);
    gYouLab.setAttribute('opacity', clamp01((t - GP[0].ap - 0.3) / 0.5));
  }

  /* ── one frame ── */
  var shownBeat = -1, shownSub = null;
  function render(t) {
    // The camera: a box to keep in view, fitted to the stage's shape. Width
    // and height move on a log scale, so a pull back feels like flying.
    var c = seg(F.cam, t), a = c.a, b = c.b, u = c.u;
    var cx = lerp(a.cx, b.cx, u), cy = lerp(a.cy, b.cy, u);
    var w = Math.exp(lerp(Math.log(a.w), Math.log(b.w), u)), h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), u));
    var asp = stage.clientWidth / Math.max(1, stage.clientHeight);
    if (w / h > asp) h = w / asp; else w = h * asp;
    w *= 1.06; h *= 1.06; // a little margin, so labels at a box's edge never touch the stage's
    svg.setAttribute('viewBox', (cx - w / 2).toFixed(1) + ' ' + (cy - h / 2).toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1));

    var d = seg(F.dot, t);
    dot.setAttribute('transform', 'translate(' + lerp(d.a.x, d.b.x, d.u).toFixed(1) + ',' + lerp(d.a.y, d.b.y, d.u).toFixed(1) + ')');
    dot.style.transform = '';

    tweens.forEach(function (x) {
      var s = seg(x.w.keys, t), k = x.w.kind;
      x.els.forEach(function (el) {
        if (k === 'op') el.setAttribute('opacity', lerp(s.a.v, s.b.v, s.u).toFixed(3));
        else if (k === 'x') el.setAttribute('transform', 'translate(' + lerp(s.a.v, s.b.v, s.u).toFixed(1) + ',0)');
        else if (k === 'xy') el.setAttribute('transform', 'translate(' + lerp(s.a.v[0], s.b.v[0], s.u).toFixed(1) + ',' + lerp(s.a.v[1], s.b.v[1], s.u).toFixed(1) + ')');
      });
    });

    var on = {};
    F.lights.forEach(function (l) { if (t >= l.t0 && t < l.t1) on[l.key] = 1; });
    for (var key in lit) lit[key].forEach(function (el) { el.classList.toggle('on', !!on[key]); });

    var bi = 0;
    for (var i = 0; i < F.beats.length; i++) if (t >= F.beats[i].t0) bi = i;
    if (bi !== shownBeat) {
      shownBeat = bi;
      numEl.textContent = F.beats[bi].n + ' / ' + F.total;
      leadEl.textContent = F.beats[bi].says;
    }
    var sub = null;
    for (var j = 0; j < F.subs.length; j++) if (t >= F.subs[j].t0 && t < F.subs[j].t1) sub = F.subs[j];
    if (sub !== shownSub) {
      shownSub = sub;
      nEl.textContent = sub ? sub.name + '.' : '';
      mtEl.textContent = sub && sub.metaphor ? '(' + sub.metaphor + ')' : '';
      tEl.textContent = sub ? sub.line : '';
    }
    drawGlobe(t);
    // A short fade where the loop closes.
    stage.style.opacity = Math.min(1, t / 0.4, (F.T - t) / 0.4).toFixed(3);
  }

  var t = 0, paused = false, onScreen = true, last = performance.now();
  function setPaused(p) {
    paused = p;
    btn.textContent = p ? 'Play' : 'Pause';
    btn.setAttribute('aria-label', p ? 'Play the animation' : 'Pause the animation');
  }
  btn.addEventListener('click', function () { setPaused(!paused); last = performance.now(); });
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }).observe(stage);
  if (window.ResizeObserver) new ResizeObserver(function () { render(t); }).observe(stage);

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  // Reduced motion: the last frame, still, until Play is pressed.
  if (reduced) { t = F.T - 0.5; setPaused(true); }
  render(t);
  window.__adFlight = { seek: function (s) { t = s; render(t); }, pause: function () { setPaused(true); } };
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (paused || !onScreen) return;
    t += dt;
    if (t >= F.T) t = 0;
    render(t);
  }
  requestAnimationFrame(loop);
})();
