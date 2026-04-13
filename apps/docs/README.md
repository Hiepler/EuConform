# EuConform Documentation App

This is the documentation website for EuConform, built with Next.js.

## Status

🚧 **Work in Progress** - This documentation app is currently under development.

The main documentation is available in the [root README](../../README.md).

## Development

```bash
# From the repository root
pnpm dev

# Or specifically for docs
cd apps/docs
pnpm dev
```

## Planned Content

- [ ] Getting Started Guide
- [ ] API Reference for `@repo/core`
- [ ] EU AI Act Overview
- [ ] Bias Testing Methodology
- [ ] Integration Guides (Ollama, Custom Models)
- [ ] Accessibility Guidelines
- [ ] Contributing Guide

## Tech Stack

- Next.js 16
- Tailwind CSS v4
- TypeScript

## Internationalisation

The site is bilingual (English default, German at `/de`). Each locale has its own
root layout to set `<html lang>` correctly:

- `app/(en)/layout.tsx` + `app/(en)/page.tsx` → served at `/`
- `app/de/layout.tsx` + `app/de/page.tsx` → served at `/de`
- `app/(en)/spec/page.tsx` → English-only spec at `/spec`

Copy lives in typed dictionaries at `app/messages/en.ts` and `app/messages/de.ts`.
`de.ts` is annotated as `Messages` (derived from `typeof en`), so the compiler
enforces structural parity — missing or extra keys fail the build.

Shared components live in `app/_components/` and consume `Messages` subtrees.
The `LocaleSwitcher` maps between locales by rewriting the URL prefix.

## SEO

Configured via three Next.js route specials at `app/` root:

- `sitemap.ts` — lists `/`, `/de`, `/spec` with `hreflang` alternates
- `robots.ts` — allows all crawlers and points to `sitemap.xml`
- `opengraph-image.tsx` — dynamic 1200×630 PNG served at `/opengraph-image`

Canonical URLs, `hreflang`, and OG/Twitter metadata are generated per locale in
the respective root layouts. `metadataBase` is set to `https://euconform.eu`.

## Deploying to euconform.eu

The docs app is a standard Next.js 16 server build. Recommended path:

1. **Register** `euconform.eu` (e.g. via EURid-accredited registrar).
2. **Create a Vercel project** from the monorepo with root directory
   `apps/docs` and build command `pnpm --filter @euconform/docs build`.
3. **Add the custom domain** `euconform.eu` (and optionally `www.euconform.eu`)
   in the Vercel project.
4. **Configure DNS** at the registrar:
   - Apex (`euconform.eu`): `A 76.76.21.21` (Vercel IP; verify current value
     in the Vercel domains UI) or, if the registrar supports `ALIAS`/`ANAME`,
     point to `cname.vercel-dns.com`.
   - `www.euconform.eu`: `CNAME cname.vercel-dns.com`.
5. **Set a redirect** `www → apex` in Vercel so there is exactly one canonical
   hostname (`metadataBase` and `sitemap.ts` already assume the apex).
6. **Verify after deploy:**
   - `https://euconform.eu/robots.txt`
   - `https://euconform.eu/sitemap.xml` — confirm `hreflang` entries
   - `https://euconform.eu/opengraph-image` — 200 + PNG
   - Google Search Console + a `hreflang` validator for both locales
   - Facebook / X card debuggers against the OG image

Changes to `metadataBase` or default locale live in `app/lib/siteConfig.ts`.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
