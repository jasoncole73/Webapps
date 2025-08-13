# Flip Billboard Package (Local Only)
This package includes your working project plus a billboard page that uses **only local assets** (no CDN).

## Structure
```
dist/
flipbillboard/
  └─ index.html

```

The billboard page references Flip assets at:
- CSS: `../dist/flip.min.css`
- JS : `../dist/flip.min.js`


## Usage
- Upload/extract these folders to your static host (GitHub Pages, Netlify, etc.).
- Visit `flipbillboard/index.html` for the billboard.

## Customize
- Edit the `rotation` array inside `flipbillboard/index.html`.
- Adjust font sizes and `.tick-char` for different densities.
