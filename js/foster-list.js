document.addEventListener('DOMContentLoaded', () => {
    const fosterLists = document.querySelectorAll('.foster-list');

    fosterLists.forEach(list => {
        list.addEventListener('click', (e) => {
            // 서류 아이콘 클릭 시 확장 토글 방지
            if (e.target.closest('.list-document')) {
                return;
            }

            // 다른 열린 항목 닫기
            fosterLists.forEach(item => {
                if (item !== list && item.classList.contains('expanded')) {
                    item.classList.remove('expanded');
                }
            });

            // 현재 항목 토글
            list.classList.toggle('expanded');
        });
    });
});
