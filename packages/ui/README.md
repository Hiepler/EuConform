# @euconform/ui

UI components for EU AI Act compliance dashboards and assessment wizards.

[![npm version](https://img.shields.io/npm/v/@euconform/ui.svg)](https://www.npmjs.com/package/@euconform/ui)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hiepler/EuConform/blob/main/LICENSE)

## Installation

```bash
npm install @euconform/ui
# or
pnpm add @euconform/ui
```

## Features

- 🎨 **Tailwind CSS** – Built with Tailwind for easy customization
- 🌙 **Dark Mode** – Full dark mode support out of the box
- ♿ **Accessible** – WCAG 2.2 AA compliant components
- 📱 **Responsive** – Mobile-first design

## Usage

### Import Styles

```typescript
// In your app's entry point
import "@euconform/ui/styles.css";
```

### Use Components

```typescript
import { Card } from "@euconform/ui/card";
import { Button } from "@euconform/ui/button";

function MyComponent() {
  return (
    <Card title="Risk Assessment">
      <p>Your AI system has been classified.</p>
      <Button onClick={handleNext}>Continue</Button>
    </Card>
  );
}
```

## Available Components

| Component | Description |
|-----------|-------------|
| `Card` | Container component with title and content |
| `Button` | Accessible button with variants |
| `Gradient` | Decorative gradient backgrounds |

## Styling

Components use Tailwind CSS with the `ui:` prefix for namespacing:

```css
/* Custom overrides */
.ui\:bg-primary {
  background-color: var(--your-primary-color);
}
```

## License

[MIT](https://github.com/Hiepler/EuConform/blob/main/LICENSE)

## Links

- [GitHub Repository](https://github.com/Hiepler/EuConform)
- [Full Documentation](https://github.com/Hiepler/EuConform#readme)
- [Report Issues](https://github.com/Hiepler/EuConform/issues)

