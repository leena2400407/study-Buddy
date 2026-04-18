 let myWeakSubjects = [];
        let myStrongSubjects = [];

        // Realistic Mock Data
        const templist = [];

        function toggleModal(show) {
            document.getElementById('overlay').classList.toggle('active', show);
            if(show) {
                document.getElementById('formPart').style.display = 'block';
                document.getElementById('waitPart').style.display = 'none';
                refreshUI();
            }
        }

        function handleTag(e, containerId) {
            if (e.key === 'Enter' && e.target.value.trim() !== '') {
                const val = e.target.value.trim();
                if (containerId === 'weakContainer') myWeakSubjects.push(val);
                else myStrongSubjects.push(val);
                e.target.value = '';
                refreshUI();
            }
        }

        function removeTag(val, containerId) {
            if (containerId === 'weakContainer') myWeakSubjects = myWeakSubjects.filter(i => i !== val);
            else myStrongSubjects = myStrongSubjects.filter(i => i !== val);
            refreshUI();
        }

        function refreshUI() {
            const wContainer = document.getElementById('weakContainer');
            const sContainer = document.getElementById('strongContainer');
            const wInput = wContainer.querySelector('.tag-input');
            const sInput = sContainer.querySelector('.tag-input');
            
            wContainer.innerHTML = '';
            myWeakSubjects.forEach(s => {
                wContainer.innerHTML += `<div class="tag">${s} <span onclick="removeTag('${s}', 'weakContainer')">&times;</span></div>`;
            });
            wContainer.appendChild(wInput);

            sContainer.innerHTML = '';
            myStrongSubjects.forEach(s => {
                sContainer.innerHTML += `<div class="tag">${s} <span onclick="removeTag('${s}', 'strongContainer')">&times;</span></div>`;
            });
            sContainer.appendChild(sInput);
        }

        function saveList() {
            if(myWeakSubjects.length === 0 || myStrongSubjects.length === 0) {
                alert("Please add at least one subject in both sections.");
                return;
            }
            toggleModal(false);
        }

        function openWaitOnly() {
            if(myWeakSubjects.length === 0) {
                alert("Please fill your list first!");
                toggleModal(true);
                return;
            }

            document.getElementById('overlay').classList.add('active');
            document.getElementById('formPart').style.display = 'none';
            document.getElementById('waitPart').style.display = 'block';

            // 1. Show My Summary
            document.getElementById('summaryWeak').innerHTML = myWeakSubjects.map(s => `<span style="background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:5px; font-size:11px; font-weight:700;">Need: ${s}</span>`).join('');
            document.getElementById('summaryStrong').innerHTML = myStrongSubjects.map(s => `<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:5px; font-size:11px; font-weight:700;">Teach: ${s}</span>`).join('');

            // 2. Show Others Feed
            const listDiv = document.getElementById('othersList');
            listDiv.innerHTML = templist.map(person => `
                <div class="buddy-item">
                    <div class="buddy-info">
                        <h5>${person.name}</h5>
                        <p>${person.time}</p>
                        <div class="buddy-tags">
                            <span class="b-tag">Strong in: ${person.strong[0]}</span>
                            <span class="b-tag">Needs: ${person.weak[0]}</span>
                        </div>
                    </div>
                    <button class="btn-match" onclick="alert('Match Request Sent to ${person.name}!')">Match</button>
                </div>
            `).join('');
        }