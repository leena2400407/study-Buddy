const editInfoBtn = document.getElementById("editInfoBtn");
const cancelInfoBtn = document.getElementById("cancelInfoBtn");
const infoView = document.getElementById("infoView");
const infoEditForm = document.getElementById("infoEditForm");


function selectProfileAvatar(button) {
  const avatarPath = button.dataset.avatarPath || "";
  const hiddenInput = document.getElementById("selectedProfileAvatar");
  const avatarError = document.getElementById("profileAvatarError");

  document.querySelectorAll(".profile-avatar-option").forEach(option => {
    option.classList.remove("selected");
  });

  button.classList.add("selected");

  if (hiddenInput) {
    hiddenInput.value = avatarPath;
  }

  if (avatarError) {
    avatarError.textContent = "";
    avatarError.classList.remove("show");
  }
}

window.selectProfileAvatar = selectProfileAvatar;



function clearProfileValidation() {
  document.querySelectorAll(".field-error").forEach((errorBox) => {
    errorBox.textContent = "";
    errorBox.classList.remove("show");
  });

  document.querySelectorAll(".edit-form input, .edit-form select").forEach((input) => {
    input.classList.remove("invalid");
    input.classList.remove("valid");
  });
}

if (editInfoBtn && cancelInfoBtn && infoView && infoEditForm) {
  editInfoBtn.addEventListener("click", () => {
    infoView.classList.add("hidden");
    infoEditForm.classList.remove("hidden");
    editInfoBtn.classList.add("hidden");
  });

  cancelInfoBtn.addEventListener("click", () => {
    infoEditForm.reset();
    clearProfileValidation();

    infoEditForm.classList.add("hidden");
    infoView.classList.remove("hidden");
    editInfoBtn.classList.remove("hidden");
  });
}

//====================================================
// Profile info validation
// Same idea as signup validation
//====================================================

if (infoEditForm) {
  const fullNameInput = document.getElementById("profileFullName");
  const usernameInput = document.getElementById("profileUsername");
  const emailInput = document.getElementById("profileEmail");
  const genderInput = document.getElementById("profileGender");
  const universityInput = document.getElementById("profileUniversity");
  const majorInput = document.getElementById("profileMajor");
  const currentPasswordInput = document.getElementById("profileCurrentPassword");
  const newPasswordInput = document.getElementById("profileNewPassword");
  const confirmPasswordInput = document.getElementById("profileConfirmPassword");

  const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;
  const usernameRegex = /^[A-Za-z_]{3,20}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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

  function validateFullName(showEmpty = true) {
    const fullName = fullNameInput.value.trim();

    if (!fullName) {
      if (showEmpty) {
        return setFieldError(fullNameInput, "profileFullNameError", "Full name is required.");
      }

      return false;
    }

    if (!fullNameRegex.test(fullName)) {
      return setFieldError(
        fullNameInput,
        "profileFullNameError",
        "Full name must include first and last name using letters only. No numbers or symbols."
      );
    }

    if (fullName.length < 5 || fullName.length > 60) {
      return setFieldError(
        fullNameInput,
        "profileFullNameError",
        "Full name must be between 5 and 60 characters."
      );
    }

    return clearFieldError(fullNameInput, "profileFullNameError");
  }

  function validateUsername(showEmpty = true) {
    const username = usernameInput.value.trim();

    if (!username) {
      if (showEmpty) {
        return setFieldError(usernameInput, "profileUsernameError", "Username is required.");
      }

      return false;
    }

    if (!usernameRegex.test(username)) {
      return setFieldError(
        usernameInput,
        "profileUsernameError",
        "Username must be 3-20 characters and only contain letters and underscores. No numbers or symbols."
      );
    }

    return clearFieldError(usernameInput, "profileUsernameError");
  }

  function validateEmail(showEmpty = true) {
    const email = emailInput.value.trim();

    if (!email) {
      if (showEmpty) {
        return setFieldError(emailInput, "profileEmailError", "Email is required.");
      }

      return false;
    }

    if (!emailRegex.test(email)) {
      return setFieldError(emailInput, "profileEmailError", "Please enter a valid email.");
    }

    return clearFieldError(emailInput, "profileEmailError");
  }

  function validateGender(showEmpty = true) {
    const gender = genderInput.value;

    if (!gender) {
      if (showEmpty) {
        return setFieldError(genderInput, "profileGenderError", "Please select your gender.");
      }

      return false;
    }

    return clearFieldError(genderInput, "profileGenderError");
  }

  function validateUniversity(showEmpty = true) {
    const university = universityInput.value;

    if (!university) {
      if (showEmpty) {
        return setFieldError(universityInput, "profileUniversityError", "Please select your university.");
      }

      return false;
    }

    return clearFieldError(universityInput, "profileUniversityError");
  }

  function validateMajor(showEmpty = true) {
    const major = majorInput.value;

    if (!major) {
      if (showEmpty) {
        return setFieldError(majorInput, "profileMajorError", "Please select your major.");
      }

      return false;
    }

    return clearFieldError(majorInput, "profileMajorError");
  }

  function passwordChangeStarted() {
    return (
      currentPasswordInput.value.trim() ||
      newPasswordInput.value.trim() ||
      confirmPasswordInput.value.trim()
    );
  }

  function validateCurrentPassword(showEmpty = true) {
    if (!passwordChangeStarted()) {
      clearFieldError(currentPasswordInput, "profileCurrentPasswordError");
      return true;
    }

    if (!currentPasswordInput.value) {
      if (showEmpty) {
        return setFieldError(
          currentPasswordInput,
          "profileCurrentPasswordError",
          "Current password is required to change your password."
        );
      }

      return false;
    }

    return clearFieldError(currentPasswordInput, "profileCurrentPasswordError");
  }

  function validateNewPassword(showEmpty = true) {
    if (!passwordChangeStarted()) {
      clearFieldError(newPasswordInput, "profileNewPasswordError");
      return true;
    }

    const newPassword = newPasswordInput.value;

    if (!newPassword) {
      if (showEmpty) {
        return setFieldError(
          newPasswordInput,
          "profileNewPasswordError",
          "New password is required."
        );
      }

      return false;
    }

    if (!passwordRegex.test(newPassword)) {
      return setFieldError(
        newPasswordInput,
        "profileNewPasswordError",
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
    }

    return clearFieldError(newPasswordInput, "profileNewPasswordError");
  }

  function validateConfirmPassword(showEmpty = true) {
    if (!passwordChangeStarted()) {
      clearFieldError(confirmPasswordInput, "profileConfirmPasswordError");
      return true;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!confirmPassword) {
      if (showEmpty) {
        return setFieldError(
          confirmPasswordInput,
          "profileConfirmPasswordError",
          "Please confirm your new password."
        );
      }

      return false;
    }

    if (newPassword !== confirmPassword) {
      return setFieldError(
        confirmPasswordInput,
        "profileConfirmPasswordError",
        "Passwords do not match."
      );
    }

    return clearFieldError(confirmPasswordInput, "profileConfirmPasswordError");
  }

  fullNameInput.addEventListener("blur", () => validateFullName(true));
  usernameInput.addEventListener("blur", () => validateUsername(true));
  emailInput.addEventListener("blur", () => validateEmail(true));
  genderInput.addEventListener("change", () => validateGender(true));
  universityInput.addEventListener("change", () => validateUniversity(true));
  majorInput.addEventListener("change", () => validateMajor(true));

  currentPasswordInput.addEventListener("blur", () => validateCurrentPassword(true));
  newPasswordInput.addEventListener("blur", () => {
    validateNewPassword(true);
    validateConfirmPassword(false);
  });
  confirmPasswordInput.addEventListener("blur", () => validateConfirmPassword(true));

  infoEditForm.addEventListener("submit", function (event) {
    const isValid = [
      validateFullName(true),
      validateUsername(true),
      validateEmail(true),
      validateGender(true),
      validateUniversity(true),
      validateMajor(true),
      validateCurrentPassword(true),
      validateNewPassword(true),
      validateConfirmPassword(true)
    ].every(Boolean);

    if (!isValid) {
      event.preventDefault();
    }
  });
}

//====================================================
// Study list edit logic
//====================================================

const editStudyBtn = document.getElementById("editStudyBtn");
const studyView = document.getElementById("studyView");
const studyEditForm = document.getElementById("studyEditForm");

const originalStudyEditHTML = studyEditForm ? studyEditForm.innerHTML : "";

if (editStudyBtn && studyView && studyEditForm) {
  editStudyBtn.addEventListener("click", () => {
    studyView.classList.add("hidden");
    studyEditForm.classList.remove("hidden");
    editStudyBtn.classList.add("hidden");
  });
}

document.addEventListener("click", (event) => {
  if (!event.target || event.target.id !== "cancelStudyBtn") {
    return;
  }

  if (studyEditForm && originalStudyEditHTML) {
    studyEditForm.innerHTML = originalStudyEditHTML;
  }

  if (studyEditForm) {
    studyEditForm.classList.add("hidden");
  }

  if (studyView) {
    studyView.classList.remove("hidden");
  }

  if (editStudyBtn) {
    editStudyBtn.classList.remove("hidden");
  }
});

function removeProfileSubject(button) {
  const item = button.closest(".profile-removable-subject");
  const list = button.closest(".profile-remove-list");

  if (!item || !list) return;

  item.remove();

  const remainingItems = list.querySelectorAll(".profile-removable-subject");

  if (remainingItems.length === 0) {
    const emptyText = list.dataset.emptyText || "No subjects left.";

    list.innerHTML = `
      <p class="muted-text">${emptyText}</p>
    `;
  }
}

function toggleCompetitionEdit(id) {
  const form = document.getElementById(`competitionEditForm-${id}`);

  if (!form) {
    return;
  }

  form.classList.toggle("hidden");
}

function confirmForfeitCompetition() {
  return confirm("Are you sure? You will be removed from this competition.");
} 