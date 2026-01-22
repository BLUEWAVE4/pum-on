import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ========== Firebase 데이터 조회 함수 ==========


// 전체 임시보호자 목록 가져오기
async function getAllFosters() {
    try {
        const fostersRef = ref(db, "rescuedAnimals/fosters/list");
        const snapshot = await get(fostersRef);
        
        
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
    // TODO: 임시보호자 데이터 연동 시 구현
    document.getElementById('api-foster-total').textContent = '0';
    document.getElementById('api-foster-animal').textContent = '0';
    document.getElementById('api-foster-emergency').textContent = '0';
    document.getElementById('api-animal-emergency').textContent = '0';

    console.log("대시보드 업데이트 완료");
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
