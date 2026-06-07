const editInfoBtn = document.getElementById("editInfoBtn");
const cancelInfoBtn = document.getElementById("cancelInfoBtn");
const infoView = document.getElementById("infoView");
const infoEditForm = document.getElementById("infoEditForm");

if (editInfoBtn && cancelInfoBtn && infoView && infoEditForm) {
  editInfoBtn.addEventListener("click", () => {
    infoView.classList.add("hidden");
    infoEditForm.classList.remove("hidden");
    editInfoBtn.classList.add("hidden");
  });

  cancelInfoBtn.addEventListener("click", () => {
    infoEditForm.classList.add("hidden");
    infoView.classList.remove("hidden");
    editInfoBtn.classList.remove("hidden");
  });
}

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