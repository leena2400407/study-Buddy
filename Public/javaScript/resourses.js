let isFlipping = false;

function switchTab(categoryId, clickedTab) {
  if (isFlipping) return;

  if (!clickedTab || clickedTab.classList.contains("active")) return;

  isFlipping = true;

  const sheet = document.querySelector(".flip-sheet");
  const frontFace = document.querySelector(".page-face.front");
  const backFace = document.querySelector(".page-face.back");
  const mainContainer = document.querySelector(".main-content-container");
  const currentActiveContent = document.querySelector(".content-set.active");

  frontFace.innerHTML = currentActiveContent.innerHTML;
  backFace.innerHTML = "";

  sheet.style.display = "block";
  sheet.classList.remove("turn-page-realistic");

  void sheet.offsetWidth;

  sheet.classList.add("turn-page-realistic");

  setTimeout(() => {
    mainContainer.classList.add("is-switching");
  }, 120);

  setTimeout(() => {
    document.querySelectorAll(".content-set").forEach(el => {
      el.classList.remove("active");
    });

    document.querySelectorAll(".tab").forEach(el => {
      el.classList.remove("active");
    });

    document.getElementById(categoryId).classList.add("active");
    clickedTab.classList.add("active");
  }, 570);

  setTimeout(() => {
    mainContainer.classList.remove("is-switching");
  }, 760);

  setTimeout(() => {
    sheet.style.display = "none";
    sheet.classList.remove("turn-page-realistic");

    frontFace.innerHTML = "";
    backFace.innerHTML = "";

    isFlipping = false;
  }, 1150);
}