document.addEventListener('DOMContentLoaded', () => {
            const accordions = document.querySelectorAll('.accordion-header');

            accordions.forEach(acc => {
                acc.addEventListener('click', function() {
                    // Close the open drop down first
                    accordions.forEach(otherAcc => {
                        if (otherAcc !== this && otherAcc.classList.contains('active')) {
                            otherAcc.classList.remove('active');
                            otherAcc.nextElementSibling.style.maxHeight = null;
                        }
                    });

                    
                    this.classList.toggle('active');
                    const content = this.nextElementSibling;

                    if (content.style.maxHeight) {
                        content.style.maxHeight = null;
                    } else {
                        content.style.maxHeight = content.scrollHeight + "px"; 
                    }
                });
            });
        });

