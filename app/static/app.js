const weekInfo = document.getElementById("week-info");
const templateList = document.getElementById("template-list");
const choreList = document.getElementById("chore-list");
const rolloverMessage = document.getElementById("rollover-message");
const toast = document.getElementById("toast");

const templateForm = document.getElementById("template-form");
const weekForm = document.getElementById("week-form");
const dayControls = document.getElementById("day-controls");
const rolloverForm = document.getElementById("rollover-form");

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => {
    toast.className = "";
  }, 3000);
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function refreshWeek() {
  try {
    const week = await fetchJSON("/weeks/active");
    weekInfo.classList.remove("muted");
    weekInfo.innerHTML = `
      <div class="info-grid">
        <span>Week starting</span>
        <strong>${week.week_start}</strong>
        <span>Total pool</span>
        <strong>$${week.total_pool.toFixed(2)}</strong>
        <span>Bonus carryover</span>
        <strong>$${week.bonus_carryover.toFixed(2)}</strong>
        <span>Available amount</span>
        <strong>$${week.available_amount.toFixed(2)}</strong>
      </div>
    `;
  } catch (error) {
    weekInfo.classList.add("muted");
    weekInfo.textContent = "No active week yet.";
  }
}

async function refreshTemplates() {
  const templates = await fetchJSON("/templates");
  if (!templates.length) {
    templateList.classList.add("muted");
    templateList.textContent = "No templates created.";
    return;
  }
  templateList.classList.remove("muted");
  templateList.innerHTML = templates
    .map(
      (template) => `
        <article class="list-item">
          <div>
            <strong>${template.name}</strong>
            <span>${template.difficulty_percentage}% of weekly pool</span>
          </div>
          <span class="status">${template.is_active ? "Active" : "Inactive"}</span>
        </article>
      `
    )
    .join("");
}

function renderChores(chores) {
  if (!chores.length) {
    choreList.classList.add("muted");
    choreList.textContent = "No chores scheduled for the selected day.";
    return;
  }

  choreList.classList.remove("muted");
  choreList.innerHTML = chores
    .map((chore) => {
      const completed = chore.status === "completed";
      const expired = chore.status === "expired";
      const completedBy = chore.completed_by || "Unknown";
      const completedAt = chore.completed_at ? chore.completed_at.replace("T", " ") : "";
      const completedDetails = completedAt ? ` on ${completedAt}` : "";
      const actions = completed
        ? `<div class="meta">Completed by <strong>${completedBy}</strong>${completedDetails}</div>`
        : expired
        ? `<div class="meta">Expired &ndash; reward added to pending bonus.</div>`
        : `
            <div class="action-row">
              <input type="text" placeholder="Member name" data-input="${chore.id}" />
              <button data-complete="${chore.id}">Mark Complete</button>
            </div>
          `;
      return `
        <article class="list-item">
          <div>
            <strong>${chore.name}</strong>
            <span>${chore.difficulty_percentage}% &middot; Reward $${chore.reward_amount.toFixed(
              2
            )}</span>
          </div>
          <span class="status ${chore.status}">${chore.status}</span>
          ${actions}
        </article>
      `;
    })
    .join("");
}

async function refreshChores() {
  const formData = new FormData(dayControls);
  const date = formData.get("date") || todayISO();
  const status = formData.get("status") || "pending";
  try {
    const chores = await fetchJSON(
      `/chores?target_date=${encodeURIComponent(date)}&status=${encodeURIComponent(status)}`
    );
    renderChores(chores);
  } catch (error) {
    showToast("Unable to load chores", "error");
    console.error(error);
  }
}

async function distributeChores() {
  const formData = new FormData(dayControls);
  const date = formData.get("date") || todayISO();
  try {
    await fetchJSON("/chores/distribute", {
      method: "POST",
      body: JSON.stringify({ date }),
    });
    showToast("Chores distributed", "success");
    await refreshChores();
  } catch (error) {
    showToast("Unable to distribute chores", "error");
    console.error(error);
  }
}

async function handleChoreComplete(choreId) {
  const input = choreList.querySelector(`input[data-input='${choreId}']`);
  const memberName = input?.value?.trim();
  if (!memberName) {
    showToast("Enter who completed the chore first", "error");
    input?.focus();
    return;
  }
  try {
    await fetchJSON(`/chores/${choreId}/complete`, {
      method: "POST",
      body: JSON.stringify({ member_name: memberName }),
    });
    showToast("Chore marked complete", "success");
    await refreshChores();
    await refreshWeek();
  } catch (error) {
    showToast("Unable to complete chore", "error");
    console.error(error);
  }
}

function wireChoreActions() {
  choreList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-complete]");
    if (!button) return;
    const choreId = button.getAttribute("data-complete");
    handleChoreComplete(choreId);
  });
}

function setupForms() {
  templateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(templateForm).entries());
    data.difficulty_percentage = Number(data.difficulty_percentage);
    try {
      await fetchJSON("/templates", { method: "POST", body: JSON.stringify(data) });
      templateForm.reset();
      showToast("Template created", "success");
      await refreshTemplates();
    } catch (error) {
      showToast("Unable to create template", "error");
      console.error(error);
    }
  });

  weekForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(weekForm).entries());
    data.base_amount = Number(data.base_amount);
    try {
      await fetchJSON("/weeks/start", { method: "POST", body: JSON.stringify(data) });
      showToast("Week activated", "success");
      await refreshWeek();
    } catch (error) {
      showToast("Unable to start week", "error");
      console.error(error);
    }
  });

  dayControls.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "load") {
      await refreshChores();
    }
    if (action === "distribute") {
      await distributeChores();
      await refreshWeek();
    }
  });

  rolloverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(rolloverForm).entries());
    try {
      const result = await fetchJSON("/chores/rollover", {
        method: "POST",
        body: JSON.stringify(data),
      });
      rolloverMessage.classList.remove("muted");
      rolloverMessage.textContent = result.message;
      showToast("Rollover processed", "success");
      await refreshWeek();
      await refreshChores();
    } catch (error) {
      showToast("Unable to rollover", "error");
      console.error(error);
    }
  });
}

function initialise() {
  const dateInputs = document.querySelectorAll("input[type='date']");
  dateInputs.forEach((input) => {
    if (!input.value) {
      input.value = todayISO();
    }
  });

  wireChoreActions();
  setupForms();
  refreshWeek();
  refreshTemplates();
  refreshChores();
}

document.addEventListener("DOMContentLoaded", initialise);
