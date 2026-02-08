// calculations.js — Calculate costs, revenues, and margins for WBS nodes

// console.log("🧮 Loading calculations.js");

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

          try {
            const rates = await Rates.resolveRates(resource);
            if (!rates) {
              console.warn(`No rates found for resource ${resource.resourceId || columnId}`);
              continue;
            }

            // Calculate direct labor (cost) - keep reg and OT separate for OH calculation
            directLaborReg += regHours * rates.costRegular;
            directLaborOT += otHours * rates.costOT;

            // Calculate revenue (sell)
            const regRevenue = regHours * rates.sellRegular;
            const otRevenue = otHours * rates.sellOT;
            revenue += regRevenue + otRevenue;
          } catch (err) {
            console.error(`Error getting rates for resource ${resource.resourceId || columnId}:`, err);
          }
        }
      }
    }

    // --- Unit items from activities ---
    let unitLaborReg = 0, unitLaborOT = 0, unitSubsCost = 0, unitExpCost = 0, unitRevenue = 0;

    if (entry && Array.isArray(entry.activities)) {
      for (const activity of entry.activities) {
        if (activity.unitItems) {
          for (const ui of activity.unitItems) {
            const qty = Number(ui.qty || 0);
            if (qty === 0) continue;
            unitLaborReg += (ui.laborCostReg || 0) * qty;
            unitLaborOT += (ui.laborCostOT || 0) * qty;
            unitSubsCost += (ui.subsCost || 0) * qty;
            unitExpCost += (ui.expenseCost || 0) * qty;
            unitRevenue += (ui.sellPerUnit || 0) * qty;
          }
        }
      }
    }

    // Fold unit labor into direct labor (so burden applies)
    directLaborReg += unitLaborReg;
    directLaborOT += unitLaborOT;
    revenue += unitRevenue;

    const rawLabor = directLaborReg + directLaborOT;

    // Add unit subs/expenses to direct subs/odc
    const subs = Number(node.subcontractors || 0) + unitSubsCost;
    const odc = Number(node.odc || 0) + unitExpCost;
    const subsSell = Number(node.subcontractorsSell || 0);
    const odcSell = Number(node.odcSell || 0);

    const grossRevenue = revenue + subsSell + odcSell;
    const netRevenue = grossRevenue - subs - odc;

    const fringeRegRate = window.ohRates?.regular?.laborFringe ?? 0;
    const fringeOtRate = window.ohRates?.overtime?.laborFringe ?? fringeRegRate;
    const ohRegRate = (window.ohRates?.regular?.operatingCosts ?? 0) + (window.ohRates?.regular?.operatingOH ?? 0);
    const ohOtRate = (window.ohRates?.overtime?.operatingCosts ?? 0) + (window.ohRates?.overtime?.operatingOH ?? 0);

    const fringeBurden = (directLaborReg * fringeRegRate) + (directLaborOT * fringeOtRate);
    const ohBurden = (directLaborReg * ohRegRate) + (directLaborOT * ohOtRate);

    const burdenedLabor = rawLabor + fringeBurden + ohBurden;
    const totalCost = burdenedLabor + subs + odc;

    // Unit-specific burden (for aggregate display mode)
    const unitFringe = (unitLaborReg * fringeRegRate) + (unitLaborOT * fringeOtRate);
    const unitOH = (unitLaborReg * ohRegRate) + (unitLaborOT * ohOtRate);
    const unitLaborRaw = unitLaborReg + unitLaborOT;
    const unitBurdenedLabor = unitLaborRaw + unitFringe + unitOH;
    const unitsCost = unitBurdenedLabor + unitSubsCost + unitExpCost;
    const unitsSell = unitRevenue;

    const dlm = rawLabor > 0 ? (netRevenue / rawLabor) : 0;
    const pcm = netRevenue - rawLabor - fringeBurden;
    const pcmPct = grossRevenue > 0 ? (pcm / grossRevenue) : 0;
    const netMargin = netRevenue - rawLabor - fringeBurden - ohBurden;
    const nmPct = netRevenue > 0 ? (netMargin / netRevenue) : 0;
    const gmPct = grossRevenue > 0 ? ((grossRevenue - totalCost) / grossRevenue) : 0;

    return {
      grossRevenue,
      subcontractors: subs,
      odc,
      subcontractorsSell: subsSell,
      odcSell: odcSell,
      directLabor: rawLabor,
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
      gmPct,
      // Unit display fields
      unitsCost,
      unitsSell,
      unitsLaborRaw: unitLaborRaw,
      unitsSubsCost: unitSubsCost,
      unitsExpenseCost: unitExpCost,
      unitsFringeBurden: unitFringe,
      unitsOHBurden: unitOH
    };
  }

  // Roll up calculations from children to parent
  function rollupNode(node) {
    const totals = {
      grossRevenue: 0,
      subcontractors: 0,
      odc: 0,
      subcontractorsSell: 0,
      odcSell: 0,
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
      unitsCost: 0,
      unitsSell: 0,
      unitsLaborRaw: 0,
      unitsSubsCost: 0,
      unitsExpenseCost: 0,
      unitsFringeBurden: 0,
      unitsOHBurden: 0
    };

    if (!node.children || node.children.length === 0) {
      return totals;
    }

    // Sum up all children
    for (const child of node.children) {
      totals.grossRevenue += Number(child.grossRevenue || 0);
      totals.subcontractors += Number(child.subcontractors || 0);
      totals.odc += Number(child.odc || 0);
      totals.subcontractorsSell += Number(child.subcontractorsSell || 0);
      totals.odcSell += Number(child.odcSell || 0);
      totals.directLabor += Number(child.directLabor || 0);
      totals.netRevenue += Number(child.netRevenue || 0);
      totals.fringeBurden += Number(child.fringeBurden || 0);
      totals.pcm += Number(child.pcm || 0);
      totals.ohBurden += Number(child.ohBurden || 0);
      totals.burdenedLabor += Number(child.burdenedLabor || 0);
      totals.totalCost += Number(child.totalCost || 0);
      totals.netMargin += Number(child.netMargin || 0);
      totals.unitsCost += Number(child.unitsCost || 0);
      totals.unitsSell += Number(child.unitsSell || 0);
      totals.unitsLaborRaw += Number(child.unitsLaborRaw || 0);
      totals.unitsSubsCost += Number(child.unitsSubsCost || 0);
      totals.unitsExpenseCost += Number(child.unitsExpenseCost || 0);
      totals.unitsFringeBurden += Number(child.unitsFringeBurden || 0);
      totals.unitsOHBurden += Number(child.unitsOHBurden || 0);
    }

    totals.dlm = totals.directLabor > 0 ? (totals.netRevenue / totals.directLabor) : 0;
    totals.pcmPct = totals.grossRevenue > 0 ? (totals.pcm / totals.grossRevenue) : 0;
    totals.nmPct = totals.netRevenue > 0 ? (totals.netMargin / totals.netRevenue) : 0;
    totals.gmPct = totals.grossRevenue > 0 ? ((totals.grossRevenue - totals.totalCost) / totals.grossRevenue) : 0;

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
    // console.log("🧮 Calculating WBS...");
    
    for (const node of WBS_DATA) {
      await calculateNode(node);
    }
    
    // console.log("✅ WBS calculations complete");
  }

  // Update labor rollup cells (the hours displayed for each resource)
  function updateLaborRollupCells() {
    if (!window.expandedPricingMethods || !window.expandedPricingMethods.labor) {
      return; // Labor mode not active
    }

    const container = document.getElementById("wbsContainer");
    if (!container) return;

    // Helper to calculate rollup from wbs.js
    function calculateLaborRollup(node, resourceId, type) {
      let total = 0;
      
      function sumChildren(n) {
        if (!n.children || n.children.length === 0) {
          // Leaf node - sum activity hours
          const entry = window.laborActivities && window.laborActivities[n.id];
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

    function formatNumber(value) {
      const n = Number(value || 0);
      if (!Number.isFinite(n)) return "";
      return n.toLocaleString();
    }

    // Update each WBS node's labor cells
    function updateNodeLaborCells(node) {
      const nodeRow = container.querySelector(`.wbs-row[data-id="${node.id}"]:not(.labor-activity-row)`);
      if (!nodeRow) return;

      // Find all labor rollup cells in this row
      const laborRollupCells = nodeRow.querySelectorAll(".wbs-labor-rollup");
      if (laborRollupCells.length === 0) return;

      // Update each resource's rollup
      let cellIndex = 0;
      window.laborResources.forEach((res) => {
        const regTotal = calculateLaborRollup(node, res.id, 'reg');
        const otTotal = calculateLaborRollup(node, res.id, 'ot');
        
        if (laborRollupCells[cellIndex]) {
          laborRollupCells[cellIndex].textContent = regTotal > 0 ? formatNumber(regTotal) : '';
        }
        cellIndex++;
        
        if (laborRollupCells[cellIndex]) {
          laborRollupCells[cellIndex].textContent = otTotal > 0 ? formatNumber(otTotal) : '';
        }
        cellIndex++;
      });
    }

    // Update all nodes
    function walkNodes(nodes) {
      nodes.forEach(node => {
        updateNodeLaborCells(node);
        if (node.children && node.children.length > 0) {
          walkNodes(node.children);
        }
      });
    }

    walkNodes(window.WBS_DATA);
    // console.log("✅ Labor rollup cells updated");
  }

  // Update financial cells without full re-render (preserves focus)
  async function updateFinancialCells() {
    const container = document.getElementById("wbsContainer");
    if (!container) return;

    const unitsAgg = window.unitsDisplayMode === "aggregate";
    const unitsCols = unitsAgg ? [
      { key: "unitsCost", format: "money" },
      { key: "unitsSell", format: "money" },
    ] : [];

    const financialColumns = window.financialMode === "simple"
      ? [
          { key: "grossRevenue", format: "money" },
          { key: "subcontractors", format: "money" },
          { key: "odc", format: "money" },
          ...unitsCols,
          { key: "directLabor", format: "money" },
          { key: "totalCost", format: "money" },
          { key: "netRevenue", format: "money" },
          { key: "nmPct", format: "percent" },
          { key: "dlm", format: "money" }
        ]
      : [
          { key: "grossRevenue", format: "money" },
          { key: "subcontractors", format: "money" },
          { key: "odc", format: "money" },
          ...unitsCols,
          { key: "directLabor", format: "money" },
          { key: "netRevenue", format: "money" },
          { key: "dlm", format: "money" },
          { key: "fringeBurden", format: "money" },
          { key: "pcm", format: "money" },
          { key: "pcmPct", format: "percent" },
          { key: "ohBurden", format: "money" },
          { key: "burdenedLabor", format: "money" },
          { key: "totalCost", format: "money" },
          { key: "netMargin", format: "money" },
          { key: "nmPct", format: "percent" },
          { key: "gmPct", format: "percent" }
        ];

    // In aggregate mode, adjust display values to exclude unit components
    function getDisplayValue(node, key) {
      if (unitsAgg) {
        switch (key) {
          case "directLabor":    return (node.directLabor || 0) - (node.unitsLaborRaw || 0);
          case "subcontractors": return (node.subcontractors || 0) - (node.unitsSubsCost || 0);
          case "odc":            return (node.odc || 0) - (node.unitsExpenseCost || 0);
          case "fringeBurden":   return (node.fringeBurden || 0) - (node.unitsFringeBurden || 0);
          case "ohBurden":       return (node.ohBurden || 0) - (node.unitsOHBurden || 0);
          case "burdenedLabor":  return (node.burdenedLabor || 0) - (node.unitsLaborRaw || 0) - (node.unitsFringeBurden || 0) - (node.unitsOHBurden || 0);
        }
      }
      return node[key] || 0;
    }

    const formatByType = (value, type) => {
      if (type === "percent") return formatPercent(value);
      return formatMoney(value);
    };

    // Update labor rollup cells first
    updateLaborRollupCells();

    // Update WBS node rows (tasks, phases, subtasks)
    function updateNodeRow(node) {
      const nodeRow = container.querySelector(`.wbs-row[data-id="${node.id}"]:not(.labor-activity-row)`);
      if (nodeRow) {
        // console.log(`📊 Updating node ${node.id} (${node.name}): DL=${node.directLabor}, Rev=${node.netRevenue}`);
        const cells = nodeRow.querySelectorAll(".wbs-fin-cell");
        // console.log(`   Found ${cells.length} cells in row`);
        if (cells.length >= financialColumns.length) {
          // console.log(`   Before: cells[0]="${cells[0].textContent}", setting to "${formatByType(node[financialColumns[0].key], financialColumns[0].format)}"`);
          financialColumns.forEach((col, idx) => {
            cells[idx].textContent = formatByType(getDisplayValue(node, col.key), col.format);
          });
          // Force repaint
          nodeRow.offsetHeight;
        } else {
          console.warn(`⚠️ Node ${node.id} row found but has ${cells.length} cells, expected ${financialColumns.length}`);
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
        if (cells.length >= financialColumns.length) {
          financialColumns.forEach((col, idx) => {
            cells[idx].textContent = formatByType(getDisplayValue(node, col.key), col.format);
          });
        }
      }
      
      // Update activity rows for this node
      const activities = window.laborActivities && window.laborActivities[node.id];
      if (activities && Array.isArray(activities.activities)) {
        for (const activity of activities.activities) {
          const activityRow = container.querySelector(`.labor-activity-row[data-activity-id="${activity.id}"]`);
          if (activityRow) {
            const cells = activityRow.querySelectorAll(".wbs-fin-cell");
            if (cells.length >= financialColumns.length) {
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

                let rates;
                try {
                  rates = await window.Rates.resolveRates(resource);
                } catch (err) {
                  rates = null;
                }
                if (!rates) continue;

                directLaborReg += regHours * rates.costRegular;
                directLaborOT += otHours * rates.costOT;
                revenue += regHours * rates.sellRegular + otHours * rates.sellOT;
              }

              // Unit items from this activity
              let aUnitLaborReg = 0, aUnitLaborOT = 0, aUnitSubs = 0, aUnitExp = 0, aUnitRev = 0;
              if (activity.unitItems) {
                for (const ui of activity.unitItems) {
                  const qty = Number(ui.qty || 0);
                  if (qty === 0) continue;
                  aUnitLaborReg += (ui.laborCostReg || 0) * qty;
                  aUnitLaborOT += (ui.laborCostOT || 0) * qty;
                  aUnitSubs += (ui.subsCost || 0) * qty;
                  aUnitExp += (ui.expenseCost || 0) * qty;
                  aUnitRev += (ui.sellPerUnit || 0) * qty;
                }
              }

              // Fold unit labor into activity labor
              directLaborReg += aUnitLaborReg;
              directLaborOT += aUnitLaborOT;
              revenue += aUnitRev;

              // Get expense values from this activity
              const subsItems = activity.expenses?.subs || [];
              const odcItems = activity.expenses?.odc || [];
              const subs = subsItems.reduce((sum, item) => sum + Number(item.cost || 0), 0) + aUnitSubs;
              const odc = odcItems.reduce((sum, item) => sum + Number(item.cost || 0), 0) + aUnitExp;
              const subsSell = subsItems.reduce((sum, item) => sum + Number(item.sell || 0), 0);
              const odcSell = odcItems.reduce((sum, item) => sum + Number(item.sell || 0), 0);

              const grossRevenue = revenue + subsSell + odcSell;
              const netRevenue = grossRevenue - subs - odc;

              const fringeRegRate = window.ohRates?.regular?.laborFringe ?? 0;
              const fringeOtRate = window.ohRates?.overtime?.laborFringe ?? fringeRegRate;
              const ohRegRate = (window.ohRates?.regular?.operatingCosts ?? 0) + (window.ohRates?.regular?.operatingOH ?? 0);
              const ohOtRate = (window.ohRates?.overtime?.operatingCosts ?? 0) + (window.ohRates?.overtime?.operatingOH ?? 0);

              const rawLabor = directLaborReg + directLaborOT;
              const fringeBurden = (directLaborReg * fringeRegRate) + (directLaborOT * fringeOtRate);
              const ohBurden = (directLaborReg * ohRegRate) + (directLaborOT * ohOtRate);
              const burdenedLabor = rawLabor + fringeBurden + ohBurden;
              const totalCost = burdenedLabor + subs + odc;

              // Unit-specific burden for aggregate display
              const aUnitFringe = (aUnitLaborReg * fringeRegRate) + (aUnitLaborOT * fringeOtRate);
              const aUnitOH = (aUnitLaborReg * ohRegRate) + (aUnitLaborOT * ohOtRate);
              const aUnitLaborRaw = aUnitLaborReg + aUnitLaborOT;
              const aUnitBurdened = aUnitLaborRaw + aUnitFringe + aUnitOH;

              const dlm = rawLabor > 0 ? (netRevenue / rawLabor) : 0;
              const pcm = netRevenue - rawLabor - fringeBurden;
              const pcmPct = grossRevenue > 0 ? (pcm / grossRevenue) : 0;
              const netMargin = netRevenue - rawLabor - fringeBurden - ohBurden;
              const nmPct = netRevenue > 0 ? (netMargin / netRevenue) : 0;
              const gmPct = grossRevenue > 0 ? ((grossRevenue - totalCost) / grossRevenue) : 0;

              const activityFinancials = {
                grossRevenue,
                subcontractors: subs,
                odc,
                directLabor: rawLabor,
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
                gmPct,
                unitsCost: aUnitBurdened + aUnitSubs + aUnitExp,
                unitsSell: aUnitRev,
                unitsLaborRaw: aUnitLaborRaw,
                unitsSubsCost: aUnitSubs,
                unitsExpenseCost: aUnitExp,
                unitsFringeBurden: aUnitFringe,
                unitsOHBurden: aUnitOH
              };

              // console.log(`💵 Activity ${activity.name} financials:`, {
              //   subs,
              //   odc,
              //   rawLabor,
              //   directLabor: activityFinancials.directLabor
              // });

              if (cells.length >= financialColumns.length) {
                financialColumns.forEach((col, idx) => {
                  const value = getDisplayValue(activityFinancials, col.key);

                  // Special handling for expense columns - preserve icon if it exists
                  if (col.key === "subcontractors" || col.key === "odc") {
                    const type = col.key === "subcontractors" ? "subs" : "odc";
                    const items = activity.expenses?.[type] || [];
                    const hasEntries = items.length > 0;
                    const iconHtml = hasEntries ? `<button class="expense-detail-btn" data-expense-type="${type}" title="View details">🗒️</button>` : '';
                    cells[idx].innerHTML = `
                      ${iconHtml}
                      <span class="expense-value">${formatByType(value, col.format)}</span>
                    `;
                    cells[idx].className = "wbs-fin-cell expense-cell";
                    cells[idx].dataset.expenseType = type;
                    cells[idx].style.fontStyle = "normal";
                  } else {
                    cells[idx].textContent = formatByType(value, col.format);
                  }
                });
              }
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
    // console.log("🔄 Starting recalculate...");
    await calculateWBS();
    // console.log("✅ WBS calculated, now updating cells...");
    await updateFinancialCells();
    // console.log("✅ Cells updated - DO NOT CALL renderWBS or it will wipe out updates!");
    
    // DO NOT call renderWBS here - it would wipe out our updates
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
