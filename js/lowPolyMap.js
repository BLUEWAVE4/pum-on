import { db } from "./firebase-config.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   DOM
========================= */
const $canvas = document.getElementById("regionChart");

// 리스트 필터(select)와 동일한 것을 읽어서 차트도 동일 기준으로 집계
const $area = document.getElementById("filter-area");
const $animal = document.getElementById("filter-animal");
const $period = document.getElementById("filter-period");

/* =========================
   지역 정의 (표시 순서 고정)
========================= */
const REGIONS = [
  { key: "서울특별시", label: "서울" },
  { key: "부산광역시", label: "부산" },
  { key: "대구광역시", label: "대구" },
  { key: "인천광역시", label: "인천" },
  { key: "광주광역시", label: "광주" },
  { key: "세종특별자치시", label: "세종" },
  { key: "대전광역시", label: "대전" },
  { key: "울산광역시", label: "울산" },
  { key: "경기도", label: "경기" },
  { key: "강원특별자치도", label: "강원" },
  { key: "충청북도", label: "충북" },
  { key: "충청남도", label: "충남" },
  { key: "전북특별자치도", label: "전북" },
  { key: "전라남도", label: "전남" },
  { key: "경상북도", label: "경북" },
  { key: "경상남도", label: "경남" },
  { key: "제주특별자치도", label: "제주" },
];

const REGION_ALIASES = [
  { match: ["서울", "서울특별시"], key: "서울특별시" },
  { match: ["부산", "부산광역시"], key: "부산광역시" },
  { match: ["대구", "대구광역시"], key: "대구광역시" },
  { match: ["인천", "인천광역시"], key: "인천광역시" },
  { match: ["광주", "광주광역시"], key: "광주광역시" },
  { match: ["세종", "세종특별자치시"], key: "세종특별자치시" },
  { match: ["대전", "대전광역시"], key: "대전광역시" },
  { match: ["울산", "울산광역시"], key: "울산광역시" },
  { match: ["경기", "경기도"], key: "경기도" },
  { match: ["강원", "강원특별자치도", "강원도"], key: "강원특별자치도" },
  { match: ["충북", "충청북도"], key: "충청북도" },
  { match: ["충남", "충청남도"], key: "충청남도" },
  { match: ["전북", "전북특별자치도", "전라북도"], key: "전북특별자치도" },
  { match: ["전남", "전라남도"], key: "전라남도" },
  { match: ["경북", "경상북도"], key: "경상북도" },
  { match: ["경남", "경상남도"], key: "경상남도" },
  { match: ["제주", "제주특별자치도"], key: "제주특별자치도" },
];

/* =========================
   필터 정규화 (foster-filter와 동일한 개념)
========================= */
function normalizeArea(value) {
  const map = {
    "area-all": "",
    "area-seoul": "서울",
    "area-busan": "부산",
    "area-daegu": "대구",
    "area-incheon": "인천",
    "area-gwangju": "광주",
    "area-sejong": "세종",
    "area-daejeon": "대전",
    "area-ulsan": "울산",
    "area-gyeonggi": "경기",
    "area-gangwon": "강원",
    "area-chungbuk": "충북",
    "area-chungnam": "충남",
    "area-jeonbuk": "전북",
    "area-jeonnam": "전남",
    "area-gyeongbuk": "경북",
    "area-gyeongnam": "경남",
    "area-jeju": "제주",
  };
  return map[value] ?? "";
}

function normalizeAnimal(value) {
  const map = {
    "animall-all": "",
    "animall-dog": "dog",
    "animall-cat": "cat",
    "animall-etc": "etc",
  };
  return map[value] ?? "";
}

function normalizePeriod(value) {
  const map = {
    "period-all": "",
    "period-month": "1",
    "period-three": "3",
    "period-half": "6",
  };
  return map[value] ?? "";
}

function parsePreferAnimals(raw) {
  const set = new Set();
  if (!raw) return set;

  if (Array.isArray(raw)) {
    raw.forEach((v) => set.add(String(v).toLowerCase()));
    return set;
  }

  String(raw)
    .split(/[,/|]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .forEach((v) => set.add(v));

  return set;
}

function normalizeRegionKey(address) {
  const addr = String(address || "").trim();
  if (!addr) return null;

  for (const r of REGIONS) {
    if (addr.includes(r.key)) return r.key;
  }
  for (const a of REGION_ALIASES) {
    if (a.match.some((m) => addr.includes(m))) return a.key;
  }
  return null;
}

/* =========================
   Firebase fetch (foster만)
========================= */
async function fetchFosters() {
  const usersRef = ref(db, "users");
  const q = query(usersRef, orderByChild("userType"), equalTo("foster"));
  const snap = await get(q);

  if (!snap.exists()) return [];
  const obj = snap.val();

  return Object.values(obj).map((u) => ({
    userType: u.userType,
    fosterInfo: u.fosterInfo || {},
  }));
}

/* =========================
   ✅ 리스트와 동일 기준 필터 적용
   - 활동 리스트 기준: isAvailable === true
   - + (선택) 현재 필터(area/animal/period)도 동일 적용
========================= */
function filterLikeFosterList(fosters) {
  const areaKey = $area ? normalizeArea($area.value) : "";
  const animalKey = $animal ? normalizeAnimal($animal.value) : "";
  const periodKey = $period ? normalizePeriod($period.value) : "";

  return fosters.filter((f) => {
    const info = f.fosterInfo || {};

    // (1) 활동중 기준 통일
    if (info.isAvailable !== true) return false;

    // (2) 지역 필터(리스트와 동일)
    if (areaKey) {
      const addr = String(info.address || "");
      if (!addr.includes(areaKey)) return false;
    }

    // (3) 동물 필터(리스트와 동일)
    if (animalKey) {
      const preferSet = parsePreferAnimals(info.preferAnimals);
      if (!preferSet.has(animalKey)) return false;
    }

    // (4) 기간 필터(리스트와 동일)
    if (periodKey) {
      const mp = String(info.maxPeriod || "");
      if (!mp.includes(periodKey)) return false;
    }

    return true;
  });
}

/* =========================
   지역 집계
========================= */
function countByRegion(fosters) {
  const counts = Object.fromEntries(REGIONS.map((r) => [r.key, 0]));
  let unknown = 0;

  for (const f of fosters) {
    const addr = f?.fosterInfo?.address;
    const key = normalizeRegionKey(addr);
    if (key && counts[key] !== undefined) counts[key] += 1;
    else unknown += 1;
  }

  return { counts, unknown };
}

/* =========================
   Chart.js 렌더/업데이트
========================= */
let chartInstance = null;

function renderChart({ counts }) {
  if (!$canvas) {
    console.warn("[regionChart] canvas#regionChart 없음");
    return;
  }
  if (typeof Chart === "undefined") {
    console.error("[regionChart] Chart.js가 로드되지 않았습니다.");
    return;
  }

  const labels = REGIONS.map((r) => r.label);
  const data = REGIONS.map((r) => counts[r.key] || 0);

  const max = Math.max(1, ...data);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "활동 중 임시보호자",
          data,
          borderWidth: 0,
          borderRadius: 6,
          barThickness: 10,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: max,
          grid: { display: false },
          ticks: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: "600" } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw}명`,
          },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
  } else {
    chartInstance = new Chart($canvas, config);
  }
}

/* =========================
   init + 필터 변경시 재집계
========================= */
let fostersCache = null;

async function refreshRegionChart() {
  try {
    if (!fostersCache) fostersCache = await fetchFosters();

    // ✅ 리스트와 동일 기준으로 필터링 후 집계
    const filtered = filterLikeFosterList(fostersCache);
    const result = countByRegion(filtered);

    renderChart(result);

    console.group("📊 RegionChart Sync");
    console.log("활동중+필터 통과 foster:", filtered.length);
    console.log("counts:", result.counts);
    console.log("unknown:", result.unknown);
    console.groupEnd();
  } catch (e) {
    console.error("[regionChart] refresh 실패:", e);
  }
}

function bindFilterSync() {
  // 필터 select가 존재하면 차트도 자동 동기화
  [$area, $animal, $period].forEach((el) => {
    el?.addEventListener("change", () => {
      refreshRegionChart();
    });
  });
}

bindFilterSync();
refreshRegionChart();

// 외부에서 필요하면 호출 가능
export async function refreshRegionDistributionChart() {
  return refreshRegionChart();
}
