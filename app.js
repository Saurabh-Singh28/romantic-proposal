/**
 * main Application Interactions Logic
 * -------------------------------------------------------------
 * Manages SPA state, custom canvas particle renderers, secure entry hashing,
 * tricky button behaviors, popups, and Firebase database sync.
 */

import { 
  startSession, 
  incrementMetric, 
  submitFinalAnswer, 
  updateDuration 
} from "./firebase-config.js";

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
const state = {
  unlocked: false,
  currentPage: 1,
  totalPages: 4,
  wrongPasswordCount: 0,
  noClickCount: 0,
  backClickCount: 0,
  sessionStartTime: null,
  durationInterval: null,
  isCelebrated: false
};

// 20 Hearts/Personal Pleading Pop-up Messages (Looping on 15 counts)
const personalNoMessages = [
  "Are you sure? My heart is doing backflips of worry! 🥺",
  "Wait! I promise to let you have the last slice of pizza! 🍕",
  "But we make such a perfect team! 💑",
  "I'll do the dishes for the next five years! 🍽️",
  "Is that your final, final, absolute final answer? 😱",
  "What if I get you that extra sweet bubble tea? 🧋",
  "My pet totally thinks we are perfect together! 🐾",
  "If you click 'No' again, a cute puppy gets sad! 🐶",
  "Please look closely at the other button... it's literally glowing! ✨",
  "No is mathematically impossible today! ✖️",
  "I will sing you silly songs even when I'm out of tune! 🎶",
  "I'll hold your shopping bags forever and ever! 🛍️",
  "We share the same soul, you know it! 💞",
  "But who is going to cuddle me during scary movies? 🍿",
  "I promise to laugh at all your jokes, even the bad ones! 😂",
  "You're teasing me, aren't you? Cruel but adorable! 😉",
  "I'll travel the entire globe with you. Let's make memories! ✈️",
  "I will always make sure you are warm when it's freezing! ❄️",
  "Yes is just a single tap away. Give love a chance! 🌟",
  "I love you too much to let you escape! ❤️"
];

// ==========================================================================
// SECURE CRYPTO PASSWORD HASHING
// ==========================================================================
// SHA-256 Hash of "pampu"
const SECURE_HASH = "a2fe62e4d6f26f535874ce1652a1bd4d10f53d2e32041dd240c40f5915a96c95";

async function hashInput(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ==========================================================================
// BACKGROUND HEART PARTICLES CANVAS RENDERER
// ==========================================================================
const particlesCanvas = document.getElementById("particles-canvas");
const pCtx = particlesCanvas.getContext("2d");

let particles = [];
const maxParticles = 30;

function resizeParticlesCanvas() {
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeParticlesCanvas);
resizeParticlesCanvas();

class HeartParticle {
  constructor() {
    this.reset();
    this.y = Math.random() * particlesCanvas.height;
  }

  reset() {
    this.x = Math.random() * particlesCanvas.width;
    this.y = particlesCanvas.height + 20;
    this.size = Math.random() * 12 + 6;
    this.speedY = Math.random() * 0.8 + 0.3;
    this.speedX = Math.random() * 0.4 - 0.2;
    this.alpha = Math.random() * 0.4 + 0.15;
    this.color = `rgba(255, ${Math.floor(Math.random() * 80 + 100)}, ${Math.floor(Math.random() * 80 + 140)}, ${this.alpha})`;
    this.scale = Math.random() * 0.6 + 0.4;
  }

  update() {
    this.y -= this.speedY;
    this.x += this.speedX;
    if (this.y < -20 || this.x < -20 || this.x > particlesCanvas.width + 20) {
      this.reset();
    }
  }

  draw() {
    pCtx.save();
    pCtx.translate(this.x, this.y);
    pCtx.scale(this.scale, this.scale);
    pCtx.beginPath();
    pCtx.fillStyle = this.color;
    
    // Draw heart path
    pCtx.moveTo(0, 0);
    pCtx.bezierCurveTo(-5, -5, -10, 0, -10, 5);
    pCtx.bezierCurveTo(-10, 10, -5, 15, 0, 20);
    pCtx.bezierCurveTo(5, 15, 10, 10, 10, 5);
    pCtx.bezierCurveTo(10, 0, 5, -5, 0, 0);
    pCtx.fill();
    pCtx.restore();
  }
}

// Populate particles
for (let i = 0; i < maxParticles; i++) {
  particles.push(new HeartParticle());
}

function animateParticles() {
  pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ==========================================================================
// CELEBRATION CONFETTI & HEARTS CASCADE CANVAS
// ==========================================================================
const celebrationCanvas = document.getElementById("celebration-canvas");
const cCtx = celebrationCanvas.getContext("2d");
let confettiArr = [];

function resizeCelebrationCanvas() {
  celebrationCanvas.width = window.innerWidth;
  celebrationCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCelebrationCanvas);

class ConfettiPiece {
  constructor() {
    this.reset();
    this.y = Math.random() * -celebrationCanvas.height;
  }

  reset() {
    this.x = Math.random() * celebrationCanvas.width;
    this.y = -20;
    this.size = Math.random() * 8 + 6;
    this.speedY = Math.random() * 3 + 2.5;
    this.speedX = Math.random() * 2 - 1;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 3 - 1.5;
    
    const colors = [
      "#ff7597", "#ffd2df", "#ff4a77", "#ffb3c6", 
      "#ffd166", "#06d6a0", "#118ab2", "#e5a9b4"
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.shape = Math.random() > 0.45 ? "circle" : (Math.random() > 0.5 ? "rect" : "heart");
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
    if (this.y > celebrationCanvas.height + 20) {
      this.reset();
    }
  }

  draw() {
    cCtx.save();
    cCtx.translate(this.x, this.y);
    cCtx.rotate((this.rotation * Math.PI) / 180);
    cCtx.fillStyle = this.color;

    if (this.shape === "circle") {
      cCtx.beginPath();
      cCtx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      cCtx.fill();
    } else if (this.shape === "rect") {
      cCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);
    } else { // heart shape
      cCtx.beginPath();
      cCtx.moveTo(0, 0);
      cCtx.bezierCurveTo(-3, -3, -6, 0, -6, 3);
      cCtx.bezierCurveTo(-6, 6, -3, 9, 0, 12);
      cCtx.bezierCurveTo(3, 9, 6, 6, 6, 3);
      cCtx.bezierCurveTo(6, 0, 3, -3, 0, 0);
      cCtx.fill();
    }
    cCtx.restore();
  }
}

function startConfettiSystem() {
  celebrationCanvas.classList.remove("hidden");
  resizeCelebrationCanvas();
  confettiArr = [];
  for (let i = 0; i < 120; i++) {
    confettiArr.push(new ConfettiPiece());
  }
  
  function animateCelebration() {
    if (!state.isCelebrated) return;
    cCtx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);
    confettiArr.forEach(c => {
      c.update();
      c.draw();
    });
    requestAnimationFrame(animateCelebration);
  }
  animateCelebration();
}

// ==========================================================================
// DYNAMIC SOUND PLAYER CONTROLS
// ==========================================================================
const musicToggle = document.getElementById("music-toggle");
const bgMusic = document.getElementById("bg-music");
const muteIcon = musicToggle.querySelector(".music-icon.mute");
const playIcon = musicToggle.querySelector(".music-icon.play");

let isMuted = true;

musicToggle.addEventListener("click", () => {
  if (isMuted) {
    bgMusic.play()
      .then(() => {
        isMuted = false;
        muteIcon.classList.add("hidden");
        playIcon.classList.remove("hidden");
        console.log("🎵 Music playing...");
      })
      .catch(err => console.error("🔇 Failed to autoplay audio:", err));
  } else {
    bgMusic.pause();
    isMuted = true;
    muteIcon.classList.remove("hidden");
    playIcon.classList.add("hidden");
    console.log("🔇 Music paused.");
  }
});

// ==========================================================================
// PASSWORD GATE VALIDATION (SCREEN 1 -> SCREEN 2)
// ==========================================================================
const lockScreen = document.getElementById("lock-screen");
const passwordForm = document.getElementById("password-form");
const secretPasswordInput = document.getElementById("secret-password");
const passwordError = document.getElementById("password-error");
const lockCard = lockScreen.querySelector(".lock-card");

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const inputPwd = secretPasswordInput.value;
  
  const computedHash = await hashInput(inputPwd);
  
  if (computedHash === SECURE_HASH) {
    // SUCCESS
    console.log("🔓 Secret password matches!");
    passwordError.classList.add("hidden");
    
    // Play transition animation
    lockCard.classList.remove("animate-fade-in-up");
    lockCard.style.transform = "scale(0.9) translateY(-30px)";
    lockCard.style.opacity = "0";
    
    setTimeout(() => {
      lockScreen.classList.add("hidden");
      // Unlock SPA experience
      unlockStoryApp();
    }, 600);
    
  } else {
    // FAIL
    state.wrongPasswordCount++;
    incrementMetric("wrongPasswordAttempts");
    
    // Trigger shake animation
    lockCard.classList.remove("shake-error");
    void lockCard.offsetWidth; // Reflow to reset animation
    lockCard.classList.add("shake-error");
    
    passwordError.classList.remove("hidden");
    secretPasswordInput.value = "";
    secretPasswordInput.focus();
  }
});

// ==========================================================================
// ROUTING & STORY NAVIGATION (SPA PAGES 1 TO 4)
// ==========================================================================
const storyContainer = document.getElementById("story-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageElements = [
  document.getElementById("page-1"),
  document.getElementById("page-2"),
  document.getElementById("page-3"),
  document.getElementById("page-4")
];
const dotElements = document.querySelectorAll(".step-dot");

function unlockStoryApp() {
  state.unlocked = true;
  storyContainer.classList.remove("hidden");
  
  // Start Firebase tracking session
  startSession();
  
  // Record session start time
  state.sessionStartTime = Date.now();
  
  // Set up live telemetry synchronization timer
  state.durationInterval = setInterval(() => {
    if (state.sessionStartTime && !state.isCelebrated) {
      const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);
      updateDuration(elapsedSeconds);
    }
  }, 1000);

  // Play audio background dynamically if not blocked by browser policy
  bgMusic.play()
    .then(() => {
      isMuted = false;
      muteIcon.classList.add("hidden");
      playIcon.classList.remove("hidden");
    })
    .catch(() => console.log("🔇 Music blocked from auto-start. Awaiting click..."));
}

function updateActivePage(nextPageNum, direction = "forward") {
  const currPageEl = pageElements[state.currentPage - 1];
  const nextPageEl = pageElements[nextPageNum - 1];
  
  // Clean up all pages except the currently visible one to allow smooth exit animations
  pageElements.forEach((el, idx) => {
    if (idx !== state.currentPage - 1) {
      el.className = "story-page";
    }
  });
  
  if (direction === "forward") {
    currPageEl.className = "story-page slide-out-left active";
    nextPageEl.className = "story-page slide-in-right active";
  } else {
    currPageEl.className = "story-page slide-out-right active";
    // Set next page off-screen left, force layout recalculation, and animate in
    nextPageEl.className = "story-page slide-out-left";
    void nextPageEl.offsetWidth;
    nextPageEl.className = "story-page slide-in-left active";
  }
  
  // Fully clean up transition classes after the slide finishes
  setTimeout(() => {
    pageElements.forEach((el, idx) => {
      if (idx === nextPageNum - 1) {
        el.className = "story-page active";
      } else {
        el.className = "story-page";
      }
    });
  }, 600);
  
  // Update indicators
  dotElements.forEach(dot => dot.classList.remove("active"));
  dotElements[nextPageNum - 1].classList.add("active");
  
  state.currentPage = nextPageNum;
  
  // Toggle Navigation buttons visibility
  if (state.currentPage === 1) {
    prevBtn.classList.add("hidden");
  } else {
    prevBtn.classList.remove("hidden");
  }
  
  if (state.currentPage === state.totalPages) {
    nextBtn.classList.add("hidden");
  } else {
    nextBtn.classList.remove("hidden");
  }
  
  console.log(`🧭 Navigated to Chapter ${state.currentPage}`);
}

// Next/Back click events
nextBtn.addEventListener("click", () => {
  if (state.currentPage < state.totalPages) {
    updateActivePage(state.currentPage + 1, "forward");
  }
});

prevBtn.addEventListener("click", () => {
  if (state.currentPage > 1) {
    state.backClickCount++;
    incrementMetric("backClickCount");
    updateActivePage(state.currentPage - 1, "backward");
  }
});

// Dot click navigations
dotElements.forEach(dot => {
  dot.addEventListener("click", (e) => {
    const targetPage = parseInt(e.target.dataset.target);
    if (targetPage === state.currentPage) return;
    
    const direction = targetPage > state.currentPage ? "forward" : "backward";
    if (direction === "backward") {
      state.backClickCount++;
      incrementMetric("backClickCount");
    }
    updateActivePage(targetPage, direction);
  });
});

// ==========================================================================
// PAGE 3 - INTERESTING GLOW REASONS ACCORDION
// ==========================================================================
const reasonItems = document.querySelectorAll(".reason-item");

reasonItems.forEach(item => {
  const trigger = item.querySelector(".reason-trigger");
  trigger.addEventListener("click", () => {
    const isActive = item.classList.contains("active");
    
    // Collapse all reasons first
    reasonItems.forEach(i => i.classList.remove("active"));
    
    // Toggle targeted reason
    if (!isActive) {
      item.classList.add("active");
      console.log(`📌 Expanded Special Reason #${item.dataset.index}`);
    }
  });
});

// ==========================================================================
// PAGE 4 - TRICKY PLAYFUL "NO" BUTTON & SPARKLY POPUPS
// ==========================================================================
const noBtn = document.getElementById("no-btn");
const yesBtn = document.getElementById("yes-btn");

noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  
  state.noClickCount++;
  incrementMetric("noClickCount");
  
  // 1. Spawns custom floaty text card inside viewport bounds
  spawnPlayfulPopup();
  
  // 2. Loop back logic specifically after 15 clicks
  if (state.noClickCount % 15 === 0) {
    console.log("🔄 Popups looped back to start after 15 clicks!");
  }
  
  // 3. Playfully grow YES button and shrink/reposition NO button
  const scaleRatio = 1 + (state.noClickCount * 0.12);
  yesBtn.style.transform = `scale(${scaleRatio})`;
  
  // Make the yes glow stronger
  const glowRadius = 15 + (state.noClickCount * 4);
  yesBtn.style.boxShadow = `0 8px 30px rgba(255, 117, 151, 0.4), 0 0 ${glowRadius}px rgba(255, 117, 151, ${0.3 + (state.noClickCount * 0.05)})`;
  
  // Reposition the NO button absolutely in the viewport to fly away safely
  noBtn.style.position = "fixed";
  noBtn.style.zIndex = "9999";
  
  const btnWidth = noBtn.offsetWidth || 100;
  const btnHeight = noBtn.offsetHeight || 44;
  const yesRect = yesBtn.getBoundingClientRect();
  
  let newX = 0;
  let newY = 0;
  let safetyCounter = 0;
  let overlap = true;
  
  // Keep generating random coordinates until we are safely away from the Yes button
  while (overlap && safetyCounter < 200) {
    // Generate positions inside standard margins of 30px
    newX = Math.random() * (window.innerWidth - btnWidth - 60) + 30;
    newY = Math.random() * (window.innerHeight - btnHeight - 60) + 30;
    
    // Safety buffer zones: 180px horizontally and 100px vertically from YES center
    const bufferX = 180;
    const bufferY = 100;
    
    const yesCenterX = yesRect.left + yesRect.width / 2;
    const yesCenterY = yesRect.top + yesRect.height / 2;
    
    const distanceX = Math.abs((newX + btnWidth / 2) - yesCenterX);
    const distanceY = Math.abs((newY + btnHeight / 2) - yesCenterY);
    
    if (distanceX > bufferX || distanceY > bufferY) {
      overlap = false;
    }
    safetyCounter++;
  }
  
  noBtn.style.left = `${newX}px`;
  noBtn.style.top = `${newY}px`;
  noBtn.style.margin = "0"; // Clear standard structural card margins
  
  // Apply physics scaling shrinkage
  noBtn.style.transform = `scale(${Math.max(0.65, 1 - (state.noClickCount * 0.03))})`;
});

function spawnPlayfulPopup() {
  const popup = document.createElement("div");
  popup.className = "floating-popup";
  
  // Retrieve message looping at 15
  const msgIdx = (state.noClickCount - 1) % 15;
  popup.innerHTML = personalNoMessages[msgIdx];
  
  // Secure random coordinate ranges safely bounded inside the screen
  const x = Math.random() * 70 + 10; // 10% to 80% width
  const y = Math.random() * 70 + 15; // 15% to 85% height
  
  popup.style.left = `${x}%`;
  popup.style.top = `${y}%`;
  
  document.body.appendChild(popup);
  
  // Automatically trigger sliding fadeout and purge from DOM
  setTimeout(() => {
    popup.classList.add("popup-fade-out");
    setTimeout(() => {
      popup.remove();
    }, 500);
  }, 3500);
}

// ==========================================================================
// YES BUTTON ACCEPTANCE (PAGE 4 -> CELEBRATION SCREEN)
// ==========================================================================
const celebrationScreen = document.getElementById("celebration-screen");
const envelope = celebrationScreen.querySelector(".envelope");

yesBtn.addEventListener("click", () => {
  if (state.isCelebrated) return;
  state.isCelebrated = true;
  
  // Clear synchronizers
  clearInterval(state.durationInterval);
  
  // Log final answer to Firebase
  submitFinalAnswer("Yes");
  
  // Transition SPA panels
  storyContainer.classList.add("hidden");
  celebrationScreen.classList.remove("hidden");
  
  // Start Confetti Celebration Overlay
  startConfettiSystem();
  
  console.log("💍 YES ACCEPTED! Proposal completed successfully.");
});

// Interactive digital envelope flip logic
envelope.addEventListener("click", () => {
  envelope.classList.toggle("open");
  if (envelope.classList.contains("open")) {
    console.log("💌 Opened romantic vow letter!");
  }
});

// Silence diagnostics logs
console.log("📈 Core Analytics Engine syncing silently to Firestore.");
