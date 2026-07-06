// HUD copy for the preloader — no hardcoded strings in components.
// Status phrases map to progress bands (0–1 inclusive).
export const PRELOADER_NAME = 'SAIRITHIK KOMURAVELLY'

// Each entry fires when progress crosses the `at` threshold.
const STATUS_PHASES = [
  { at: 0.00, label: 'INITIALIZING' },
  { at: 0.20, label: 'COMPILING SHADERS' },
  { at: 0.45, label: 'LOADING ASSETS' },
  { at: 0.85, label: 'CALIBRATING' },
  { at: 1.00, label: 'READY' },
]

// Returns the status label for a given 0–1 progress value.
export const getStatusLabel = (progress) => {
  let label = STATUS_PHASES[0].label
  for (const phase of STATUS_PHASES) {
    if (progress >= phase.at) label = phase.label
  }
  return label
}
