import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

  const firebaseConfig = {
    apiKey: "AIzaSyBz2_0o5dQL-_Ekv1g8QGk7vSFdQlGbnUg",
    authDomain: "fir-est-bluewave4.firebaseapp.com",
    databaseURL: "https://fir-est-bluewave4-default-rtdb.firebaseio.com",
    projectId: "fir-est-bluewave4",
    storageBucket: "fir-est-bluewave4.firebasestorage.app",
    messagingSenderId: "525249715044",
    appId: "1:525249715044:web:2278859efed659d6a7f871",
    measurementId: "G-DG14HX8YHL"
  };

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);


