// Oracle CSV export functionality

window.OracleExport = (function() {
  
  // CSV template structure based on Oracle import format
  const COLUMN_HEADERS = {
    row1: {
      A: "TASK DETAILS",
      P: "BUDGET DETAILS"
    },
    row2: [
      "Type*",
      "Task Number*",
      "Task Name*",
      "Level*",
      "Parent Task Number**",
      "Start Date*",
      "End Date*",
      "Chargeable*",
      "Billable*",
      "Work Type",
      "Contingency Task",
      "Burden Schedule",
      "Invoice Fee Type",
      "ICRC Task",
      "",  // Column O - intentionally blank
      "Resource*",
      "Organization",
      "Quantity**",
      "Revenue Rate",
      "Revenue",
      "Raw Cost Rate",
      "Raw Cost",
      "Burdened Cost Rate",
      "Burdened Cost"
    ],
    row3: [
      "WBS_BUDGET_TYPE",
      "TASK_NUMBER",
      "TASK_NAME",
      "DENORM_WBS_LEVEL",
      "PARENT_TASK_NUMBER",
      "START_DATE",
      "END_DATE",
      "CHARGEABLE_FLAG",
      "BILLABLE_FLAG",
      "WORK_TYPE",
      "CONTIGENCY_FLAG",
      "BURDEN_SCHEDULE_NAME",
      "INVOICE_FEE_TYPE",
      "ICRC_FLAG",
      "",  // Column O - intentionally blank
      "RESOURCE_NAME",
      "RES_ORGANIZATION_NAME",
      "TOTAL_QUANTITY",
      "REVENUE_RATE",
      "REVENUE",
      "RAW_COST_RATE",
      "RAW_COST",
      "BRDND_COST_RATE",
      "BURDENED_COST"
    ]
  };

  function generateCSV() {
    const rows = [];
    
    // Row 1: Section headers
    const row1 = new Array(24).fill("");
    row1[0] = COLUMN_HEADERS.row1.A;
    row1[15] = COLUMN_HEADERS.row1.P; // Column P is index 15 (column O at 14 is blank)
    rows.push(row1);
    
    // Row 2: Field labels
    rows.push(COLUMN_HEADERS.row2);
    
    // Row 3: Column identifiers
    rows.push(COLUMN_HEADERS.row3);
    
    // Row 4+: Data rows
    // First, generate Task rows for WBS structure
    generateTaskRows(window.WBS_DATA, rows, null, 1);
    
    // Then, generate Budget rows for lowest level tasks with activities
    generateBudgetRows(window.WBS_DATA, rows);
    
    return rows;
  }
  
  function generateTaskRows(nodes, rows, parentCode, level) {
    if (!nodes || !Array.isArray(nodes)) return;
    
    nodes.forEach(node => {
      const row = new Array(24).fill("");
      
      // Column A: Type
      row[0] = "Task";
      
      // Column B: Task Number
      row[1] = node.code || "";
      
      // Column C: Task Name
      row[2] = node.name || "";
      
      // Column D: Level
      row[3] = String(level);
      
      // Column E: Parent Task Number (blank if level 1)
      row[4] = level > 1 ? (parentCode || "") : "";
      
      // Column F: Start Date (not set up yet)
      row[5] = "";
      
      // Column G: End Date (not set up yet)
      row[6] = "";
      
      // Column H: Chargeable (default Y)
      row[7] = "Y";
      
      // Column I: Billable (default Y)
      row[8] = "Y";
      
      // Column J: Work Type (default Home)
      row[9] = "Home";
      
      // Column K: Contingency Task (not set up yet)
      row[10] = "";
      
      // Columns L-N: Leave blank for now
      // L: Burden Schedule
      // M: Invoice Fee Type (Fixed Fee or T&M)
      // N: ICRC Task (Y/N)
      
      // Column O: (intentionally blank)
      
      // Columns P-W: Budget details (will be separate Budget rows)
      
      rows.push(row);
      
      // Recursively add children
      if (node.children && node.children.length > 0) {
        generateTaskRows(node.children, rows, node.code, level + 1);
      }
    });
  }
  
  function generateBudgetRows(nodes, rows) {
    if (!nodes || !Array.isArray(nodes)) return;
    
    nodes.forEach(node => {
      const hasChildren = node.children && node.children.length > 0;
      
      // Only create Budget rows for leaf nodes (lowest level) with activities AND actual budget values
      if (!hasChildren) {
        const laborData = window.laborActivities && window.laborActivities[node.id];
        const hasActivities = laborData && Array.isArray(laborData.activities) && laborData.activities.length > 0;
        
        // Check if task has any actual cost or revenue values
        const hasValues = node.grossRevenue > 0 || 
                         node.directLabor > 0 || 
                         node.totalCost > 0 || 
                         node.netRevenue > 0 ||
                         node.subcontractors > 0 ||
                         node.odc > 0;
        
        if (hasActivities && hasValues) {
          // Calculate labor revenue (gross - subs - odc)
          const laborRevenue = (node.grossRevenue || 0) - (node.subcontractorsSell || 0) - (node.odcSell || 0);
          
          // Calculate total labor hours
          let totalHours = 0;
          if (laborData && laborData.activities) {
            laborData.activities.forEach(activity => {
              if (activity.hours) {
                Object.keys(activity.hours).forEach(resourceId => {
                  const hours = activity.hours[resourceId];
                  totalHours += Number(hours.reg || 0) + Number(hours.ot || 0);
                });
              }
            });
          }
          
          // Budget row for Labor (if there's labor on this task)
          if (node.directLabor > 0 || totalHours > 0) {
            const laborRow = new Array(24).fill("");
            laborRow[0] = "Budget"; // Type
            laborRow[1] = node.code || ""; // Task Number
            laborRow[2] = node.name || ""; // Task Name
            laborRow[15] = "Labor"; // Resource* (column P, index 15)
            laborRow[17] = totalHours.toFixed(2); // Quantity** (column R, index 17)
            laborRow[19] = laborRevenue.toFixed(2); // Revenue (column T, index 19)
            laborRow[21] = (node.directLabor || 0).toFixed(2); // Raw Cost (column V, index 21)
            laborRow[23] = (node.burdenedLabor || 0).toFixed(2); // Burdened Cost (column X, index 23)
            rows.push(laborRow);
          }
          
          // Budget row for Subconsultant (if there are subs on this task)
          if (node.subcontractors > 0) {
            const subsRow = new Array(24).fill("");
            subsRow[0] = "Budget";
            subsRow[1] = node.code || "";
            subsRow[2] = node.name || "";
            subsRow[15] = "Subconsultant";
            subsRow[17] = ""; // Quantity blank for expenses
            subsRow[19] = (node.subcontractorsSell || 0).toFixed(2); // Revenue
            subsRow[21] = (node.subcontractors || 0).toFixed(2); // Raw Cost
            subsRow[23] = (node.subcontractors || 0).toFixed(2); // Burdened Cost (same as raw for expenses)
            rows.push(subsRow);
          }
          
          // Budget row for ODC (if there's ODC on this task)
          if (node.odc > 0) {
            const odcRow = new Array(24).fill("");
            odcRow[0] = "Budget";
            odcRow[1] = node.code || "";
            odcRow[2] = node.name || "";
            odcRow[15] = "ODC";
            odcRow[17] = ""; // Quantity blank for expenses
            odcRow[19] = (node.odcSell || 0).toFixed(2); // Revenue
            odcRow[21] = (node.odc || 0).toFixed(2); // Raw Cost
            odcRow[23] = (node.odc || 0).toFixed(2); // Burdened Cost (same as raw for expenses)
            rows.push(odcRow);
          }
        }
      }
      
      // Recursively process children
      if (hasChildren) {
        generateBudgetRows(node.children, rows);
      }
    });
  }

  function exportToFile() {
    const rows = generateCSV();
    
    // Convert to CSV string
    const csvContent = rows.map(row => {
      return row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = String(cell || "");
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(",");
    }).join("\n");
    
    // Create download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    link.setAttribute("href", url);
    link.setAttribute("download", `oracle_import_${timestamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    exportToFile
  };
})();
