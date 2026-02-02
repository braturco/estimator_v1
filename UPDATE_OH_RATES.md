# Update Summary - OH Rates, Rate Overrides, and Bug Fixes

## Issues Fixed

### 1. ✅ OH/Burden Rates Configuration
**Problem:** Direct labor costs need configurable overhead/burden rates, with different rates for regular and overtime.

**Solution:**
- Added **OH/Burden Rate Settings** in the Setup menu (📊 OH/Burden Rates button)
- Separate OH rates for regular time and overtime (default: 110% for both)
- OH is now applied as: `Burdened = Direct Labor × (1 + OH Rate)`
- Example: $1000 DL × (1 + 1.10) = $2100 Burdened
- Settings persist across sessions
- Calculations automatically update when OH rates change

**How to Use:**
1. Open sidebar (☰ button)
2. Click **📊 OH/Burden Rates** under Setup
3. Enter OH percentages (e.g., 110 for 110%)
4. Click Save
5. All calculations recalculate automatically

### 2. ✅ Manual Rate Overrides
**Problem:** Need ability to override default rates from rate tables when they don't apply.

**Solution:**
- **Right-click** on any resource header to open Rate Override modal
- Override any combination of:
  - Cost Regular
  - Cost Overtime
  - Sell Regular
  - Sell Overtime
- Leave fields blank to use default rates from rate table
- Overrides are shown with an asterisk (*) in the rate display
- Resource headers show * when they have overrides
- Overrides persist per resource in labor mode

**How to Use:**
1. Enter Labor Mode
2. Add a resource
3. **Right-click** on the resource name header
4. Enter override rates (or clear to reset to defaults)
5. Click Save
6. Calculations automatically use overridden rates

**Visual Indicators:**
- Resource header shows `*` when overrides are active
- Rate rows show `*` and highlight in accent color
- Hover tooltip indicates: "Has rate overrides. Right-click to edit."

### 3. ✅ Double-Click on Resource Names
**Problem:** Double-clicking on resource name wasn't opening the resource search/change dialog.

**Solution:**
- Fixed event handler to prevent interference from the expand toggle
- Double-click now properly opens the resource picker
- Shows searchable list of all generic and named resources
- Can change resource while preserving existing hour data

**How to Use:**
1. **Double-click** on any resource name header
2. Search/filter resources by name
3. Click to select a new resource
4. Hour data is preserved, calculations update with new rates

## Technical Changes

### Modified Files

**datastore.js (v6)**
- Added `window.ohRates` object with `regular` and `overtime` properties
- Added ohRates to persistence (save/load state)

**calculations.js (v2)**
- Separated direct labor into regular and OT components
- Apply OH separately to regular and OT: `burdenedReg = directLaborReg × (1 + ohReg)`
- Check for manual rate overrides before fetching from rate tables
- Use override rates when available: `resource.overrideCostReg`, `resource.overrideSellReg`, etc.

**wbs.js (v13)**
- Added right-click context menu on resource headers for rate overrides
- Fixed double-click handler to avoid conflict with expand toggle
- Added `openRateOverrideModal()` function
- Enhanced rate display to show override indicators (*)
- Visual indicators in resource headers when overrides are active

**app.js (v4)**
- Added **📊 OH/Burden Rates** button to Setup menu
- Added `openOHRatesSettings()` function
- Modal with inputs for regular and OT OH percentages

**index.html**
- Added OH/Burden Rates button to sidebar
- Updated script versions for cache busting

## Data Structure

### Labor Resource Object
```javascript
{
  id: "uuid",
  name: "Resource Name",
  resourceId: "p5-professional",  // Actual resource ID for rate lookup
  chargeoutRate: 120,              // Default sell rate
  costRate: 60,                    // Default cost rate
  
  // Optional overrides
  overrideCostReg: 65,             // Override regular cost
  overrideCostOT: 97.5,            // Override OT cost
  overrideSellReg: 130,            // Override regular sell
  overrideSellOT: 195              // Override OT sell
}
```

### OH Rates Object
```javascript
window.ohRates = {
  regular: 1.10,    // 110% OH for regular time
  overtime: 1.10    // 110% OH for overtime
}
```

## Calculation Flow

1. **Hours Entry** → User enters Reg/OT hours for activities
2. **Rate Lookup** → Check for overrides, else fetch from rate table
3. **Direct Labor** → Hours × Cost Rate (separate Reg and OT)
4. **OH/Burden** → Apply OH rates: `DL × (1 + OH%)`
5. **Revenue** → Hours × Sell Rate
6. **Margins** → Calculate NM%, GM%, DLM
7. **Rollup** → Parent nodes sum child values

## Testing Checklist

- [x] OH rates default to 110%
- [x] OH settings modal opens and saves
- [x] Calculations use OH rates correctly
- [x] Rate overrides can be set per resource
- [x] Overrides show visual indicators (*)
- [x] Double-click opens resource picker
- [x] Right-click opens rate override modal
- [x] All changes persist across page reloads
- [x] Calculations recalculate automatically

## User Guide

### Setting OH Rates
1. Click ☰ to open sidebar
2. Click **📊 OH/Burden Rates**
3. Enter percentages (110 = 110%)
4. Click Save

### Overriding Rates
1. In Labor Mode, right-click a resource name
2. Enter override values
3. Leave blank to use defaults
4. Click Save

### Changing Resources
1. Double-click a resource name
2. Search for a new resource
3. Click to select
4. Hours preserved, rates updated

## Notes

- OH is now calculated as `DL × (1 + OH%)` not `DL × OH%`
  - Example: 110% OH → `$1000 × (1 + 1.10) = $2100` not `$1000 × 1.10 = $1100`
- Rate overrides are stored per labor resource instance
- Changing a resource via double-click preserves hours but clears overrides
- All settings persist in localStorage
