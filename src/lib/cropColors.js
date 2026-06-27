export const CROPS = [
  'Soybeans',
  'Corn',
  'Rice',
  'Cotton',
  'Wheat',
  'Grain Sorghum',
  'Other',
]

export const CROP_COLORS = {
  'Soybeans':      '#22c55e',  // green
  'Corn':          '#eab308',  // yellow
  'Rice':          '#06b6d4',  // cyan — flooded fields
  'Cotton':        '#a78bfa',  // purple
  'Wheat':         '#f59e0b',  // amber
  'Grain Sorghum': '#f97316',  // orange
  'Other':         '#94a3b8',  // slate
}

export function cropColor(crop) {
  return CROP_COLORS[crop] ?? '#94a3b8'
}
