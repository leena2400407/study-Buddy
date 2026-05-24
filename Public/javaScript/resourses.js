function switchTab(subjectId) {
            // Remove active classes
            document.querySelectorAll('.content-set').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

            // Add active classes
            document.getElementById(subjectId).classList.add('active');
            document.querySelector(`.tab.${subjectId}`).classList.add('active');
        }