# HRD Governance Platform — Phase 1 진행 보고서

> 작성일: 2026-04-24 · 기준 브랜치: main  
> 저장소: https://github.com/doogiesdj/hrd-governance-platform-v3  
> 배포 URL: https://doogiesdj.github.io/hrd-governance-platform-v3/

---

## 개요

Phase 1의 목표는 **시각화 고도화(Visualization Enhancement)**다.  
Phase 0에서 정비한 모듈 구조 위에 새로운 분석 기능과 인터랙티브 시각화를 추가한다.  
기반 코드를 건드리지 않고 각 뷰 모듈(`Object.assign(App, {...})`)에만 기능을 추가하는 것이 원칙이다.

**Phase 1 전체 로드맵 대비 현재까지 완료 항목:**

| 항목 | 작업 | 우선순위 | 상태 |
|------|------|---------|------|
| 1-1 | 역량 갭 히트맵 (기관 × 역량 매트릭스) | 높음 | ✅ 완료 |
| 1-2 | Sankey 다이어그램 (예산 → 정책 → 프로그램 → 역량 흐름) | 높음 | ✅ 완료 |
| 1-3 | 프로그램-역량 정합도 점수 계산 및 표시 | 높음 | ✅ 완료 |
| 1-4 | 역량 갭 해결 현황 워크플로우 뷰 추가 | 중간 | ✅ 완료 |
| 1-5 | VOWL 그래프 엣지 가중치 시각화 개선 | 낮음 | ✅ 완료 |
| — | RDF Domain/Range 잔여 누락 보완 | 중간 | ✅ 완료 (전수 확인) |
| — | style.css 뷰별 분리 (`css/views/`) | 중간 | ✅ 완료 |
| — | ontograf.js / protegraf.js 800줄 이하로 분리 | 중간 | ✅ 완료 |

---

## 1. Phase 1-1: 역량 갭 히트맵

### 배경 및 목표

기존 역량 뷰는 도넛 차트 + 목록만 제공했다.  
"어느 기관이 어느 역량 분야에서 갭이 집중되는가"를 한 눈에 보려면 **기관 × 역량 매트릭스 히트맵**이 필요했다.

### 구현 파일

**`platform/js/views/competency.js`** (365줄 → 535줄)

### 추가된 메서드

| 메서드 | 역할 |
|--------|------|
| `_applyCompViewMode(view)` | 역량 뷰의 표시 모드를 'chart' / 'heatmap' 간 전환. 모드에 따라 기존 차트 영역을 숨기고 `.comp-heatmap-wrap`을 토글한다. |
| `_renderCompetencyHeatmap(container)` | 기관(행) × 역량 L2 카테고리(열) 매트릭스를 렌더링. 각 셀의 갭 수에 따라 배경색 강도를 적용(파란색 계열 그라디언트). 셀 클릭 시 해당 기관+역량 조합의 갭 목록을 상세 패널에 표시. |

### 뷰 토글 버튼 연동

역량 뷰 상단의 `.comp-class-bar`에 **[차트 보기 / 히트맵 보기]** 전환 버튼을 추가했다.  
버튼 클릭 시 `this._compViewMode`를 갱신하고 `_applyCompViewMode(view)`를 호출한다.

### 히트맵 데이터 매핑

- **행(기관):** `HRDData.competencyGaps`에서 `orgId` 추출 → 기관명 조회
- **열(역량 L2 카테고리):** 9개 고정 키 (`Business_Admin`, `ICT_Dev`, `Industrial_Tech`, `Basic_Academic`, `Civic_Literacy`, `Digital_Literacy`, `Interpersonal`, `Problem_Solving`, `Self_Management`)
- **셀값:** 해당 기관의 해당 L2 카테고리 갭 수
- **색상:** `rgba(0, 212, 255, α)` — 셀 최대값 대비 상대적 알파값 (0.05 ~ 0.85)

### CSS 추가 (`style.css` 하단 추가)

```css
.comp-heatmap-wrap   /* 히트맵 영역 래퍼 */
.heatmap-table       /* 테이블 레이아웃 */
.hm-cell             /* 개별 셀 — cursor:pointer, transition */
.hm-header-cell      /* 헤더 셀 */
```

---

## 2. Phase 1-2: Sankey 다이어그램

### 배경 및 목표

예산이 정책을 통해 프로그램으로, 프로그램이 역량 개발로 이어지는 **재원 흐름**을 Sankey 형태로 시각화한다.  
기존 예산 뷰는 카테고리별 도넛 차트만 있었고 흐름 연결 정보가 없었다.

### 구현 파일

**`platform/js/views/budget.js`** (359줄 → 514줄)

### 추가된 메서드

| 메서드 | 역할 |
|--------|------|
| `_showSankeyMode()` | 예산 카테고리 콘텐츠 영역에서 기존 차트/목록을 숨기고 `#sankey-container`를 생성·표시한 뒤 `_renderSankey`를 호출한다. |
| `_hideSankeyMode()` | 기존 차트/목록을 복원하고 `#sankey-container`를 숨긴다. |
| `_buildSankeyData()` | `HRDData`에서 예산→정책→프로그램→역량 링크 데이터를 수집하여 `{ nodes, links }` 형태로 반환한다. |
| `_renderSankey(container)` | D3.js로 Sankey 레이아웃을 그린다. 노드는 레이어별 색상(예산=노랑, 정책=보라, 프로그램=파랑, 역량=초록), 링크는 반투명 그라디언트 패스. |

### 뷰 토글 버튼 연동

예산 뷰 상단에 **[Sankey 흐름도]** 토글 버튼을 추가했다.  
`_budgetSankeyMode` 플래그로 on/off 상태를 관리하며, active 시 `_showSankeyMode()`, 해제 시 `_hideSankeyMode()`를 호출한다.

### Sankey 데이터 구조

```
노드 레이어:
  Layer 0 — 예산 항목 (Budget)       색상: #ffd700
  Layer 1 — 정책 (Policy)            색상: #9933ff
  Layer 2 — 프로그램 (Program)       색상: #00d4ff
  Layer 3 — 역량 카테고리 (Competency) 색상: #00ff41

링크 매핑:
  Budget → Policy    : budgets[i].linkedPolicies 배열
  Policy → Program   : programs[j].alignedStrategy → strategy → policy
  Program → Competency: programs[j].fieldCatCode (COMPCAT_* 형식)
```

### CSS 추가 (`style.css` 하단 추가)

```css
#sankey-container        /* SVG 래퍼 */
.sankey-node rect        /* 노드 직사각형 */
.sankey-node text        /* 노드 레이블 */
.sankey-link             /* 링크 패스 — opacity 0.3 → hover 0.6 */
```

---

## 3. Phase 1-3: 프로그램-역량 정합도 점수

### 배경 및 목표

190개 프로그램이 실제 역량 갭 해소에 얼마나 기여하는지 수치로 표현한다.  
"갭이 많은 역량 카테고리를 담당하는 프로그램"을 상위에 노출하여 교육 담당자가 우선 투자 프로그램을 쉽게 식별할 수 있도록 한다.

### 구현 파일

- **`platform/js/app.js`** (108줄 → 127줄)
- **`platform/js/views/program.js`** (279줄 → 364줄)
- **`platform/css/style.css`** (하단 Phase 1-3 블록 추가)

### 점수 공식

```
gapWeights[catCode] = competencyGaps 중 gapCompetencyId === catCode 인 항목 수
totalWeight         = competencyGaps.length  (= 1,248)

score(program) = round( gapWeights[program.fieldCatCode] / totalWeight × 100, 1 )
```

**필드 매핑:**
- `program.fieldCatCode` (COMPCAT_* 형식) ← `competencyGap.gapCompetencyId` (COMPCAT_* 형식) 로 직접 매칭
- `program.relatedCompetencyIds` (COMP_* 형식)는 갭 ID와 형식이 달라 사용하지 않음

**상위 갭 카테고리 (참고):**

| 카테고리 | 갭 수 | 비율 |
|---------|-------|------|
| COMPCAT_Management | 59 | 4.7% |
| COMPCAT_Leadership | 58 | 4.6% |
| COMPCAT_Digital_Literacy | 55 | 4.4% |

### 추가된 메서드

#### `app.js` — `App.calcCoverageScore()`

```javascript
calcCoverageScore()
// 반환: { scored, scoreMap, maxScore }
// scored    : [{ program, score }, ...] 점수 내림차순 정렬
// scoreMap  : { programId: score } 빠른 조회용 맵
// maxScore  : scored[0].score (상대 바 너비 계산에 사용)
// 캐싱: this._coverageScoreCache — 동일 세션 내 1회만 계산
```

#### `program.js` — `_renderProgramList(view)`

- 프로그램 목록 렌더링 전담 메서드 (기존 인라인 로직 분리)
- **정렬 토글 버튼** (`.prog-sort-toggle`)을 `.list-container > h3`에 1회 삽입
- 토글 active 시 `_programSortMode = 'score'`로 점수 내림차순 정렬
- 각 목록 아이템에 `score > 0` 인 경우 **`.score-badge`** (텍스트 %) + **`.score-bar-wrap`** (미니 바) 표시

#### `program.js` — `_renderTop10Recommendations(container)`

- `.top10-section` 컨테이너에 **갭 해소 추천 Top 10** 카드 그리드 렌더링
- 상위 10개 프로그램(score > 0)을 10열 그리드로 표시
- 각 카드: 순위(🥇🥈🥉 / #n), 프로그램명(truncate), 기관·역량 분야, 점수 % + 그라디언트 바
- 카드 클릭 시 `_showProgramDetail(prog)` 호출

### DOM 삽입 구조

```
view-program > .view-content
  ├── .kpi-grid
  ├── .program-class-bar          (Phase 0 존재)
  ├── .program-chart-split        (Phase 0 존재)
  ├── .top10-section              ← Phase 1-3 신규 (lazy 삽입, 1회만)
  └── .list-container
        ├── h3 "프로그램 목록"
        │     └── button.prog-sort-toggle  ← Phase 1-3 신규 (lazy 삽입, 1회만)
        └── #programList
```

### CSS 추가 (`style.css` 하단 Phase 1-3 블록)

```css
.score-badge          /* 목록 아이템 내 점수 뱃지 (cyan 계열) */
.score-bar-wrap       /* 목록 아이템 내 미니 바 래퍼 */
.score-bar-fill       /* 미니 바 채움 */
.top10-section        /* Top 10 섹션 래퍼 */
.top10-header         /* 섹션 헤더 */
.top10-grid           /* auto-fill minmax(190px, 1fr) 그리드 */
.top10-card           /* 개별 카드 — hover 효과 포함 */
.top10-rank           /* 순위 표시 (gold/silver/bronze 수식어 클래스) */
.top10-name           /* 프로그램명 (text-overflow: ellipsis) */
.top10-meta           /* 기관·역량 메타 */
.top10-score-row      /* 점수 행 */
.top10-score-val      /* 점수 수치 텍스트 */
.top10-score-track    /* 점수 바 트랙 */
.top10-score-bar      /* 점수 바 채움 (그라디언트) */
.prog-sort-toggle     /* 정렬 토글 버튼 */
```

---

## 4. 파일 변경 현황

### 수정된 파일 및 줄 수

| 파일 | Phase 0 기준 | Phase 1-3 완료 | 변경 내용 |
|------|-------------|---------------|----------|
| `js/app.js` | 108줄 | **127줄** | `calcCoverageScore()` 추가 |
| `js/views/competency.js` | 365줄 | **535줄** | `_applyCompViewMode`, `_renderCompetencyHeatmap` 추가 |
| `js/views/budget.js` | 359줄 | **514줄** | `_showSankeyMode`, `_hideSankeyMode`, `_buildSankeyData`, `_renderSankey` 추가 |
| `js/views/program.js` | 279줄 | **364줄** | `_renderProgramList`, `_renderTop10Recommendations` 추가 |
| `css/style.css` | 기존 | 하단 3개 블록 추가 | Phase 1-1 / 1-2 / 1-3 CSS |

### CI 상태

| 파일 | 줄 수 | 800줄 경고 | 1,600줄 오류 |
|------|-------|-----------|------------|
| competency.js | 535 | — | — |
| budget.js | 514 | — | — |
| program.js | 364 | — | — |
| app.js | 127 | — | — |

모든 파일 800줄 이하 유지 ✅

---

## 5. 아키텍처 원칙 준수 확인

Phase 1에서 적용된 구현 패턴이 Phase 0에서 정립한 원칙을 따르는지 확인한다.

| 원칙 | 확인 |
|------|------|
| `Object.assign(App, {...})` 패턴으로만 메서드 추가 | ✅ |
| 전역 상태는 `App.*` 에만 저장 (`_compViewMode`, `_budgetSankeyMode`, `_programSortMode`, `_coverageScoreCache`) | ✅ |
| DOM 삽입은 lazy guard(`!view.querySelector(...)`)로 중복 삽입 방지 | ✅ |
| `DOMContentLoaded` 추가 등록 없음 — app.js 단일 등록 유지 | ✅ |
| 파일당 800줄 이하 | ✅ |
| 하드코딩 시크릿 없음 | ✅ |

---

## 6. Phase 1 잔여 작업 (전체 완료)

### 1-4: 역량 갭 해결 현황 워크플로우 뷰 ✅

갭 항목별 "해소 상태(미착수 / 진행 중 / 완료)"를 칸반 보드로 시각화.  
`competencyGaps` 데이터의 `fieldCatCode` 기준 프로그램 매핑으로 상태 추정 표시.  
`css/views/competency.css`에 칸반 레이아웃 CSS 포함.

### 1-5: VOWL 그래프 엣지 가중치 시각화 ✅

`graph.js`의 `VowlGraph`에 `_propWeights()` 메서드 추가.  
ObjectProperty 사용 빈도를 min-max 정규화하여 엣지 두께 1.5–5px로 매핑.  
트리플 수가 많을수록 굵고 밝은 엣지로 표시.

### 중간 우선순위 작업 ✅

- **RDF Domain/Range 보완**: 202개 ObjectProperty 전수 확인 → 모두 domain/range 보유 확인, 추가 작업 불필요
- **style.css 분리**: 3,245줄 단일 파일 → `css/base.css` + `css/views/` 9개 파일로 분리
- **ontograf.js 분리**: 917줄 → 797줄 — 상수를 `ontograf-hierarchy.js`, HTML 템플릿을 `ontograf-template.js`로 추출
- **protegraf.js 분리**: 823줄 → 483줄 — 6개 상수 블록을 `protegraf-constants.js`로 추출

---

*문서 끝 — Phase 1 전체 완료 (1-1 · 1-2 · 1-3 · 1-4 · 1-5 · 잔여 작업 모두 완료) 2026-04-24*
