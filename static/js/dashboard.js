/**
 * TravelAI — Dashboard JavaScript
 * Loads trip stats, handles quick plan form, and destination cards.
 */

"use strict";

// ── Destination emoji map ────────────────────────────────────────────────────
const DEST_ICONS = {
  japan: "🇯🇵", tokyo: "🇯🇵", paris: "🇫🇷", france: "🇫🇷",
  bali: "🇮🇩", indonesia: "🇮🇩", "new york": "🇺🇸", usa: "🇺🇸",
  dubai: "🇦🇪", uae: "🇦🇪", santorini: "🇬🇷", greece: "🇬🇷",
  maldives: "🇲🇻", rome: "🇮🇹", italy: "🇮🇹", london: "🇬🇧",
  spain: "🇪🇸", barcelona: "🇪🇸", thailand: "🇹🇭", bangkok: "🇹🇭",
  singapore: "🇸🇬", australia: "🇦🇺", sydney: "🇦🇺", canada: "🇨🇦",
  mexico: "🇲🇽", brazil: "🇧🇷", india: "🇮🇳", "new delhi": "🇮🇳",
};
function destEmoji(destination) {
  if (!destination) return "✈️";
  const lower = destination.toLowerCase();
  for (const [key, emoji] of Object.entries(DEST_ICONS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🌍";
}

// ── Trip status helper ────────────────────────────────────────────────────────
function tripStatus(startDate, endDate) {
  if (!startDate) return { label: "Planned", cls: "badge-planned" };
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (end && now > end) return { label: "Completed", cls: "badge-completed" };
  if (now >= start && (!end || now <= end)) return { label: "Ongoing", cls: "badge-ongoing" };
  const daysUntil = Math.ceil((start - now) / 86400000);
  if (daysUntil <= 30) return { label: `In ${daysUntil}d`, cls: "badge-soon" };
  return { label: "Upcoming", cls: "badge-upcoming" };
}

// ── Extract short AI insight from trip results ────────────────────────────────
function extractAiInsight(trip) {
  const results = trip.results || {};
  // Try to pull first meaningful sentence from itinerary or budget
  const src = results.itinerary || results.budget_plan || results.weather || "";
  if (!src) return null;
  // Grab text after first heading or first real sentence
  const match = src.replace(/\*\*.*?\*\*/g, "").replace(/#+\s.*/g, "").match(/([A-Z][^.!?]{30,120}[.!?])/);
  return match ? match[1].trim() : null;
}

// ── Load dashboard data ───────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await apiGet("/api/trips");
    if (!data.success) return;

    const trips = data.trips || [];
    const favorites = trips.filter(t => t.favorite).length;

    // Update stat counters
    animateCount("totalTripsCount", trips.length);
    animateCount("favoritesCount", favorites);

    // Populate recent trips widget — sort by created_at desc, show latest 4
    const sorted = [...trips].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderDashboardTrips(sorted.slice(0, 4), trips.length);
  } catch (e) {
    console.error("Dashboard load error:", e);
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

async function renderDashboardTrips(trips, totalCount) {
  const container = document.getElementById("dashboardTrips");
  if (!container) return;

  if (!trips.length) return; // keep empty state HTML

  // Fetch full details for AI insight (parallel, best-effort)
  const detailMap = {};
  await Promise.allSettled(trips.map(async (t) => {
    try {
      const d = await apiGet(`/api/trips/${t.trip_id}`);
      if (d.success) detailMap[t.trip_id] = d.trip;
    } catch (_) {}
  }));

  container.innerHTML = `
    <div class="glance-trips-grid">
      ${trips.map(t => {
        const detail = detailMap[t.trip_id];
        const status = tripStatus(t.start_date, t.end_date);
        const emoji = destEmoji(t.destination);
        const insight = detail ? extractAiInsight(detail) : null;
        const budget = t.budget ? `$${String(t.budget).replace(/[^0-9]/g,"")}` : null;
        const travelers = t.travelers || null;

        return `
        <div class="glance-trip-card" onclick="window.location.href='/trips'" style="cursor:pointer" title="View trip details">
          <div class="gtc-top">
            <div class="gtc-emoji">${emoji}</div>
            <div class="gtc-meta">
              <div class="gtc-dest">${escHtml(t.destination || "Unknown Destination")}</div>
              <div class="gtc-sub">
                ${t.start_date ? `<span><i class="fas fa-calendar-alt"></i> ${formatDate(t.start_date)}</span>` : ""}
                ${t.duration ? `<span><i class="fas fa-clock"></i> ${escHtml(t.duration)}</span>` : ""}
              </div>
            </div>
            <div class="gtc-badges">
              <span class="gtc-status ${status.cls}">${status.label}</span>
              ${t.favorite ? '<span class="gtc-fav"><i class="fas fa-heart"></i></span>' : ""}
            </div>
          </div>
          <div class="gtc-chips">
            ${budget ? `<span class="gtc-chip chip-budget"><i class="fas fa-wallet"></i> ${budget}</span>` : ""}
            ${travelers ? `<span class="gtc-chip chip-travelers"><i class="fas fa-users"></i> ${travelers} traveller${travelers > 1 ? "s" : ""}</span>` : ""}
            <span class="gtc-chip chip-time"><i class="fas fa-robot"></i> AI Planned · ${timeAgo(t.created_at)}</span>
          </div>
          ${insight ? `<div class="gtc-insight"><i class="fas fa-lightbulb"></i> ${escHtml(insight)}</div>` : ""}
        </div>`;
      }).join("")}
    </div>
    <a href="/trips" class="glance-view-all">
      <i class="fas fa-th-list me-1"></i>View all ${totalCount} trip${totalCount !== 1 ? "s" : ""} →
    </a>`;
}

// ── Quick Plan Form ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  const form = document.getElementById("quickPlanForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dest = document.getElementById("qDestination").value.trim();
      const duration = document.getElementById("qDuration").value;
      const budget = document.getElementById("qBudget").value.trim();

      if (!dest) {
        showToast("Please enter a destination.", "error");
        return;
      }

      // Redirect to planner with pre-filled params
      const params = new URLSearchParams({ destination: dest, duration, budget });
      window.location.href = `/planner?${params}`;
    });
  }

  // ── Budget presets on quick form ──────────────────────────────────────────
  document.querySelectorAll(".budget-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".budget-preset").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const budgetInput = document.getElementById("qBudget") || document.getElementById("budget");
      if (budgetInput) budgetInput.value = btn.dataset.val;
    });
  });
});

// ── Quick plan from destination card ─────────────────────────────────────────
function quickPlanDest(destName) {
  window.location.href = `/planner?destination=${encodeURIComponent(destName)}`;
}
window.quickPlanDest = quickPlanDest;

// ── Tiny HTML escaper ─────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
window.escHtml = escHtml;
