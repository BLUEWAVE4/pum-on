fetch("./1month.json")
  .then(res => res.json())
  .then(data => {

    /* =====================
       1. 기간 정보 표시
    ===================== */
    const periodInfo = document.getElementById("periodInfo");

    const exportDate = new Date(data.exportDate);
    const totalDates = data.summary.totalDates;

    periodInfo.innerHTML = `
      <b>데이터 기준일:</b> ${exportDate.toLocaleDateString()}<br>
      <b>집계 기간:</b> 최근 ${totalDates}일<br>
      <b>전체 구조 동물 수:</b> ${data.summary.totalAnimals} 마리
    `;

    /* =====================
       2. 시·도별 카드 생성
    ===================== */
    const container = document.getElementById("regionContainer");

    data.regionSummary.forEach(region => {
      const card = document.createElement("div");
      card.className = "province-card";

      card.innerHTML = `
        <div class="province-header">
          <h2>${region.province}</h2>
          <div>
            동물 수: <b>${region.count}</b> <br>
            도시 수: <b>${region.cityCount}</b>
          </div>
        </div>
      `;

      let tableHTML = `
        <table>
          <thead>
            <tr>
              <th>도시</th>
              <th>동물 수</th>
              <th>보호소 수</th>
              <th>압박도</th>
            </tr>
          </thead>
          <tbody>
      `;

      region.cities.forEach(city => {
        const pressure = (city.count / city.shelterCount).toFixed(1);

        tableHTML += `
          <tr>
            <td>${city.city}</td>
            <td>${city.count}</td>
            <td>${city.shelterCount}</td>
            <td>${pressure}</td>
          </tr>
        `;
      });

      tableHTML += `
          </tbody>
        </table>
      `;

      card.innerHTML += tableHTML;
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error("데이터 로드 실패:", err);
  });
