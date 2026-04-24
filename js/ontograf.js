// OntoGraf - Protege-style interactive ontology graph browser (multi-select + object properties)

const OntoGraf = (() => {
  // ── Class hierarchy / root classes (defined in ontograf-hierarchy.js) ───────
  const HIERARCHY = _ONTOGRAF_HIERARCHY;
  const ROOT_CLASSES = _ONTOGRAF_ROOT_CLASSES;

  // ── Dynamic instance index (replaces hardcoded INSTANCES dict) ───────────
  let _idIndex = null;

  function _buildIdIndex() {
    if (_idIndex) return _idIndex;
    _idIndex = new Map();
    const D = (typeof OntologyData !== 'undefined') ? OntologyData : null;
    if (!D) return _idIndex;
    const CLS_MAP = {
      strategies: 'NationalStrategy', policies: 'Policy', budgets: 'Budget',
      programs: 'EducationProgram', organizations: 'Organization', persons: 'HumanResource',
      outcomes: 'Outcome', benefits: 'Benefit', targetGroups: 'TargetGroup',
      competencies: 'Competency', competencyAssessments: 'CompetencyAssessment',
      competencyGaps: 'CompetencyGap', recommendations: 'Recommendation',
      programEnrollments: 'ProgramEnrollment', policyParticipations: 'PolicyParticipation',
    };
    for (const [key, baseCls] of Object.entries(CLS_MAP)) {
      const arr = D[key] || [];
      arr.forEach(item => {
        const cls = (item.type && HIERARCHY[item.type]) ? item.type
                  : (item.class && HIERARCHY[item.class]) ? item.class
                  : baseCls;
        _idIndex.set(item.id, { name: item.name || item.id, cls });
      });
    }
    return _idIndex;
  }

  function _getInstanceLabel(id) {
    const entry = _buildIdIndex().get(id);
    return entry ? entry.name : id;
  }

  function _getDataInstances(cls) {
    const D = (typeof OntologyData !== 'undefined') ? OntologyData : null;
    if (!D) return [];
    switch (cls) {
      case 'NationalStrategy':   return (D.strategies||[]).map(i => i.id);
      case 'Policy':             return (D.policies||[]).map(i => i.id);
      case 'PublicPolicy':       return (D.policies||[]).filter(i => i.type === 'PublicPolicy').map(i => i.id);
      case 'TuitionSupport': case 'EmploymentSubsidy': case 'R_D_Project':
      case 'VoucherProgram': case 'TrainingIncentive': return [];
      case 'Budget':             return (D.budgets||[]).map(i => i.id);
      case 'OrgBudget': case 'PolicyBudget': case 'StrategyBudget':
        return (D.budgets||[]).filter(i => i.budgetType === cls || i.type === cls).map(i => i.id);
      case 'EducationProgram':   return (D.programs||[]).map(i => i.id);
      case 'K_DigitalTraining': case 'DegreeCourse': case 'JobRetraining':
      case 'OnlineModule': case 'WorkshopSeminar':
        return (D.programs||[]).filter(i => i.type === cls).map(i => i.id);
      case 'Organization':       return (D.organizations||[]).map(i => i.id);
      case 'CentralMinistry': case 'GovernmentAgency':
        return (D.organizations||[]).filter(i => i.type === 'CentralMinistry').map(i => i.id);
      case 'PublicInstitution':
        return (D.organizations||[]).filter(i => i.type === 'PublicInstitute').map(i => i.id);
      case 'ResearchCenter':
        return (D.organizations||[]).filter(i => i.type === 'ResearchInstitute').map(i => i.id);
      case 'LocalGovernment': case 'Enterprise': case 'CertificationBody': return [];
      case 'HumanResource': case 'Person':
        return (D.persons||[]).map(i => i.id);
      case 'Unemployed': case 'Student': case 'Incumbent':
      case 'RetiredProfessional': case 'HighPerformer':
        return (D.persons||[]).filter(i => i.type === cls).map(i => i.id);
      case 'TargetGroup':        return (D.targetGroups||[]).map(i => i.id);
      case 'Outcome':            return (D.outcomes||[]).map(i => i.id);
      case 'Employment': case 'Entrepreneurship': case 'EconomicImpact':
      case 'SocialImpact': case 'SkillGrowth': case 'RevenueGrowth':
        return (D.outcomes||[]).filter(i => i.outcomeType === cls || i.type === cls).map(i => i.id);
      case 'Benefit':            return (D.benefits||[]).map(i => i.id);
      case 'PolicyParticipation': return (D.policyParticipations||[]).map(i => i.id);
      case 'CompetencyAssessment': return (D.competencyAssessments||[]).map(i => i.id);
      case 'CompetencyGap':      return (D.competencyGaps||[]).map(i => i.id);
      case 'Recommendation':     return (D.recommendations||[]).map(i => i.id);
      case 'ProgramEnrollment':  return (D.programEnrollments||[]).map(i => i.id);
      case 'Competency':         return (D.competencies||[]).map(i => i.id);
      case 'HardSkill': case 'SoftSkill': case 'Literacy':
        return (D.competencies||[]).filter(i => i.class === cls).map(i => i.id);
      default: {
        const byL2 = (D.competencies||[]).filter(i => i.level2 === cls).map(i => i.id);
        if (byL2.length) return byL2;
        return (D.competencies||[]).filter(i => i.level3 === cls).map(i => i.id);
      }
    }
  }

  // ── Object Properties (Domain → Range) ───────────────────────────────────
  // Format: [sourceClass, propertyName, targetClass, korLabel]
  // Bidirectional lookup: shown when EITHER src or tgt class is selected.
  const OBJECT_PROPS = [
    // ── 정책(Policy) ─────────────────────────────
    ['Policy', 'hasAllocatedBudget',      'Budget',            '예산배정'],
    ['Policy', 'supportsCompetency',      'Competency',        '역량지원'],
    ['Policy', 'supportsOutcome',         'Outcome',           '성과지원'],
    ['Policy', 'alignsWithStrategy',      'NationalStrategy',  '전략정렬'],
    ['Policy', 'implementedBy',           'Organization',      '시행기관'],
    ['Policy', 'appliesTo',               'TargetGroup',       '적용대상'],
    ['Policy', 'hasParticipation',        'PolicyParticipation','참여기록'],
    ['Policy', 'providesBenefit',         'Benefit',           '혜택제공'],
    // ── 예산(Budget) ─────────────────────────────
    ['Budget', 'managedBy',              'Organization',      '관리기관'],
    ['Budget', 'alignedWithStrategy',    'NationalStrategy',  '연계전략'],
    ['Budget', 'fundsProgram',           'EducationProgram',  '지원프로그램'],
    // ── 교육프로그램(EducationProgram) ────────────
    ['EducationProgram', 'hasTargetGroup',      'TargetGroup',      '대상집단'],
    ['EducationProgram', 'developsCompetency',  'Competency',       '목표역량'],
    ['EducationProgram', 'operatedBy',          'Organization',     '운영기관'],
    ['EducationProgram', 'alignsWithStrategy',  'NationalStrategy', '정렬전략'],
    ['EducationProgram', 'fundedByBudget',      'Budget',           '재원'],
    ['EducationProgram', 'hasEnrollment',       'ProgramEnrollment','등록현황'],
    // ── 인원/인적자원(HumanResource) ─────────────
    ['HumanResource', 'belongsToTargetGroup',    'TargetGroup',       '대상분류'],
    ['HumanResource', 'hasCompetency',           'Competency',        '보유역량'],
    ['HumanResource', 'contributesToStrategy',   'NationalStrategy',  '기여전략'],
    ['HumanResource', 'achievesOutcome',         'Outcome',           '성과달성'],
    ['HumanResource', 'participatesIn',          'PolicyParticipation','정책참여'],
    ['HumanResource', 'hasCompetencyAssessment', 'CompetencyAssessment','역량평가'],
    ['HumanResource', 'hasCompetencyGap',        'CompetencyGap',     '역량갭'],
    ['HumanResource', 'hasRecommendation',       'Recommendation',    '추천기록'],
    ['HumanResource', 'enrollsInProgram',        'ProgramEnrollment', '프로그램등록'],
    ['HumanResource', 'hasCareerHistory',        'CareerHistory',     '경력이력'],
    // ── 성과(Outcome) ─────────────────────────────
    ['Outcome', 'improvesCompetency',   'Competency',    '향상역량'],
    ['Outcome', 'linkedToPolicy',       'Policy',        '연계정책'],
    ['Outcome', 'achievedBy',           'HumanResource', '달성인원'],
    // ── 정책참여(PolicyParticipation) ────────────
    ['PolicyParticipation', 'byPerson',       'HumanResource', '참여인원'],
    ['PolicyParticipation', 'receivesBenefit','Benefit',        '혜택'],
    ['PolicyParticipation', 'producesOutcome','Outcome',        '성과'],
    ['PolicyParticipation', 'underPolicy',    'Policy',         '참여정책'],
    // ── 추천(Recommendation) ─────────────────────
    ['Recommendation', 'recommendsProgram', 'EducationProgram', '추천프로그램'],
    ['Recommendation', 'forPerson',         'HumanResource',    '추천대상'],
    ['Recommendation', 'addressesGap',      'CompetencyGap',    '갭기반'],
    // ── 프로그램등록(ProgramEnrollment) ──────────
    ['ProgramEnrollment', 'intoProgram', 'EducationProgram', '등록프로그램'],
    ['ProgramEnrollment', 'byPerson',    'HumanResource',    '등록인원'],
    // ── 역량갭(CompetencyGap) ─────────────────────
    ['CompetencyGap', 'gapInCompetency', 'CompetencyCategory', '갭역량'],
    ['CompetencyGap', 'gapOfPerson',     'HumanResource',      '갭대상'],
    // ── 역량평가(CompetencyAssessment) ───────────
    ['CompetencyAssessment', 'assessesCompetency', 'Competency',   '평가역량'],
    ['CompetencyAssessment', 'assessesPerson',     'HumanResource','평가대상'],
    // ── 혜택(Benefit) ─────────────────────────────
    ['Benefit', 'benefitFor',  'HumanResource', '혜택대상'],
    ['Benefit', 'fromPolicy',  'Policy',         '제공정책'],
    // ── 역량(Competency) ─────────────────────────
    ['Competency', 'inCategory',         'CompetencyCategory', '역량분류'],
    ['Competency', 'requiredByOccupation','Occupation',         '직업요건'],
    // ── 기관(Organization) ───────────────────────
    ['Organization', 'locatedIn', 'Region', '소재지역'],
    // ── 경력이력(CareerHistory) ──────────────────
    ['CareerHistory', 'acquiredCompetency', 'Competency',   '습득역량'],
    ['CareerHistory', 'ofPerson',           'HumanResource','경력인원'],
    // ── 국가전략(NationalStrategy) ───────────────
    ['NationalStrategy', 'targetCompetency', 'Competency', '목표역량'],
    ['NationalStrategy', 'hasImplementingOrg', 'Organization', '집행기관'],
    ['Recommendation', 'addressesCompetencyGap', 'CompetencyGap', '대응역량갭'],
  ];

  function _textColor(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
  }

  // ── Depth-based node fill (depth 0=root, aligned with ProteGraf DEPTH_FILL[1+]) ──
  const DEPTH_FILL = [
    '#BDBDBD',  // 0  (unused — owl:Thing placeholder)
    '#CE93D8',  // 1  root classes
    '#90CAF9',  // 2
    '#80CBC4',  // 3
    '#A5D6A7',  // 4
    '#FFD54F',  // 5
    '#FFAB91',  // 6+
  ];

  // ── Selection state ───────────────────────────────────────────────────────
  const _selClasses = new Set();
  const _selInstances = new Map();

  let _sim = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _childrenOf(cls) {
    return Object.entries(HIERARCHY).filter(([, p]) => p === cls).map(([c]) => c).sort();
  }

  function _depthOf(cls) {
    let d = 0, cur = HIERARCHY[cls];
    while (cur) { d++; cur = HIERARCHY[cur]; }
    return d;
  }

  function _allClasses() {
    const s = new Set(ROOT_CLASSES);
    Object.keys(HIERARCHY).forEach(k => s.add(k));
    Object.values(HIERARCHY).forEach(v => s.add(v));
    return [...s];
  }

  function _instancesOf(cls) { return _getDataInstances(cls); }

  // Return all OBJECT_PROPS where cls is source OR target
  function _propsOf(cls) {
    return OBJECT_PROPS.filter(([src, , tgt]) => src === cls || tgt === cls);
  }

  // ── Tree builder ──────────────────────────────────────────────────────────
  function _buildTreeHTML(cls, depth) {
    const children = _childrenOf(cls);
    const hasChildren = children.length > 0;
    const pad = depth * 14;

    let html = `<div class="og-tree-node" style="padding-left:${pad}px">`;
    html += hasChildren
      ? `<span class="og-tree-toggle" data-cls="${cls}">▶</span>`
      : `<span class="og-tree-spacer"></span>`;
    html += `<span class="og-tree-class" data-cls="${cls}" id="og-node-${cls}">${cls}</span></div>`;

    if (hasChildren) {
      html += `<div class="og-tree-children" id="ogc-${cls}" style="display:none;">`;
      children.forEach(ch => { html += _buildTreeHTML(ch, depth + 1); });
      html += `</div>`;
    }
    return html;
  }

  function _buildFullTree() {
    return ROOT_CLASSES.map(rc => _buildTreeHTML(rc, 0)).join('');
  }

  // ── Selection management ──────────────────────────────────────────────────
  function _toggleClass(cls) {
    if (_selClasses.has(cls)) {
      _selClasses.delete(cls);
    } else {
      _selClasses.add(cls);
      let cur = HIERARCHY[cls];
      while (cur) {
        const ch = document.getElementById('ogc-' + cur);
        if (ch && ch.style.display === 'none') {
          ch.style.display = 'block';
          const tog = document.querySelector(`.og-tree-toggle[data-cls="${cur}"]`);
          if (tog) tog.textContent = '▼';
        }
        cur = HIERARCHY[cur];
      }
    }
    _syncTreeHighlight();
    _updateBadge();
    _buildMultiGraph();
    _renderInstPanel();
  }

  function _toggleInstance(inst, cls) {
    if (_selInstances.has(inst)) {
      _selInstances.delete(inst);
    } else {
      _selInstances.set(inst, cls);
    }
    _syncTreeHighlight();
    _updateBadge();
    _buildMultiGraph();
    _renderInstPanel();
  }

  function _clearSelection() {
    _selClasses.clear();
    _selInstances.clear();
    _syncTreeHighlight();
    _updateBadge();
    _buildMultiGraph();
    _renderInstPanel();
  }

  function _syncTreeHighlight() {
    document.querySelectorAll('.og-tree-class').forEach(el => {
      el.classList.toggle('og-selected', _selClasses.has(el.dataset.cls));
    });
    document.querySelectorAll('.og-tree-instance').forEach(el => {
      el.classList.toggle('og-sel-inst', _selInstances.has(el.dataset.inst));
    });
  }

  function _updateBadge() {
    const badge = document.getElementById('og-sel-badge');
    if (!badge) return;
    const total = _selClasses.size + _selInstances.size;
    badge.textContent = total > 0 ? `${total}개 선택됨` : '선택 없음';
    badge.className = total > 0 ? 'og-badge og-badge-active' : 'og-badge';
  }

  // ── Multi-graph builder ───────────────────────────────────────────────────
  function _buildMultiGraph() {
    const nodes = [], links = [];
    const nodeMap = new Map();

    const PRIORITY = { selected: 6, 'selected-inst': 6, child: 5, instance: 4, context: 3, propctx: 2, grandcontext: 1 };

    function addNode(id, type) {
      if (nodeMap.has(id)) {
        const ex = nodeMap.get(id);
        if ((PRIORITY[type] || 0) > (PRIORITY[ex.type] || 0)) ex.type = type;
        return ex;
      }
      const n = { id, type, label: id };
      nodeMap.set(id, n);
      nodes.push(n);
      return n;
    }

    function addLink(src, tgt, rel, propName, korLabel) {
      const key = `${src}|${tgt}|${rel}|${propName || ''}`;
      if (links.some(l => `${l.source}|${l.target}|${l.rel}|${l.propName || ''}` === key)) return;
      // Merge duplicate objectProp edges between same pair (show combined label)
      if (rel === 'objectProp') {
        const existing = links.find(l =>
          l.rel === 'objectProp' &&
          ((l.source === src && l.target === tgt) || (l.source === tgt && l.target === src))
        );
        if (existing) {
          if (korLabel && !existing.korLabel.includes(korLabel)) {
            existing.korLabel += ' / ' + korLabel;
          }
          return;
        }
      }
      links.push({ source: src, target: tgt, rel, propName: propName || '', korLabel: korLabel || '' });
    }

    if (_selClasses.size === 0 && _selInstances.size === 0) {
      ROOT_CLASSES.slice(0, 14).forEach(rc => addNode(rc, 'context'));
      // Show object property links between root classes in overview
      OBJECT_PROPS.forEach(([src, prop, tgt, kor]) => {
        if (nodeMap.has(src) && nodeMap.has(tgt)) {
          addLink(src, tgt, 'objectProp', prop, kor);
        }
      });
      _render(nodes, links, null);
      return;
    }

    // Add each selected class and its neighborhood
    _selClasses.forEach(cls => {
      addNode(cls, 'selected');

      // ── subClassOf hierarchy ──
      const parent = HIERARCHY[cls];
      if (parent) {
        addNode(parent, _selClasses.has(parent) ? 'selected' : 'context');
        addLink(cls, parent, 'subClassOf');
        const gp = HIERARCHY[parent];
        if (gp && !_selClasses.has(gp)) {
          addNode(gp, 'grandcontext');
          addLink(parent, gp, 'subClassOf');
        }
      }
      _childrenOf(cls).forEach(ch => {
        addNode(ch, _selClasses.has(ch) ? 'selected' : 'child');
        addLink(ch, cls, 'subClassOf');
        if (!_selClasses.has(ch)) {
          _childrenOf(ch).slice(0, 2).forEach(gch => {
            addNode(gch, _selClasses.has(gch) ? 'selected' : 'grandcontext');
            addLink(gch, ch, 'subClassOf');
          });
        }
      });

      // ── Instances ──
      const insts = _instancesOf(cls);
      insts.slice(0, 4).forEach(inst => {
        addNode(inst, _selInstances.has(inst) ? 'selected-inst' : 'instance');
        addLink(inst, cls, 'instanceOf');
        nodeMap.get(inst).parentCls = cls;
      });
      if (insts.length > 4) {
        const moreId = `+${insts.length - 4} (${cls})`;
        addNode(moreId, 'more');
        addLink(moreId, cls, 'instanceOf');
      }

      // ── Object properties: add prop-context neighbors ──
      _propsOf(cls).forEach(([src, prop, tgt, kor]) => {
        const neighborCls = (src === cls) ? tgt : src;
        if (!_selClasses.has(neighborCls)) {
          addNode(neighborCls, 'propctx');
        }
        // Always draw the objectProp edge between canonical direction
        addLink(src, tgt, 'objectProp', prop, kor);
      });
    });

    // Add each selected instance and its neighborhood
    _selInstances.forEach((cls, inst) => {
      addNode(inst, 'selected-inst');
      nodeMap.get(inst).parentCls = cls;

      if (cls) {
        addNode(cls, _selClasses.has(cls) ? 'selected' : 'context');
        addLink(inst, cls, 'instanceOf');

        const gp = HIERARCHY[cls];
        if (gp) {
          addNode(gp, _selClasses.has(gp) ? 'selected' : 'grandcontext');
          addLink(cls, gp, 'subClassOf');
        }

        _instancesOf(cls).filter(i => i !== inst && !_selInstances.has(i)).slice(0, 3).forEach(sib => {
          addNode(sib, 'instance');
          addLink(sib, cls, 'instanceOf');
          nodeMap.get(sib).parentCls = cls;
        });

        // Show object properties of the parent class
        _propsOf(cls).forEach(([src, prop, tgt, kor]) => {
          const neighborCls = (src === cls) ? tgt : src;
          if (!nodeMap.has(neighborCls)) addNode(neighborCls, 'propctx');
          addLink(src, tgt, 'objectProp', prop, kor);
        });
      }
    });

    // Bridge shared ancestors between selected classes
    if (_selClasses.size >= 2) {
      const selArr = [..._selClasses];
      for (let i = 0; i < selArr.length; i++) {
        for (let j = i + 1; j < selArr.length; j++) {
          _findSharedAncestor(selArr[i], selArr[j], nodeMap, addLink);
        }
      }
    }

    _render(nodes, links, null);
  }

  function _findSharedAncestor(a, b, nodeMap, addLink) {
    const pathA = _ancestorPath(a);
    const pathB = _ancestorPath(b);
    for (const anc of pathA) {
      if (pathB.includes(anc) && nodeMap.has(anc)) {
        const idxA = pathA.indexOf(anc);
        const idxB = pathB.indexOf(anc);
        if (idxA > 0 && nodeMap.has(pathA[idxA - 1])) addLink(pathA[idxA - 1], anc, 'subClassOf');
        if (idxB > 0 && nodeMap.has(pathB[idxB - 1])) addLink(pathB[idxB - 1], anc, 'subClassOf');
        return;
      }
    }
  }

  function _ancestorPath(cls) {
    const path = [];
    let cur = HIERARCHY[cls];
    while (cur) { path.push(cur); cur = HIERARCHY[cur]; }
    return path;
  }

  // ── D3 render ─────────────────────────────────────────────────────────────
  const NODE_W = 120, NODE_H = 32, INST_R = 22;

  function _render(nodes, links, _selectedId) {
    const wrap = document.getElementById('og-graph-wrap');
    if (!wrap) return;
    if (_sim) { _sim.stop(); _sim = null; }
    wrap.innerHTML = '';

    const W = wrap.clientWidth || 700;
    const H = wrap.clientHeight || 520;

    const svg = d3.select(wrap).append('svg').attr('width', '100%').attr('height', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`);

    const defs = svg.append('defs');

    // subClassOf arrow — hollow blue triangle
    defs.append('marker').attr('id', 'og-arr-sub')
      .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5Z')
      .attr('fill', 'none').attr('stroke', '#5b9bd5').attr('stroke-width', 1.5);

    // instanceOf arrow — filled orange
    defs.append('marker').attr('id', 'og-arr-inst')
      .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5Z')
      .attr('fill', '#e08040').attr('stroke', '#e08040').attr('stroke-width', 1);

    // objectProp arrow — green diamond/arrow
    defs.append('marker').attr('id', 'og-arr-prop')
      .attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 8).attr('markerHeight', 8).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5L3,0Z')
      .attr('fill', '#3fb950').attr('stroke', '#3fb950').attr('stroke-width', 1);

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform)));

    const cx = W / 2, cy = H / 2;
    const selNodes = nodes.filter(n => n.type === 'selected' || n.type === 'selected-inst');
    const otherNodes = nodes.filter(n => n.type !== 'selected' && n.type !== 'selected-inst');

    selNodes.forEach((n, i) => {
      const a = (i / (selNodes.length || 1)) * 2 * Math.PI;
      n.x = cx + 80 * Math.cos(a);
      n.y = cy + 60 * Math.sin(a);
    });
    otherNodes.forEach((n, i) => {
      const a = (i / (otherNodes.length || 1)) * 2 * Math.PI;
      const r = 200 + Math.random() * 80;
      n.x = cx + r * Math.cos(a);
      n.y = cy + r * Math.sin(a);
    });

    // Draw links
    const linkSel = g.append('g').selectAll('line').data(links).join('line')
      .attr('class', d => {
        if (d.rel === 'objectProp') return 'og-link og-link-objectProp';
        return 'og-link og-link-' + d.rel;
      })
      .attr('marker-end', d => {
        if (d.rel === 'instanceOf') return 'url(#og-arr-inst)';
        if (d.rel === 'objectProp') return 'url(#og-arr-prop)';
        return 'url(#og-arr-sub)';
      });

    // Link labels for objectProp edges
    const propLinks = links.filter(l => l.rel === 'objectProp');
    const linkLabelSel = g.append('g').selectAll('text.og-link-label')
      .data(propLinks).join('text')
      .attr('class', 'og-link-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(d => d.korLabel || d.propName || '');

    // Draw nodes
    const nodeSel = g.append('g').selectAll('g.og-node').data(nodes).join('g')
      .attr('class', d => {
        const isCircle = d.type === 'instance' || d.type === 'selected-inst' || d.type === 'more';
        const depthCls = isCircle ? '' : ` og-node-depth-${Math.min(_depthOf(d.id), 3)}`;
        return `og-node og-node-${d.type}${depthCls}`;
      })
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on('click', (e, d) => {
        e.stopPropagation();
        if (d.type === 'more') return;
        if (d.type === 'instance' || d.type === 'selected-inst') {
          _toggleInstance(d.id, d.parentCls);
        } else {
          _toggleClass(d.id);
        }
        _showNodeInfo(d);
      });

    // Propagate parentCls to instance nodes
    links.forEach(l => {
      if (l.rel === 'instanceOf') {
        const iid = typeof l.source === 'object' ? l.source.id : l.source;
        const tid = typeof l.target === 'object' ? l.target.id : l.target;
        const iNode = nodes.find(n => n.id === iid);
        if (iNode && !iNode.parentCls) iNode.parentCls = tid;
      }
    });

    nodeSel.each(function(d) {
      const sel = d3.select(this);
      if (d.type === 'instance' || d.type === 'selected-inst' || d.type === 'more') {
        sel.append('circle').attr('r', INST_R);
        sel.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em')
          .text(d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label);
      } else {
        const depthFill = DEPTH_FILL[Math.min(_depthOf(d.id) + 1, DEPTH_FILL.length - 1)];
        sel.append('rect').attr('x', -NODE_W / 2).attr('y', -NODE_H / 2)
          .attr('width', NODE_W).attr('height', NODE_H).attr('rx', 4)
          .style('fill', depthFill);
        sel.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em')
          .style('fill', _textColor(depthFill))
          .text(d.label.length > 16 ? d.label.slice(0, 15) + '…' : d.label);
      }
    });

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.rel === 'objectProp' ? 200 : 140).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(cx, cy))
      .force('collide', d3.forceCollide(70))
      .on('tick', () => {
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
        linkSel
          .attr('x1', d => _edgeX(d.source, d.target, true))
          .attr('y1', d => _edgeY(d.source, d.target, true))
          .attr('x2', d => _edgeX(d.source, d.target, false))
          .attr('y2', d => _edgeY(d.source, d.target, false));
        linkLabelSel
          .attr('x', d => ((d.source.x || 0) + (d.target.x || 0)) / 2)
          .attr('y', d => ((d.source.y || 0) + (d.target.y || 0)) / 2 - 7);
      });

    _sim = sim;
  }

  function _isCircleNode(n) {
    return n.type === 'instance' || n.type === 'selected-inst' || n.type === 'more';
  }

  function _edgeX(src, tgt, fromSrc) {
    const s = fromSrc ? src : tgt, t = fromSrc ? tgt : src;
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (_isCircleNode(s)) return s.x + INST_R * dx / dist;
    const hw = NODE_W / 2, hh = NODE_H / 2;
    const r = (Math.abs(dx) * hh > Math.abs(dy) * hw) ? hw / Math.abs(dx) : hh / Math.abs(dy);
    return s.x + dx * r;
  }

  function _edgeY(src, tgt, fromSrc) {
    const s = fromSrc ? src : tgt, t = fromSrc ? tgt : src;
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (_isCircleNode(s)) return s.y + INST_R * dy / dist;
    const hw = NODE_W / 2, hh = NODE_H / 2;
    const r = (Math.abs(dx) * hh > Math.abs(dy) * hw) ? hw / Math.abs(dx) : hh / Math.abs(dy);
    return s.y + dy * r;
  }

  // ── Instance list panel ───────────────────────────────────────────────────
  function _renderInstPanel() {
    const container = document.getElementById('og-inst-panel-list');
    const body = document.getElementById('og-inst-panel-body');
    if (!container || !body) return;

    if (_selClasses.size === 0) {
      container.style.display = 'none';
      return;
    }

    let html = '';
    _selClasses.forEach(cls => {
      const insts = _instancesOf(cls);
      const depth = _depthOf(cls);
      html += `<div class="og-inst-group">`;
      html += `<div class="og-inst-group-title og-depth-${Math.min(depth, 3)}">${cls} <span class="og-inst-count">(${insts.length}개)</span></div>`;
      if (insts.length === 0) {
        html += `<div class="og-inst-empty">인스턴스 없음</div>`;
      } else {
        insts.forEach(id => {
          const name = _getInstanceLabel(id);
          const isSel = _selInstances.has(id);
          html += `<div class="og-inst-row${isSel ? ' og-inst-sel' : ''}" data-inst="${id}" data-cls="${cls}">`;
          html += `<span class="og-inst-bullet">◉</span>`;
          html += `<span class="og-inst-name">${name !== id ? name : id}</span>`;
          if (name !== id) html += `<br><span class="og-inst-id-small">${id}</span>`;
          html += `</div>`;
        });
      }
      html += `</div>`;
    });

    body.innerHTML = html;
    container.style.display = 'block';

    body.querySelectorAll('.og-inst-row').forEach(el => {
      el.addEventListener('click', () => {
        _toggleInstance(el.dataset.inst, el.dataset.cls);
      });
    });
  }

  // ── Info panel ────────────────────────────────────────────────────────────
  function _showNodeInfo(d) {
    const panel = document.getElementById('og-info-panel');
    if (!panel) return;
    const parent = HIERARCHY[d.id];
    const children = _childrenOf(d.id);
    const insts = _instancesOf(d.id);
    const isSelCls = _selClasses.has(d.id);
    const isSelInst = _selInstances.has(d.id);
    const props = _propsOf(d.id);

    let html = `<div class="og-info-title">${d.id}</div>`;
    html += `<div class="og-info-status">${isSelCls || isSelInst ? '✅ 선택됨' : '선택 안 됨'} — 클릭하여 ${isSelCls || isSelInst ? '해제' : '추가'}</div>`;
    if (parent) html += `<div class="og-info-row"><b>subClassOf:</b> ${parent}</div>`;
    if (children.length) html += `<div class="og-info-row"><b>하위클래스(${children.length}):</b> ${children.slice(0, 5).join(', ')}${children.length > 5 ? '…' : ''}</div>`;
    if (insts.length) {
      html += `<div class="og-info-row"><b>인스턴스 (${insts.length}개):</b></div>`;
      html += '<div class="og-info-inst-list">';
      insts.slice(0, 8).forEach(id => {
        const name = _getInstanceLabel(id);
        html += `<div class="og-info-inst-item"><span class="og-inst-dot">◉</span> <span class="og-inst-id">${id}</span>${name !== id ? ` — ${name}` : ''}</div>`;
      });
      if (insts.length > 8) html += `<div class="og-info-inst-more">… 외 ${insts.length - 8}개</div>`;
      html += '</div>';
    }

    // Object properties
    const outProps = props.filter(([src]) => src === d.id);
    const inProps  = props.filter(([, , tgt]) => tgt === d.id);
    if (outProps.length) {
      html += `<div class="og-info-row"><b>→ 관계(출력):</b></div>`;
      outProps.forEach(([, prop, tgt, kor]) => {
        html += `<div class="og-info-row og-prop-row"><span class="og-prop-tag">→</span> <em>${kor || prop}</em> ▶ <b>${tgt}</b></div>`;
      });
    }
    if (inProps.length) {
      html += `<div class="og-info-row"><b>← 관계(입력):</b></div>`;
      inProps.forEach(([src, prop, , kor]) => {
        html += `<div class="og-info-row og-prop-row"><span class="og-prop-tag">←</span> <b>${src}</b> ▶ <em>${kor || prop}</em></div>`;
      });
    }

    panel.innerHTML = html;
    panel.style.display = 'block';
  }

  // ── Search ────────────────────────────────────────────────────────────────
  function _search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const allCls = _allClasses();
    const matched = allCls.find(c => c.toLowerCase() === q) || allCls.find(c => c.toLowerCase().includes(q));
    if (matched) {
      if (!_selClasses.has(matched)) _toggleClass(matched);
      const el = document.getElementById('og-node-' + matched);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const idx = _buildIdIndex();
    for (const [id, entry] of idx) {
      if (id.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q)) {
        const cls = entry.cls;
        if (!_selClasses.has(cls)) _toggleClass(cls);
        const el = document.getElementById('og-node-' + cls);
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const panel = document.getElementById('og-info-panel');
        if (panel) {
          panel.innerHTML = `<div class="og-info-title">${id}</div><div class="og-info-row"><b>이름:</b> ${entry.name}</div><div class="og-info-row"><b>클래스:</b> ${cls}</div>`;
          panel.style.display = 'block';
        }
        return;
      }
    }
    const panel = document.getElementById('og-info-panel');
    if (panel) {
      panel.innerHTML = `<div class="og-info-row" style="color:#f47;">검색 결과 없음: "${query}"</div>`;
      panel.style.display = 'block';
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    wrap.innerHTML = _ONTOGRAF_TEMPLATE;

    document.getElementById('og-tree-scroll').innerHTML = _buildFullTree();

    wrap.addEventListener('click', evt => {
      const tog = evt.target.closest('.og-tree-toggle');
      if (tog) {
        const cls = tog.dataset.cls;
        const ch = document.getElementById('ogc-' + cls);
        if (ch) {
          const open = ch.style.display !== 'none';
          ch.style.display = open ? 'none' : 'block';
          tog.textContent = open ? '▶' : '▼';
        }
        return;
      }
      const clsEl = evt.target.closest('.og-tree-class');
      if (clsEl) { _toggleClass(clsEl.dataset.cls); return; }
      const instEl = evt.target.closest('.og-tree-instance');
      if (instEl) { _toggleInstance(instEl.dataset.inst, instEl.dataset.cls); return; }
    });

    document.getElementById('og-search-btn').addEventListener('click', () =>
      _search(document.getElementById('og-search-input').value));
    document.getElementById('og-search-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') _search(e.target.value);
    });
    document.getElementById('og-clear-btn').addEventListener('click', _clearSelection);
    document.getElementById('og-graph-wrap').addEventListener('click', () => {
      const p = document.getElementById('og-info-panel');
      if (p) p.style.display = 'none';
    });

    // Default: show overview (no selection) with object property relationships
    _buildMultiGraph();
  }

  return { init };
})();
