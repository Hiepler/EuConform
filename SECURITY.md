# Security Policy

## 🔒 Our Commitment

EuConform is designed with security and privacy as core principles. As an EU AI Act compliance tool, we take security seriously and are committed to ensuring the safety of our users and their data.

## 🛡️ Security by Design

- **100% Client-Side Processing**: All data processing happens in your browser. No data is ever sent to external servers.
- **No Tracking**: Zero analytics, no cookies, no external fonts or resources.
- **GDPR Compliant**: Built from the ground up to comply with EU data protection regulations.
- **Open Source**: Full transparency – all code is publicly auditable.

## 📋 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities. If you discover a security issue, please follow these steps:

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities.
2. Send an email to: **security@hiepler.eu** (or create a private security advisory on GitHub)
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours.
- **Assessment**: We will assess the vulnerability within 7 days.
- **Resolution**: Critical vulnerabilities will be addressed within 30 days.
- **Credit**: We will credit you in our release notes (unless you prefer anonymity).

### Scope

The following are in scope for security reports:

- **Web Application** (`apps/web/`)
- **Core Library** (`packages/core/`)
- **UI Components** (`packages/ui/`)
- **Dependencies** with known vulnerabilities

### Out of Scope

- Issues in third-party dependencies that are already publicly known
- Social engineering attacks
- Physical attacks
- Denial of service attacks

## 🔐 Security Best Practices for Users

When using EuConform:

1. **Keep your browser updated** to benefit from the latest security patches.
2. **Verify downloads** if running locally – only clone from the official repository.
3. **Review Ollama security** if using local AI models via Ollama.

## 📜 Security Audit History

| Date       | Auditor      | Scope           | Result |
|------------|--------------|-----------------|--------|
| 2026-01    | Internal     | Full codebase   | Pass   |

## 🤝 Acknowledgments

We thank the security research community for helping keep EuConform secure. Contributors who have responsibly disclosed vulnerabilities will be listed here (with permission).

---

*This security policy is reviewed and updated regularly.*

