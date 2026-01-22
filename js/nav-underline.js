document.addEventListener('DOMContentLoaded', () => {
  const navList = document.querySelector('.main-nav .nav-list');
  if (!navList) return;

  // 언더라인 요소 생성
  const underline = document.createElement('span');
  underline.classList.add('nav-underline');
  navList.appendChild(underline);

  const navLinks = navList.querySelectorAll('a');
  const activeLink = navList.querySelector('a.active');

  // 언더라인 위치 업데이트 함수
  function moveUnderline(target) {
    if (!target) {
      underline.style.width = '0';
      return;
    }
    const linkRect = target.getBoundingClientRect();
    const navRect = navList.getBoundingClientRect();

    underline.style.left = `${linkRect.left - navRect.left}px`;
    underline.style.width = `${linkRect.width}px`;
  }

  // 초기 위치 설정 (active 링크)
  if (activeLink) {
    moveUnderline(activeLink);
  }

  // 호버 이벤트
  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      moveUnderline(link);
    });
  });

  // 마우스가 nav-list를 벗어나면 active로 복귀
  navList.addEventListener('mouseleave', () => {
    moveUnderline(activeLink);
  });
});
