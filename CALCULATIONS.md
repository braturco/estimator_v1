# Estimate Tool - Calculations

## Overview

The estimate tool now includes automatic cost calculations based on labor hours and resource rates. Calculations flow from the bottom up: leaf nodes (tasks/work items) calculate based on activity hours, and parent nodes roll up costs from their children.

## How It Works

### 1. Labor Hours Entry
- Enable **Labor Mode** to add resources and activities
- Add resources from the resource library (generic or named resources)
- Create activities for each task
- Enter regular (Reg) and overtime (OT) hours for each resource in each activity

### 2. Rate Lookup
When you enter hours, the system:
1. Identifies the resource by its ID
2. Looks up the resource's job level (e.g., "P5", "L3", "T2")
3. Fetches the appropriate rate table based on location (NB, ON, BC, QC, AB)
4. Retrieves cost and sell rates for regular and overtime hours

### 3. Calculations

#### For Leaf Nodes (Tasks/Work Items):

**Direct Labor (Cost):**
```
Direct Labor = Σ (RegHours × CostRateReg + OTHours × CostRateOT)
```

**Revenue:**
```
Revenue = Σ (RegHours × SellRateReg + OTHours × SellRateOT)
```

**Burdened Labor:**
```
Burdened Labor = Direct Labor × Burden Multiplier (default 1.3 = 30% burden)
```

**Net Revenue:**
```
Net Revenue = Revenue (no markup at this stage)
```

**Gross Revenue:**
```
Gross Revenue = Net Revenue × GM Multiplier (default 1.15 = 15% markup)
```

**Net Margin (NM%):**
```
NM% = (Net Revenue - Burdened Labor - Expenses) / Net Revenue
```

**Gross Margin (GM%):**
```
GM% = (Gross Revenue - Burdened Labor - Expenses) / Gross Revenue
```

**Direct Labor Margin (DLM):**
```
DLM = Revenue - Burdened Labor (profit on labor only)
```

#### For Parent Nodes (Phases):

Parent nodes simply roll up (sum) all values from their children:
- Direct Labor = sum of children's Direct Labor
- Expenses = sum of children's Expenses
- Burdened = sum of children's Burdened
- Net Revenue = sum of children's Net Revenue
- Gross Revenue = sum of children's Gross Revenue
- Margins are recalculated based on rolled-up totals

### 4. Automatic Updates

Calculations trigger automatically when:
- You finish editing an hour value (on blur/focusout)
- You manually click the **🧮 Recalculate** button
- The app loads (initial calculation)

There's a 500ms delay on input changes to avoid excessive recalculations while typing.

## Configuration

### Burden Multiplier
Default: 1.3 (30% burden on direct labor)

This accounts for overhead costs like benefits, facilities, insurance, etc.

To customize per node, set `node.burdenMultiplier` in the data.

### Gross Margin Multiplier
Default: 1.15 (15% markup)

This is the markup applied to net revenue to get gross revenue.

To customize per node, set `node.gmMultiplier` in the data.

### Rate Tables
Rates are managed through the **🧮 Rate Schedule Mgmt** button:
- Multiple rate tables for different locations
- Each table has rates by job level
- Includes cost (internal) and sell (client) rates for regular and OT

## Testing Your Calculations

1. **Enter Labor Mode** - Click "Labor Mode" button
2. **Add a Resource** - Click "+ Resource" and select from library
3. **Select a Task** - Click on a task row to select it
4. **Add an Activity** - Click "+ Activity" to create an activity row
5. **Enter Hours** - Type hours in the Reg and OT columns
6. **View Results** - Financial columns update automatically

Example:
- Resource: "Level 5 Professional" (Cost: $60/hr Reg, $90/hr OT | Sell: $120/hr Reg, $180/hr OT)
- Activity: "Design" with 40 Reg hours, 5 OT hours

Results:
- Direct Labor = (40 × $60) + (5 × $90) = $2,850
- Revenue = (40 × $120) + (5 × $180) = $5,700
- Burdened = $2,850 × 1.3 = $3,705
- Net Revenue = $5,700
- Gross Revenue = $5,700 × 1.15 = $6,555
- NM% = ($5,700 - $3,705) / $5,700 = 35%
- GM% = ($6,555 - $3,705) / $6,555 = 43.5%

## Troubleshooting

**Calculations not updating?**
- Check browser console (F12) for errors
- Ensure `calculations.js` is loaded
- Try clicking the **🧮 Recalculate** button

**Wrong rates?**
- Verify the resource has a correct `resourceId` 
- Check that rate tables are loaded
- Inspect resource data in Resource Manager

**Zero values showing?**
- Ensure hours are entered for activities
- Check that resources are properly assigned to activities
- Verify rate lookup is successful (check console)

## Files

- `js/calculations.js` - Core calculation engine
- `js/rates.js` - Rate lookup from rate tables
- `js/wbs.js` - WBS rendering and labor input handling
- `js/resource-manager.js` - Resource and rate table management
- `data/rate-tables.json` - Rate table definitions
- `data/resources.json` - Generic and named resources

## Future Enhancements

- [ ] Manual expense entry per task
- [ ] Configurable burden and margin multipliers per node
- [ ] Different margin tiers (standard, premium, etc.)
- [ ] Tax calculations
- [ ] Currency conversion
- [ ] Historical rate tracking
- [ ] What-if scenario modeling
