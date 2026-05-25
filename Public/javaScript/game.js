const SIZE = 8;
const SHAPE_CELL = 32;
const API_BASE = '';

let gridMap    = [];
let score      = 0;
let highScore  = 0;
try { highScore = parseInt(localStorage.getItem('bphs_v5')) || 0; } catch(e) { highScore = 0; }
let streak     = 0;
let bestStreak = 0;
let gameActive = false;
let goTimeout  = null;

// Current logged-in player name — fetched from your backend session
let currentPlayerName = 'Player';

// Drag state
let activeShapeDiv = null;
let dragMatrix     = null;
let dragColor      = null;
let cloneEl        = null;
let previewCells   = [];

/* ============================================================
   DOM REFS
============================================================ */
const gridEl            = document.getElementById('grid');
const shapesEl          = document.getElementById('shapes');
const scoreEl           = document.getElementById('score');
const highScoreEl       = document.getElementById('highScoreVal');
const leaderboardListEl = document.getElementById('leaderboardList');
const gameOverScreen    = document.getElementById('gameOverScreen');
const finalScoreEl      = document.getElementById('finalScore');
const finalBestEl       = document.getElementById('finalBest');
const finalTopScoreEl   = document.getElementById('finalTopScore');
const finalTopPlayerEl  = document.getElementById('finalTopPlayer');
const rankTextEl        = document.getElementById('rankText');
const goStreakEl        = document.getElementById('goStreak');
const mainContainer     = document.getElementById('mainContainer');
const screenFlash       = document.getElementById('screenFlash');

highScoreEl.textContent = highScore;

/* ============================================================
   LEADERBOARD — real MongoDB via your API
============================================================ */
let leaderboard = [];

async function fetchCurrentPlayer() {
    try {
        const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        currentPlayerName = data.name || data.username || data.email || 'Player';
    } catch(e) {
        currentPlayerName = 'Player';
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch(`${API_BASE}/leaderboard`);
        if (!res.ok) throw new Error('Failed to load leaderboard');
        leaderboard = await res.json();
        leaderboard.sort((a, b) => b.score - a.score);
    } catch(e) {
        leaderboard = [];
    }

    renderLeaderboard();
}

async function saveScoreToLeaderboard(name, score) {
    try {
        const response = await fetch(`${API_BASE}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                score: Number(score)
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.warn('Score was not saved:', data.message);
        }
    } catch (error) {
        console.warn('Could not save score to server:', error);
    }
}

function renderLeaderboard() {
    leaderboardListEl.innerHTML = '';

    if (leaderboard.length === 0) {
        const li = document.createElement('li');
        li.className = 'lb-item';
        li.style.opacity = '0.5';
        li.style.justifyContent = 'center';
        li.textContent = 'No scores yet — be the first!';
        leaderboardListEl.appendChild(li);
        return;
    }

    leaderboard.slice(0, 8).forEach((entry, i) => {
        const li = document.createElement('li');
        li.className = 'lb-item';

        if (i === 0) li.classList.add('rank-1');
        else if (i === 1) li.classList.add('rank-2');
        else if (i === 2) li.classList.add('rank-3');

        const isYou = entry.name === currentPlayerName;

        if (isYou) li.classList.add('is-you');

        const youTag = isYou ? '<span class="you-tag">YOU</span>' : '';

        li.innerHTML = `
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-name">${entry.name} ${youTag}</span>
            <span class="lb-score">${entry.score.toLocaleString()}</span>
        `;

        leaderboardListEl.appendChild(li);
    });
}

renderLeaderboard();

/* ============================================================
   SHAPE DEFINITIONS
============================================================ */
const blockShapes = [
    { matrix: [[1,1,1,1]],               color: '#ff3366' },
    { matrix: [[1],[1],[1],[1]],          color: '#33ccff' },
    { matrix: [[1,1,1]],                  color: '#ff6600' },
    { matrix: [[1],[1],[1]],              color: '#ff6600' },
    { matrix: [[1,1]],                    color: '#ff99cc' },
    { matrix: [[1],[1]],                  color: '#ff99cc' },
    { matrix: [[1,1,1,1,1]],              color: '#ff0000' },
    { matrix: [[1],[1],[1],[1],[1]],      color: '#ff0000' },
    { matrix: [[1]],                      color: '#ffffff' },
    { matrix: [[1,1],[1,1]],              color: '#ffcc00' },
    { matrix: [[1,1,1],[1,1,1],[1,1,1]], color: '#3366ff' },
    { matrix: [[1,1,1],[0,0,1]],          color: '#9933ff' },
    { matrix: [[1,1,1],[1,0,0]],          color: '#00ff66' },
    { matrix: [[1,0],[1,0],[1,1]],        color: '#9933ff' },
    { matrix: [[0,1],[0,1],[1,1]],        color: '#00ff66' },
    { matrix: [[1,1],[1,0]],              color: '#00cc99' },
    { matrix: [[1,1],[0,1]],              color: '#00cc99' },
    { matrix: [[0,1],[1,1]],              color: '#00cc99' },
    { matrix: [[1,0],[1,1]],              color: '#00cc99' },
    { matrix: [[1,1,1],[0,1,0]],          color: '#cc33ff' },
    { matrix: [[0,1,0],[1,1,1]],          color: '#cc33ff' },
    { matrix: [[1,0],[1,1],[1,0]],        color: '#cc33ff' },
    { matrix: [[0,1],[1,1],[0,1]],        color: '#cc33ff' },
    { matrix: [[0,1,0],[1,1,1],[0,1,0]], color: '#ff3300' }
];

/* ============================================================
   BACKGROUND SHAPES
============================================================ */
function createBackgroundShapes() {
    const bg = document.getElementById('bgShapes');

    if (!bg) return;

    bg.innerHTML = '';

    for (let i = 0; i < 15; i++) {
        const s = blockShapes[Math.floor(Math.random() * blockShapes.length)];
        const li = document.createElement('li');

        li.style.left = `${Math.random() * 85 + 5}%`;
        li.style.animationDelay = `${Math.random() * 20}s`;
        li.style.animationDuration = `${Math.random() * 20 + 25}s`;

        const wrap = document.createElement('div');
        wrap.style.cssText = `
            display: grid;
            gap: 2px;
            grid-template-columns: repeat(${s.matrix[0].length}, 20px);
            transform: scale(${Math.random() * 1.5 + 0.7});
            opacity: 0.1;
        `;

        s.matrix.forEach(row => {
            row.forEach(val => {
                const b = document.createElement('div');
                b.style.cssText = `
                    width: 20px;
                    height: 20px;
                    border-radius: 3px;
                    background: ${val ? s.color : 'transparent'};
                `;

                if (val) b.className = 'bg-shape-cell';

                wrap.appendChild(b);
            });
        });

        li.appendChild(wrap);
        bg.appendChild(li);
    }
}

/* ============================================================
   GRID
============================================================ */
function createGrid() {
    gridEl.innerHTML = '';
    gridMap = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            gridEl.appendChild(cell);
        }
    }
}

function cellEl(r, c) {
    return gridEl.children[r * SIZE + c];
}

/* ============================================================
   SPAWN SHAPES
============================================================ */
function buildShapeDOM(matrix, color, cellSize) {
    const cols = matrix[0].length;
    const div = document.createElement('div');

    div.className = 'shape';
    div.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

    matrix.forEach(row => {
        row.forEach(val => {
            const c = document.createElement('div');
            c.className = 'shape-cell' + (val === 0 ? ' empty' : '');

            if (val === 1) c.style.backgroundColor = color;

            div.appendChild(c);
        });
    });

    return div;
}

const shapeDataMap = new WeakMap();

function spawnShapes() {
    shapesEl.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const def = blockShapes[Math.floor(Math.random() * blockShapes.length)];
        const slot = document.createElement('div');

        slot.className = 'shape-slot';

        const shapeDiv = buildShapeDOM(def.matrix, def.color, SHAPE_CELL);

        shapeDataMap.set(shapeDiv, {
            matrix: def.matrix,
            color: def.color
        });

        shapeDiv.addEventListener('pointerdown', onPointerDown);

        slot.appendChild(shapeDiv);
        shapesEl.appendChild(slot);
    }

    checkGameOver();
}

/* ============================================================
   DRAG AND DROP
============================================================ */
function onPointerDown(e) {
    if (!gameActive) return;

    e.preventDefault();

    activeShapeDiv = e.currentTarget;

    const data = shapeDataMap.get(activeShapeDiv);

    if (!data) return;

    dragMatrix = data.matrix;
    dragColor = data.color;

    cloneEl = document.createElement('div');
    cloneEl.className = 'drag-clone';
    cloneEl.style.gridTemplateColumns = `repeat(${dragMatrix[0].length}, ${SHAPE_CELL}px)`;

    dragMatrix.forEach(row => {
        row.forEach(val => {
            const c = document.createElement('div');
            c.className = 'shape-cell' + (val === 0 ? ' empty' : '');

            if (val === 1) c.style.backgroundColor = dragColor;

            cloneEl.appendChild(c);
        });
    });

    document.body.appendChild(cloneEl);
    positionClone(e.clientX, e.clientY);

    activeShapeDiv.style.opacity = '0.25';

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
}

function positionClone(cx, cy) {
    const cols = dragMatrix[0].length;
    const rows = dragMatrix.length;
    const GAP = 3;

    const w = cols * SHAPE_CELL + (cols - 1) * GAP;
    const h = rows * SHAPE_CELL + (rows - 1) * GAP;

    cloneEl.style.left = (cx - w / 2) + 'px';
    cloneEl.style.top = (cy - h / 2 - 12) + 'px';
}

function onPointerMove(e) {
    if (!cloneEl) return;

    positionClone(e.clientX, e.clientY);
    updatePreview(e.clientX, e.clientY);
}

function clearPreview() {
    previewCells.forEach(idx => {
        const el = gridEl.children[idx];

        if (el) {
            el.classList.remove('preview-valid', 'preview-invalid');
        }
    });

    previewCells = [];
}

function updatePreview(cx, cy) {
    clearPreview();

    const { row, col } = cursorToGridCell(cx, cy);

    if (row === null) return;

    const valid = canPlaceShape(dragMatrix, row, col);

    for (let sr = 0; sr < dragMatrix.length; sr++) {
        for (let sc = 0; sc < dragMatrix[0].length; sc++) {
            if (dragMatrix[sr][sc] !== 1) continue;

            const tr = row + sr;
            const tc = col + sc;

            if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) continue;

            const idx = tr * SIZE + tc;
            previewCells.push(idx);
            gridEl.children[idx].classList.add(valid ? 'preview-valid' : 'preview-invalid');
        }
    }
}

function cursorToGridCell(cx, cy) {
    const rect = gridEl.getBoundingClientRect();
    const cellW = rect.width / SIZE;
    const cellH = rect.height / SIZE;

    const cols = dragMatrix[0].length;
    const rows = dragMatrix.length;
    const GAP = 3;

    const shapeW = cols * SHAPE_CELL + (cols - 1) * GAP;
    const shapeH = rows * SHAPE_CELL + (rows - 1) * GAP;

    const ax = cx - shapeW / 2;
    const ay = cy - shapeH / 2 - 12;

    const col = Math.floor((ax - rect.left) / cellW);
    const row = Math.floor((ay - rect.top) / cellH);

    if (col < -1 || row < -1 || col > SIZE || row > SIZE) {
        return { row: null, col: null };
    }

    return { row, col };
}

/* ============================================================
   IMPORTANT FIX IS HERE
   Game over is no longer checked before line clearing finishes.
============================================================ */
function onPointerUp(e) {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    clearPreview();

    if (!cloneEl || !activeShapeDiv) {
        cleanup();
        return;
    }

    const { row, col } = cursorToGridCell(e.clientX, e.clientY);
    let placed = false;

    if (row !== null && canPlaceShape(dragMatrix, row, col)) {
        placeShape(dragMatrix, row, col, dragColor);

        activeShapeDiv.closest('.shape-slot').remove();
        placed = true;

        const didClearLines = checkLines();

        if (!didClearLines) {
            if (shapesEl.children.length === 0) {
                spawnShapes();
            } else {
                checkGameOver();
            }
        }
    }

    cleanup(placed);
}

function cleanup(placed) {
    if (cloneEl) {
        cloneEl.remove();
        cloneEl = null;
    }

    if (!placed && activeShapeDiv) {
        activeShapeDiv.style.opacity = '1';
    }

    activeShapeDiv = null;
    dragMatrix = null;
    dragColor = null;
}

/* ============================================================
   GAME LOGIC
============================================================ */
function canPlaceShape(matrix, r, c) {
    for (let sr = 0; sr < matrix.length; sr++) {
        for (let sc = 0; sc < matrix[0].length; sc++) {
            if (matrix[sr][sc] !== 1) continue;

            const tr = r + sr;
            const tc = c + sc;

            if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) return false;
            if (gridMap[tr][tc] === 1) return false;
        }
    }

    return true;
}

function placeShape(matrix, r, c, color) {
    let count = 0;

    for (let sr = 0; sr < matrix.length; sr++) {
        for (let sc = 0; sc < matrix[0].length; sc++) {
            if (matrix[sr][sc] !== 1) continue;

            gridMap[r + sr][c + sc] = 1;

            const el = cellEl(r + sr, c + sc);
            el.classList.add('filled');
            el.style.backgroundColor = color;

            count++;
        }
    }

    updateScore(count * 10);
}

/* ============================================================
   IMPORTANT FIX IS HERE TOO
   This function now returns true or false.
   true  = lines are clearing
   false = no lines cleared
============================================================ */
function checkLines() {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < SIZE; r++) {
        if (gridMap[r].every(v => v === 1)) {
            rowsToClear.push(r);
        }
    }

    for (let c = 0; c < SIZE; c++) {
        if (Array.from({ length: SIZE }, (_, r) => gridMap[r][c]).every(v => v === 1)) {
            colsToClear.push(c);
        }
    }

    const linesCleared = rowsToClear.length + colsToClear.length;

    if (!linesCleared) {
        streak = 0;
        return false;
    }

    streak++;

    if (streak > bestStreak) {
        bestStreak = streak;
    }

    const toAnim = new Set();

    rowsToClear.forEach(r => {
        for (let c = 0; c < SIZE; c++) {
            toAnim.add(r * SIZE + c);
        }
    });

    colsToClear.forEach(c => {
        for (let r = 0; r < SIZE; r++) {
            toAnim.add(r * SIZE + c);
        }
    });

    toAnim.forEach(i => {
        gridEl.children[i].classList.add('clearing');
    });

    setTimeout(() => {
        rowsToClear.forEach(r => {
            for (let c = 0; c < SIZE; c++) {
                gridMap[r][c] = 0;
            }
        });

        colsToClear.forEach(c => {
            for (let r = 0; r < SIZE; r++) {
                gridMap[r][c] = 0;
            }
        });

        toAnim.forEach(i => {
            const el = gridEl.children[i];

            el.classList.remove('filled', 'clearing');
            el.style.backgroundColor = '';
        });

        const baseLinePts = linesCleared * 100;
        const comboBonus = linesCleared > 1 ? Math.floor(baseLinePts * (linesCleared - 1) * 0.5) : 0;
        const streakBonus = streak > 1 ? Math.floor(baseLinePts * (streak - 1) * 0.1) : 0;

        let pts = baseLinePts + comboBonus + streakBonus;

        const boardEmpty = gridMap.every(row => row.every(v => v === 0));

        if (boardEmpty) {
            pts += 1000;
        }

        updateScore(pts);

        if (boardEmpty) {
            spawnFloatingText('BOARD CLEAR! +1000', 'combo-quad');
            triggerFlash('var(--cyan)');
            mainContainer.classList.add('shake-effect');
            setTimeout(() => mainContainer.classList.remove('shake-effect'), 400);
        } else if (linesCleared >= 5) {
            spawnFloatingText(`PENTA CLEAR! +${pts}`, 'combo-penta');
            triggerFlash('var(--magenta)');
            mainContainer.classList.add('shake-effect');
            setTimeout(() => mainContainer.classList.remove('shake-effect'), 400);
        } else if (linesCleared === 4) {
            spawnFloatingText(`QUAD! +${pts}`, 'combo-quad');
            triggerFlash('var(--gold)');
        } else if (linesCleared === 3) {
            spawnFloatingText(`TRIPLE! +${pts}`, 'combo-triple');
            triggerFlash('var(--cyan)');
        } else if (linesCleared === 2) {
            spawnFloatingText(`DOUBLE! +${pts}`, 'combo-double');
        } else if (streak >= 3) {
            spawnFloatingText(`STREAK x${streak}! +${pts}`, 'combo-triple');
        }

        if (shapesEl.children.length === 0) {
            spawnShapes();
        } else {
            checkGameOver();
        }

    }, 300);

    return true;
}

/* ============================================================
   EFFECTS
============================================================ */
function triggerFlash(color) {
    screenFlash.style.background = color;
    screenFlash.classList.remove('fire');
    void screenFlash.offsetWidth;
    screenFlash.classList.add('fire');
}

function spawnFloatingText(msg, cls) {
    const el = document.createElement('div');

    el.className = 'floating-text' + (cls ? ' ' + cls : '');
    el.textContent = msg;

    const rect = gridEl.getBoundingClientRect();

    const top = rect.height > 0
        ? (rect.top + rect.height / 2)
        : (window.innerHeight / 2);

    el.style.top = top + 'px';

    document.body.appendChild(el);

    setTimeout(() => el.remove(), 1200);
}

function updateScore(pts) {
    score += pts;

    scoreEl.textContent = score.toLocaleString();

    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-pop');

    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore.toLocaleString();

        try {
            localStorage.setItem('bphs_v5', highScore);
        } catch(e) {}
    }
}

/* ============================================================
   GAME OVER CHECK
============================================================ */
function checkGameOver() {
    if (!gameActive) return;

    const slots = Array.from(shapesEl.children);

    if (slots.length === 0) return;

    let canPlace = false;

    for (const slot of slots) {
        const shapeDiv = slot.querySelector('.shape');

        if (!shapeDiv) continue;

        const data = shapeDataMap.get(shapeDiv);

        if (!data) continue;

        const matrix = data.matrix;

        outer:
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canPlaceShape(matrix, r, c)) {
                    canPlace = true;
                    break outer;
                }
            }
        }

        if (canPlace) break;
    }

    if (!canPlace) {
        gameActive = false;

        if (goTimeout) {
            clearTimeout(goTimeout);
        }

        goTimeout = setTimeout(() => showGameOver(), 0);
    }
}

/* ============================================================
   GAME OVER SCREEN
============================================================ */
async function showGameOver() {
    await saveScoreToLeaderboard(currentPlayerName, score);

    await loadLeaderboard();

    const myRank = leaderboard.findIndex(entry => entry.name === currentPlayerName) + 1;

    rankTextEl.textContent = myRank === 1
        ? 'YOU ARE THE CHAMPION!'
        : myRank > 0
            ? `You ranked #${myRank} of ${leaderboard.length} players`
            : 'Your score has been saved!';

    if (goStreakEl) {
        goStreakEl.textContent = bestStreak > 0
            ? `Best streak this game: x${bestStreak}`
            : '';
    }

    finalScoreEl.textContent = score.toLocaleString();
    finalBestEl.textContent = highScore.toLocaleString();
    finalTopPlayerEl.textContent = leaderboard[0]?.name || '—';
    finalTopScoreEl.textContent = leaderboard[0]?.score?.toLocaleString() || '0';

    gameOverScreen.classList.add('active');
}

/* ============================================================
   RESTART GAME
============================================================ */
function restartGame() {
    if (goTimeout) {
        clearTimeout(goTimeout);
        goTimeout = null;
    }

    gameOverScreen.classList.remove('active');

    score = 0;
    streak = 0;
    bestStreak = 0;

    scoreEl.textContent = '0';

    createGrid();
    spawnShapes();

    gameActive = true;
}

/* ============================================================
   BOOT
============================================================ */
createBackgroundShapes();
createGrid();
spawnShapes();
gameActive = true;

fetchCurrentPlayer().then(() => loadLeaderboard());