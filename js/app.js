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
      container.style.padding = "16px";
      container.style.maxWidth = "600px";

      const intro = document.createElement("p");
      intro.textContent = "Set overhead/burden rates applied to direct labor costs. Rates are expressed as percentages. Total OH = Labor Fringe + Operating Costs + Operating OH.";
      intro.style.marginBottom = "16px";
      intro.style.color = "var(--text-muted)";
      intro.style.fontSize = "11px";
      container.appendChild(intro);

      const createRateSection = (title, type) => {
        const section = document.createElement("div");
        section.style.marginBottom = "20px";
        section.style.padding = "12px";
        section.style.border = "1px solid var(--border)";
        section.style.borderRadius = "4px";
        section.style.background = "var(--bg-hover)";

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = title;
        sectionTitle.style.margin = "0 0 12px 0";
        sectionTitle.style.fontSize = "12px";
        sectionTitle.style.fontWeight = "600";
        sectionTitle.style.textTransform = "uppercase";
        section.appendChild(sectionTitle);

        const currentRates = window.ohRates[type];

        const createInput = (label, value, description) => {
          const group = document.createElement("div");
          group.style.marginBottom = "10px";

          const labelEl = document.createElement("label");
          labelEl.textContent = label;
          labelEl.style.display = "block";
          labelEl.style.marginBottom = "4px";
          labelEl.style.fontSize = "11px";
          labelEl.style.fontWeight = "600";

          const desc = document.createElement("div");
          desc.textContent = description;
          desc.style.fontSize = "10px";
          desc.style.color = "var(--text-muted)";
          desc.style.marginBottom = "4px";

          const inputWrapper = document.createElement("div");
          inputWrapper.style.display = "flex";
          inputWrapper.style.alignItems = "center";
          inputWrapper.style.gap = "6px";

          const input = document.createElement("input");
          input.type = "number";
          input.step = "0.01";
          input.min = "0";
          input.value = (value * 100).toFixed(1);
          input.style.width = "80px";
          input.style.padding = "4px 6px";
          input.style.border = "1px solid var(--border)";
          input.style.borderRadius = "4px";
          input.style.background = "var(--bg)";
          input.style.color = "var(--text)";
          input.style.fontSize = "11px";

          const percent = document.createElement("span");
          percent.textContent = "%";
          percent.style.fontSize = "11px";

          inputWrapper.appendChild(input);
          inputWrapper.appendChild(percent);

          group.appendChild(labelEl);
          group.appendChild(desc);
          group.appendChild(inputWrapper);
          section.appendChild(group);

          return input;
        };

        const laborFringeInput = createInput(
          "Labor Fringe",
          currentRates.laborFringe,
          "Benefits, payroll taxes, etc."
        );
        const operatingCostsInput = createInput(
          "Operating Costs",
          currentRates.operatingCosts,
          "Facility, utilities, insurance, etc."
        );
        const operatingOHInput = createInput(
          "Operating OH",
          currentRates.operatingOH,
          "General & administrative overhead"
        );

        // Total display
        const totalDiv = document.createElement("div");
        totalDiv.style.marginTop = "12px";
        totalDiv.style.padding = "8px";
        totalDiv.style.background = "var(--bg)";
        totalDiv.style.borderRadius = "4px";
        totalDiv.style.fontSize = "12px";
        totalDiv.style.fontWeight = "600";

        const updateTotal = () => {
          const total = (
            parseFloat(laborFringeInput.value) +
            parseFloat(operatingCostsInput.value) +
            parseFloat(operatingOHInput.value)
          ).toFixed(1);
          totalDiv.textContent = `Total ${title}: ${total}%`;
        };

        laborFringeInput.addEventListener("input", updateTotal);
        operatingCostsInput.addEventListener("input", updateTotal);
        operatingOHInput.addEventListener("input", updateTotal);
        updateTotal();

        section.appendChild(totalDiv);

        return { section, laborFringeInput, operatingCostsInput, operatingOHInput };
      };

      const regSection = createRateSection("Regular Time", "regular");
      container.appendChild(regSection.section);

      const otSection = createRateSection("Overtime", "overtime");
      container.appendChild(otSection.section);

      // Example
      const example = document.createElement("div");
      example.style.marginTop = "12px";
      example.style.padding = "10px";
      example.style.background = "var(--bg-hover)";
      example.style.borderRadius = "4px";
      example.style.fontSize = "10px";
      example.style.color = "var(--text-muted)";
      example.innerHTML = `
        <strong>Example:</strong> If DL = $1000 and Total OH = 110%, then Burdened = $1000 × (1 + 1.10) = $2,100
      `;
      container.appendChild(example);

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
