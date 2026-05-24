        const container = document.getElementById('bg-container');
        const colors = ['#38bdf8', '#c084fc', '#4ade80', '#fbbf24', '#f87171'];
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        function createFloatingItem() {
            const item = document.createElement('div');
            item.className = 'floating-item';
            
            if (Math.random() > 0.5) {
                item.innerText = letters[Math.floor(Math.random() * letters.length)];
                item.classList.add('floating-text');
                item.style.fontSize = Math.random() * 25 + 15 + 'px';
            } else {
                const c1 = colors[Math.floor(Math.random() * colors.length)];
                const c2 = colors[Math.floor(Math.random() * colors.length)];
                const c3 = colors[Math.floor(Math.random() * colors.length)];
                
                item.innerHTML = `
                    <div class="block-shape">
                        <div class="square-part" style="background:${c1};"></div>
                        <div class="square-part" style="background:${c2};"></div>
                        <div class="square-part" style="background:${c3};"></div>
                    </div>
                `;
            }

            item.style.left = Math.random() * 100 + 'vw';
            const duration = Math.random() * 10 + 10; 
            item.style.animationDuration = duration + 's';
            item.style.animationDelay = Math.random() * 2 + 's';

            container.appendChild(item);
            
            setTimeout(() => { item.remove(); }, (duration + 2) * 1000);
        }

        setInterval(createFloatingItem, 400);

        function showPage(pageId) {
            document.getElementById('landing-page').classList.add('hidden');
            document.getElementById('blockblast-page').classList.add('hidden');
            document.getElementById('wordle-page').classList.add('hidden');
            document.getElementById(pageId).classList.remove('hidden');
        }

        function goBack() {
            document.getElementById('landing-page').classList.remove('hidden');
            document.getElementById('blockblast-page').classList.add('hidden');
            document.getElementById('wordle-page').classList.add('hidden');
        }