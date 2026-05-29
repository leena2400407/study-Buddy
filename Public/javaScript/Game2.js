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

        const WORDS = [
            "ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN","AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIEN","ALIGN","ALIKE","ALIVE","ALLOW","ALONE","ALONG","ALTER","AMONG","ANGER","ANGLE","ANGRY","APART","APPLY","ARENA","ARGUE","ARISE","ARRAY","ASIDE","ASSET","AUDIO","AUDIT","AVOID","AWARD","AWARE",
            "BADLY","BAKER","BASES","BASIC","BEACH","BEGAN","BEGIN","BEING","BELOW","BENCH","BILLY","BIRTH","BLACK","BLAME","BLIND","BLOCK","BLOOD","BOARD","BOOST","BOOTH","BOUND","BRAND","BREAD","BREAK","BREED","BRIEF","BRING","BROAD","BROKE","BROWN","BUILD","BUILT","BUYER",
            "CABLE","CALIF","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHART","CHASE","CHEAP","CHECK","CHEST","CHIEF","CHILD","CHINA","CHOSE","CIVIL","CLAIM","CLASS","CLEAN","CLEAR","CLICK","CLOCK","CLOSE","COACH","COAST","COULD","COUNT","COURT","COVER","CRAFT","CRASH","CREAM","CRIME","CROSS","CROWD","CROWN","CURVE",
            "DAILY","DANCE","DATED","DEALT","DEATH","DEBUT","DELAY","DEPTH","DOING","DOUBT","DOZEN","DRAFT","DRAMA","DRAWN","DRESS","DRILL","DRINK","DRIVE","DROVE","DYING",
            "EAGER","EARLY","EARTH","EIGHT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","ENTRY","EQUAL","ERROR","EVENT","EVERY","EXACT","EXIST","EXTRA",
            "FAITH","FALSE","FAULT","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLASH","FLEET","FLOOR","FLUID","FOCUS","FORCE","FORTH","FORTY","FORUM","FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FRUIT","FULLY","FUNNY",
            "GIANT","GIVEN","GLASS","GLOBE","GOING","GRACE","GRADE","GRAND","GRANT","GRASS","GREAT","GREEN","GROSS","GROUP","GROWN","GUARD","GUESS","GUEST","GUIDE",
            "HAPPY","HARRY","HEART","HEAVY","HENCE","HENRY","HORSE","HOTEL","HOUSE","HUMAN",
            "IDEAL","IMAGE","INDEX","INNER","INPUT","ISSUE",
            "JAPAN","JIMMY","JOINT","JONES","JUDGE",
            "KNOWN",
            "LABEL","LARGE","LASER","LATER","LAUGH","LAYER","LEARN","LEASE","LEAST","LEAVE","LEGAL","LEVEL","LEWIS","LIGHT","LIMIT","LINKS","LIVES","LOCAL","LOGIC","LOOSE","LOWER","LUCKY","LUNCH",
            "MAGIC","MAJOR","MAKER","MARCH","MARIA","MATCH","MAYBE","MAYOR","MEANT","MEDIA","METAL","MIGHT","MINOR","MINUS","MIXED","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH","MOVIE","MUSIC",
            "NEEDS","NEVER","NEWLY","NIGHT","NOISE","NORTH","NOTED","NOVEL","NURSE",
            "OCCUR","OCEAN","OFFER","OFTEN","ORDER","OTHER","OUGHT",
            "PAINT","PANEL","PAPER","PARTY","PEACE","PETER","PHASE","PHONE","PHOTO","PIECE","PILOT","PITCH","PLACE","PLAIN","PLANE","PLANT","PLATE","POINT","POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PRIZE","PROOF","PROUD","PROVE",
            "QUEEN","QUICK","QUIET","QUITE",
            "RADIO","RAISE","RANGE","RAPID","RATIO","REACH","READY","REFER","RIGHT","RIVAL","RIVER","ROBIN","ROGER","ROMAN","ROUGH","ROUND","ROUTE","ROYAL","RURAL",
            "SCALE","SCENE","SCOPE","SCORE","SENSE","SERVE","SEVEN","SHALL","SHAPE","SHARE","SHARP","SHEET","SHELF","SHELL","SHIFT","SHIRT","SHOCK","SHOOT","SHORT","SHOWN","SIGHT","SINCE","SIXTH","SIXTY","SIZED","SKILL","SLEEP","SLIDE","SMALL","SMART","SMILE","SMITH","SMOKE","SOLID","SOLVE","SORRY","SOUND","SOUTH","SPACE","SPARE","SPEAK","SPEED","SPEND","SPENT","SPLIT","SPOKE","SPORT","STAFF","STAGE","STAKE","STAND","START","STATE","STEAM","STEEL","STICK","STILL","STOCK","STONE","STOOD","STORE","STORM","STORY","STRIP","STUCK","STUDY","STYLE","SUGAR","SUITE","SUPER","SWEET",
            "TABLE","TAKEN","TASTE","TAXES","TEACH","TEETH","TERRY","TEXAS","THANK","THEFT","THEIR","THEME","THERE","THESE","THICK","THING","THINK","THIRD","THOSE","THREE","THREW","THROW","TIGHT","TIMES","TIRED","TITLE","TODAY","TOPIC","TOTAL","TOUCH","TOUGH","TOWER","TRACK","TRADE","TRAIN","TREAT","TREND","TRIAL","TRIED","TRIES","TRUCK","TRULY","TRUST","TRUTH","TWICE",
            "UNDER","UNDUE","UNION","UNITY","UNTIL","UPPER","UPSET","URBAN","USAGE","USUAL",
            "VALID","VALUE","VIDEO","VIRUS","VISIT","VITAL","VOICE",
            "WASTE","WATCH","WATER","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WOMAN","WOMEN","WORLD","WORRY","WORSE","WORTH","WOULD","WRITE","WRONG","WROTE",
            "YIELD","YOUNG","YOUTH"
        ];

        // Offline valid guess list. Add more 5-letter words here if you want a bigger dictionary.
        const VALID_GUESSES = new Set([
            "ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN","AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIEN","ALIGN","ALIKE","ALIVE","ALLOW","ALONE","ALONG","ALTER","AMONG","ANGER","ANGLE","ANGRY","APART","APPLY","ARENA","ARGUE","ARISE","ARRAY","ASIDE","ASSET","AUDIO","AUDIT","AVOID","AWARD","AWARE",
            "BADLY","BAKER","BASES","BASIC","BEACH","BEGAN","BEGIN","BEING","BELOW","BENCH","BILLY","BIRTH","BLACK","BLAME","BLIND","BLOCK","BLOOD","BOARD","BOOST","BOOTH","BOUND","BRAND","BREAD","BREAK","BREED","BRIEF","BRING","BROAD","BROKE","BROWN","BUILD","BUILT","BUYER",
            "CABLE","CALIF","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHART","CHASE","CHEAP","CHECK","CHEST","CHIEF","CHILD","CHINA","CHOSE","CIVIL","CLAIM","CLASS","CLEAN","CLEAR","CLICK","CLOCK","CLOSE","COACH","COAST","COULD","COUNT","COURT","COVER","CRAFT","CRASH","CREAM","CRIME","CROSS","CROWD","CROWN","CURVE",
            "DAILY","DANCE","DATED","DEALT","DEATH","DEBUT","DELAY","DEPTH","DOING","DOUBT","DOZEN","DRAFT","DRAMA","DRAWN","DRESS","DRILL","DRINK","DRIVE","DROVE","DYING",
            "EAGER","EARLY","EARTH","EIGHT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","ENTRY","EQUAL","ERROR","EVENT","EVERY","EXACT","EXIST","EXTRA",
            "FAITH","FALSE","FAULT","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLASH","FLEET","FLOOR","FLUID","FOCUS","FORCE","FORTH","FORTY","FORUM","FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FRUIT","FULLY","FUNNY",
            "GIANT","GIVEN","GLASS","GLOBE","GOING","GRACE","GRADE","GRAND","GRANT","GRASS","GREAT","GREEN","GROSS","GROUP","GROWN","GUARD","GUESS","GUEST","GUIDE",
            "HAPPY","HARRY","HEART","HEAVY","HENCE","HENRY","HORSE","HOTEL","HOUSE","HUMAN",
            "IDEAL","IMAGE","INDEX","INNER","INPUT","ISSUE",
            "JAPAN","JIMMY","JOINT","JONES","JUDGE",
            "KNOWN",
            "LABEL","LARGE","LASER","LATER","LAUGH","LAYER","LEARN","LEASE","LEAST","LEAVE","LEGAL","LEVEL","LEWIS","LIGHT","LIMIT","LINKS","LIVES","LOCAL","LOGIC","LOOSE","LOWER","LUCKY","LUNCH",
            "MAGIC","MAJOR","MAKER","MARCH","MARIA","MATCH","MAYBE","MAYOR","MEANT","MEDIA","METAL","MIGHT","MINOR","MINUS","MIXED","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH","MOVIE","MUSIC",
            "NEEDS","NEVER","NEWLY","NIGHT","NOISE","NORTH","NOTED","NOVEL","NURSE",
            "OCCUR","OCEAN","OFFER","OFTEN","ORDER","OTHER","OUGHT",
            "PAINT","PANEL","PAPER","PARTY","PEACE","PETER","PHASE","PHONE","PHOTO","PIECE","PILOT","PITCH","PLACE","PLAIN","PLANE","PLANT","PLATE","POINT","POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PRIZE","PROOF","PROUD","PROVE",
            "QUEEN","QUICK","QUIET","QUITE",
            "RADIO","RAISE","RANGE","RAPID","RATIO","REACH","READY","REFER","RIGHT","RIVAL","RIVER","ROBIN","ROGER","ROMAN","ROUGH","ROUND","ROUTE","ROYAL","RURAL",
            "SCALE","SCENE","SCOPE","SCORE","SENSE","SERVE","SEVEN","SHALL","SHAPE","SHARE","SHARP","SHEET","SHELF","SHELL","SHIFT","SHIRT","SHOCK","SHOOT","SHORT","SHOWN","SIGHT","SINCE","SIXTH","SIXTY","SIZED","SKILL","SLEEP","SLIDE","SMALL","SMART","SMILE","SMITH","SMOKE","SOLID","SOLVE","SORRY","SOUND","SOUTH","SPACE","SPARE","SPEAK","SPEED","SPEND","SPENT","SPLIT","SPOKE","SPORT","STAFF","STAGE","STAKE","STAND","START","STATE","STEAM","STEEL","STICK","STILL","STOCK","STONE","STOOD","STORE","STORM","STORY","STRIP","STUCK","STUDY","STYLE","SUGAR","SUITE","SUPER","SWEET",
            "TABLE","TAKEN","TASTE","TAXES","TEACH","TEETH","TERRY","TEXAS","THANK","THEFT","THEIR","THEME","THERE","THESE","THICK","THING","THINK","THIRD","THOSE","THREE","THREW","THROW","TIGHT","TIMES","TIRED","TITLE","TODAY","TOPIC","TOTAL","TOUCH","TOUGH","TOWER","TRACK","TRADE","TRAIN","TREAT","TREND","TRIAL","TRIED","TRIES","TRUCK","TRULY","TRUST","TRUTH","TWICE",
            "UNDER","UNDUE","UNION","UNITY","UNTIL","UPPER","UPSET","URBAN","USAGE","USUAL",
            "VALID","VALUE","VIDEO","VIRUS","VISIT","VITAL","VOICE",
            "WASTE","WATCH","WATER","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WOMAN","WOMEN","WORLD","WORRY","WORSE","WORTH","WOULD","WRITE","WRONG","WROTE",
            "YIELD","YOUNG","YOUTH"
        ]);
        let targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        let currentRow = 0;
        let currentTile = 0;
        let isGameOver = false;
        let isChecking = false;

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
            if (isGameOver || isChecking) return;

            const normalizedKey = key === "Backspace" ? "⌫" : key.toUpperCase();

            if (normalizedKey === "⌫") {
                deleteLetter();
            } else if (normalizedKey === "ENTER") {
                submitGuess();
            } else if (/^[A-Z]$/.test(normalizedKey)) {
                addLetter(normalizedKey);
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

        function submitGuess() {
            if (isChecking) return;

            if (currentTile !== 5) {
                showMessage("Not enough letters");
                shakeRow();
                return;
            }

            let guess = "";
            for (let i = 0; i < 5; i++) {
                guess += document.getElementById(`tile-${currentRow}-${i}`).textContent;
            }

            // Do not accept random letters. This works offline, including when opened with file://
            if (!VALID_GUESSES.has(guess)) {
                showMessage("Not in word list");
                shakeRow();
                return;
            }

            isChecking = true;
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
                isChecking = false;
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
            isChecking = false;
            targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];

            initBoard();
            initKeyboard();
        }

        document.addEventListener("keydown", (e) => {
            handleInput(e.key);
        });

        initBoard();
        initKeyboard();
