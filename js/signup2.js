/*
  [기능 정의]
  input입력 - api 데이터 조회 - 회원가입버튼눌렀을때 db저장되는 로직
*/

// ========== DOM요소 (보호소) ==========
const selectShelterBtn = document.getElementById('btn-select-shelter');

const shelterEmailEl = document.getElementById('shelter-email');
const shelterPwEl = document.getElementById('shelter-password');
const shelterPwcEl = document.getElementById('shelter-password-confirm');
const shelterMgEl = document.getElementById('shelter-manager-name');
const shelterMgpEl = document.getElementById('shelter-manager-phone');

const shelterOwnerNameEl = document.getElementById('shelter-owner-name');
const shelterBizNmEl = document.getElementById('shelter-business-number');
const shelterNmEl = document.getElementById('shelter-name');
const shelterRegNmEl = document.getElementById('shelter-registration-number');
const shelterAddressEl = document.getElementById('shelter-address');

// ========== DOM요소 (임보) ==========
const selectFosterBtn = document.getElementById('btn-select-foster');

const userEmailEl = document.getElementById('user-email');
const userPwEl = document.getElementById('user-password');
const userPwcEl = document.getElementById('user-password-confirm');

const userNameEl = document.getElementById('user-name');
const userPhoneEl = document.getElementById('user-phone');
const userAddressEl = document.getElementById('user-address');

const userPrefDogEl = document.getElementById('user-prefer-dog');
const userPrefCatEl = document.getElementById('user-prefer-cat');
const userPrefEctEl = document.getElementById('user-prefer-etc');

const usersizeSEl = document.getElementById('user-size-small');
const usersizeMEl = document.getElementById('user-size-medium');
const usersizeLEl = document.getElementById('user-size-large');

const userExpNEl = document.getElementById('user-experience-no');
const userExpYEl = document.getElementById('user-experience-yes');
const userExpYNmEl = document.getElementById('user-experience-yesNm');

const userCareMediEl = document.getElementById('user-care-medicine');
const userCaredisabledEl = document.getElementById('user-care-disabled');
const userCareSeniorEl = document.getElementById('user-care-senior');

const userCertNmEl = document.getElementById('user-cert-number');

// ========== DOM요소 (전송) ==========
const beforeBtns = document.querySelectorAll('.btn-before');
const signUpBtns = document.querySelectorAll('.btn-signup');

// ========== DOM요소 (div) ==========
const signupSelect = document.getElementById('signupSelect');
const shelterBtn = document.getElementById('btn-select-shelter');
const fosterBtn = document.getElementById('btn-select-foster');

const shelterBox = document.querySelector('.signup-shelter');
const fosterBox = document.querySelector('.signup-users');

// ========== 전역 변수 ==========
let selectedUserType = null;
let shelterData = null;

// ========== 페이지 로드 시 보호소 데이터 가져오기 ==========
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('../assets/data/gyeonggi-shelter.json');
        shelterData = await response.json();
        console.log('보호소 데이터 로드 완료:', shelterData.length, '개');
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('보호소 데이터를 불러오는데 실패했습니다.');
    }
});

// ========== 보호소 정보 검색 함수 ==========
async function findShelterByPhone() {
    // 데이터 로드 확인
    if (!shelterData) {
        alert('데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return null;
    }

    // 입력값 가져오기
    const userPhone = shelterRegNmEl.value.trim();
    
    if (!userPhone) {
        alert('등록번호(전화번호)를 입력해주세요.');
        return null;
    }

    // 전화번호로 보호소 찾기 (하이픈 유무 관계없이)
    const shelter = shelterData.find(item => 
        item.ENTRPS_TELNO.replace(/\-/g, '') === userPhone.replace(/\-/g, '')
    );

    if (shelter) {
        // 주소 표시
        shelterAddressEl.innerText = shelter.REFINE_LOTNO_ADDR;
        
        // 위도, 경도 변환 (문자열 → 숫자)
        const latitude = parseFloat(shelter.REFINE_WGS84_LAT);
        const longitude = parseFloat(shelter.REFINE_WGS84_LOGT);
        
        // 지도 표시
        displayMap(latitude, longitude);
        
        // 추가 정보 로그
        console.log('보호소명:', shelter.ENTRPS_NM);
        console.log('수용능력:', shelter.ACEPTNC_ABLTY_CNT);
        
        return { latitude, longitude, shelter };
    } else {
        alert('해당 전화번호의 보호소를 찾을 수 없습니다.');
        shelterAddressEl.innerText = '';
        return null;
    }
}

// ========== 지도 표시 함수 ==========
// displayMap 함수 - kakao.maps.load() 제거
function displayMap(lat, lng) {
    console.log(`지도 표시: 위도 ${lat}, 경도 ${lng}`);
    
    try {
        var container = document.getElementById('map');
        
        if (!container) {
            console.error('지도를 표시할 #map 요소를 찾을 수 없습니다.');
            return;
        }
        
        var options = {
            center: new kakao.maps.LatLng(lat, lng),
            level: 3
        };

        var map = new kakao.maps.Map(container, options);

        // 마커 생성
        var markerPosition = new kakao.maps.LatLng(lat, lng);
        var marker = new kakao.maps.Marker({
            position: markerPosition
        });

        marker.setMap(map);
        
        console.log('지도 표시 성공!');
    } catch (error) {
        console.error('지도 표시 오류:', error);
        alert('지도를 표시할 수 없습니다.');
    }
}

// ========== 등록번호 입력 시 엔터키로 검색 ==========
shelterRegNmEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // 폼 제출 방지
        findShelterByPhone();
    }
});

// ========== 보호소 선택 버튼 ==========
shelterBtn.addEventListener('click', () => {
    selectedUserType = 'shelter';
    signupSelect.classList.add('hidden');
    shelterBox.classList.remove('hidden');
    fosterBox.classList.add('hidden');
    console.log('보호소버튼클릭완료', selectedUserType);
});

// ========== 보호소 회원가입 함수 ==========
const signUpShelter = async () => {
    const email = shelterEmailEl.value;
    const password = shelterPwEl.value;
    const passwordConfirm = shelterPwcEl.value;

    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        const userData = {
            userType: selectedUserType,
            email: email,
            createdAt: new Date().toISOString(),
            shelterInfo: {
                managerName: shelterMgEl.value,
                managerPhone: shelterMgpEl.value,
                type: document.querySelector('input[name="shelter-type"]:checked').value,
                ownerName: shelterOwnerNameEl.value,
                businessNumber: shelterBizNmEl.value,
                name: shelterNmEl.value,
                regNum: shelterRegNmEl.value,
                address: shelterAddressEl.textContent,
            },
        };
        console.log(userData, '데이터입력값확인');

        await database.ref('users/' + userId).set(userData);
        alert('보호소 회원가입 완료!');
    } catch (error) {
        alert('오류: ' + error.message);
    }
};

// ========== 임시보호자 선택 버튼 ==========
fosterBtn.addEventListener('click', () => {
    selectedUserType = 'foster';
    signupSelect.classList.add('hidden');
    fosterBox.classList.remove('hidden');
    shelterBox.classList.add('hidden');
    console.log('개인버튼클릭완료', selectedUserType);
});

// ========== 임시보호자 회원가입 함수 ==========
const signUpFoster = async () => {
    const email = userEmailEl.value;
    const password = userPwEl.value;
    const passwordConfirm = userPwcEl.value;

    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // 체크박스 수집
        const preferAnimals = [];
        if (userPrefDogEl.checked) preferAnimals.push('dog');
        if (userPrefCatEl.checked) preferAnimals.push('cat');
        if (userPrefEctEl.checked) preferAnimals.push('etc');

        const preferSizes = [];
        if (usersizeSEl.checked) preferSizes.push('소형');
        if (usersizeMEl.checked) preferSizes.push('중형');
        if (usersizeLEl.checked) preferSizes.push('대형');

        const specialCare = [];
        if (userCareMediEl.checked) specialCare.push('medicine');
        if (userCaredisabledEl.checked) specialCare.push('disabled');
        if (userCareSeniorEl.checked) specialCare.push('senior');

        // 양육 경험 처리
        let experienceYears = 0;
        if (userExpNEl.checked) {
            experienceYears = 0;
        }
        if (userExpYEl.checked) {
            experienceYears = parseInt(userExpYNmEl.value) || 0;
        }

        const userData = {
            userType: selectedUserType,
            email: email,
            createdAt: new Date().toISOString(),
            fosterInfo: {
                name: userNameEl.value,
                phone: userPhoneEl.value,
                address: userAddressEl.value,
                maxPeriod: document.querySelector('input[name="user-period"]:checked').value,
                preferAnimals: preferAnimals,
                preferSizes: preferSizes,
                experience: document.querySelector('input[name="user-experience"]:checked').value,
                experienceYears: experienceYears,
                specialCare: specialCare,
                cert: document.querySelector('input[name="user-cert"]:checked').value,
                certNumber: userCertNmEl.value,
                isAvailable: true,
            },
        };
        console.log(userData);

        await database.ref('users/' + userId).set(userData);
        alert('임시보호자 회원가입 완료!');
    } catch (error) {
        alert('오류: ' + error.message);
    }
};

// ========== 회원가입 버튼 이벤트 ==========
signUpBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (selectedUserType === 'shelter') {
            await signUpShelter();
        } else if (selectedUserType === 'foster') {
            await signUpFoster();
        } else {
            alert('회원 유형을 선택해주세요.');
        }
    });
});

// ========== 이전 버튼 이벤트 ==========
beforeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        location.reload();
    });
});