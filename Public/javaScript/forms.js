//====================================================
// Utility function for redirect
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const page = urlParams.get('page');
    if (redirect) {
        return redirect + (page ? '?page=' + page : '');
    }
    return 'profile.html';
}

//===============================================================
const signupForm = document.getElementById("signup-form");

if (signupForm) {
  signupForm.addEventListener("submit", function (event) {
    let valid = true;

    const fullName = document.getElementById("fullName").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const university = document.getElementById("university").value;
    const major = document.getElementById("major").value;

    const messageBox = document.getElementById("signup-message");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmError = document.getElementById("confirmError");
    const fullNameError = document.getElementById("fullNameError");
    const usernameError = document.getElementById("usernameError");

    if (messageBox) {
      messageBox.textContent = "";
      messageBox.style.display = "none";
    }

    if (emailError) emailError.innerText = "";
    if (passwordError) passwordError.innerText = "";
    if (confirmError) confirmError.innerText = "";
    if (fullNameError) fullNameError.innerText = "";
    if (usernameError) usernameError.innerText = "";

    const allowedUniversityDomains = [
        "miuegypt.edu.eg",
        "ecu.edu.eg",
        "cis.asu.edu.eg",
        "student.guc.edu.eg",
    ];

const emailDomain = email.split("@")[1]?.toLowerCase();

const isAllowedUniversityEmail = allowedUniversityDomains.includes(emailDomain);
const passwordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;
const usernameRegex = /^[A-Za-z_]{3,20}$/;

    if (
      !fullName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !genderInput ||
      !university ||
      !major
    ) {
      if (messageBox) {
        messageBox.textContent = "Please fill in all fields.";
        messageBox.style.color = "red";
        messageBox.style.display = "block";
      }

      valid = false;
    }
    if (!fullNameRegex.test(fullName)) {
       if (fullNameError) {
         fullNameError.innerText = "Full name must include first and last name using letters only.";}
         valid = false;}
         if (!usernameRegex.test(username)) {
          if (usernameError) {
            usernameError.innerText = "Username must be 3-20 characters and only contain letters and underscores.";
          }
          valid = false;
        }

    if (!passwordRegex.test(password)) {
      if (passwordError) {
        passwordError.innerText = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
      }
      valid = false;
    }

    if (password !== confirmPassword) {
      if (confirmError) {
        confirmError.innerText = "Passwords do not match.";
      }

      valid = false;
    }

    if (!valid) {
      event.preventDefault();
      return;
    }

    if (messageBox) {
      messageBox.textContent = "Creating account...";
      messageBox.style.color = "green";
      messageBox.style.display = "block";
    }
  });
}