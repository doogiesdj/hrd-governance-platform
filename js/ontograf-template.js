// OntoGraf HTML template — loaded before ontograf.js

const _ONTOGRAF_TEMPLATE = `
      <div class="og-layout">
        <div class="og-left-panel">
          <div class="og-search-box">
            <input id="og-search-input" type="text" placeholder="클래스/인스턴스 검색…" autocomplete="off"/>
            <button id="og-search-btn">🔍</button>
          </div>
          <div class="og-sel-toolbar">
            <span class="og-badge" id="og-sel-badge">선택 없음</span>
            <button class="og-clear-btn" id="og-clear-btn" title="선택 초기화">✕ 초기화</button>
          </div>
          <div class="og-legend">
            <span class="og-legend-selected"></span>선택&nbsp;
            <span class="og-legend-class"></span>컨텍스트&nbsp;
            <span class="og-legend-child"></span>자식&nbsp;
            <span class="og-legend-propctx"></span>속성관계&nbsp;
            <span class="og-legend-inst"></span>인스턴스
          </div>
          <div class="og-legend og-legend-links">
            <span class="og-legend-link-sub"></span>subClassOf&nbsp;&nbsp;
            <span class="og-legend-link-inst"></span>instanceOf&nbsp;&nbsp;
            <span class="og-legend-link-prop"></span>objectProp
          </div>
          <div class="og-tree-hint">클릭: 선택/해제 &nbsp;|&nbsp; ▶ 클릭: 펼치기</div>
          <div class="og-tree-scroll" id="og-tree-scroll"></div>
          <div class="og-inst-panel-list" id="og-inst-panel-list" style="display:none;">
            <div class="og-inst-panel-header">📋 인스턴스 전체 목록</div>
            <div class="og-inst-panel-body" id="og-inst-panel-body"></div>
          </div>
        </div>
        <div class="og-right-panel">
          <div id="og-graph-wrap" class="og-graph-wrap"></div>
          <div id="og-info-panel" class="og-info-panel" style="display:none;"></div>
        </div>
      </div>`;
