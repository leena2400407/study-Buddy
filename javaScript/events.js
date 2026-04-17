function showPage(pageId, bgClass) {
       
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('tournaments-page').classList.add('hidden');
        document.getElementById('entertainment-page').classList.add('hidden');
        
       
        document.getElementById(pageId).classList.remove('hidden');
        document.body.className = bgClass;
    }

     function goBack() {
        showPage('landing-page', 'bg-landing');
    }   
    function openRegistration(event, name) {
            event.preventDefault();
            document.getElementById('modal-tournament-name').innerText = name;
            document.getElementById('registration-modal').classList.remove('hidden');
        }

        function closeRegistration() {
            document.getElementById('registration-modal').classList.add('hidden');
        }

       

        function submitTeam(event) {
            event.preventDefault();
            alert('Registration Successful!');
            closeRegistration();
            document.getElementById('team-form').reset();
        }

     let maxP = 10; 

     function openRegistration(e, name) {
           e.preventDefault();
    
    
     maxP = name.toLowerCase().includes('padel') ? 2 : 10; 

     document.getElementById('modal-tournament-name').innerText = name;
    
    
     document.getElementById('players-container').innerHTML = `
        <div class="form-group">
            <label>Player 1 (Captain) *</label>
            <div class="player-inputs">
                <input type="text" placeholder="Full Name" required>
                <input type="email" placeholder="Email Address" required>
            </div>
        </div>`;

     document.querySelector('.add-player-btn').style.display = 'block';
     document.getElementById('registration-modal').classList.remove('hidden');
     }

    function addPlayer() {
         const container = document.getElementById('players-container');
         const num = container.children.length + 1;
    
    if (num > maxP) return; // Stop if over max limit

    
    container.insertAdjacentHTML('beforeend', `
        <div class="form-group">
            <label>Player ${num}</label>
            <div class="player-inputs">
                <input type="text" placeholder="Full Name" required>
                <input type="email" placeholder="Email Address" required>
            </div>
        </div>`);

    
    if (num === maxP) document.querySelector('.add-player-btn').style.display = 'none';
}

function closeRegistration() {
    document.getElementById('registration-modal').classList.add('hidden');
}
