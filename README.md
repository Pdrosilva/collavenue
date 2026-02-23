# Collavenue Project

This project contains the modularized version of `collavenue.jsx`. It's built with React, Vite, and Javascript. 
The application includes Explore and Detail views for an image collaboration platform.

## Getting Started

To install dependencies and start the local development server:

```sh
npm install
npm run dev
```

## Architecture Structure

- `src/components/`: Reusable, atomic UI components (e.g., `NavBar`, `CommentItem`, `Pin`, `FloatingActions`).
- `src/constants/`: Mock configuration and theme configurations (`theme.js`, `mockData.js`).
- `src/utils/`: Lightweight utility modules, math functions or inline SVG generators. Includes React custom hooks like `useWindowWidth`.
- `src/views/`: Layout level page components such as `ExploreView` and `DetailView`.
