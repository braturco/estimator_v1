# Cost Rate Integration with Rate Schedules

## Overview

The estimator app now automatically populates cost rates in rate schedules based on imported cost rate data using a Province + Job Level lookup system.

---

## How It Works

### 1. Cost Rate Lookup Key

When creating a rate schedule and selecting a province, the system creates a lookup key by combining:

**Province Mapping Code** + **Job Level Code**

Examples:
- Province: "ON - Ontario" → Mapping: "ON"
- Job Level: "P6" → Code: "P6"
- **Lookup Key: "ONP6"**

- Province: "QC - Quebec" → Mapping: "QC"
- Job Level: "E1" → Code: "E1"
- **Lookup Key: "QCE1"**

### 2. Province Mapping

The system maps province display codes to cost table codes:

| Display | Mapping | Province |
|---------|---------|----------|
| NB, NL, NS, PEI | AT | Atlantic provinces |
| QC | QC | Quebec |
| ON | ON | Ontario |
| MB | MB | Manitoba |
| SK | SK | Saskatchewan |
| AB | AB | Alberta |
| BC | BC | British Columbia |
| YK, NWT, NU | YT | Territories |

---

## Setup Workflow

### Step 1: Import Cost Rates

1. Open sidebar (☰ button)
2. Click **"💰 Cost Rate Table Mgmt"**
3. Click **"📊 Import Rate Tables"**
4. Upload your **cost_rates.csv** file (or enter SharePoint URL)

**Required CSV Format:**
```csv
CostRate_ID,Cost_Rate
ATE1,120
ONP6,95
QCE1,126
```

Where:
- `CostRate_ID` = Province Mapping Code + Job Level Code
- `Cost_Rate` = Cost per hour (regular time)

### Step 2: Import Job Levels

1. Open sidebar (☰ button)
2. Click **"📋 View Imported Job Levels"**
3. Upload your **job-levels-basic.csv** file

**Required CSV Format:**
```csv
Job Lvl Code,Job Lvl Name
E1,Vice President
L3,Director
P6,Level 6 Professional
```

### Step 3: Create Rate Schedule

1. Open sidebar (☰ button)
2. Click **"🧮 Rate Schedule Mgmt"**
3. Click **"+ New Rate Table"**
4. Enter table name and description
5. **Select a province from dropdown** (e.g., "ON - Ontario")
6. ✨ **Cost rates auto-populate!** ✨
   - Cost Reg fills with the looked-up value
   - Cost OT auto-calculates (Cost Reg × 1.5)
   - Cells flash green to show the update

---

## Auto-Population Details

### When Province is Selected:

1. System gets the province mapping code (e.g., "ON" → "ON")
2. For each job level in the table:
   - Creates lookup key: Province + Job Level (e.g., "ON" + "P6" = "ONP6")
   - Searches imported cost rates for matching `CostRate_ID`
   - Populates **Cost Reg** input field
   - Calculates **Cost OT** as Cost Reg × 1.5
   - Briefly highlights fields in green

### Example:

**Job Level:** P6 - Level 6 Professional
**Province:** ON - Ontario
**Lookup Key:** ONP6
**Imported Cost Rate:** $95.00

**Result:**
- Cost Reg: $95.00 (from imported data)
- Cost OT: $142.50 (auto-calculated as $95.00 × 1.5)

---

## Features

✅ **Automatic Population** - Select province, cost rates fill automatically
✅ **Visual Feedback** - Green flash shows which fields were updated
✅ **Smart Mapping** - Handles Atlantic provinces mapping (NB/NS/NL/PEI → AT)
✅ **OT Calculation** - Cost OT automatically calculated at 1.5× regular rate
✅ **Flexible Import** - Supports both file upload and SharePoint URL
✅ **Case-Insensitive** - Lookup keys work regardless of case (ONP6 = onp6 = OnP6)

---

## File Locations

- **Cost Rates CSV:** `data/cost_rates.csv`
- **Job Levels CSV:** `data/job-levels-basic.csv`
- **Province Mapping Logic:** `js/province-mapping.js`
- **Rate Schedule Manager:** `js/rate-schedule-manager.js`
- **Cost Rates Import:** `js/rate-tables-manager.js`

---

## Troubleshooting

**Cost rates not populating?**
1. Check browser console (F12) for errors
2. Verify cost rates CSV was imported successfully
3. Confirm the CostRate_ID format matches Province+JobLevel (e.g., "ONP6")
4. Check if province mapping is correct (e.g., "NB" maps to "AT")

**Wrong rates showing?**
1. Verify the CostRate_ID in your CSV matches the expected format
2. Check the province mapping in `province-mapping.js`
3. Ensure Job Level codes match exactly (case-insensitive)

**No green flash when selecting province?**
1. Ensure cost rates CSV is imported
2. Check browser console for lookup logs
3. Verify job levels are loaded

---

## Data Storage

- **Imported Cost Rates:** `localStorage` key: `estimator_imported_rate_tables_v1`
- **Imported Job Levels:** `localStorage` key: `estimator_imported_job_levels_csv`
- **Custom Rate Tables:** `localStorage` key: `estimator_custom_rate_tables_v1`

---

## Console Logging

When a province is selected, the console shows detailed lookup information:

```
🔍 Lookup: display="ON" → mapped="ON" + jobLevel="P6"
🔑 SEARCHING FOR LOOKUP KEY: "ONP6"
📦 Raw localStorage data: 12345 chars
📋 Found 150 rate table entries
✅ Combined key match found for "ONP6": 95
```

This helps debug any lookup issues.

---

## Future Enhancements

Potential improvements:
1. **Rate validation** - Warn if cost rate seems unrealistic
2. **Bulk import** - Import multiple CSV files at once
3. **Rate history** - Track changes to cost rates over time
4. **Export rates** - Export current rate schedule to CSV
5. **Visual rate map** - See all rates in a matrix view
