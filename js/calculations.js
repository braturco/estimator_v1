// calculations.js — Calculate costs, revenues, and margins for WBS nodes

console.log("🧮 Loading calculations.js");

window.Calculations = (function () {
  
  // Formatting helpers
  function formatMoney(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "";
    return (n * 100).toFixed(1) + "%";
  }
  
  // Calculate financial values for a single leaf node (task/work item)
  async function calculateLeafNode(node) {
    let directLaborReg = 0;
    let directLaborOT = 0;
    let revenue = 0;

    // Calculate labor costs and revenue from activities
    const entry = laborActivities[node.id];
    if (entry && Array.isArray(entry.activities)) {
      for (const activity of entry.activities) {
        if (!activity.hours) continue;

        // Iterate through each resource column ID that has hours
        for (const columnId in activity.hours) {
          const hours = activity.hours[columnId];
          const regHours = Number(hours.reg || 0);
          const otHours = Number(hours.ot || 0);

          if (regHours === 0 && otHours === 0) continue;

          // Find the resource in laborResources by column ID
          const resource = laborResources.find(r => r.id === columnId);
          if (!resource) {
            console.warn(`Resource column ${columnId} not found in laborResources`);
            continue;
          }

          // Get the actual resource ID for rate lookup
          const actualResourceId = resource.resourceId || columnId;

          // Get rates for this resource
          try {
            // Check for manual rate overrides first
            let costRegular, costOT, sellRegular, sellOT;
            
            if (resource.overrideCostReg !== undefined || resource.overrideSellReg !== undefined) {
              // Use manual overrides if available
              costRegular = resource.overrideCostReg !== undefined ? resource.overrideCostReg : resource.costRate || 60;
              costOT = resource.overrideCostOT !== undefined ? resource.overrideCostOT : (costRegular * 1.5);
              sellRegular = resource.overrideSellReg !== undefined ? resource.overrideSellReg : resource.chargeoutRate || 120;
              sellOT = resource.overrideSellOT !== undefined ? resource.overrideSellOT : (sellRegular * 1.5);
            } else {
              // Fetch from rate tables
              const rates = await Rates.getRates(actualResourceId);
              if (!rates) {
                console.warn(`No rates found for resource ${actualResourceId}`);
                continue;
              }
              costRegular = rates.costRegular;
              costOT = rates.costOT;
              sellRegular = rates.sellRegular;
              sellOT = rates.sellOT;
            }

            // Calculate direct labor (cost) - keep reg and OT separate for OH calculation
            directLaborReg += regHours * costRegular;
            directLaborOT += otHours * costOT;

            // Calculate revenue (sell)
            const regRevenue = regHours * sellRegular;
            const otRevenue = otHours * sellOT;
            revenue += regRevenue + otRevenue;

          } catch (err) {
            console.error(`Error getting rates for resource ${actualResourceId}:`, err);
          }
        }
      }
    }

    const directLabor = directLaborReg + directLaborOT;

    // Apply OH/burden separately to reg and OT using component rates
    const ohRegRate = window.getTotalOHRate ? window.getTotalOHRate('regular') : 1.10;
    const ohOTRate = window.getTotalOHRate ? window.getTotalOHRate('overtime') : 1.10;
    
    const burdenedReg = directLaborReg * (1 + ohRegRate);
    const burdenedOT = directLaborOT * (1 + ohOTRate);
    const burdenedLabor = burdenedReg + burdenedOT;

    // Expenses (manual entry for now, default 0)
    const expenses = Number(node.expenses || 0);

    // Net revenue = revenue (no markup applied at this level)
    const netRevenue = revenue;

    // Apply gross margin multiplier (default 1.15 = 15% markup)
    const gmMultiplier = node.gmMultiplier || 1.15;
    const grossRevenue = netRevenue * gmMultiplier;

    // Calculate margins
    const nm = netRevenue > 0 ? (netRevenue - burdenedLabor - expenses) / netRevenue : 0;
    const gm = grossRevenue > 0 ? (grossRevenue - burdenedLabor - expenses) / grossRevenue : 0;
    
    // Direct labor margin (profit on labor only)
    const dlm = directLabor > 0 ? (revenue - burdenedLabor) : 0;

    return {
      directLabour: directLabor,
      expenses: expenses,
      burdened: burdenedLabor,
      netRevenue: netRevenue,
      grossRevenue: grossRevenue,
      nm: nm,
      gm: gm,
      dlm: dlm
    };
  }

  // Roll up calculations from children to parent
  function rollupNode(node) {
    const totals = {
      directLabour: 0,
      expenses: 0,
      burdened: 0,
      netRevenue: 0,
      grossRevenue: 0,
      nm: 0,
      gm: 0,
      dlm: 0
    };

    if (!node.children || node.children.length === 0) {
      return totals;
    }

    // Sum up all children
    for (const child of node.children) {
      totals.directLabour += Number(child.directLabour || 0);
      totals.expenses += Number(child.expenses || 0);
      totals.burdened += Number(child.burdened || 0);
      totals.netRevenue += Number(child.netRevenue || 0);
      totals.grossRevenue += Number(child.grossRevenue || 0);
      totals.dlm += Number(child.dlm || 0);
    }

    // Recalculate margins based on rolled-up totals
    totals.nm = totals.netRevenue > 0 
      ? (totals.netRevenue - totals.burdened - totals.expenses) / totals.netRevenue 
      : 0;
    
    totals.gm = totals.grossRevenue > 0 
      ? (totals.grossRevenue - totals.burdened - totals.expenses) / totals.grossRevenue 
      : 0;

    return totals;
  }

  // Calculate entire WBS tree (recursive)
  async function calculateNode(node) {
    const hasChildren = node.children && node.children.length > 0;

    if (!hasChildren) {
      // Leaf node - calculate from activities and hours
      const values = await calculateLeafNode(node);
      Object.assign(node, values);
    } else {
      // Parent node - recurse children first, then roll up
      for (const child of node.children) {
        await calculateNode(child);
      }
      const values = rollupNode(node);
      Object.assign(node, values);
    }
  }

  // Calculate entire WBS
  async function calculateWBS() {
    console.log("🧮 Calculating WBS...");
    
    for (const node of WBS_DATA) {
      await calculateNode(node);
    }
    
    console.log("✅ WBS calculations complete");
  }

  // Update financial cells without full re-render (preserves focus)
  async function updateFinancialCells() {
    const container = document.getElementById("wbsContainer");
    if (!container) return;

    // Update WBS node rows (tasks, phases, subtasks)
    function updateNodeRow(node) {
      const nodeRow = container.querySelector(`.wbs-row[data-id="${node.id}"]:not(.labor-activity-row)`);
      if (nodeRow) {
        console.log(`📊 Updating node ${node.id} (${node.name}): DL=${node.directLabour}, Rev=${node.netRevenue}`);
        const cells = nodeRow.querySelectorAll(".wbs-fin-cell");
        if (cells.length >= 8) {
          cells[0].textContent = formatMoney(node.directLabour);
          cells[1].textContent = formatMoney(node.expenses);
          cells[2].textContent = formatMoney(node.burdened);
          cells[3].textContent = formatMoney(node.netRevenue);
          cells[4].textContent = formatMoney(node.grossRevenue);
          cells[5].textContent = formatPercent(node.nm);
          cells[6].textContent = formatPercent(node.gm);
          cells[7].textContent = formatMoney(node.dlm);
        } else {
          console.warn(`⚠️ Node ${node.id} row found but has ${cells.length} cells, expected 8`);
        }
      } else {
        console.warn(`⚠️ No row found for node ${node.id}`);
      }
      
      // Recurse to children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          updateNodeRow(child);
        }
      }
    }
    
    // Update all WBS nodes
    for (const node of WBS_DATA) {
      updateNodeRow(node);
    }

    // Update activity rows
    async function updateNodeActivities(node) {
      const row = container.querySelector(`.wbs-row[data-id="${node.id}"]`);
      if (row && !row.classList.contains('labor-activity-row')) {
        const cells = row.querySelectorAll(".wbs-fin-cell");
        if (cells.length >= 8) {
          cells[0].textContent = formatMoney(node.directLabour);
          cells[1].textContent = formatMoney(node.expenses);
          cells[2].textContent = formatMoney(node.burdened);
          cells[3].textContent = formatMoney(node.netRevenue);
          cells[4].textContent = formatMoney(node.grossRevenue);
          cells[5].textContent = formatPercent(node.nm);
          cells[6].textContent = formatPercent(node.gm);
          cells[7].textContent = formatMoney(node.dlm);
        }
      }
      
      // Update activity rows for this node
      const activities = window.laborActivities && window.laborActivities[node.id];
      if (activities && Array.isArray(activities.activities)) {
        for (const activity of activities.activities) {
          const activityRow = container.querySelector(`.labor-activity-row[data-activity-id="${activity.id}"]`);
          if (activityRow) {
            const cells = activityRow.querySelectorAll(".wbs-fin-cell");
            if (cells.length >= 8) {
              // Calculate activity financials
              let directLaborReg = 0;
              let directLaborOT = 0;
              let revenue = 0;

              for (const columnId in activity.hours) {
                const hours = activity.hours[columnId];
                const regHours = Number(hours.reg || 0);
                const otHours = Number(hours.ot || 0);

                if (regHours === 0 && otHours === 0) continue;

                const resource = window.laborResources.find(r => r.id === columnId);
                if (!resource) continue;

                let costRegular, costOT, sellRegular, sellOT;
                
                if (resource.overrideCostReg !== undefined || resource.overrideSellReg !== undefined) {
                  costRegular = resource.overrideCostReg !== undefined ? resource.overrideCostReg : resource.costRate || 60;
                  costOT = resource.overrideCostOT !== undefined ? resource.overrideCostOT : (costRegular * 1.5);
                  sellRegular = resource.overrideSellReg !== undefined ? resource.overrideSellReg : resource.chargeoutRate || 120;
                  sellOT = resource.overrideSellOT !== undefined ? resource.overrideSellOT : (sellRegular * 1.5);
                } else {
                  const actualResourceId = resource.resourceId || columnId;
                  try {
                    const rates = await window.Rates.getRates(actualResourceId);
                    if (rates) {
                      costRegular = rates.costRegular;
                      costOT = rates.costOT;
                      sellRegular = rates.sellRegular;
                      sellOT = rates.sellOT;
                    } else {
                      continue;
                    }
                  } catch (err) {
                    continue;
                  }
                }

                directLaborReg += regHours * costRegular;
                directLaborOT += otHours * costOT;
                revenue += regHours * sellRegular + otHours * sellOT;
              }

              const directLabor = directLaborReg + directLaborOT;
              const ohRegRate = window.getTotalOHRate ? window.getTotalOHRate('regular') : 1.10;
              const ohOTRate = window.getTotalOHRate ? window.getTotalOHRate('overtime') : 1.10;
              const burdenedLabor = directLaborReg * (1 + ohRegRate) + directLaborOT * (1 + ohOTRate);
              const expenses = 0;
              const netRevenue = revenue;
              const grossRevenue = netRevenue * (node.gmMultiplier || 1.15);
              const nm = netRevenue > 0 ? (netRevenue - burdenedLabor - expenses) / netRevenue : 0;
              const gm = grossRevenue > 0 ? (grossRevenue - burdenedLabor - expenses) / grossRevenue : 0;
              const dlm = directLabor > 0 ? (revenue - burdenedLabor) : 0;

              cells[0].textContent = formatMoney(directLabor);
              cells[1].textContent = formatMoney(expenses);
              cells[2].textContent = formatMoney(burdenedLabor);
              cells[3].textContent = formatMoney(netRevenue);
              cells[4].textContent = formatMoney(grossRevenue);
              cells[5].textContent = formatPercent(nm);
              cells[6].textContent = formatPercent(gm);
              cells[7].textContent = formatMoney(dlm);
            }
          }
        }
      }
      
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await updateNodeActivities(child);
        }
      }
    }

    for (const node of WBS_DATA) {
      await updateNodeActivities(node);
    }
    
    // Update totals row
    if (window.renderTotalsRow) {
      window.renderTotalsRow();
    }
  }

  // Recalculate without re-rendering (preserves focus)
  async function recalculate() {
    console.log("🔄 Starting recalculate...");
    await calculateWBS();
    console.log("✅ WBS calculated, now updating cells...");
    await updateFinancialCells();
    console.log("✅ Cells updated");
  }

  // Recalculate and force full re-render
  async function recalculateAndRender() {
    await calculateWBS();
    if (window.renderWBS) {
      window.renderWBS();
    }
  }

  return {
    calculateWBS,
    calculateNode,
    recalculate,
    recalculateAndRender,
    updateFinancialCells
  };
})();
