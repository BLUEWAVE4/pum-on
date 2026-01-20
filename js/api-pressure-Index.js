// 실습 목표
// - fetch or axios를 사용해서 TMDB 영화 데이터를 가져온다.
// - select에 따라 각기 다른 주소에 영화 데이터를 가져온다.
// - 최종적으로 가져온 영화 데이터를 반복문을 사용해서 innerHTML 에 추가한다.

// const category = document.getElementById("category");
// const movieList = document.getElementById("movieList");

// headers : 서버에 보내는 요청의 추가 정보(요청의 성격을 함께 알려줄 때 사용)
// 1). Authorization(인증 정보 전달) : `Bearer ${ACCESS_TOKEN}`;
// 2). Accept(서버에서 받을 데이터 형식) : application/json 이 기본값;
// 3). Content-Type(서버로 보내는 데이터 형식) : application/json 등의 형식이 존재
// 4). User_Agent(요청을 보낸 클라이언트의 정보를 담고 있다.) : 브라우저에 요청할 경우, 자동 생성

const fetchRescuedAnimal = async () => {
  const API_BASE_URL = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2";
  const PATH = "/abandonmentPublic_v2";
  const API_KEY = "35a34e22a23d55be2e0b3c03a3b6cd3ce7fa2391c15cce9467c50353fe26c724";
  const type = "json"; //가져올 타입
  const pageNo = 1; //조회페이지
  const numOfRows = 1000; // 조회량

  try {
    // 실습 : category 셀렉트의 선택된 option에 따라 endpoint 변수가 변경되도록 할 것

    const res = await fetch(`${API_BASE_URL}${PATH}?serviceKey=${API_KEY}&_type=${type}&pageNo=${pageNo}&numOfRows=${numOfRows}`, {
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


fetchRescuedAnimal();

// 카테고리 셀렉트 변경 시 새로 영화 정보 받아오는 이벤트
// category.addEventListener("change", fetchMovieData);