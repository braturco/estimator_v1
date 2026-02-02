// Labor Matrix - Global labor estimation view showing all tasks and shared resources
// Uses same styling as WBS for seamless integration

window.LaborMatrix = (function () {
  
  // Render integrated WBS + Labor columns for seamless mode
  function render(container) {
      console.log(`📊 LaborMatrix.render called`);
      container.innerHTML = "";

      const fmtMoney = (v) => {
        if (typeof formatMoney === "function") return formatMoney(v);
        const n = Number(v || 0);
        if (!Number.isFinite(n)) return "";
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const fmtPercent = (v) => {
        if (typeof formatPercent === "function") return formatPercent(v);
        const n = Number(v || 0);
        if (!Number.isFinite(n)) return "";
        return (n * 100).toFixed(1) + "%";
      };

      const laborColWidth = "105px";
      const laborColCount = Math.max(laborResources.length * 2, 1);
      const columns = [
        "100px",
        "260px",
        ...Array(laborColCount).fill(laborColWidth),
        "160px",
        "160px",
        "120px",
        "120px",
        "120px",
        "120px",
        "120px",
        "90px",
        "90px",
        "90px"
      ];

      container.style.setProperty("--wbs-columns", columns.join(" "));

      const gridContainer = document.createElement("div");
      gridContainer.style.overflow = "auto";
      gridContainer.style.flex = "1";
      gridContainer.style.minHeight = "0";
      gridContainer.style.paddingTop = "40px";
      gridContainer.style.position = "relative";
      container.appendChild(gridContainer);

      // Toolbar with Add Resource button - positioned absolutely within gridContainer
      const toolbar = document.createElement("div");
      toolbar.style.position = "absolute";
      toolbar.style.top = "8px";
      toolbar.style.left = "8px";
      toolbar.style.display = "flex";
      toolbar.style.gap = "8px";
      toolbar.style.zIndex = "15";
      gridContainer.appendChild(toolbar);

      const addResourceBtn = document.createElement("button");
      addResourceBtn.className = "btn btn-primary";
      addResourceBtn.textContent = "+ Resource";
      addResourceBtn.style.fontSize = "13px";
      addResourceBtn.style.padding = "6px 12px";
      addResourceBtn.addEventListener("click", () => {
        const name = prompt("Resource name:");
        if (name) {
          laborResources.push({
            id: crypto.randomUUID(),
            name: name,
            chargeoutRate: 100,
            costRate: 60
          });
          renderWBS();
        }
      });

      toolbar.appendChild(addResourceBtn);

      const headerRow = document.createElement("div");
      headerRow.className = "wbs-row wbs-header";
      headerRow.innerHTML = "";

      const headerWbs = document.createElement("div");
      headerWbs.className = "col-header";
      headerWbs.textContent = "WBS";
      headerRow.appendChild(headerWbs);

      const headerActivity = document.createElement("div");
      headerActivity.className = "col-header";
      headerActivity.textContent = "Activity";
      headerRow.appendChild(headerActivity);

      if (laborResources.length === 0) {
        const resHeader = document.createElement("div");
        resHeader.textContent = "Labor";
        resHeader.style.gridColumn = "span 1";
        resHeader.style.textAlign = "center";
        resHeader.style.fontSize = "11px";
        resHeader.style.fontWeight = "600";
        headerRow.appendChild(resHeader);
      } else {
        laborResources.forEach(resource => {
          const resHeader = document.createElement("div");
          resHeader.textContent = resource.name;
          resHeader.style.gridColumn = "span 2";
          resHeader.style.textAlign = "center";
          resHeader.style.fontSize = "11px";
          resHeader.style.fontWeight = "600";
          headerRow.appendChild(resHeader);
        });
      }

      const headerCols = [
        "Estimate Type",
        "Tags",
        "Direct Labour",
        "Expenses",
        "Burdened",
        "Net Revenue",
        "Gross Revenue",
        "NM%",
        "GM%",
        "DLM"
      ];

      headerCols.forEach(label => {
        const h = document.createElement("div");
        h.className = "col-header";
        h.textContent = label;
        headerRow.appendChild(h);
      });

      gridContainer.appendChild(headerRow);

      const subHeaderRow = document.createElement("div");
      subHeaderRow.className = "wbs-row wbs-header";
      subHeaderRow.style.fontSize = "10px";
      subHeaderRow.style.color = "var(--text-muted)";

      subHeaderRow.appendChild(document.createElement("div"));
      subHeaderRow.appendChild(document.createElement("div"));

      if (laborResources.length === 0) {
        subHeaderRow.appendChild(document.createElement("div"));
      } else {
        laborResources.forEach(() => {
          const reg = document.createElement("div");
          reg.textContent = "Reg";
          reg.style.textAlign = "center";
          subHeaderRow.appendChild(reg);

          const ot = document.createElement("div");
          ot.textContent = "OT";
          ot.style.textAlign = "center";
          subHeaderRow.appendChild(ot);
        });
      }

      for (let i = 0; i < 10; i++) {
        subHeaderRow.appendChild(document.createElement("div"));
      }

      gridContainer.appendChild(subHeaderRow);

      function createInput(value, onChange) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "0.5";
        input.value = value || 0;
        input.style.width = "100%";
        input.style.padding = "2px 2px";
        input.style.border = "none";
        input.style.background = "var(--bg)";
        input.style.color = "var(--text)";
        input.style.textAlign = "center";
        input.style.fontSize = "12px";
        input.style.boxSizing = "border-box";
        input.style.setProperty("-webkit-outer-spin-button", "display: none !important");
        input.style.setProperty("-webkit-inner-spin-button", "display: none !important");
        input.style.MozAppearance = "textfield";
        input.addEventListener("change", () => onChange(parseFloat(input.value) || 0));
        return input;
      }

      function renderLaborNode(node) {
        const hasChildren = node.children && node.children.length > 0;
        const level = node.level || 1;
        const isLeaf = !hasChildren;

        const row = document.createElement("div");
        row.className = "wbs-row";
        row.dataset.id = node.id;
        row.classList.add(`wbs-level-${level}`);
        row.classList.add(`level-${level}`);
        row.onclick = () => {
          if (typeof selectRow === "function") {
            selectRow(node.id);
          }
        };

        const codeCell = document.createElement("div");
        codeCell.className = "wbs-code";
        codeCell.textContent = node.code || "";
        row.appendChild(codeCell);

        const nameCell = document.createElement("div");
        nameCell.className = hasChildren
          ? `wbs-name rollup${node.collapsed ? " collapsed" : ""}`
          : "wbs-name";
        nameCell.classList.add(`wbs-indent-${level}`);
        nameCell.dataset.id = node.id;
        nameCell.innerHTML = `<span class="wbs-activity-label">${node.name}</span>`;
        row.appendChild(nameCell);

        if (hasChildren) {
          nameCell.onclick = (e) => {
            e.stopPropagation();
            node.collapsed = !node.collapsed;
            renderWBS();
          };
        }

        const labelEl = nameCell.querySelector(".wbs-activity-label");
        if (labelEl && typeof startInlineRename === "function") {
          labelEl.ondblclick = (e) => {
            e.stopPropagation();
            startInlineRename(labelEl);
          };
        }

        if (!laborActivities[node.id]) {
          laborActivities[node.id] = { activities: [] };
        }
        const activities = laborActivities[node.id].activities || [];

        if (isLeaf) {
          const laborCell = document.createElement("div");
          laborCell.style.gridColumn = `span ${laborColCount || 1}`;
          laborCell.style.display = "flex";
          laborCell.style.justifyContent = "flex-end";
          laborCell.style.alignItems = "center";

          const addActivityBtn = document.createElement("button");
          addActivityBtn.textContent = "+ Activity";
          addActivityBtn.style.fontSize = "11px";
          addActivityBtn.style.padding = "3px 8px";
          addActivityBtn.style.background = "var(--bg)";
          addActivityBtn.style.border = "1px solid var(--border)";
          addActivityBtn.style.color = "var(--text)";
          addActivityBtn.style.cursor = "pointer";
          addActivityBtn.style.borderRadius = "3px";
          addActivityBtn.addEventListener("click", () => {
            const name = prompt("Activity name:");
            if (name) {
              laborActivities[node.id].activities.push({
                id: crypto.randomUUID(),
                name
              });
              renderWBS();
            }
          });

          laborCell.appendChild(addActivityBtn);
          row.appendChild(laborCell);
        } else {
          const spacer = document.createElement("div");
          spacer.style.gridColumn = `span ${laborColCount || 1}`;
          row.appendChild(spacer);
        }

        const estType = document.createElement("div");
        row.appendChild(estType);

        const tagsCell = document.createElement("div");
        if (isLeaf) {
          const tagZone = createPillZone(node.id, "tag", "Tags");
          tagsCell.appendChild(tagZone);
        }
        row.appendChild(tagsCell);

        const dl = document.createElement("div");
        dl.className = "wbs-fin-cell";
        dl.textContent = fmtMoney(node.directLabour);
        row.appendChild(dl);

        const exp = document.createElement("div");
        exp.className = "wbs-fin-cell";
        exp.textContent = fmtMoney(node.expenses);
        row.appendChild(exp);

        const bur = document.createElement("div");
        bur.className = "wbs-fin-cell";
        bur.textContent = fmtMoney(node.burdened);
        row.appendChild(bur);

        const net = document.createElement("div");
        net.className = "wbs-fin-cell";
        net.textContent = fmtMoney(node.netRevenue);
        row.appendChild(net);

        const gross = document.createElement("div");
        gross.className = "wbs-fin-cell";
        gross.textContent = fmtMoney(node.grossRevenue);
        row.appendChild(gross);

        const nm = document.createElement("div");
        nm.className = "wbs-fin-cell";
        nm.textContent = fmtPercent(node.nm);
        row.appendChild(nm);

        const gm = document.createElement("div");
        gm.className = "wbs-fin-cell";
        gm.textContent = fmtPercent(node.gm);
        row.appendChild(gm);

        const dlm = document.createElement("div");
        dlm.className = "wbs-fin-cell";
        dlm.textContent = fmtMoney(node.dlm);
        row.appendChild(dlm);

        gridContainer.appendChild(row);

        if (isLeaf) {
          if (activities.length === 0) {
            const emptyRow = document.createElement("div");
            emptyRow.className = "wbs-row";
            emptyRow.innerHTML = `
              <div></div>
              <div style="color: var(--text-muted); font-size: 11px; padding-left: 16px;">(no activities)</div>
            `;
            const emptySpan = document.createElement("div");
            emptySpan.style.gridColumn = `span ${laborColCount || 1}`;
            emptyRow.appendChild(emptySpan);
            for (let i = 0; i < 10; i++) emptyRow.appendChild(document.createElement("div"));
            gridContainer.appendChild(emptyRow);
          } else {
            activities.forEach(activity => {
              const actRow = document.createElement("div");
              actRow.className = "wbs-row";

              actRow.appendChild(document.createElement("div"));
              const actName = document.createElement("div");
              actName.textContent = activity.name;
              actName.style.paddingLeft = "16px";
              actRow.appendChild(actName);

              if (laborResources.length === 0) {
                actRow.appendChild(document.createElement("div"));
              } else {
                laborResources.forEach(resource => {
                  const actKey = `${activity.id}-${resource.id}`;
                  if (!laborActivities[node.id][actKey]) {
                    laborActivities[node.id][actKey] = { reg: 0, ot: 0 };
                  }

                  const regCell = document.createElement("div");
                  regCell.appendChild(
                    createInput(laborActivities[node.id][actKey].reg, (val) => {
                      laborActivities[node.id][actKey].reg = val;
                    })
                  );
                  actRow.appendChild(regCell);

                  const otCell = document.createElement("div");
                  otCell.appendChild(
                    createInput(laborActivities[node.id][actKey].ot, (val) => {
                      laborActivities[node.id][actKey].ot = val;
                    })
                  );
                  actRow.appendChild(otCell);
                });
              }

              for (let i = 0; i < 10; i++) actRow.appendChild(document.createElement("div"));

              gridContainer.appendChild(actRow);
            });
          }
        }

        if (hasChildren && !node.collapsed) {
          node.children.forEach(child => renderLaborNode(child));
        }
      }

      WBS_DATA.forEach(node => renderLaborNode(node));
    }

  return { render };
})();
