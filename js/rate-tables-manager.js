// Rate Tables Manager - Import and manage labor cost rate tables

window.RateTablesManager = (function () {
  const IMPORTED_RATE_TABLES_KEY = "estimator_imported_rate_tables_v1";

  function getImportedRateTables() {
    try {
      const raw = localStorage.getItem(IMPORTED_RATE_TABLES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load imported rate tables", e);
      return [];
    }
  }

  function saveImportedRateTables(rateTables) {
    try {
      localStorage.setItem(IMPORTED_RATE_TABLES_KEY, JSON.stringify(rateTables));
      return true;
    } catch (e) {
      console.warn("Failed to save imported rate tables", e);
      return false;
    }
  }

  // Parse rate table CSV
  function parseRateTableCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rateTables = [];

    // Expected headers: CostRate_ID, Cost_Rate
    const costRateIdIdx = headers.findIndex(h => h.toLowerCase() === 'costrate_id');
    const costRateIdx = headers.findIndex(h => h.toLowerCase() === 'cost_rate');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));

      const costRateId = costRateIdIdx >= 0 ? cells[costRateIdIdx] : '';
      const costRate = costRateIdx >= 0 ? parseFloat(cells[costRateIdx]) || 0 : 0;

      if (!costRateId) continue;

      rateTables.push({
        id: `rate-${crypto.randomUUID()}`,
        costRateId,
        costRate,
        type: "costRate"
      });
    }

    return rateTables;
  }

  // Import rate tables from SharePoint URL
  async function importRateTablesFromSharePoint(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const csvText = await response.text();
      const rateTables = parseRateTableCSV(csvText);
      if (rateTables.length > 0) {
        saveImportedRateTables(rateTables);
        return { success: true, count: rateTables.length };
      }
      return { success: false, error: "No valid rate tables found in CSV" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Import rate tables from file
  function importRateTablesFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const rateTables = parseRateTableCSV(csvText);
          if (rateTables.length > 0) {
            saveImportedRateTables(rateTables);
            resolve({ success: true, count: rateTables.length });
          } else {
            resolve({ success: false, error: "No valid rate tables found in CSV" });
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
      title: "Import Labor Cost Rate Tables",
      content: (container) => {
        container.innerHTML = "";
        container.className = "modal-container";

        // Instructions
        const instructions = document.createElement("div");
        instructions.className = "modal-instructions";
        instructions.innerHTML = `
          <strong>Expected CSV Columns:</strong><br>
          CostRate_ID, Cost_Rate
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
        urlInput.placeholder = "https://sharepoint.com/path/to/rate-tables.csv";

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
          const result = await importRateTablesFromSharePoint(url);
          if (result.success) {
            alert(`Successfully imported ${result.count} rate table records`);
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

          const result = await importRateTablesFromFile(file);
          if (result.success) {
            alert(`Successfully imported ${result.count} rate table records`);
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
    importBtn.textContent = "📊 Import Rate Tables";
    importBtn.addEventListener("click", () => {
      showImportDialog();
    });

    toolbar.appendChild(importBtn);
    container.appendChild(toolbar);

    // Display imported rate tables
    const importedRateTables = getImportedRateTables();
    if (importedRateTables.length > 0) {
      const rateSection = document.createElement("div");
      rateSection.style.borderBottom = "1px solid var(--border)";
      rateSection.style.paddingBottom = "12px";

      const sectionHeader = document.createElement("div");
      sectionHeader.className = "status-bar";

      const sectionTitle = document.createElement("div");
      sectionTitle.textContent = `Imported Rate Tables (${importedRateTables.length})`;
      sectionTitle.style.fontSize = "14px";
      sectionTitle.style.fontWeight = "600";

      const clearBtn = document.createElement("button");
      clearBtn.className = "btn btn-secondary btn-small";
      clearBtn.textContent = "Clear All";
      clearBtn.addEventListener("click", () => {
        if (confirm(`Clear all ${importedRateTables.length} imported rate table records?`)) {
          saveImportedRateTables([]);
          renderManager(container);
        }
      });

      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(clearBtn);
      rateSection.appendChild(sectionHeader);

      // Table container with scroll
      const tableContainer = document.createElement("div");
      tableContainer.className = "table-container";

      // Table
      const table = document.createElement("table");
      table.className = "data-table";

      // Header row
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const headers = ["CostRate_ID", "Cost Rate"];
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
      importedRateTables.forEach((rate, idx) => {
        const row = document.createElement("tr");
        row.className = "table-row";

        const cells = [
          rate.costRateId || "",
          rate.costRate !== undefined && rate.costRate !== null && rate.costRate !== "" ? `$${parseFloat(rate.costRate).toFixed(2)}` : ""
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
      rateSection.appendChild(tableContainer);
      container.appendChild(rateSection);
    } else {
      // Empty state
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.innerHTML = `
        <div class="empty-state-title">No Rate Tables Imported</div>
        <div class="empty-state-subtitle">Click <strong>Import Rate Tables</strong> to get started.</div>
      `;
      container.appendChild(emptyState);
    }
  }

  function openManager() {
    Modal.open({
      title: "Labor Cost Rate Tables Manager",
      content: (container) => renderManager(container),
      onSave: null,
      onClose: () => Modal.close()
    });
  }

  return {
    openManager,
    getImportedRateTables,
    saveImportedRateTables
  };
})();
