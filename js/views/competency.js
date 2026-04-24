Object.assign(App, {
  _COMP_L2_LABEL: {
    'Business_Admin':   '비즈니스 행정 (Business_Admin)',
    'ICT_Dev':          'ICT 개발 (ICT_Dev)',
    'Industrial_Tech':  '산업기술 (Industrial_Tech)',
    'Basic_Academic':   '기초학업 (Basic_Academic)',
    'Civic_Literacy':   '시민 리터러시 (Civic_Literacy)',
    'Digital_Literacy': '디지털 리터러시 (Digital_Literacy)',
    'Interpersonal':    '대인관계 (Interpersonal)',
    'Problem_Solving':  '문제해결 (Problem_Solving)',
    'Self_Management':  '자기관리 (Self_Management)',
  },

  _COMP_L2_DESC: {
    'Business_Admin':   '경영·마케팅·전략기획 등 비즈니스 행정 전문 역량. Protege 계층: HardSkill > Business_Admin',
    'ICT_Dev':          'AI·인프라·소프트웨어 개발 등 ICT 기술 역량. Protege 계층: HardSkill > ICT_Dev',
    'Industrial_Tech':  '제조·공공서비스 등 산업 현장 전문 기술 역량. Protege 계층: HardSkill > Industrial_Tech',
    'Basic_Academic':   'CS·수리·언어 등 학습 기반이 되는 기초학업 역량. Protege 계층: Literacy > Basic_Academic',
    'Civic_Literacy':   '시민의식·사회적 가치·윤리 등 시민 리터러시. Protege 계층: Literacy > Civic_Literacy',
    'Digital_Literacy': '데이터·AI 활용 및 디지털 보안 리터러시 역량. Protege 계층: Literacy > Digital_Literacy',
    'Interpersonal':    '협업·리더십·네트워킹 등 대인관계 역량. Protege 계층: SoftSkill > Interpersonal',
    'Problem_Solving':  '창의성·사고력 등 문제해결 역량. Protege 계층: SoftSkill > Problem_Solving',
    'Self_Management':  '적응력·신뢰성 등 자기관리 역량. Protege 계층: SoftSkill > Self_Management',
  },

  _COMP_L3_LABEL: {
    'Management':           '경영관리 (Management)',
    'Marketing_Sales':      '마케팅·영업 (Marketing_Sales)',
    'Marketing_Strategy':   '마케팅 전략 (Marketing_Strategy)',
    'AI_and_Infrastructure':'AI·인프라 (AI_and_Infrastructure)',
    'Software':             '소프트웨어 (Software)',
    'Manufacturing':        '제조·생산 (Manufacturing)',
    'Service_Public':       '공공서비스 (Service_Public)',
    'CS_Foundation':        'CS 기초 (CS_Foundation)',
    'Language_and_Math':    '언어·수리 (Language_and_Math)',
    'Social_Value':         '사회적 가치 (Social_Value)',
    'Data_Fluency':         '데이터 활용 (Data_Fluency)',
    'Data_and_AI':          '데이터·AI (Data_and_AI)',
    'Tech_Security':        '기술보안 (Tech_Security)',
    'Collaboration':        '협업 (Collaboration)',
    'Leadership':           '리더십 (Leadership)',
    'Thinking_Skill':       '사고력 (Thinking_Skill)',
    'Adaptability':         '적응력 (Adaptability)',
    'Reliability':          '신뢰성 (Reliability)',
  },

  _renderCompetency() {
    const d = HRDData;
    const hardCount = d.competencies.filter(c => c.class === 'HardSkill').length;
    const litCount  = d.competencies.filter(c => c.class === 'Literacy').length;
    const softCount = d.competencies.filter(c => c.class === 'SoftSkill').length;

    this._setKPI('totalCompetencies', d.competencies.length);
    this._setKPI('developmentTarget', hardCount + '개 전문기술');
    this._setKPI('avgProficiency', litCount + '개 기초소양');
    this._setKPI('improvementRate', softCount + '개 소프트스킬');

    const view = document.getElementById('view-competency');

    if (view && !view.querySelector('.comp-view-toggle')) {
      const kpiGrid = view.querySelector('.kpi-grid');
      const toggle = document.createElement('div');
      toggle.className = 'comp-view-toggle';
      toggle.innerHTML = `
        <button class="comp-view-btn active" data-view="chart">도넛 차트</button>
        <button class="comp-view-btn" data-view="heatmap">기관×역량 히트맵</button>
        <button class="comp-view-btn" data-view="workflow">갭 해결 현황</button>
      `;
      kpiGrid.insertAdjacentElement('afterend', toggle);
      toggle.querySelectorAll('.comp-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          toggle.querySelectorAll('.comp-view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._compViewMode = btn.dataset.view;
          this._applyCompViewMode(view);
        });
      });
    }

    if (view && !view.querySelector('.comp-class-bar')) {
      const chartContainer = view.querySelector('.chart-container');
      const bar = document.createElement('div');
      bar.className = 'comp-class-bar policy-class-bar';
      bar.innerHTML = `
        <button class="comp-class-btn policy-class-btn active" data-mode="all">전체</button>
        <button class="comp-class-btn policy-class-btn" data-mode="HardSkill">Hard Skill</button>
        <button class="comp-class-btn policy-class-btn" data-mode="Literacy">Literacy</button>
        <button class="comp-class-btn policy-class-btn" data-mode="SoftSkill">Soft Skill</button>
      `;
      chartContainer.parentNode.insertBefore(bar, chartContainer);
      bar.querySelectorAll('.comp-class-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          bar.querySelectorAll('.comp-class-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._compClassMode = btn.dataset.mode;
          this._updateCompetencyChart();
        });
      });
    }

    if (view && !view.querySelector('.comp-chart-split')) {
      const chartContainer = view.querySelector('.chart-container');
      const split = document.createElement('div');
      split.className = 'comp-chart-split policy-chart-split';
      const legendDiv = document.createElement('div');
      legendDiv.id = 'compLegend';
      legendDiv.className = 'comp-legend-panel policy-legend-panel';
      chartContainer.parentNode.insertBefore(split, chartContainer);
      split.appendChild(chartContainer);
      chartContainer.classList.add('policy-chart-half');
      split.appendChild(legendDiv);
    }

    if (!this._compClassMode) this._compClassMode = 'all';
    if (!this._compViewMode) this._compViewMode = 'chart';
    this._applyCompViewMode(view);

    const listEl = document.getElementById('competencyList');
    if (listEl) {
      listEl.innerHTML = d.competencies.map(c => {
        const cls = c.class || '미분류';
        const l2 = this._COMP_L2_LABEL[c.level2] || c.level2 || '';
        const l3 = this._COMP_L3_LABEL[c.level3] || c.level3 || '';
        const clsColor = { HardSkill: '#00d4ff', Literacy: '#ffd700', SoftSkill: '#00ff41' }[cls] || '#a0aab8';
        return `<div class="item item-clickable" data-comp-id="${c.id}">
          <div class="item-name">${c.name || c.en}</div>
          <div class="item-detail">
            <span style="color:${clsColor};font-size:10px;font-weight:600">${cls}</span>
            · ${l2} · ${l3}
          </div>
        </div>`;
      }).join('');
      listEl.querySelectorAll('.item-clickable').forEach(el => {
        el.addEventListener('click', () => {
          const comp = d.competencies.find(c => c.id === el.dataset.compId);
          if (comp) this._showCompetencyDetail(comp);
        });
      });
    }
  },

  _updateCompetencyChart() {
    const d = HRDData;
    const mode = this._compClassMode || 'all';
    const l2Label = this._COMP_L2_LABEL;
    const l2Desc  = this._COMP_L2_DESC;
    const palette = {
      HardSkill: ['#00d4ff','#0099cc','#006699'],
      Literacy:  ['#ffd700','#ffaa00','#ff8800'],
      SoftSkill: ['#00ff41','#00cc33','#009922'],
    };
    const allPalette = ['#00d4ff','#ffd700','#00ff41'];

    const L2_ORDER = {
      HardSkill: ['Business_Admin','ICT_Dev','Industrial_Tech'],
      Literacy:  ['Basic_Academic','Civic_Literacy','Digital_Literacy'],
      SoftSkill: ['Interpersonal','Problem_Solving','Self_Management'],
    };

    let entries, colors, groupComps;

    if (mode === 'all') {
      const groups = { HardSkill: [], Literacy: [], SoftSkill: [] };
      const displayLabel = {
        HardSkill: 'Hard Skill (전문기술)',
        Literacy:  'Literacy (기초소양)',
        SoftSkill: 'Soft Skill (소프트스킬)',
      };
      d.competencies.forEach(c => { if (groups[c.class]) groups[c.class].push(c); });
      entries = ['HardSkill','Literacy','SoftSkill'].map(k => [displayLabel[k], groups[k].length]);
      colors = allPalette;
      groupComps = {
        [displayLabel.HardSkill]: groups.HardSkill,
        [displayLabel.Literacy]:  groups.Literacy,
        [displayLabel.SoftSkill]: groups.SoftSkill,
      };
    } else {
      const order = L2_ORDER[mode] || [];
      const subGroups = {};
      order.forEach(l2 => { subGroups[l2] = []; });
      d.competencies
        .filter(c => c.class === mode)
        .forEach(c => {
          const l2 = c.level2 || 'Unknown';
          if (!subGroups[l2]) subGroups[l2] = [];
          subGroups[l2].push(c);
        });
      const pal = palette[mode] || allPalette;
      entries = order
        .filter(l2 => subGroups[l2] && subGroups[l2].length > 0)
        .map((l2, i) => [l2Label[l2] || l2, subGroups[l2].length, pal[i % pal.length], l2]);
      colors = entries.map(e => e[2]);
      groupComps = {};
      entries.forEach(e => { groupComps[e[0]] = subGroups[e[3]]; });
      entries = entries.map(e => [e[0], e[1]]);
    }

    const chartLabels = entries.map(e => e[0]);
    const chartData   = entries.map(e => e[1]);

    this._chart('competencyChart', 'doughnut', {
      labels: chartLabels,
      datasets: [{ data: chartData, backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 2 }],
    }, {
      plugins: {
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}개` } },
        legend: { display: false },
      },
    });

    const legendEl = document.getElementById('compLegend');
    if (!legendEl) return;

    if (mode === 'all') {
      const mainDesc = {
        'Hard Skill (전문기술)':  'HardSkill — 비즈니스 행정(Business_Admin), ICT 개발(ICT_Dev), 산업기술(Industrial_Tech) 3개 하위 그룹',
        'Literacy (기초소양)':    'Literacy — 기초학업(Basic_Academic), 시민 리터러시(Civic_Literacy), 디지털 리터러시(Digital_Literacy) 3개 하위 그룹',
        'Soft Skill (소프트스킬)':'SoftSkill — 대인관계(Interpersonal), 문제해결(Problem_Solving), 자기관리(Self_Management) 3개 하위 그룹',
      };
      legendEl.innerHTML = entries.map(([label, count], i) => {
        const col = colors[i];
        const desc = mainDesc[label] || '';
        return `
          <div class="policy-legend-item comp-legend-item" data-group="${label}" style="flex-direction:column;align-items:flex-start;gap:2px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer">
            <div style="display:flex;align-items:center;gap:6px;width:100%">
              <span class="policy-legend-dot" style="background:${col};box-shadow:0 0 6px ${col}88;flex-shrink:0"></span>
              <span class="policy-legend-label" style="flex:1;font-size:12px">${label}</span>
              <span class="policy-legend-count">${count}</span>
            </div>
            <div style="font-size:10px;color:#6a7f90;margin-left:16px;line-height:1.4">${desc}</div>
          </div>`;
      }).join('');
    } else {
      const order = L2_ORDER[mode] || [];
      const pal = palette[mode] || allPalette;
      legendEl.innerHTML = order
        .filter(l2 => groupComps[l2Label[l2] || l2] && groupComps[l2Label[l2] || l2].length > 0)
        .map((l2, i) => {
          const label = l2Label[l2] || l2;
          const count = (groupComps[label] || []).length;
          const col = pal[i % pal.length];
          const desc = l2Desc[l2] || '';
          return `
            <div class="policy-legend-item comp-legend-item" data-group="${label}" style="flex-direction:column;align-items:flex-start;gap:2px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer">
              <div style="display:flex;align-items:center;gap:6px;width:100%">
                <span class="policy-legend-dot" style="background:${col};box-shadow:0 0 6px ${col}88;flex-shrink:0"></span>
                <span class="policy-legend-label" style="flex:1;font-size:12px">${label}</span>
                <span class="policy-legend-count">${count}</span>
              </div>
              ${desc ? `<div style="font-size:10px;color:#6a7f90;margin-left:16px;line-height:1.4">${desc}</div>` : ''}
            </div>`;
        }).join('');
    }

    legendEl.querySelectorAll('.comp-legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const group = item.dataset.group;
        this._showCompGroupPopup(group, groupComps[group] || []);
      });
    });
  },

  _showCompGroupPopup(groupName, comps) {
    const l3Label = this._COMP_L3_LABEL;
    const byL3 = {};
    comps.forEach(c => {
      const l3key = l3Label[c.level3] || c.level3 || '기타';
      if (!byL3[l3key]) byL3[l3key] = [];
      byL3[l3key].push(c);
    });

    const clsColor = { HardSkill: '#00d4ff', Literacy: '#ffd700', SoftSkill: '#00ff41' };
    const listHtml = Object.entries(byL3).map(([l3, items]) => `
      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:#a0aab8;font-weight:600;margin-bottom:4px;padding-left:4px">${l3}</div>
        ${items.map(c => {
          const col = clsColor[c.class] || '#a0aab8';
          return `<div class="detail-list-item comp-group-row" data-comp-id="${c.id}" style="cursor:pointer">
            <span class="detail-dot"></span>
            <span style="flex:1">${c.name || c.en}</span>
            <span style="color:${col};font-size:10px">${c.en || ''}</span>
          </div>`;
        }).join('')}
      </div>`).join('');

    const html = `
      <div class="detail-header-block">
        <div class="detail-strategy-label">COMPETENCY GROUP</div>
        <h2 class="detail-title">${groupName}</h2>
        <div class="detail-en">총 ${comps.length}개 역량 · 클릭하면 상세 정보 확인</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">역량 목록 (Level 3 하위분류별)</div>
        <div class="detail-list">${listHtml}</div>
      </div>
    `;
    this._openDetail(html);

    document.querySelectorAll('.comp-group-row').forEach(row => {
      row.addEventListener('click', () => {
        const comp = HRDData.competencies.find(c => c.id === row.dataset.compId);
        if (comp) this._showCompetencyDetail(comp);
      });
    });
  },

  _showCompetencyDetail(comp) {
    const l2Label = this._COMP_L2_LABEL;
    const l3Label = this._COMP_L3_LABEL;
    const l2Desc  = this._COMP_L2_DESC;
    const cls = comp.class || '미분류';
    const clsKo = { HardSkill: 'Hard Skill', Literacy: 'Literacy', SoftSkill: 'Soft Skill' }[cls] || cls;
    const clsColor = { HardSkill: '#00d4ff', Literacy: '#ffd700', SoftSkill: '#00ff41' }[cls] || '#a0aab8';
    const l2 = l2Label[comp.level2] || comp.level2 || '';
    const l3 = l3Label[comp.level3] || comp.level3 || '';
    const descStr = l2Desc[comp.level2] || '';

    const relPrograms = HRDData.programs.filter(p =>
      (Array.isArray(p.relatedCompetencyIds) && p.relatedCompetencyIds.includes(comp.id)) ||
      p.targetCompetencyId === comp.id ||
      p.competencyCategory === comp.category ||
      (comp.catCode && p.fieldCatCode === comp.catCode)
    );

    const progHtml = relPrograms.length
      ? relPrograms.slice(0, 8).map(p => `
          <div class="detail-list-item detail-clickable" data-program-id="${p.id}">
            <span class="detail-dot"></span>
            <span style="flex:1;font-size:11px">${p.name}</span>
            <span style="color:#a0aab8;font-size:10px">${p.org || ''}</span>
          </div>`).join('') + (relPrograms.length > 8 ? `<div style="color:#607080;font-size:11px;padding:4px 0">외 ${relPrograms.length - 8}개 프로그램</div>` : '')
      : '<span class="detail-empty">연관 프로그램 없음</span>';

    const html = `
      <div class="detail-header-block">
        <div class="detail-strategy-label" style="color:${clsColor}">${clsKo}</div>
        <h2 class="detail-title">${comp.name || comp.en}</h2>
        <div class="detail-en">${comp.en || ''}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">역량 소개</div>
        <p class="detail-description">${comp.description || descStr || `${comp.name || comp.en}은(는) ${clsKo} 영역의 핵심 역량으로, ${l2 || '해당 역량군'} 분야 인재 육성을 위한 교육 프로그램(${relPrograms.length}개)과 연계됩니다.`}</p>
        <p class="detail-source"><span class="detail-source-label">📋 근거 문서</span> ${comp.basis || 'NCS(국가직무능력표준), 인재개발법, 국가역량체계(NQF) 등 관련 기준'}</p>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Protege 온톨로지 분류 경로</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
          <span class="detail-tag" style="border-color:${clsColor};color:${clsColor}">${clsKo}</span>
          <span style="color:#506070">▶</span>
          <span class="detail-tag comp">${l2}</span>
          <span style="color:#506070">▶</span>
          <span class="detail-tag comp">${l3}</span>
        </div>
      </div>

      ${descStr ? `
      <div class="detail-section">
        <div class="detail-section-title">역량군 설명</div>
        <div class="detail-en" style="font-size:12px;line-height:1.6">${descStr}</div>
      </div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">연관 교육 프로그램 (${relPrograms.length}개) <span class="detail-hint">클릭하면 상세 정보</span></div>
        <div class="detail-list">${progHtml}</div>
      </div>
    `;
    this._openDetail(html);
    const rebind = () => this._bindCompetencyDetailClicks(comp, relPrograms);
    this._currentRebind = rebind;
    rebind();
  },

  _bindCompetencyDetailClicks(comp, relPrograms) {
    const body = document.getElementById('detailBody');
    if (!body) return;
    const d = HRDData;
    body.querySelectorAll('[data-program-id]').forEach(el => {
      el.addEventListener('click', () => {
        const program = d.programs.find(p => p.id === el.dataset.programId);
        if (program) this._pushProgramDetail(program);
      });
    });
  },

  _applyCompViewMode(view) {
    if (!view) return;
    const classBar   = view.querySelector('.comp-class-bar');
    const chartSplit = view.querySelector('.comp-chart-split');
    let hmWrap  = view.querySelector('.comp-heatmap-wrap');
    let wfWrap  = view.querySelector('.comp-workflow-wrap');

    if (this._compViewMode === 'heatmap') {
      if (classBar)  classBar.style.display  = 'none';
      if (chartSplit) chartSplit.style.display = 'none';
      if (wfWrap)  wfWrap.style.display  = 'none';
      if (!hmWrap) {
        hmWrap = document.createElement('div');
        hmWrap.className = 'comp-heatmap-wrap';
        const listContainer = view.querySelector('.list-container');
        if (listContainer) listContainer.parentNode.insertBefore(hmWrap, listContainer);
        else view.querySelector('.view-content').appendChild(hmWrap);
      }
      hmWrap.style.display = '';
      this._renderCompetencyHeatmap(hmWrap);
    } else if (this._compViewMode === 'workflow') {
      if (classBar)  classBar.style.display  = 'none';
      if (chartSplit) chartSplit.style.display = 'none';
      if (hmWrap)  hmWrap.style.display  = 'none';
      if (!wfWrap) {
        wfWrap = document.createElement('div');
        wfWrap.className = 'comp-workflow-wrap';
        const listContainer = view.querySelector('.list-container');
        if (listContainer) listContainer.parentNode.insertBefore(wfWrap, listContainer);
        else view.querySelector('.view-content').appendChild(wfWrap);
      }
      wfWrap.style.display = '';
      this._renderGapWorkflow(wfWrap);
    } else {
      if (classBar)  classBar.style.display  = '';
      if (chartSplit) chartSplit.style.display = '';
      if (hmWrap)  hmWrap.style.display  = 'none';
      if (wfWrap)  wfWrap.style.display  = 'none';
      this._updateCompetencyChart();
    }
  },

  _renderGapWorkflow(container) {
    const d = HRDData;

    const COMPCAT_LABEL = {
      COMPCAT_Management:           '경영관리',
      COMPCAT_Leadership:           '리더십',
      COMPCAT_Digital_Literacy:     '디지털 리터러시',
      COMPCAT_Collaboration:        '협업',
      COMPCAT_AI_and_Infrastructure:'AI·인프라',
      COMPCAT_Data_Fluency:         '데이터 활용',
      COMPCAT_CS_Foundation:        'CS 기초',
      COMPCAT_Basic_Academic:       '기초학업',
      COMPCAT_Creativity:           '창의성',
      COMPCAT_Software:             '소프트웨어',
      COMPCAT_Social_Value:         '사회적 가치',
      COMPCAT_Thinking:             '사고력',
      COMPCAT_Adaptability:         '적응력',
      COMPCAT_Reliability:          '신뢰성',
      COMPCAT_Green_Tech:           '녹색기술',
      COMPCAT_Strategic:            '전략기획',
      COMPCAT_Capability:           '역량개발',
      COMPCAT_Language_Math:        '언어·수리',
      COMPCAT_Security:             '보안',
      COMPCAT_Manufacturing:        '제조·생산',
    };

    const gapByCat  = {};
    const progByCat = {};

    d.competencyGaps.forEach(g => {
      const cat = g.gapCompetencyId;
      if (cat) gapByCat[cat] = (gapByCat[cat] || 0) + 1;
    });
    d.programs.forEach(p => {
      const cat = p.fieldCatCode;
      if (cat) progByCat[cat] = (progByCat[cat] || 0) + 1;
    });

    const allCats = [...new Set([...Object.keys(gapByCat), ...Object.keys(progByCat)])].sort();

    const statusOf = cat => {
      const pCount = progByCat[cat] || 0;
      if (pCount === 0) return 'todo';
      if (pCount <= 3)  return 'doing';
      return 'done';
    };

    const COLS = [
      { key: 'todo',  label: '미착수',  color: '#ff4757', desc: '프로그램 미연계' },
      { key: 'doing', label: '진행 중', color: '#ffd700', desc: '프로그램 1-3개' },
      { key: 'done',  label: '완료',    color: '#00ff41', desc: '프로그램 4개 이상' },
    ];

    const grouped = { todo: [], doing: [], done: [] };
    allCats.forEach(cat => {
      const st = statusOf(cat);
      grouped[st].push({
        cat,
        label:  COMPCAT_LABEL[cat] || cat.replace('COMPCAT_', ''),
        gaps:   gapByCat[cat]  || 0,
        progs:  progByCat[cat] || 0,
        status: st,
      });
    });
    COLS.forEach(col => grouped[col.key].sort((a, b) => b.gaps - a.gaps));

    const totalGaps  = Object.values(gapByCat).reduce((s, v) => s + v, 0);
    const totalCats  = allCats.length;
    const doneCats   = grouped.done.length;
    const doingCats  = grouped.doing.length;
    const covPct     = totalCats ? Math.round((doneCats + doingCats * 0.5) / totalCats * 100) : 0;

    const cardHtml = item => {
      const pBar = item.progs > 0 ? Math.min(100, item.progs / 10 * 100) : 0;
      return `
        <div class="wf-card" data-cat="${item.cat}" title="${item.cat}">
          <div class="wf-card-name">${item.label}</div>
          <div class="wf-card-meta">
            <span class="wf-badge wf-badge-gap">${item.gaps}개 갭</span>
            <span class="wf-badge wf-badge-prog">${item.progs}개 프로그램</span>
          </div>
          <div class="wf-card-bar">
            <div class="wf-card-bar-fill" style="width:${pBar}%"></div>
          </div>
        </div>`;
    };

    container.innerHTML = `
      <div class="wf-summary">
        <div class="wf-sum-item"><span class="wf-sum-val">${totalGaps}</span><span class="wf-sum-lbl">총 갭 수</span></div>
        <div class="wf-sum-item"><span class="wf-sum-val">${totalCats}</span><span class="wf-sum-lbl">역량 카테고리</span></div>
        <div class="wf-sum-item"><span class="wf-sum-val" style="color:#00ff41">${doneCats}</span><span class="wf-sum-lbl">완료</span></div>
        <div class="wf-sum-item"><span class="wf-sum-val" style="color:#ffd700">${doingCats}</span><span class="wf-sum-lbl">진행 중</span></div>
        <div class="wf-sum-item"><span class="wf-sum-val" style="color:#ff4757">${grouped.todo.length}</span><span class="wf-sum-lbl">미착수</span></div>
        <div class="wf-sum-item"><span class="wf-sum-val" style="color:#00d4ff">${covPct}%</span><span class="wf-sum-lbl">해소율</span></div>
      </div>
      <div class="wf-board">
        ${COLS.map(col => `
          <div class="wf-col">
            <div class="wf-col-header" style="border-top:3px solid ${col.color}">
              <span class="wf-col-title" style="color:${col.color}">${col.label}</span>
              <span class="wf-col-count">${grouped[col.key].length}개</span>
              <div class="wf-col-desc">${col.desc}</div>
            </div>
            <div class="wf-col-cards">
              ${grouped[col.key].map(cardHtml).join('')}
            </div>
          </div>`).join('')}
      </div>
    `;

    container.querySelectorAll('.wf-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat    = card.dataset.cat;
        const label  = COMPCAT_LABEL[cat] || cat;
        const gaps   = (gapByCat[cat]  || 0);
        const progs  = d.programs.filter(p => p.fieldCatCode === cat);
        const st     = statusOf(cat);
        const stKo   = { todo: '미착수', doing: '진행 중', done: '완료' }[st];
        const stCol  = { todo: '#ff4757', doing: '#ffd700', done: '#00ff41' }[st];
        const progHtml = progs.length
          ? progs.slice(0, 12).map(p => `
              <div class="detail-list-item detail-clickable" data-program-id="${p.id}">
                <span class="detail-dot"></span>
                <span style="flex:1;font-size:11px">${p.name}</span>
                <span style="color:#a0aab8;font-size:10px">${p.org || ''}</span>
              </div>`).join('') + (progs.length > 12 ? `<div style="color:#607080;font-size:11px;padding:4px 0">외 ${progs.length - 12}개 프로그램</div>` : '')
          : '<span class="detail-empty">연계 프로그램 없음</span>';
        this._openDetail(`
          <div class="detail-header-block">
            <div class="detail-strategy-label" style="color:${stCol}">갭 해결 현황 · ${stKo}</div>
            <h2 class="detail-title">${label}</h2>
            <div class="detail-en">${cat}</div>
          </div>
          <div class="detail-section">
            <div class="detail-section-title">현황 요약</div>
            <div style="display:flex;gap:16px;padding:8px 0">
              <div><span style="color:#ff4757;font-size:18px;font-weight:700">${gaps}</span><br><span style="color:#6a7f90;font-size:11px">역량 갭 수</span></div>
              <div><span style="color:#00d4ff;font-size:18px;font-weight:700">${progs.length}</span><br><span style="color:#6a7f90;font-size:11px">연계 프로그램</span></div>
              <div><span style="color:${stCol};font-size:18px;font-weight:700">${stKo}</span><br><span style="color:#6a7f90;font-size:11px">해결 상태</span></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-section-title">연계 교육 프로그램 (${progs.length}개)</div>
            <div class="detail-list">${progHtml}</div>
          </div>
        `);
        const body = document.getElementById('detailBody');
        if (body) body.querySelectorAll('[data-program-id]').forEach(el => {
          el.addEventListener('click', () => {
            const program = d.programs.find(p => p.id === el.dataset.programId);
            if (program) this._pushProgramDetail(program);
          });
        });
      });
    });
  },

  _renderCompetencyHeatmap(container) {
    const d = HRDData;

    const L1_GROUPS = [
      { label: 'HardSkill', color: '#00d4ff', keys: ['Business_Admin','ICT_Dev','Industrial_Tech'] },
      { label: 'Literacy',  color: '#ffd700', keys: ['Basic_Academic','Civic_Literacy','Digital_Literacy'] },
      { label: 'SoftSkill', color: '#00ff41', keys: ['Interpersonal','Problem_Solving','Self_Management'] },
    ];
    const L2_KEYS = L1_GROUPS.flatMap(g => g.keys);
    const L2_SHORT = {
      'Business_Admin':   '비즈니스',
      'ICT_Dev':          'ICT개발',
      'Industrial_Tech':  '산업기술',
      'Basic_Academic':   '기초학업',
      'Civic_Literacy':   '시민',
      'Digital_Literacy': '디지털',
      'Interpersonal':    '대인관계',
      'Problem_Solving':  '문제해결',
      'Self_Management':  '자기관리',
    };

    const compL2 = {};
    d.competencies.forEach(c => { compL2[c.id] = c.level2; });

    const orgTotals = {};
    const matrix    = {};
    const cellProgs = {};

    d.programs.forEach(p => {
      const org = p.org || '미지정';
      orgTotals[org] = (orgTotals[org] || 0) + 1;
      const ids = Array.isArray(p.relatedCompetencyIds) ? p.relatedCompetencyIds
                  : (p.targetCompetencyId ? [p.targetCompetencyId] : []);
      const l2Set = new Set();
      ids.forEach(id => { const l2 = compL2[id]; if (l2) l2Set.add(l2); });
      if (!matrix[org])    matrix[org]    = {};
      if (!cellProgs[org]) cellProgs[org] = {};
      l2Set.forEach(l2 => {
        matrix[org][l2] = (matrix[org][l2] || 0) + 1;
        if (!cellProgs[org][l2]) cellProgs[org][l2] = [];
        cellProgs[org][l2].push(p);
      });
    });

    // Build org list: all 35 from ontology, sorted by program count desc then name
    const orgMeta = {};
    d.organizations.forEach(o => { orgMeta[o.name] = o; });
    const allOrgNames = d.organizations.map(o => o.name);
    const topOrgs = [...allOrgNames].sort((a, b) => {
      const diff = (orgTotals[b] || 0) - (orgTotals[a] || 0);
      return diff !== 0 ? diff : a.localeCompare(b, 'ko');
    });

    let globalMax = 0;
    topOrgs.forEach(org => L2_KEYS.forEach(l2 => {
      const v = (matrix[org] || {})[l2] || 0;
      if (v > globalMax) globalMax = v;
    }));

    const colorCell = val => {
      if (!val) return null;
      const t = globalMax > 0 ? val / globalMax : 0;
      return `rgba(0,212,255,${(0.1 + t * 0.75).toFixed(2)})`;
    };

    let coveredCells = 0;
    const l2Totals = {};
    topOrgs.forEach(org => L2_KEYS.forEach(l2 => {
      const v = (matrix[org] || {})[l2] || 0;
      if (v) { coveredCells++; l2Totals[l2] = (l2Totals[l2] || 0) + v; }
    }));
    const totalCells = topOrgs.length * L2_KEYS.length;
    const gapCount   = totalCells - coveredCells;
    const topL2Entry = Object.entries(l2Totals).sort((a, b) => b[1] - a[1])[0];
    const topL2Name  = topL2Entry ? (L2_SHORT[topL2Entry[0]] || topL2Entry[0]) : '없음';
    const topL2Val   = topL2Entry ? topL2Entry[1] : 0;
    const topOrgName = topOrgs[0] || '없음';
    const topOrgVal  = topOrgs[0] ? (orgTotals[topOrgs[0]] || 0) : 0;
    const coverPct   = totalCells ? Math.round(coveredCells / totalCells * 100) : 0;

    // L1 group header row (each group spans 3 columns)
    const groupHeaderCells = ['<div class="hm-header"></div>']
      .concat(L1_GROUPS.map(g =>
        `<div class="hm-header hm-l1-header" style="grid-column:span 3;border-bottom:2px solid ${g.color};color:${g.color}">${g.label}</div>`
      ));

    // L2 header row
    const headerCells = ['<div class="hm-header"></div>']
      .concat(L2_KEYS.map(k => `<div class="hm-header">${L2_SHORT[k]}</div>`));

    const rows = topOrgs.map(org => {
      const meta  = orgMeta[org];
      const short = org.length > 8 ? org.slice(0, 7) + '…' : org;
      const orgCell = `<div class="hm-org-label" title="${org}">${short}</div>`;
      const cells   = L2_KEYS.map(l2 => {
        const val = (matrix[org] || {})[l2] || 0;
        if (!val) return `<div class="hm-val hm-zero">-</div>`;
        return `<div class="hm-val" style="background:${colorCell(val)};color:#e0f4ff" data-org="${org}" data-l2="${l2}">${val}</div>`;
      });
      return `<div class="hm-row">${orgCell}${cells.join('')}</div>`;
    });

    container.innerHTML = `
      <div class="hm-split">
        <div class="hm-chart-panel">
          <div class="hm-grid-scroll">
            <div class="hm-grid">
              ${groupHeaderCells.join('')}
              ${headerCells.join('')}
              ${rows.join('')}
            </div>
          </div>
          <div class="hm-legend">
            <span class="hm-legend-label">낮음</span>
            <div class="hm-legend-bar"></div>
            <span class="hm-legend-label">높음</span>
            <span class="hm-legend-label" style="margin-left:8px;color:#8a9aaa">최대 ${globalMax}개 프로그램</span>
          </div>
        </div>
        <div class="hm-info-panel">
          <div class="split-info-panel">
            <h3 class="split-info-title">기관 × 역량군 히트맵</h3>
            <p class="split-info-desc">
              전체 <strong>${topOrgs.length}개 기관</strong>(세로)과 9개 <strong>역량군 L2</strong>(가로)의 교차 빈도를 색상 강도로 표현합니다.
              역량군은 상단 L1(HardSkill / Literacy / SoftSkill)으로 구분됩니다.
              셀을 클릭하면 해당 기관·역량군의 프로그램 목록을 확인할 수 있습니다.
            </p>
            <div class="split-info-stats">
              <div class="split-stat-item">
                <span class="split-stat-value">${coverPct}%</span>
                <span class="split-stat-label">커버리지</span>
              </div>
              <div class="split-stat-item">
                <span class="split-stat-value">${gapCount}</span>
                <span class="split-stat-label">공백 셀</span>
              </div>
              <div class="split-stat-item">
                <span class="split-stat-value">${coveredCells}</span>
                <span class="split-stat-label">연결된 셀</span>
              </div>
            </div>
            <div class="split-info-highlight">
              <div class="split-highlight-label">최다 프로그램 기관</div>
              <div class="split-highlight-content">${topOrgName}<br><span style="color:#00d4ff;font-weight:700">${topOrgVal}개</span> 프로그램</div>
            </div>
            <div class="split-info-highlight" style="margin-top:8px">
              <div class="split-highlight-label">가장 많이 다뤄진 역량군</div>
              <div class="split-highlight-content">${topL2Name}<br><span style="color:#00d4ff;font-weight:700">${topL2Val}개</span> 프로그램 연결</div>
            </div>
            <div class="split-info-howto">
              <div class="split-howto-title">읽는 방법</div>
              <ul class="split-howto-list">
                <li>상단 색 라인 — L1 역량 대분류</li>
                <li>진한 파란색 = 프로그램 밀집</li>
                <li>연한 색 = 연결이 적음</li>
                <li>'-' = 해당 역량군 미연결</li>
                <li>셀 클릭 → 프로그램 목록</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.hm-val[data-org]').forEach(cell => {
      cell.addEventListener('click', () => {
        this._showHeatmapCellDetail(
          cell.dataset.org, cell.dataset.l2,
          (cellProgs[cell.dataset.org] || {})[cell.dataset.l2] || []
        );
      });
    });
  },

  _showHeatmapCellDetail(org, l2Key, progs) {
    const l2Name = this._COMP_L2_LABEL[l2Key] || l2Key;
    const progHtml = progs.length
      ? progs.map(p => `
          <div class="detail-list-item detail-clickable" data-program-id="${p.id}">
            <span class="detail-dot"></span>
            <span style="flex:1;font-size:11px">${p.name}</span>
            <span style="color:#a0aab8;font-size:10px">${p.org || ''}</span>
          </div>`).join('')
      : '<span class="detail-empty">프로그램 없음</span>';

    this._openDetail(`
      <div class="detail-header-block">
        <div class="detail-strategy-label">기관 × 역량군</div>
        <h2 class="detail-title">${org}</h2>
        <div class="detail-en">${l2Name}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">연관 교육 프로그램 (${progs.length}개)</div>
        <div class="detail-list">${progHtml}</div>
      </div>
    `);

    const body = document.getElementById('detailBody');
    if (!body) return;
    body.querySelectorAll('[data-program-id]').forEach(el => {
      el.addEventListener('click', () => {
        const program = HRDData.programs.find(p => p.id === el.dataset.programId);
        if (program) this._pushProgramDetail(program);
      });
    });
  },
});
