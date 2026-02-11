// Units Manager - Create and manage reusable billing units (labor + expenses)

window.UnitsManager = (function () {
  const UNITS_KEY = "estimator_units_v1";

  // =================== STORAGE ===================

  function getUnits() {
    try {
      const raw = localStorage.getItem(UNITS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load units", e);
      return [];
    }
  }

  function saveUnits(units) {
    try {
      localStorage.setItem(UNITS_KEY, JSON.stringify(units));
      return true;
    } catch (e) {
      console.warn("Failed to save units", e);
      return false;
    }
  }

  function getUnitById(id) {
    return getUnits().find(u => u.id === id) || null;
  }

  // =================== COST RATE LOOKUP ===================

  function lookupCostRate(costRateId) {
    if (!costRateId) return 0;
    try {
      const raw = localStorage.getItem("estimator_imported_rate_tables_v1");
      if (!raw) return 0;
      const rateTables = JSON.parse(raw);
      const match = rateTables.find(rt =>
        rt.costRateId && rt.costRateId.toUpperCase() === costRateId.toUpperCase()
      );
      if (match && match.costRate > 0) return parseFloat(match.costRate);
    } catch (e) { /* ignore */ }
    return 0;
  }

  // =================== KPI CALCULATIONS ===================

  function calculateKPIs(unit) {
    let totalLaborCostReg = 0;
    let totalLaborCostOT = 0;
    let directLaborBase = 0; // All hours at reg rate (attracts burden)
    let otPremium = 0;       // (OT rate - Reg rate) * OT hours (no burden)
    for (const item of unit.laborItems) {
      const rate = item.costRate || 0;
      const regCost = (item.qtyReg || 0) * rate;
      const otCost = (item.qtyOT || 0) * rate * 1.5;
      item.totalCost = regCost + otCost;
      totalLaborCostReg += regCost;
      totalLaborCostOT += otCost;
      // Burden base: all hours at regular rate
      directLaborBase += ((item.qtyReg || 0) + (item.qtyOT || 0)) * rate;
      // OT premium: unburdened
      otPremium += (item.qtyOT || 0) * rate * 0.5;
    }
    const totalLaborCost = totalLaborCostReg + totalLaborCostOT;

    // Burden: only applies to directLaborBase, not otPremium
    const fringeRegRate = window.ohRates?.regular?.laborFringe ?? 0;
    const ohRegRate = (window.ohRates?.regular?.operatingCosts ?? 0) + (window.ohRates?.regular?.operatingOH ?? 0);
    const fringeBurden = directLaborBase * fringeRegRate;
    const ohBurden = directLaborBase * ohRegRate;
    const burdenedLabor = totalLaborCost + fringeBurden + ohBurden;

    let totalSubsCost = 0;
    if (Array.isArray(unit.subItems)) {
      for (const item of unit.subItems) {
        totalSubsCost += Number(item.cost || 0);
      }
    }

    let totalExpenseCost = 0;
    for (const item of unit.expenseItems) {
      item.totalCost = (item.unitCost || 0) * (item.qty || 0);
      totalExpenseCost += item.totalCost;
    }

    const totalUnitCost = burdenedLabor + totalSubsCost + totalExpenseCost;
    const sellPrice = parseFloat(unit.sellPrice) || 0;
    const netRevenue = sellPrice - totalSubsCost - totalExpenseCost;
    const dlm = totalLaborCost > 0 ? netRevenue / totalLaborCost : 0;
    const gm = sellPrice - totalUnitCost;
    const gmPct = sellPrice > 0 ? (gm / sellPrice) * 100 : 0;
    const netMargin = netRevenue - burdenedLabor;
    const nmPct = netRevenue > 0 ? (netMargin / netRevenue) * 100 : 0;

    return { totalLaborCost, totalLaborCostReg, totalLaborCostOT, directLaborBase, otPremium, fringeBurden, ohBurden, burdenedLabor, totalSubsCost, totalExpenseCost, totalUnitCost, sellPrice, netRevenue, dlm, gm, gmPct, netMargin, nmPct };
  }

  // =================== FORMAT HELPERS ===================

  function fmt(val) {
    return "$" + (val || 0).toFixed(2);
  }

  // =================== MANAGER MODAL (LIST VIEW) ===================

  function openManager() {
    Modal.open({
      title: "Units Manager",
      content: (container) => renderManager(container),
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

    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.textContent = "+ New Unit";
    addBtn.addEventListener("click", () => openUnitEditor(null));

    toolbar.appendChild(addBtn);
    container.appendChild(toolbar);

    // Load units
    const units = getUnits();

    if (units.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-state-title">No Units Created</div>
        <div class="empty-state-subtitle">Click <strong>+ New Unit</strong> to create a billing unit.</div>
      `;
      container.appendChild(empty);
      return;
    }

    // Unit cards
    units.forEach(unit => {
      const kpis = calculateKPIs(unit);

      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
      card.addEventListener("click", () => openUnitEditor(unit));

      // Card title row
      const titleRow = document.createElement("div");
      titleRow.className = "card-title";

      const titleText = document.createElement("span");
      titleText.textContent = unit.name + (unit.billingUnit ? " (" + unit.billingUnit + ")" : "");

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-secondary btn-small";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openUnitEditor(unit);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-secondary btn-small";
      deleteBtn.textContent = "Delete";
      deleteBtn.style.color = "#ef4444";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm('Delete unit "' + unit.name + '"?')) return;
        const all = getUnits().filter(u => u.id !== unit.id);
        saveUnits(all);
        renderManager(container);
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      titleRow.appendChild(titleText);
      titleRow.appendChild(actions);
      card.appendChild(titleRow);

      // KPI summary
      const summary = document.createElement("div");
      summary.style.fontSize = "11px";
      summary.style.color = "var(--text-muted)";
      summary.style.display = "grid";
      summary.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
      summary.style.gap = "8px";
      summary.style.marginTop = "6px";

      const items = [
        { label: "Cost", value: fmt(kpis.totalUnitCost) },
        { label: "Sell", value: fmt(kpis.sellPrice) },
        { label: "DLM", value: kpis.dlm.toFixed(2) + "x" },
        { label: "GM%", value: kpis.gmPct.toFixed(1) + "%" }
      ];
      items.forEach(item => {
        const cell = document.createElement("div");
        cell.innerHTML = '<span style="color:var(--text-muted)">' + item.label + ':</span> <span style="color:var(--text);font-weight:500">' + item.value + '</span>';
        summary.appendChild(cell);
      });

      card.appendChild(summary);

      // Labor/expense counts
      const counts = document.createElement("div");
      counts.style.fontSize = "10px";
      counts.style.color = "var(--text-muted)";
      counts.style.marginTop = "4px";
      const subCount = (unit.subItems || []).length;
      counts.textContent = unit.laborItems.length + " labor, " + subCount + " subs, " + unit.expenseItems.length + " expense";
      card.appendChild(counts);

      container.appendChild(card);
    });
  }

  // =================== UNIT EDITOR MODAL ===================

  function openUnitEditor(existingUnit) {
    const unit = existingUnit
      ? JSON.parse(JSON.stringify(existingUnit))
      : {
          id: crypto.randomUUID(),
          name: "",
          billingUnit: "ea.",
          sellPrice: 0,
          laborItems: [],
          subItems: [],
          expenseItems: []
        };

    const isNew = !existingUnit;

    Modal.open({
      title: isNew ? "Create New Unit" : "Edit Unit: " + existingUnit.name,
      content: (container) => renderUnitEditor(container, unit),
      onSave: () => {
        if (!unit.name.trim()) {
          alert("Please enter a unit name.");
          return;
        }
        // Recalculate totals before saving
        calculateKPIs(unit);

        const all = getUnits();
        const idx = all.findIndex(u => u.id === unit.id);
        if (idx >= 0) {
          all[idx] = unit;
        } else {
          all.push(unit);
        }
        saveUnits(all);
        openManager(); // Return to list view
      },
      onClose: () => openManager()
    });
  }

  function renderUnitEditor(container, unit) {
    container.innerHTML = "";
    container.className = "modal-container";

    // KPI element references for live updates
    const kpiRefs = {};

    function updateKPIs() {
      const kpis = calculateKPIs(unit);
      if (kpiRefs.laborCost) kpiRefs.laborCost.textContent = fmt(kpis.totalLaborCost);
      if (kpiRefs.fringeBurden) kpiRefs.fringeBurden.textContent = fmt(kpis.fringeBurden);
      if (kpiRefs.ohBurden) kpiRefs.ohBurden.textContent = fmt(kpis.ohBurden);
      if (kpiRefs.burdenedLabor) kpiRefs.burdenedLabor.textContent = fmt(kpis.burdenedLabor);
      if (kpiRefs.subsCost) kpiRefs.subsCost.textContent = fmt(kpis.totalSubsCost);
      if (kpiRefs.expenseCost) kpiRefs.expenseCost.textContent = fmt(kpis.totalExpenseCost);
      if (kpiRefs.totalCost) kpiRefs.totalCost.textContent = fmt(kpis.totalUnitCost);
      if (kpiRefs.sellPrice) kpiRefs.sellPrice.textContent = fmt(kpis.sellPrice);
      if (kpiRefs.dlm) kpiRefs.dlm.textContent = kpis.dlm.toFixed(2) + "x";
      if (kpiRefs.gm) {
        kpiRefs.gm.textContent = fmt(kpis.gm);
        kpiRefs.gm.style.color = kpis.gm < 0 ? "#ef4444" : "#10b981";
      }
      if (kpiRefs.gmPct) {
        kpiRefs.gmPct.textContent = kpis.gmPct.toFixed(1) + "%";
        kpiRefs.gmPct.style.color = kpis.gmPct < 0 ? "#ef4444" : "#10b981";
      }
      if (kpiRefs.netMargin) {
        kpiRefs.netMargin.textContent = fmt(kpis.netMargin);
        kpiRefs.netMargin.style.color = kpis.netMargin < 0 ? "#ef4444" : "#10b981";
      }
      if (kpiRefs.nmPct) {
        kpiRefs.nmPct.textContent = kpis.nmPct.toFixed(1) + "%";
        kpiRefs.nmPct.style.color = kpis.nmPct < 0 ? "#ef4444" : "#10b981";
      }
      // Update labor row totals
      updateLaborTotals();
      // Update expense row totals
      updateExpenseTotals();
    }

    // === TWO-COLUMN LAYOUT: left (content) + right (sticky KPI) ===
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "16px";
    wrapper.style.alignItems = "flex-start";

    const leftCol = document.createElement("div");
    leftCol.style.flex = "1";
    leftCol.style.minWidth = "0";

    // === HEADER SECTION ===
    const headerSection = document.createElement("div");
    headerSection.style.display = "grid";
    headerSection.style.gridTemplateColumns = "1fr 120px 140px";
    headerSection.style.gap = "10px";
    headerSection.style.alignItems = "end";

    const nameGroup = createInputGroup("Unit Name", "text", unit.name, "e.g. Field Day Rate");
    nameGroup.input.addEventListener("input", () => { unit.name = nameGroup.input.value; });

    const billingGroup = createInputGroup("Billing Unit", "text", unit.billingUnit, "ea., lot, day");
    billingGroup.input.addEventListener("input", () => { unit.billingUnit = billingGroup.input.value; });

    const sellGroup = createInputGroup("Sell Price ($)", "number", unit.sellPrice || "", "0.00");
    sellGroup.input.step = "0.01";
    sellGroup.input.min = "0";
    sellGroup.input.style.textAlign = "right";
    sellGroup.input.addEventListener("input", () => {
      unit.sellPrice = parseFloat(sellGroup.input.value) || 0;
      updateKPIs();
    });

    headerSection.appendChild(nameGroup.wrapper);
    headerSection.appendChild(billingGroup.wrapper);
    headerSection.appendChild(sellGroup.wrapper);
    leftCol.appendChild(headerSection);

    // === LABOR SECTION ===
    const laborSection = document.createElement("div");
    laborSection.className = "modal-section";

    const laborTitle = document.createElement("div");
    laborTitle.className = "modal-section-title";
    laborTitle.textContent = "Labor";
    laborSection.appendChild(laborTitle);

    // Labor grid header
    const laborHeader = document.createElement("div");
    laborHeader.style.display = "grid";
    laborHeader.style.gridTemplateColumns = "1fr 90px 70px 70px 85px 85px 100px 32px";
    laborHeader.style.gap = "6px";
    laborHeader.style.fontSize = "11px";
    laborHeader.style.fontWeight = "600";
    laborHeader.style.color = "var(--text-muted)";
    laborHeader.style.padding = "0 0 4px 0";
    laborHeader.innerHTML = '<div>Resource</div><div>Job Level</div><div style="text-align:right">Reg (hrs)</div><div style="text-align:right">OT (hrs)</div><div style="text-align:right">Reg Rate</div><div style="text-align:right">OT Rate</div><div style="text-align:right">Total</div><div></div>';
    laborSection.appendChild(laborHeader);

    const laborList = document.createElement("div");
    laborList.style.display = "flex";
    laborList.style.flexDirection = "column";
    laborList.style.gap = "6px";
    laborSection.appendChild(laborList);

    // Track total elements per row for live updates
    const laborTotalEls = [];

    function updateLaborTotals() {
      unit.laborItems.forEach((item, i) => {
        if (laborTotalEls[i]) {
          laborTotalEls[i].textContent = fmt(item.totalCost || 0);
        }
      });
    }

    function renderLaborRows() {
      laborList.innerHTML = "";
      laborTotalEls.length = 0;

      const resources = (window.ResourceManager && ResourceManager.getImportedNamedResources)
        ? ResourceManager.getImportedNamedResources() : [];

      if (unit.laborItems.length === 0 && resources.length === 0) {
        const msg = document.createElement("div");
        msg.style.fontSize = "11px";
        msg.style.color = "var(--text-muted)";
        msg.style.padding = "8px 0";
        msg.textContent = "Import employees via Resource Mgmt to add labor items.";
        laborList.appendChild(msg);
        return;
      }

      unit.laborItems.forEach((item, idx) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 90px 70px 70px 85px 85px 100px 32px";
        row.style.gap = "6px";
        row.style.alignItems = "center";

        // Searchable resource picker
        const pickerCell = document.createElement("div");
        pickerCell.style.position = "relative";

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "form-input";
        searchInput.style.fontSize = "11px";
        searchInput.style.width = "100%";
        searchInput.style.boxSizing = "border-box";
        searchInput.placeholder = "Type to search...";
        searchInput.value = item.resourceId
          ? (item.jobLevel || "") + " - " + (item.resourceName || "")
          : "";

        const dropdown = document.createElement("div");
        dropdown.style.position = "absolute";
        dropdown.style.top = "100%";
        dropdown.style.left = "0";
        dropdown.style.right = "0";
        dropdown.style.maxHeight = "180px";
        dropdown.style.overflowY = "auto";
        dropdown.style.background = "var(--bg-panel)";
        dropdown.style.border = "1px solid var(--border)";
        dropdown.style.borderTop = "none";
        dropdown.style.borderRadius = "0 0 4px 4px";
        dropdown.style.zIndex = "100";
        dropdown.style.display = "none";

        function showDropdown(filter) {
          dropdown.innerHTML = "";
          const term = (filter || "").toLowerCase();
          const matches = resources.filter(r => {
            const text = ((r.jobLevel || "") + " " + (r.name || "") + " " + (r.employeeId || "")).toLowerCase();
            return text.includes(term);
          });
          if (matches.length === 0) {
            const noMatch = document.createElement("div");
            noMatch.style.padding = "6px 8px";
            noMatch.style.fontSize = "11px";
            noMatch.style.color = "var(--text-muted)";
            noMatch.textContent = "No matches";
            dropdown.appendChild(noMatch);
          } else {
            matches.forEach(r => {
              const opt = document.createElement("div");
              opt.style.padding = "5px 8px";
              opt.style.fontSize = "11px";
              opt.style.cursor = "pointer";
              opt.textContent = (r.jobLevel || "") + " - " + (r.name || r.employeeId || "");
              opt.addEventListener("mouseenter", () => { opt.style.background = "var(--bg-hover)"; });
              opt.addEventListener("mouseleave", () => { opt.style.background = ""; });
              opt.addEventListener("mousedown", (e) => {
                e.preventDefault(); // Prevent blur before click registers
                selectResource(r);
                dropdown.style.display = "none";
              });
              dropdown.appendChild(opt);
            });
          }
          dropdown.style.display = "";
        }

        function selectResource(res) {
          item.resourceId = res.id;
          item.resourceName = res.name || res.employeeId || "";
          item.jobLevel = res.jobLevel || "";
          item.costRateId = res.costRateId || "";
          item.costRate = lookupCostRate(res.costRateId);
          searchInput.value = (res.jobLevel || "") + " - " + (res.name || res.employeeId || "");
          jobLvl.textContent = item.jobLevel;
          rateEl.textContent = fmt(item.costRate);
          otRateEl.textContent = fmt(item.costRate * 1.5);
          recalcRow();
        }

        function recalcRow() {
          const regCost = (item.qtyReg || 0) * (item.costRate || 0);
          const otCost = (item.qtyOT || 0) * (item.costRate || 0) * 1.5;
          item.totalCost = regCost + otCost;
          totalEl.textContent = fmt(item.totalCost);
          updateKPIs();
        }

        searchInput.addEventListener("focus", () => showDropdown(searchInput.value));
        searchInput.addEventListener("input", () => showDropdown(searchInput.value));
        searchInput.addEventListener("blur", () => {
          // Small delay so mousedown on dropdown item fires first
          setTimeout(() => { dropdown.style.display = "none"; }, 150);
        });

        pickerCell.appendChild(searchInput);
        pickerCell.appendChild(dropdown);

        // Job level display
        const jobLvl = document.createElement("div");
        jobLvl.style.fontSize = "11px";
        jobLvl.style.color = "var(--text-muted)";
        jobLvl.textContent = item.jobLevel || "";

        // Reg hours input
        const regInput = document.createElement("input");
        regInput.type = "number";
        regInput.className = "form-input";
        regInput.style.textAlign = "right";
        regInput.style.fontSize = "11px";
        regInput.min = "0";
        regInput.step = "0.25";
        regInput.value = item.qtyReg || "";

        // OT hours input
        const otInput = document.createElement("input");
        otInput.type = "number";
        otInput.className = "form-input";
        otInput.style.textAlign = "right";
        otInput.style.fontSize = "11px";
        otInput.min = "0";
        otInput.step = "0.25";
        otInput.value = item.qtyOT || "";

        // Reg rate display
        const rateEl = document.createElement("div");
        rateEl.style.fontSize = "11px";
        rateEl.style.textAlign = "right";
        rateEl.style.fontFamily = "monospace";
        rateEl.textContent = item.costRate ? fmt(item.costRate) : "$0.00";

        // OT rate display (reg * 1.5)
        const otRateEl = document.createElement("div");
        otRateEl.style.fontSize = "11px";
        otRateEl.style.textAlign = "right";
        otRateEl.style.fontFamily = "monospace";
        otRateEl.textContent = item.costRate ? fmt(item.costRate * 1.5) : "$0.00";

        // Total display
        const totalEl = document.createElement("div");
        totalEl.style.fontSize = "11px";
        totalEl.style.textAlign = "right";
        totalEl.style.fontFamily = "monospace";
        totalEl.style.fontWeight = "600";
        totalEl.textContent = fmt(item.totalCost || 0);
        laborTotalEls[idx] = totalEl;

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-secondary";
        removeBtn.textContent = "\u00d7";
        removeBtn.style.width = "28px";
        removeBtn.style.padding = "2px";
        removeBtn.addEventListener("click", () => {
          unit.laborItems.splice(idx, 1);
          renderLaborRows();
          updateKPIs();
        });

        // Reg hours change
        regInput.addEventListener("input", () => {
          item.qtyReg = parseFloat(regInput.value) || 0;
          recalcRow();
        });

        // OT hours change
        otInput.addEventListener("input", () => {
          item.qtyOT = parseFloat(otInput.value) || 0;
          recalcRow();
        });

        row.appendChild(pickerCell);
        row.appendChild(jobLvl);
        row.appendChild(regInput);
        row.appendChild(otInput);
        row.appendChild(rateEl);
        row.appendChild(otRateEl);
        row.appendChild(totalEl);
        row.appendChild(removeBtn);
        laborList.appendChild(row);
      });
    }

    const addLaborBtn = document.createElement("button");
    addLaborBtn.className = "btn btn-secondary btn-small";
    addLaborBtn.textContent = "+ Add Labor";
    addLaborBtn.style.marginTop = "6px";
    addLaborBtn.addEventListener("click", () => {
      unit.laborItems.push({
        id: crypto.randomUUID(),
        resourceId: "",
        resourceName: "",
        jobLevel: "",
        costRateId: "",
        costRate: 0,
        qtyReg: 0,
        qtyOT: 0,
        totalCost: 0
      });
      renderLaborRows();
    });
    laborSection.appendChild(addLaborBtn);
    leftCol.appendChild(laborSection);

    // === SUBCONSULTANTS SECTION ===
    const subsSection = document.createElement("div");
    subsSection.className = "modal-section";

    const subsTitle = document.createElement("div");
    subsTitle.className = "modal-section-title";
    subsTitle.textContent = "Subconsultants";
    subsSection.appendChild(subsTitle);

    const subsHeader = document.createElement("div");
    subsHeader.style.display = "grid";
    subsHeader.style.gridTemplateColumns = "1fr 120px 32px";
    subsHeader.style.gap = "6px";
    subsHeader.style.fontSize = "11px";
    subsHeader.style.fontWeight = "600";
    subsHeader.style.color = "var(--text-muted)";
    subsHeader.style.padding = "0 0 4px 0";
    subsHeader.innerHTML = '<div>Name</div><div style="text-align:right">Cost</div><div></div>';
    subsSection.appendChild(subsHeader);

    const subsList = document.createElement("div");
    subsList.style.display = "flex";
    subsList.style.flexDirection = "column";
    subsList.style.gap = "6px";
    subsSection.appendChild(subsList);

    if (!Array.isArray(unit.subItems)) unit.subItems = [];

    function renderSubRows() {
      subsList.innerHTML = "";

      unit.subItems.forEach((item, idx) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 120px 32px";
        row.style.gap = "6px";
        row.style.alignItems = "center";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "form-input";
        nameInput.style.fontSize = "11px";
        nameInput.placeholder = "Subconsultant name";
        nameInput.value = item.name || "";
        nameInput.addEventListener("input", () => { item.name = nameInput.value; });

        const costInput = document.createElement("input");
        costInput.type = "number";
        costInput.className = "form-input";
        costInput.style.textAlign = "right";
        costInput.style.fontSize = "11px";
        costInput.step = "0.01";
        costInput.min = "0";
        costInput.value = item.cost || "";
        costInput.addEventListener("input", () => {
          item.cost = parseFloat(costInput.value) || 0;
          updateKPIs();
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-secondary";
        removeBtn.textContent = "\u00d7";
        removeBtn.style.width = "28px";
        removeBtn.style.padding = "2px";
        removeBtn.addEventListener("click", () => {
          unit.subItems.splice(idx, 1);
          renderSubRows();
          updateKPIs();
        });

        row.appendChild(nameInput);
        row.appendChild(costInput);
        row.appendChild(removeBtn);
        subsList.appendChild(row);
      });
    }

    const addSubBtn = document.createElement("button");
    addSubBtn.className = "btn btn-secondary btn-small";
    addSubBtn.textContent = "+ Add Subconsultant";
    addSubBtn.style.marginTop = "6px";
    addSubBtn.addEventListener("click", () => {
      unit.subItems.push({
        id: crypto.randomUUID(),
        name: "",
        cost: 0
      });
      renderSubRows();
    });
    subsSection.appendChild(addSubBtn);
    leftCol.appendChild(subsSection);

    // === EXPENSES SECTION ===
    const expenseSection = document.createElement("div");
    expenseSection.className = "modal-section";

    const expenseTitle = document.createElement("div");
    expenseTitle.className = "modal-section-title";
    expenseTitle.textContent = "Expenses";
    expenseSection.appendChild(expenseTitle);

    // Expense grid header
    const expenseHeader = document.createElement("div");
    expenseHeader.style.display = "grid";
    expenseHeader.style.gridTemplateColumns = "1fr 1fr 100px 80px 100px 32px";
    expenseHeader.style.gap = "6px";
    expenseHeader.style.fontSize = "11px";
    expenseHeader.style.fontWeight = "600";
    expenseHeader.style.color = "var(--text-muted)";
    expenseHeader.style.padding = "0 0 4px 0";
    expenseHeader.innerHTML = '<div>Name / Usage</div><div>Description</div><div style="text-align:right">Unit Cost</div><div style="text-align:right">Qty</div><div style="text-align:right">Total</div><div></div>';
    expenseSection.appendChild(expenseHeader);

    const expenseList = document.createElement("div");
    expenseList.style.display = "flex";
    expenseList.style.flexDirection = "column";
    expenseList.style.gap = "6px";
    expenseSection.appendChild(expenseList);

    const expenseTotalEls = [];

    function updateExpenseTotals() {
      unit.expenseItems.forEach((item, i) => {
        if (expenseTotalEls[i]) {
          expenseTotalEls[i].textContent = fmt(item.totalCost || 0);
        }
      });
    }

    function renderExpenseRows() {
      expenseList.innerHTML = "";
      expenseTotalEls.length = 0;

      const usages = (window.UsagesManager && UsagesManager.getImportedUsages)
        ? UsagesManager.getImportedUsages() : [];

      unit.expenseItems.forEach((item, idx) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 1fr 100px 80px 100px 32px";
        row.style.gap = "6px";
        row.style.alignItems = "center";

        // Searchable expense picker (usages + custom text)
        const descCell = document.createElement("div");
        descCell.style.position = "relative";

        const descInput = document.createElement("input");
        descInput.type = "text";
        descInput.className = "form-input";
        descInput.style.fontSize = "11px";
        descInput.style.width = "100%";
        descInput.style.boxSizing = "border-box";
        descInput.placeholder = "Search usages or type custom...";
        descInput.value = item.description || "";

        const descDropdown = document.createElement("div");
        descDropdown.style.position = "absolute";
        descDropdown.style.top = "100%";
        descDropdown.style.left = "0";
        descDropdown.style.right = "0";
        descDropdown.style.maxHeight = "180px";
        descDropdown.style.overflowY = "auto";
        descDropdown.style.background = "var(--bg-panel)";
        descDropdown.style.border = "1px solid var(--border)";
        descDropdown.style.borderTop = "none";
        descDropdown.style.borderRadius = "0 0 4px 4px";
        descDropdown.style.zIndex = "100";
        descDropdown.style.display = "none";

        const costInput = document.createElement("input");
        costInput.type = "number";
        costInput.className = "form-input";
        costInput.style.textAlign = "right";
        costInput.style.fontSize = "11px";
        costInput.step = "0.01";
        costInput.min = "0";
        costInput.value = item.unitCost || "";

        function showExpenseDropdown(filter) {
          descDropdown.innerHTML = "";
          if (usages.length === 0) {
            descDropdown.style.display = "none";
            return;
          }
          const term = (filter || "").toLowerCase();
          const matches = usages.filter(u => {
            const text = ((u.code || "") + " " + (u.name || "") + " " + (u.unit || "")).toLowerCase();
            return text.includes(term);
          });
          if (matches.length === 0) {
            descDropdown.style.display = "none";
            return;
          }
          matches.forEach(u => {
            const opt = document.createElement("div");
            opt.style.padding = "5px 8px";
            opt.style.fontSize = "11px";
            opt.style.cursor = "pointer";
            opt.style.display = "flex";
            opt.style.justifyContent = "space-between";
            opt.style.gap = "8px";
            const nameSpan = document.createElement("span");
            nameSpan.textContent = (u.code || "") + " - " + (u.name || "");
            nameSpan.style.overflow = "hidden";
            nameSpan.style.textOverflow = "ellipsis";
            nameSpan.style.whiteSpace = "nowrap";
            const rateSpan = document.createElement("span");
            rateSpan.style.color = "var(--text-muted)";
            rateSpan.style.whiteSpace = "nowrap";
            rateSpan.textContent = u.rate ? fmt(u.rate) + (u.unit ? "/" + u.unit : "") : "";
            opt.appendChild(nameSpan);
            opt.appendChild(rateSpan);
            opt.addEventListener("mouseenter", () => { opt.style.background = "var(--bg-hover)"; });
            opt.addEventListener("mouseleave", () => { opt.style.background = ""; });
            opt.addEventListener("mousedown", (e) => {
              e.preventDefault();
              item.usageId = u.id;
              item.description = u.name || u.code || "";
              item.unitCost = u.rate || 0;
              descInput.value = item.description;
              costInput.value = item.unitCost || "";
              item.totalCost = item.unitCost * (item.qty || 0);
              descDropdown.style.display = "none";
              updateKPIs();
            });
            descDropdown.appendChild(opt);
          });
          descDropdown.style.display = "";
        }

        descInput.addEventListener("focus", () => showExpenseDropdown(descInput.value));
        descInput.addEventListener("input", () => {
          // Typing clears any previous usage selection — becomes custom
          item.usageId = null;
          item.description = descInput.value;
          showExpenseDropdown(descInput.value);
        });
        descInput.addEventListener("blur", () => {
          setTimeout(() => { descDropdown.style.display = "none"; }, 150);
        });

        descCell.appendChild(descInput);
        descCell.appendChild(descDropdown);

        // Description text input (separate column)
        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.className = "form-input";
        noteInput.style.fontSize = "11px";
        noteInput.placeholder = "Description / notes";
        noteInput.value = item.note || "";
        noteInput.addEventListener("input", () => {
          item.note = noteInput.value;
        });

        // Cost input events
        costInput.addEventListener("input", () => {
          item.unitCost = parseFloat(costInput.value) || 0;
          item.totalCost = item.unitCost * (item.qty || 0);
          updateKPIs();
        });

        // Qty input
        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.className = "form-input";
        qtyInput.style.textAlign = "right";
        qtyInput.style.fontSize = "11px";
        qtyInput.min = "0";
        qtyInput.step = "1";
        qtyInput.value = item.qty || "";

        qtyInput.addEventListener("input", () => {
          item.qty = parseFloat(qtyInput.value) || 0;
          item.totalCost = (item.unitCost || 0) * item.qty;
          updateKPIs();
        });

        // Total display
        const totalEl = document.createElement("div");
        totalEl.style.fontSize = "11px";
        totalEl.style.textAlign = "right";
        totalEl.style.fontFamily = "monospace";
        totalEl.style.fontWeight = "600";
        totalEl.textContent = fmt(item.totalCost || 0);
        expenseTotalEls[idx] = totalEl;

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-secondary";
        removeBtn.textContent = "\u00d7";
        removeBtn.style.width = "28px";
        removeBtn.style.padding = "2px";
        removeBtn.addEventListener("click", () => {
          unit.expenseItems.splice(idx, 1);
          renderExpenseRows();
          updateKPIs();
        });

        row.appendChild(descCell);
        row.appendChild(noteInput);
        row.appendChild(costInput);
        row.appendChild(qtyInput);
        row.appendChild(totalEl);
        row.appendChild(removeBtn);
        expenseList.appendChild(row);
      });
    }

    const addExpenseBtn = document.createElement("button");
    addExpenseBtn.className = "btn btn-secondary btn-small";
    addExpenseBtn.textContent = "+ Add Expense";
    addExpenseBtn.style.marginTop = "6px";
    addExpenseBtn.addEventListener("click", () => {
      unit.expenseItems.push({
        id: crypto.randomUUID(),
        description: "",
        usageId: null,
        unitCost: 0,
        qty: 0,
        totalCost: 0
      });
      renderExpenseRows();
    });
    expenseSection.appendChild(addExpenseBtn);
    leftCol.appendChild(expenseSection);

    // === KPI PANEL (right column, sticky) ===
    const rightCol = document.createElement("div");
    rightCol.style.width = "220px";
    rightCol.style.flexShrink = "0";
    rightCol.style.position = "sticky";
    rightCol.style.top = "0";
    rightCol.style.alignSelf = "flex-start";

    const kpiSection = document.createElement("div");
    kpiSection.style.background = "var(--bg-hover)";
    kpiSection.style.borderRadius = "6px";
    kpiSection.style.padding = "12px";

    const kpiTitle = document.createElement("div");
    kpiTitle.style.fontSize = "12px";
    kpiTitle.style.fontWeight = "700";
    kpiTitle.style.marginBottom = "10px";
    kpiTitle.textContent = "Unit Summary";
    kpiSection.appendChild(kpiTitle);

    const kpiList = document.createElement("div");
    kpiList.style.display = "flex";
    kpiList.style.flexDirection = "column";
    kpiList.style.gap = "6px";
    kpiList.style.fontSize = "11px";

    function createKPIRow(label, ref, isBold) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";

      const lbl = document.createElement("span");
      lbl.style.color = "var(--text-muted)";
      lbl.textContent = label;

      const val = document.createElement("span");
      val.style.fontFamily = "monospace";
      val.style.fontWeight = isBold ? "700" : "600";
      val.textContent = "$0.00";

      kpiRefs[ref] = val;
      row.appendChild(lbl);
      row.appendChild(val);
      return row;
    }

    function createSeparator() {
      const sep = document.createElement("div");
      sep.style.borderTop = "1px solid var(--border)";
      sep.style.margin = "2px 0";
      return sep;
    }

    kpiList.appendChild(createKPIRow("Direct Labor", "laborCost"));
    kpiList.appendChild(createKPIRow("Fringe Burden", "fringeBurden"));
    kpiList.appendChild(createKPIRow("OH Burden", "ohBurden"));
    kpiList.appendChild(createKPIRow("Burdened Labor", "burdenedLabor", true));
    kpiList.appendChild(createKPIRow("Subs Cost", "subsCost"));
    kpiList.appendChild(createKPIRow("Expense Cost", "expenseCost"));
    kpiList.appendChild(createSeparator());
    kpiList.appendChild(createKPIRow("Total Unit Cost", "totalCost", true));
    kpiList.appendChild(createKPIRow("Sell Price", "sellPrice", true));
    kpiList.appendChild(createSeparator());
    kpiList.appendChild(createKPIRow("DLM", "dlm"));
    kpiList.appendChild(createKPIRow("Gross Margin", "gm"));
    kpiList.appendChild(createKPIRow("GM%", "gmPct"));
    kpiList.appendChild(createKPIRow("Net Margin", "netMargin"));
    kpiList.appendChild(createKPIRow("NM%", "nmPct"));

    kpiSection.appendChild(kpiList);
    rightCol.appendChild(kpiSection);

    // Assemble layout
    wrapper.appendChild(leftCol);
    wrapper.appendChild(rightCol);
    container.appendChild(wrapper);

    // Initial render
    renderLaborRows();
    renderSubRows();
    renderExpenseRows();
    updateKPIs();
  }

  // =================== INPUT GROUP HELPER ===================

  function createInputGroup(label, type, value, placeholder) {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "4px";

    const lbl = document.createElement("label");
    lbl.style.fontSize = "11px";
    lbl.style.fontWeight = "600";
    lbl.style.color = "var(--text-muted)";
    lbl.textContent = label;

    const input = document.createElement("input");
    input.type = type;
    input.className = "form-input";
    input.value = value || "";
    if (placeholder) input.placeholder = placeholder;

    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return { wrapper, input };
  }

  // =================== PUBLIC API ===================

  return {
    openManager,
    getUnits,
    getUnitById,
    calculateKPIs
  };
})();
