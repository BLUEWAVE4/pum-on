# Firebase Realtime Database 구조 설계 (최종)

## 목차
1. [전체 구조 개요](#전체-구조-개요)
2. [데이터 수집 및 업데이트 로직](#데이터-수집-및-업데이트-로직)
3. [API 매칭 로직](#api-매칭-로직)
4. [중요 변경사항](#중요-변경사항)
5. [데이터 크기 고려사항](#데이터-크기-고려사항)
6. [쿼리 예시](#쿼리-예시)

---

## 전체 구조 개요

```json
{
  "rescuedAnimals": {
    "meta": {
      "lastUpdated": "2026-01-21T14:30:00Z",
      "lastUpdatedDate": "20260121",
      "totalAnimals": 3000,
      "dataRange": {
        "start": "202501",
        "end": "202601"
      }
    },
    "data": {
      "202501": {
        "01": [
          {
            "desertionNo": "410000202501010001",
            "happenDt": "20250101",
            "happenPlace": "경기도 수원시...",
            "kindCd": "[개] 믹스견",
            "colorCd": "갈색",
            "age": "2021(년생)",
            "weight": "5(Kg)",
            "noticeNo": "경기-수원-2025-00001",
            "noticeSdt": "20250101",
            "noticeEdt": "20250111",
            "popfile": "http://...",
            "processState": "공고중",
            "sexCd": "F",
            "neuterYn": "Y",
            "specialMark": "목에 흰색 털",
            "careNm": "수원시 동물보호센터",
            "careTel": "031-1234-5678",
            "careAddr": "경기도 수원시 장안구...",
            "orgNm": "경기도",
            "chargeNm": "홍길동",
            "officetel": "031-1111-2222",
            "shelterCapacity": null
          }
        ],
        "02": [ /* ... */ ],
        "31": [ /* ... */ ]
      },
      "202502": {
        "01": [ /* ... */ ]
      }
    },
    "shelters": {
      "meta": {
        "totalShelters": 50,
        "lastUpdated": "2026-01-21T14:30:00Z"
      },
      "list": [
        {
          "info": {
            "careNm": "수원시 동물보호센터",
            "careTel": "031-1234-5678",
            "careAddr": "경기도 수원시 장안구...",
            "jibunAddr": "경기도 수원시 장안구...",
            "divisionNm": "수원시청",
            "saveTrgetAnimal": "개, 고양이",
            "operOpenHhmm": "0900",
            "operCloseHhmm": "1800",
            "closeDay": "일요일, 공휴일",
            "vetPersonCnt": "2",
            "specsPersonCnt": "5",
            "latitude": "37.2636",
            "longitude": "127.0286",
            "shelterCapacity": null,
            "currentAnimals": 48,
            "statusBreakdown": {
              "protecting": 30,
              "notice": 18
            },
            "animals": [
              {
                "desertionNo": "410000202501010001",
                "happenDt": "20250101",
                "happenPlace": "경기도 수원시...",
                "kindCd": "[개] 믹스견",
                "colorCd": "갈색",
                "age": "2021(년생)",
                "weight": "5(Kg)",
                "noticeNo": "경기-수원-2025-00001",
                "noticeSdt": "20250101",
                "noticeEdt": "20250111",
                "popfile": "http://...",
                "processState": "공고중",
                "sexCd": "F",
                "neuterYn": "Y",
                "specialMark": "목에 흰색 털",
                "chargeNm": "홍길동",
                "officetel": "031-1111-2222"
              }
            ]
          }
        }
      ]
    }
  }
}
```

### 구조 설명

#### 1. `rescuedAnimals/meta`
- 전체 데이터의 메타 정보
- `lastUpdated`: 마지막 업데이트 시각 (ISO 8601)
- `lastUpdatedDate`: 마지막 업데이트 날짜 (yyyyMMdd)
- `totalAnimals`: 1년치 총 동물 수
- `dataRange`: 데이터 수집 기간

#### 2. `rescuedAnimals/data`
- **목적**: 일자별 스냅샷 저장 (이력 조회 및 통계용)
- **구조**: `yyyymm/dd/[동물 배열]`
- **특징**: 
  - 한번 저장된 데이터는 수정하지 않음
  - 그날의 API 조회 결과를 그대로 저장
  - Firebase RTDB 크기 제한을 고려한 일자별 분할 저장

#### 3. `rescuedAnimals/shelters`
- **목적**: 현재 보호소 현황 (실시간 상태)
- **구조**:
  - `meta`: 보호소 메타 정보
  - `list`: 보호소 배열
- **특징**:
  - RTDB의 `data` 객체에서 동물 데이터를 읽어 재생성
  - 경기도 보호소 API와 매칭하여 `shelterCapacity` (ACEPTNC_ABLTY_CNT) 추가
  - `currentAnimals`: 현재 보호소에 있는 동물 수 (공고중 + 보호중)
  - `statusBreakdown`: 상태별 세부 카운트
  - `animals`: 현재 보호중/공고중인 동물 리스트 (보호소 정보 제외)

---

## 데이터 수집 및 업데이트 로직

### 1. 초기 데이터 수집 (1년치)

```javascript
async function initialDataCollection() {
  const today = new Date();
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  // 경기도 보호소 API 데이터 가져오기
  const gyeonggiShelters = await fetchGyeonggiShelterAPI();
  const shelterMap = createShelterMap(gyeonggiShelters);
  
  // 1년치 일자별로 데이터 수집
  let currentDate = new Date(oneYearAgo);
  
  while (currentDate <= today) {
    const dateStr = formatDate(currentDate, 'yyyyMMdd');
    const [yyyymm, dd] = [dateStr.slice(0, 6), dateStr.slice(6, 8)];
    
    console.log(`Collecting data for ${dateStr}...`);
    
    // API 호출
    const animals = await fetchAbandonmentAPI({
      bgnde: dateStr,
      endde: dateStr,
      numOfRows: 10000,
      pageNo: 1
    });
    
    // shelterCapacity 추가
    const enrichedAnimals = animals.map(animal => {
      const careTel = normalizePhoneNumber(animal.careTel);
      const matchedShelter = shelterMap[careTel];
      
      return {
        ...animal,
        shelterCapacity: matchedShelter?.ACEPTNC_ABLTY_CNT || null
      };
    });
    
    // RTDB 저장
    await saveToRTDB(
      `rescuedAnimals/data/${yyyymm}/${dd}`,
      enrichedAnimals
    );
    
    // 다음 날짜로
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // shelters 초기 생성
  await updateShelters();
  
  // meta 업데이트
  await updateMeta({
    lastUpdated: new Date().toISOString(),
    lastUpdatedDate: formatDate(today, 'yyyyMMdd'),
    totalAnimals: await calculateTotalAnimals(),
    dataRange: {
      start: formatDate(oneYearAgo, 'yyyyMM'),
      end: formatDate(today, 'yyyyMM')
    }
  });
}
```

### 2. 일일 업데이트 로직

```javascript
async function dailyUpdate() {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 일일 업데이트 시작");
  console.log("=".repeat(60) + "\n");

  const today = new Date();
  const todayStr = toYYYYMMDD(today);
  const lastUpdated = await getLastUpdatedDate();

  console.log(`📅 오늘 날짜: ${todayStr}`);
  console.log(`📅 마지막 업데이트: ${lastUpdated || "없음"}\n`);

  if (!lastUpdated) {
    console.log("⚠️  마지막 업데이트 정보 없음. shelters 및 meta 초기화 시작...\n");

    // shelters 생성 (현재 data에 있는 데이터로부터)
    await updateShelters();

    // meta 초기화
    await updateMeta({
      lastUpdated: new Date().toISOString(),
      lastUpdatedDate: todayStr,
    });

    console.log("✅ shelters 및 meta 초기화 완료\n");
    return;
  }

  if (todayStr !== lastUpdated) {
    console.log("🆕 새로운 날짜 감지. 업데이트 시작...\n");

    // 1. 오늘 데이터 수집
    await updateDataForDate(todayStr);

    // 2. shelters 재생성 (1년치 최신 상태)
    await updateShelters();

    // 3. meta 업데이트
    await updateMeta({
      lastUpdated: new Date().toISOString(),
      lastUpdatedDate: todayStr,
    });

    console.log("✅ 일일 업데이트 완료\n");
  } else {
    console.log("ℹ️  이미 최신 상태입니다. 실시간 업데이트 확인 중...\n");

    // 오늘 데이터 재수집 (실시간 변경사항 반영)
    await updateDataForDate(todayStr);

    // shelters 재생성
    await updateShelters();

    console.log("✅ 실시간 업데이트 완료\n");
  }

  console.log("=".repeat(60));
  console.log("✅ 일일 업데이트 완료");
  console.log("=".repeat(60) + "\n");
}

// 특정 날짜의 데이터 수집 및 저장
async function updateDataForDate(dateStr) {
  const [yyyymm, dd] = [dateStr.slice(0, 6), dateStr.slice(6, 8)];

  console.log(`\n📅 ${dateStr} 데이터 수집 중...`);

  // 해당 날짜 동물 데이터 조회
  const animals = await fetchResqueAnimal(dateStr);

  if (animals.length === 0) {
    console.log(`   ⚠️  데이터 없음`);
    return;
  }

  console.log(`   ✅ ${animals.length}마리 데이터 수집 완료`);

  // shelter API가 없으므로 shelterCapacity는 null로 설정
  const enrichedAnimals = animals.map((animal) => ({
    ...animal,
    shelterCapacity: null, // 별도 API 없이는 알 수 없음
  }));

  // RTDB 저장
  await set(ref(db, `rescuedAnimals/data/${yyyymm}/${dd}`), enrichedAnimals);

  console.log(`   💾 RTDB 저장 완료 (rescuedAnimals/data/${yyyymm}/${dd})`);
}
```

### 3. Shelters 업데이트 로직 (RTDB 기반)

```javascript
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
    return;
  }

  // 경기도 보호소 API 데이터 가져오기
  console.log("📡 경기도 보호소 API 조회 중...");
  const gyeonggiShelters = await fetchGyeonggiShelterAPI();
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

  // 경기도 API 데이터 매칭 및 최종 정리
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
        ...group.info,
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

  console.log(`✅ 정리 완료: ${shelterArray.length}개 보호소\n`);

  // RTDB 저장
  console.log(`💾 RTDB 저장 중...`);

  await set(ref(db, "rescuedAnimals/shelters/list"), shelterArray);
  await set(ref(db, "rescuedAnimals/shelters/meta"), {
    totalShelters: shelterArray.length,
    lastUpdated: new Date().toISOString(),
  });

  console.log(`✅ Shelters 업데이트 완료: ${shelterArray.length}개 보호소\n`);
}
```

---

## API 매칭 로직

### 전화번호 정규화

```javascript
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  // 모든 특수문자 제거 (-, ), (, 공백 등)
  return phone.replace(/[^0-9]/g, '');
}

// 사용 예시
normalizePhoneNumber('031-1234-5678');  // '0311234567'
normalizePhoneNumber('031)1234-5678');  // '0311234567'
normalizePhoneNumber('031 1234 5678');  // '0311234567'
```

### 보호소 매칭 맵 생성

```javascript
async function createShelterMap(gyeonggiShelters) {
  const shelterMap = {};
  
  for (const shelter of gyeonggiShelters) {
    const tel = normalizePhoneNumber(shelter.ENTRPS_TELNO);
    
    // 중복 전화번호가 있을 수 있으므로 첫 번째 것만 사용
    if (!shelterMap[tel]) {
      shelterMap[tel] = shelter;
    }
  }
  
  return shelterMap;
}
```

### API 호출 함수

```javascript
// 구조동물 조회 API
async function fetchAbandonmentAPI(params) {
  const {
    bgnde,      // 시작일 (yyyyMMdd)
    endde,      // 종료일 (yyyyMMdd)
    pageNo = 1,
    numOfRows = 1000
  } = params;
  
  const url = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic';
  const serviceKey = process.env.ABANDONMENT_API_KEY;
  
  const queryParams = new URLSearchParams({
    serviceKey,
    bgnde,
    endde,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    _type: 'json'
  });
  
  try {
    const response = await fetch(`${url}?${queryParams}`);
    const data = await response.json();
    
    if (data.response?.body?.items?.item) {
      const items = data.response.body.items.item;
      return Array.isArray(items) ? items : [items];
    }
    
    return [];
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

// 경기도 보호소 현황 API (프록시 경유)
async function fetchGyeonggiShelterAPI() {
  const API_KEY = "YOUR_API_KEY";
  const PROXY_BASE = "http://127.0.0.1:8787";

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
      return [];
    }

    const data = await res.json();

    // 경기도 API 응답 구조: OrganicAnimalProtectionFacilit[1].row
    if (data.OrganicAnimalProtectionFacilit && data.OrganicAnimalProtectionFacilit[1]?.row) {
      console.log(`✅ 경기도 보호소 ${data.OrganicAnimalProtectionFacilit[1].row.length}개 조회 완료`);
      return data.OrganicAnimalProtectionFacilit[1].row;
    }

    return [];
  } catch (error) {
    console.error("경기도 보호소 API 에러:", error);
    return [];
  }
}

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
```

---

## 중요 변경사항

### 2026-01-21 업데이트

#### 1. Shelter API 변경
- **제거**: `shelter_v2` API (전국 보호소 조회 서비스) - 작동하지 않음
- **유지**: 경기도 보호소 API (`OrganicAnimalProtectionFacilit`)
- **영향**:
  - 경기도 외 지역 보호소는 `shelterCapacity` 및 추가 정보가 `null`
  - 경기도 보호소만 `ACEPTNC_ABLTY_CNT` (수용 가능 마리 수) 매칭 가능

#### 2. Shelters 업데이트 로직 변경
- **이전**: 1년치 API 직접 조회 (느리고 데이터 많음)
- **변경**: RTDB의 `rescuedAnimals/data`에서 읽어서 재생성 (빠르고 안정적)
- **장점**:
  - API 호출 최소화
  - 이미 수집된 데이터 재활용
  - 빠른 초기화 및 업데이트

#### 3. 초기화 로직 추가
- `meta/lastUpdatedDate`가 없으면 자동으로 `shelters` 및 `meta` 초기화
- 별도의 `initialDataCollection()` 호출 불필요
- `dailyUpdate()` 실행 시 자동 처리

#### 4. 동물 데이터 구조 변경
- `shelters/list[]/animals` 배열에서 중복 정보 제거
  - 제거된 필드: `careNm`, `careTel`, `careAddr`, `orgNm`, `shelterCapacity`
  - 이유: `info` 객체에 이미 존재하므로 중복 방지
- `data` 객체의 동물 데이터는 `shelterCapacity: null`로 저장 (shelter API 없음)

---

## 과거 데이터 상태 변경 처리 (더 이상 해당 없음)

### 문제 상황

```javascript
// 12월 21일: 동물 등록
rescuedAnimals/data/202512/21 → [
  { desertionNo: "410000202512210001", processState: "공고중" }
]

// 1월 21일: 그 동물이 입양됨
// 하지만 rescuedAnimals/data/202512/21 데이터는 여전히 "공고중"
```

### 해결 방법: 최신 API 조회

**핵심: rescuedAnimals/data는 "그날의 스냅샷", shelters는 "현재 상태"**

```javascript
// ❌ 잘못된 방법: RTDB data에서 읽기
async function updateSheltersWrong() {
  const allData = await getAllRescuedAnimals();  // 과거 스냅샷
  // → 12월에 공고중이었던 동물이 입양되어도 반영 안 됨
}

// ✅ 올바른 방법: API에서 최신 상태 조회
async function updateShelters() {
  const oneYearAgo = getOneYearAgo();
  const today = getToday();
  
  // API로 1년치의 "현재 상태" 조회
  const currentStateAnimals = await fetchAbandonmentAPIAll({
    bgnde: oneYearAgo,
    endde: today
  });
  
  // → 12월에 등록된 동물도 현재 상태(입양)로 반환됨
}
```

### API 동작 방식 이해

```javascript
// 예시: 12월 21일에 등록된 동물을 1월 21일에 조회

fetchAbandonmentAPI({
  bgnde: '20251221',  // 등록 기간 시작
  endde: '20260121'   // 등록 기간 종료
});

// 반환 데이터:
[
  {
    desertionNo: "410000202512210001",
    happenDt: "20251221",  // 발견 날짜
    processState: "종료(입양)",  // ⭐ 현재 최신 상태!
    // ...
  }
]
```

공공데이터 API는 **등록 기간에 해당하는 동물들의 현재 최신 상태**를 반환합니다!

---

## 데이터 크기 고려사항

### Firebase RTDB 제한
- 단일 노드 최대 크기: 32MB
- 무료 플랜: 1GB
- 유료 플랜: 10GB 이상

### 예상 크기 계산

```javascript
// 동물 1마리 데이터 크기
{
  "desertionNo": "410000202512210001",  // ~25B
  "happenDt": "20251221",               // ~10B
  "kindCd": "[개] 믹스견",               // ~20B
  // ... 총 약 500B ~ 1KB
}

// 일일 평균 데이터
하루 평균 동물 수: 10마리
1일 크기: 10 × 1KB = 10KB

// 1년치 데이터
365일 × 10KB = 3.65MB

// shelters 데이터
보호소 50개 × (보호소 정보 1KB + 동물 20마리 × 1KB)
= 50 × 21KB = 1.05MB

// 총 예상 크기
약 5MB (충분히 여유 있음)
```

### 최적화 전략

1. **일자별 분할 저장**
   - `yyyymm/dd` 구조로 분할하여 32MB 제한 회피
   - 특정 날짜만 조회 가능

2. **이미지는 URL만 저장**
   - `popfile` 필드에 URL 문자열만 저장
   - 이미지 자체는 원본 서버에 보관

3. **null 값 제거**
   ```javascript
   function cleanData(obj) {
     return Object.fromEntries(
       Object.entries(obj).filter(([_, v]) => v != null && v !== '')
     );
   }
   ```

4. **인덱싱**
   ```json
   {
     "rules": {
       "rescuedAnimals": {
         "data": {
           ".indexOn": ["careTel", "processState", "desertionNo"]
         }
       }
     }
   }
   ```

---

## 보안 규칙

```json
{
  "rules": {
    "rescuedAnimals": {
      ".read": true,
      
      "meta": {
        ".write": "auth != null"
      },
      
      "data": {
        ".write": "auth != null",
        "$yyyymm": {
          ".indexOn": ["careTel", "processState"],
          "$dd": {
            ".validate": "newData.isString() === false"
          }
        }
      },
      
      "shelters": {
        ".write": "auth != null",
        "list": {
          ".indexOn": ["info/careTel", "info/currentAnimals"]
        }
      }
    }
  }
}
```

---

## 쿼리 예시

### 1. 특정 보호소의 현재 보호 동물 조회

```javascript
import { ref, get } from 'firebase/database';

async function getShelterAnimals(careTel) {
  const sheltersRef = ref(db, 'rescuedAnimals/shelters/list');
  const snapshot = await get(sheltersRef);
  const shelters = snapshot.val();
  
  const normalizedTel = normalizePhoneNumber(careTel);
  
  const targetShelter = shelters.find(shelter => 
    normalizePhoneNumber(shelter.info.careTel) === normalizedTel
  );
  
  if (targetShelter) {
    return {
      name: targetShelter.info.careNm,
      currentAnimals: targetShelter.info.currentAnimals,
      capacity: targetShelter.info.shelterCapacity,
      occupancyRate: (
        targetShelter.info.currentAnimals / 
        targetShelter.info.shelterCapacity * 
        100
      ).toFixed(1) + '%',
      animals: targetShelter.info.animals
    };
  }
  
  return null;
}

// 사용
const result = await getShelterAnimals('031-1234-5678');
console.log(`${result.name}: ${result.currentAnimals}/${result.capacity} (${result.occupancyRate})`);
```

### 2. 특정 날짜의 구조동물 조회

```javascript
async function getAnimalsByDate(date) {
  const [yyyymm, dd] = [date.slice(0, 6), date.slice(6, 8)];
  
  const dateRef = ref(db, `rescuedAnimals/data/${yyyymm}/${dd}`);
  const snapshot = await get(dateRef);
  
  if (snapshot.exists()) {
    return snapshot.val();
  }
  
  return [];
}

// 사용
const animals = await getAnimalsByDate('20260121');
console.log(`1월 21일 구조 동물: ${animals.length}마리`);
```

### 3. 전체 보호소의 수용률 계산

```javascript
async function calculateAllShelterOccupancy() {
  const sheltersRef = ref(db, 'rescuedAnimals/shelters/list');
  const snapshot = await get(sheltersRef);
  const shelters = snapshot.val();
  
  const stats = shelters.map(shelter => ({
    name: shelter.info.careNm,
    capacity: shelter.info.shelterCapacity,
    current: shelter.info.currentAnimals,
    rate: (
      shelter.info.currentAnimals / 
      shelter.info.shelterCapacity * 
      100
    ).toFixed(1),
    protecting: shelter.info.statusBreakdown.protecting,
    notice: shelter.info.statusBreakdown.notice
  }));
  
  // 수용률 높은 순으로 정렬
  stats.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
  
  return stats;
}

// 사용
const occupancy = await calculateAllShelterOccupancy();
console.table(occupancy);
```

### 4. 특정 기간의 통계 분석

```javascript
async function getStatsByPeriod(startDate, endDate) {
  const start = new Date(
    startDate.slice(0, 4),
    parseInt(startDate.slice(4, 6)) - 1,
    startDate.slice(6, 8)
  );
  
  const end = new Date(
    endDate.slice(0, 4),
    parseInt(endDate.slice(4, 6)) - 1,
    endDate.slice(6, 8)
  );
  
  const stats = {
    totalAnimals: 0,
    byState: {},
    byKind: {},
    byShelter: {}
  };
  
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = formatDate(currentDate, 'yyyyMMdd');
    const animals = await getAnimalsByDate(dateStr);
    
    stats.totalAnimals += animals.length;
    
    for (const animal of animals) {
      // 상태별 집계
      stats.byState[animal.processState] = 
        (stats.byState[animal.processState] || 0) + 1;
      
      // 품종별 집계
      stats.byKind[animal.kindCd] = 
        (stats.byKind[animal.kindCd] || 0) + 1;
      
      // 보호소별 집계
      stats.byShelter[animal.careNm] = 
        (stats.byShelter[animal.careNm] || 0) + 1;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return stats;
}

// 사용
const monthlyStats = await getStatsByPeriod('20260101', '20260131');
console.log('1월 통계:', monthlyStats);
```

### 5. 실시간 리스너 (특정 보호소 모니터링)

```javascript
import { ref, onValue } from 'firebase/database';

function monitorShelter(careTel, callback) {
  const sheltersRef = ref(db, 'rescuedAnimals/shelters/list');
  
  const unsubscribe = onValue(sheltersRef, (snapshot) => {
    const shelters = snapshot.val();
    const normalizedTel = normalizePhoneNumber(careTel);
    
    const targetShelter = shelters.find(shelter => 
      normalizePhoneNumber(shelter.info.careTel) === normalizedTel
    );
    
    if (targetShelter) {
      callback(targetShelter.info);
    }
  });
  
  return unsubscribe;
}

// 사용
const unsubscribe = monitorShelter('031-1234-5678', (shelterInfo) => {
  console.log('보호소 업데이트:', shelterInfo.currentAnimals);
  
  // 수용률 80% 이상이면 알림
  const rate = shelterInfo.currentAnimals / shelterInfo.shelterCapacity;
  if (rate >= 0.8) {
    alert(`${shelterInfo.careNm} 수용률 ${(rate * 100).toFixed(1)}% - 포화 상태!`);
  }
});

// 리스너 해제
// unsubscribe();
```

---

## 유틸리티 함수

```javascript
// 날짜 포맷팅
function formatDate(date, format) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (format === 'yyyyMMdd') {
    return `${year}${month}${day}`;
  } else if (format === 'yyyyMM') {
    return `${year}${month}`;
  }
  
  return `${year}-${month}-${day}`;
}

// 1년 전 날짜
function getOneYearAgo(fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setFullYear(date.getFullYear() - 1);
  return date;
}

// 누락된 날짜 계산
function getMissingDates(lastUpdated, today) {
  const start = new Date(
    lastUpdated.slice(0, 4),
    parseInt(lastUpdated.slice(4, 6)) - 1,
    lastUpdated.slice(6, 8)
  );
  
  const end = new Date(
    today.slice(0, 4),
    parseInt(today.slice(4, 6)) - 1,
    today.slice(6, 8)
  );
  
  const missing = [];
  let current = new Date(start);
  current.setDate(current.getDate() + 1);
  
  while (current < end) {
    missing.push(formatDate(current, 'yyyyMMdd'));
    current.setDate(current.getDate() + 1);
  }
  
  return missing;
}

// Firebase 저장 헬퍼
async function saveToRTDB(path, data) {
  const dbRef = ref(db, path);
  await set(dbRef, data);
}

// 마지막 업데이트 날짜 가져오기
async function getLastUpdated() {
  const metaRef = ref(db, 'rescuedAnimals/meta/lastUpdatedDate');
  const snapshot = await get(metaRef);
  return snapshot.val() || formatDate(getOneYearAgo(), 'yyyyMMdd');
}

// 전체 동물 수 계산
async function calculateTotalAnimals() {
  const dataRef = ref(db, 'rescuedAnimals/data');
  const snapshot = await get(dataRef);
  const data = snapshot.val();
  
  let total = 0;
  
  for (const yyyymm in data) {
    for (const dd in data[yyyymm]) {
      total += data[yyyymm][dd].length;
    }
  }
  
  return total;
}
```

---

## 스케줄링 (자동 업데이트)

### Node.js (node-cron)

```javascript
import cron from 'node-cron';

// 매일 오전 6시에 업데이트
cron.schedule('0 6 * * *', async () => {
  console.log('Starting daily update...');
  
  try {
    await dailyUpdate();
    console.log('Daily update completed successfully');
  } catch (error) {
    console.error('Daily update failed:', error);
    // 알림 전송 (이메일, Slack 등)
  }
});

// 매시간마다 shelters 재생성 (실시간 반영)
cron.schedule('0 * * * *', async () => {
  console.log('Updating shelters...');
  
  try {
    await updateShelters();
    console.log('Shelters updated successfully');
  } catch (error) {
    console.error('Shelters update failed:', error);
  }
});
```

### Firebase Functions (Cloud Functions)

```javascript
import { onSchedule } from 'firebase-functions/v2/scheduler';

// 매일 오전 6시 (KST)
export const dailyUpdateScheduled = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Asia/Seoul'
  },
  async (event) => {
    console.log('Starting scheduled daily update...');
    await dailyUpdate();
  }
);

// 매시간
export const updateSheltersScheduled = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Asia/Seoul'
  },
  async (event) => {
    console.log('Starting scheduled shelters update...');
    await updateShelters();
  }
);
```

---

## 정리

### rescuedAnimals/data (일자별 스냅샷)
- **목적**: 과거 이력 및 통계 분석
- **특징**: 한번 저장하면 수정 안 함
- **업데이트**: 매일 오늘 날짜 데이터만 추가
- **shelterCapacity**: `null` (별도 shelter API 없음)

### rescuedAnimals/shelters (현재 상태)
- **목적**: 실시간 보호소 현황
- **데이터 소스**: RTDB의 `rescuedAnimals/data` 객체
- **업데이트**: 매일 RTDB 데이터 기반으로 전체 재생성
- **경기도 보호소**: `shelterCapacity` (ACEPTNC_ABLTY_CNT) 매칭 가능
- **다른 지역 보호소**: 추가 정보 `null`

### 동물 데이터 구조
- **data 객체**: 전체 동물 정보 (보호소 정보 포함)
- **shelters/list[]/animals**: 중복 정보 제거 (careNm, careTel, careAddr, orgNm, shelterCapacity 제외)

### currentAnimals 계산
- 공고중 + 보호중 = currentAnimals
- 종료(입양), 종료(반환), 종료(자연사) 등은 제외
- RTDB 데이터 기반으로 정확한 수치 유지

### 초기화
- `meta/lastUpdatedDate`가 없으면 자동으로 `shelters` 및 `meta` 생성
- `dailyUpdate()` 실행 시 자동 처리
