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