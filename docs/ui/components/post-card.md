# Post Card

## Purpose
Post cards are the core content unit in feed-based layouts.

The design must remain lightweight, readable, and content-first.

Avoid heavy card UI or excessive visual separation.

---

## Layout

- Flat feed layout
- Transparent background
- Bottom divider only
- No elevated card shadows
- No full card borders

---

## Structure

Post card structure:

1. Avatar
2. Header
3. Content
4. Media (optional)
5. Actions
6. Metadata

---

## Spacing

- Card padding: 16px
- Avatar → content gap: 12px
- Vertical content gap: 6px
- Action row margin-top: 12px
- Media margin-top: 12px

---

## Typography

### Username
- text-body
- font-weight: 600
- color: text-primary

### Handle / Timestamp
- text-body-sm
- color: text-secondary

### Content
- text-body
- line-height: 1.6
- max width: 65ch

---

## Media

### Rules
- object-fit: cover
- responsive width
- lazy loaded
- use blur placeholder

### Allowed Ratios
- 1:1
- 4:5
- 16:9

### Radius
- radius-xl

---

## Thread Line

For threaded replies:

- width: 1.5px
- color: border-default
- vertically centered from avatar
- subtle appearance only

---

## Actions

### Icons
Use Lucide icons only.

### Sizes
- 16px inline
- 20px action buttons

### Interaction
- hover opacity only
- avoid large motion
- touch targets minimum 44x44 on mobile

---

## Loading State

Use skeleton loaders:

- avatar skeleton
- text line skeletons
- media skeleton block

Avoid spinner-only loading for feed initialization.

---

## Accessibility

- Interactive buttons require aria-label
- Focus ring required
- Keyboard accessible
- Respect reduced motion

---

## Responsive Rules

### Mobile
- Full width
- Reduced spacing density
- Maintain touch targets

### Desktop
- Max feed width: 600px
- Center aligned layout

---

## Do

- Prioritize readability
- Use subtle separators
- Keep visual hierarchy minimal
- Maintain consistent spacing

---

## Don't

- Don't use elevated card shadows
- Don't hardcode colors
- Don't overuse borders
- Don't mix typography scales
- Don't animate aggressively