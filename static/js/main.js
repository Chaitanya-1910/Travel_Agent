/**
 * TravelAI — Main JavaScript
 * Global utilities, theme toggle, navbar scroll, toast notifications,
 * scroll animations, and shared helpers.
 */

"use strict";

// ── Theme Toggle ─────────────────────────────────────────────────────────────
const THEME_KEY = "travelai-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(preferred);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // ── Navbar scroll effect ──────────────────────────────────────────────────
  const nav = document.getElementById("mainNav");
  if (nav) {
    const handleScroll = () => {
      nav.classList.toggle("scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }

  // ── Reveal on scroll ──────────────────────────────────────────────────────
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // ── Add reveal class to eligible elements ─────────────────────────────────
  document.querySelectorAll(
    ".agent-card, .dest-card, .how-card, .stat-card, .dashboard-card, .trip-card"
  ).forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(i % 4) * 0.08}s`;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
  });
});

// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const toastEl = document.getElementById("appToast");
  const toastMsg = document.getElementById("toastMessage");
  if (!toastEl || !toastMsg) return;

  // Reset classes
  toastEl.className = "toast align-items-center border-0 text-white";
  const typeClass = type === "success" ? "bg-success" : type === "error" ? "bg-danger" : "bg-primary";
  toastEl.classList.add(typeClass);
  toastMsg.textContent = message;

  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
  toast.show();
}

// ── Markdown to HTML (lightweight) ────────────────────────────────────────────
function markdownToHtml(text) {
  if (!text) return "<p class='text-muted'>No information available.</p>";

  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^## (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^# (.+)$/gm, "<h3>$1</h3>");

  // Standalone bold lines (entire line is **…**) → treated as section headings
  html = html.replace(/^\*\*([^*\n]+)\*\*:?$/gm, "<h4>$1</h4>");

  // Bullet items whose entire content is bold (**…** or **…:**) → sub-headings
  html = html.replace(/^\s*[-*•]\s+\*\*([^*\n]+?)\*\*:?\s*$/gm, "<h5>$1</h5>");

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Colour time-of-day and itinerary label keywords inside <strong> tags
  html = html.replace(/<strong>(Morning)<\/strong>/gi,    '<span class="tod-morning">$1</span>');
  html = html.replace(/<strong>(Afternoon)<\/strong>/gi,  '<span class="tod-afternoon">$1</span>');
  html = html.replace(/<strong>(Evening)<\/strong>/gi,    '<span class="tod-evening">$1</span>');
  html = html.replace(/<strong>(Night)<\/strong>/gi,      '<span class="tod-evening">$1</span>');
  html = html.replace(/<strong>(Travel Tip)<\/strong>/gi, '<span class="tod-tip">$1</span>');
  html = html.replace(/<strong>(Duration)<\/strong>/gi,   '<span class="tod-duration">$1</span>');
  html = html.replace(/<strong>(Cost|Entry Fee)<\/strong>/gi, '<span class="tod-cost">$1</span>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, "<hr>");

  // Unordered lists
  html = html.replace(/^\s*[-*•]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Blockquotes
  html = html.replace(/^&gt;\s(.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs
  const lines = html.split("\n");
  const processed = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { processed.push(""); continue; }
    if (/^<(h[1-6]|ul|ol|li|hr|blockquote)/.test(trimmed)) { processed.push(trimmed); continue; }
    processed.push(`<p>${trimmed}</p>`);
  }

  return `<div class="ai-content">${processed.join("\n")}</div>`;
}

// ── Format date ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

// ── Relative time ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── API helper ─────────────────────────────────────────────────────────────────
async function apiPost(endpoint, body, timeoutMs = 300000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function apiGet(endpoint) {
  const res = await fetch(endpoint);
  return res.json();
}

// ── Expose globals ─────────────────────────────────────────────────────────────
window.showToast = showToast;
window.markdownToHtml = markdownToHtml;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.apiPost = apiPost;
window.apiGet = apiGet;
