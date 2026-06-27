const state = {
  solutions: [],
  current: null,
  lang: "cpp"
};

const els = {
  list: document.querySelector("#solutionList"),
  search: document.querySelector("#questionSearch"),
  searchBtn: document.querySelector("#searchBtn"),
  question: document.querySelector("#question"),
  approach: document.querySelector("#approach"),
  title: document.querySelector("#questionTitle"),
  tags: document.querySelector("#tags"),
  leetLink: document.querySelector("#leetLink"),
  code: document.querySelector("#code"),
  tabs: document.querySelectorAll(".tab"),
  copy: document.querySelector("#copyCode")
};

async function api(path) {
  const res = await fetch(path);
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

function renderList() {
  els.list.innerHTML = state.solutions
    .map(
      (item) => `
        <button class="pill" data-id="${item.id}" title="${escapeHtml(item.title)}">
          ${item.questionNumber}. ${escapeHtml(item.title)}
        </button>
      `
    )
    .join("");

  els.list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => loadSolution(button.dataset.id));
  });
}

function renderSolution() {
  const solution = state.current;
  if (!solution) {
    els.question.innerHTML = `<div class="empty">No solution selected.</div>`;
    els.approach.innerHTML = `<div class="empty">Choose a problem to view the approach.</div>`;
    els.code.textContent = "";
    return;
  }

  const difficultyClass = solution.difficulty.toLowerCase();
  els.title.innerHTML = `
    <h2>${solution.questionNumber}. ${escapeHtml(solution.title)}</h2>
    <span class="pill difficulty ${difficultyClass}">${escapeHtml(solution.difficulty)}</span>
  `;
  els.tags.innerHTML = solution.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  els.question.innerHTML = `<div class="prose">${solution.content || "<p>No imported LeetCode statement yet.</p>"}</div>`;
  els.approach.innerHTML = `
    <div class="prose">
      <h3>Intuition</h3>
      <p>${escapeHtml(solution.approach).replaceAll("\n", "<br>") || "No approach has been posted yet."}</p>
      <h3>Complexity</h3>
      <p>${escapeHtml(solution.complexity).replaceAll("\n", "<br>") || "No complexity notes yet."}</p>
    </div>
  `;
  els.leetLink.href = `https://leetcode.com/problems/${solution.slug}/`;
  els.code.textContent = solution.code?.[state.lang] || "// No code posted for this language yet.";
}

async function loadSolution(id) {
  const { solution } = await api(`/api/solutions/${encodeURIComponent(id)}`);
  state.current = solution;
  history.replaceState(null, "", `/?q=${solution.questionNumber}`);
  renderSolution();
}

async function boot() {
  const { solutions } = await api("/api/solutions");
  state.solutions = solutions;
  renderList();
  const params = new URLSearchParams(location.search);
  const wanted = params.get("q") || solutions[0]?.id;
  if (wanted) await loadSolution(wanted);
}

els.searchBtn.addEventListener("click", async () => {
  const value = els.search.value.trim();
  if (!value) return;
  await loadSolution(value);
});

els.search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") els.searchBtn.click();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.lang = tab.dataset.lang;
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    renderSolution();
  });
});

els.copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.code.textContent);
  els.copy.textContent = "Copied";
  setTimeout(() => (els.copy.textContent = "Copy Code"), 1100);
});

boot().catch((error) => {
  els.question.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});
