# Contributing Guidelines

## File Organization Rules
1. **Components must be single-file**. Create new `.jsx` files inside `src/components/` for independent UI parts.
2. **Global styles**. Use `theme.js` for colors, radii, text tokens, instead of hardcoding values.
3. Keep `App.jsx` cleanly focused on shared application state and routing, instead of having DOM logic directly in it.
