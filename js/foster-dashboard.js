import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ========== Firebase 데이터 조회 함수 ==========
// 전체 임시보호자 목록 가져오기
async function getAllFosters() {
    try {
        const fostersRef = ref(db, "users");
        const snapshot = await get(fostersRef);

        if (snapshot.exists()) {
            const dataObject = snapshot.val();
            return Object.values(dataObject);
        }
        return [];
        
    } catch (error) {
        console.error("fosters list 조회 오류:", error);
        return [];
    }
}


// ========== 대시보드 데이터 업데이트 함수 ==========
// 대시보드 카드 업데이트
async function updateDashboardCards() {
    const fosterData = await getAllFosters();


    // 엘리먼트 존재 여부를 체크하여 에러 방지
    const fosterCnt = document.getElementById('api-foster-total');
    const fosterAct = document.getElementById('api-foster-acting');
    if (fosterCnt && fosterData) {
        // 카운트 변수 선언
        let fosterTotal = 0;
        let fosterActing = 0;
        let localActing = 0;
        let localExpert = 0;

        // userType : foster 카운트
        for (let i = 0; i < fosterData.length; i++) {
            if (fosterData[i].userType === "foster") {
                fosterTotal += 1;
            }
        };

        // isAvailable : true 카운트
        for (let i = 0; i < fosterData.length; i++) {
            if (fosterData[i].fosterInfo?.isAvailable === true) {
                fosterActing += 1;
            }
        };

        // TODO: 현재지역 활동중, 현재지역 숙련자 카운트 로직 추가 필요
        // 현재는 임시 데이터 사용
        localActing = Math.floor(fosterActing * 0.3);
        localExpert = Math.floor(fosterActing * 0.15);

        // 객체의 키 개수를 세어서 총 인원 표시 (데이터가 객체인 경우)
        // fosterCnt.textContent = Object.keys(fosterData).length;
        fosterCnt.textContent = fosterTotal;
        fosterAct.textContent = fosterActing;

        // 차트 렌더링
        renderFosterCharts(fosterActing, localActing, localExpert);

        // 현재지역 활동중, 숙련자 표시
        document.getElementById('api-foster-emergency').textContent = localActing;
        document.getElementById('api-animal-emergency').textContent = localExpert;
    }

    // console.log("대시보드 업데이트 완료");
}

// ========== Chart.js 차트 렌더링 ==========
let fosterChart1 = null;
let fosterChart2 = null;

// 중앙 퍼센트 표시 플러그인
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const data = chart.data.datasets[0].data;
        const total = data.reduce((a, b) => a + b, 0);
        const percent = total > 0 ? Math.round((data[0] / total) * 100) : 0;

        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.font = 'bold 24px Pretendard';
        ctx.fillStyle = '#192631';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percent}%`, centerX, centerY);
        ctx.restore();
    }
};

function renderFosterCharts(acting, localActing, localExpert) {
    // 차트1: 활동중 대비 현재지역 활동 비율
    const ctx1 = document.getElementById('fosterChart1');
    if (ctx1) {
        if (fosterChart1) {
            fosterChart1.destroy();
        }

        const otherActing = acting - localActing;
        const context1 = ctx1.getContext('2d');

        // 그라데이션 생성 (shelter.js 스타일)
        const gradient1 = context1.createLinearGradient(0, 0, 180, 180);
        gradient1.addColorStop(0, '#3b82f6');
        gradient1.addColorStop(1, '#22c55e');

        fosterChart1 = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['현재지역 활동', '기타지역 활동'],
                datasets: [{
                    data: [localActing, otherActing],
                    backgroundColor: [gradient1, '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                animation: {
                    duration: 1400,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '지역 활동율',
                        position: 'bottom',
                        font: { size: 12 },
                        padding: { top: 10 }
                    }
                }
            },
            plugins: [centerTextPlugin]
        });
    }

    // 차트2: 활동중 대비 현재지역 숙련자 비율
    const ctx2 = document.getElementById('fosterChart2');
    if (ctx2) {
        if (fosterChart2) {
            fosterChart2.destroy();
        }

        const otherActing = acting - localExpert;
        const context2 = ctx2.getContext('2d');

        // 그라데이션 생성 (shelter.js 스타일)
        const gradient2 = context2.createLinearGradient(0, 0, 180, 180);
        gradient2.addColorStop(0, '#8b5cf6');
        gradient2.addColorStop(1, '#6366f1');

        fosterChart2 = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['현재지역 숙련자', '기타 활동자'],
                datasets: [{
                    data: [localExpert, otherActing],
                    backgroundColor: [gradient2, '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                animation: {
                    duration: 1400,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '지역 숙련자',
                        position: 'bottom',
                        font: { size: 12 },
                        padding: { top: 10 }
                    }
                }
            },
            plugins: [centerTextPlugin]
        });
    }
}

// 임시보호자 카드 렌더링 (현재는 샘플 데이터)
function renderFosterCards() {
    // TODO: 실제 임시보호자 데이터가 추가되면 Firebase에서 읽어와서 렌더링
    // console.log("임시보호자 데이터는 아직 준비되지 않았습니다.");
}

// ========== 페이지 초기화 ==========

async function initDashboard() {
    // console.log("Foster Dashboard 초기화 시작...");

    try {
        // 대시보드 카드 업데이트
        await updateDashboardCards();

        // 임시보호자 카드 렌더링
        renderFosterCards();

        // console.log("Foster Dashboard 초기화 완료");
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

// 실행 함수
getAllFosters();