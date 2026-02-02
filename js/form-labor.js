// Labor estimate form: per WBS node

window.LaborForm = (function () {
  function openForNode(wbsNodeId) {
    const existing = (wbsPills[wbsNodeId] && wbsPills[wbsNodeId].laborData) || { resources: [] };

    let state = JSON.parse(JSON.stringify(existing)); // shallow clone

    Modal.open({
      title: `Labor Estimate — WBS ${wbsNodeId}`,
      content: (container) => renderForm(container, state),
      onSave: () => {
        if (!wbsPills[wbsNodeId]) {
          wbsPills[wbsNodeId] = { estimateType: [], tag: [], unit: [] };
        }
        wbsPills[wbsNodeId].laborData = state;
        Modal.close();
        // later: trigger rollup, etc.
      }
    });
  }

  async function renderForm(container, state) {
    container.innerHTML = "";

    const resourcesWrapper = document.createElement("div");
    resourcesWrapper.style.display = "flex";
    resourcesWrapper.style.flexDirection = "column";
    resourcesWrapper.style.gap = "8px";

    const addBtn = document.createElement("button");
    addBtn.className = "btn";
    addBtn.textContent = "Add Resource";
    addBtn.style.marginBottom = "8px";

    const resourcesData = await Rates.listResources();

    addBtn.addEventListener("click", () => {
      state.resources.push({
        resourceId: resourcesData.generic[0]?.id || "",
        regularHours: 0,
        overtimeHours: 0
      });
      renderRows();
    });

    container.appendChild(addBtn);
    container.appendChild(resourcesWrapper);

    function renderRows() {
      resourcesWrapper.innerHTML = "";

      state.resources.forEach((resEntry, index) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr 1fr auto";
        row.style.gap = "4px";
        row.style.alignItems = "center";

        // Resource select
        const select = document.createElement("select");
        select.style.width = "100%";
        const optGroupGeneric = document.createElement("optgroup");
        optGroupGeneric.label = "Generic";
        resourcesData.generic.forEach(r => {
          const opt = document.createElement("option");
          opt.value = r.id;
          opt.textContent = r.label;
          if (r.id === resEntry.resourceId) opt.selected = true;
          optGroupGeneric.appendChild(opt);
        });

        const optGroupNamed = document.createElement("optgroup");
        optGroupNamed.label = "Named";
        resourcesData.named.forEach(r => {
          const opt = document.createElement("option");
          opt.value = r.id;
          opt.textContent = r.label;
          if (r.id === resEntry.resourceId) opt.selected = true;
          optGroupNamed.appendChild(opt);
        });

        select.appendChild(optGroupGeneric);
        select.appendChild(optGroupNamed);

        select.addEventListener("change", async () => {
          resEntry.resourceId = select.value;
          await updateRatesAndTotals(resEntry, row);
        });

        // Regular hours
        const regInput = document.createElement("input");
        regInput.type = "number";
        regInput.min = "0";
        regInput.value = resEntry.regularHours || 0;
        regInput.style.width = "100%";
        regInput.addEventListener("input", async () => {
          resEntry.regularHours = parseFloat(regInput.value) || 0;
          await updateRatesAndTotals(resEntry, row);
        });

        // OT hours
        const otInput = document.createElement("input");
        otInput.type = "number";
        otInput.min = "0";
        otInput.value = resEntry.overtimeHours || 0;
        otInput.style.width = "100%";
        otInput.addEventListener("input", async () => {
          resEntry.overtimeHours = parseFloat(otInput.value) || 0;
          await updateRatesAndTotals(resEntry, row);
        });

        // Rate + totals display
        const costReg = document.createElement("div");
        const costOT = document.createElement("div");
        const sellReg = document.createElement("div");
        const sellOT = document.createElement("div");
        const totalCell = document.createElement("div");

        [costReg, costOT, sellReg, sellOT, totalCell].forEach(el => {
          el.style.textAlign = "right";
          el.style.fontVariantNumeric = "tabular-nums";
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn";
        removeBtn.textContent = "×";
        removeBtn.style.width = "28px";
        removeBtn.addEventListener("click", () => {
          state.resources.splice(index, 1);
          renderRows();
        });

        row.appendChild(select);
        row.appendChild(regInput);
        row.appendChild(otInput);
        row.appendChild(costReg);
        row.appendChild(costOT);
        row.appendChild(sellReg);
        row.appendChild(sellOT);
        row.appendChild(totalCell);
        row.appendChild(removeBtn);

        resourcesWrapper.appendChild(row);

        // initial calc
        updateRatesAndTotals(resEntry, row);
      });
    }

    async function updateRatesAndTotals(resEntry, row) {
      const [select, regInput, otInput, costReg, costOT, sellReg, sellOT, totalCell] =
        row.children;

      const rates = await Rates.getRates(resEntry.resourceId);
      if (!rates) {
        costReg.textContent = "-";
        costOT.textContent = "-";
        sellReg.textContent = "-";
        sellOT.textContent = "-";
        totalCell.textContent = "-";
        return;
      }

      const regHrs = resEntry.regularHours || 0;
      const otHrs = resEntry.overtimeHours || 0;

      const totalCost = regHrs * rates.costRegular + otHrs * rates.costOT;
      const totalSell = regHrs * rates.sellRegular + otHrs * rates.sellOT;

      resEntry.costRateRegular = rates.costRegular;
      resEntry.costRateOT = rates.costOT;
      resEntry.sellRateRegular = rates.sellRegular;
      resEntry.sellRateOT = rates.sellOT;
      resEntry.totalCost = totalCost;
      resEntry.totalSell = totalSell;

      costReg.textContent = rates.costRegular.toFixed(2);
      costOT.textContent = rates.costOT.toFixed(2);
      sellReg.textContent = rates.sellRegular.toFixed(2);
      sellOT.textContent = rates.sellOT.toFixed(2);
      totalCell.textContent = `${totalCost.toFixed(2)} / ${totalSell.toFixed(2)}`;
    }

    renderRows();
  }

  return { openForNode };
})();
