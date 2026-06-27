// Colors matched to Delta Plastics Pipe Planner color coding
export const HOLE_COLORS = {
  '1/4"':  '#f59e0b',  // amber/gold
  '5/16"': '#3b82f6',  // blue
  '3/8"':  '#92400e',  // dark brown/red
  '7/16"': '#6b7280',  // grey
  '1/2"':  '#9ca3af',  // light grey
  '9/16"': '#1e293b',  // near black
  '5/8"':  '#ec4899',  // pink/magenta
  '3/4"':  '#dc2626',  // red
}

export const HOLE_SIZES = Object.keys(HOLE_COLORS)

export function holeColor(size) {
  return HOLE_COLORS[size] ?? '#94a3b8'
}
