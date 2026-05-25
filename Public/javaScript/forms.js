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

    if (messageBox) {
      messageBox.textContent = "";
      messageBox.style.display = "none";
    }

    if (emailError) emailError.innerText = "";
    if (passwordError) passwordError.innerText = "";
    if (confirmError) confirmError.innerText = "";

    const emailRegex = /^[^\s@]+@gmail\.com$/;
    const passwordRegex = /^.{8,}$/;

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

    if (!emailRegex.test(email)) {
      if (emailError) {
        emailError.innerText = "Please enter a valid Gmail address.";
      }

      valid = false;
    }

    if (!passwordRegex.test(password)) {
      if (passwordError) {
        passwordError.innerText = "Password must be at least 8 characters.";
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