let isFlipping = false;

function getTabId(tab) {
  return tab.dataset.tabId;
}

function getContentId(tab) {
  return tab.dataset.contentId;
}

function getBookmarkTop(tabElement) {
  const tabsContainer = document.querySelector(".tabs-container");

  if (!tabsContainer || !tabElement) {
    return 50;
  }

  return tabsContainer.offsetTop + tabElement.offsetTop;
}

function createLeftPageBookmark(tabElement) {
  const holder = document.getElementById("leftPageBookmarkHolder");

  if (!holder || !tabElement) return;

  const tabId = getTabId(tabElement);

  const alreadyThere = holder.querySelector(`[data-tab-id="${tabId}"]`);
  if (alreadyThere) return;

  const leftBookmark = document.createElement("div");
  leftBookmark.className = "page-bookmark-left";
  leftBookmark.dataset.tabId = tabId;
  leftBookmark.dataset.contentId = getContentId(tabElement);

  leftBookmark.innerHTML = `<span>${tabElement.textContent.trim()}</span>`;
  leftBookmark.style.background = getComputedStyle(tabElement).backgroundColor;
  leftBookmark.style.top = getBookmarkTop(tabElement) + "px";

  leftBookmark.onclick = function () {
    if (isFlipping) return;
    returnBookmarkWithPage(tabElement, leftBookmark);
  };

  holder.appendChild(leftBookmark);

  tabElement.classList.add("is-moving");
  tabElement.classList.add("flipped-bookmark");
}

function removeLeftBookmark(tabElement) {
  if (!tabElement) return;

  const tabId = getTabId(tabElement);
  const bookmark = document.querySelector(`#leftPageBookmarkHolder [data-tab-id="${tabId}"]`);

  if (bookmark) {
    bookmark.remove();
  }

  tabElement.classList.remove("is-moving");
  tabElement.classList.remove("flipped-bookmark");
}

function handleBookmark(tabElement) {
  if (isFlipping || !tabElement) return;

  const tabId = getTabId(tabElement);
  const leftBookmark = document.querySelector(`#leftPageBookmarkHolder [data-tab-id="${tabId}"]`);

  if (leftBookmark) {
    returnBookmarkWithPage(tabElement, leftBookmark);
    return;
  }

  if (tabElement.classList.contains("active")) {
    flipBookmarkToLeft(tabElement);
    return;
  }

  switchTab(tabElement);
}

function makeMovingBookmark(tabElement, side) {
  const movingBookmark = document.createElement("div");

  movingBookmark.className = side === "left"
    ? "moving-bookmark moving-bookmark-left"
    : "moving-bookmark moving-bookmark-right";

  movingBookmark.innerHTML = `<span>${tabElement.textContent.trim()}</span>`;
  movingBookmark.style.background = getComputedStyle(tabElement).backgroundColor;
  movingBookmark.style.top = getBookmarkTop(tabElement) + "px";

  return movingBookmark;
}

function prepareFlipFaces() {
  const frontFace = document.querySelector(".page-face.front");
  const backFace = document.querySelector(".page-face.back");
  const currentActiveContent = document.querySelector(".content-set.active");

  if (!frontFace || !backFace) {
    return null;
  }

  frontFace.innerHTML = currentActiveContent ? currentActiveContent.innerHTML : "";
  backFace.innerHTML = "";

  return { frontFace, backFace };
}

function playForwardFlip() {
  const sheet = document.querySelector(".flip-sheet");

  if (!sheet) return;

  sheet.style.display = "block";
  sheet.classList.remove("turn-page-realistic");
  sheet.classList.remove("turn-page-back-realistic");

  void sheet.offsetWidth;

  sheet.classList.add("turn-page-realistic");
}

function playBackFlip() {
  const sheet = document.querySelector(".flip-sheet");

  if (!sheet) return;

  sheet.style.display = "block";
  sheet.classList.remove("turn-page-realistic");
  sheet.classList.remove("turn-page-back-realistic");

  void sheet.offsetWidth;

  sheet.classList.add("turn-page-back-realistic");
}

function cleanFlip() {
  const sheet = document.querySelector(".flip-sheet");
  const frontFace = document.querySelector(".page-face.front");
  const backFace = document.querySelector(".page-face.back");

  if (sheet) {
    sheet.style.display = "none";
    sheet.classList.remove("turn-page-realistic");
    sheet.classList.remove("turn-page-back-realistic");
  }

  if (frontFace) frontFace.innerHTML = "";
  if (backFace) backFace.innerHTML = "";
}

function flipBookmarkToLeft(tabElement) {
  if (isFlipping) return;

  isFlipping = true;

  const faces = prepareFlipFaces();

  if (!faces) {
    isFlipping = false;
    return;
  }

  const movingBookmark = makeMovingBookmark(tabElement, "right");

  faces.frontFace.appendChild(movingBookmark);
  tabElement.classList.add("is-moving");

  playForwardFlip();

  setTimeout(() => {
    createLeftPageBookmark(tabElement);
  }, 420);

  setTimeout(() => {
    cleanFlip();
    isFlipping = false;
  }, 600);
}

function returnBookmarkWithPage(tabElement, leftBookmark) {
  if (isFlipping) return;

  isFlipping = true;

  const faces = prepareFlipFaces();

  if (!faces) {
    isFlipping = false;
    return;
  }

  const movingBookmark = makeMovingBookmark(tabElement, "left");
  faces.backFace.appendChild(movingBookmark);

  if (leftBookmark) {
    leftBookmark.style.opacity = "0";
  }

  playBackFlip();

  setTimeout(() => {
    removeLeftBookmark(tabElement);
  }, 420);

  setTimeout(() => {
    cleanFlip();
    isFlipping = false;
  }, 600);
}

function switchTab(tabElement) {
  if (isFlipping || !tabElement) return;

  const contentId = getContentId(tabElement);
  const targetContent = document.getElementById(contentId);
  const oldTab = document.querySelector(".tab.active");
  const mainContainer = document.querySelector(".main-content-container");

  if (!targetContent) {
    console.log("Target content not found:", contentId);
    return;
  }

  if (targetContent.classList.contains("active")) {
    return;
  }

  isFlipping = true;

  const faces = prepareFlipFaces();

  if (!faces) {
    switchContent(targetContent, tabElement);
    isFlipping = false;
    return;
  }

  if (oldTab) {
    const movingBookmark = makeMovingBookmark(oldTab, "right");
    faces.frontFace.appendChild(movingBookmark);
    oldTab.classList.add("is-moving");
  }

  playForwardFlip();

  setTimeout(() => {
    if (mainContainer) {
      mainContainer.classList.add("is-switching");
    }
  }, 60);

  setTimeout(() => {
    switchContent(targetContent, tabElement);
  }, 280);

  setTimeout(() => {
    if (mainContainer) {
      mainContainer.classList.remove("is-switching");
    }
  }, 390);

  setTimeout(() => {
    cleanFlip();

    document.querySelectorAll(".tab").forEach(tab => {
      const tabId = getTabId(tab);
      const existsLeft = document.querySelector(`#leftPageBookmarkHolder [data-tab-id="${tabId}"]`);

      if (!existsLeft) {
        tab.classList.remove("is-moving");
        tab.classList.remove("flipped-bookmark");
      }
    });

    createLeftPageBookmark(tabElement);

    isFlipping = false;
  }, 600);
}

function switchContent(targetContent, tabElement) {
  document.querySelectorAll(".content-set").forEach(content => {
    content.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });

  targetContent.classList.add("active");
  tabElement.classList.add("active");
}