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

  // ── Graph data builder ──────────────────────────────────────────────────────
  function _buildData() {
    const nodes = [], links = [];
    const nodeSet = new Set();

    function addNode(id, isFocus) {
      if (nodeSet.has(id)) return;
      nodeSet.add(id);
      nodes.push({ id, isFocus: !!isFocus, depth: _depthOf(id) });
    }

    function addLink(src, tgt, prop, kor) {
      if (links.some(l => l.source === src && l.target === tgt && l.prop === prop)) return;
      links.push({ source: src, target: tgt, prop, kor, color: _edgeColor(prop), _idx: links.length });
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
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '9,5')
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#${colorToMarkerId.get(d.color)})`);

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
        _renderGraph();
      });

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
        linkSel.attr('d', d => {
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
        });
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

    document.getElementById('pg-tree-scroll').innerHTML = _buildFullTree();

    document.getElementById('pg-tree-scroll').addEventListener('click', evt => {
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
