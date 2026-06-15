# Dark Theme Specification

## Purpose

Provide a full dark mode UI that reduces eye strain in low-light environments. Uses Tailwind `dark:` variant for styling. Preference persists across sessions via localStorage. Applies to all pages including POS, admin, and settings.

## Requirements

### D1: Theme Toggle

The system MUST provide a toggle in the settings page to switch between light and dark themes. The toggle SHOULD also be accessible from the main POS header without entering settings.

#### Scenario: Toggle from settings

- GIVEN a user is on the settings page in light mode
- WHEN they click "Dark Mode" toggle
- THEN the UI switches to dark mode immediately

#### Scenario: Toggle from POS header

- GIVEN a user is on the POS page in light mode
- WHEN they click the theme icon in the header
- THEN the UI switches to dark mode

### D2: Persistence

The theme preference MUST persist in localStorage under key `theme` with values `light` or `dark`. On page load, the system MUST apply the saved preference before rendering.

#### Scenario: Persist across reload

- GIVEN a user has selected dark mode
- WHEN they reload the page
- THEN the UI renders in dark mode without flicker

#### Scenario: First visit

- GIVEN a user visits for the first time (no theme saved)
- WHEN the page loads
- THEN the system SHOULD default to light mode

### D3: Full Coverage

All pages and components MUST render correctly in dark mode. Admin pages (brands, bulk pricing, stock) MUST be covered alongside POS and settings.

#### Scenario: All pages dark

- GIVEN dark mode is active
- WHEN a user navigates through all pages (POS, products, admin, settings)
- THEN each page renders with dark backgrounds and readable contrast

#### Scenario: Admin vs POS colors

- GIVEN dark mode is active
- WHEN admin mode is toggled on and off
- THEN both admin and POS views maintain correct dark mode styling

### D4: Contrast and Accessibility

Dark mode backgrounds MUST use Tailwind `gray-900` or equivalent. Text MUST maintain WCAG AA contrast ratio (4.5:1 for normal text). Interactive elements MUST show hover/focus states against dark backgrounds.

#### Scenario: Tab focus visible

- GIVEN dark mode is active
- WHEN a user tabs through interactive elements
- THEN focus rings MUST be visible against the dark background
