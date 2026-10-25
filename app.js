(() => {
  const E = window.ELEMENTS;
  const grid = document.getElementById('grid');
  const legend = document.getElementById('legend');
  const overlay = document.getElementById('overlay');
  const modalBody = document.getElementById('modalBody');
  const search = document.getElementById('search');
  const phaseBar = document.getElementById('phaseBar');
  const temp = document.getElementById('temp');
  const tempOut = document.getElementById('tempOut');
  const scale = document.getElementById('scale');
  const blockKey = document.getElementById('blockKey');
  const confToggle = document.getElementById('confToggle');

  /* ---------- classification (11 families, IUPAC-style) ---------- */
  const HALOGENS = new Set([9, 17, 35, 53, 85, 117]);
  const CATS = [
    ['alkali', 'Alkali Metals', 'var(--cat-alkali)'],
    ['alkaline', 'Alkaline Earth Metals', 'var(--cat-alkaline)'],
    ['transition', 'Transition Metals', 'var(--cat-transition)'],
    ['post', 'Post-Transition Metals', 'var(--cat-post)'],
    ['metalloid', 'Metalloids', 'var(--cat-metalloid)'],
    ['nonmetal', 'Reactive Nonmetals', 'var(--cat-nonmetal)'],
    ['halogen', 'Halogens', 'var(--cat-halogen)'],
    ['noble', 'Noble Gases', 'var(--cat-noble)'],
    ['lanthanide', 'Lanthanides', 'var(--cat-lanthanide)'],
    ['actinide', 'Actinides', 'var(--cat-actinide)'],
    ['unknown', 'Unknown Properties', 'var(--cat-unknown)']
  ];
  const MAP = {
    'alkali metal': 'alkali',
    'alkaline earth metal': 'alkaline',
    'transition metal': 'transition',
    'post-transition metal': 'post',
    metalloid: 'metalloid',
    'diatomic nonmetal': 'nonmetal',
    'polyatomic nonmetal': 'nonmetal',
    'noble gas': 'noble',
    lanthanide: 'lanthanide',
    actinide: 'actinide'
  };
  const fam = (e) => (HALOGENS.has(e.n) ? 'halogen' : MAP[e.cat] || 'unknown');
  const famColor = (k) => (CATS.find((c) => c[0] === k) || CATS[10])[2];
  const famLabel = (k) => (CATS.find((c) => c[0] === k) || CATS[10])[1];

  /* ---------- layout: La & Ac sit in group 3; f-block rows are 58–71 / 90–103 ---------- */
  E.forEach((e) => {
    e.gx = e.x; e.gy = e.y;
    if (e.n === 57) { e.gx = 3; e.gy = 6; }
    else if (e.n === 89) { e.gx = 3; e.gy = 7; }
    else if ((e.n >= 58 && e.n <= 71) || (e.n >= 90 && e.n <= 103)) { e.gx = e.x - 1; }
    e.fk = fam(e);
    e.block =
      (e.n >= 57 && e.n <= 71) || (e.n >= 89 && e.n <= 103) ? 'f'
      : e.n <= 2 || e.group === 1 || e.group === 2 ? 's'
      : e.group >= 3 && e.group <= 12 ? 'd'
      : 'p';
  });

  const supers = (c) => (c || '').replace(/([spdf])(\d+)/g, '$1<sup>$2</sup>');
  const BLOCKS = {
    s: ['var(--cat-alkali)', 's-block — outer s orbital filling'],
    p: ['var(--cat-nonmetal)', 'p-block — outer p orbital filling'],
    d: ['var(--cat-transition)', 'd-block — transition metals'],
    f: ['var(--cat-lanthanide)', 'f-block — inner transition']
  };

  const MODES = {
    mass: { label: 'Atomic mass (u)', get: (e) => e.mass, fmt: (v) => v.toFixed(1), sqrt: true },
    en: { label: 'Electronegativity (Pauling)', get: (e) => e.en, fmt: (v) => v.toFixed(2) },
    melt: { label: 'Melting point (K)', get: (e) => e.melt, fmt: (v) => Math.round(v) },
    den: { label: 'Density (g/cm³)', get: (e) => e.den, fmt: (v) => (v < 1 ? v.toFixed(3) : v.toFixed(1)), sqrt: true }
  };
  const RAMP = { period: { label: 'Period', max: 7 }, group: { label: 'Group', max: 18 } };
  const PHASE_COLOR = { solid: 'var(--cat-post)', liquid: 'var(--cat-nonmetal)', gas: 'var(--cat-alkaline)' };

  let mode = 'category';
  const hidden = new Set();
  let selected = null;
  const cells = new Map();

  /* ---------- build ---------- */
  function build() {
    const frag = document.createDocumentFragment();
    E.forEach((e) => {
      const b = document.createElement('button');
      b.className = 'element';
      b.style.gridColumn = e.gx;
      b.style.gridRow = e.gy > 7 ? e.gy + 1 : e.gy;
      b.style.setProperty('--cat-color', famColor(e.fk));
      b.dataset.n = e.n;
      b.setAttribute('role', 'gridcell');
      b.setAttribute('aria-label', `${e.name}, atomic number ${e.n}`);
      b.innerHTML =
        `<span class="el-number">${e.n}</span>` +
        `<span class="el-symbol">${e.s}</span>` +
        `<span class="el-name">${e.name}</span>` +
        `<span class="el-mass">${e.mass.toFixed(2)}</span>` +
        `<span class="el-conf" hidden>${supers(e.conf)}</span>` +
        `<span class="el-val" hidden></span>`;
      b.title = `${e.name} — ${famLabel(e.fk)}`;
      b.addEventListener('click', () => open(e.n));
      cells.set(e.n, b);
      frag.appendChild(b);
    });

    [['57–71 La', 9], ['89–103 Ac', 10]].forEach(([txt, row]) => {
      const l = document.createElement('div');
      l.className = 'block-label';
      l.style.gridRow = row + 1;
      l.style.gridColumn = '1 / 3';
      l.textContent = txt;
      frag.appendChild(l);
    });

    grid.appendChild(frag);

    legend.innerHTML = CATS.map(
      (c) => `<button class="legend-item" data-cat="${c[0]}"><i class="sw" style="background:${c[2]}"></i>${c[1]}</button>`
    ).join('');
    legend.querySelectorAll('.legend-item').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.cat;
        hidden.has(k) ? hidden.delete(k) : hidden.add(k);
        b.classList.toggle('off', hidden.has(k));
        paint();
      })
    );
  }

  /* ---------- paint ---------- */
  const phaseAt = (e, t) => {
    if (e.melt == null && e.boil == null) return null;
    if (e.boil != null && t >= e.boil) return 'gas';
    if (e.melt != null && t >= e.melt) return 'liquid';
    if (e.melt == null) return null;
    return 'solid';
  };
  const heat = (t) => `color-mix(in srgb, var(--heat-hi) ${Math.round(t * 100)}%, var(--heat-lo))`;

  function paint() {
    const q = search.value.trim().toLowerCase();
    const m = MODES[mode];
    let min = 0, max = 1;
    if (m) {
      const vals = E.map(m.get).filter((v) => v != null);
      min = Math.min(...vals); max = Math.max(...vals);
    }
    const t = +temp.value;

    E.forEach((e) => {
      const c = cells.get(e.n);
      const val = c.querySelector('.el-val');
      let color = famColor(e.fk), fill = null, text = '';

      if (mode === 'block') {
        color = BLOCKS[e.block][0];
        text = e.block;
      } else if (mode === 'period' || mode === 'group') {
        const v = mode === 'period' ? e.period : e.group;
        if (v == null) { color = 'var(--cat-unknown)'; text = '—'; }
        else { fill = heat((v - 1) / (RAMP[mode].max - 1)); color = 'var(--color-text)'; text = String(v); }
      } else if (mode === 'phase') {
        const p = phaseAt(e, t);
        color = p ? PHASE_COLOR[p] : 'var(--cat-unknown)';
        text = p || '—';
      } else if (m) {
        const v = m.get(e);
        if (v == null) { color = 'var(--cat-unknown)'; text = '—'; }
        else {
          const norm = (v - min) / (max - min);
          fill = heat(m.sqrt ? Math.sqrt(norm) : norm);
          color = 'var(--color-text)';
          text = m.fmt(v);
        }
      }

      c.style.setProperty('--cat-color', fill || color);
      c.querySelector('.el-symbol').style.color = mode === 'category' || mode === 'block' ? '' : 'var(--color-text)';
      val.hidden = !text;
      val.textContent = text;

      const matches =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.s.toLowerCase().startsWith(q) ||
        String(e.n) === q ||
        famLabel(e.fk).toLowerCase().includes(q);
      c.classList.toggle('dimmed', !(matches && !hidden.has(e.fk)));
    });

    const ramp = RAMP[mode];
    if (m || ramp) {
      scale.hidden = false;
      document.getElementById('scaleMin').textContent = ramp ? `${ramp.label}: 1` : `${m.label}: ${m.fmt(min)}`;
      document.getElementById('scaleMax').textContent = ramp ? String(ramp.max) : m.fmt(max);
    } else scale.hidden = true;

    blockKey.hidden = mode !== 'block';
    if (mode === 'block' && !blockKey.dataset.built) {
      blockKey.innerHTML = Object.entries(BLOCKS)
        .map(([k, [c, label]]) => `<span><i class="sw" style="background:${c}"></i><em>${k}</em> ${label.split('— ')[1]}</span>`)
        .join('');
      blockKey.dataset.built = '1';
    }

    phaseBar.hidden = mode !== 'phase';
    grid.classList.toggle('heat', !!m || !!ramp);
    grid.classList.toggle('vivid', mode === 'category' || mode === 'block');
  }

  /* ---------- modal ---------- */
  function bohr(e) {
    const shells = e.shells || [];
    const w = 320, cx = w / 2, cy = 112, maxR = 96;
    let out = '';
    shells.forEach((count, i) => {
      const r = 22 + ((i + 1) / shells.length) * maxR;
      out += `<circle class="orb" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}"/>`;
      const shown = Math.min(count, 18);
      let dots = '';
      for (let k = 0; k < shown; k++) {
        const a = (k / shown) * Math.PI * 2;
        dots += `<circle class="e" cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="2.6"/>`;
      }
      out += `<g class="spin" style="animation-duration:${(8 + i * 3.5).toFixed(1)}s;animation-direction:${i % 2 ? 'reverse' : 'normal'}">${dots}</g>`;
    });
    out += `<circle class="nuc" cx="${cx}" cy="${cy}" r="11"/>`;
    out += `<text x="${cx}" y="${cy + 3.6}" text-anchor="middle" font-size="9" font-family="JetBrains Mono, monospace" fill="var(--color-surface)" font-weight="700">${e.s}</text>`;
    out += `<text x="${cx}" y="238" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" fill="var(--color-text-faint)">shells: ${shells.join(' · ')}</text>`;
    return `<div class="bohr"><svg viewBox="0 0 ${w} 250" role="img" aria-label="Electron shell diagram for ${e.name}">${out}</svg></div>`;
  }

  const K2C = (k) => (k == null ? null : k - 273.15);
  const num = (v, unit, d = 2) =>
    v == null ? '—' : `${(+v).toLocaleString('en-US', { maximumFractionDigits: d })}${unit ? ' ' + unit : ''}`;

  function open(n) {
    const e = E.find((x) => x.n === n);
    if (!e) return;
    selected = n;
    cells.forEach((c) => c.classList.remove('selected'));
    cells.get(n).classList.add('selected');

    const color = famColor(e.fk);
    const stats = [
      ['Atomic mass', num(e.mass, 'u', 3)],
      ['Group · Period', `${e.group ?? '—'} · ${e.period}`],
      ['Block', `${e.block}-block`],
      ['Electronegativity', e.en == null ? '—' : e.en],
      ['Electron configuration', supers(e.conf) || '—', 1],
      ['Phase at 293 K', e.phase || '—'],
      ['1st ionization energy', num(e.ion, 'kJ/mol', 1)],
      ['Melting point', e.melt == null ? '—' : `${num(e.melt, 'K', 0)} · ${num(K2C(e.melt), '°C', 0)}`],
      ['Boiling point', e.boil == null ? '—' : `${num(e.boil, 'K', 0)} · ${num(K2C(e.boil), '°C', 0)}`],
      ['Density', num(e.den, 'g/cm³', 3)],
      ['Molar heat', num(e.heat, 'J/mol·K')],
      ['Discovered by', e.disc || '—', 1],
      ['Named by', e.named || '—', 1]
    ];

    modalBody.innerHTML =
      `<div class="modal-header" style="--cat-color:${color}">
         <div class="m-top">
           <div class="m-tile" style="--cat-color:${color}"><b>${e.s}</b><i>${e.n}</i></div>
           <div>
             <div class="m-cat" style="--cat-color:${color}">${famLabel(e.fk)}</div>
             <h2 class="m-name">${e.name}</h2>
             ${e.app ? `<div class="m-app">${e.app}</div>` : ''}
           </div>
         </div>
       </div>
       <div class="modal-body" style="--cat-color:${color}">
         ${bohr(e)}
         ${e.sum ? `<p class="m-sum">${e.sum}</p>` : ''}
         <dl class="stats">${stats
           .map(([k, v, wide]) => `<div class="stat${wide ? ' wide' : ''}"><dt>${k}</dt><dd>${v}</dd></div>`)
           .join('')}</dl>
         ${e.src ? `<a class="m-link" href="${e.src}" target="_blank" rel="noopener">Read more on Wikipedia →</a>` : ''}
       </div>`;

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('modal').scrollTop = 0;
  }

  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    cells.forEach((c) => c.classList.remove('selected'));
  }

  /* ---------- events ---------- */
  document.getElementById('close').addEventListener('click', close);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
    if (ev.key === '/' && document.activeElement !== search) { ev.preventDefault(); search.focus(); }
    if (selected && overlay.classList.contains('open') && ev.key.startsWith('Arrow')) {
      const cur = E.find((x) => x.n === selected);
      const dx = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      const dy = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
      const next = E.find((x) => x.gx === cur.gx + dx && x.gy === cur.gy + dy);
      if (next) { ev.preventDefault(); open(next.n); }
    }
  });

  document.querySelectorAll('.mode-chips .mode').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.mode-chips .mode').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      mode = b.dataset.mode;
      paint();
    })
  );

  confToggle.addEventListener('click', () => {
    const on = confToggle.getAttribute('aria-pressed') !== 'true';
    confToggle.setAttribute('aria-pressed', String(on));
    grid.classList.toggle('with-conf', on);
    cells.forEach((c) => { c.querySelector('.el-conf').hidden = !on; });
  });

  search.addEventListener('input', paint);
  temp.addEventListener('input', () => { tempOut.textContent = `${temp.value} K`; paint(); });

  const themeBtn = document.getElementById('theme');
  let theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    paint();
  });

  build();
  paint();
})();
