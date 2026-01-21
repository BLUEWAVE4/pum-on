import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ========== Firebase 데이터 조회 함수 ==========

// 보호소 메타 정보 가져오기
async function getSheltersMeta() {
    try {
        const metaRef = ref(db, "rescuedAnimals/shelters/meta");
        const snapshot = await get(metaRef);
        
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error("shelters meta 조회 오류:", error);
        return null;
    }
}

// 전체 보호소 목록 가져오기
async function getAllShelters() {
    try {
        const sheltersRef = ref(db, "rescuedAnimals/shelters/list");
        const snapshot = await get(sheltersRef);
        

        if (snapshot.exists()) {
            return snapshot.val();
        }
        return [];
    } catch (error) {
        console.error("shelters list 조회 오류:", error);
        return [];
    }
}

// ========== 대시보드 데이터 업데이트 함수 ==========

// 대시보드 카드 업데이트
async function updateDashboardCards() {
    const shelters = await getAllShelters();

    if (!shelters || shelters.length === 0) {
        console.log("보호소 데이터가 없습니다.");
        return;
    }

    // 통계 계산
    const totalShelters = shelters.length;
    let totalAnimals = 0;
    let emergencyShelters = 0;
    let emergencyAnimals = 0;

    shelters.forEach(shelter => {
        const currentAnimals = shelter.info?.currentAnimals || 0;
        const capacity = shelter.info?.shelterCapacity || 0;
        
        totalAnimals += currentAnimals;

        // 긴급 지원 필요 판단 (수용률 80% 이상)
        if (capacity > 0 && (currentAnimals / capacity) >= 0.1) {
            emergencyShelters++;
            emergencyAnimals += currentAnimals;
        }
    });

    // 대시보드 카드에 데이터 반영
    // 현재는 보호소 데이터만 있으므로, 임시보호자 관련 데이터는 0으로 표시
    document.getElementById('api-foster-total').textContent = '0'; // 임시보호자 데이터 없음
    document.getElementById('api-animal-total').textContent = totalAnimals.toLocaleString();
    document.getElementById('api-foster-emergency').textContent = '0'; // 임시보호자 데이터 없음
    document.getElementById('api-animal-emergency').textContent = emergencyAnimals.toLocaleString();

    console.log(`대시보드 업데이트 완료 - 보호소: ${totalShelters}개, 보호동물: ${totalAnimals}마리`);
}

// 긴급 지원 필요 보호소 카드 렌더링
async function renderEmergencyShelters() {
    const shelters = await getAllShelters();

    if (!shelters || shelters.length === 0) {
        console.log("보호소 데이터가 없습니다.");
        return;
    }

    // 긴급 지원 필요 보호소 필터링 (수용률 80% 이상)
    const emergencyShelters = shelters
        .filter(shelter => {
            const currentAnimals = shelter.info?.currentAnimals || 0;
            const capacity = shelter.info?.shelterCapacity || 0;
            return capacity > 0 && (currentAnimals / capacity) >= 0.8;
        })
        .sort((a, b) => {
            // 수용률이 높은 순으로 정렬
            const ratioA = (a.info?.currentAnimals || 0) / (a.info?.shelterCapacity || 1);
            const ratioB = (b.info?.currentAnimals || 0) / (b.info?.shelterCapacity || 1);
            return ratioB - ratioA;
        })
        .slice(0, 3); // 상위 3개만

    const shelterContainer = document.querySelector('.shelter-flex');

    if (emergencyShelters.length === 0) {
        shelterContainer.innerHTML = '<p style="text-align: center; width: 100%;">현재 긴급 지원이 필요한 보호소가 없습니다.</p>';
        return;
    }

    // 보호소 카드 HTML 생성
    shelterContainer.innerHTML = emergencyShelters.map(shelter => {
        const currentAnimals = shelter.info?.currentAnimals || 0;
        const capacity = shelter.info?.shelterCapacity || 0;
        const remaining = capacity - currentAnimals;
        const percentage = capacity > 0 ? (currentAnimals / capacity * 100).toFixed(1) : 0;

        return `
            <div class="shelter-card">
                <div class="shelter-card-top">
                    <div class="shelter-icon"></div>
                    <img class="shelter-img" src="../assets/images/foster-shelter-img.png" alt="보호소 건물사진">
                </div>
                <div>
                    <h4 class="shelter-name">${shelter.info?.careNm || '미확인'}</h4>
                    <p class="shelter-address">${shelter.info?.careAddr || '주소 미확인'}</p>
                    <!-- 그래프 -->
                    <div class="shelter-graph">
                        <span style="width: ${percentage}%"></span>
                        <div></div>
                    </div>
                    <div class="shelter-flex-num">
                        <div>${currentAnimals}</div>
                        <div>${capacity}</div>
                        <div>${remaining}</div>
                    </div>
                    <div class="shelter-flex-text">
                        <div>보호중</div>
                        <div>최대 수용</div>
                        <div>남은수</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log(`긴급 보호소 ${emergencyShelters.length}개 렌더링 완료`);
}

// 임시보호자 카드 렌더링 (현재는 샘플 데이터)
function renderFosterCards() {
    // TODO: 실제 임시보호자 데이터가 추가되면 Firebase에서 읽어와서 렌더링
    console.log("임시보호자 데이터는 아직 준비되지 않았습니다.");
}

// ========== 페이지 초기화 ==========

async function initDashboard() {
    console.log("Foster Dashboard 초기화 시작...");

    try {
        // 대시보드 카드 업데이트
        await updateDashboardCards();

        // 긴급 지원 보호소 렌더링
        await renderEmergencyShelters();

        // 임시보호자 카드 렌더링
        renderFosterCards();

        console.log("Foster Dashboard 초기화 완료");
    } catch (error) {
        console.error("Dashboard 초기화 오류:", error);
    }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// 필터 기능 (추후 구현)
// TODO: 지역, 동물 종류, 기간, 상태별 필터링 구현
