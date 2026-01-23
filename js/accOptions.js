// 드롭다운 기능
const trigger = document.getElementById("accTrigger");
const menu = document.getElementById("accOptions");

let isOpen = false;

trigger.addEventListener("click", (e) => {
  e.stopPropagation();

  if (!isOpen) {
    menu.style.display = "flex";

    // 👇 forces initial render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add("open");
      });
    });

    isOpen = true;
  } else {
    closeMenu();
  }
});

document.addEventListener("click", closeMenu);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

function closeMenu() {
  if (!isOpen) return;

  menu.classList.remove("open");

  setTimeout(() => {
    menu.style.display = "none";
  }, 250);

  isOpen = false;
}
