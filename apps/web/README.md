# EuConform Web Application

The main web application for EuConform - an EU AI Act compliance tool.

## Features

- 🎯 **Risk Classification** - Interactive quiz for EU AI Act risk assessment
- 📊 **Bias Detection** - CrowS-Pairs methodology with log-probability analysis
- 📄 **Report Generation** - Annex IV compliant technical documentation
- 🌐 **100% Offline** - All processing happens in your browser
- ♿ **Accessible** - WCAG 2.2 AA compliant

## Development

```bash
# From repository root
pnpm dev

# Or specifically for web app
cd apps/web
pnpm dev

# Open http://localhost:3001
```

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

## Build

```bash
pnpm build
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5.9
- Tailwind CSS v4
- Radix UI

## Project Structure

```
apps/web/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── screens/      # Full-page screen components
│   └── shared/       # Shared UI components
├── lib/              # Utilities and hooks
│   ├── hooks/        # Custom React hooks
│   ├── i18n/         # Internationalization
│   └── types/        # TypeScript types
├── public/           # Static assets
│   └── datasets/     # CrowS-Pairs data
└── tests/            # Test files
```

## Environment Variables

No environment variables are required. All processing is client-side.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
