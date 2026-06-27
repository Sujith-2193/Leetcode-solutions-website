const loginView = document.querySelector("#loginView");
const adminView = document.querySelector("#adminView");
const loginForm = document.querySelector("#loginForm");
const logoutBtn = document.querySelector("#logoutBtn");
const statusEl = document.querySelector("#status");
const importBtn = document.querySelector("#importBtn");
const solutionForm = document.querySelector("#solutionForm");
const refreshBtn = document.querySelector("#refreshAnalytics");
const totalViews = document.querySelector("#totalViews");
const todayViews = document.querySelector("#todayViews");
const totalSolutions = document.querySelector("#totalSolutions");
const dayRows = document.querySelector("#dayRows");
const questionRows = document.querySelector("#questionRows");
const existingRows = document.querySelector("#existingRows");

const fields = {
  questionNumber: document.querySelector("#questionNumber"),
  title: document.querySelector("#title"),
  slug: document.querySelector("#slug"),
  difficulty: document.querySelector("#difficulty"),
  tags: document.querySelector("#tagsInput"),
  content: document.querySelector("#content"),
  date: document.querySelector("#date"),
  approach: document.querySelector("#approachInput"),
  complexity: document.querySelector("#complexity"),
  cpp: document.querySelector("#cppCode"),
  python: document.querySelector("#pythonCode"),
  java: document.querySelector("#javaCode")
};

function setStatus(message, ok = true) {
  statusEl.textContent = message;
  statusEl.style.color = ok ? "#96a0b5" : "#ff8da1";
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showAdmin(show) {
  loginView.classList.toggle("hidden", show);
  adminView.classList.toggle("hidden", !show);
}

function fillForm(solution) {
  fields.questionNumber.value = solution.questionNumber || "";
  fields.title.value = solution.title || "";
  fields.slug.value = solution.slug || "";
  fields.difficulty.value = solution.difficulty || "Medium";
  fields.tags.value = (solution.tags || []).join(", ");
  fields.content.value = solution.content || "";
  fields.date.value = solution.date || new Date().toISOString().slice(0, 10);
  fields.approach.value = solution.approach || "";
  fields.complexity.value = solution.complexity || "";
  fields.cpp.value = solution.code?.cpp || "";
  fields.python.value = solution.code?.python || "";
  fields.java.value = solution.code?.java || "";
}

function readForm() {
  return {
    questionNumber: Number(fields.questionNumber.value),
    title: fields.title.value.trim(),
    slug: fields.slug.value.trim(),
    difficulty: fields.difficulty.value,
    tags: fields.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    content: fields.content.value,
    date: fields.date.value,
    approach: fields.approach.value,
    complexity: fields.complexity.value,
    code: {
      cpp: fields.cpp.value,
      python: fields.python.value,
      java: fields.java.value
    }
  };
}

async function loadExisting() {
  const { solutions } = await api("/api/solutions");
  totalSolutions.textContent = solutions.length;
  existingRows.innerHTML = solutions
    .map(
      (solution) => `
        <tr>
          <td>${solution.questionNumber}</td>
          <td>${escapeHtml(solution.title)}</td>
          <td>${escapeHtml(solution.date)}</td>
          <td><button class="btn ghost" data-id="${solution.id}">Edit</button></td>
        </tr>
      `
    )
    .join("");

  existingRows.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const { solution } = await api(`/api/solutions/${button.dataset.id}`);
      fillForm(solution);
      setStatus(`Editing ${solution.questionNumber}. ${solution.title}`);
    });
  });
}

async function loadAnalytics() {
  const analytics = await api("/api/admin/analytics");
  const today = new Date().toISOString().slice(0, 10);
  totalViews.textContent = analytics.totalViews;
  todayViews.textContent = analytics.viewsPerDay.find((day) => day.day === today)?.views || 0;
  dayRows.innerHTML = analytics.viewsPerDay.length
    ? analytics.viewsPerDay.map((day) => `<tr><td>${day.day}</td><td>${day.views}</td></tr>`).join("")
    : `<tr><td colspan="2" class="muted">No views yet.</td></tr>`;
  questionRows.innerHTML = analytics.questionViews.length
    ? analytics.questionViews
        .map(
          (item) => `
            <tr>
              <td>${item.questionNumber}. ${escapeHtml(item.title)}</td>
              <td>${item.totalViews}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="2" class="muted">No solutions yet.</td></tr>`;
}

async function boot() {
  const me = await api("/api/auth/me");
  showAdmin(me.admin);
  if (me.admin) {
    fields.date.value = new Date().toISOString().slice(0, 10);
    await Promise.all([loadExisting(), loadAnalytics()]);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#password").value })
    });
    showAdmin(true);
    setStatus("Logged in.");
    await Promise.all([loadExisting(), loadAnalytics()]);
  } catch (error) {
    document.querySelector("#loginError").textContent = error.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  showAdmin(false);
});

importBtn.addEventListener("click", async () => {
  try {
    setStatus("Importing from LeetCode...");
    const { question } = await api("/api/admin/import", {
      method: "POST",
      body: JSON.stringify({ questionNumber: fields.questionNumber.value })
    });
    fields.title.value = question.title;
    fields.slug.value = question.slug;
    fields.difficulty.value = question.difficulty;
    fields.tags.value = question.tags.join(", ");
    fields.content.value = question.content;
    if (!fields.date.value) fields.date.value = new Date().toISOString().slice(0, 10);
    setStatus(`Imported ${question.questionNumber}. ${question.title}`);
  } catch (error) {
    setStatus(error.message, false);
  }
});

solutionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Saving solution...");
    const { solution } = await api("/api/admin/solutions", {
      method: "POST",
      body: JSON.stringify(readForm())
    });
    setStatus(`Saved ${solution.questionNumber}. ${solution.title}`);
    await Promise.all([loadExisting(), loadAnalytics()]);
  } catch (error) {
    setStatus(error.message, false);
  }
});

refreshBtn.addEventListener("click", async () => {
  await Promise.all([loadExisting(), loadAnalytics()]);
  setStatus("Analytics refreshed.");
});

boot().catch((error) => {
  showAdmin(false);
  document.querySelector("#loginError").textContent = error.message;
});
