function showPage(pageId, bgClass) {
        // Hide all pages first
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('tournaments-page').classList.add('hidden');
        document.getElementById('entertainment-page').classList.add('hidden');
        
        // Show the requested page and update background
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