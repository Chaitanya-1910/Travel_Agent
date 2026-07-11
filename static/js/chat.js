/**
 * TravelAI — Chat Page JavaScript
 * Works with the new premium agent chat layout.
 */

"use strict";

const chatHistory = [];
let isSending = false;
let messageCount = 0;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const chatMessages  = () => document.getElementById("chatMessages");
const chatInput     = () => document.getElementById("chatInput");
const sendBtn       = () => document.getElementById("sendBtn");
const charCountEl   = () => document.getElementById("charCount");
const welcomeCard   = () => document.getElementById("welcomeHero");

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const input = chatInput();
  if (!input) return;

  // Auto-resize textarea
  input.addEventListener("input", () => {
    const cc = charCountEl();
    if (cc) cc.textContent = `${input.value.length}/2000`;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  });

  // Send on Enter (Shift+Enter for newline)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) sendMessage();
    }
  });
});

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input = chatInput();
  const message = input?.value.trim();
  if (!message || isSending) return;

  isSending = true;
  setSendingState(true);

  // Hide welcome hero on first message
  const wc = welcomeCard();
  if (wc) { wc.style.opacity = "0"; wc.style.transform = "scale(.97) translateY(-8px)"; wc.style.transition = "all .22s ease"; setTimeout(() => wc.remove(), 230); }

  // Append user message
  appendMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  messageCount++;

  // Clear input
  input.value = "";
  input.style.height = "auto";
  if (charCountEl()) charCountEl().textContent = "0/2000";

  // Show typing indicator
  const typingId = appendTypingIndicator();

  try {
    const data = await apiPost("/api/chat", {
      message,
      history: chatHistory.slice(-12),
    });

    removeTypingIndicator(typingId);

    if (data.success) {
      const reply = data.reply;
      chatHistory.push({ role: "assistant", content: reply });
      appendMessage("bot", reply);
      messageCount++;
    } else {
      appendMessage("bot", `⚠️ ${data.error || "Something went wrong. Please try again."}`);
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendMessage("bot", "⚠️ Network error. Please check your connection and try again.");
    console.error("Chat error:", err);
  }

  isSending = false;
  setSendingState(false);
}
window.sendMessage = sendMessage;

// ── Append message ────────────────────────────────────────────────────────────
function appendMessage(role, content) {
  const container = chatMessages();
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${role === "bot" ? "bot-message" : "user-message"}`;

  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const bubbleContent = role === "bot" ? markdownToHtml(content) : `<p>${escHtml(content)}</p>`;

  const labelHtml = role === "bot"
    ? `<span class="msg-label"><i class="fas fa-robot" style="margin-right:4px;font-size:.6rem"></i>TravelAI</span>`
    : "";

  msgDiv.innerHTML = `
    <div class="msg-avatar"><i class="${role === "bot" ? "fas fa-robot" : "fas fa-user"}"></i></div>
    <div>
      ${labelHtml}
      <div class="msg-bubble">
        ${bubbleContent}
        <span class="msg-time">${now}</span>
      </div>
    </div>
  `;

  container.appendChild(msgDiv);
  scrollToBottom(container);
  return msgDiv;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function appendTypingIndicator() {
  const container = chatMessages();
  if (!container) return null;
  const id = `typing-${Date.now()}`;
  const div = document.createElement("div");
  div.id = id;
  div.className = "chat-message bot-message typing-indicator";
  div.innerHTML = `
    <div class="msg-avatar"><i class="fas fa-robot"></i></div>
    <div>
      <span class="msg-label"><i class="fas fa-robot" style="margin-right:4px;font-size:.6rem"></i>TravelAI <em style="font-weight:400;color:var(--muted);margin-left:3px">is thinking…</em></span>
      <div class="msg-bubble">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);
  scrollToBottom(container);
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  document.getElementById(id)?.remove();
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
function sendSuggestion(btn) {
  const input = chatInput();
  if (input) {
    // Read just the text span if it exists, otherwise full textContent
    const textEl = btn.querySelector(".ch-sug-text");
    input.value = (textEl ? textEl.textContent : btn.textContent).trim();
    input.dispatchEvent(new Event("input"));
    sendMessage();
  }
}
window.sendSuggestion = sendSuggestion;

// ── Clear chat ────────────────────────────────────────────────────────────────
function clearChat() {
  chatHistory.length = 0;
  messageCount = 0;

  const container = chatMessages();
  if (!container) return;

  // Re-insert welcome hero
  container.innerHTML = `
    <div class="ch-welcome" id="welcomeHero">
      <div class="ch-welcome-glow1"></div>
      <div class="ch-welcome-glow2"></div>
      <div class="ch-welcome-inner">
        <div class="ch-welcome-orb"><i class="fas fa-paper-plane"></i></div>
        <h2 class="ch-welcome-title">Where do you want to go?</h2>
        <p class="ch-welcome-sub">Chat cleared — ready for your next adventure. Ask me anything about destinations, visas, budgets or hotels.</p>
        <div class="ch-suggestion-grid" id="chatSuggestions">
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">🌸</span><span class="ch-sug-text">Best time to visit Japan?</span></button>
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">💰</span><span class="ch-sug-text">Budget trip to Europe tips</span></button>
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">🛂</span><span class="ch-sug-text">Visa requirements for Bali</span></button>
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">🏖️</span><span class="ch-sug-text">Top 5 beach destinations</span></button>
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">🎒</span><span class="ch-sug-text">Solo travel safety tips</span></button>
          <button class="ch-sug-card" onclick="sendSuggestion(this)"><span class="ch-sug-icon">❄️</span><span class="ch-sug-text">Pack for Iceland in winter</span></button>
        </div>
      </div>
    </div>`;
}
window.clearChat = clearChat;

// ── Download chat ─────────────────────────────────────────────────────────────
function downloadChat() {
  if (!chatHistory.length) { showToast("No chat history to download.", "error"); return; }
  const text = chatHistory.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `travelai-chat-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Chat saved! 📥", "success");
}
window.downloadChat = downloadChat;

// ── Helpers ───────────────────────────────────────────────────────────────────
function setSendingState(sending) {
  const btn = sendBtn();
  const input = chatInput();
  if (btn) btn.disabled = sending;
  if (input) input.disabled = sending;
  if (btn) btn.innerHTML = sending
    ? '<span class="spinner-border spinner-border-sm" style="width:14px;height:14px;border-width:2px"></span>'
    : '<i class="fas fa-paper-plane"></i>';
}

function scrollToBottom(container) {
  requestAnimationFrame(() => {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
