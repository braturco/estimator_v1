// wbs.js — Phases, Tasks, Work Items with rollups, totals, and top-level buttons

// Ensure expandedLaborNodes is available (should be from datastore.js)
if (typeof window.expandedLaborNodes === 'undefined') {
  window.expandedLaborNodes = new Set();
}

let selectedNodeId = null;
let selectedActivityNodeId = null; // Track which node owns the selected activity
let selectedActivityId = null; // Track specific activity ID
let financialColumns = [];

function getExpenseItems(nodeId, type, activityId) {
  // If activity ID is provided, get from activity; otherwise sum from all activities
  const entry = laborActivities[nodeId];
  if (!entry || !Array.isArray(entry.activities)) {
    return [];
  }
  
  if (activityId) {
    const activity = entry.activities.find(a => a.id === activityId);
    if (!activity || !activity.expenses) {
      return [];
    }
    return activity.expenses[type] || [];
  } else {
    // Sum all activities
    let allItems = [];
    entry.activities.forEach(activity => {
      if (activity.expenses && activity.expenses[type]) {
        allItems = allItems.concat(activity.expenses[type]);
      }
    });
    return allItems;
  }
}

function updateExpenseTotals(nodeId) {
  const node = findNodeById(WBS_DATA, nodeId);
  if (!node) return;
  
  // Sum expenses from all activities
  let subsTotal = 0;
  let odcTotal = 0;
  let subsSellTotal = 0;
  let odcSellTotal = 0;
  
  const entry = laborActivities[nodeId];
  if (entry && Array.isArray(entry.activities)) {
    entry.activities.forEach(activity => {
      if (activity.expenses) {
        subsTotal += activity.expenses.subs.reduce((sum, item) => sum + Number(item.cost || 0), 0);
        odcTotal += activity.expenses.odc.reduce((sum, item) => sum + Number(item.cost || 0), 0);
        subsSellTotal += activity.expenses.subs.reduce((sum, item) => sum + Number(item.sell || 0), 0);
        odcSellTotal += activity.expenses.odc.reduce((sum, item) => sum + Number(item.sell || 0), 0);
      }
    });
  }
  
  node.subcontractors = subsTotal;
  node.odc = odcTotal;
  node.subcontractorsSell = subsSellTotal;
  node.odcSell = odcSellTotal;
  
  // Trigger recalculation
  if (window.Calculations && window.Calculations.recalculate) {
    window.Calculations.recalculate();
  }
}

function openExpenseDetails(nodeId, type, activityId) {
  const node = findNodeById(WBS_DATA, nodeId);
  if (!node) return;

  if (!window.Modal || typeof Modal.open !== "function") {
    alert("Modal system is not available.");
    return;
  }

  // Get the activity
  const entry = laborActivities[nodeId];
  if (!entry || !Array.isArray(entry.activities)) {
    alert("No activities found for this task");
    return;
  }

  const activity = entry.activities.find(a => a.id === activityId);
  if (!activity) {
    alert("Activity not found");
    return;
  }

  // Ensure expense details exist on the activity
  if (!activity.expenses) {
    activity.expenses = { subs: [], odc: [] };
  }

  const items = activity.expenses[type];
  const title = type === "subs" ? "Subconsultants" : "ODC";

  Modal.open({
    title: `${title} Details — ${activity.name}`,
    content: (container) => {
      container.innerHTML = "";
      container.style.padding = "10px";

      const header = document.createElement("div");
      header.style.display = "grid";
      header.style.gridTemplateColumns = "1fr 100px 80px 100px 32px";
      header.style.gap = "6px";
      header.style.fontSize = "11px";
      header.style.fontWeight = "600";
      header.style.color = "var(--text-muted)";
      header.style.marginBottom = "6px";
      header.innerHTML = `
        <div>Description</div>
        <div style="text-align:right;">Cost</div>
        <div style="text-align:right;">Markup %</div>
        <div style="text-align:right;">Sell</div>
        <div></div>
      `;
      container.appendChild(header);

      const list = document.createElement("div");
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "6px";
      container.appendChild(list);

      const renderRows = () => {
        list.innerHTML = "";
        items.forEach((item, idx) => {
          const row = document.createElement("div");
          row.style.display = "grid";
          row.style.gridTemplateColumns = "1fr 100px 80px 100px 32px";
          row.style.gap = "6px";
          row.style.alignItems = "center";

          const desc = document.createElement("input");
          desc.type = "text";
          desc.placeholder = "Description";
          desc.value = item.description || "";
          desc.addEventListener("input", () => {
            item.description = desc.value;
          });

          const cost = document.createElement("input");
          cost.type = "number";
          cost.min = "0";
          cost.step = "0.01";
          cost.value = item.cost ?? 0;
          cost.style.textAlign = "right";
          cost.addEventListener("input", () => {
            item.cost = parseFloat(cost.value) || 0;
            // Auto-calculate sell based on markup
            const markup = parseFloat(markupInput.value) || 0;
            item.sell = item.cost * (1 + markup / 100);
            sell.value = item.sell.toFixed(2);
          });

          const markupInput = document.createElement("input");
          markupInput.type = "number";
          markupInput.min = "0";
          markupInput.step = "0.1";
          markupInput.value = item.markup ?? 10;
          markupInput.style.textAlign = "right";
          markupInput.addEventListener("input", () => {
            item.markup = parseFloat(markupInput.value) || 0;
            // Auto-calculate sell based on markup
            item.sell = item.cost * (1 + item.markup / 100);
            sell.value = item.sell.toFixed(2);
          });

          const sell = document.createElement("input");
          sell.type = "number";
          sell.min = "0";
          sell.step = "0.01";
          sell.value = item.sell ?? 0;
          sell.style.textAlign = "right";
          sell.addEventListener("input", () => {
            item.sell = parseFloat(sell.value) || 0;
          });

          const remove = document.createElement("button");
          remove.className = "btn btn-secondary";
          remove.textContent = "×";
          remove.style.width = "28px";
          remove.addEventListener("click", () => {
            items.splice(idx, 1);
            renderRows();
          });

          row.appendChild(desc);
          row.appendChild(cost);
          row.appendChild(markupInput);
          row.appendChild(sell);
          row.appendChild(remove);
          list.appendChild(row);
        });
      };

      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-secondary";
      addBtn.textContent = "+ Add Item";
      addBtn.style.marginTop = "8px";
      addBtn.addEventListener("click", () => {
        items.push({ id: crypto.randomUUID(), description: "", cost: 0, markup: 10, sell: 0 });
        renderRows();
      });

      container.appendChild(addBtn);
      renderRows();
    },
    onSave: () => {
      updateExpenseTotals(nodeId);
      // Always do a full render to ensure icon appears
      renderWBS();
      Modal.close();
    }
  });
}

window.openExpenseDetails = openExpenseDetails;

window.openExpenseDetails = openExpenseDetails;

// ---------------------- selection ----------------------
function selectRow(id) {
  selectedNodeId = id;
  selectedActivityNodeId = null; // Clear activity selection
  selectedActivityId = null; // Clear activity ID
  document.querySelectorAll(".wbs-row").forEach(row => {
    row.classList.toggle("wbs-row-selected", row.dataset.id === id);
  });
  // Clear activity row highlights
  document.querySelectorAll(".wbs-row-active").forEach(el => {
    el.classList.remove("wbs-row-active");
  });
}

// ---------------------- helpers ------------------------
function findNodeById(list, id) {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children && node.children.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findNodeDepth(list, id, depth = 1) {
  for (const node of list) {
    if (node.id === id) return depth;
    if (node.children && node.children.length) {
      const found = findNodeDepth(node.children, id, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function generateWBSCodes(nodes, prefix = "") {
  nodes.forEach((node, index) => {
    node.code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    if (node.children && node.children.length > 0) {
      generateWBSCodes(node.children, node.code);
    }
  });
}

function addChildById(id) {
  const parent = findNodeById(WBS_DATA, id);
  if (!parent) return;

  const parentDepth = findNodeDepth(WBS_DATA, id);
  if (!parentDepth) return;
  
  const newLevel = parentDepth + 1;
  const name = newLevel === 2 ? "New Task" : "New Subtask";

  parent.children = parent.children || [];
  parent.children.push({
    id: crypto.randomUUID(),
    name,
    code: "",
    grossRevenue: 0,
    subcontractors: 0,
    odc: 0,
    directLabor: 0,
    netRevenue: 0,
    dlm: 0,
    fringeBurden: 0,
    pcm: 0,
    pcmPct: 0,
    ohBurden: 0,
    burdenedLabor: 0,
    totalCost: 0,
    netMargin: 0,
    nmPct: 0,
    gmPct: 0,
    children: []
  });

  generateWBSCodes(WBS_DATA);
  renderWBS();
}

function deleteNode(id) {
  const node = findNodeById(WBS_DATA, id);
  if (!node) return;

  // Prevent deletion of permanent mandatory tasks
  if (node.isPermanent) {
    alert("Cannot delete permanent mandatory task.");
    return;
  }

  // Check if node has non-zero values
  function hasNonZeroValues(n) {
    if (
      n.grossRevenue || n.subcontractors || n.odc || n.directLabor || n.netRevenue ||
      n.fringeBurden || n.pcm || n.ohBurden || n.burdenedLabor || n.totalCost || n.netMargin
    ) {
      return true;
    }
    if (n.children && n.children.length > 0) {
      return n.children.some(hasNonZeroValues);
    }
    return false;
  }

  if (hasNonZeroValues(node)) {
    const childrenCount = node.children ? node.children.length : 0;
    const childrenText = childrenCount > 0 ? ` and ${childrenCount} child${childrenCount > 1 ? 'ren' : ''}` : '';
    if (!confirm(`Delete "${node.name}"${childrenText}? This node has non-zero values.`)) {
      return;
    }
  }

  function remove(list) {
    const index = list.findIndex(n => n.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      return true;
    }
    for (const node of list) {
      if (node.children && remove(node.children)) return true;
    }
    return false;
  }

  remove(WBS_DATA);
  selectedNodeId = null;
  generateWBSCodes(WBS_DATA);
  renderWBS();
}

// ---------------------- inline rename ------------------
function startInlineRename(labelEl) {
  const container = labelEl.closest(".wbs-name");
  if (!container) return;

  const id = container.dataset.id;
  const node = findNodeById(WBS_DATA, id);
  if (!node) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = node.name;
  input.className = "wbs-inline-edit";

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  function finish(commit) {
    if (commit) {
      const value = input.value.trim();
      node.name = value || "Untitled";
    }
    renderWBS();
  }

  input.onblur = () => finish(true);
  input.onkeydown = e => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  };
}

// ---------------------- formatting ---------------------
function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString();
}

function formatPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "";
  return (n * 100).toFixed(1) + "%";
}

// ---------------------- labor rollup -------------------
function calculateLaborRollup(node, resourceId, type) {
  let total = 0;
  
  function sumChildren(n) {
    if (!n.children || n.children.length === 0) {
      // Leaf node - sum activity hours
      const entry = laborActivities[n.id];
      if (entry && Array.isArray(entry.activities)) {
        entry.activities.forEach(activity => {
          if (activity.hours && activity.hours[resourceId]) {
            total += Number(activity.hours[resourceId][type] || 0);
          }
        });
      }
    } else {
      // Rollup node - recurse
      n.children.forEach(sumChildren);
    }
  }
  
  sumChildren(node);
  return total;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Calculate earliest start date from activities
function calculateEarliestStart(node) {
  let earliest = null;
  
  function findEarliest(n) {
    if (!n.children || n.children.length === 0) {
      // Leaf node - check activity dates
      const entry = laborActivities[n.id];
      if (entry && Array.isArray(entry.activities)) {
        entry.activities.forEach(activity => {
          if (activity.start) {
            const date = new Date(activity.start);
            if (!earliest || date < earliest) {
              earliest = date;
            }
          }
        });
      }
    } else {
      // Rollup node - recurse
      n.children.forEach(findEarliest);
    }
  }
  
  findEarliest(node);
  return earliest ? earliest.toISOString().split('T')[0] : "";
}

// Calculate latest finish date from activities
function calculateLatestFinish(node) {
  let latest = null;
  
  function findLatest(n) {
    if (!n.children || n.children.length === 0) {
      // Leaf node - check activity dates
      const entry = laborActivities[n.id];
      if (entry && Array.isArray(entry.activities)) {
        entry.activities.forEach(activity => {
          if (activity.finish) {
            const date = new Date(activity.finish);
            if (!latest || date > latest) {
              latest = date;
            }
          }
        });
      }
    } else {
      // Rollup node - recurse
      n.children.forEach(findLatest);
    }
  }
  
  findLatest(node);
  return latest ? latest.toISOString().split('T')[0] : "";
}

// ---------------------- totals -------------------------
function calculateTotals() {
  const totals = {
    grossRevenue: 0,
    subcontractors: 0,
    odc: 0,
    directLabor: 0,
    netRevenue: 0,
    dlm: 0,
    fringeBurden: 0,
    pcm: 0,
    pcmPct: 0,
    ohBurden: 0,
    burdenedLabor: 0,
    totalCost: 0,
    netMargin: 0,
    nmPct: 0,
    gmPct: 0
  };

  function walk(node) {
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) {
      totals.grossRevenue += Number(node.grossRevenue || 0);
      totals.subcontractors += Number(node.subcontractors || 0);
      totals.odc += Number(node.odc || 0);
      totals.directLabor += Number(node.directLabor || 0);
      totals.netRevenue += Number(node.netRevenue || 0);
      totals.fringeBurden += Number(node.fringeBurden || 0);
      totals.pcm += Number(node.pcm || 0);
      totals.ohBurden += Number(node.ohBurden || 0);
      totals.burdenedLabor += Number(node.burdenedLabor || 0);
      totals.totalCost += Number(node.totalCost || 0);
      totals.netMargin += Number(node.netMargin || 0);
    } else {
      node.children.forEach(walk);
    }
  }

  WBS_DATA.forEach(walk);

  totals.dlm = totals.directLabor > 0 ? (totals.netRevenue / totals.directLabor) : 0;
  totals.pcmPct = totals.grossRevenue > 0 ? (totals.pcm / totals.grossRevenue) : 0;
  totals.nmPct = totals.netRevenue > 0 ? (totals.netMargin / totals.netRevenue) : 0;
  totals.gmPct = totals.grossRevenue > 0 ? ((totals.grossRevenue - totals.totalCost) / totals.grossRevenue) : 0;

  return totals;
}

function renderTotalsRow() {
  const totalsEl = document.getElementById("wbsTotals");
  if (!totalsEl) return;

  const t = calculateTotals();

  totalsEl.className = "wbs-row wbs-totals-row";
  totalsEl.innerHTML = "";
  
  // Code column
  const codeCell = document.createElement("div");
  totalsEl.appendChild(codeCell);
  
  // Total label
  const labelCell = document.createElement("div");
  labelCell.textContent = "Total";
  totalsEl.appendChild(labelCell);
  
  // Labor columns
  if (window.expandedPricingMethods.labor) {
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? ' odd-resource' : '';
      const regTotal = WBS_DATA.reduce((sum, node) => sum + calculateLaborRollup(node, res.id, "reg"), 0);
      const otTotal = WBS_DATA.reduce((sum, node) => sum + calculateLaborRollup(node, res.id, "ot"), 0);
      
      // Reg cell
      const regCell = document.createElement("div");
      regCell.className = `labor-col-cell${oddClass}`;
      const regWrap = document.createElement("div");
      regWrap.className = "labor-input-wrap";
      const regValue = document.createElement("div");
      regValue.className = "wbs-labor-rollup";
      regValue.textContent = regTotal > 0 ? formatNumber(regTotal) : "";
      const regLabel = document.createElement("span");
      regLabel.className = "labor-input-label";
      regLabel.textContent = "Reg";
      regWrap.appendChild(regValue);
      regWrap.appendChild(regLabel);
      regCell.appendChild(regWrap);
      totalsEl.appendChild(regCell);
      
      // OT cell
      const otCell = document.createElement("div");
      otCell.className = `labor-col-cell${oddClass}`;
      const otWrap = document.createElement("div");
      otWrap.className = "labor-input-wrap";
      const otValue = document.createElement("div");
      otValue.className = "wbs-labor-rollup";
      otValue.textContent = otTotal > 0 ? formatNumber(otTotal) : "";
      const otLabel = document.createElement("span");
      otLabel.className = "labor-input-label";
      otLabel.textContent = "OT";
      otWrap.appendChild(otValue);
      otWrap.appendChild(otLabel);
      otCell.appendChild(otWrap);
      totalsEl.appendChild(otCell);
    });
  }
  
  // Tags column
  const tagsCell = document.createElement("div");
  totalsEl.appendChild(tagsCell);

  const formatByType = (value, type) => {
    if (type === "percent") return formatPercent(value);
    return formatMoney(value);
  };

  financialColumns.forEach((col) => {
    const cell = document.createElement("div");
    cell.className = "wbs-fin-cell";
    cell.textContent = formatByType(t[col.key], col.format);
    totalsEl.appendChild(cell);
  });
}

// ---------------------- rendering ----------------------
function renderWBSNode(container, node, level = 1) {
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const collapsed = !!node.collapsed;

	const row = document.createElement("div");
	row.className = "wbs-row";
	row.dataset.id = node.id;
	row.classList.add(`wbs-level-${level}`);
	row.classList.add(`level-${level}`);  // make CSS happy
	row.onclick = () => selectRow(node.id);

  // Accept activity drops for reordering/moving
  if (isLeaf && window.expandedPricingMethods.labor) {
    row.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.style.background = "rgba(96, 165, 250, 0.15)";
      }
    });

    row.addEventListener("dragenter", (e) => {
      if (e.dataTransfer.types.includes("text/plain")) {
        e.preventDefault();
        
        // Check if dragging activity from same task - if so, don't show top border (it's confusing)
        try {
          const data = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (data.sourceNodeId === node.id) {
            // Same task - only show background, no top border
            row.style.background = "rgba(96, 165, 250, 0.15)";
            return;
          }
        } catch (err) {
          // Can't parse, show both indicators
        }
        
        row.style.borderTop = "2px solid var(--accent)";
      }
    });

    row.addEventListener("dragleave", (e) => {
      const related = e.relatedTarget;
      // Only clear if leaving to outside the row
      if (!related || !row.contains(related)) {
        row.style.background = "";
        row.style.borderTop = "";
      }
    });

    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.style.background = "";
      row.style.borderTop = "";
      
      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (!data.activityId || !data.sourceNodeId) return;

        const targetNodeId = node.id;
        const sourceNodeId = data.sourceNodeId;
        const activityId = data.activityId;

        if (sourceNodeId === targetNodeId) {
          // Same task - reorder (move to end)
          const activities = laborActivities[sourceNodeId].activities;
          const actIndex = activities.findIndex(a => a.id === activityId);
          if (actIndex !== -1) {
            const [movedActivity] = activities.splice(actIndex, 1);
            activities.push(movedActivity);
            renderWBS();
          }
        } else {
          // Different task - prompt for copy or move
          Modal.choice({
            title: "Move or Copy Activity?",
            message: "Choose an action for this activity:",
            choices: [
              { label: "Move", value: "move", primary: true },
              { label: "Copy", value: "copy" },
              { label: "Cancel", value: "cancel" }
            ],
            onChoice: (choice) => {
              if (choice === "cancel") return;
              
              const sourceActivities = laborActivities[sourceNodeId].activities;
              const actIndex = sourceActivities.findIndex(a => a.id === activityId);
              if (actIndex === -1) return;

              const sourceActivity = sourceActivities[actIndex];

              if (!laborActivities[targetNodeId]) {
                laborActivities[targetNodeId] = { activities: [] };
              }

              if (choice === "move") {
                const [movedActivity] = sourceActivities.splice(actIndex, 1);
                laborActivities[targetNodeId].activities.push(movedActivity);
              } else if (choice === "copy") {
                const copiedActivity = JSON.parse(JSON.stringify(sourceActivity));
                copiedActivity.id = crypto.randomUUID();
                copiedActivity.name = sourceActivity.name + " (copy)";
                laborActivities[targetNodeId].activities.push(copiedActivity);
              }

              renderWBS();
            }
          });
        }
      } catch (err) {
        console.error("Drop failed:", err);
      }
    });
  }
  let laborCellsHtml = "";
  if (window.expandedPricingMethods.labor) {
    // Render rollup cells for each resource (hours are entered on activity rows)
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? ' odd-resource' : '';
      const regTotal = calculateLaborRollup(node, res.id, 'reg');
      const otTotal = calculateLaborRollup(node, res.id, 'ot');
      laborCellsHtml += `
        <div class="labor-col-cell${oddClass}">
          <div class="labor-input-wrap">
            <div class="wbs-labor-rollup">${regTotal > 0 ? formatNumber(regTotal) : ''}</div>
            <span class="labor-input-label">Reg</span>
          </div>
        </div>
      `;
      laborCellsHtml += `
        <div class="labor-col-cell${oddClass}">
          <div class="labor-input-wrap">
            <div class="wbs-labor-rollup">${otTotal > 0 ? formatNumber(otTotal) : ''}</div>
            <span class="labor-input-label">OT</span>
          </div>
        </div>
      `;
    });
  }

  // Schedule date cells (rollup earliest start and latest finish)
  let scheduleCellsHtml = "";
  if (window.expandedPricingMethods.schedule) {
    const startDate = calculateEarliestStart(node);
    const finishDate = calculateLatestFinish(node);
    scheduleCellsHtml += `
      <div class="schedule-col-cell">
        <div class="wbs-date-rollup">${formatDate(startDate)}</div>
      </div>
      <div class="schedule-col-cell">
        <div class="wbs-date-rollup">${formatDate(finishDate)}</div>
      </div>
    `;
  }

  // Task properties cells (checkboxes for leaf nodes only)
  let taskPropsCellsHtml = "";
  if (window.expandedPricingMethods.taskProps && isLeaf) {
    // Initialize properties if not set
    if (node.billable === undefined) node.billable = true;
    if (node.chargeable === undefined) node.chargeable = true;
    if (node.gcc === undefined) node.gcc = false;
    
    taskPropsCellsHtml += `
      <div class="task-prop-cell" data-prop="billable">
        <input type="checkbox" class="task-prop-checkbox" ${node.billable ? 'checked' : ''} />
      </div>
      <div class="task-prop-cell" data-prop="chargeable">
        <input type="checkbox" class="task-prop-checkbox" ${node.chargeable ? 'checked' : ''} />
      </div>
      <div class="task-prop-cell" data-prop="gcc">
        <input type="checkbox" class="task-prop-checkbox" ${node.gcc ? 'checked' : ''} />
      </div>
    `;
  } else if (window.expandedPricingMethods.taskProps && !isLeaf) {
    // Empty cells for parent nodes
    taskPropsCellsHtml += `
      <div class="task-prop-cell"></div>
      <div class="task-prop-cell"></div>
      <div class="task-prop-cell"></div>
    `;
  }

  const nameClass = hasChildren ? (collapsed ? "wbs-name rollup collapsed" : "wbs-name rollup") : "wbs-name";
  const expandIconHtml = hasChildren ? `<span class="wbs-expand-icon">${collapsed ? '[+]' : '[–]'}</span>` : '<span class="wbs-expand-spacer"></span>';

  const formatByType = (value, type) => {
    if (type === "percent") return formatPercent(value);
    return formatMoney(value);
  };

  const financialHtml = financialColumns.map(col => {
    const value = node[col.key];
    if (col.key === "subcontractors" || col.key === "odc") {
      const type = col.key === "subcontractors" ? "subs" : "odc";
      const items = getExpenseItems(node.id, type);
      const hasEntries = items.length > 0;
      const iconHtml = hasEntries ? `<button class="expense-detail-btn" data-expense-type="${type}" title="View details">🗒️</button>` : '';
      return `
        <div class="wbs-fin-cell expense-cell" data-expense-type="${type}">
          ${iconHtml}
          <span class="expense-value">${formatByType(value, col.format)}</span>
        </div>
      `;
    }
    return `<div class="wbs-fin-cell">${formatByType(value, col.format)}</div>`;
  }).join("");

  row.innerHTML = `
    <div class="wbs-code">${node.code || ""}</div>
	<div class="${nameClass} wbs-indent-${level}" data-id="${node.id}">
	  ${expandIconHtml}
	  <span class="wbs-activity-label">${node.name}</span>
	</div>
    ${laborCellsHtml}
    ${scheduleCellsHtml}
    ${taskPropsCellsHtml}
    <div></div>
    ${financialHtml}
  `;
  
  if (node.directLabor > 0 || node.netRevenue > 0) {
    console.log(`📋 Rendered ${node.name}: DL=${node.directLabor}, Rev=${node.netRevenue}`);
  }

  container.appendChild(row);

  row.querySelectorAll(".expense-detail-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openExpenseDetails(node.id, btn.dataset.expenseType);
    });
  });

  row.querySelectorAll(".expense-cell").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      e.stopPropagation();
      openExpenseDetails(node.id, cell.dataset.expenseType);
    });
  });

  // Add checkbox change listeners for task properties
  row.querySelectorAll(".task-prop-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      const cell = checkbox.closest(".task-prop-cell");
      const prop = cell.dataset.prop;
      node[prop] = checkbox.checked;
      if (typeof scheduleAutosave === "function") {
        scheduleAutosave();
      }
    });
  });

  // Add pill zones for leaf nodes AFTER row is added to DOM
  if (isLeaf) {
    // Find the tags container - it's the empty div after activity name, labor cells, schedule cells, and task props
    const allChildren = row.children;
    const laborCellCount = window.expandedPricingMethods.labor ? laborResources.length * 2 : 0;
    const scheduleCellCount = window.expandedPricingMethods.schedule ? 2 : 0;
    const taskPropsCount = window.expandedPricingMethods.taskProps ? 3 : 0;
    const tagZoneContainerIndex = 2 + laborCellCount + scheduleCellCount + taskPropsCount; // After code, activity, labor, schedule, and task props cells
    const tagZoneContainer = allChildren[tagZoneContainerIndex];

    if (tagZoneContainer) {
      const tagZone = createPillZone(node.id, "tag", "Tags");
      tagZoneContainer.appendChild(tagZone);
    }

    // Render activity rows when any pricing method is expanded
    const anyPricingExpanded = window.expandedPricingMethods.labor || window.expandedPricingMethods.expense || window.expandedPricingMethods.usages || window.expandedPricingMethods.schedule;
    if (anyPricingExpanded && laborActivities[node.id] && Array.isArray(laborActivities[node.id].activities) && laborActivities[node.id].activities.length > 0) {
      const setActiveActivityRow = (rowEl) => {
        document.querySelectorAll(".wbs-row-active").forEach(el => {
          el.classList.remove("wbs-row-active");
        });
        rowEl.classList.add("wbs-row-active");
        // Track the node that owns this activity and the activity ID
        selectedActivityNodeId = rowEl.dataset.nodeId;
        selectedActivityId = rowEl.dataset.activityId;
      };

      const createLaborInput = (rowEl, value, onChange, label, isOddResource, activityId, resourceId, type) => {
        const wrap = document.createElement("div");
        wrap.className = "labor-col-cell" + (isOddResource ? " odd-resource" : "");

        const inner = document.createElement("div");
        inner.className = "labor-input-wrap";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "wbs-labor-input";
        input.value = value || 0;
        input.dataset.nodeId = node.id;
        input.dataset.activityId = activityId;
        input.dataset.resourceId = resourceId;
        input.dataset.type = type;
        input.addEventListener("input", () => {
          onChange(parseFloat(input.value) || 0);
          // Trigger recalculation after a short delay
          if (window.Calculations && window.Calculations.recalculate) {
            clearTimeout(window._calcTimeout);
            window._calcTimeout = setTimeout(() => {
              window.Calculations.recalculate();
            }, 500);
          }
        });
        input.addEventListener("focus", () => {
          setActiveActivityRow(rowEl);
        });

        const labelEl = document.createElement("span");
        labelEl.className = "labor-input-label";
        labelEl.textContent = label;

        inner.appendChild(input);
        inner.appendChild(labelEl);
        wrap.appendChild(inner);
        return wrap;
      };

      laborActivities[node.id].activities.forEach((activity, activityIndex) => {
        const activityRow = document.createElement("div");
        activityRow.className = "wbs-row labor-activity-row";
        activityRow.dataset.id = `${node.id}-${activity.id}`;
        activityRow.dataset.activityId = activity.id;
        activityRow.dataset.nodeId = node.id;
        activityRow.dataset.activityIndex = activityIndex;
        activityRow.draggable = true;

        activityRow.addEventListener("click", (e) => {
          // Let expense button clicks bubble to container handler
          if (e.target.closest(".expense-detail-btn") || e.target.closest(".expense-cell")) {
            return;
          }
          e.stopPropagation();
          setActiveActivityRow(activityRow);
        });

        // Drag to reorder/move activities
        activityRow.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({
            activityId: activity.id,
            sourceNodeId: node.id
          }));
          e.dataTransfer.effectAllowed = "copyMove";
          activityRow.style.opacity = "0.5";
        });

        activityRow.addEventListener("dragend", (e) => {
          activityRow.style.opacity = "1";
        });

        // Accept drops on activity rows for reordering
        activityRow.addEventListener("dragover", (e) => {
          if (e.dataTransfer.types.includes("text/plain")) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }
        });

        activityRow.addEventListener("dragenter", (e) => {
          if (e.dataTransfer.types.includes("text/plain")) {
            e.preventDefault();
            e.stopPropagation();
            
            // Don't show indicator if dragging over self
            try {
              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
              if (data.activityId === activity.id && data.sourceNodeId === node.id) {
                return; // Same activity, no indicator
              }
            } catch (err) {
              // If we can't parse, show indicator anyway
            }
            
            // Determine if dragging from above or below based on Y position
            const rect = activityRow.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
              // Dragging from above - show top border
              activityRow.style.borderTop = "2px solid var(--accent)";
              activityRow.style.borderBottom = "";
            } else {
              // Dragging from below - show bottom border
              activityRow.style.borderBottom = "2px solid var(--accent)";
              activityRow.style.borderTop = "";
            }
          }
        });

        activityRow.addEventListener("dragleave", (e) => {
          const related = e.relatedTarget;
          // Only clear if leaving to outside the row
          if (!related || !activityRow.contains(related)) {
            e.stopPropagation();
            activityRow.style.borderTop = "";
            activityRow.style.borderBottom = "";
          }
        });

        activityRow.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          activityRow.style.borderTop = "";
          activityRow.style.borderBottom = "";
          
          try {
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            if (!data.activityId || !data.sourceNodeId) return;

            const targetNodeId = node.id;
            const sourceNodeId = data.sourceNodeId;
            const draggedActivityId = data.activityId;
            const targetActivityId = activity.id;

            if (sourceNodeId === targetNodeId) {
              // Same task - reorder
              const activities = laborActivities[sourceNodeId].activities;
              const draggedIndex = activities.findIndex(a => a.id === draggedActivityId);
              const targetIndex = activities.findIndex(a => a.id === targetActivityId);
              
              if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                const [movedActivity] = activities.splice(draggedIndex, 1);
                // If dragging down, adjust target index
                const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
                activities.splice(insertIndex, 0, movedActivity);
                renderWBS();
              }
            } else {
              // Different task - prompt for copy or move
              Modal.choice({
                title: "Move or Copy Activity?",
                message: "Choose an action for this activity:",
                choices: [
                  { label: "Move", value: "move", primary: true },
                  { label: "Copy", value: "copy" },
                  { label: "Cancel", value: "cancel" }
                ],
                onChoice: (choice) => {
                  if (choice === "cancel") return;
                  
                  const sourceActivities = laborActivities[sourceNodeId].activities;
                  const draggedIndex = sourceActivities.findIndex(a => a.id === draggedActivityId);
                  if (draggedIndex === -1) return;

                  const sourceActivity = sourceActivities[draggedIndex];

                  if (!laborActivities[targetNodeId]) {
                    laborActivities[targetNodeId] = { activities: [] };
                  }

                  const targetActivities = laborActivities[targetNodeId].activities;
                  const targetIndex = targetActivities.findIndex(a => a.id === targetActivityId);

                  if (choice === "move") {
                    const [movedActivity] = sourceActivities.splice(draggedIndex, 1);
                    targetActivities.splice(targetIndex, 0, movedActivity);
                  } else if (choice === "copy") {
                    const copiedActivity = JSON.parse(JSON.stringify(sourceActivity));
                    copiedActivity.id = crypto.randomUUID();
                    copiedActivity.name = sourceActivity.name + " (copy)";
                    targetActivities.splice(targetIndex, 0, copiedActivity);
                  }

                  renderWBS();
                }
              });
            }
          } catch (err) {
            console.error("Activity drop failed:", err);
          }
        });

        const codeCell = document.createElement("div");
        codeCell.textContent = "";
        activityRow.appendChild(codeCell);

        const nameCell = document.createElement("div");
        nameCell.className = `wbs-name wbs-indent-${level + 1}`;
        nameCell.dataset.activityId = activity.id;
        
        const label = document.createElement("span");
        label.className = "wbs-activity-label";
        label.textContent = activity.name;
        label.ondblclick = (e) => {
          e.stopPropagation();
          const input = document.createElement("input");
          input.type = "text";
          input.value = activity.name;
          input.className = "wbs-inline-edit";
          label.replaceWith(input);
          input.focus();
          input.select();
          const finish = (commit) => {
            if (commit) {
              const value = input.value.trim();
              activity.name = value || "Untitled";
            }
            renderWBS();
          };
          input.onblur = () => finish(true);
          input.onkeydown = e => {
            if (e.key === "Enter") finish(true);
            if (e.key === "Escape") finish(false);
          };
        };
        
        nameCell.appendChild(label);
        activityRow.appendChild(nameCell);

        // Only render labor resource inputs if labor mode is expanded
        if (window.expandedPricingMethods.labor) {
          laborResources.forEach((res, idx) => {
            if (!activity.hours[res.id]) {
              activity.hours[res.id] = { reg: 0, ot: 0 };
            }

            const isOdd = (idx % 2 === 1);
            const regInput = createLaborInput(activityRow, activity.hours[res.id].reg, (val) => {
              activity.hours[res.id].reg = val;
            }, "Reg", isOdd, activity.id, res.id, "reg");
            const otInput = createLaborInput(activityRow, activity.hours[res.id].ot, (val) => {
              activity.hours[res.id].ot = val;
            }, "OT", isOdd, activity.id, res.id, "ot");

            activityRow.appendChild(regInput);
            activityRow.appendChild(otInput);
          });
        }

        // Render schedule date inputs if schedule mode is expanded
        if (window.expandedPricingMethods.schedule) {
          // Initialize dates if not set
          if (!activity.start) activity.start = "";
          if (!activity.finish) activity.finish = "";

          // Helper to format date for display (yyyy/mm/dd)
          const formatForDisplay = (isoDate) => {
            if (!isoDate) return "";
            const [year, month, day] = isoDate.split('-');
            return `${year}/${month}/${day}`;
          };

          // Helper to parse display format to ISO (yyyy-mm-dd)
          const parseToISO = (displayDate) => {
            if (!displayDate) return "";
            const cleaned = displayDate.replace(/\//g, '-');
            return cleaned; // yyyy/mm/dd -> yyyy-mm-dd
          };

          // Start date cell
          const startCell = document.createElement("div");
          startCell.className = "schedule-col-cell";
          const startInput = document.createElement("input");
          startInput.type = "text";
          startInput.className = "wbs-date-input";
          startInput.placeholder = "yyyy/mm/dd";
          startInput.value = formatForDisplay(activity.start);
          startInput.addEventListener("blur", () => {
            activity.start = parseToISO(startInput.value);
            if (window.Calculations && window.Calculations.recalculate) {
              window.Calculations.recalculate();
            }
            renderWBS();
          });
          startInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              activity.start = parseToISO(startInput.value);
              if (window.Calculations && window.Calculations.recalculate) {
                window.Calculations.recalculate();
              }
              renderWBS();
            }
          });
          startCell.appendChild(startInput);
          activityRow.appendChild(startCell);

          // Finish date cell
          const finishCell = document.createElement("div");
          finishCell.className = "schedule-col-cell";
          const finishInput = document.createElement("input");
          finishInput.type = "text";
          finishInput.className = "wbs-date-input";
          finishInput.placeholder = "yyyy/mm/dd";
          finishInput.value = formatForDisplay(activity.finish);
          finishInput.addEventListener("blur", () => {
            activity.finish = parseToISO(finishInput.value);
            if (window.Calculations && window.Calculations.recalculate) {
              window.Calculations.recalculate();
            }
            renderWBS();
          });
          finishInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              activity.finish = parseToISO(finishInput.value);
              if (window.Calculations && window.Calculations.recalculate) {
                window.Calculations.recalculate();
              }
              renderWBS();
            }
          });
          finishCell.appendChild(finishInput);
          activityRow.appendChild(finishCell);
        }

        const tagsCell = document.createElement("div");
        activityRow.appendChild(tagsCell);

        // Calculate financial values for this activity
        async function calculateActivityFinancials() {
          let directLaborReg = 0;
          let directLaborOT = 0;
          let revenue = 0;

          for (const columnId in activity.hours) {
            const hours = activity.hours[columnId];
            const regHours = Number(hours.reg || 0);
            const otHours = Number(hours.ot || 0);

            if (regHours === 0 && otHours === 0) continue;

            const resource = laborResources.find(r => r.id === columnId);
            if (!resource) continue;

            let rates;
            try {
              rates = await Rates.resolveRates(resource);
            } catch (err) {
              rates = null;
            }
            if (!rates) continue;

            directLaborReg += regHours * rates.costRegular;
            directLaborOT += otHours * rates.costOT;
            revenue += regHours * rates.sellRegular + otHours * rates.sellOT;
          }

          const rawLabor = directLaborReg + directLaborOT;

          // Get expense values from this activity
          const subsItems = activity.expenses?.subs || [];
          const odcItems = activity.expenses?.odc || [];
          const subsCost = subsItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
          const odcCost = odcItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
          const subsSell = subsItems.reduce((sum, item) => sum + Number(item.sell || 0), 0);
          const odcSell = odcItems.reduce((sum, item) => sum + Number(item.sell || 0), 0);

          const grossRevenue = revenue + subsSell + odcSell;
          const netRevenue = grossRevenue - subsCost - odcCost;

          const fringeRegRate = window.ohRates?.regular?.laborFringe ?? 0;
          const fringeOtRate = window.ohRates?.overtime?.laborFringe ?? fringeRegRate;
          const ohRegRate = (window.ohRates?.regular?.operatingCosts ?? 0) + (window.ohRates?.regular?.operatingOH ?? 0);
          const ohOtRate = (window.ohRates?.overtime?.operatingCosts ?? 0) + (window.ohRates?.overtime?.operatingOH ?? 0);

          const fringeBurden = (directLaborReg * fringeRegRate) + (directLaborOT * fringeOtRate);
          const ohBurden = (directLaborReg * ohRegRate) + (directLaborOT * ohOtRate);
          const burdenedLabor = rawLabor + fringeBurden + ohBurden;
          const totalCost = burdenedLabor + subsCost + odcCost;

          const dlm = rawLabor > 0 ? (netRevenue / rawLabor) : 0;
          const pcm = netRevenue - rawLabor - fringeBurden;
          const pcmPct = grossRevenue > 0 ? (pcm / grossRevenue) : 0;
          const netMargin = netRevenue - rawLabor - fringeBurden - ohBurden;
          const nmPct = netRevenue > 0 ? (netMargin / netRevenue) : 0;
          const gmPct = grossRevenue > 0 ? ((grossRevenue - totalCost) / grossRevenue) : 0;

          return {
            grossRevenue,
            subcontractors: subsCost,
            odc: odcCost,
            rawLabor,
            netRevenue,
            dlm,
            fringeBurden,
            pcm,
            pcmPct,
            ohBurden,
            burdenedLabor,
            totalCost,
            netMargin,
            nmPct,
            gmPct
          };
        }

        // Add financial cells with calculated values
        const finCells = [];
        calculateActivityFinancials().then(financials => {
          console.log(`💰 Activity ${activity.name} financials:`, financials);
          financialColumns.forEach((col, idx) => {
            const cell = finCells[idx];
            if (!cell) return;
            
            // Special handling for expense columns
            if (col.key === "subcontractors" || col.key === "odc") {
              const type = col.key === "subcontractors" ? "subs" : "odc";
              const items = activity.expenses?.[type] || [];
              const hasEntries = items.length > 0;
              console.log(`📝 Activity ${activity.name} ${type}: ${items.length} items, value=${financials[col.key]}`);
              const iconHtml = hasEntries ? `<button class="expense-detail-btn" data-expense-type="${type}" title="View details">🗒️</button>` : '';
              cell.innerHTML = `
                ${iconHtml}
                <span class="expense-value">${formatMoney(financials[col.key])}</span>
              `;
              cell.className = "wbs-fin-cell expense-cell";
              cell.dataset.expenseType = type;
              cell.style.fontStyle = "normal";
            } else {
              const value = financials[col.key];
              cell.textContent = col.format === "percent"
                ? formatPercent(value)
                : formatMoney(value);
            }
          });
        });

        const finCellCount = financialColumns.length;
        for (let i = 0; i < finCellCount; i++) {
          const finCell = document.createElement("div");
          finCell.className = "wbs-fin-cell";
          finCell.textContent = "";
          finCell.style.fontStyle = "italic";
          finCell.style.color = "var(--text-muted)";
          activityRow.appendChild(finCell);
          finCells.push(finCell);
        }

        container.appendChild(activityRow);
      });
    }
  }

  const expandIcon = row.querySelector(".wbs-expand-icon");
  if (expandIcon && hasChildren) {
    expandIcon.onclick = e => {
      e.stopPropagation();
      node.collapsed = !node.collapsed;
      renderWBS();
    };
  }

  const labelEl = row.querySelector(".wbs-activity-label");
  if (labelEl) {
    labelEl.ondblclick = e => {
      e.stopPropagation();
      startInlineRename(labelEl);
    };
  }

  if (hasChildren && !collapsed) {
    node.children.forEach(child => renderWBSNode(container, child, level + 1));
  }
}

function renderWBS() {
  const container = document.getElementById("wbsContainer");
  if (!container) return;

  if (!container._expenseClickHandlerAttached) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".expense-detail-btn");
      if (btn && btn.dataset.expenseType) {
        e.stopPropagation();
        const row = btn.closest(".wbs-row");
        const nodeId = row?.dataset?.id;
        const activityId = row?.dataset?.activityId;
        
        if (nodeId) {
          if (activityId) {
            // Activity row - extract task ID from compound ID
            const taskId = row?.dataset?.nodeId; // Activity rows have data-node-id for the parent task
            openExpenseDetails(taskId || nodeId.split('-')[0], btn.dataset.expenseType, activityId);
          } else {
            // Task row - no activity ID
            openExpenseDetails(nodeId, btn.dataset.expenseType);
          }
        }
        return;
      }

      const cell = e.target.closest(".expense-cell");
      if (cell && cell.dataset.expenseType) {
        e.stopPropagation();
        // Only allow clicking expense cells on activity rows
        if (!selectedActivityId || !selectedActivityNodeId) {
          alert("Please select an activity row first, then click the expense cell");
          return;
        }
        openExpenseDetails(selectedActivityNodeId, cell.dataset.expenseType, selectedActivityId);
      }
    });
    container._expenseClickHandlerAttached = true;
  }

  // Auto-select labor input text on focus
  if (!container._laborFocusHandlerAttached) {
    container.addEventListener("focusin", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const raw = target.value.replace(/[^0-9.-]/g, "");
        if (raw !== target.value) {
          target.value = raw;
        }
        target.select();
      }
    });
    
    container.addEventListener("keydown", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const key = e.key;
        
        // Excel-like navigation
        if (key === "Tab" || key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowUp" || key === "ArrowDown") {
          e.preventDefault();
          
          const allInputs = Array.from(container.querySelectorAll(".wbs-labor-input"));
          const currentIndex = allInputs.indexOf(target);
          
          let nextIndex = currentIndex;
          const inputsPerRow = laborResources.length * 2; // reg + ot per resource
          
          if (key === "Tab" || key === "ArrowRight") {
            nextIndex = currentIndex + 1;
          } else if (key === "ArrowLeft") {
            nextIndex = currentIndex - 1;
          } else if (key === "ArrowDown") {
            nextIndex = currentIndex + inputsPerRow;
          } else if (key === "ArrowUp") {
            nextIndex = currentIndex - inputsPerRow;
          }
          
          // Bounds check
          if (nextIndex >= 0 && nextIndex < allInputs.length) {
            const nextInput = allInputs[nextIndex];
            container._laborPendingFocus = {
              nodeId: nextInput.dataset.nodeId,
              activityId: nextInput.dataset.activityId || null,
              resourceId: nextInput.dataset.resourceId,
              type: nextInput.dataset.type
            };
            nextInput.focus();
            nextInput.select();
          }
        }
      }
    });
    
    container.addEventListener("focusout", (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains("wbs-labor-input")) {
        const raw = target.value.replace(/[^0-9.-]/g, "");
        const num = raw === "" ? 0 : Number(raw);
        
        // Save to data structure
        const nodeId = target.dataset.nodeId;
        const resourceId = target.dataset.resourceId;
        const type = target.dataset.type;
        
        if (nodeId && resourceId && type) {
          const activityId = target.dataset.activityId;
          if (!laborActivities[nodeId]) {
            laborActivities[nodeId] = { activities: [] };
          }
          if (activityId) {
            const activity = laborActivities[nodeId].activities.find(a => a.id === activityId);
            if (activity) {
              if (!activity.hours[resourceId]) {
                activity.hours[resourceId] = { reg: 0, ot: 0 };
              }
              activity.hours[resourceId][type] = num;
            }
          }
        }
        
        if (Number.isFinite(num)) {
          target.value = new Intl.NumberFormat().format(num);
        }
        // Trigger calculations without re-rendering to preserve focus
        if (window.Calculations && window.Calculations.recalculate) {
          clearTimeout(window._calcTimeout);
          window._calcTimeout = setTimeout(() => {
            window.Calculations.recalculate();
          }, 300);
        }
      }
    });
    container._laborFocusHandlerAttached = true;
  }

  container.innerHTML = "";

  financialColumns = window.financialMode === "simple"
    ? [
        { key: "grossRevenue", label: "Gross Revenue", format: "money", width: "130px" },
        { key: "subcontractors", label: "Subs", format: "money", width: "120px" },
        { key: "odc", label: "ODC", format: "money", width: "120px" },
        { key: "directLabor", label: "Raw Labor", format: "money", width: "120px" },
        { key: "totalCost", label: "Total Cost", format: "money", width: "120px" },
        { key: "netRevenue", label: "Net Revenue", format: "money", width: "130px" },
        { key: "nmPct", label: "NM%", format: "percent", width: "90px" },
        { key: "dlm", label: "DLM", format: "money", width: "90px" }
      ]
    : [
        { key: "grossRevenue", label: "Gross Revenue", format: "money", width: "130px" },
        { key: "subcontractors", label: "Subs", format: "money", width: "120px" },
        { key: "odc", label: "ODC", format: "money", width: "120px" },
        { key: "directLabor", label: "Raw Labor", format: "money", width: "130px" },
        { key: "netRevenue", label: "Net Revenue", format: "money", width: "130px" },
        { key: "dlm", label: "DLM", format: "money", width: "90px" },
        { key: "fringeBurden", label: "Fringe Burden", format: "money", width: "120px" },
        { key: "pcm", label: "PCM", format: "money", width: "120px" },
        { key: "pcmPct", label: "PCM%", format: "percent", width: "90px" },
        { key: "ohBurden", label: "OH Burden", format: "money", width: "120px" },
        { key: "burdenedLabor", label: "Burdened Labor", format: "money", width: "130px" },
        { key: "totalCost", label: "Total Cost", format: "money", width: "120px" },
        { key: "netMargin", label: "Net Margin", format: "money", width: "120px" },
        { key: "nmPct", label: "NM%", format: "percent", width: "90px" },
        { key: "gmPct", label: "GM%", format: "percent", width: "90px" }
      ];

  // Build column layout based on pricing methods
  let columnTemplate = `
    <div class="col-header" data-col="0">WBS<div class="col-resize-handle"></div></div>
    <div class="col-header" data-col="1">Activity<div class="col-resize-handle"></div></div>
  `;

  // Add labor resource columns if expanded
  if (window.expandedPricingMethods.labor) {
    laborResources.forEach((res, idx) => {
      const headerOddClass = (idx % 2 === 1) ? " odd-resource-col" : "";
      const hasOverride = res.overrideCostReg !== undefined || res.overrideCostOT !== undefined || 
                          res.overrideSellReg !== undefined || res.overrideSellOT !== undefined;
      const overrideIndicator = hasOverride ? " <span style='color: var(--accent); font-weight: 700;'>*</span>" : "";
      const titleAttr = hasOverride ? "title='Has rate overrides. Right-click to edit.'" : "title='Double-click to change, right-click for rate overrides'";
      
      // Show expander toggle on each resource
      const expandIcon = showResourceRates ? "▼" : "▶";
      const expanderHtml = `<span class="resourceRateToggle" style="cursor: pointer; margin-right: 6px; font-size: 10px;" title="Toggle rate details">${expandIcon}</span>`;
      
      columnTemplate += `
        <div class="col-header resource-header${headerOddClass}" data-resource-id="${res.id}" draggable="true" style="text-align: center; font-size: 11px; grid-column: span 2; cursor: pointer; user-select: none;" ${titleAttr}>
          ${expanderHtml}${res.name}${overrideIndicator}
        </div>
      `;
    });
    
    if (laborResources.length === 0) {
      columnTemplate += `<div class="col-header" style="text-align: center; font-size: 10px; font-style: italic; color: var(--text-muted);">No resources</div>`;
    }
  }

  // Add schedule columns if expanded
  if (window.expandedPricingMethods.schedule) {
    columnTemplate += `
      <div class="col-header schedule-header" style="text-align: center; font-size: 11px; cursor: pointer; user-select: none;">
        Start (yyyy/mm/dd)
      </div>
      <div class="col-header schedule-header" style="text-align: center; font-size: 11px; cursor: pointer; user-select: none;">
        Finish (yyyy/mm/dd)
      </div>
    `;
  }

  // Add task properties columns if expanded
  if (window.expandedPricingMethods.taskProps) {
    columnTemplate += `
      <div class="col-header" style="text-align: center; font-size: 11px;">Billable</div>
      <div class="col-header" style="text-align: center; font-size: 11px;">Chargeable</div>
      <div class="col-header" style="text-align: center; font-size: 11px;">GCC</div>
    `;
  }

  const tagColIndex = window.expandedPricingMethods.labor ? 2 + laborResources.length * 2 : 2;
  const scheduleColOffset = window.expandedPricingMethods.schedule ? 2 : 0;
  columnTemplate += `
    <div class="col-header tags-header" data-col="${tagColIndex + scheduleColOffset}">Tags<div class="col-resize-handle"></div></div>
  `;

  financialColumns.forEach((col, idx) => {
    columnTemplate += `
      <div class="col-header fin-header" data-col="${tagColIndex + scheduleColOffset + 1 + idx}">${col.label}<div class="col-resize-handle"></div></div>
    `;
  });

  // Build CSS column template
  let columnWidth = "100px 260px"; // WBS, Activity
  if (window.expandedPricingMethods.labor) {
    for (let i = 0; i < laborResources.length; i++) {
      columnWidth += " 75px 75px";
    }
  }
  if (window.expandedPricingMethods.schedule) {
    columnWidth += " 120px 120px"; // Start, Finish
  }
  if (window.expandedPricingMethods.taskProps) {
    columnWidth += " 90px 90px 90px"; // Billable, Chargeable, GCC
  }
  columnWidth += " 130px";
  financialColumns.forEach(col => {
    columnWidth += ` ${col.width}`;
  });
  container.style.setProperty("--wbs-columns", columnWidth);

  const headerRow = document.createElement("div");
  headerRow.className = "wbs-row wbs-header";
  headerRow.innerHTML = columnTemplate;
  container.appendChild(headerRow);

  // Wire up resource rate toggles - all of them
  if (window.expandedPricingMethods.labor) {
    const rateToggles = headerRow.querySelectorAll(".resourceRateToggle");
    rateToggles.forEach(toggle => {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        showResourceRates = !showResourceRates;
        renderWBS();
      });
    });
  }

  // Add rate detail rows if resources are expanded
  if (window.expandedPricingMethods.labor && showResourceRates) {
    const rateDetailRow = document.createElement("div");
    rateDetailRow.className = "wbs-row wbs-rate-detail-row";
    rateDetailRow.style.fontSize = "10px";
    rateDetailRow.style.background = "var(--bg-hover)";
    rateDetailRow.style.borderBottom = "1px solid var(--border)";
    rateDetailRow.style.position = "sticky";
    rateDetailRow.style.top = "28px";
    rateDetailRow.style.zIndex = "9";
    
    let rateDetailHTML = `
      <div></div>
      <div style="padding-left: 8px; font-style: italic; color: var(--text-muted);">Rates:</div>
    `;
    
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? " odd-resource" : "";
      const hasOverride = res.overrideCostReg !== undefined || res.overrideCostOT !== undefined;
      const overrideStyle = hasOverride ? " color: var(--accent); font-weight: 600;" : "";
      const overrideIndicator = hasOverride ? " *" : "";
      
      const costReg = res.overrideCostReg !== undefined ? res.overrideCostReg : (res.costRate || 0);
      const costOT = res.overrideCostOT !== undefined ? res.overrideCostOT : ((res.costRate || 0) * 1.5);
      
      rateDetailHTML += `
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Cost</div>
          <div style="font-weight: 500;${overrideStyle}">$${costReg.toFixed(0)}${overrideIndicator}</div>
        </div>
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Cost OT</div>
          <div style="font-weight: 500;${overrideStyle}">$${costOT.toFixed(0)}${overrideIndicator}</div>
        </div>
      `;
    });
    
    // Empty cells for remaining columns
    rateDetailHTML += `<div></div>`.repeat(1 + financialColumns.length);
    
    rateDetailRow.innerHTML = rateDetailHTML;
    container.appendChild(rateDetailRow);
    
    // Second row for sell rates
    const sellRateRow = document.createElement("div");
    sellRateRow.className = "wbs-row wbs-rate-detail-row";
    sellRateRow.style.fontSize = "10px";
    sellRateRow.style.background = "var(--bg-hover)";
    sellRateRow.style.borderBottom = "2px solid var(--border)";
    sellRateRow.style.position = "sticky";
    sellRateRow.style.top = "56px";
    sellRateRow.style.zIndex = "9";
    
    let sellRateHTML = `
      <div></div>
      <div></div>
    `;
    
    laborResources.forEach((res, idx) => {
      const oddClass = (idx % 2 === 1) ? " odd-resource" : "";
      const hasOverride = res.overrideSellReg !== undefined || res.overrideSellOT !== undefined;
      const overrideStyle = hasOverride ? " font-weight: 700;" : "";
      const overrideIndicator = hasOverride ? " *" : "";
      
      const sellReg = res.overrideSellReg !== undefined ? res.overrideSellReg : (res.chargeoutRate || 0);
      const sellOT = res.overrideSellOT !== undefined ? res.overrideSellOT : ((res.chargeoutRate || 0) * 1.5);
      
      sellRateHTML += `
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Sell</div>
          <div style="font-weight: 500; color: var(--accent);${overrideStyle}">$${sellReg.toFixed(0)}${overrideIndicator}</div>
        </div>
        <div class="labor-col-cell${oddClass}" style="text-align: center; padding: 4px 2px;">
          <div style="font-size: 9px; color: var(--text-muted);">Sell OT</div>
          <div style="font-weight: 500; color: var(--accent);${overrideStyle}">$${sellOT.toFixed(0)}${overrideIndicator}</div>
        </div>
      `;
    });
    
    sellRateHTML += `<div></div>`.repeat(1 + financialColumns.length);
    
    sellRateRow.innerHTML = sellRateHTML;
    container.appendChild(sellRateRow);
  }

  if (window.expandedPricingMethods.labor) {
    const headers = Array.from(container.querySelectorAll(".resource-header[data-resource-id]"));
    headers.forEach((header) => {
      // Right-click for rate override
      header.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const resourceId = header.dataset.resourceId;
        const resource = laborResources.find(r => r.id === resourceId);
        if (!resource) return;
        
        openRateOverrideModal(resource);
      });
      
      // Double-click to change resource
      header.addEventListener("dblclick", async (e) => {
        console.log("🔍 Double-click detected on resource header", e.target, e.currentTarget);
        e.preventDefault();
        e.stopPropagation();
        
        // Don't trigger if clicking on the expander
        if (e.target.classList && e.target.classList.contains("resource-expand-toggle")) {
          console.log("❌ Clicked on expander, ignoring");
          return;
        }
        
        // Use currentTarget to get the header element itself
        const resourceId = e.currentTarget.dataset.resourceId;
        console.log("🎯 Opening resource picker for:", resourceId);
        const resourceIndex = laborResources.findIndex(r => r.id === resourceId);
        if (resourceIndex === -1) {
          console.log("❌ Resource not found");
          return;
        }
        
        console.log("✅ Opening modal...");
        
        // Open resource picker
        const resourcesData = await Rates.listResources();
        const allOptions = [
          ...resourcesData.generic.map(r => ({ ...r, type: "generic" })),
          ...resourcesData.named.map(r => ({ ...r, type: "named" }))
        ];
        
        console.log("🔍 Resource picker data:", allOptions.slice(0, 3)); // Debug: show first 3
        
        Modal.open({
          title: "Change Resource",
          content: (container) => {
            container.innerHTML = "";
            container.style.padding = "12px";
            
            const searchLabel = document.createElement("div");
            searchLabel.textContent = "Search resources:";
            searchLabel.style.marginBottom = "8px";
            searchLabel.style.fontWeight = "600";
            searchLabel.style.fontSize = "12px";
            
            const searchInput = document.createElement("input");
            searchInput.type = "text";
            searchInput.placeholder = "Type to filter...";
            searchInput.style.width = "100%";
            searchInput.style.padding = "8px";
            searchInput.style.marginBottom = "12px";
            searchInput.style.border = "1px solid var(--border)";
            searchInput.style.borderRadius = "4px";
            searchInput.style.background = "var(--bg)";
            searchInput.style.color = "var(--text)";
            searchInput.style.fontSize = "13px";
            
            const listContainer = document.createElement("div");
            listContainer.style.maxHeight = "400px";
            listContainer.style.overflowY = "auto";
            listContainer.style.border = "1px solid var(--border)";
            listContainer.style.borderRadius = "4px";
            
            function renderList(filter = "") {
              listContainer.innerHTML = "";
              const filtered = allOptions.filter(r => 
                (r.label || r.name || '').toLowerCase().includes(filter.toLowerCase())
              );
              
              if (filtered.length === 0) {
                listContainer.innerHTML = "<div style='padding: 20px; text-align: center; color: var(--text-muted);'>No resources found</div>";
                return;
              }
              
              filtered.forEach(resource => {
                const item = document.createElement("div");
                item.style.padding = "10px 12px";
                item.style.borderBottom = "1px solid var(--border-muted)";
                item.style.cursor = "pointer";
                item.style.transition = "background 0.15s";
                
                const name = document.createElement("div");
                // Show job level/code if available (e.g., "E1 - Vice President" or "P5 - John Doe")
                const jobLevelOrCode = resource.jobLevel || resource.jobCode;
                const displayName = jobLevelOrCode
                  ? `${jobLevelOrCode} - ${resource.label || resource.name}`
                  : (resource.label || resource.name);
                name.textContent = displayName;
                name.style.fontWeight = "500";
                name.style.fontSize = "13px";
                
                const details = document.createElement("div");
                details.textContent = `${resource.type === "generic" ? "Generic" : "Named"} • Cost: $${resource.cost || 'N/A'}/hr • Sell: $${resource.sell || 'N/A'}/hr`;
                details.style.fontSize = "11px";
                details.style.color = "var(--text-muted)";
                details.style.marginTop = "2px";
                
                item.appendChild(name);
                item.appendChild(details);
                
                item.addEventListener("mouseenter", () => {
                  item.style.background = "var(--bg-hover)";
                });
                
                item.addEventListener("mouseleave", () => {
                  item.style.background = "";
                });
                
                item.addEventListener("click", () => {
                  // Update the resource
                  laborResources[resourceIndex] = {
                    ...laborResources[resourceIndex],
                    name: resource.label || resource.name,
                    resourceId: resource.id,
                    chargeoutRate: resource.sell || 0,
                    costRate: resource.cost || 0
                  };
                  renderWBS();
                  Modal.close();
                });
                
                listContainer.appendChild(item);
              });
            }
            
            searchInput.addEventListener("input", () => {
              renderList(searchInput.value);
            });
            
            container.appendChild(searchLabel);
            container.appendChild(searchInput);
            container.appendChild(listContainer);
            
            renderList();
            
            // Focus search input
            setTimeout(() => searchInput.focus(), 100);
          },
          onSave: null,
          onClose: () => Modal.close()
        });
      });
      
      header.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", header.dataset.resourceId || "");
        e.dataTransfer.effectAllowed = "move";
      });

      header.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      header.addEventListener("dragenter", (e) => {
        e.preventDefault();
        header.style.borderLeft = "3px solid var(--accent)";
      });

      header.addEventListener("dragleave", (e) => {
        const related = e.relatedTarget;
        // Only clear if leaving to outside the header
        if (!related || !header.contains(related)) {
          header.style.borderLeft = "";
        }
      });

      header.addEventListener("drop", (e) => {
        e.preventDefault();
        header.style.borderLeft = "";
        const fromId = e.dataTransfer.getData("text/plain");
        const toId = header.dataset.resourceId;
        if (!fromId || !toId || fromId === toId) return;
        const fromIndex = laborResources.findIndex(r => r.id === fromId);
        const toIndex = laborResources.findIndex(r => r.id === toId);
        if (fromIndex === -1 || toIndex === -1) return;
        const [moved] = laborResources.splice(fromIndex, 1);
        laborResources.splice(toIndex, 0, moved);
        renderWBS();
      });
    });
  }

  WBS_DATA.forEach(node => renderWBSNode(container, node, 1));

  // Always render enabled mandatory tasks at the bottom
  window.mandatoryWBSTasks.forEach(task => {
    if (task.enabled) {
      const mandatoryTask = {
        id: `mandatory-${task.code}`,
        code: task.code,
        name: task.name,
        grossRevenue: 0,
        subcontractors: 0,
        odc: 0,
        directLabor: 0,
        netRevenue: 0,
        dlm: 0,
        fringeBurden: 0,
        pcm: 0,
        pcmPct: 0,
        ohBurden: 0,
        burdenedLabor: 0,
        totalCost: 0,
        netMargin: 0,
        nmPct: 0,
        gmPct: 0,
        children: [],
        isPermanent: true // Flag to prevent deletion
      };
      renderWBSNode(container, mandatoryTask, 1);
    }
  });

  const totalsRow = document.createElement("div");
  totalsRow.id = "wbsTotals";
  totalsRow.className = "wbs-row wbs-totals-row";
  container.appendChild(totalsRow);

  renderTotalsRow();

  requestAnimationFrame(() => {
    if (typeof enableColumnResizing === "function") {
      enableColumnResizing(".wbs-header");
    }
    const pending = container._laborPendingFocus;
    if (pending) {
      container._laborPendingFocus = null;
      const activitySelector = pending.activityId ? `[data-activity-id="${pending.activityId}"]` : "";
      const selector = `.wbs-labor-input[data-node-id="${pending.nodeId}"]${activitySelector}[data-resource-id="${pending.resourceId}"][data-type="${pending.type}"]`;
      const el = container.querySelector(selector);
      if (el) {
        el.focus();
        el.select();
      }
    }
  });

  if (typeof scheduleAutosave === "function") {
    scheduleAutosave();
  }
  
  // Trigger calculations after render to ensure financials are up-to-date
  if (typeof window.Calculations !== "undefined" && typeof window.Calculations.recalculate === "function") {
    window.Calculations.recalculate();
  }
}

// ---------------------- top-level buttons --------------
function wireTopButtons() {
  const phaseBtn = document.getElementById("addPhaseBtn");
  const taskBtn = document.getElementById("addTaskBtn");
  const laborResourcesToggle = document.getElementById("laborResourcesToggle");
  const addResourceBtn = document.getElementById("addResourceBtn");
  const addActivityBtn = document.getElementById("addActivityBtn");
  const expensesToggle = document.getElementById("expensesToggle");
  const addSubconsultantBtn = document.getElementById("addSubconsultantBtn");
  const addOdcBtn = document.getElementById("addOdcBtn");
  const usagesToggle = document.getElementById("usagesToggle");
  const addUsageBtn = document.getElementById("addUsageBtn");
  const resourceManagerBtn = document.getElementById("resourceManagerBtn");
  const financialModeToggle = document.getElementById("financialModeToggle");
  const toolbar = document.querySelector(".wbs-toolbar");

  if (phaseBtn) {
    phaseBtn.onclick = () => {
      WBS_DATA.push({
        id: crypto.randomUUID(),
        name: "New Phase",
        level: 1,
        code: String(WBS_DATA.length + 1),
        grossRevenue: 0,
        subcontractors: 0,
        odc: 0,
        directLabor: 0,
        netRevenue: 0,
        dlm: 0,
        fringeBurden: 0,
        pcm: 0,
        pcmPct: 0,
        ohBurden: 0,
        burdenedLabor: 0,
        totalCost: 0,
        netMargin: 0,
        nmPct: 0,
        gmPct: 0,
        children: []
      });
      renderWBS();
    };
  }

  if (taskBtn) {
    taskBtn.onclick = () => {
      if (!selectedNodeId) return;
      addChildById(selectedNodeId);
    };
  }

  if (laborResourcesToggle) {
    laborResourcesToggle.onclick = () => {
      window.expandedPricingMethods.labor = !window.expandedPricingMethods.labor;
      
      // Update button icon
      laborResourcesToggle.textContent = (window.expandedPricingMethods.labor ? "⊟" : "⊞") + " Labor";
      
      // If expanding and a task is selected, expand its activities
      if (window.expandedPricingMethods.labor && selectedNodeId && !expandedLaborNodes.has(selectedNodeId)) {
        expandedLaborNodes.add(selectedNodeId);
        if (!wbsPills[selectedNodeId]) {
          wbsPills[selectedNodeId] = { estimateType: [], tag: [], unit: [] };
        }
        if (!wbsPills[selectedNodeId].laborData) {
          wbsPills[selectedNodeId].laborData = { activities: [], resources: [] };
        }
      }
      
      // Initialize labor data if expanding for first time
      if (window.expandedPricingMethods.labor && laborResources.length === 0) {
        laborResources.push({
          id: crypto.randomUUID(),
          name: "Resource 1",
          resourceId: "p5-professional",
          chargeoutRate: 100,
          costRate: 60
        });
      }
      
      // Show/hide resource and activity buttons
      if (addResourceBtn) {
        addResourceBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
      }
      if (addActivityBtn) {
        addActivityBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  if (expensesToggle) {
    expensesToggle.onclick = () => {
      window.expandedPricingMethods.expense = !window.expandedPricingMethods.expense;
      
      // Update button icon
      expensesToggle.textContent = (window.expandedPricingMethods.expense ? "⊟" : "⊞") + " Expenses";
      
      // If expanding and a task is selected, expand activity rows
      if (window.expandedPricingMethods.expense && selectedNodeId) {
        if (!expandedLaborNodes.has(selectedNodeId)) {
          expandedLaborNodes.add(selectedNodeId);
          
          // Initialize laborData if needed
          if (!wbsPills[selectedNodeId]) {
            wbsPills[selectedNodeId] = { estimateType: [], tag: [], unit: [] };
          }
          if (!wbsPills[selectedNodeId].laborData) {
            wbsPills[selectedNodeId].laborData = { activities: [], resources: [] };
          }
        }
      }
      
      // Show/hide expense buttons
      if (addSubconsultantBtn) {
        addSubconsultantBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
      }
      if (addOdcBtn) {
        addOdcBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  if (usagesToggle) {
    usagesToggle.onclick = () => {
      window.expandedPricingMethods.usages = !window.expandedPricingMethods.usages;
      
      // Update button icon
      usagesToggle.textContent = (window.expandedPricingMethods.usages ? "⊟" : "⊞") + " Units";
      
      // If expanding and a task is selected, expand activity rows
      if (window.expandedPricingMethods.usages && selectedNodeId) {
        if (!expandedLaborNodes.has(selectedNodeId)) {
          expandedLaborNodes.add(selectedNodeId);
          
          // Initialize laborData if needed
          if (!wbsPills[selectedNodeId]) {
            wbsPills[selectedNodeId] = { estimateType: [], tag: [], unit: [] };
          }
          if (!wbsPills[selectedNodeId].laborData) {
            wbsPills[selectedNodeId].laborData = { activities: [], resources: [] };
          }
        }
      }
      
      // Show/hide unit button
      if (addUsageBtn) {
        addUsageBtn.style.display = window.expandedPricingMethods.usages ? "inline-flex" : "none";
      }
      
      renderWBS();
    };
  }

  const scheduleToggle = document.getElementById("scheduleToggle");
  if (scheduleToggle) {
    scheduleToggle.onclick = () => {
      window.expandedPricingMethods.schedule = !window.expandedPricingMethods.schedule;
      
      // Update button icon
      scheduleToggle.textContent = (window.expandedPricingMethods.schedule ? "⊟" : "⊞") + " Schedule";
      
      // If expanding, expand all tasks that have activities
      if (window.expandedPricingMethods.schedule) {
        function expandTasksWithActivities(nodes) {
          nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
              expandTasksWithActivities(node.children);
            } else {
              // Leaf node - check if it has activities
              if (laborActivities[node.id] && laborActivities[node.id].activities && laborActivities[node.id].activities.length > 0) {
                expandedLaborNodes.add(node.id);
              }
            }
          });
        }
        expandTasksWithActivities(WBS_DATA);
      }
      
      renderWBS();
    };
  }

  const taskPropsToggle = document.getElementById("taskPropsToggle");
  if (taskPropsToggle) {
    taskPropsToggle.onclick = () => {
      window.expandedPricingMethods.taskProps = !window.expandedPricingMethods.taskProps;
      
      // Update button icon
      taskPropsToggle.textContent = (window.expandedPricingMethods.taskProps ? "⊟" : "⊞") + " Task Props";
      
      renderWBS();
    };
  }

  if (addResourceBtn) {
    addResourceBtn.onclick = async () => {
      // Open resource picker modal
      const resourcesData = await Rates.listResources();
      const allOptions = [
        ...resourcesData.generic.map(r => ({ ...r, type: "generic" })),
        ...resourcesData.named.map(r => ({ ...r, type: "named" }))
      ];
      
      Modal.open({
        title: "Add Resource to Labor Mode",
        content: (container) => {
          container.innerHTML = "";
          container.style.padding = "12px";
          
          const searchLabel = document.createElement("div");
          searchLabel.textContent = "Search resources:";
          searchLabel.style.marginBottom = "8px";
          searchLabel.style.fontWeight = "600";
          searchLabel.style.fontSize = "12px";
          
          const searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Type to filter...";
          searchInput.style.width = "100%";
          searchInput.style.padding = "8px";
          searchInput.style.marginBottom = "12px";
          searchInput.style.border = "1px solid var(--border)";
          searchInput.style.borderRadius = "4px";
          searchInput.style.background = "var(--bg)";
          searchInput.style.color = "var(--text)";
          searchInput.style.fontSize = "13px";
          
          const listContainer = document.createElement("div");
          listContainer.style.maxHeight = "400px";
          listContainer.style.overflowY = "auto";
          listContainer.style.border = "1px solid var(--border)";
          listContainer.style.borderRadius = "4px";
          
          function renderList(filter = "") {
            listContainer.innerHTML = "";
            const filtered = allOptions.filter(r => 
              (r.label || r.name || '').toLowerCase().includes(filter.toLowerCase())
            );
            
            if (filtered.length === 0) {
              listContainer.innerHTML = "<div style='padding: 20px; text-align: center; color: var(--text-muted);'>No resources found</div>";
              return;
            }
            
            filtered.forEach(resource => {
              const item = document.createElement("div");
              item.style.padding = "10px 12px";
              item.style.borderBottom = "1px solid var(--border-muted)";
              item.style.cursor = "pointer";
              item.style.transition = "background 0.15s";
              
              const name = document.createElement("div");
              // Show job level/code if available (e.g., "E1 - Vice President" or "P5 - John Doe")
              const jobLevelOrCode = resource.jobLevel || resource.jobCode;
              const displayName = jobLevelOrCode
                ? `${jobLevelOrCode} - ${resource.label || resource.name}`
                : (resource.label || resource.name);
              name.textContent = displayName;
              name.style.fontWeight = "500";
              name.style.fontSize = "13px";
              
              const details = document.createElement("div");
              details.textContent = `${resource.type === "generic" ? "Generic" : "Named"} • Cost: $${resource.cost || 'N/A'}/hr • Sell: $${resource.sell || 'N/A'}/hr`;
              details.style.fontSize = "11px";
              details.style.color = "var(--text-muted)";
              details.style.marginTop = "2px";
              
              item.appendChild(name);
              item.appendChild(details);
              
              item.addEventListener("mouseenter", () => {
                item.style.background = "var(--bg-hover)";
              });
              
              item.addEventListener("mouseleave", () => {
                item.style.background = "";
              });
              
              item.addEventListener("click", () => {
                // Add the selected resource to laborResources
                laborResources.push({
                  id: crypto.randomUUID(),
                  name: resource.label || resource.name,
                  resourceId: resource.id,
                  chargeoutRate: resource.sell || 0,
                  costRate: resource.cost || 0
                });
                renderWBS();
                Modal.close();
              });
              
              listContainer.appendChild(item);
            });
          }
          
          searchInput.addEventListener("input", () => {
            renderList(searchInput.value);
          });
          
          container.appendChild(searchLabel);
          container.appendChild(searchInput);
          container.appendChild(listContainer);
          
          renderList();
          
          // Focus search input
          setTimeout(() => searchInput.focus(), 100);
        },
        onSave: null, // No save button needed - click to select
        onClose: () => Modal.close()
      });
    };

    addResourceBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
  }

  if (addActivityBtn) {
    addActivityBtn.onclick = () => {
      if (!selectedNodeId) return;
      if (!laborActivities[selectedNodeId]) {
        laborActivities[selectedNodeId] = { activities: [] };
      }
      if (!Array.isArray(laborActivities[selectedNodeId].activities)) {
        laborActivities[selectedNodeId].activities = [];
      }
      const nextIndex = laborActivities[selectedNodeId].activities.length + 1;
      laborActivities[selectedNodeId].activities.push({
        id: crypto.randomUUID(),
        name: `Activity ${nextIndex}`,
        hours: {},
        expenses: { subs: [], odc: [] }
      });
      renderWBS();
    };

    addActivityBtn.style.display = window.expandedPricingMethods.labor ? "inline-flex" : "none";
  }

  if (addSubconsultantBtn) {
    addSubconsultantBtn.onclick = () => {
      if (!selectedActivityId || !selectedActivityNodeId) {
        alert("Please select an activity row first");
        return;
      }
      
      openExpenseDetails(selectedActivityNodeId, "subs", selectedActivityId);
    };
    addSubconsultantBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
  }

  if (addOdcBtn) {
    addOdcBtn.onclick = () => {
      if (!selectedActivityId || !selectedActivityNodeId) {
        alert("Please select an activity row first");
        return;
      }
      
      openExpenseDetails(selectedActivityNodeId, "odc", selectedActivityId);
    };
    addOdcBtn.style.display = window.expandedPricingMethods.expense ? "inline-flex" : "none";
  }

  if (addUsageBtn) {
    addUsageBtn.onclick = () => {
      if (!selectedNodeId) return;
      alert("Unit functionality coming soon!");
      // TODO: Implement unit form/modal
    };
    addUsageBtn.style.display = window.expandedPricingMethods.usages ? "inline-flex" : "none";
  }

  if (resourceManagerBtn) {
    resourceManagerBtn.onclick = () => {
      ResourceManager.openManager();
    };
  }

  if (financialModeToggle) {
    const updateLabel = () => {
      const isSimple = window.financialMode === "simple";
      financialModeToggle.textContent = isSimple
        ? "💰 Detailed Financials"
        : "💰 Simple Financials";
    };

    updateLabel();

    financialModeToggle.onclick = () => {
      window.financialMode = window.financialMode === "simple" ? "detailed" : "simple";
      updateLabel();
      renderWBS();
    };
  }
}

// Rate Override Modal
function openRateOverrideModal(resource) {
  Modal.open({
    title: `Rate Override - ${resource.name}`,
    content: (container) => {
      container.innerHTML = "";
      container.style.padding = "8px 10px";
      container.style.maxWidth = "340px";
      container.style.fontSize = "10px";

      // Get default rates
      const defaultCostReg = resource.costRate || 60;
      const defaultCostOT = (resource.costRate || 60) * 1.5;
      const defaultSellReg = resource.chargeoutRate || 120;
      const defaultSellOT = (resource.chargeoutRate || 120) * 1.5;

      // Helper to create compact input field
      function createRateInput(label, defaultValue, overrideValue) {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "80px 60px 70px";
        row.style.gap = "4px";
        row.style.alignItems = "center";
        row.style.marginBottom = "4px";

        const labelEl = document.createElement("label");
        labelEl.textContent = label;
        labelEl.style.fontSize = "9px";
        labelEl.style.color = "var(--text-muted)";

        const input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        input.min = "0";
        input.value = overrideValue !== undefined ? overrideValue : "";
        input.placeholder = defaultValue.toFixed(0);
        input.style.width = "100%";
        input.style.padding = "2px 4px";
        input.style.border = "1px solid var(--border)";
        input.style.borderRadius = "3px";
        input.style.background = "var(--bg)";
        input.style.color = "var(--text)";
        input.style.fontSize = "9px";

        const defaultNote = document.createElement("span");
        defaultNote.textContent = `($${defaultValue.toFixed(0)})`;
        defaultNote.style.fontSize = "8px";
        defaultNote.style.color = "var(--text-muted)";

        row.appendChild(labelEl);
        row.appendChild(input);
        row.appendChild(defaultNote);

        return { row, input };
      }

      // Cost rates section
      const costTitle = document.createElement("div");
      costTitle.textContent = "Cost";
      costTitle.style.fontSize = "10px";
      costTitle.style.fontWeight = "600";
      costTitle.style.marginBottom = "3px";
      costTitle.style.paddingBottom = "2px";
      costTitle.style.borderBottom = "1px solid var(--border)";
      container.appendChild(costTitle);

      const { row: costRegRow, input: costRegInput } = createRateInput("Reg:", defaultCostReg, resource.overrideCostReg);
      container.appendChild(costRegRow);

      const { row: costOTRow, input: costOTInput } = createRateInput("OT:", defaultCostOT, resource.overrideCostOT);
      container.appendChild(costOTRow);

      // Sell rates section
      const sellTitle = document.createElement("div");
      sellTitle.textContent = "Sell";
      sellTitle.style.fontSize = "10px";
      sellTitle.style.fontWeight = "600";
      sellTitle.style.marginTop = "6px";
      sellTitle.style.marginBottom = "3px";
      sellTitle.style.paddingBottom = "2px";
      sellTitle.style.borderBottom = "1px solid var(--border)";
      container.appendChild(sellTitle);

      const { row: sellRegRow, input: sellRegInput } = createRateInput("Reg:", defaultSellReg, resource.overrideSellReg);
      container.appendChild(sellRegRow);

      const { row: sellOTRow, input: sellOTInput } = createRateInput("OT:", defaultSellOT, resource.overrideSellOT);
      container.appendChild(sellOTRow);

      // Clear button
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear";
      clearBtn.className = "btn btn-secondary";
      clearBtn.style.marginTop = "6px";
      clearBtn.style.padding = "2px 8px";
      clearBtn.style.fontSize = "9px";
      clearBtn.addEventListener("click", () => {
        costRegInput.value = "";
        costOTInput.value = "";
        sellRegInput.value = "";
        sellOTInput.value = "";
      });
      container.appendChild(clearBtn);

      // Save callback
      container._saveCallback = () => {
        // Save overrides (undefined if empty string)
        resource.overrideCostReg = costRegInput.value ? parseFloat(costRegInput.value) : undefined;
        resource.overrideCostOT = costOTInput.value ? parseFloat(costOTInput.value) : undefined;
        resource.overrideSellReg = sellRegInput.value ? parseFloat(sellRegInput.value) : undefined;
        resource.overrideSellOT = sellOTInput.value ? parseFloat(sellOTInput.value) : undefined;

        console.log("✅ Rate overrides saved for", resource.name, resource);
        
        // Trigger recalculation
        if (window.Calculations && window.Calculations.recalculate) {
          window.Calculations.recalculate();
        } else {
          renderWBS();
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

// ---------------------- keyboard shortcuts ------------
document.addEventListener("keydown", (e) => {
  if (!selectedNodeId) return;
  
  // Ignore if typing in an input or textarea
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  
  if (e.key === "Delete") {
    e.preventDefault();
    deleteNode(selectedNodeId);
  } else if (e.key === "Insert") {
    e.preventDefault();
    addChildById(selectedNodeId);
  }
});

// ---------------------- expose / init ------------------
window.renderWBS = renderWBS;
window.wireTopButtons = wireTopButtons;
