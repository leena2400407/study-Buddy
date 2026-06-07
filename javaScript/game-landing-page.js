function goToGame(url) {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.35s ease";

  setTimeout(() => {
    window.location.href = url;
  }, 350);
}

const bgContainer = document.getElementById("bg-container");

const colors = [
  ["#8fb4ff", "#7de3ff"],
  ["#8ff0c0", "#7de3ff"],
  ["#ffe08a", "#ffbd8a"],
  ["#ff9ac8", "#c9a5ff"],
  ["#c9a5ff", "#8fb4ff"]
];

function randomGradient() {
  const pair = colors[Math.floor(Math.random() * colors.length)];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

function randomTextColor() {
  const flatColors = [
    "#8fb4ff",
    "#7de3ff",
    "#8ff0c0",
    "#ffe08a",
    "#ff9ac8",
    "#c9a5ff",
    "#ffbd8a"
  ];

  return flatColors[Math.floor(Math.random() * flatColors.length)];
}

function addSquare(parent) {
  const square = document.createElement("span");
  square.className = "square-part";
  square.style.background = randomGradient();
  parent.appendChild(square);
  return square;
}

function makeBlockShape(item) {
  item.classList.add("floating-block");

  const shapes = ["shape-l", "shape-t", "shape-z", "shape-square", "shape-line"];
  const chosen = shapes[Math.floor(Math.random() * shapes.length)];

  item.classList.add(chosen);

  if (chosen === "shape-l") {
    for (let i = 0; i < 6; i++) {
      const sq = addSquare(item);
      if (i === 1 || i === 3) sq.style.opacity = "0";
    }
  }

  if (chosen === "shape-t") {
    for (let i = 0; i < 6; i++) {
      const sq = addSquare(item);
      if (i === 3 || i === 5) sq.style.opacity = "0";
    }
  }

  if (chosen === "shape-z") {
    for (let i = 0; i < 6; i++) {
      const sq = addSquare(item);
      if (i === 2 || i === 3) sq.style.opacity = "0";
    }
  }

  if (chosen === "shape-square") {
    for (let i = 0; i < 4; i++) {
      addSquare(item);
    }
  }

  if (chosen === "shape-line") {
    for (let i = 0; i < 4; i++) {
      addSquare(item);
    }
  }
}

function makeLetter(item) {
  item.classList.add("floating-letter");

  const letters = [
    "A", "B", "C", "D", "E", "F", "G",
    "H", "I", "J", "K", "L", "M", "N",
    "O", "P", "Q", "R", "S", "T", "U",
    "V", "W", "X", "Y", "Z"
  ];

  item.textContent = letters[Math.floor(Math.random() * letters.length)];
  item.style.color = randomTextColor();
  item.style.fontSize = `${Math.random() * 26 + 32}px`;
}

function createFloatingItem() {
  const item = document.createElement("div");
  item.className = "floating-item";

  const direction = Math.random() > 0.5 ? "up" : "down";
  item.classList.add(direction);

  const isLetter = Math.random() > 0.45;

  if (isLetter) {
    makeLetter(item);
  } else {
    makeBlockShape(item);
  }

  item.style.left = `${Math.random() * 100}%`;
  item.style.animationDuration = `${Math.random() * 10 + 14}s`;

  bgContainer.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 26000);
}

for (let i = 0; i < 14; i++) {
  setTimeout(createFloatingItem, i * 220);
}

setInterval(createFloatingItem, 650);