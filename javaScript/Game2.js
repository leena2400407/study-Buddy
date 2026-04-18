function createFloatingLetters() {
            const container = document.getElementById("floating-letters");
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const numLetters = 25; 

            for (let i = 0; i < numLetters; i++) {
                const letter = document.createElement("div");
                letter.classList.add("floating-letter");
                letter.textContent = alphabet[Math.floor(Math.random() * alphabet.length)];
                
                letter.style.left = `${Math.random() * 100}vw`;
                letter.style.animationDuration = `${12 + Math.random() * 20}s`;
                letter.style.animationDelay = `${Math.random() * 10}s`;
                letter.style.fontSize = `${2 + Math.random() * 6}rem`;
                
                container.appendChild(letter);
            }
        }
        createFloatingLetters();

        const WORDS = ["DONUT", "STEAK", "APPLE", "HOUSE", "TRAIN", "PLANT", "WATER", "LIGHT", "CHAIR", "TABLE", "BRAIN", "SMART", "SUPER", "HAPPY", "WORLD", "SMILE", "NIGHT", "DREAM", "SPACE", "GALAXY"];
        let targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        let currentRow = 0;
        let currentTile = 0;
        let isGameOver = false;

        const board = document.getElementById("board");
        const keyboard = document.getElementById("keyboard");
        const messageBox = document.getElementById("message");
        
        const resultModal = document.getElementById("result-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalWord = document.getElementById("modal-word");
        const playAgainBtn = document.getElementById("play-again-btn");

        playAgainBtn.addEventListener("click", resetGame);

        const keys = [
            ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
            ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
            ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
        ];

        function initBoard() {
            board.innerHTML = ""; 
            for (let r = 0; r < 6; r++) {
                const row = document.createElement("div");
                row.classList.add("row");
                for (let c = 0; c < 5; c++) {
                    const tile = document.createElement("div");
                    tile.classList.add("tile");
                    tile.setAttribute("id", `tile-${r}-${c}`);
                    row.appendChild(tile);
                }
                board.appendChild(row);
            }
        }

        function initKeyboard() {
            keyboard.innerHTML = ""; 
            keys.forEach(row => {
                const rowDiv = document.createElement("div");
                rowDiv.classList.add("key-row");
                row.forEach(key => {
                    const button = document.createElement("button");
                    button.textContent = key;
                    button.classList.add("key");
                    button.setAttribute("id", `key-${key}`);
                    if (key === "ENTER" || key === "⌫") {
                        button.classList.add("large");
                    }
                    button.addEventListener("click", () => handleInput(key));
                    rowDiv.appendChild(button);
                });
                keyboard.appendChild(rowDiv);
            });
        }

        function handleInput(key) {
            if (isGameOver) return;
            if (key === "⌫" || key === "Backspace") {
                deleteLetter();
            } else if (key === "ENTER" || key === "Enter") {
                submitGuess(); 
            } else if (/^[A-Z]$/.test(key)) {
                addLetter(key);
            }
        }

        function addLetter(letter) {
            if (currentTile < 5) {
                const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
                tile.textContent = letter;
                tile.classList.add("active");
                currentTile++;
            }
        }

        function deleteLetter() {
            if (currentTile > 0) {
                currentTile--;
                const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
                tile.textContent = "";
                tile.classList.remove("active");
            }
        }

        function shakeRow() {
            const rowDiv = board.children[currentRow];
            rowDiv.classList.add("shake");
            setTimeout(() => rowDiv.classList.remove("shake"), 500);
        }

        async function submitGuess() {
            if (currentTile !== 5) {
                showMessage("Not enough letters");
                shakeRow();
                return;
            }

            let guess = "";
            for (let i = 0; i < 5; i++) {
                guess += document.getElementById(`tile-${currentRow}-${i}`).textContent;
            }

            if (!WORDS.includes(guess)) {
                try {
                    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${guess}`);
                    if (!response.ok) {
                        showMessage("Not in word list");
                        shakeRow();
                        return; 
                    }
                } catch (error) {
                    console.log("Network error, skipping validation");
                }
            }

            checkGuess(guess);
        }

        function checkGuess(guess) {
            let targetLetterCount = {};
            let tileColors = ["absent", "absent", "absent", "absent", "absent"];

            for (let i = 0; i < 5; i++) {
                targetLetterCount[targetWord[i]] = (targetLetterCount[targetWord[i]] || 0) + 1;
            }

            for (let i = 0; i < 5; i++) {
                if (guess[i] === targetWord[i]) {
                    tileColors[i] = "correct";
                    targetLetterCount[guess[i]] -= 1;
                }
            }

            for (let i = 0; i < 5; i++) {
                if (guess[i] !== targetWord[i] && targetLetterCount[guess[i]] > 0) {
                    tileColors[i] = "present";
                    targetLetterCount[guess[i]] -= 1;
                }
            }

            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const tile = document.getElementById(`tile-${currentRow}-${i}`);
                    tile.classList.add("flip");
                    tile.classList.add(tileColors[i]);
                    updateKeyboard(guess[i], tileColors[i]);
                }, i * 250); 
            }

            setTimeout(() => {
                if (guess === targetWord) {
                    showResultModal("You Win! 🎉", targetWord, true);
                    isGameOver = true;
                } else if (currentRow === 5) {
                    showResultModal("Game Over! 😢", targetWord, false);
                    isGameOver = true;
                } else {
                    currentRow++;
                    currentTile = 0;
                }
            }, 1500);
        }

        function updateKeyboard(letter, colorClass) {
            const keyBtn = document.getElementById(`key-${letter}`);
            if (!keyBtn) return;
            
            if (keyBtn.classList.contains("correct")) return;
            if (keyBtn.classList.contains("present") && colorClass === "absent") return;

            keyBtn.classList.remove("absent", "present", "correct");
            keyBtn.classList.add(colorClass);
        }

        function showMessage(msg) {
            messageBox.textContent = msg;
            messageBox.style.display = "block";
            setTimeout(() => {
                if(!isGameOver) messageBox.style.display = "none";
            }, 2000);
        }

        function showResultModal(title, word, isWin) {
            modalTitle.textContent = title;
            modalTitle.style.color = isWin ? "var(--correct)" : "var(--filled-border)";
            modalWord.textContent = word;
            resultModal.style.display = "flex";
        }

        function resetGame() {
            resultModal.style.display = "none";
            messageBox.style.display = "none";
            
            currentRow = 0;
            currentTile = 0;
            isGameOver = false;
            targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];

            initBoard();
            initKeyboard();
        }

          document.addEventListener("keydown", (e) => {

            handleInput(e.key.toUpperCase());
        });



        initBoard();
        initKeyboard();
