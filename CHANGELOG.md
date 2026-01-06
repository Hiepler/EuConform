# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open-source release
- Risk classification quiz implementing EU AI Act Articles 5, 6, and Annex III
- Bias detection using CrowS-Pairs methodology with log-probability analysis
- Annex IV technical documentation report generation
- Browser-based inference using transformers.js (WebGPU)
- Ollama integration with automatic log-probability capability detection
- Dual licensing (MIT + EUPL-1.2)
- Full internationalization support (English/German)
- WCAG 2.2 AA accessibility compliance
- Dark mode support

### Security
- 100% client-side processing - no data leaves the browser
- Zero tracking, no cookies, no external fonts
- GDPR-by-design architecture

## [1.0.0] - 2026-01-06

### Added
- First stable release
- Complete EU AI Act risk classification workflow
- CrowS-Pairs bias testing with German cultural adaptation
- PDF report generation for Annex IV compliance
- Model capability detection for Ollama
- Comprehensive test suite

### Changed
- Improved bias calculation accuracy with log-probability method
- Enhanced accessibility for screen readers

### Fixed
- Various bug fixes and performance improvements

---

## Release Notes Format

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

[Unreleased]: https://github.com/benedikthiepler/aimpact/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/benedikthiepler/aimpact/releases/tag/v1.0.0

