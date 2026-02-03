window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOMContentLoaded fired");
  document.body.classList.remove("debug-cells");
  
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
  
  // Trigger initial calculations (this will update the rendered cells)
  if (window.Calculations && window.Calculations.recalculate) {
    window.Calculations.recalculate().then(() => {
      console.log("✅ Initial calculations complete");
    }).catch(err => {
      console.error("❌ Initial calculation failed:", err);
    });
  }
  
  console.log("✅ About to call setupSidebarToggle");
  setTimeout(() => {
    console.log("✅ Calling setupSidebarToggle now");
    setupSidebarToggle();
  }, 0);

  if (!document.body._expenseClickHandlerAttached) {
    document.addEventListener("click", (e) => {
      const cell = e.target.closest(".expense-cell");
      if (!cell || !cell.dataset.expenseType) return;
      const row = cell.closest(".wbs-row");
      const nodeId = row?.dataset?.id;
      if (nodeId && typeof window.openExpenseDetails === "function") {
        window.openExpenseDetails(nodeId, cell.dataset.expenseType);
      }
    });
    document.body._expenseClickHandlerAttached = true;
  }
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

// Render palettes for tags and units (estimate types removed)
window.renderPalettes = function () {
  const tagEl = document.getElementById("tagPalette");
  const unitEl = document.getElementById("unitPalette");

  if (tagEl) TagRegistry.forEach(item => tagEl.appendChild(createPalettePill(item)));
  if (unitEl) UnitRegistry.forEach(item => unitEl.appendChild(createPalettePill(item)));
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
      container.style.padding = "12px";
      container.style.maxWidth = "420px";

      const intro = document.createElement("p");
      intro.textContent = "Set overhead/burden rates applied to direct labor costs. Rates are expressed as percentages.";
      intro.style.marginBottom = "10px";
      intro.style.color = "var(--text-muted)";
      intro.style.fontSize = "10px";
      container.appendChild(intro);

      const createRateSection = (title, type) => {
        const section = document.createElement("div");
        section.style.marginBottom = "12px";
        section.style.padding = "8px";
        section.style.border = "1px solid var(--border)";
        section.style.borderRadius = "4px";
        section.style.background = "var(--bg-hover)";

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        sectionTitle.style.margin = "0 0 8px 0";
        sectionTitle.style.fontSize = "11px";
        sectionTitle.style.fontWeight = "600";
        sectionTitle.style.textTransform = "uppercase";
        section.appendChild(sectionTitle);

        const currentRates = window.ohRates[type];

        // Horizontal grid for inputs
        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "1fr 1fr 1fr";
        grid.style.gap = "8px";
        grid.style.marginBottom = "8px";

        const createInput = (label, value, description) => {
          const group = document.createElement("div");

          const labelEl = document.createElement("label");
          labelEl.textContent = label;
          labelEl.style.display = "block";
          labelEl.style.marginBottom = "2px";
          labelEl.style.fontSize = "9px";
          labelEl.style.fontWeight = "600";
          labelEl.style.color = "var(--text-muted)";

          const inputWrapper = document.createElement("div");
          inputWrapper.style.display = "flex";
          inputWrapper.style.alignItems = "center";
          inputWrapper.style.gap = "2px";

          const input = document.createElement("input");
          input.type = "number";
          input.step = "0.1";
          input.min = "0";
          input.value = (value * 100).toFixed(1);
          input.style.width = "100%";
          input.style.padding = "3px 4px";
          input.style.border = "1px solid var(--border)";
          input.style.borderRadius = "3px";
          input.style.background = "var(--bg)";
          input.style.color = "var(--text)";
          input.style.fontSize = "10px";
          input.title = description;

          const percent = document.createElement("span");
          percent.textContent = "%";
          percent.style.fontSize = "9px";
          percent.style.color = "var(--text-muted)";

          inputWrapper.appendChild(input);
          inputWrapper.appendChild(percent);

          group.appendChild(labelEl);
          group.appendChild(inputWrapper);

          return { group, input };
        };

        const laborFringe = createInput(
          "Labor Fringe",
          currentRates.laborFringe,
          "Benefits, payroll taxes, etc."
        );
        grid.appendChild(laborFringe.group);

        const operatingCosts = createInput(
          "Operating Costs",
          currentRates.operatingCosts,
          "Facility, utilities, insurance, etc."
        );
        grid.appendChild(operatingCosts.group);

        const operatingOH = createInput(
          "Operating OH",
          currentRates.operatingOH,
          "General & administrative overhead"
        );
        grid.appendChild(operatingOH.group);

        section.appendChild(grid);

        // Total display
        const totalDiv = document.createElement("div");
        totalDiv.style.padding = "6px";
        totalDiv.style.background = "var(--bg)";
        totalDiv.style.borderRadius = "3px";
        totalDiv.style.fontSize = "10px";
        totalDiv.style.fontWeight = "600";
        totalDiv.style.textAlign = "center";

        const updateTotal = () => {
          const total = (
            parseFloat(laborFringe.input.value) +
            parseFloat(operatingCosts.input.value) +
            parseFloat(operatingOH.input.value)
          ).toFixed(1);
          totalDiv.textContent = `Total: ${total}%`;
        };

        laborFringe.input.addEventListener("input", updateTotal);
        operatingCosts.input.addEventListener("input", updateTotal);
        operatingOH.input.addEventListener("input", updateTotal);
        updateTotal();

        section.appendChild(totalDiv);

        return { section, laborFringeInput: laborFringe.input, operatingCostsInput: operatingCosts.input, operatingOHInput: operatingOH.input };
      };

      const regSection = createRateSection("Regular Time", "regular");
      container.appendChild(regSection.section);

      const otSection = createRateSection("Overtime", "overtime");
      container.appendChild(otSection.section);

      // Save callback
      container._saveCallback = () => {
        window.ohRates = {
          regular: {
            laborFringe: parseFloat(regSection.laborFringeInput.value) / 100,
            operatingCosts: parseFloat(regSection.operatingCostsInput.value) / 100,
            operatingOH: parseFloat(regSection.operatingOHInput.value) / 100
          },
          overtime: {
            laborFringe: parseFloat(otSection.laborFringeInput.value) / 100,
            operatingCosts: parseFloat(otSection.operatingCostsInput.value) / 100,
            operatingOH: parseFloat(otSection.operatingOHInput.value) / 100
          }
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

// Export Oracle CSV button
const exportOracleCSVBtn = document.getElementById("exportOracleCSVBtn");
if (exportOracleCSVBtn) {
  exportOracleCSVBtn.addEventListener("click", () => {
    OracleExport.exportToFile();
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
