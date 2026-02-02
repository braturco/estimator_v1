window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOMContentLoaded fired");
  
  // Apply saved theme before anything renders
  applyTheme(window.currentTheme || "dark");
  
  const loaded = window.loadAppState && window.loadAppState();
  if (loaded) {
    console.log("✅ Loaded saved state");
    // Reapply theme in case it was loaded from state
    applyTheme(window.currentTheme || "dark");
  }
  
  renderPalettes();
  wireTopButtons();
  wireSetupButtons();
  wireThemeToggle();
  renderWBS();
  
  // Trigger initial calculations
  if (window.Calculations && window.Calculations.calculateWBS) {
    window.Calculations.calculateWBS().then(() => {
      console.log("✅ Initial calculations complete");
      renderWBS();
    }).catch(err => {
      console.error("❌ Initial calculation failed:", err);
    });
  }
  
  console.log("✅ About to call setupSidebarToggle");
  setTimeout(() => {
    console.log("✅ Calling setupSidebarToggle now");
    setupSidebarToggle();
  }, 0);
});

window.addEventListener("beforeunload", () => {
  if (window.saveAppState) {
    window.saveAppState();
  }
  if (window.forceBackupSave) {
    window.forceBackupSave();
  }
});

// Setup sidebar flyout toggle
window.setupSidebarToggle = function() {
  const toggleBtn = document.getElementById("toggleSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const edgeToggleBtn = document.getElementById("edgeToggleBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const mainContainer = document.querySelector(".main-container");

  if (!toggleBtn || !closeBtn || !sidebar || !overlay) {
    console.error("Sidebar elements not found", { toggleBtn, closeBtn, sidebar, overlay });
    return;
  }

  function openSidebar() {
    console.log("Opening sidebar");
    sidebar.classList.add("open");
    overlay.classList.add("open");
    mainContainer.classList.add("sidebar-open");
    if (edgeToggleBtn) {
      edgeToggleBtn.classList.add("open");
      edgeToggleBtn.textContent = "‹";
    }
  }

  function closeSidebar() {
    console.log("Closing sidebar");
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    mainContainer.classList.remove("sidebar-open");
    if (edgeToggleBtn) {
      edgeToggleBtn.classList.remove("open");
      edgeToggleBtn.textContent = "›";
    }
  }

  toggleBtn.addEventListener("click", (e) => {
    console.log("Toggle button clicked");
    e.preventDefault();
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (edgeToggleBtn) {
    edgeToggleBtn.addEventListener("click", (e) => {
      console.log("Edge toggle clicked");
      e.preventDefault();
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  closeBtn.addEventListener("click", closeSidebar);
};

// Render palettes for estimate types, tags, units
window.renderPalettes = function () {
  const estEl = document.getElementById("estimateTypePalette");
  const tagEl = document.getElementById("tagPalette");
  const unitEl = document.getElementById("unitPalette");

  EstimateTypeRegistry.forEach(item => estEl.appendChild(createPalettePill(item)));
  TagRegistry.forEach(item => tagEl.appendChild(createPalettePill(item)));
  UnitRegistry.forEach(item => unitEl.appendChild(createPalettePill(item)));
};

// Setup section buttons (sidebar)
window.wireSetupButtons = function () {
  const rateBtn = document.getElementById("setupRateScheduleBtn");
  const resourcesBtn = document.getElementById("setupResourcesBtn");
  const ohRatesBtn = document.getElementById("setupOHRatesBtn");
  const tagsBtn = document.getElementById("setupTagsBtn");
  const unitsBtn = document.getElementById("setupUnitsBtn");

  if (rateBtn) {
    rateBtn.onclick = () => {
      if (window.ResourceManager && typeof ResourceManager.openRateScheduleManager === "function") {
        ResourceManager.openRateScheduleManager();
      }
    };
  }

  if (resourcesBtn) {
    resourcesBtn.onclick = () => {
      if (window.ResourceManager && typeof ResourceManager.openManager === "function") {
        ResourceManager.openManager();
      }
    };
  }

  if (ohRatesBtn) {
    ohRatesBtn.onclick = () => {
      openOHRatesSettings();
    };
  }

  if (tagsBtn) {
    tagsBtn.onclick = () => {
      alert("Tag Management is coming soon.");
    };
  }

  if (unitsBtn) {
    unitsBtn.onclick = () => {
      alert("Unit Management is coming soon.");
    };
  }

  // Export/Import buttons
  const exportBtn = document.getElementById("exportEstimateBtn");
  const importBtn = document.getElementById("importEstimateBtn");

  if (exportBtn) {
    exportBtn.onclick = async () => {
      if (window.EstimateExport && typeof EstimateExport.exportToZIP === "function") {
        await EstimateExport.exportToZIP();
      } else {
        console.error("❌ EstimateExport not available");
      }
    };
  }

  if (importBtn) {
    importBtn.onclick = () => {
      if (window.EstimateExport && typeof EstimateExport.showImportDialog === "function") {
        EstimateExport.showImportDialog();
      } else {
        console.error("❌ EstimateExport not available");
      }
    };
  }
};

// OH/Burden Rates Settings Modal
function openOHRatesSettings() {
  Modal.open({
    title: "OH/Burden Rate Settings",
    content: (container) => {
      container.innerHTML = "";
      container.style.padding = "20px";
      container.style.maxWidth = "500px";

      const intro = document.createElement("p");
      intro.textContent = "Set overhead/burden rates applied to direct labor costs. These are expressed as percentages (e.g., 110% = 1.10).";
      intro.style.marginBottom = "20px";
      intro.style.color = "var(--text-muted)";
      intro.style.fontSize = "13px";
      container.appendChild(intro);

      // Regular time OH
      const regGroup = document.createElement("div");
      regGroup.style.marginBottom = "16px";

      const regLabel = document.createElement("label");
      regLabel.textContent = "Regular Time OH/Burden:";
      regLabel.style.display = "block";
      regLabel.style.marginBottom = "8px";
      regLabel.style.fontWeight = "600";
      regLabel.style.fontSize = "13px";

      const regInputWrapper = document.createElement("div");
      regInputWrapper.style.display = "flex";
      regInputWrapper.style.alignItems = "center";
      regInputWrapper.style.gap = "8px";

      const regInput = document.createElement("input");
      regInput.type = "number";
      regInput.step = "0.01";
      regInput.min = "0";
      regInput.value = ((window.ohRates?.regular || 1.10) * 100).toFixed(0);
      regInput.style.width = "100px";
      regInput.style.padding = "8px";
      regInput.style.border = "1px solid var(--border)";
      regInput.style.borderRadius = "4px";
      regInput.style.background = "var(--bg)";
      regInput.style.color = "var(--text)";
      regInput.style.fontSize = "13px";

      const regPercent = document.createElement("span");
      regPercent.textContent = "%";
      regPercent.style.fontSize = "13px";

      regInputWrapper.appendChild(regInput);
      regInputWrapper.appendChild(regPercent);

      regGroup.appendChild(regLabel);
      regGroup.appendChild(regInputWrapper);
      container.appendChild(regGroup);

      // Overtime OH
      const otGroup = document.createElement("div");
      otGroup.style.marginBottom = "16px";

      const otLabel = document.createElement("label");
      otLabel.textContent = "Overtime OH/Burden:";
      otLabel.style.display = "block";
      otLabel.style.marginBottom = "8px";
      otLabel.style.fontWeight = "600";
      otLabel.style.fontSize = "13px";

      const otInputWrapper = document.createElement("div");
      otInputWrapper.style.display = "flex";
      otInputWrapper.style.alignItems = "center";
      otInputWrapper.style.gap = "8px";

      const otInput = document.createElement("input");
      otInput.type = "number";
      otInput.step = "0.01";
      otInput.min = "0";
      otInput.value = ((window.ohRates?.overtime || 1.10) * 100).toFixed(0);
      otInput.style.width = "100px";
      otInput.style.padding = "8px";
      otInput.style.border = "1px solid var(--border)";
      otInput.style.borderRadius = "4px";
      otInput.style.background = "var(--bg)";
      otInput.style.color = "var(--text)";
      otInput.style.fontSize = "13px";

      const otPercent = document.createElement("span");
      otPercent.textContent = "%";
      otPercent.style.fontSize = "13px";

      otInputWrapper.appendChild(otInput);
      otInputWrapper.appendChild(otPercent);

      otGroup.appendChild(otLabel);
      otGroup.appendChild(otInputWrapper);
      container.appendChild(otGroup);

      // Example
      const example = document.createElement("div");
      example.style.marginTop = "20px";
      example.style.padding = "12px";
      example.style.background = "var(--bg-muted)";
      example.style.borderRadius = "4px";
      example.style.fontSize = "12px";
      example.style.color = "var(--text-muted)";
      example.innerHTML = `
        <strong>Example:</strong><br/>
        110% OH = Direct Labor × 2.10 (DL + 110% OH)<br/>
        If DL = $1000, Burdened = $2100
      `;
      container.appendChild(example);

      // Save callback
      container._saveCallback = () => {
        const regValue = parseFloat(regInput.value) || 110;
        const otValue = parseFloat(otInput.value) || 110;

        window.ohRates = {
          regular: regValue / 100,
          overtime: otValue / 100
        };

        console.log("✅ OH Rates updated:", window.ohRates);
        
        // Trigger recalculation
        if (window.Calculations && window.Calculations.recalculate) {
          window.Calculations.recalculate();
        }
        
        Modal.close();
      };
    },
    onSave: (container) => {
      if (container._saveCallback) {
        container._saveCallback();
      }
    }
  });
}

// Theme toggle
function applyTheme(theme) {
  window.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
    btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
}

function wireThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    const newTheme = window.currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    
    // Save to localStorage
    if (window.saveAppState) {
      window.saveAppState();
    }
  });
}
