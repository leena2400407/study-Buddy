//====================================================
// Utility function for redirect
function getRedirectUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");
  const page = urlParams.get("page");

  if (redirect) {
    return redirect + (page ? "?page=" + page : "");
  }

  return "profile.html";
}

//====================================================
// Signup avatar picker
function selectSignupAvatar(button) {
  const avatarPath = button.dataset.avatarPath || "";
  const hiddenInput = document.getElementById("selectedAvatar");
  const avatarError = document.getElementById("avatarError");

  document.querySelectorAll(".avatar-option").forEach(option => {
    option.classList.remove("selected");
  });

  button.classList.add("selected");

  if (hiddenInput) {
    hiddenInput.value = avatarPath;
  }

  if (avatarError) {
    avatarError.innerText = "";
  }
}

window.selectSignupAvatar = selectSignupAvatar;

//====================================================
// Signup validation
//====================================================
// Signup validation with live blur validation

//====================================================
// Signup validation under each field

const signupForm = document.getElementById("signup-form");

if (signupForm) {
  const fullNameInput = document.getElementById("fullName");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const universityInput = document.getElementById("university");
  const majorInput = document.getElementById("major");
  const selectedAvatarInput = document.getElementById("selectedAvatar");
  const messageBox = document.getElementById("signup-message");

  const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;
  const usernameRegex = /^[A-Za-z_]{3,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{9,}$/;

  function setFieldError(input, errorId, message) {
    const errorBox = document.getElementById(errorId);

    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.add("show");
    }

    if (input) {
      input.classList.add("invalid");
      input.classList.remove("valid");
    }

    return false;
  }

  function clearFieldError(input, errorId) {
    const errorBox = document.getElementById(errorId);

    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.remove("show");
    }

    if (input) {
      input.classList.remove("invalid");
      input.classList.add("valid");
    }

    return true;
  }

  function clearTopMessage() {
    if (!messageBox) return;

    messageBox.textContent = "";
    messageBox.style.display = "none";
  }

  function validateFullName(showEmpty = true) {
    const fullName = fullNameInput.value.trim();

    if (!fullName) {
      if (showEmpty) {
        return setFieldError(fullNameInput, "fullNameError", "Full name is required.");
      }
      return false;
    }

    if (!fullNameRegex.test(fullName)) {
      return setFieldError(
        fullNameInput,
        "fullNameError",
        "Full name must include first and last name using letters only. No numbers or symbols."
      );
    }

    return clearFieldError(fullNameInput, "fullNameError");
  }

  function validateUsername(showEmpty = true) {
    const username = usernameInput.value.trim();

    if (!username) {
      if (showEmpty) {
        return setFieldError(usernameInput, "usernameError", "Username is required.");
      }
      return false;
    }

    if (!usernameRegex.test(username)) {
      return setFieldError(
        usernameInput,
        "usernameError",
        "Username must be 3-20 characters and only contain letters and underscores. No numbers or symbols."
      );
    }

    return clearFieldError(usernameInput, "usernameError");
  }

  function validateEmail(showEmpty = true) {
    const email = emailInput.value.trim();

    if (!email) {
      if (showEmpty) {
        return setFieldError(emailInput, "emailError", "Email is required.");
      }
      return false;
    }

    if (!emailRegex.test(email)) {
      return setFieldError(emailInput, "emailError", "Please enter a valid email.");
    }

    return clearFieldError(emailInput, "emailError");
  }

  function validateAvatar(showEmpty = true) {
    const selectedAvatar = selectedAvatarInput
      ? selectedAvatarInput.value.trim()
      : "";

    if (!selectedAvatar) {
      if (showEmpty) {
        return setFieldError(null, "avatarError", "Please choose an avatar.");
      }
      return false;
    }

    return clearFieldError(null, "avatarError");
  }

  function validatePassword(showEmpty = true) {
    const password = passwordInput.value;

    if (!password) {
      if (showEmpty) {
        return setFieldError(passwordInput, "passwordError", "Password is required.");
      }
      return false;
    }

    if (!passwordRegex.test(password)) {
      return setFieldError(
        passwordInput,
        "passwordError",
        "Password must be at least 9 characters and include uppercase, lowercase, number, and special character."
      );
    }

    return clearFieldError(passwordInput, "passwordError");
  }

  function validateConfirmPassword(showEmpty = true) {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!confirmPassword) {
      if (showEmpty) {
        return setFieldError(confirmPasswordInput, "confirmError", "Please confirm your password.");
      }
      return false;
    }

    if (password !== confirmPassword) {
      return setFieldError(confirmPasswordInput, "confirmError", "Passwords do not match.");
    }

    return clearFieldError(confirmPasswordInput, "confirmError");
  }

  function validateUniversity(showEmpty = true) {
    const university = universityInput.value;

    if (!university) {
      if (showEmpty) {
        return setFieldError(universityInput, "universityError", "Please select your university.");
      }
      return false;
    }

    return clearFieldError(universityInput, "universityError");
  }

  function validateMajor(showEmpty = true) {
    const major = majorInput.value;

    if (!major) {
      if (showEmpty) {
        return setFieldError(majorInput, "majorError", "Please select your major.");
      }
      return false;
    }

    return clearFieldError(majorInput, "majorError");
  }

  fullNameInput.addEventListener("blur", function () {
    clearTopMessage();
    validateFullName(true);
  });

  usernameInput.addEventListener("blur", function () {
    clearTopMessage();
    validateUsername(true);
  });

  emailInput.addEventListener("blur", function () {
    clearTopMessage();
    validateEmail(true);
  });

  passwordInput.addEventListener("blur", function () {
    clearTopMessage();
    validatePassword(true);
  });

  confirmPasswordInput.addEventListener("blur", function () {
    clearTopMessage();
    validateConfirmPassword(true);
  });

  universityInput.addEventListener("change", function () {
    clearTopMessage();
    validateUniversity(true);
  });

  majorInput.addEventListener("change", function () {
    clearTopMessage();
    validateMajor(true);
  });

  document.querySelectorAll(".avatar-option").forEach((button) => {
    button.addEventListener("click", function () {
      setTimeout(() => {
        clearTopMessage();
        validateAvatar(true);
      }, 0);
    });
  });

  signupForm.addEventListener("submit", function (event) {
    clearTopMessage();

    const isValid =
      validateFullName(true) &
      validateUsername(true) &
      validateUniversity(true) &
      validateMajor(true) &
      validateEmail(true) &
      validateAvatar(true) &
      validatePassword(true) &
      validateConfirmPassword(true);

    if (!isValid) {
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
document.querySelectorAll(".password-eye").forEach((button) => {
  button.addEventListener("click", function () {
    const inputId = this.getAttribute("data-target");
    const input = document.getElementById(inputId);

    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    this.classList.toggle("showing", isHidden);
    this.setAttribute(
      "aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  });
});
