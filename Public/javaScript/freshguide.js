document.addEventListener("DOMContentLoaded", function () {
    let notes = document.querySelectorAll(".note"),
        dots = document.querySelectorAll(".dot"),
        stack = document.getElementById("stack"),
        final = document.getElementById("final"),
        guideNav = document.getElementById("guideNav"),
        stepText = document.getElementById("stepText"),
        percentText = document.getElementById("percentText"),
        progressFill = document.getElementById("progressFill"),
        i = 0;

    function show(n) {
        notes.forEach(note => {
            note.className = "note";
        });

        if (notes[n]) {
            notes[n].classList.add("active");
        }

        if (notes[n + 1]) {
            notes[n + 1].classList.add("behind-one");
        }

        if (notes[n + 2]) {
            notes[n + 2].classList.add("behind-two");
        }

        dots.forEach((dot, index) => {
            if (index <= n) {
                dot.classList.add("done");
            } else {
                dot.classList.remove("done");
            }
        });

        const percent = Math.round(((n + 1) / notes.length) * 100);

        if (stepText) {
            stepText.textContent = `Tip ${n + 1} of ${notes.length}`;
        }

        if (percentText) {
            percentText.textContent = `${percent}%`;
        }

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
    }

    window.next = function () {
        if (!notes[i]) return;

        notes[i].classList.add("fly");

        i++;

        setTimeout(() => {
            if (i < notes.length) {
                show(i);
            } else {
                stack.style.display = "none";

                if (guideNav) {
                    guideNav.style.display = "none";
                }

                final.style.display = "block";

                if (stepText) {
                    stepText.textContent = "Guide completed";
                }

                if (percentText) {
                    percentText.textContent = "100%";
                }

                if (progressFill) {
                    progressFill.style.width = "100%";
                }
            }
        }, 420);
    };

    window.restart = function () {
        i = 0;

        stack.style.display = "block";

        if (guideNav) {
            guideNav.style.display = "block";
        }

        final.style.display = "none";

        notes.forEach(note => {
            note.className = "note";
        });

        show(0);
    };

    show(0);
});