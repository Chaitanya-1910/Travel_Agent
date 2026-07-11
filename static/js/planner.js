/**
 * TravelAI — Planner Page JavaScript
 * Handles the trip planner form, API calls, result rendering, and PDF export.
 */

"use strict";

let currentTripId = null;
let currentResults = null;

// ── Pre-fill from URL params ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  const setVal = (id, key) => {
    const val = params.get(key);
    const el = document.getElementById(id);
    if (val && el) el.value = val;
  };
  setVal("destination", "destination");
  setVal("duration", "duration");
  setVal("budget", "budget");

  // ── Interest tag toggling (supports both old .interest-tag and new .pp-interest)
  document.querySelectorAll(".interest-tag, .pp-interest").forEach(tag => {
    tag.addEventListener("click", () => {
      tag.classList.toggle("active");
      updateInterestsHidden();
    });
  });

  // ── Budget preset clicking (supports both old .budget-preset and new .pp-budget-pill)
  document.querySelectorAll(".budget-preset, .pp-budget-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".budget-preset, .pp-budget-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("budget").value = btn.dataset.val;
    });
  });

  // ── Result tab switching ──────────────────────────────────────────────────
  document.getElementById("resultTabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn || !currentResults) return;
    document.querySelectorAll("#resultTabs .nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderResultTab(btn.dataset.tab);
  });

  // ── Date auto-fill duration ───────────────────────────────────────────────
  document.getElementById("startDate")?.addEventListener("change", () => {
    const start = document.getElementById("startDate").value;
    const durationSel = document.getElementById("duration");
    if (start && durationSel) {
      const days = parseInt(durationSel.value) || 7;
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + days);
      document.getElementById("endDate").value = endDate.toISOString().split("T")[0];
    }
  });

  // ── Form submit ───────────────────────────────────────────────────────────
  document.getElementById("tripPlannerForm")?.addEventListener("submit", submitTripPlan);
});

// ── Update hidden interests field ─────────────────────────────────────────────
function updateInterestsHidden() {
  const active = Array.from(document.querySelectorAll(".interest-tag.active")).map(t => t.dataset.val);
  const hidden = document.getElementById("interestsHidden");
  if (hidden) hidden.value = active.join(", ") || "sightseeing";
}

// ── Submit trip plan ──────────────────────────────────────────────────────────
async function submitTripPlan(e) {
  e.preventDefault();
  updateInterestsHidden();

  const form = e.target;
  const destination = document.getElementById("destination").value.trim();
  if (!destination) {
    showToast("Please enter a destination.", "error");
    return;
  }

  // Build payload
  const payload = {
    destination,
    from_location: document.getElementById("fromLocation").value,
    start_date: document.getElementById("startDate").value,
    end_date: document.getElementById("endDate").value,
    duration: document.getElementById("duration").value,
    travelers: parseInt(document.getElementById("travelers").value) || 2,
    budget: document.getElementById("budget").value || "moderate",
    interests: document.getElementById("interestsHidden").value,
    travel_style: document.getElementById("travelStyle").value,
    accommodation: document.getElementById("accommodation").value,
    dietary: document.getElementById("dietary").value,
  };

  // Show loading
  showLoadingState(destination);

  // Start progress UI — ticks every 2s to match parallel agent timing (~15s total)
  const progressStop = startAgentProgress();

  try {
    const data = await apiPost("/api/plan-trip", payload);

    // Stop progress and complete all agents
    progressStop(true);

    if (!data.success) {
      showToast(data.error || "Failed to plan trip.", "error");
      resetToEmpty();
      return;
    }

    currentTripId = data.trip_id;
    currentResults = data.results;

    renderResults(destination, payload, data.results);
    showToast(`✈️ Trip to ${destination} planned successfully!`, "success");

  } catch (err) {
    progressStop(false);
    showToast("Network error. Please try again.", "error");
    resetToEmpty();
    console.error("Trip planning error:", err);
  }
}

// ── Loading state ─────────────────────────────────────────────────────────────
function showLoadingState(destination) {
  document.getElementById("emptyState").classList.add("d-none");
  document.getElementById("resultsState").classList.add("d-none");
  document.getElementById("loadingState").classList.remove("d-none");
  document.getElementById("planSubmitBtn").disabled = true;
}

function resetToEmpty() {
  document.getElementById("loadingState").classList.add("d-none");
  document.getElementById("emptyState").classList.remove("d-none");
  document.getElementById("planSubmitBtn").disabled = false;
}

// ── Agent progress — all agents run in parallel, animate concurrently ─────────
function startAgentProgress() {
  const agents = document.querySelectorAll(".progress-agent");
  const total = agents.length;
  if (!total) return () => {};

  // Show all agents as running immediately (they run in parallel on the server)
  agents.forEach(a => setAgentState(a, "running"));

  let current = 0;
  // Tick every ~2s to show visual progress across ~15s total
  const TICK_MS = 2000;

  const timer = setInterval(() => {
    if (current < total) {
      setAgentState(agents[current], "done");
      current++;
    } else {
      clearInterval(timer);
    }
  }, TICK_MS);

  // Returns a cleanup: pass true = all done, false = error
  return function stop(success) {
    clearInterval(timer);
    if (success) agents.forEach(a => setAgentState(a, "done"));
  };
}

function setAgentState(el, state) {
  if (!el) return;
  const status = el.querySelector(".pa-status");
  if (!status) return;
  if (state === "running") {
    el.classList.remove("done");
    status.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
  } else if (state === "done") {
    el.classList.add("done");
    status.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
  }
}

// ── Render results ────────────────────────────────────────────────────────────
function renderResults(destination, details, results) {
  document.getElementById("loadingState").classList.add("d-none");
  document.getElementById("emptyState").classList.add("d-none");
  const resultsState = document.getElementById("resultsState");
  resultsState.classList.remove("d-none");

  // Trip header
  document.getElementById("resultDestName").textContent = `✈️ ${destination}`;
  const meta = document.getElementById("resultMeta");
  meta.innerHTML = [
    details.duration && `<span class="rh-meta-item"><i class="fas fa-clock me-1 text-primary"></i>${details.duration}</span>`,
    details.travelers && `<span class="rh-meta-item"><i class="fas fa-users me-1 text-primary"></i>${details.travelers} traveller${details.travelers > 1 ? "s" : ""}</span>`,
    details.budget && `<span class="rh-meta-item"><i class="fas fa-dollar-sign me-1 text-primary"></i>${details.budget}</span>`,
    details.travel_style && `<span class="rh-meta-item"><i class="fas fa-compass me-1 text-primary"></i>${details.travel_style}</span>`,
  ].filter(Boolean).join("");

  // Show first tab
  renderResultTab("itinerary");

  document.getElementById("planSubmitBtn").disabled = false;

  // Scroll to results
  setTimeout(() => {
    document.getElementById("resultsState").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
}

// ── Render a single tab content ────────────────────────────────────────────────
function renderResultTab(tabKey) {
  if (!currentResults) return;
  const container = document.getElementById("resultContent");
  const content = currentResults[tabKey] || "";
  container.innerHTML = markdownToHtml(content);
}

// ── Save & Export ─────────────────────────────────────────────────────────────
async function saveCurrentTrip() {
  if (!currentTripId) return;
  try {
    const data = await fetch(`/api/trips/${currentTripId}/save`, { method: "POST" });
    const json = await data.json();
    if (json.success) {
      showToast(json.saved ? "Trip saved! 📌" : "Trip unsaved.", "success");
      const btn = document.getElementById("saveBtn");
      if (btn) btn.innerHTML = json.saved
        ? '<i class="fas fa-bookmark me-1"></i>Saved ✓'
        : '<i class="fas fa-bookmark me-1"></i>Save';
    }
  } catch (e) {
    showToast("Failed to save trip.", "error");
  }
}
window.saveCurrentTrip = saveCurrentTrip;

async function exportCurrentPdf() {
  if (!currentTripId) return;
  showToast("Generating PDF...", "success");
  window.open(`/api/trips/${currentTripId}/export-pdf`, "_blank");
}
window.exportCurrentPdf = exportCurrentPdf;
