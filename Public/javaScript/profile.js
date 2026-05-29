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
const cancelStudyBtn = document.getElementById("cancelStudyBtn");
const studyView = document.getElementById("studyView");
const studyEditForm = document.getElementById("studyEditForm");

if (editStudyBtn && cancelStudyBtn && studyView && studyEditForm) {
  editStudyBtn.addEventListener("click", () => {
    studyView.classList.add("hidden");
    studyEditForm.classList.remove("hidden");
    editStudyBtn.classList.add("hidden");
  });

  cancelStudyBtn.addEventListener("click", () => {
    studyEditForm.classList.add("hidden");
    studyView.classList.remove("hidden");
    editStudyBtn.classList.remove("hidden");
  });
}

function toggleCompetitionEdit(id) {
  const form = document.getElementById(`competitionEditForm-${id}`);

  if (!form) {
    return;
  }

  form.classList.toggle("hidden");
}