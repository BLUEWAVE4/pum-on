document.addEventListener('DOMContentLoaded', () => {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logout');

    // 로그인 함수
    const logIn = async (e) => {
        e.preventDefault();

        const email = emailEl.value.trim();
        const password = passwordEl.value;

        // 입력값 검증
        if (!email || !password) {
            alert('이메일과 비밀번호를 입력하세요.');
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            const snapshot = await database.ref('users/' + userId).once('value');
            const userData = snapshot.val();

            if (!userData) {
                alert('사용자 정보를 찾을 수 없습니다.');
                return;
            }

            console.log('로그인 성공:', userData.userType);
            location.href = '../index.html';
        } catch (error) {
            console.error('로그인 오류:', error.code);

            if (error.code === 'auth/user-not-found') {
                alert('등록되지 않은 이메일입니다.');
            } else if (error.code === 'auth/wrong-password') {
                alert('비밀번호가 틀렸습니다.');
            } else if (error.code === 'auth/invalid-email') {
                alert('이메일 형식이 올바르지 않습니다.');
            } else if (error.code === 'auth/invalid-credential') {
                alert('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else {
                alert('로그인 실패: ' + error.message);
            }
        }
    };

    // 로그아웃 함수
    const logOut = async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            console.log('로그아웃 성공');
            location.href = './login.html';
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 실패');
        }
    };

    // 이벤트 연결
    if (loginForm) loginForm.addEventListener('submit', logIn);
    if (logoutBtn) logoutBtn.addEventListener('click', logOut);

    // 로그인 페이지가 아닐 때만 권한 체크
    if (!location.pathname.includes('login.html')) {
        checkAuth().catch((error) => {
            console.error('Auth check failed:', error);
        });
    }
});

/*
    login.js제외
    각페이지에 checkAuth()함수로
    header의 로그인 상태 체크
    */

/*
// 공통함수 : 모든 페이지에서 사용할 header 업데이트 함수 (예시)
function updateHeader(userData) {
    // 모든 페이지에서 사용할 header 업데이트 함수
    function updateHeader(userData) {
    // 헤더 관련 키값 넣기
    const accMenu = document.getElementById('accMenu');
    const accName = document.getElementById('accName');
    const heir = document.getElementById('heir');

    if (!userData) {
        // ❌ 로그인 안 됨 → header 숨기기
        if (accMenu) accMenu.style.display = 'none';
            return;
        }

    // ✅ 로그인됨 → header 보이기 + 정보 업데이트
    if (accMenu) accMenu.style.display = 'flex';
    if (accName) accName.textContent = userData.name || '사용자';
    if (heir) {
        heir.textContent = userData.userType === 'shelter' ? '보호소' : '임시 보호자';
        }
    }
// foster.html - 로그인 + 권한 
document.addEventListener('DOMContentLoaded', () => {
    checkAuth("shelter").then((userData) => {
    //  로그인 상태 확인 + header 업데이트
    updateHeader(userData);
    }).catch(() => {
    // checkAuth에서 자동 리다이렉트됨
    });
});
*/
