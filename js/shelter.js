/*************************
 * 1. 전역 변수
 *************************/
let regionSummary = [];
let shelterCapacityData = [];
let cityPressureMap = {};

const provinceSelect = document.getElementById("provinceSelect");
const citySelect = document.getElementById("citySelect");
const cardContainer = document.getElementById("cardContainer");
const pagination = document.getElementById("pagination");

const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalContent = document.getElementById("modalContent");

/*************************
 * 2. 페이지네이션 상태
 *************************/
let allShelters = [];
let currentPage = 1;
let currentGroup = 0;

const PAGE_SIZE = 12;
const PAGE_GROUP_SIZE = 10;

/*************************
 * 3. JSON 로드
 *************************/
Promise.all([
  fetch("./1month.json").then(res => res.json()),
  fetch("./gyeonggi-shelter.json").then(res => res.json())
])
.then(([monthJson, shelterJson]) => {
  regionSummary = monthJson.regionSummary;
  shelterCapacityData = shelterJson;

  cityPressureMap = buildCityPressure();
  initProvinceSelect();
  createShelterList();
});

/*************************
 * 4. 압박지수 계산
 *************************/
function buildCityPressure() {
  const map = {};

  regionSummary.forEach(region => {
    region.cities.forEach(city => {
      map[city.city] ??= { current: 0, capacity: 0 };
      map[city.city].current += city.count;
    });
  });

  shelterCapacityData.forEach(shelter => {
    const city = shelter.SIGUN_NM;
    map[city] ??= { current: 0, capacity: 0 };
    map[city].capacity += Number(shelter.ACEPTNC_ABLTY_CNT) || 0;
  });

  return map;
}

/*************************
 * 5. 필터
 *************************/
function initProvinceSelect() {
  regionSummary.forEach(region => {
    const opt = document.createElement("option");
    opt.value = region.province;
    opt.textContent = region.province;
    provinceSelect.appendChild(opt);
  });
}

provinceSelect.onchange = () => {
  citySelect.innerHTML = `<option value="">시/군/구 선택</option>`;
  citySelect.disabled = true;

  const province = provinceSelect.value;
  if (!province) return createShelterList();

  const region = regionSummary.find(r => r.province === province);
  region.cities.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.city;
    opt.textContent = c.city;
    citySelect.appendChild(opt);
  });

  citySelect.disabled = false;
  createShelterList(province);
};

citySelect.onchange = () => {
  createShelterList(provinceSelect.value, citySelect.value);
};

/*************************
 * 6. 리스트 생성
 *************************/
function createShelterList(province = "", city = "") {
  allShelters = [];

  regionSummary.forEach(region => {
    if (province && region.province !== province) return;

    region.cities.forEach(c => {
      if (city && c.city !== city) return;

      c.shelters.forEach(name => {
        allShelters.push({ name, city: c.city });
      });
    });
  });

  currentPage = 1;
  currentGroup = 0;
  renderPage();
  renderPagination();
}

/*************************
 * 7. 카드 렌더링
 *************************/
function renderPage() {
  cardContainer.innerHTML = "";

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allShelters.slice(start, start + PAGE_SIZE);

  pageItems.forEach((item, idx) => {
    const pressureData = cityPressureMap[item.city];
    const pressure = pressureData?.capacity
      ? Math.min((pressureData.current / pressureData.capacity) * 100, 100)
      : 0;

    const canvasId = `chart-${currentPage}-${idx}`;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-image">IMG</div>
      <canvas id="${canvasId}" width="220" height="26"></canvas>
      <div class="card-title">${item.name}</div>
    `;

    card.onclick = () => openModal(`${item.name} (${item.city})`);
    cardContainer.appendChild(card);

    renderGauge(canvasId, pressure);
  });
}

/*************************
 * 8. 페이지네이션 (기존 방식 유지)
 *************************/
function renderPagination() {
  pagination.innerHTML = "";

  const totalPages = Math.ceil(allShelters.length / PAGE_SIZE);
  const startPage = currentGroup * PAGE_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);

  if (currentGroup > 0) {
    pagination.appendChild(createPageBtn("<<", () => {
      currentGroup--;
      currentPage = startPage - 1;
      renderPage();
      renderPagination();
    }));
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = createPageBtn(i, () => {
      currentPage = i;
      renderPage();
      renderPagination();
    });
    if (i === currentPage) btn.classList.add("active");
    pagination.appendChild(btn);
  }

  if (endPage < totalPages) {
    pagination.appendChild(createPageBtn(">>", () => {
      currentGroup++;
      currentPage = endPage + 1;
      renderPage();
      renderPagination();
    }));
  }
}

function createPageBtn(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "page-btn";
  btn.textContent = text;
  btn.onclick = onClick;
  return btn;
}

/*************************
 * 9. 차트
 *************************/
function renderGauge(id, value) {
  new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels: [""],
      datasets: [{
        data: [value],
        backgroundColor:
          value >= 80 ? "#e74c3c" :
          value >= 50 ? "#f1c40f" :
                        "#2ecc71",
        borderRadius: 8,
        barThickness: 14
      }]
    },
    options: {
      indexAxis: "y",
      responsive: false,
      scales: {
        x: { min: 0, max: 100, display: false },
        y: { display: false }
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

/*************************
 * 10. 모달
 *************************/
function openModal(text) {
  modalContent.textContent = text;
  modalOverlay.style.display = "flex";
}
modalCloseBtn.onclick = () => modalOverlay.style.display = "none";
modalOverlay.onclick = e => {
  if (e.target === modalOverlay) modalOverlay.style.display = "none";
};
