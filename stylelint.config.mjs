// Stylelint configuration for design-token discipline.
//
// Primary rule: color-no-hex — every color in src/styles/**/*.css must be a CSS custom property
// (var(--…)), never a raw hex value. This enforces the single source of truth in tokens.css.
//
// Exceptions documented in docs/design-system.md:
// - WebGL/canvas JS files that mirror token hex values as JS constants are exempt
//   (they cannot read CSS vars at runtime). Those files must carry a comment noting
//   which token they mirror, e.g. // mirrors --accent.
// - This config only lints .css files; JS/JSX mirrors are handled by the ESLint hook.

/** @type {import('stylelint').Config} */
export default {
  rules: {
    // Require all colors in CSS to be CSS custom properties.
    // Rationale: tokens.css is the single source of truth. Raw hex in CSS partials creates
    // a second source of truth that drifts and can't be refactored atomically.
    'color-no-hex': true,
  },
  overrides: [
    {
      // tokens.css is the ONE legitimate home for raw hex values — it defines the custom
      // properties that all other partials consume via var(--…). The rule does not apply here.
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
      },
    },
  ],
};
