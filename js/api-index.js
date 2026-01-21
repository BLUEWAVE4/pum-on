import { db } from "./firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const PROXY_BASE = "http://127.0.0.1:8787";

// ========== 유틸리티 함수 ==========

function toYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getYearMonth(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDay(date) {
  return String(date.getDate()).padStart(2, "0");
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

function getOneYearAgo(fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setFullYear(date.getFullYear() - 1);
  return date;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ========== API 호출 함수 ==========

// 유기동물 공공데이터 API (프록시 경유) - 단일 날짜 조회
const fetchResqueAnimal = async (dateStr) => {
  const API_KEY = "35a34e22a23d55be2e0b3c03a3b6cd3ce7fa2391c15cce9467c50353fe26c724";
  const numOfRows = 1000;
  let totalBytes = 0;

  // 첫 번째 요청으로 totalCount 확인
  const firstParams = new URLSearchParams({
    serviceKey: API_KEY,
    _type: "json",
    pageNo: 1,
    numOfRows: 1,
    bgnde: dateStr,
    endde: dateStr,
  });

  const firstRes = await fetch(`${PROXY_BASE}/api/abandonmentPublic_v2?${firstParams}`, {
    method: "GET",
  });

  if (!firstRes.ok) {
    const text = await firstRes.text();
    throw new Error(`HTTP ${firstRes.status} ${firstRes.statusText}\n${text}`);
  }
  const firstText = await firstRes.text();
  totalBytes += new Blob([firstText]).size;
  const firstData = JSON.parse(firstText);
  const totalCount = firstData.response.body.totalCount;
  const totalPages = Math.ceil(totalCount / numOfRows);

  if (totalCount === 0) {
    return { animals: [], bytes: totalBytes };
  }

  // 모든 페이지 데이터 조회
  const allAnimals = [];
  for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      _type: "json",
      pageNo,
      numOfRows,
      bgnde: dateStr,
      endde: dateStr,
    });

    const res = await fetch(`${PROXY_BASE}/api/abandonmentPublic_v2?${params}`, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
    }
    const resText = await res.text();
    totalBytes += new Blob([resText]).size;
    const data = JSON.parse(resText);
    const items = data.response.body.items.item || [];
    allAnimals.push(...(Array.isArray(items) ? items : [items]));
  }

  return { animals: allAnimals, bytes: totalBytes };
};

// 유기동물 공공데이터 API - 기간 조회 (1년치, 페이지네이션 처리)
// 현재 사용하지 않음 - RTDB에서 직접 읽어오는 방식으로 변경
const fetchAbandonmentAPIAll = async (bgnde, endde) => {
  const API_KEY = "35a34e22a23d55be2e0b3c03a3b6cd3ce7fa2391c15cce9467c50353fe26c724";
  const numOfRows = 1000;

  console.log(`📊 ${bgnde} ~ ${endde} 기간 데이터 조회 시작...`);

  // 첫 번째 요청으로 totalCount 확인
  const firstParams = new URLSearchParams({
    serviceKey: API_KEY,
    _type: "json",
    pageNo: 1,
    numOfRows: 1,
    bgnde,
    endde,
  });

  const firstRes = await fetch(`${PROXY_BASE}/api/abandonmentPublic_v2?${firstParams}`, {
    method: "GET",
  });

  if (!firstRes.ok) {
    const text = await firstRes.text();
    throw new Error(`HTTP ${firstRes.status} ${firstRes.statusText}\n${text}`);
  }
  const firstData = await firstRes.json();
  const totalCount = firstData.response.body.totalCount;
  const totalPages = Math.ceil(totalCount / numOfRows);

  console.log(`   총 ${totalCount}마리 (${totalPages} 페이지)`);

  if (totalCount === 0) {
    return [];
  }

  // 모든 페이지 데이터 조회
  const allAnimals = [];
  for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      _type: "json",
      pageNo,
      numOfRows,
      bgnde,
      endde,
    });

    const res = await fetch(`${PROXY_BASE}/api/abandonmentPublic_v2?${params}`, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
    }
    const data = await res.json();
    const items = data.response.body.items.item || [];
    allAnimals.push(...(Array.isArray(items) ? items : [items]));

    if (pageNo % 10 === 0) {
      console.log(`   페이지 ${pageNo}/${totalPages} 완료 (${allAnimals.length}/${totalCount})`);
    }
  }

  console.log(`✅ 기간 데이터 조회 완료: ${allAnimals.length}마리\n`);
  return allAnimals;
};

// 경기도 보호소 API 조회
const fetchGyeonggiShelterAPI = async () => {
  const API_KEY = "35a34e22a23d55be2e0b3c03a3b6cd3ce7fa2391c15cce9467c50353fe26c724";

  const params = new URLSearchParams({
    KEY: API_KEY,
    Type: "json",
    pIndex: "1",
    pSize: "1000",
  });

  try {
    const res = await fetch(`${PROXY_BASE}/api/shelter?${params}`, {
      method: "GET",
    });

    if (!res.ok) {
      console.log("⚠️  경기도 보호소 API 조회 실패");
      return { shelters: [], bytes: 0 };
    }

    const resText = await res.text();
    const bytes = new Blob([resText]).size;
    const data = JSON.parse(resText);

    // 경기도 API 응답 구조: OrganicAnimalProtectionFacilit[1].row
    if (data.OrganicAnimalProtectionFacilit && data.OrganicAnimalProtectionFacilit[1]?.row) {
      return { shelters: data.OrganicAnimalProtectionFacilit[1].row, bytes };
    }

    return { shelters: [], bytes };
  } catch (error) {
    console.error("경기도 보호소 API 에러:", error);
    return { shelters: [], bytes: 0 };
  }
};

// 경기도 보호소 매칭 맵 생성 (전화번호 기반)
function createGyeonggiShelterMap(gyeonggiShelters) {
  const shelterMap = {};

  for (const shelter of gyeonggiShelters) {
    const tel = normalizePhoneNumber(shelter.ENTRPS_TELNO);

    // 중복 전화번호가 있을 수 있으므로 첫 번째 것만 사용
    if (!shelterMap[tel] && tel) {
      shelterMap[tel] = shelter;
    }
  }

  return shelterMap;
}

// ========== Firebase 헬퍼 함수 ==========

async function getLastUpdatedDate() {
  const metaRef = ref(db, "rescuedAnimals/meta/lastUpdatedDate");
  const snapshot = await get(metaRef);
  return snapshot.val() || null;
}

async function checkDateExists(yearMonth, day) {
  const snapshot = await get(ref(db, `rescuedAnimals/data/${yearMonth}/${day}`));
  return snapshot.exists();
}

// ========== 보호소 매칭 로직 ==========

// 더 이상 사용하지 않음 - extractSheltersFromAnimals로 대체
// function createShelterMap(sheltersV2Data) { ... }

// ========== 데이터 수집 로직 ==========

// 특정 날짜의 데이터 수집 및 저장
async function updateDataForDate(dateStr) {
  const [yyyymm, dd] = [dateStr.slice(0, 6), dateStr.slice(6, 8)];

  console.log(`\n📅 ${dateStr} 데이터 수집 중...`);

  // 해당 날짜 동물 데이터 조회
  const { animals, bytes } = await fetchResqueAnimal(dateStr);

  if (animals.length === 0) {
    console.log(`   ⚠️  데이터 없음 (다운로드: ${formatBytes(bytes)})`);
    return { bytes };
  }

  console.log(`   ✅ ${animals.length}마리 데이터 수집 완료 (다운로드: ${formatBytes(bytes)})`);

  // shelter API가 없으므로 shelterCapacity는 null로 설정
  const enrichedAnimals = animals.map((animal) => ({
    ...animal,
    shelterCapacity: null, // 별도 API 없이는 알 수 없음
  }));

  // RTDB 저장
  await set(ref(db, `rescuedAnimals/data/${yyyymm}/${dd}`), enrichedAnimals);

  console.log(`   💾 RTDB 저장 완료 (rescuedAnimals/data/${yyyymm}/${dd})`);

  return { bytes };
}

// RTDB에서 데이터 읽어오기
async function getAllAnimalsFromRTDB() {
  console.log("📦 RTDB에서 기존 데이터 읽는 중...");

  const dataRef = ref(db, "rescuedAnimals/data");
  const snapshot = await get(dataRef);

  if (!snapshot.exists()) {
    console.log("⚠️  RTDB에 데이터가 없습니다.");
    return [];
  }

  const data = snapshot.val();
  const allAnimals = [];

  for (const yyyymm in data) {
    for (const dd in data[yyyymm]) {
      const animals = data[yyyymm][dd];
      if (Array.isArray(animals)) {
        allAnimals.push(...animals);
      }
    }
  }

  console.log(`✅ RTDB에서 ${allAnimals.length}마리 데이터 로드 완료\n`);
  return allAnimals;
}

// shelters 업데이트 로직 (RTDB 데이터 기반)
async function updateShelters() {
  console.log("\n🏥 Shelters 업데이트 시작...\n");

  // RTDB에서 기존 데이터 가져오기 (API 호출 대신)
  const allCurrentAnimals = await getAllAnimalsFromRTDB();

  if (allCurrentAnimals.length === 0) {
    console.log("⚠️  동물 데이터가 없어 shelters를 생성할 수 없습니다.\n");
    return { bytes: 0 };
  }

  // 경기도 보호소 API 데이터 가져오기
  console.log("📡 경기도 보호소 API 조회 중...");
  const { shelters: gyeonggiShelters, bytes: shelterBytes } = await fetchGyeonggiShelterAPI();
  console.log(`   ✅ 경기도 보호소 API 조회 완료 (다운로드: ${formatBytes(shelterBytes)})`);
  const gyeonggiShelterMap = createGyeonggiShelterMap(gyeonggiShelters);

  console.log(`\n📊 보호소별 그룹화 시작...`);

  // 보호소별로 그룹화
  const shelterGroups = {};

  for (const animal of allCurrentAnimals) {
    const careTel = normalizePhoneNumber(animal.careTel);

    if (!careTel) continue;

    if (!shelterGroups[careTel]) {
      shelterGroups[careTel] = {
        info: {
          careNm: animal.careNm,
          careTel: animal.careTel,
          careAddr: animal.careAddr,
          orgNm: animal.orgNm,
        },
        animals: [],
        statusBreakdown: {
          protecting: 0,
          notice: 0,
        },
      };
    }

    // ⭐ 보호소에 있는 동물만 추가 (공고중 + 보호중)
    // "종료(입양)", "종료(반환)", "종료(자연사)" 등은 제외
    if (!animal.processState.startsWith("종료")) {
      // 동물 데이터에서 중복 정보 제거 (careNm, careTel, careAddr, orgNm 제거)
      const { careNm, careTel: tel, careAddr, orgNm, shelterCapacity, ...animalData } = animal;

      shelterGroups[careTel].animals.push(animalData);

      // 상태별 카운트
      if (animal.processState === "보호중") {
        shelterGroups[careTel].statusBreakdown.protecting++;
      } else if (animal.processState === "공고중") {
        shelterGroups[careTel].statusBreakdown.notice++;
      }
    }
  }

  console.log(`✅ 보호소별 그룹화 완료: ${Object.keys(shelterGroups).length}개 보호소\n`);

  // shelter API 없이 동물 데이터에서 추출한 정보만 사용
  console.log(`🔗 보호소 정보 정리 중...`);

  const shelterArray = [];

  for (const [careTel, group] of Object.entries(shelterGroups)) {
    const normalizedTel = normalizePhoneNumber(careTel);
    const matchedShelter = gyeonggiShelterMap[normalizedTel];

    // 경기도 API 데이터가 있으면 추가 정보 병합
    if (matchedShelter) {
      group.info = {
        ...group.info,
        jibunAddr: matchedShelter.JIBUN_ADDR || null,
        divisionNm: matchedShelter.ENTRPS_NM || null,
        saveTrgetAnimal: matchedShelter.ANIMAL_HDLG_KND_NM || null,
        operOpenHhmm: matchedShelter.OPER_TIME_OPBGN_TM || null,
        operCloseHhmm: matchedShelter.OPER_TIME_OPEND_TM || null,
        closeDay: matchedShelter.RSTDE_GUID_CN || null,
        vetPersonCnt: matchedShelter.VET_STAF_CO || null,
        specsPersonCnt: matchedShelter.SBSCP_STAF_CO || null,
        latitude: matchedShelter.REFINE_WGS84_LAT || null,
        longitude: matchedShelter.REFINE_WGS84_LOGT || null,
        shelterCapacity: matchedShelter.ACEPTNC_ABLTY_CNT || null, // ⭐ 수용 가능 마리 수
        currentAnimals: group.animals.length,
        statusBreakdown: group.statusBreakdown,
      };
    } else {
      // 경기도 API에 없는 보호소 (다른 지역)
      group.info = {
        careNm: group.info.careNm,
        careTel: group.info.careTel,
        careAddr: group.info.careAddr,
        orgNm: group.info.orgNm,
        jibunAddr: null,
        divisionNm: null,
        saveTrgetAnimal: null,
        operOpenHhmm: null,
        operCloseHhmm: null,
        closeDay: null,
        vetPersonCnt: null,
        specsPersonCnt: null,
        latitude: null,
        longitude: null,
        shelterCapacity: null,
        currentAnimals: group.animals.length,
        statusBreakdown: group.statusBreakdown,
      };
    }

    shelterArray.push(group);
  }

  // RTDB 저장
  console.log(`💾 RTDB 저장 중...`);

  await set(ref(db, "rescuedAnimals/shelters/list"), shelterArray);
  await set(ref(db, "rescuedAnimals/shelters/meta"), {
    totalShelters: shelterArray.length,
    lastUpdated: new Date().toISOString(),
  });

  console.log(`✅ Shelters 업데이트 완료: ${shelterArray.length}개 보호소\n`);

  return { bytes: shelterBytes };
}

// meta 업데이트
async function updateMeta(updates) {
  const metaRef = ref(db, "rescuedAnimals/meta");
  const snapshot = await get(metaRef);
  const existingMeta = snapshot.exists() ? snapshot.val() : {};

  await set(metaRef, {
    ...existingMeta,
    ...updates,
  });

  console.log(`✅ Meta 업데이트 완료`);
}

// ========== 메인 로직 ==========

// 초기 데이터 수집 (1년치)
async function initialDataCollection() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 초기 데이터 수집 시작 (1년치)");
  console.log("=".repeat(60) + "\n");

  const today = new Date();
  const oneYearAgo = getOneYearAgo(today);
  let totalBytes = 0;

  console.log(`📅 수집 기간: ${toYYYYMMDD(oneYearAgo)} ~ ${toYYYYMMDD(today)}\n`);

  // 1년치 일자별로 데이터 수집
  let currentDate = new Date(oneYearAgo);

  while (currentDate <= today) {
    const dateStr = toYYYYMMDD(currentDate);
    const result = await updateDataForDate(dateStr);
    if (result) totalBytes += result.bytes;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // shelters 초기 생성
  const shelterResult = await updateShelters();
  if (shelterResult) totalBytes += shelterResult.bytes;

  // meta 업데이트
  await updateMeta({
    lastUpdated: new Date().toISOString(),
    lastUpdatedDate: toYYYYMMDD(today),
    dataRange: {
      start: getYearMonth(oneYearAgo),
      end: getYearMonth(today),
    },
  });

  console.log("\n" + "=".repeat(60));
  console.log(`✅ 초기 데이터 수집 완료 (총 다운로드: ${formatBytes(totalBytes)})`);
  console.log("=".repeat(60) + "\n");
}

// 일일 업데이트 로직
async function dailyUpdate() {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 일일 업데이트 시작");
  console.log("=".repeat(60) + "\n");

  const today = new Date();
  const todayStr = toYYYYMMDD(today);
  const lastUpdated = await getLastUpdatedDate();
  let totalBytes = 0;

  console.log(`📅 오늘 날짜: ${todayStr}`);
  console.log(`📅 마지막 업데이트: ${lastUpdated || "없음"}\n`);

  if (!lastUpdated) {
    console.log("⚠️  마지막 업데이트 정보 없음. shelters 및 meta 초기화 시작...\n");

    // shelters 생성 (현재 data에 있는 데이터로부터)
    const shelterResult = await updateShelters();
    if (shelterResult) totalBytes += shelterResult.bytes;

    // meta 초기화
    await updateMeta({
      lastUpdated: new Date().toISOString(),
      lastUpdatedDate: todayStr,
    });

    console.log(`✅ shelters 및 meta 초기화 완료 (총 다운로드: ${formatBytes(totalBytes)})\n`);
    return;
  }

  if (todayStr !== lastUpdated) {
    console.log("🆕 새로운 날짜 감지. 업데이트 시작...\n");

    // 1. 오늘 데이터 수집
    const dateResult = await updateDataForDate(todayStr);
    if (dateResult) totalBytes += dateResult.bytes;

    // 2. shelters 재생성 (1년치 최신 상태)
    const shelterResult = await updateShelters();
    if (shelterResult) totalBytes += shelterResult.bytes;

    // 3. meta 업데이트
    await updateMeta({
      lastUpdated: new Date().toISOString(),
      lastUpdatedDate: todayStr,
    });

    console.log(`✅ 일일 업데이트 완료 (총 다운로드: ${formatBytes(totalBytes)})\n`);
  } else {
    console.log("ℹ️  이미 최신 상태입니다. 실시간 업데이트 확인 중...\n");

    // 오늘 데이터 재수집 (실시간 변경사항 반영)
    const dateResult = await updateDataForDate(todayStr);
    if (dateResult) totalBytes += dateResult.bytes;

    // shelters 재생성
    const shelterResult = await updateShelters();
    if (shelterResult) totalBytes += shelterResult.bytes;

    console.log(`✅ 실시간 업데이트 완료 (총 다운로드: ${formatBytes(totalBytes)})\n`);
  }

  console.log("=".repeat(60));
  console.log(`✅ 일일 업데이트 완료 (총 다운로드: ${formatBytes(totalBytes)})`);
  console.log("=".repeat(60) + "\n");
}

// ========== 실행 ==========

// 초기 데이터 수집 실행 (최초 1회만)
// initialDataCollection();

// 일일 업데이트 실행 (기본)
dailyUpdate();
