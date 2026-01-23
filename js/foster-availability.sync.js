// foster-availability.sync.js
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/** ===== 설정 ===== */
const TOGGLE_ID = "protectable"; // HTML 체크박스 id
const toggleEl = document.getElementById(TOGGLE_ID);

if (!toggleEl) {
  console.warn(`[foster-availability.sync] #${TOGGLE_ID} 요소를 찾지 못했습니다. HTML id 확인 필요`);
}

/** ===== 내부 상태 ===== */
let currentUid = null;
let isHydratingFromDB = false; // DB -> UI 반영 중 change 저장 방지
let isListenerBound = false;

/** ===== 유틸 ===== */
function setToggleDisabled(disabled, reason) {
  if (!toggleEl) return;
  toggleEl.disabled = disabled;
  if (reason) console.log(`[foster-availability.sync] ${reason}`);
}

/** ===== 메인 ===== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUid = null;
    setToggleDisabled(true, "로그인 상태 아님 (토글 비활성)");
    return;
  }

  currentUid = user.uid;

  // 1) userType 확인
  const userTypeRef = ref(db, `users/${currentUid}/userType`);
  const userTypeSnap = await get(userTypeRef);
  const userType = userTypeSnap.exists() ? userTypeSnap.val() : null;

  if (userType !== "foster") {
    setToggleDisabled(true, `userType=${userType} (foster만 토글 사용 가능)`);
    return;
  }

  setToggleDisabled(false, "foster 사용자 확인 완료 (토글 활성)");
  console.log("[foster-availability.sync] 로그인 foster:", currentUid);

  // 2) DB 경로 (당신 구조 기준)
  const isAvailableRef = ref(db, `users/${currentUid}/fosterInfo/isAvailable`);

  // 2-1) DB -> UI 실시간 동기화
  onValue(isAvailableRef, (snap) => {
    const dbValue = snap.exists() ? !!snap.val() : false;

    if (!toggleEl) return;
    isHydratingFromDB = true;
    toggleEl.checked = dbValue;
    isHydratingFromDB = false;

    console.log("[foster-availability.sync] DB → UI isAvailable:", dbValue);
  });

  // 2-2) UI -> DB 저장 (한 번만 바인딩)
  if (toggleEl && !isListenerBound) {
    toggleEl.addEventListener("change", async () => {
      if (!currentUid) return;
      if (isHydratingFromDB) return; // DB 주입으로 발생한 change 무시

      const nextValue = !!toggleEl.checked;

      try {
        await set(isAvailableRef, nextValue);
        console.log("[foster-availability.sync] UI → DB 저장 isAvailable:", nextValue);
      } catch (err) {
        console.error("[foster-availability.sync] 저장 실패:", err);
        // 실패 시 UI 롤백
        toggleEl.checked = !nextValue;
      }
    });

    isListenerBound = true;
  }
});
