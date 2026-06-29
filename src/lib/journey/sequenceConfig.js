// Source descriptor for the avatar image sequence.
// All engine configuration lives here — swap this object to change the source
// (path, codec, frame count) without touching rendering or UI code.
export const SEQUENCE_CONFIG = {
  basePath:     '/avatar/',
  count:        193,   // total frame count — single source of truth
  pad:          4,     // zero-padding width for filenames, e.g. 0001.webp
  ext:          '.webp',
  // Decode window: number of frames to decode on each side of the current position.
  // Frames outside the window are evicted. Increase for very-HFR sequences or
  // fast scroll environments; decrease for low-memory devices.
  decodeWindow: 24,
}
