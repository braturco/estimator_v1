// Usages Manager - Import and manage non-labor resource usages

window.UsagesManager = (function () {
  const IMPORTED_USAGES_KEY = "estimator_imported_usages_v1";

  function getImportedUsages() {
    try {
      const raw = localStorage.getItem(IMPORTED_USAGES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load imported usages", e);
      return [];
    }
  }

  function saveImportedUsages(usages) {
    try {
      localStorage.setItem(IMPORTED_USAGES_KEY, JSON.stringify(usages));
      return true;
    } catch (e) {
      console.warn("Failed to save imported usages", e);
      return false;
    }
  }

  // Parse usage CSV - updated to handle non_labour_rates.csv format
  function parseUsageCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Expected headers for non_labour_rates.csv: nlr_code, nl_resource_name, unit, rate, type
    const codeIdx = headers.findIndex(h => h === 'nlr_code');
    const nameIdx = headers.findIndex(h => h === 'nl_resource_name');
    const unitIdx = headers.findIndex(h => h === 'unit');
    const rateIdx = headers.findIndex(h => h === 'rate');
    const typeIdx = headers.findIndex(h => h === 'type');

    const usages = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));

      const code = codeIdx >= 0 ? cells[codeIdx] : '';
      const name = nameIdx >= 0 ? cells[nameIdx] : '';
      const unit = unitIdx >= 0 ? cells[unitIdx] : '';
      const rate = rateIdx >= 0 ? parseFloat(cells[rateIdx]) || 0 : 0;
      const type = typeIdx >= 0 ? cells[typeIdx] : '';

      if (!name && !code) continue;

      usages.push({
        id: `usage-${crypto.randomUUID()}`,
        code,
        name,
        unit,
        rate,
        type,
        type: "usage"
      });
    }

    return usages;
  }

  // Import usages from SharePoint URL
  async function importUsagesFromSharePoint(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const csvText = await response.text();
      const usages = parseUsageCSV(csvText);
      if (usages.length > 0) {
        saveImportedUsages(usages);
        return { success: true, count: usages.length };
      }
      return { success: false, error: "No valid usages found in CSV" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Import usages from file
  function importUsagesFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const usages = parseUsageCSV(csvText);
          if (usages.length > 0) {
            saveImportedUsages(usages);
            resolve({ success: true, count: usages.length });
          } else {
            resolve({ success: false, error: "No valid usages found in CSV" });
          }
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, error: "Failed to read file" });
      };
      reader.readAsText(file);
    });
  }

  function showImportDialog() {
    Modal.open({
      title: "Import Non-Labor Usages",
      content: (container) => {
        container.innerHTML = "";
        container.className = "modal-container";

        // Instructions
        const instructions = document.createElement("div");
        instructions.className = "modal-instructions";
        instructions.innerHTML = `
          <strong>Expected CSV Columns:</strong><br>
          NLR_Code, NL_Resource_Name, Unit, Rate, Type
        `;
        container.appendChild(instructions);

        // SharePoint URL section
        const urlSection = document.createElement("div");
        urlSection.className = "modal-section";

        const urlLabel = document.createElement("label");
        urlLabel.textContent = "SharePoint URL";
        urlLabel.className = "modal-section-title";

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.className = "form-input";
        urlInput.placeholder = "https://sharepoint.com/path/to/usages.csv";

        const urlBtn = document.createElement("button");
        urlBtn.className = "btn btn-primary";
        urlBtn.textContent = "Import from URL";
        urlBtn.style.width = "fit-content";
        urlBtn.addEventListener("click", async () => {
          const url = urlInput.value.trim();
          if (!url) {
            alert("Please enter a SharePoint URL");
            return;
          }
          urlBtn.disabled = true;
          urlBtn.textContent = "Importing...";
          const result = await importUsagesFromSharePoint(url);
          if (result.success) {
            alert(`Successfully imported ${result.count} usage records`);
            Modal.close();
            openManager();
          } else {
            alert(`Import failed: ${result.error}`);
            urlBtn.disabled = false;
            urlBtn.textContent = "Import from URL";
          }
        });

        urlSection.appendChild(urlLabel);
        urlSection.appendChild(urlInput);
        urlSection.appendChild(urlBtn);
        container.appendChild(urlSection);

        // Divider
        const divider = document.createElement("div");
        divider.textContent = "OR";
        divider.style.textAlign = "center";
        divider.style.color = "var(--text-muted)";
        divider.style.fontSize = "12px";
        divider.style.fontWeight = "600";
        container.appendChild(divider);

        // File upload section
        const fileSection = document.createElement("div");
        fileSection.className = "modal-section";

        const fileLabel = document.createElement("label");
        fileLabel.textContent = "Upload CSV File";
        fileLabel.className = "modal-section-title";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".csv";
        fileInput.className = "form-input";

        fileInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const result = await importUsagesFromFile(file);
          if (result.success) {
            alert(`Successfully imported ${result.count} usage records`);
            Modal.close();
            openManager();
          } else {
            alert(`Import failed: ${result.error}`);
          }
        });

        fileSection.appendChild(fileLabel);
        fileSection.appendChild(fileInput);
        container.appendChild(fileSection);
      },
      onSave: null,
      onClose: () => Modal.close()
    });
  }

  function renderManager(container) {
    container.innerHTML = "";
    container.className = "modal-container";

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const importBtn = document.createElement("button");
    importBtn.className = "btn btn-primary";
    importBtn.textContent = "📦 Import Usages";
    importBtn.addEventListener("click", () => {
      showImportDialog();
    });

    toolbar.appendChild(importBtn);
    container.appendChild(toolbar);

    // Display imported usages
    const importedUsages = getImportedUsages();
    if (importedUsages.length > 0) {
      const usageSection = document.createElement("div");
      usageSection.style.borderBottom = "1px solid var(--border)";
      usageSection.style.paddingBottom = "12px";

      const sectionHeader = document.createElement("div");
      sectionHeader.className = "status-bar";

      const sectionTitle = document.createElement("div");
      sectionTitle.textContent = `Imported Usages (${importedUsages.length})`;
      sectionTitle.style.fontSize = "14px";
      sectionTitle.style.fontWeight = "600";

      const clearBtn = document.createElement("button");
      clearBtn.className = "btn btn-secondary btn-small";
      clearBtn.textContent = "Clear All";
      clearBtn.addEventListener("click", () => {
        if (confirm(`Clear all ${importedUsages.length} imported usages?`)) {
          saveImportedUsages([]);
          renderManager(container);
        }
      });

      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(clearBtn);
      usageSection.appendChild(sectionHeader);

      // Table container with scroll
      const tableContainer = document.createElement("div");
      tableContainer.className = "table-container";

      // Table
      const table = document.createElement("table");
      table.className = "data-table";

      // Header row
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const headers = ["Code", "Resource Name", "Unit", "Rate", "Type"];
      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.className = "table-header";
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body rows
      const tbody = document.createElement("tbody");
      importedUsages.forEach((usage, idx) => {
        const row = document.createElement("tr");
        row.className = "table-row";

        const cells = [
          usage.code || "",
          usage.name || "",
          usage.unit || "",
          usage.rate ? `$${usage.rate.toFixed(2)}` : "",
          usage.type || ""
        ];

        cells.forEach(cellText => {
          const td = document.createElement("td");
          td.className = "table-cell";
          td.textContent = cellText;
          td.style.whiteSpace = "nowrap";
          td.style.overflow = "hidden";
          td.style.textOverflow = "ellipsis";
          td.style.maxWidth = "150px";
          row.appendChild(td);
        });

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      usageSection.appendChild(tableContainer);
      container.appendChild(usageSection);
    } else {
      // Empty state
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.innerHTML = `
        <div class="empty-state-title">No Usages Imported</div>
        <div class="empty-state-subtitle">Click <strong>Import Usages</strong> to get started.</div>
      `;
      container.appendChild(emptyState);
    }
  }

  function openManager() {
    Modal.open({
      title: "Usages Manager",
      content: (container) => renderManager(container),
      onSave: null,
      onClose: () => Modal.close()
    });
  }

  return {
    openManager,
    getImportedUsages,
    saveImportedUsages
  };
})();
