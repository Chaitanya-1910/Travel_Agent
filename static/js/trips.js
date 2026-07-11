/**
 * TravelAI — My Trips Page JavaScript
 * Loads, filters, searches, and manages saved trips.
 */

"use strict";

let allTrips = [];
let activeFilter = "all";
let currentModalTripId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadTrips();

  // Filter tabs
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter;
      renderTrips(getFilteredTrips());
    });
  });

  // Search
  document.getElementById("tripsSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = getFilteredTrips().filter(t =>
      (t.destination || "").toLowerCase().includes(q)
    );
    renderTrips(filtered);
  });

  // Modal result tabs
  document.getElementById("modalResultTabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    document.querySelectorAll("#modalResultTabs .nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderModalTab(btn.dataset.tab);
  });
});

// ── Load all trips ────────────────────────────────────────────────────────────
async function loadTrips() {
  try {
    const data = await apiGet("/api/trips");
    document.getElementById("tripsLoading").classList.add("d-none");

    if (!data.success) { showTripsEmpty(); return; }

    allTrips = data.trips || [];
    updateCounts();
    renderTrips(allTrips);
  } catch (err) {
    console.error("Load trips error:", err);
    document.getElementById("tripsLoading").classList.add("d-none");
    showTripsEmpty();
  }
}

// ── Update filter counts ──────────────────────────────────────────────────────
function updateCounts() {
  const saved = allTrips.filter(t => t.saved).length;
  const fav = allTrips.filter(t => t.favorite).length;
  document.getElementById("countAll").textContent = allTrips.length;
  document.getElementById("countSaved").textContent = saved;
  document.getElementById("countFav").textContent = fav;
}

// ── Get filtered trips ────────────────────────────────────────────────────────
function getFilteredTrips() {
  if (activeFilter === "saved") return allTrips.filter(t => t.saved);
  if (activeFilter === "favorite") return allTrips.filter(t => t.favorite);
  return allTrips;
}

// ── Render trips grid ─────────────────────────────────────────────────────────
function renderTrips(trips) {
  const grid = document.getElementById("tripsGrid");
  const empty = document.getElementById("tripsEmpty");
  if (!grid) return;

  if (!trips.length) {
    grid.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }
  empty.classList.add("d-none");

  const gradients = [
    "linear-gradient(135deg,#667eea,#764ba2)",
    "linear-gradient(135deg,#f093fb,#f5576c)",
    "linear-gradient(135deg,#4facfe,#00f2fe)",
    "linear-gradient(135deg,#43e97b,#38f9d7)",
    "linear-gradient(135deg,#fa709a,#fee140)",
    "linear-gradient(135deg,#a18cd1,#fbc2eb)",
    "linear-gradient(135deg,#0093e9,#80d0c7)",
    "linear-gradient(135deg,#ff9a9e,#fad0c4)",
  ];
  const icons = ["fas fa-map-marked-alt","fas fa-plane","fas fa-globe-americas","fas fa-mountain","fas fa-umbrella-beach","fas fa-city","fas fa-torii-gate","fas fa-monument"];

  grid.innerHTML = trips.map((trip, idx) => {
    const grad = gradients[idx % gradients.length];
    const icon = icons[idx % icons.length];
    const dateStr = trip.start_date ? formatDate(trip.start_date) : "Flexible dates";

    return `
    <div class="col-lg-4 col-md-6">
      <div class="trip-card" onclick="openTripModal('${escHtml(trip.trip_id)}')">
        <div class="tc-header" style="background:${grad}">
          <i class="${icon} tc-header-bg"></i>
          <div class="tc-header-content">
            <div class="tc-dest">${escHtml(trip.destination || "Unknown")}</div>
          </div>
        </div>
        <div class="tc-body">
          <div class="tc-meta">
            <span class="tc-meta-item"><i class="fas fa-calendar me-1"></i>${escHtml(dateStr)}</span>
            <span class="tc-meta-item"><i class="fas fa-clock me-1"></i>${escHtml(trip.duration || "")}</span>
            <span class="tc-meta-item"><i class="fas fa-users me-1"></i>${trip.travelers || 1} traveller${trip.travelers > 1 ? "s" : ""}</span>
            ${trip.budget ? `<span class="tc-meta-item"><i class="fas fa-dollar-sign me-1"></i>${escHtml(trip.budget)}</span>` : ""}
          </div>
          <div class="tc-actions">
            <button class="tc-btn ${trip.saved ? "active" : ""}" onclick="event.stopPropagation();toggleSave('${escHtml(trip.trip_id)}',this)">
              <i class="fas fa-bookmark"></i>${trip.saved ? "Saved" : "Save"}
            </button>
            <button class="tc-btn ${trip.favorite ? "active" : ""}" onclick="event.stopPropagation();toggleFav('${escHtml(trip.trip_id)}',this)">
              <i class="fas fa-heart"></i>${trip.favorite ? "Fav'd" : "Favourite"}
            </button>
            <button class="tc-btn" onclick="event.stopPropagation();exportPdf('${escHtml(trip.trip_id)}')">
              <i class="fas fa-file-pdf"></i>PDF
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ── Show empty state ──────────────────────────────────────────────────────────
function showTripsEmpty() {
  document.getElementById("tripsEmpty").classList.remove("d-none");
}

// ── Toggle save ───────────────────────────────────────────────────────────────
async function toggleSave(tripId, btn) {
  try {
    const data = await fetch(`/api/trips/${tripId}/save`, { method: "POST" });
    const json = await data.json();
    if (json.success) {
      const trip = allTrips.find(t => t.trip_id === tripId);
      if (trip) trip.saved = json.saved;
      updateCounts();
      if (btn) {
        btn.innerHTML = `<i class="fas fa-bookmark"></i>${json.saved ? "Saved" : "Save"}`;
        btn.classList.toggle("active", json.saved);
      }
      showToast(json.saved ? "Trip saved! 📌" : "Trip unsaved.", "success");
    }
  } catch (e) { showToast("Error saving trip.", "error"); }
}
window.toggleSave = toggleSave;

// ── Toggle favourite ──────────────────────────────────────────────────────────
async function toggleFav(tripId, btn) {
  try {
    const data = await fetch(`/api/trips/${tripId}/favorite`, { method: "POST" });
    const json = await data.json();
    if (json.success) {
      const trip = allTrips.find(t => t.trip_id === tripId);
      if (trip) trip.favorite = json.favorite;
      updateCounts();
      if (btn) {
        btn.innerHTML = `<i class="fas fa-heart"></i>${json.favorite ? "Fav'd" : "Favourite"}`;
        btn.classList.toggle("active", json.favorite);
      }
      showToast(json.favorite ? "Added to favourites! ❤️" : "Removed from favourites.", "success");
    }
  } catch (e) { showToast("Error updating favourite.", "error"); }
}
window.toggleFav = toggleFav;

// ── Export PDF ────────────────────────────────────────────────────────────────
function exportPdf(tripId) {
  showToast("Generating PDF...", "success");
  window.open(`/api/trips/${tripId}/export-pdf`, "_blank");
}
window.exportPdf = exportPdf;

// ── Open trip modal ───────────────────────────────────────────────────────────
async function openTripModal(tripId) {
  currentModalTripId = tripId;
  try {
    const data = await apiGet(`/api/trips/${tripId}`);
    if (!data.success) { showToast("Trip not found.", "error"); return; }

    const trip = data.trip;
    const details = trip.details || {};

    document.getElementById("modalTripTitle").textContent = `✈️ ${details.destination || "Trip Details"}`;
    document.getElementById("modalTripMeta").innerHTML = [
      details.duration && `${details.duration}`,
      details.travelers && `${details.travelers} travellers`,
      details.budget && `Budget: ${details.budget}`,
    ].filter(Boolean).join(" · ");

    // Bind modal action buttons
    const saveBtn = document.getElementById("modalSaveBtn");
    const favBtn = document.getElementById("modalFavBtn");
    const exportBtn = document.getElementById("modalExportBtn");

    if (saveBtn) saveBtn.onclick = () => toggleSave(tripId, null);
    if (favBtn) favBtn.onclick = () => toggleFav(tripId, null);
    if (exportBtn) exportBtn.onclick = () => exportPdf(tripId);

    // Store results for tab rendering
    window._modalResults = trip.results || {};

    // Reset to first tab
    document.querySelectorAll("#modalResultTabs .nav-link").forEach(b => b.classList.remove("active"));
    document.querySelector("#modalResultTabs .nav-link")?.classList.add("active");
    renderModalTab("itinerary");

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById("tripDetailModal"));
    modal.show();
  } catch (err) {
    showToast("Failed to load trip.", "error");
    console.error(err);
  }
}
window.openTripModal = openTripModal;

// ── Render modal tab ──────────────────────────────────────────────────────────
function renderModalTab(tabKey) {
  const results = window._modalResults || {};
  const content = results[tabKey] || "";
  const container = document.getElementById("modalResultContent");
  if (container) container.innerHTML = markdownToHtml(content);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
