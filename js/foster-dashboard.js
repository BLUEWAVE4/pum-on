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
    const fosterAct = document.getElementById('api-foster-acting');
    if (fosterAct && fosterData) {
        // 카운트 변수 선언
        let fosterActing = 0;
        let localActing = 0;
        let localExpert = 0;

        // isAvailable : true 기준 카운트 시작
        for (let i = 0; i < fosterData.length; i++) {
            if (fosterData[i].fosterInfo?.isAvailable === true) {
                fosterActing += 1;
                // 활동중에서 지역 활동자 카운트
                // 1. 로그인된 사용자 지역 검증
                // 2. 검증된 지역 값과 비교
                // if (fosterData[i].fosterInfo?.address === ) {console.log("");
                // }

            }};


        // TODO: 현재지역 활동중, 현재지역 숙련자 카운트 로직 추가 필요
        // 현재는 임시 데이터 사용
        localActing = Math.floor(fosterActing * 0.3);
        localExpert = Math.floor(fosterActing * 0.15);

        // 카드 숫자 카운트업 애니메이션
        animateValue(fosterAct, fosterActing);
        animateValue(document.getElementById('api-foster-emergency'), localActing);
        animateValue(document.getElementById('api-animal-emergency'), localExpert);

        // 차트 데이터 저장 (Observer가 트리거할 때 사용)
        fosterChartData = { acting: fosterActing, localActing, localExpert };
    }

    // console.log("대시보드 업데이트 완료");
}

// ========== 카운트업 애니메이션 함수 ==========
function animateValue(element, target, duration = 1400) {
    let start = null;
    const startValue = 0;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);

        // easeOutQuart 이징 함수 적용
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (target - startValue) * easeProgress);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

// ========== Chart.js 차트 렌더링 ==========
let fosterChart1 = null;
let fosterChart2 = null;

// 배경 도넛 플러그인 (스케일 애니메이션 포함)

const backgroundDoughnutPlugin = {
    id: 'backgroundDoughnut',
    beforeDraw(chart) {
        const { ctx, chartArea, config } = chart;
        const { top, bottom, left, right } = chartArea;

        // 애니메이션 진행률 (0~1)
        const progress = chart._percentProgress !== undefined ? chart._percentProgress : 1;
        // easeOutQuart 이징 적용
        const easeProgress = 1 - Math.pow(1 - progress, 5);

        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        const maxOuterRadius = Math.min(right - left, bottom - top) / 1.85;
        const outerRadius = maxOuterRadius * easeProgress;
        const cutout = config.options.cutout ? parseFloat(config.options.cutout) / 109 : 0.72;
        const innerRadius = outerRadius * cutout;

        if (outerRadius <= 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = '#ebf1fcff';
        ctx.fill();
        ctx.restore();
    }
};

// 중앙 퍼센트 표시 플러그인 (카운트업 애니메이션 포함)
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
        const { ctx, chartArea, config } = chart;
        const data = chart.data.datasets[0].data;
        const total = data.reduce((a, b) => a + b, 0);
        const targetPercent = total > 0 ? Math.round((data[0] / total) * 100) : 0;

        // 애니메이션 진행률 계산 (0~1)
        const progress = chart._percentProgress !== undefined ? chart._percentProgress : 1;
        const currentPercent = Math.round(targetPercent * progress);

        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        // 제목 텍스트 가져오기
        const title = config.options.plugins?.title?.text || '';

        ctx.save();
        ctx.textAlign = 'center';

        // 제목 (위쪽)
        if (title) {
            ctx.font = '500 12px Pretendard';
            ctx.fillStyle = '#4C7495';
            ctx.fillText(title, centerX, centerY - 12);
        }

        // 퍼센트 (아래쪽) - 애니메이션 적용
        ctx.font = 'bold 24px Pretendard';
        ctx.fillStyle = '#192631';
        ctx.fillText(`${currentPercent}%`, centerX, centerY + 10);

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
                    borderColor: ['transparent', '#ffffff'],
                    borderWidth: [0, 0.5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                layout: {
                    padding: 10
                },
                animation: {
                    duration: 1400,
                    easing: 'easeOutQuart',
                    animateRotate: true,
                    animateScale: true,
                    onProgress: (animation) => {
                        if (animation.chart._percentProgress !== 1) {
            animation.chart._percentProgress = animation.currentStep / animation.numSteps;
        }
                    },
                    onComplete: (animation) => {
                        animation.chart._percentProgress = 1;
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                        text: '지역 활동율'
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [backgroundDoughnutPlugin, centerTextPlugin]
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
                    borderColor: ['transparent', '#ffffff'],
                    borderWidth: [0, 0.5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                layout: {
                    padding: 10
                },
                animation: {
                    duration: 1400,
                    easing: 'easeOutQuart',
                    animateRotate: true,
                    animateScale: true,
                    onProgress: (animation) => {
                                 if (animation.chart._percentProgress !== 1) {
                            animation.chart._percentProgress = animation.currentStep / animation.numSteps;
                        };
                    },
                    onComplete: (animation) => {
                        animation.chart._percentProgress = 1;
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false,
                        text: '숙련자 비율'
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [backgroundDoughnutPlugin, centerTextPlugin]
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

        // 차트 딜레이 렌더링 (애니메이션이 보이도록)
        setTimeout(() => {
            renderFosterCharts(fosterChartData.acting, fosterChartData.localActing, fosterChartData.localExpert);
        }, 100);

        setTimeout(() => {
            renderStatsCharts();
        }, 200);

        // console.log("Foster Dashboard 초기화 완료");
    } catch (error) {
        console.error("Dashboard 초기화 오류:", error);
    }
}

// 도넛 차트 데이터 저장
let fosterChartData = { acting: 0, localActing: 0, localExpert: 0 };

// ========== 통계 요약 차트 ==========
let regionChart = null;

// 내 지역 설정 (TODO: 실제 사용자 위치 기반으로 변경)
const myRegion = '서울';

function renderStatsCharts() {
    const regionCtx = document.getElementById('regionChart');
    if (!regionCtx) return;
    if (regionChart) regionChart.destroy();

    // 지역 데이터 (전체 지역 옵션과 동일 - 17개)
    const regions = [
        '서울', '부산', '대구', '인천', '광주', '세종', '대전', '울산',
        '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
    ];
    const targetData = [12, 5, 4, 3, 2, 1, 3, 2, 10, 1, 1, 2, 1, 1, 2, 3, 1];

    // 내 지역 강조 색상
    const colors = regions.map(region =>
        region === myRegion ? '#6673FF' : 'rgba(102, 115, 255, 0.25)'
    );

    // 애니메이션용 초기 데이터 (0부터 시작)
    const animatedData = new Array(regions.length).fill(0);

    regionChart = new Chart(regionCtx, {
        type: 'bar',
        data: {
            labels: regions,
            datasets: [{
                data: animatedData,
                backgroundColor: colors,
                borderRadius: 4,
                barPercentage: 0.65,
                categoryPercentage: 0.8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { right: 40 }
            },
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { display: false },
                    border: { display: false },
                    max: Math.max(...targetData) + 3
                },
                y: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { size: 12, family: 'Pretendard', weight: '500' },
                        color: (ctx) => regions[ctx.index] === myRegion ? '#6673FF' : '#4C7495',
                        padding: 6
                    }
                }
            }
        },
        plugins: [{
            id: 'valueLabels',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                data.datasets[0].data.forEach((value, i) => {
                    const bar = chart.getDatasetMeta(0).data[i];
                    ctx.save();
                    ctx.font = '500 12px Pretendard';
                    ctx.fillStyle = regions[i] === myRegion ? '#6673FF' : '#8898A8';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${Math.round(value)}명`, bar.x + 6, bar.y);
                    ctx.restore();
                });
            }
        }]
    });

    // 부드러운 카운트업 애니메이션
    animateChartData(regionChart, targetData, 1200);
}

// 차트 데이터 애니메이션 함수
function animateChartData(chart, targetData, duration) {
    const startTime = performance.now();
    const startData = new Array(targetData.length).fill(0);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutQuart 이징
        const easeProgress = 1 - Math.pow(1 - progress, 4);

        // 데이터 업데이트
        chart.data.datasets[0].data = targetData.map((target, i) =>
            startData[i] + (target - startData[i]) * easeProgress
        );
        chart.update('none');

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
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