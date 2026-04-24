// HRD Governance Platform - VOWL-style Ontology Graph (WebVOWL-inspired)

const VowlGraph = {
  simulation: null,
  mode: 'schema',
  activeTypes: new Set(['NationalStrategy','PublicPolicy','EducationProgram','Organization','Competency','Budget']),
  containerId: null,

  COLORS: {
    NationalStrategy: '#00d4ff',
    PublicPolicy:     '#ffd700',
    EducationProgram: '#9933ff',
    Organization:     '#00ff41',
    Competency:       '#ff3333',
    Budget:           '#ff8800',
  },

  LABELS_KO: {
    NationalStrategy: '국가전략',
    PublicPolicy:     '공공정책',
    EducationProgram: '교육프로그램',
    Organization:     '기관',
    Competency:       '역량',
    Budget:           '예산',
  },

  EL_RX: 60, EL_RY: 27,

  build(containerId) {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container || typeof d3 === 'undefined') return;
    this._renderControls(container.parentElement);
    this._renderGraph(container);
  },

  _renderControls(wrap) {
    let bar = wrap.querySelector('.vowl-ctrl-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'vowl-ctrl-bar';
      const container = document.getElementById(this.containerId);
      wrap.insertBefore(bar, container);
    }
    bar.innerHTML = `
      <div class="vowl-row">
        <span class="vowl-lbl">모드:</span>
        <button class="vowl-mode-btn${this.mode==='schema'?' active':''}" data-m="schema">스키마 Schema</button>
        <button class="vowl-mode-btn${this.mode==='instance'?' active':''}" data-m="instance">인스턴스 Instance</button>
        <span class="vowl-sep">|</span>
        <span class="vowl-lbl">클래스:</span>
        ${Object.entries(this.COLORS).map(([t,c])=>`
          <button class="vowl-type-btn${this.activeTypes.has(t)?' active':''}" data-t="${t}" style="--tc:${c}">
            <i style="background:${c}"></i>${this.LABELS_KO[t]}
          </button>`).join('')}
      </div>
      <div class="vowl-hint">드래그: 노드 이동 · 스크롤: 확대/축소 · 클릭: 상세정보 · 배경 드래그: 화면 이동</div>
    `;
    bar.querySelectorAll('.vowl-mode-btn').forEach(b => b.addEventListener('click', () => {
      this.mode = b.dataset.m;
      this.build(this.containerId);
    }));
    bar.querySelectorAll('.vowl-type-btn').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.t;
      if (this.activeTypes.has(t)) this.activeTypes.delete(t);
      else this.activeTypes.add(t);
      this.build(this.containerId);
    }));
  },

  _renderGraph(container) {
    container.innerHTML = '';
    if (this.simulation) { this.simulation.stop(); this.simulation = null; }

    const W = container.clientWidth || 900;
    const H = container.clientHeight || 560;
    const isSchema = this.mode === 'schema';

    const svg = d3.select(container).append('svg').attr('width', W).attr('height', H);
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 6]).on('zoom', e => g.attr('transform', e.transform)));

    // Arrow markers per class
    const defs = svg.append('defs');
    Object.entries(this.COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arw-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    const { nodes, links } = isSchema ? this._buildSchema() : this._buildInstance();

    const visNodes = nodes.filter(n => this.activeTypes.has(n.group));
    const visIds   = new Set(visNodes.map(n => n.id));
    const visLinks = links.filter(l => visIds.has(l.source) && visIds.has(l.target));

    // Compute curve offsets for duplicate source→target pairs
    const pairCount = {}, pairIdx = {};
    visLinks.forEach(l => { const k = `${l.source}|${l.target}`; pairCount[k] = (pairCount[k]||0)+1; });
    visLinks.forEach(l => {
      const k = `${l.source}|${l.target}`;
      pairIdx[k] = pairIdx[k] === undefined ? 0 : pairIdx[k] + 1;
      l._off = (pairIdx[k] - (pairCount[k]-1)/2) * 52;
    });

    // Link paths
    const linkSel = g.append('g').selectAll('g.lnk').data(visLinks).join('g').attr('class','lnk');

    const pathSel = linkSel.append('path')
      .attr('fill', 'none')
      .attr('stroke-width', d => d.weight || (isSchema ? 2 : 1))
      .attr('stroke', d => {
        const sn = visNodes.find(n => n.id === d.source);
        return sn ? (isSchema ? this.COLORS[sn.group]+'cc' : this.COLORS[sn.group]+'66') : '#ffffff33';
      })
      .attr('marker-end', d => {
        const sn = visNodes.find(n => n.id === d.source);
        return sn ? `url(#arw-${sn.group})` : '';
      });

    // Property labels (schema only)
    const lblSel = isSchema ? linkSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#8ab0c8')
      .attr('font-size', 9)
      .attr('font-family', '"Courier New", monospace')
      .attr('pointer-events', 'none')
      .text(d => d.label || '') : null;

    // Nodes
    const nodeSel = g.append('g').selectAll('g.nd').data(visNodes).join('g').attr('class','nd')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e,d) => { if(!e.active) this.simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (e,d) => { d.fx=e.x; d.fy=e.y; })
        .on('end',   (e,d) => { if(!e.active) this.simulation.alphaTarget(0); d.fx=null; d.fy=null; })
      )
      .on('click', (e,d) => { e.stopPropagation(); this._showInfo(d, container); });

    if (isSchema) {
      // VOWL-style ellipses
      nodeSel.append('ellipse')
        .attr('rx', this.EL_RX).attr('ry', this.EL_RY)
        .attr('fill', d => this.COLORS[d.group]+'18')
        .attr('stroke', d => this.COLORS[d.group])
        .attr('stroke-width', 2.5);
      nodeSel.append('text')
        .attr('text-anchor','middle').attr('dy','-0.2em')
        .attr('fill', d => this.COLORS[d.group])
        .attr('font-size', 11.5).attr('font-weight', 700)
        .attr('font-family', '"Courier New", monospace')
        .text(d => d.label);
      nodeSel.append('text')
        .attr('text-anchor','middle').attr('dy','1.1em')
        .attr('fill','#7090a8').attr('font-size', 9)
        .attr('font-family','sans-serif')
        .text(d => this.LABELS_KO[d.group]);
    } else {
      // Instance circles
      nodeSel.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => this.COLORS[d.group]+'33')
        .attr('stroke', d => this.COLORS[d.group])
        .attr('stroke-width', 1.5);
      nodeSel.append('text')
        .attr('text-anchor','middle').attr('dy','0.35em')
        .attr('fill','#d0e0f0').attr('font-size', 7)
        .attr('font-family','sans-serif')
        .text(d => d.short || d.label.slice(0,6));
    }

    nodeSel.append('title').text(d => `[${this.LABELS_KO[d.group]}]\n${d.label}`);

    // Force simulation
    this.simulation = d3.forceSimulation(visNodes)
      .force('link', d3.forceLink(visLinks).id(d => d.id).distance(isSchema ? 190 : 85))
      .force('charge', d3.forceManyBody().strength(isSchema ? -700 : -140))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collide', d3.forceCollide().radius(d => (isSchema ? this.EL_RX : d.radius) + 12))
      .on('tick', () => {
        const byId = {};
        visNodes.forEach(n => { byId[n.id] = n; });

        pathSel.attr('d', d => this._path(d, byId, isSchema));

        if (lblSel) {
          lblSel
            .attr('x', d => this._midX(d, byId))
            .attr('y', d => this._midY(d, byId));
        }

        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });
  },

  _sn(link) { return typeof link.source === 'object' ? link.source : null; },
  _tn(link) { return typeof link.target === 'object' ? link.target : null; },

  _path(link, byId, isSchema) {
    const s = this._sn(link) || byId[link.source];
    const t = this._tn(link) || byId[link.target];
    if (!s || !t) return '';

    const off = link._off || 0;
    const dx = t.x - s.x, dy = t.y - s.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    const px = -uy, py = ux;

    let sx, sy, tx, ty;
    if (isSchema) {
      const se = this._ellipseEdge(s.x, s.y, this.EL_RX, this.EL_RY, t.x + px*off, t.y + py*off);
      sx = se.x; sy = se.y;
      const te = this._ellipseEdge(t.x, t.y, this.EL_RX, this.EL_RY, s.x + px*off, s.y + py*off);
      tx = te.x; ty = te.y;
    } else {
      sx = s.x + ux*(s.radius+2); sy = s.y + uy*(s.radius+2);
      tx = t.x - ux*(t.radius+7); ty = t.y - uy*(t.radius+7);
    }

    if (Math.abs(off) < 1) return `M${sx},${sy}L${tx},${ty}`;
    const mx = (sx+tx)/2 + px*off;
    const my = (sy+ty)/2 + py*off;
    return `M${sx},${sy}Q${mx},${my} ${tx},${ty}`;
  },

  _midX(link, byId) {
    const s = this._sn(link)||byId[link.source], t = this._tn(link)||byId[link.target];
    if (!s||!t) return 0;
    const dx=t.x-s.x, dy=t.y-s.y, len=Math.sqrt(dx*dx+dy*dy)||1;
    return (s.x+t.x)/2 + (-dy/len)*(link._off||0) - 6;
  },

  _midY(link, byId) {
    const s = this._sn(link)||byId[link.source], t = this._tn(link)||byId[link.target];
    if (!s||!t) return 0;
    const dx=t.x-s.x, dy=t.y-s.y, len=Math.sqrt(dx*dx+dy*dy)||1;
    return (s.y+t.y)/2 + (dx/len)*(link._off||0) - 5;
  },

  _ellipseEdge(cx, cy, rx, ry, fromX, fromY) {
    const dx = cx-fromX, dy = cy-fromY;
    const angle = Math.atan2(dy, dx);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const d = 1 / Math.sqrt((ca/rx)**2 + (sa/ry)**2);
    return { x: cx - ca*d, y: cy - sa*d };
  },

  _propWeights() {
    const d = HRDData;
    const raw = {
      hasPolicy:          d.policies.filter(p => p.relatedStrategyName).length,
      hasProgram:         d.programs.length,
      manages:            d.policies.filter(p => p.managingOrg).length,
      isImplementedBy:    d.programs.filter(p => p.implOrg || p.organizationId).length,
      supportsCompetency: d.programs.reduce((n,p) => n + (p.competencies ? p.competencies.length : 0), 0),
      developsCompetency: d.programs.filter(p => p.competencies && p.competencies.length).length,
      hasBudget:          (d.budgets || []).length,
      managedBy:          (d.budgets || []).filter(b => b.relatedOrg || b.organizationId).length,
    };
    const vals = Object.values(raw);
    const mn = Math.min(...vals) || 1;
    const mx = Math.max(...vals) || 1;
    const norm = {};
    Object.entries(raw).forEach(([k,v]) => {
      norm[k] = mx === mn ? 3 : 1.5 + ((v - mn) / (mx - mn)) * 3.5;
    });
    return norm;
  },

  _buildSchema() {
    const weights = this._propWeights();
    const nodes = Object.keys(this.COLORS).map(type => ({
      id: type, group: type, label: type, radius: 30,
    }));
    const links = [
      { source:'NationalStrategy', target:'PublicPolicy',    label:'hasPolicy',         weight: weights.hasPolicy         },
      { source:'NationalStrategy', target:'Budget',           label:'hasBudget',          weight: weights.hasBudget          },
      { source:'PublicPolicy',     target:'EducationProgram', label:'hasProgram',         weight: weights.hasProgram         },
      { source:'Organization',     target:'PublicPolicy',     label:'manages',            weight: weights.manages            },
      { source:'EducationProgram', target:'Organization',     label:'isImplementedBy',    weight: weights.isImplementedBy    },
      { source:'EducationProgram', target:'Competency',       label:'supportsCompetency', weight: weights.supportsCompetency },
      { source:'EducationProgram', target:'Competency',       label:'developsCompetency', weight: weights.developsCompetency },
      { source:'Budget',           target:'Organization',     label:'managedBy',          weight: weights.managedBy          },
    ];
    return { nodes, links };
  },

  _buildInstance() {
    const nodes = [], links = [];
    const d = HRDData;

    d.strategies.forEach(s => nodes.push({
      id:'S_'+s.id, label:s.name, short:s.name.slice(0,5), group:'NationalStrategy', radius:18,
    }));
    d.policies.slice(0,20).forEach(p => nodes.push({
      id:'P_'+p.id, label:p.name, short:p.name.slice(0,5), group:'PublicPolicy', radius:11,
    }));
    d.organizations.slice(0,15).forEach(o => nodes.push({
      id:'O_'+o.id, label:o.name, short:o.abbr||o.name.slice(0,4), group:'Organization', radius:13,
    }));
    d.programs.slice(0,15).forEach(p => nodes.push({
      id:'PR_'+p.id, label:p.name, short:p.name.slice(0,5), group:'EducationProgram', radius:9,
    }));
    d.competencies.slice(0,15).forEach(c => nodes.push({
      id:'C_'+c.id, label:c.name, short:c.name.slice(0,5), group:'Competency', radius:8,
    }));
    if (d.budgets) d.budgets.slice(0,10).forEach(b => nodes.push({
      id:'B_'+b.id, label:b.name||b.id, short:(b.name||b.id).slice(0,5), group:'Budget', radius:9,
    }));

    const idSet = new Set(nodes.map(n => n.id));
    const wt = this._propWeights();
    const sl = (s,t,lbl) => { if(idSet.has(s)&&idSet.has(t)) links.push({source:s,target:t,label:lbl,weight:wt[lbl]||1}); };

    // Strategy → Policy (real data)
    const stratByName = {};
    d.strategies.forEach(s => { stratByName[s.name] = 'S_'+s.id; });
    d.policies.slice(0,20).forEach(p => {
      if (p.relatedStrategyName && stratByName[p.relatedStrategyName]) {
        sl(stratByName[p.relatedStrategyName], 'P_'+p.id, 'hasPolicy');
      }
    });

    // Strategy → Budget (real data)
    if (d.budgets) {
      const stratById = {};
      d.strategies.forEach(s => { stratById[s.id] = 'S_'+s.id; });
      d.budgets.slice(0,10).forEach(b => {
        if (b.relatedStrategy && idSet.has(stratById[b.relatedStrategy])) {
          sl(stratById[b.relatedStrategy], 'B_'+b.id, 'hasBudget');
        }
      });
    }

    // Policy → Programs (synthetic match by index)
    d.policies.slice(0,10).forEach((p,pi) => {
      d.programs.slice(pi*2, pi*2+2).forEach(pr => sl('P_'+p.id, 'PR_'+pr.id, 'hasProgram'));
    });

    // Org → Programs (implementing)
    d.organizations.slice(0,10).forEach((o,oi) => {
      d.programs.slice(oi, oi+2).forEach(pr => sl('O_'+o.id, 'PR_'+pr.id, 'isImplementedBy'));
    });

    // Program → Competency (real data)
    d.programs.slice(0,12).forEach(p => {
      if (p.competencies) {
        p.competencies.slice(0,2).forEach(c => {
          if (idSet.has('C_'+c.id)) sl('PR_'+p.id, 'C_'+c.id, 'supportsCompetency');
        });
      }
    });

    return { nodes, links };
  },

  _showInfo(node, container) {
    let box = container.querySelector('.vowl-info-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vowl-info-box';
      container.appendChild(box);
    }
    const c = this.COLORS[node.group];
    let detail = '';
    if (node.group === 'NationalStrategy') {
      const cnt = HRDData.policies.filter(p => p.relatedStrategyName === node.label).length;
      detail = `<div class="vi-row">연관 정책: <b>${cnt}개</b></div>`;
    } else if (node.group === 'PublicPolicy') {
      const p = HRDData.policies.find(p => p.name === node.label);
      if (p) detail = `<div class="vi-row">예산: <b>${p.budgetAmountStr||'-'}</b></div><div class="vi-row">관리기관: <b>${p.managingOrg||'-'}</b></div>`;
    } else if (node.group === 'Organization') {
      const cnt = HRDData.policies.filter(p => p.managingOrg === node.label).length;
      detail = `<div class="vi-row">관리 정책: <b>${cnt}개</b></div>`;
    } else if (node.group === 'Competency') {
      const cnt = HRDData.competencies ? HRDData.competencies.filter(c => c.name === node.label).length : 0;
      detail = `<div class="vi-row">역량 유형: <b>${node.group}</b></div>`;
    }
    box.style.setProperty('--bc', c);
    box.innerHTML = `
      <div class="vi-hd">
        <span style="color:${c};font-weight:700;font-size:11px">${this.LABELS_KO[node.group]}</span>
        <button class="vi-x">✕</button>
      </div>
      <div class="vi-nm">${node.label}</div>
      ${detail}
    `;
    box.classList.add('open');
    box.querySelector('.vi-x').addEventListener('click', () => box.classList.remove('open'));
  },

  destroy() {
    if (this.simulation) { this.simulation.stop(); this.simulation = null; }
  },
};
