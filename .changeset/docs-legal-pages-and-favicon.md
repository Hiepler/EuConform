---
"@euconform/docs": patch
---

Localise English legal pages, redirect "Bias Check" nav link to the dedicated page, and replace the favicon with a crisp SVG/Apple-touch-icon set.

- `legal-notice` and `privacy` (EN) now mirror the structure and content of the German versions based on the e-recht24 template (no content/legal changes beyond translation parity).
- Desktop and mobile navigation "Bias Check" links navigate to `/bias-check` instead of the landing-page anchor.
- Removed the mislabeled PNG `favicon.ico` and added `app/icon.svg` (brand navy + white "EC" monogram) plus `app/apple-icon.tsx` for iOS home-screen usage.
