const fetchCheckTotalData = async () => {
  const API_BASE_URL = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2";
  const PATH = "/abandonmentPublic_v2";
  const API_KEY = "35a34e22a23d55be2e0b3c03a3b6cd3ce7fa2391c15cce9467c50353fe26c724";
  const type = "json"; //가져올 타입
  const numOfRows = 1; // 조회량
  const pageNo = 1; //조회페이지

  // 검색기간 : 최근 30일
  function toYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  const createDate = new Date();

  const endde = toYYYYMMDD(createDate);

  const startDate = new Date(createDate);
  startDate.setDate(startDate.getDate() - 30);

  const bgnde = toYYYYMMDD(startDate);
  try {

    // API 객체 불러오기
    const res = await fetch(`${API_BASE_URL}${PATH}?serviceKey=${API_KEY}&_type=${type}&pageNo=${pageNo}&numOfRows=${numOfRows}&bgnde=${bgnde}&endde=${endde}`, {
      method: "GET",
    });
    if (!res.ok) {
      const text = await res.text(); // 에러 응답이 JSON이 아닐 수도 있음
      throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
    }
    const data = await res.json();
    console.log(data);


    return data;
  } catch (err) {
    console.error("fetchRescuedAnimal error:", err);
    throw err;
  }

};

// 페이지 진입 때마다 실행 ??
fetchCheckTotalData();

