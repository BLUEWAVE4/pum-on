import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1차 프로젝트 - 다운로드 무료 사용량초과
// const firebaseConfig = {
//     apiKey: "AIzaSyAd8SAQ0KtmsTPr9Fgw7-NxRtZNYt6O0q4",
//     authDomain: "pum-on.firebaseapp.com",
//     databaseURL: "https://pum-on-default-rtdb.firebaseio.com",
//     projectId: "pum-on",
//     storageBucket: "pum-on.firebasestorage.app",
//     messagingSenderId: "530653242737",
//     appId: "1:530653242737:web:b18a4ab43132aed1ab42d0",
//     measurementId: "G-4PC46EPXM2"
// };

// 테스트용
  const firebaseConfig = {
    apiKey: "AIzaSyBYubKMtseufjT4BOk3aH-bijPYFSFksoE",
    authDomain: "pum-test-c35aa.firebaseapp.com",
    databaseURL: "https://pum-test-c35aa-default-rtdb.firebaseio.com",
    projectId: "pum-test-c35aa",
    storageBucket: "pum-test-c35aa.firebasestorage.app",
    messagingSenderId: "48024279167",
    appId: "1:48024279167:web:d295c3c611c4c22db3874a",
    measurementId: "G-B3Q6BYJW7K"
  };

  //  실제 프로젝트용
  //   const firebaseConfig = {
  //   apiKey: "AIzaSyAt--9h09hNdT2TWbggtLDUdAtFPAmy7zs",
  //   authDomain: "pum--on.firebaseapp.com",
  //   databaseURL: "https://pum--on-default-rtdb.firebaseio.com",
  //   projectId: "pum--on",
  //   storageBucket: "pum--on.firebasestorage.app",
  //   messagingSenderId: "248020913979",
  //   appId: "1:248020913979:web:83057bd1d0784f3f62b11e",
  //   measurementId: "G-25ZZ8NW2C5"
  // };

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);


