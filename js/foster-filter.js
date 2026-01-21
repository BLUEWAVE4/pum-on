async function changeFilterArea() {
    const fosterFilter = document.querySelector(".filter-area");

    try {
        fosterFilter.addEventListener("change", (e) => {
            console.log(e.target.value);
        });

    } catch (error) {

    }
}


/*
    // 1. 필터 선택
    // 2. 선택된 필터 결과 값 확인

    3. 선택한 필터 결과 값을 활용하여 조건에 맞는 데이터 불러오기
    4. 데이터 개수 조회 > 데이터 길이에 맞게 페이지 분배
        - 비활성화 페이지는 회색으로 표현
        - 선택중인 페이지는 배경 표시
    5. 
*/