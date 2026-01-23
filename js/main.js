/*************************
 * 0 GLOBAL STATE
 *************************/
const APP = {
  data: [],
  shelters: []
};
let isTop5Dragging = false;
const SIDO_URL = "https://unpkg.com/realmap-collection/kr-sido-low.geo.json";

/*************************
 * 1 UTILS
 *************************/
function calcPressure(currentCount, capacity) {
  if (!capacity || capacity <= 0) return 0;
  const rate = (currentCount / capacity) * 100;
  return Math.min(Math.round(rate), 100);
}

function isWithinLastMonth(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return false;
  const y = parseInt(yyyymmdd.slice(0, 4));
  const m = parseInt(yyyymmdd.slice(4, 6) - 1);
  const d = parseInt(yyyymmdd.slice(6, 8));
  const itemDate = new Date(y, m, d);
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return itemDate >= thirtyDaysAgo && itemDate <= today;
}

/*************************
 * 2 DATA LOAD & TRANSFORM
 *************************/
async function loadData() {
  try {
    const response = await fetch('./js/pum--on-default-rtdb-export.json');
    const rawData = await response.json();
    const rescued = rawData.rescuedAnimals || {};

    // --- SOURCE A: Historical Data (For Chart & Gyeonggi Notice Count) ---
    // Extracting both nested objects from rescuedAnimals.data
    const dataRoot = rescued.data || {};
    const allHistoricalAnimals = [];

    function flatten(item) {
      const result = [];
      if (Array.isArray(item)) {
        item.forEach(inner => result.push(...flatten(inner)));
      } else if (item && typeof item === "object") {
        result.push(item);
      }
      return result;
    }

    Object.values(dataRoot).forEach(monthObj => {      // Loop all months
      Object.values(monthObj).forEach(dayArr => {      // Loop all days
        if (dayArr) {
          allHistoricalAnimals.push(...flatten(dayArr)); // Flatten nested arrays to pet objects
        }
      });
    });

    APP.animals = allHistoricalAnimals.map(a => ({
      ...a,
      noticeSdt: a.noticeSdt || a.happenDt || "20260101"
    }));

    // --- SOURCE B: Shelters List (For PetCards, ShelterCards, & Map) ---
    const shelterList = rescued.shelters?.list || [];
    const processedShelters = [];
    const liveAnimals = [];

    shelterList.forEach(item => {
      const info = item.info || {};
      const capacity = parseInt(info.ACEPTNC_ABLTY_CNT);

      // Strict Filter: Only shelters with capacity
      if (!capacity || isNaN(capacity) || capacity <= 0) return;

      const shelterAnimals = Array.isArray(info.animals) ? info.animals : [];

      // Map live animals for petCards
      shelterAnimals.forEach(a => {
        liveAnimals.push({
          ...a,
          careNm: a.careNm || info.careNm,
          careAddr: a.careAddr || info.careAddr,
          happenDt: a.happenDt || "미등록",
          noticeSdt: a.noticeSdt || a.happenDt || "20260101",
        });
      });

      processedShelters.push({
        careNm: info.careNm || "미등록",
        careAddr: info.careAddr || "미등록",
        capacity: capacity || 0,
        count: shelterAnimals.length,
        pressure: Math.min(Math.round((shelterAnimals.length / capacity) * 100), 100)
      });
    });

    // --- SOURCE C: Shelters Meta (For Global Summary Stats) ---
    const meta = rescued.shelters?.meta || {};

    APP.shelters = processedShelters;
    APP.liveAnimals = liveAnimals;
    APP.meta = meta; // Global stats source

    syncMapData(APP.shelters);
    return true;
  } catch (error) {
    console.error("Data Load Error:", error);
    return false;
  }
}

function syncMapData(shelters) {
  const ggStats = {};

  // Filter for Gyeonggi-do only
  const ggShelters = shelters.filter(s => s.careAddr && s.careAddr.includes("경기도"));

  ggShelters.forEach(s => {
    const parts = s.careAddr.split(" ");
    // Index 1 usually extracts the City name (e.g., "경기도 수원시" -> "수원시")
    const cityName = parts[1];

    if (cityName) {
      if (!ggStats[cityName]) ggStats[cityName] = { sum: 0, count: 0 };

      // Use the pressure we calculated manually from (count / ACEPTNC_ABLTY_CNT)
      ggStats[cityName].sum += (s.pressure || 0);
      ggStats[cityName].count++;
    }
  });

  const finalMap = {};
  for (const city in ggStats) {
    // Calculate the average pressure for each city
    finalMap[city] = Math.round(ggStats[city].sum / ggStats[city].count);
  }

  // REQUIRED: lowPolyMap.js looks specifically for this global variable
  window.realGGValues = finalMap;

  console.log("Map Data Updated:", finalMap);
}

/*************************
 * 3 RENDER FUNCTIONS
 *************************/
function renderPetCards(container, animals, limit = 4) {
  if (!container) return;
  container.innerHTML = "";

  // Taking current animals from the shelter object
  const itemsToShow = animals.slice(0, limit);

  if (itemsToShow.length === 0) {
    container.innerHTML = `<div class="t-M" style="padding:20px;">보호 중인 데이터가 없습니다.</div>`;
    return;
  }

  itemsToShow.forEach(a => {
    const card = document.createElement("div");
    card.className = "petcard";
    const imageUrl = a.popfile1 || a.popfile2 || "./assets/images/img_404.png";

    card.innerHTML = `
      <div class="card-top">
        <span class="process-badge">${a.processState || "보호중"}</span>
        <img id="sampleImages" src="${imageUrl}" alt="${a.kindNm}" onerror="this.src='./assets/images/img_404.png'">
      </div>
      <div class="description3">
        <div class="description2 t-L">
          <div class="t-S sub">${a.kindNm} · ${a.sexCd} · ${a.age} · ${a.weight || ""}</div>
          <div class="t-M" style="font-weight:700">${a.kindNm}</div>
        </div>
        <div class="description2 t-L">
          <div class="t-S sub">공고 번호</div>
          <div>${a.noticeNo || "-"}</div>
        </div>
        <div class="description2 t-L">
          <div class="t-S sub">보호센터</div>
          <div>${a.careNm}</div>
        </div>
        <div class="description2 t-L">
          <div class="t-S sub">주소</div>
          <div>${a.careAddr}</div>
        </div>
        <div class="description2 t-L">
          <div class="t-S sub">구조일자</div>
          <div>${a.happenDt || ""}</div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

function renderTop5(container, shelters) {
  if (!container || !shelters.length) return;
  container.innerHTML = "";

  // Sort by pressure and take top 10
  const topList = [...shelters].sort((a, b) => b.pressure - a.pressure).slice(0, 10);

  topList.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "sheltercard";

    // Each card uses its own 's.capacity' from the processedShelters variable
    let progClass = s.pressure >= 75 ? "progress-danger" : s.pressure >= 30 ? "progress-warning" : "progress-safe";

    card.innerHTML = `
      <div class="flx-ttl">
        <div class="shelter-num">${i + 1}</div>
        <div class="description">
          <div class="t-S sub">보호소센터</div>
          <div class="t-M">${s.careNm}</div>
        </div>
      </div>
      <div class="description">
        <div class="t-S sub">수용률 (현재 ${s.count} / 정원 ${s.capacity})</div>
        <div><span class="t-XL">${s.pressure}</span>%</div>
        <progress value="${s.pressure}" max="100" class="${progClass}"></progress>
      </div>
      <div class="description">
        <div class="t-S sub">주소</div>
        <div class="t-M">${s.careAddr || "-"}</div>
      </div>`;
    container.appendChild(card);
  });

  container.innerHTML += container.innerHTML;
  requestAnimationFrame(() => autoScrollTop5("top5", 30));
}

/*************************
 * SUMMARY CHART
 *************************/
function renderSummaryChart(canvas, animals) {
  // 'animals' here is APP.animals (from rescuedAnimals.data)
  if (!canvas) {
    console.error("Chart canvas not found");
    return;
  }

  if (!window.Chart) {
    console.error("Chart.js not loaded");
    return;
  }

  if (!animals || animals.length === 0) {
    console.warn("No animal data for chart");
    return;
  }

  const filteredAnimals = animals.filter(a => isWithinLastMonth(a.happenDt));

  // We count based on the historical processState strings
  const notice = filteredAnimals.filter(a => a.processState && a.processState.includes("보호")).length;
  const adopt = filteredAnimals.filter(a => a.processState && a.processState.includes("입양")).length;
  const returned = filteredAnimals.filter(a => a.processState && a.processState.includes("반환")).length;
  const euth = filteredAnimals.filter(a => a.processState && a.processState.includes("안락사")).length;
  const death = filteredAnimals.filter(a => a.processState && a.processState.includes("자연사")).length;

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["공고 수", "입양 수", "반환 수", "안락사 수", "자연사 수"],
      datasets: [{
        data: [notice, adopt, returned, euth, death],
        backgroundColor: [
          "#6673FF",
          "#09F66C",
          "#FFB01F",
          "#ff2462",
          "#B9BFFF"
        ],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#E3E3E3" } },
        x: { grid: { display: false } }
      }
    }
  });
}

/*************************
 * 4 GYEONGGI SUMMARY
 *************************/
function calcGyeonggiSummary(animals, shelters, meta) {
  const ggShelters = shelters.filter(s => s.careAddr?.includes("경기도"));

  const totalCapacity = ggShelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalProtected = ggShelters.reduce((sum, s) => sum + s.count, 0);

  // Historical notice count from .data
  const ggHistorical = animals.filter(a => a.careAddr?.includes("경기도") && isWithinLastMonth(a.noticeSdt));
  const noticeCount = ggHistorical.filter(a => a.processState?.includes("보호")).length;

  return {
    totalCapacity,
    totalPressure: totalCapacity > 0 ? Math.round((totalProtected / totalCapacity) * 100) : 0,
    noticeCount,
    // Pulling these directly from Meta as requested
    totalShelters: parseInt(meta.totalShelters) || 0,
    vetPersonCnt: parseInt(meta.totalVetPersonCnt) || 0,
    specsPersonCnt: parseInt(meta.totalSpecsPersonCnt) || 0
  };
}

function renderGyeonggiSummary(summary, duration = 800) {
  const targets = [
    { el: document.getElementById("aceptncAbltyCntComp"), value: summary.totalCapacity, format: true },
    { el: document.getElementById("prolterComp"), value: summary.totalPressure },
    { el: document.getElementById("processStateComp"), value: summary.noticeCount, format: true },
    { el: document.getElementById("totalSheltersComp"), value: summary.totalShelters },
    { el: document.getElementById("vetPersonCntComp"), value: summary.vetPersonCnt },
    { el: document.getElementById("specsPersonCntComp"), value: summary.specsPersonCnt }
  ];

  const start = performance.now();
  function animate(now) {
    const progress = Math.min((now - start) / duration, 1);
    targets.forEach(({ el, value, format }) => {
      if (!el) return;
      const current = Math.floor(value * progress);
      el.innerText = format ? current.toLocaleString() : current;
    });
    if (progress < 1) requestAnimationFrame(animate);
    else applyDashboardColor(summary.totalPressure);
  }

  function applyDashboardColor(p) {
    const dash = document.getElementById("dashbColor");
    if (!dash) return;

    dash.classList.remove("card-null", "card-warning", "card-danger");

    if (p > 70) {
      dash.classList.add("card-danger");
    } else if (p > 30) {
      dash.classList.add("card-warning");
    } else {
      dash.classList.add("card-null");
    }
  }
  requestAnimationFrame(animate);
}

/*************************
 * 5 INIT
 *************************/
document.addEventListener("DOMContentLoaded", async () => {
  const success = await loadData();
  if (!success) return;

  // Pass meta to the summary calculation
  const summary = calcGyeonggiSummary(APP.animals, APP.shelters, APP.meta);

  renderGyeonggiSummary(summary);
  renderPetCards(document.getElementById("petList"), APP.liveAnimals, 4);
  renderTop5(document.getElementById("top5"), APP.shelters);
  renderSummaryChart(document.getElementById("mapSum"), APP.animals);

  initDraggable("top5");
});

/*************************
 * 6 Drag
 *************************/
function initDraggable(top5) {
  const slider = document.getElementById(top5);
  if (!slider) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    isTop5Dragging = true;
    slider.classList.add("dragging");
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  const endDrag = () => {
    isDown = false;
    isTop5Dragging = false;
    slider.classList.remove("dragging");
  };

  slider.addEventListener("mouseup", endDrag);
  slider.addEventListener("mouseleave", endDrag);
  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2;
    const loopWidth = slider.scrollWidth / 2;

    let targetScroll = scrollLeft - walk;
    // Seamless loop adjustment during drag
    if (targetScroll >= loopWidth) {
      targetScroll -= loopWidth;
      scrollLeft -= loopWidth; // Adjust anchor to prevent rubberband
    } else if (targetScroll <= 0) {
      targetScroll += loopWidth;
      scrollLeft += loopWidth; // Adjust anchor to prevent rubberband
    }
    slider.scrollLeft = targetScroll;
  });
  window.addEventListener("mouseup", () => {
    isTop5Dragging = false;
    slider.classList.remove("dragging");
  });
}

/*************************
 * 7 Autoscroll
 *************************/
function autoScrollTop5(id, speed = 40) {
  const el = document.getElementById(id);
  if (!el) return;
  let lastTime = null, pos = el.scrollLeft;
  function step(now) {
    if (!lastTime) lastTime = now;
    const loopWidth = el.scrollWidth / 2;
    if (!isTop5Dragging && loopWidth > 0) {
      pos += speed * (Math.min(now - lastTime, 50) / 1000);
      if (pos >= loopWidth) pos -= loopWidth;
      el.scrollLeft = pos;
    } else { pos = el.scrollLeft; }
    lastTime = now;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}