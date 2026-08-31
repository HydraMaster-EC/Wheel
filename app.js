(() => {
  "use strict";

  const STORAGE_PREFIX = "wheelOfNames:";
  const GROUP_IDS = ["group1", "group2", "group3"];
  const DEFAULT_TITLES = {
    group1: "Class 1",
    group2: "Class 2",
    group3: "Class 3",
  };
  const DEFAULT_NAMES = ["Alex", "Jamie", "Sam", "Taylor", "Jordan", "Casey"];

  const COLORS = [
    "#e74c3c", "#f39c12", "#f1c40f", "#2ecc71", "#1abc9c",
    "#3498db", "#9b59b6", "#e84393", "#00b894", "#0984e3",
    "#fd79a8", "#e17055", "#6c5ce7", "#00cec9", "#fab1a0",
  ];

  function loadState(groupId) {
    const raw = localStorage.getItem(STORAGE_PREFIX + groupId);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.names)) return parsed;
      } catch (e) { /* fall through to defaults */ }
    }
    return {
      title: DEFAULT_TITLES[groupId],
      names: DEFAULT_NAMES.slice(),
      removeWinner: false,
    };
  }

  function saveState(groupId, state) {
    localStorage.setItem(STORAGE_PREFIX + groupId, JSON.stringify(state));
  }

  class WheelGroup {
    constructor(groupId, panelEl, tabButtonEl) {
      this.groupId = groupId;
      this.panelEl = panelEl;
      this.tabButtonEl = tabButtonEl;
      this.state = loadState(groupId);
      this.rotation = 0; // current rotation in radians
      this.spinning = false;

      this.canvas = panelEl.querySelector(".wheel-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.spinBtn = panelEl.querySelector(".spin-btn");
      this.removeWinnerCheckbox = panelEl.querySelector(".remove-winner-checkbox");
      this.titleInput = panelEl.querySelector(".group-title-input");
      this.nameInput = panelEl.querySelector(".name-input");
      this.addNameBtn = panelEl.querySelector(".add-name-btn");
      this.bulkTextarea = panelEl.querySelector(".bulk-textarea");
      this.bulkApplyBtn = panelEl.querySelector(".bulk-apply-btn");
      this.nameListEl = panelEl.querySelector(".name-list");
      this.nameCountEl = panelEl.querySelector(".name-count");
      this.clearBtn = panelEl.querySelector(".clear-btn");

      this.titleInput.value = this.state.title;
      this.tabButtonEl.textContent = this.state.title;
      this.removeWinnerCheckbox.checked = !!this.state.removeWinner;

      this.bindEvents();
      this.renderNameList();
      this.drawWheel();
    }

    bindEvents() {
      this.spinBtn.addEventListener("click", () => this.spin());

      this.removeWinnerCheckbox.addEventListener("change", () => {
        this.state.removeWinner = this.removeWinnerCheckbox.checked;
        this.persist();
      });

      this.titleInput.addEventListener("input", () => {
        const val = this.titleInput.value.trim() || DEFAULT_TITLES[this.groupId];
        this.state.title = val;
        this.tabButtonEl.textContent = val;
        this.persist();
      });

      this.addNameBtn.addEventListener("click", () => this.addNameFromInput());
      this.nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addNameFromInput();
        }
      });

      this.bulkApplyBtn.addEventListener("click", () => {
        const lines = this.bulkTextarea.value
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        this.state.names = lines;
        this.persist();
        this.renderNameList();
        this.drawWheel();
      });

      this.clearBtn.addEventListener("click", () => {
        if (this.state.names.length === 0) return;
        if (!confirm(`Clear all names from "${this.state.title}"?`)) return;
        this.state.names = [];
        this.persist();
        this.renderNameList();
        this.drawWheel();
      });
    }

    persist() {
      saveState(this.groupId, this.state);
    }

    addNameFromInput() {
      const val = this.nameInput.value.trim();
      if (!val) return;
      this.state.names.push(val);
      this.nameInput.value = "";
      this.persist();
      this.renderNameList();
      this.drawWheel();
      this.nameInput.focus();
    }

    removeNameAt(index) {
      this.state.names.splice(index, 1);
      this.persist();
      this.renderNameList();
      this.drawWheel();
    }

    renderNameList() {
      this.nameListEl.innerHTML = "";
      const names = this.state.names;
      this.nameCountEl.textContent = `${names.length} name${names.length === 1 ? "" : "s"}`;

      if (names.length === 0) {
        const hint = document.createElement("li");
        hint.className = "empty-hint";
        hint.textContent = "No names yet. Add some above!";
        hint.style.listStyle = "none";
        hint.style.border = "none";
        this.nameListEl.appendChild(hint);
        return;
      }

      names.forEach((name, i) => {
        const li = document.createElement("li");

        const textWrap = document.createElement("span");
        textWrap.className = "name-text";

        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.background = COLORS[i % COLORS.length];

        const text = document.createElement("span");
        text.textContent = name;

        textWrap.appendChild(swatch);
        textWrap.appendChild(text);

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-name-btn";
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove";
        removeBtn.addEventListener("click", () => this.removeNameAt(i));

        li.appendChild(textWrap);
        li.appendChild(removeBtn);
        this.nameListEl.appendChild(li);
      });
    }

    drawWheel() {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const size = canvas.width;
      const center = size / 2;
      const radius = center - 6;
      const names = this.state.names;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(this.rotation);

      if (names.length === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#d0d3da";
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#666";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Add names to spin", center, center);
        ctx.restore();
        return;
      }

      const sliceAngle = (Math.PI * 2) / names.length;

      names.forEach((name, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.font = `600 ${names.length > 20 ? 12 : 16}px sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 3;
        const label = name.length > 22 ? name.slice(0, 20) + "…" : name;
        ctx.fillText(label, radius - 14, 0);
        ctx.restore();
      });

      // hub
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#333";
      ctx.stroke();

      ctx.restore();
    }

    spin() {
      if (this.spinning) return;
      const names = this.state.names;
      if (names.length < 2) {
        alert("Add at least 2 names to spin the wheel.");
        return;
      }

      this.spinning = true;
      this.spinBtn.disabled = true;

      const sliceAngle = (Math.PI * 2) / names.length;
      const winnerIndex = Math.floor(Math.random() * names.length);

      // Pointer is at top (angle = -PI/2 in standard canvas coords, i.e. 270deg / -90deg).
      // We want the winning slice's center to end up pointing at the top after rotation.
      const winnerSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
      const pointerAngle = -Math.PI / 2;

      // Normalize current rotation
      const currentRotation = this.rotation % (Math.PI * 2);

      // We need: (winnerSliceCenter + finalRotation) mod 2PI == pointerAngle mod 2PI
      // finalRotation = pointerAngle - winnerSliceCenter (mod 2PI), plus extra full spins
      let targetRotation = pointerAngle - winnerSliceCenter;
      targetRotation = ((targetRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      const extraSpins = 6 + Math.floor(Math.random() * 3); // 6-8 full spins
      const totalDelta = extraSpins * Math.PI * 2 + ((targetRotation - currentRotation + Math.PI * 2 * 100) % (Math.PI * 2));

      const startRotation = this.rotation;
      const endRotation = startRotation + totalDelta;
      const duration = 4200 + Math.random() * 800; // ms
      const startTime = performance.now();

      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

      const animate = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOutQuint(t);
        this.rotation = startRotation + totalDelta * eased;
        this.drawWheel();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.rotation = endRotation % (Math.PI * 2);
          this.drawWheel();
          this.onSpinComplete(names[winnerIndex], winnerIndex);
        }
      };

      requestAnimationFrame(animate);
    }

    onSpinComplete(winnerName, winnerIndex) {
      this.spinning = false;
      this.spinBtn.disabled = false;

      if (this.state.removeWinner) {
        this.state.names.splice(winnerIndex, 1);
        this.persist();
        this.renderNameList();
        this.drawWheel();
      }

      showWinner(winnerName);
    }
  }

  function showWinner(name) {
    const overlay = document.getElementById("winnerOverlay");
    const nameEl = document.getElementById("winnerName");
    nameEl.textContent = name;
    overlay.classList.remove("hidden");
  }

  function hideWinner() {
    document.getElementById("winnerOverlay").classList.add("hidden");
  }

  function init() {
    const tabsEl = document.getElementById("tabs");
    const groupsEl = document.getElementById("groups");
    const template = document.getElementById("groupTemplate");

    const groups = [];

    GROUP_IDS.forEach((groupId, i) => {
      const tabBtn = document.createElement("button");
      tabBtn.className = "tab-btn" + (i === 0 ? " active" : "");
      tabsEl.appendChild(tabBtn);

      const panelFragment = template.content.cloneNode(true);
      const panelEl = panelFragment.querySelector(".group-panel");
      panelEl.dataset.groupId = groupId;
      if (i === 0) panelEl.classList.add("active");
      groupsEl.appendChild(panelFragment);

      const panel = groupsEl.querySelector(`.group-panel[data-group-id="${groupId}"]`);
      const group = new WheelGroup(groupId, panel, tabBtn);
      groups.push(group);

      tabBtn.addEventListener("click", () => {
        groups.forEach((g) => {
          const isActive = g.groupId === groupId;
          g.panelEl.classList.toggle("active", isActive);
          g.tabButtonEl.classList.toggle("active", isActive);
        });
      });
    });

    document.getElementById("closeWinner").addEventListener("click", hideWinner);
    document.getElementById("winnerOverlay").addEventListener("click", (e) => {
      if (e.target.id === "winnerOverlay") hideWinner();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideWinner();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
