///////////////////////////////////////////////
///////////////////////////////////////////////
const firebaseConfig = {
    apiKey: 'AIzaSyABz-oFmsh5QFp8oYzWkz2530478LL8wOA',
    authDomain: 'pum-test3.firebaseapp.com',
    databaseURL: 'https://pum-test3-default-rtdb.firebaseio.com/',
    projectId: 'pum-test3',
    storageBucket: 'pum-test3.firebasestorage.app',
    messagingSenderId: '835661739835',
    appId: '1:835661739835:web:f657319388ed15528aa91e',
    measurementId: 'G-KNLPNK3S5D',
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

///////////////////////////////////////////////
///////////////////////////////////////////////

// 로그인 상태검증 함수
// 로그인 상태 콘솔창에서 확인 가능
async function checkAuth(requiredUserType = null) {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(
            async (user) => {
                unsubscribe();

                try {
                    if (!user) {
                        console.log('로그아웃');

                        // 로그인 페이지가 아닐 때만 리다이렉트
                        if (!location.pathname.includes('login.html')) {
                            alert('로그인이 필요합니다.');
                            // location.href = './pages/login.html';
                        }
                        reject('Not logged in');
                        return;
                    }

                    const snapshot = await database.ref('users/' + user.uid).once('value');
                    const userData = snapshot.val();

                    if (!userData) {
                        alert('사용자 정보를 찾을 수 없습니다.');
                        await auth.signOut();
                        location.href = './login.html';
                        reject('User data not found');
                        return;
                    }

                    if (requiredUserType && userData.userType !== requiredUserType) {
                        alert('접근 권한이 없습니다.');
                        location.href = './login.html';
                        reject('Unauthorized');
                        return;
                    }

                    console.log(`로그인중: ${userData.userType}`);
                    resolve(userData);
                } catch (error) {
                    console.error('checkAuth error:', error);
                    reject(error);
                }
            },
            (authError) => {
                unsubscribe();
                console.error('onAuthStateChanged error:', authError);
                reject(authError);
            },
        );
    });
}

// checkAuth() 사용 방법
// - 파라미터 없음: 로그인 상태만 확인
// - "shelter" 또는 "foster": 해당 권한만 허용
// - resolve: 로그인 성공 + 권한 있음
// - reject: 로그인 안 됨 또는 권한 없음

// 1. 기본 로그인 상태 검증
// checkAuth();

// 2. 보호소 계정만 접근 가능
// checkAuth("shelter").then((userData) => {
// console.log('보호소 로그인 확인:', userData);}).catch(error => {
//     console.error('Auth check failed:', error);
//   });

///////////////////////////////////////////////
// 헤더 UI 업데이트 함수
///////////////////////////////////////////////
function updateHeaderUI(user, userData) {
    const accLoading = document.getElementById('accLoading');
    const accGuest = document.getElementById('accGuest');
    const accUser = document.getElementById('accUser');
    const accName = document.getElementById('accName');
    const accRole = document.getElementById('accRole');

    // 로딩 스피너 숨김
    if (accLoading) accLoading.style.display = 'none';

    if (user && userData) {
        // 로그인 상태
        if (accGuest) accGuest.style.display = 'none';
        if (accUser) accUser.style.display = 'flex';
        if (accName) accName.textContent = userData.fosterInfo?.name || userData.shelterInfo?.name || '사용자';
        if (accRole) {
            const roleMap = { foster: '임시 보호자', shelter: '보호소' };
            accRole.textContent = roleMap[userData.userType] || userData.userType;
        }
    } else {
        // 비로그인 상태
        if (accGuest) accGuest.style.display = 'flex';
        if (accUser) accUser.style.display = 'none';
    }
}
