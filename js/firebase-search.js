import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// rescuedAnimals/shelters/meta 정보 가져오기
async function getSheltersMeta() {
    try {
        const metaRef = ref(db, "rescuedAnimals/shelters/meta");
        const snapshot = await get(metaRef);

        if (snapshot.exists()) {
            console.log("=== Shelters Meta 정보 ===");
            console.log(snapshot.val());
            return snapshot.val();
        } else {
            console.log("rescuedAnimals/shelters/meta 데이터가 없습니다.");
            return null;
        }
    } catch (error) {
        console.error("rescuedAnimals/shelters/meta 데이터를 가져오는 중 오류 발생:", error);
        return null;
    }
}

// rescuedAnimals/shelters/list 전체 목록 가져오기 (새로운 구조)
async function getAllShelters() {
    try {
        const sheltersRef = ref(db, "rescuedAnimals/shelters/list");
        const snapshot = await get(sheltersRef);

        if (snapshot.exists()) {
            const sheltersList = snapshot.val();
            return sheltersList;
        } else {
            console.log("rescuedAnimals/shelters/list 데이터가 없습니다.");
            return null;
        }
    } catch (error) {
        console.error("rescuedAnimals/shelters/list 데이터를 가져오는 중 오류 발생:", error);
        return null;
    }
}

// 특정 보호소의 동물 목록 가져오기 (인덱스 기반)
async function getShelterAnimals(index) {
    try {
        const sheltersRef = ref(db, "rescuedAnimals/shelters/list");
        const snapshot = await get(sheltersRef);

        if (!snapshot.exists()) {
            console.log(`rescuedAnimals/shelters/list 데이터가 없습니다.`);
            return null;
        }

        const sheltersList = snapshot.val();
        const shelter = sheltersList[index];

        if (!shelter) {
            console.log(`인덱스 ${index}에 해당하는 보호소가 없습니다.`);
            return null;
        }

        console.log(`\n=== ${shelter.info?.careNm} 동물 목록 ===`);
        console.log(`전화번호: ${shelter.info?.careTel}`);
        console.log(`현재 보호 중: ${shelter.info?.currentAnimals || 0}마리`);
        console.log(`총 ${shelter.animals?.length || 0}마리 조회 완료\n`);

        // 샘플 출력
        const animals = shelter.animals || [];
        animals.slice(0, 5).forEach((animal, idx) => {
            console.log(`[${idx + 1}] ${animal.kindCd || "미상"}`);
            console.log(`   나이: ${animal.age || "미상"}`);
            console.log(`   성별: ${animal.sexCd || "미상"}`);
            console.log(`   상태: ${animal.processState || "미상"}`);
            console.log(`   공고번호: ${animal.noticeNo || "미상"}\n`);
        });

        if (animals.length > 5) {
            console.log(`... 외 ${animals.length - 5}마리\n`);
        }

        return animals;
    } catch (error) {
        console.error("동물 데이터를 가져오는 중 오류 발생:", error);
        return null;
    }
}

// 특정 전화번호로 보호소 찾기
async function findShelterByPhone(phone) {
    try {
        const sheltersRef = ref(db, "rescuedAnimals/shelters/list");
        const snapshot = await get(sheltersRef);

        if (snapshot.exists()) {
            const sheltersList = snapshot.val();

            // 전화번호 정규화
            const normalizePhone = (p) => p ? p.replace(/[^0-9]/g, "") : "";
            const targetPhone = normalizePhone(phone);

            const foundIndex = sheltersList.findIndex(shelter =>
                normalizePhone(shelter.info?.careTel) === targetPhone
            );

            if (foundIndex !== -1) {
                const shelter = sheltersList[foundIndex];
                console.log(`\n=== 보호소 검색 결과 (전화번호: ${phone}) ===`);
                console.log(`인덱스: ${foundIndex}`);
                console.log(`보호소명: ${shelter.info?.careNm}`);
                console.log(`주소: ${shelter.info?.careAddr}`);
                console.log(`현재 보호 중: ${shelter.info?.currentAnimals || 0}마리\n`);

                return { index: foundIndex, ...shelter };
            }

            console.log(`전화번호 ${phone}에 해당하는 보호소를 찾을 수 없습니다.`);
            return null;
        }

        return null;
    } catch (error) {
        console.error("보호소 검색 중 오류 발생:", error);
        return null;
    }
}

// rescuedAnimals/data 특정 날짜 데이터 가져오기
async function getRescuedAnimals(yearMonth, day) {
    try {
        const dataRef = ref(db, `rescuedAnimals/data/${yearMonth}/${day}`);
        const snapshot = await get(dataRef);

        if (!snapshot.exists()) {
            console.log(`rescuedAnimals/data/${yearMonth}/${day} 데이터가 없습니다.`);
            return null;
        }

        const animals = snapshot.val();
        console.log(`\n=== rescuedAnimals ${yearMonth}/${day} ===`);
        console.log(`총 동물 수: ${animals.length}마리\n`);

        // 샘플 출력
        animals.slice(0, 3).forEach((animal, idx) => {
            console.log(`[${idx + 1}] ${animal.kindCd || "미상"}`);
            console.log(`   보호소: ${animal.careNm || "미상"}`);
            console.log(`   전화번호: ${animal.careTel || "미상"}`);
            console.log(`   최대수용수: ${animal.shelterCapacity || "미확인"}`);
            console.log(`   상태: ${animal.processState || "미상"}\n`);
        });

        if (animals.length > 3) {
            console.log(`... 외 ${animals.length - 3}마리\n`);
        }

        return animals;
    } catch (error) {
        console.error("rescuedAnimals/data 데이터를 가져오는 중 오류 발생:", error);
        return null;
    }
}

// 실행
(async () => {
    console.log("=".repeat(60));
    console.log("Firebase 데이터 조회 시작");
    console.log("=".repeat(60));

    // shelters/meta 조회
    await getSheltersMeta();

    // shelters 전체 목록 조회 (새로운 구조: list)
    await getAllShelters();

    // 예시: 첫 번째 보호소의 동물 목록 조회
    // await getShelterAnimals(0);

    // 예시: 전화번호로 보호소 검색
    // await findShelterByPhone("031-123-4567");

    // 예시: 특정 날짜의 rescuedAnimals 데이터 조회
    // await getRescuedAnimals("202601", "21");

    console.log("\n" + "=".repeat(60));
    console.log("Firebase 데이터 조회 완료");
    console.log("=".repeat(60));
})();
