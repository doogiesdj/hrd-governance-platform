// ProteGraf — Protege OntoGraf-style dynamic graph viewer
// Search by class name → selected class centered, all relationships shown as colorful dashed edges

const ProteGraf = (() => {
  // ── Ontology schema data (defined in protegraf-constants.js) ───────────────
  const HIERARCHY    = _PG_HIERARCHY;
  const ROOT_CLASSES = _PG_ROOT_CLASSES;
  const OBJECT_PROPS = _PG_OBJECT_PROPS;
  const PALETTE      = _PG_PALETTE;
  const DEPTH_FILL   = _PG_DEPTH_FILL;
  const CLASS_DESC   = _PG_CLASS_DESC;

  function _textColor(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
  }

  const _propColors = new Map();
  let _colorIdx = 0;

  function _edgeColor(prop) {
    if (prop === 'subClassOf') return '#5b9bd5';
    if (!_propColors.has(prop)) {
      _propColors.set(prop, PALETTE[_colorIdx++ % PALETTE.length]);
    }
    return _propColors.get(prop);
  }

  // ── State ───────────────────────────────────────────────────────────────────
  let _centerCls = null;
  let _expanded = new Set();
  let _sim = null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _depthOf(cls) {
    if (cls === 'owl:Thing') return 0;
    let d = 1, cur = cls;
    while (HIERARCHY[cur]) { d++; cur = HIERARCHY[cur]; }
    return d;
  }

  function _childrenOf(cls) {
    return Object.entries(HIERARCHY).filter(([, p]) => p === cls).map(([c]) => c);
  }

  function _propsOf(cls) {
    return OBJECT_PROPS.filter(([s, , t]) => s === cls || t === cls);
  }

  function _allClasses() {
    const s = new Set(ROOT_CLASSES);
    Object.keys(HIERARCHY).forEach(k => s.add(k));
    Object.values(HIERARCHY).forEach(v => s.add(v));
    return [...s].sort();
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  function _doSearch(query, mode) {
    const q = query.trim().toLowerCase();
    const badge = document.getElementById('pg-result-count');
    if (!q) { if (badge) badge.textContent = ''; return; }

    const all = _allClasses();
    let hits;
    if (mode === 'exact')  hits = all.filter(c => c.toLowerCase() === q);
    else if (mode === 'starts') hits = all.filter(c => c.toLowerCase().startsWith(q));
    else hits = all.filter(c => c.toLowerCase().includes(q));

    if (badge) badge.textContent = `${hits.length} result(s) found.`;

    if (hits.length > 0) {
      _centerCls = hits[0];
      _expanded.clear();
      _renderGraph();
      _updateTreeSelection(hits[0]);
    }
  }

  function _doClear() {
    _centerCls = null;
    _expanded.clear();
    const badge = document.getElementById('pg-result-count');
    if (badge) badge.textContent = '';
    _renderGraph();
    _updateTreeSelection(null);
  }

  // ── Tooltip helpers ───────────────────────────────────────────────────────
  function _ttShow(html, event) {
    const tip = document.getElementById('graph-tooltip');
    if (!tip) return;
    tip.innerHTML = html;
    tip.style.display = 'block';
    _ttMove(event);
  }
  function _ttMove(event) {
    const tip = document.getElementById('graph-tooltip');
    if (!tip) return;
    const x = event.clientX + 14, y = event.clientY - 10;
    const tipW = tip.offsetWidth, winW = window.innerWidth;
    tip.style.left = (x + tipW > winW - 10 ? x - tipW - 28 : x) + 'px';
    tip.style.top = Math.max(10, y) + 'px';
  }
  function _ttHide() {
    const tip = document.getElementById('graph-tooltip');
    if (tip) tip.style.display = 'none';
  }

  function _pgNodeTip(d) {
    if (d.id === 'owl:Thing') return `<div class="tt-title">owl:Thing</div><div class="tt-row">온톨로지 루트</div>`;
    const desc = CLASS_DESC[d.id] || '';
    const parent = HIERARCHY[d.id] || '';
    const children = _childrenOf(d.id);
    const outProps = OBJECT_PROPS.filter(([src]) => src === d.id);
    const inProps = OBJECT_PROPS.filter(([, , tgt]) => tgt === d.id);
    let html = `<div class="tt-title">${d.id}</div>`;
    html += d.isFocus ? `<div class="tt-row">선택된 클래스</div>` : `<div class="tt-row">관련 클래스 (깊이 ${d.depth})</div>`;
    if (desc) html += `<div class="tt-row" style="color:#c8d8e8">${desc}</div>`;
    if (parent) html += `<div class="tt-row">상위클래스: <b style="color:#e0e8f0">${parent}</b></div>`;
    if (children.length) {
      const shown = children.slice(0, 3).join(', ');
      html += `<div class="tt-row">하위클래스(${children.length}): ${shown}${children.length > 3 ? ' …' : ''}</div>`;
    }
    if (outProps.length) {
      const shown = outProps.slice(0, 3).map(([, p, t, k]) => `${k || p} → ${t}`).join(' / ');
      html += `<div class="tt-row">→ 관계(${outProps.length}): ${shown}${outProps.length > 3 ? ' …' : ''}</div>`;
    }
    if (inProps.length) {
      const shown = inProps.slice(0, 3).map(([s, p, , k]) => `${s} → ${k || p}`).join(' / ');
      html += `<div class="tt-row">← 관계(${inProps.length}): ${shown}${inProps.length > 3 ? ' …' : ''}</div>`;
    }
    return html;
  }

  function _pgLinkTip(d) {
    const src = typeof d.source === 'object' ? d.source.id : d.source;
    const tgt = typeof d.target === 'object' ? d.target.id : d.target;
    const srcDesc = CLASS_DESC[src] || '';
    const tgtDesc = CLASS_DESC[tgt] || '';
    if (d.prop === 'subClassOf') {
      return `<div class="tt-title">subClassOf</div>` +
             `<div class="tt-row">유형: 상속 관계 (is-a)</div>` +
             `<div class="tt-row">하위: <b style="color:#e0e8f0">${src}</b>${srcDesc ? ` (${srcDesc})` : ''}</div>` +
             `<div class="tt-row">상위: <b style="color:#e0e8f0">${tgt}</b>${tgtDesc ? ` (${tgtDesc})` : ''}</div>`;
    }
    let html = `<div class="tt-title">${d.kor || d.prop}</div>`;
    if (d.prop && d.kor) html += `<div class="tt-row">속성명: ${d.prop}</div>`;
    html += `<div class="tt-row">유형: 객체 속성 (Object Property)</div>`;
    html += `<div class="tt-row">도메인: <b style="color:#e0e8f0">${src}</b>${srcDesc ? ` (${srcDesc})` : ''}</div>`;
    html += `<div class="tt-row">범위: <b style="color:#e0e8f0">${tgt}</b>${tgtDesc ? ` (${tgtDesc})` : ''}</div>`;
    return html;
  }

  function _pgTreeTip(cls) {
    const desc = CLASS_DESC[cls] || '';
    const parent = HIERARCHY[cls] || '';
    const children = _childrenOf(cls);
    const outProps = OBJECT_PROPS.filter(([src]) => src === cls);
    let html = `<div class="tt-title">${cls}</div>`;
    if (desc) html += `<div class="tt-row" style="color:#c8d8e8">${desc}</div>`;
    if (parent) html += `<div class="tt-row">상위클래스: <b style="color:#e0e8f0">${parent}</b></div>`;
    if (children.length) html += `<div class="tt-row">하위클래스: ${children.length}개</div>`;
    if (outProps.length) {
      const shown = outProps.slice(0, 2).map(([, p, t, k]) => `${k || p} → ${t}`).join(' / ');
      html += `<div class="tt-row">→ 관계: ${shown}${outProps.length > 2 ? ' …' : ''}</div>`;
    }
    html += `<div class="tt-row" style="color:#4a6070;font-size:10px">클릭하여 그래프 보기</div>`;
    return html;
  }

  // ── Left-panel class tree ───────────────────────────────────────────────────
  function _buildTreeNode(cls, depth) {
    const children = _childrenOf(cls);
    const pad = 8 + depth * 14;
    const desc = CLASS_DESC[cls] || '';
    const toggle = children.length
      ? `<span class="pg-tree-toggle" data-cls="${cls}">▶</span>`
      : `<span class="pg-tree-spacer"></span>`;
    let html = `<div class="pg-tree-node" style="padding-left:${pad}px">
      ${toggle}
      <div class="pg-tree-cls-wrap">
        <span class="pg-tree-cls" data-cls="${cls}">${cls}</span>
        ${desc ? `<span class="pg-tree-desc">${desc}</span>` : ''}
      </div>
    </div>`;
    if (children.length) {
      html += `<div class="pg-tree-children" id="pgc-${cls}" style="display:none;">`;
      children.forEach(ch => { html += _buildTreeNode(ch, depth + 1); });
      html += '</div>';
    }
    return html;
  }

  function _buildFullTree() {
    return ROOT_CLASSES.map(rc => _buildTreeNode(rc, 0)).join('');
  }

  function _updateTreeSelection(cls) {
    document.querySelectorAll('.pg-tree-cls').forEach(el => {
      el.classList.toggle('pg-tree-cls-active', el.dataset.cls === cls);
    });
    if (!cls) return;
    // Expand ancestors so selected node is visible
    let cur = HIERARCHY[cls];
    while (cur) {
      const ch = document.getElementById('pgc-' + cur);
      if (ch && ch.style.display === 'none') {
        ch.style.display = 'block';
        const tog = document.querySelector(`.pg-tree-toggle[data-cls="${cur}"]`);
        if (tog) tog.textContent = '▼';
      }
      cur = HIERARCHY[cur];
    }
    // Scroll selected node into view
    const el = document.querySelector(`.pg-tree-cls[data-cls="${cls}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  // ── Edge weight: domainCount[src] × rangeCount[tgt] — varies in BOTH source and target views ──
  function _pgPropWeights() {
    const domainCount = {}, rangeCount = {};
    OBJECT_PROPS.forEach(([src, , tgt]) => {
      domainCount[src] = (domainCount[src] || 0) + 1;
      rangeCount[tgt]  = (rangeCount[tgt]  || 0) + 1;
    });
    const childCount = {};
    Object.values(HIERARCHY).forEach(p => { childCount[p] = (childCount[p] || 0) + 1; });
    const pVals = OBJECT_PROPS.map(([src, , tgt]) => (domainCount[src] || 1) * (rangeCount[tgt] || 1));
    const pMin = Math.min(...pVals), pMax = Math.max(...pVals);
    const cVals = Object.values(childCount);
    const cMin = Math.min(...cVals), cMax = Math.max(...cVals);
    return {
      forEdge: (src, tgt) => { const v = (domainCount[src] || 1) * (rangeCount[tgt] || 1); return pMax === pMin ? 3 : 0.8 + ((v - pMin) / (pMax - pMin)) * 10.2; },
      forSub:  tgt => { const v = childCount[tgt] || 1; return cMax === cMin ? 2.5 : 1 + ((v - cMin) / (cMax - cMin)) * 5; },
    };
  }

  // ── Graph data builder ──────────────────────────────────────────────────────
  function _buildData() {
    const nodes = [], links = [];
    const nodeSet = new Set();
    const wt = _pgPropWeights();

    function addNode(id, isFocus) {
      if (nodeSet.has(id)) return;
      nodeSet.add(id);
      nodes.push({ id, isFocus: !!isFocus, depth: _depthOf(id) });
    }

    function addLink(src, tgt, prop, kor) {
      if (links.some(l => l.source === src && l.target === tgt && l.prop === prop)) return;
      const weight = prop === 'subClassOf' ? wt.forSub(tgt) : wt.forEdge(src, tgt);
      links.push({ source: src, target: tgt, prop, kor, color: _edgeColor(prop), _idx: links.length, weight });
    }

    // After collecting all nodes, add EVERY edge between any two visible nodes
    // This matches Protege OntoGraf behavior
    function addAllEdges() {
      OBJECT_PROPS.forEach(([s, p, t, k]) => {
        if (nodeSet.has(s) && nodeSet.has(t)) addLink(s, t, p, k);
      });
      Object.entries(HIERARCHY).forEach(([child, parent]) => {
        if (nodeSet.has(child) && nodeSet.has(parent)) addLink(child, parent, 'subClassOf', 'subClassOf');
      });
    }

    // ── Default overview (no selection) ──
    if (!_centerCls) {
      ROOT_CLASSES.forEach(rc => addNode(rc, false));
      addNode('owl:Thing', false);
      addAllEdges();
      return { nodes, links };
    }

    // ── Focus mode: first collect nodes, then add all edges between them ──
    addNode(_centerCls, true);

    // 1. Object property neighbors (both directions)
    _propsOf(_centerCls).forEach(([s, , t]) => {
      addNode(s === _centerCls ? t : s, false);
    });

    // 2. Hierarchy: parent + children
    const parent = HIERARCHY[_centerCls];
    if (parent) addNode(parent, false);
    _childrenOf(_centerCls).forEach(ch => addNode(ch, false));

    // 3. Expanded secondary nodes' neighborhoods
    _expanded.forEach(expCls => {
      if (!nodeSet.has(expCls)) return;
      _propsOf(expCls).forEach(([s, , t]) => addNode(s === expCls ? t : s, false));
      const ep = HIERARCHY[expCls];
      if (ep) addNode(ep, false);
      _childrenOf(expCls).forEach(ch => addNode(ch, false));
    });

    // 4. owl:Thing
    if (ROOT_CLASSES.includes(_centerCls) || [...nodeSet].some(n => ROOT_CLASSES.includes(n))) {
      addNode('owl:Thing', false);
    }

    // 5. Add ALL edges between every visible node pair
    addAllEdges();

    return { nodes, links };
  }

  // ── D3 Render ───────────────────────────────────────────────────────────────
  const NW = 144, NH = 30, INST_R = 9, PLUS_R = 8;

  function _edgeEndX(src, tgt, fromSrc) {
    const s = fromSrc ? src : tgt, t = fromSrc ? tgt : src;
    const dx = (t.x || 0) - (s.x || 0), dy = (t.y || 0) - (s.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (s.id === 'owl:Thing') return (s.x || 0) + INST_R * dx / dist;
    const hw = NW / 2, hh = NH / 2;
    const r = (Math.abs(dx) * hh > Math.abs(dy) * hw) ? hw / Math.abs(dx) : hh / Math.abs(dy);
    return (s.x || 0) + dx * r;
  }

  function _edgeEndY(src, tgt, fromSrc) {
    const s = fromSrc ? src : tgt, t = fromSrc ? tgt : src;
    const dx = (t.x || 0) - (s.x || 0), dy = (t.y || 0) - (s.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (s.id === 'owl:Thing') return (s.y || 0) + INST_R * dy / dist;
    const hw = NW / 2, hh = NH / 2;
    const r = (Math.abs(dx) * hh > Math.abs(dy) * hw) ? hw / Math.abs(dx) : hh / Math.abs(dy);
    return (s.y || 0) + dy * r;
  }

  function _ptSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-10) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function _ptBezierDist(px, py, sx, sy, cpx, cpy, tx, ty) {
    let minD = Infinity;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, u = 1 - t;
      const bx = u * u * sx + 2 * u * t * cpx + t * t * tx;
      const by = u * u * sy + 2 * u * t * cpy + t * t * ty;
      const d = Math.hypot(px - bx, py - by);
      if (d < minD) minD = d;
    }
    return minD;
  }

  function _renderGraph() {
    const wrap = document.getElementById('pg-graph-wrap');
    if (!wrap) return;
    if (_sim) { _sim.stop(); _sim = null; }
    wrap.innerHTML = '';

    const { nodes, links } = _buildData();
    const W = wrap.clientWidth || 900;
    const H = wrap.clientHeight || 580;
    const cx = W / 2, cy = H / 2;

    const svg = d3.select(wrap).append('svg')
      .attr('width', '100%').attr('height', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`);

    // ── Arrow markers per color ──
    const defs = svg.append('defs');
    const uniqueColors = [...new Set(links.map(l => l.color))];
    const colorToMarkerId = new Map();
    uniqueColors.forEach((col, i) => {
      const mid = `pga-${i}`;
      colorToMarkerId.set(col, mid);
      defs.append('marker').attr('id', mid)
        .attr('viewBox', '-1 -6 12 12').attr('refX', 10).attr('refY', 0)
        .attr('markerWidth', 9).attr('markerHeight', 9).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5Z')
        .attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.6);
    });

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.08, 5]).on('zoom', e => g.attr('transform', e.transform)));
    // Transparent full-viewport rect so mousemove fires everywhere (not just on painted elements)
    svg.insert('rect', 'g').attr('width', W).attr('height', H).attr('fill', 'none').style('pointer-events', 'all');

    // ── Initial positions ──
    nodes.forEach((n, i) => {
      if (n.isFocus) { n.x = cx; n.y = cy; n.fx = cx; n.fy = cy; }
      else {
        const a = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
        const r = 180 + Math.random() * 60;
        n.x = cx + r * Math.cos(a);
        n.y = cy + r * Math.sin(a);
      }
    });

    // ── Assign curvature per link ──
    // Group by undirected node-pair; single edge → straight (0), multiple → symmetric fan
    const pairMap = new Map();
    links.forEach(l => {
      const key = [l.source, l.target].sort().join('|||');
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key).push(l);
    });
    links.forEach(l => {
      const key = [l.source, l.target].sort().join('|||');
      const group = pairMap.get(key);
      const n = group.length;
      const idx = group.indexOf(l);
      l._curve = n === 1 ? 0 : (idx - (n - 1) / 2) * 50;
    });

    // ── Links (curved path, hollow arrowhead) ──
    const linkG = g.append('g');
    const linkSel = linkG.selectAll('path.pg-link').data(links).join('path')
      .attr('class', 'pg-link')
      .attr('stroke', d => d.color)
      .style('stroke-width', d => `${d.weight || 1.8}px`)
      .attr('stroke-dasharray', '9,5')
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#${colorToMarkerId.get(d.color)})`)
      .style('pointer-events', 'none');

    const labelSel = linkG.selectAll('text.pg-link-lbl').data(links).join('text')
      .attr('class', 'pg-link-lbl')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => d.color)
      .text(d => d.kor || d.prop);

    // ── Nodes ──
    const nodeG = g.append('g');
    const nodeSel = nodeG.selectAll('g.pg-ng').data(nodes).join('g')
      .attr('class', d => `pg-ng${d.isFocus ? ' pg-ng-focus' : ''}`)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); if (!d.isFocus) { d.fx = null; d.fy = null; } }))
      .on('click', (e, d) => {
        if (e.target.closest('.pg-plus-g')) return;
        if (d.id === 'owl:Thing') return;
        _centerCls = d.id;
        _expanded.clear();
        const badge = document.getElementById('pg-result-count');
        if (badge) badge.textContent = '1 result(s) found.';
        const inp = document.getElementById('pg-search-input');
        if (inp) inp.value = d.id;
        _ttHide();
        _renderGraph();
      })
      .on('mouseover', (e, d) => _ttShow(_pgNodeTip(d), e))
      .on('mousemove', e => _ttMove(e))
      .on('mouseout', _ttHide);

    // owl:Thing rendered as a circle
    nodeSel.each(function(d) {
      const sel = d3.select(this);
      if (d.id === 'owl:Thing') {
        sel.append('circle').attr('r', 24).attr('class', 'pg-node-owl');
        sel.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em')
          .attr('class', 'pg-node-owl-lbl').text('owl:Thing');
        return;
      }
      // Node box (fill by hierarchy depth)
      const depthFill = DEPTH_FILL[Math.min(d.depth, DEPTH_FILL.length - 1)];
      sel.append('rect')
        .attr('x', -NW / 2).attr('y', -NH / 2)
        .attr('width', NW).attr('height', NH)
        .attr('rx', 4).attr('class', 'pg-node-rect')
        .style('fill', depthFill);

      // Left yellow dot (Protege style)
      sel.append('circle')
        .attr('cx', -NW / 2 + 13).attr('cy', 0).attr('r', 7)
        .attr('class', 'pg-node-dot');

      // Class name
      sel.append('text')
        .attr('x', 4).attr('y', 0)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('class', 'pg-node-lbl')
        .style('fill', _textColor(depthFill))
        .text(d.id.length > 16 ? d.id.slice(0, 15) + '…' : d.id);

      // + / − expand button
      const plusG = sel.append('g')
        .attr('class', 'pg-plus-g')
        .attr('transform', `translate(${NW / 2 - 11}, 0)`)
        .on('click', (e, d) => {
          e.stopPropagation();
          if (_expanded.has(d.id)) _expanded.delete(d.id);
          else _expanded.add(d.id);
          _renderGraph();
        });
      plusG.append('circle').attr('r', PLUS_R).attr('class', 'pg-plus-circle');
      plusG.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('class', 'pg-plus-lbl')
        .text(d => _expanded.has(d.id) ? '−' : '+');
    });

    // ── Force simulation ──
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.prop === 'subClassOf' ? 150 : 200).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(cx, cy))
      .force('collide', d3.forceCollide(88))
      .on('tick', () => {
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
        const pathD = d => {
          const sx = _edgeEndX(d.source, d.target, true);
          const sy = _edgeEndY(d.source, d.target, true);
          const tx = _edgeEndX(d.source, d.target, false);
          const ty = _edgeEndY(d.source, d.target, false);
          if (d._curve === 0) return `M${sx},${sy} L${tx},${ty}`;
          const dx = tx - sx, dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const cpx = (sx + tx) / 2 - (dy / len) * d._curve;
          const cpy = (sy + ty) / 2 + (dx / len) * d._curve;
          return `M${sx},${sy} Q${cpx},${cpy} ${tx},${ty}`;
        };
        linkSel.attr('d', pathD);
        labelSel
          .attr('x', d => {
            const sx = _edgeEndX(d.source, d.target, true);
            const tx = _edgeEndX(d.source, d.target, false);
            if (d._curve === 0) return (sx + tx) / 2;
            const dy2 = (d.target.y || 0) - (d.source.y || 0);
            const len = Math.sqrt(Math.pow((d.target.x||0)-(d.source.x||0),2)+Math.pow(dy2,2))||1;
            return (sx + tx) / 2 - (dy2 / len) * d._curve * 0.5;
          })
          .attr('y', d => {
            const sy = _edgeEndY(d.source, d.target, true);
            const ty = _edgeEndY(d.source, d.target, false);
            if (d._curve === 0) return (sy + ty) / 2 - 7;
            const dx2 = (d.target.x || 0) - (d.source.x || 0);
            const len = Math.sqrt(Math.pow(dx2,2)+Math.pow((d.target.y||0)-(d.source.y||0),2))||1;
            return (sy + ty) / 2 + (dx2 / len) * d._curve * 0.5 - 7;
          });
      });

    _sim = sim;

    let _hovLink = null;
    svg.on('mousemove', function(e) {
      if (e.target.closest && e.target.closest('.pg-ng')) {
        if (_hovLink) { _ttHide(); _hovLink = null; }
        return;
      }
      const [mx, my] = d3.pointer(e, g.node());
      let closest = null, minDist = Infinity;
      links.forEach(lk => {
        if (!lk.source || !lk.target || lk.source.x == null) return;
        const sx = _edgeEndX(lk.source, lk.target, true);
        const sy = _edgeEndY(lk.source, lk.target, true);
        const ex = _edgeEndX(lk.source, lk.target, false);
        const ey = _edgeEndY(lk.source, lk.target, false);
        let d;
        if (lk._curve === 0) {
          d = _ptSegDist(mx, my, sx, sy, ex, ey);
        } else {
          const ddx = ex - sx, ddy = ey - sy;
          const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const cpx = (sx + ex) / 2 - (ddy / len) * lk._curve;
          const cpy = (sy + ey) / 2 + (ddx / len) * lk._curve;
          d = _ptBezierDist(mx, my, sx, sy, cpx, cpy, ex, ey);
        }
        if (d < minDist) { minDist = d; closest = lk; }
      });
      const THRESH = 12;
      if (minDist <= THRESH) {
        if (_hovLink !== closest) { _ttShow(_pgLinkTip(closest), e); _hovLink = closest; }
        else _ttMove(e);
      } else {
        if (_hovLink) { _ttHide(); _hovLink = null; }
      }
    }).on('mouseleave', () => { _ttHide(); _hovLink = null; });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="pg-layout">
        <div class="pg-toolbar">
          <span class="pg-toolbar-logo">ProteGraf</span>
          <span class="pg-toolbar-sep"></span>
          <span class="pg-toolbar-label">Search:</span>
          <input id="pg-search-input" type="text" class="pg-search-input" placeholder="class name…" autocomplete="off"/>
          <select id="pg-search-mode" class="pg-search-mode">
            <option value="contains">contains</option>
            <option value="starts">starts with</option>
            <option value="exact">exact</option>
          </select>
          <button id="pg-search-btn" class="pg-btn">Search</button>
          <button id="pg-clear-btn" class="pg-btn pg-btn-clear">Clear</button>
          <span id="pg-result-count" class="pg-result-count"></span>
          <span class="pg-toolbar-hint">노드 클릭: 포커스 전환 &nbsp;|&nbsp; [+] 클릭: 이웃 확장 &nbsp;|&nbsp; 드래그: 이동 &nbsp;|&nbsp; 스크롤: 줌</span>
        </div>
        <div class="pg-body">
          <div class="pg-left-panel">
            <div class="pg-left-header">클래스 계층</div>
            <div class="pg-tree-scroll" id="pg-tree-scroll"></div>
          </div>
          <div id="pg-graph-wrap" class="pg-graph-wrap"></div>
        </div>
      </div>`;

    const pgTreeScroll = document.getElementById('pg-tree-scroll');
    pgTreeScroll.innerHTML = _buildFullTree();

    pgTreeScroll.addEventListener('mouseover', evt => {
      const clsEl = evt.target.closest('.pg-tree-cls');
      if (clsEl) _ttShow(_pgTreeTip(clsEl.dataset.cls), evt);
    });
    pgTreeScroll.addEventListener('mousemove', evt => {
      const tip = document.getElementById('graph-tooltip');
      if (tip && tip.style.display !== 'none') _ttMove(evt);
    });
    pgTreeScroll.addEventListener('mouseout', evt => {
      if (evt.target.closest('.pg-tree-cls')) _ttHide();
    });

    pgTreeScroll.addEventListener('click', evt => {
      const tog = evt.target.closest('.pg-tree-toggle');
      if (tog) {
        const cls = tog.dataset.cls;
        const ch = document.getElementById('pgc-' + cls);
        if (ch) {
          const open = ch.style.display !== 'none';
          ch.style.display = open ? 'none' : 'block';
          tog.textContent = open ? '▶' : '▼';
        }
        return;
      }
      const clsEl = evt.target.closest('.pg-tree-cls');
      if (clsEl) {
        const cls = clsEl.dataset.cls;
        _centerCls = cls;
        _expanded.clear();
        _renderGraph();
        _updateTreeSelection(cls);
        const badge = document.getElementById('pg-result-count');
        if (badge) badge.textContent = '';
      }
    });

    document.getElementById('pg-search-btn').addEventListener('click', () =>
      _doSearch(document.getElementById('pg-search-input').value,
                document.getElementById('pg-search-mode').value));
    document.getElementById('pg-search-input').addEventListener('keydown', e => {
      if (e.key === 'Enter')
        _doSearch(e.target.value, document.getElementById('pg-search-mode').value);
    });
    document.getElementById('pg-clear-btn').addEventListener('click', _doClear);

    _renderGraph();
  }

  return { init };
})();
