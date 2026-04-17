        const SIZE = 8;
        const SHAPE_CELL = 32; // px — tray/clone shape cell size

        let gridMap    = [];
        let score      = 0;
        let highScore  = parseInt(localStorage.getItem('bphs_v5')) || 0;
        let streak     = 0;
        let bestStreak = 0;
        let gameActive = false;
        let goTimeout  = null;

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
           LEADERBOARD
        ============================================================ */
        const RANDOM_NAMES = [
            'PixelAce','NeonKing','VoidDrift','StarBlast','GridMaster',
            'CubeZero','NovaStar','PhantomX','BlockHero','CryptoWave',
            'ShadowRun','LaserBolt','ArcLight','DarkMatter','OmegaByte'
        ];

        function generateLeaderboard() {
            const used = new Set();
            const entries = [];
            for (let i = 0; i < 9; i++) {
                let name;
                do { name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]; } while (used.has(name));
                used.add(name);
                entries.push({ name, score: Math.floor(Math.random() * 2800) + 200, isYou: false });
            }
            entries.sort((a, b) => b.score - a.score);
            return entries;
        }

        let leaderboard = JSON.parse(localStorage.getItem('bplb_v5'));
        if (!leaderboard) {
            leaderboard = generateLeaderboard();
            localStorage.setItem('bplb_v5', JSON.stringify(leaderboard));
        }

        function renderLeaderboard() {
            leaderboardListEl.innerHTML = '';
            leaderboard.slice(0, 8).forEach((entry, i) => {
                const li = document.createElement('li');
                li.className = 'lb-item';
                if (i === 0) li.classList.add('rank-1');
                else if (i === 1) li.classList.add('rank-2');
                else if (i === 2) li.classList.add('rank-3');
                if (entry.isYou) li.classList.add('is-you');
                const youTag = entry.isYou ? '<span class="you-tag">YOU</span>' : '';
                li.innerHTML = `
                    <span class="lb-rank">${i + 1}</span>
                    <span class="lb-name">${entry.name} ${youTag}</span>
                    <span class="lb-score">${entry.score.toLocaleString()}</span>`;
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
            bg.innerHTML = '';
            for (let i = 0; i < 15; i++) {
                const s  = blockShapes[Math.floor(Math.random() * blockShapes.length)];
                const li = document.createElement('li');
                li.style.left              = `${Math.random() * 85 + 5}%`;
                li.style.animationDelay    = `${Math.random() * 20}s`;
                li.style.animationDuration = `${Math.random() * 20 + 25}s`;

                const wrap = document.createElement('div');
                wrap.style.cssText = `display:grid;gap:2px;grid-template-columns:repeat(${s.matrix[0].length},20px);transform:scale(${Math.random()*1.5+0.7});opacity:0.1;`;

                s.matrix.forEach(row => row.forEach(val => {
                    const b = document.createElement('div');
                    b.style.cssText = `width:20px;height:20px;border-radius:3px;background:${val ? s.color : 'transparent'};`;
                    if (val) b.className = 'bg-shape-cell';
                    wrap.appendChild(b);
                }));

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
            const div  = document.createElement('div');
            div.className = 'shape';
            div.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

            matrix.forEach(row => row.forEach(val => {
                const c = document.createElement('div');
                c.className = 'shape-cell' + (val === 0 ? ' empty' : '');
                if (val === 1) c.style.backgroundColor = color;
                div.appendChild(c);
            }));

            return div;
        }

        function spawnShapes() {
            shapesEl.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const def  = blockShapes[Math.floor(Math.random() * blockShapes.length)];
                const slot = document.createElement('div');
                slot.className = 'shape-slot';

                const shapeDiv = buildShapeDOM(def.matrix, def.color, SHAPE_CELL);
                shapeDiv._matrix = def.matrix;
                shapeDiv._color  = def.color;

                shapeDiv.addEventListener('pointerdown', onPointerDown);
                slot.appendChild(shapeDiv);
                shapesEl.appendChild(slot);
            }
        }

        
        function onPointerDown(e) {
            e.preventDefault();
            activeShapeDiv = this;
            dragMatrix     = this._matrix;
            dragColor      = this._color;

            cloneEl = document.createElement('div');
            cloneEl.className = 'drag-clone';
            cloneEl.style.gridTemplateColumns = `repeat(${dragMatrix[0].length}, ${SHAPE_CELL}px)`;

            dragMatrix.forEach(row => row.forEach(val => {
                const c = document.createElement('div');
                c.className = 'shape-cell' + (val === 0 ? ' empty' : '');
                if (val === 1) c.style.backgroundColor = dragColor;
                cloneEl.appendChild(c);
            }));

            document.body.appendChild(cloneEl);
            positionClone(e.clientX, e.clientY);
            activeShapeDiv.style.opacity = '0.25';

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup',   onPointerUp);
        }

        function positionClone(cx, cy) {
            const cols = dragMatrix[0].length;
            const rows = dragMatrix.length;
            const GAP  = 3;
            const w    = cols * SHAPE_CELL + (cols - 1) * GAP;
            const h    = rows * SHAPE_CELL + (rows - 1) * GAP;
            cloneEl.style.left = (cx - w / 2) + 'px';
            cloneEl.style.top  = (cy - h / 2 - 12) + 'px';
        }

        function onPointerMove(e) {
            if (!cloneEl) return;
            positionClone(e.clientX, e.clientY);
            updatePreview(e.clientX, e.clientY);
        }

        function clearPreview() {
            previewCells.forEach(idx => {
                const el = gridEl.children[idx];
                if (el) el.classList.remove('preview-valid', 'preview-invalid');
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
                    const tr = row + sr, tc = col + sc;
                    if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) continue;
                    const idx = tr * SIZE + tc;
                    previewCells.push(idx);
                    gridEl.children[idx].classList.add(valid ? 'preview-valid' : 'preview-invalid');
                }
            }
        }