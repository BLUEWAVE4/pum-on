// auth.session.sync.js
import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/** ===== 설정 ===== */
const LOGOUT_BTN_ID = "logoutBtn";

// 프로젝트 구조에 맞춰 경로 선택
// 1) pages 내부에서 실행되는 경우(권장): 상대경로
const LOGIN_PAGE_PATH = "../pages/login.html"; 
// 2) 서버 루트가 프로젝트 루트로 고정된 경우: 절대경로
// const LOGIN_PAGE_PATH = "/pages/login.html";

/** ===== DOM ===== */
const logoutBtn = document.getElementById(LOGOUT_BTN_ID);

/** ===== 로그인 상태 확인(실시간) ===== */
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("[auth.session] 로그인:", user.uid, user.email);
    console.log("[auth.session] displayName:", user.displayName);
    // 여기서 UI 변경(로그인 버튼 → 마이페이지 등) 연결 가능
  } else {
    console.log("[auth.session] 로그인 사용자 없음");
    // 보호 페이지면 리다이렉트 (원할 때만 주석 해제)
    // window.location.href = LOGIN_PAGE_PATH;
  }
});

/** ===== 로그아웃 ===== */
export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("[auth.session] 로그아웃 완료");
    window.location.href = LOGIN_PAGE_PATH;
  } catch (error) {
    console.error("[auth.session] 로그아웃 실패:", error);
  }
}

/** ===== 버튼 연결 ===== */
logoutBtn?.addEventListener("click", logoutUser);


/** DOM */
const accGuest = document.getElementById("accGuest");
const accUser = document.getElementById("accUser");
const accName = document.getElementById("accName");
const accRole = document.getElementById("accRole");

/** 로그인 상태에 따라 헤더 UI 전환 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 로그인 상태
    accGuest.style.display = "none";
    accUser.style.display = "flex";

    accName.textContent = user.displayName || "사용자";

    // role은 추후 RTDB에서 가져와서 세팅
    // 예: foster / shelter / admin
    accRole.textContent = "임시 보호자";

  } else {
    // 비로그인 상태
    accUser.style.display = "none";
    accGuest.style.display = "flex";
  }
});

