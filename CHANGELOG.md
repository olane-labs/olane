# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## <small>0.7.12-alpha.21 (2025-10-29)</small>

- minor fix + logging ([8cff35c](https://github.com/olane-labs/olane/commit/8cff35c))

## <small>0.7.12-alpha.20 (2025-10-29)</small>

- fix ([47a4fde](https://github.com/olane-labs/olane/commit/47a4fde))

## <small>0.7.12-alpha.19 (2025-10-28)</small>

- fixes for OLANE-266 ([e249684](https://github.com/olane-labs/olane/commit/e249684))

## <small>0.7.12-alpha.18 (2025-10-28)</small>

- minor bug fixes for reconnection + heartbeat managers ([20ae0c9](https://github.com/olane-labs/olane/commit/20ae0c9))

## <small>0.7.12-alpha.17 (2025-10-28)</small>

- reconfigured the node init methods to better support downstream use cases ([c930f4d](https://github.com/olane-labs/olane/commit/c930f4d))

## <small>0.7.12-alpha.16 (2025-10-28)</small>

- remove logging ([0490a55](https://github.com/olane-labs/olane/commit/0490a55))

## <small>0.7.12-alpha.15 (2025-10-28)</small>

- fixes ([39d7089](https://github.com/olane-labs/olane/commit/39d7089))

## <small>0.7.12-alpha.14 (2025-10-28)</small>

- minor experimentation ([9cace3a](https://github.com/olane-labs/olane/commit/9cace3a))

## <small>0.7.12-alpha.13 (2025-10-28)</small>

- fix for heartbeat ping ([76d3f7b](https://github.com/olane-labs/olane/commit/76d3f7b))

## <small>0.7.12-alpha.12 (2025-10-24)</small>

- added circuit breaker logic ([e06729a](https://github.com/olane-labs/olane/commit/e06729a))

## <small>0.7.12-alpha.11 (2025-10-24)</small>

- increase default timeout to 2 min ([463c311](https://github.com/olane-labs/olane/commit/463c311))

## <small>0.7.12-alpha.10 (2025-10-24)</small>

- minor change ([21427ac](https://github.com/olane-labs/olane/commit/21427ac))
- reactive to network notifications via libp2p + custom events ([6f72a57](https://github.com/olane-labs/olane/commit/6f72a57))

## <small>0.7.12-alpha.9 (2025-10-23)</small>

**Note:** Version bump only for package @olane/o-root

## <small>0.7.12-alpha.8 (2025-10-23)</small>

**Note:** Version bump only for package @olane/o-root

## <small>0.7.12-alpha.7 (2025-10-23)</small>

- deps ([53164c4](https://github.com/olane-labs/olane/commit/53164c4))

## <small>0.7.12-alpha.6 (2025-10-23)</small>

- added basic notification logic ([ed8be06](https://github.com/olane-labs/olane/commit/ed8be06))
- experimental feature to try for self healing notifications ([d7e2807](https://github.com/olane-labs/olane/commit/d7e2807))
- self-healing improvements ([2841dfd](https://github.com/olane-labs/olane/commit/2841dfd))
- chore: sync o-core, o-protocol, and o-server to v0.7.12-alpha.5 ([5c45d90](https://github.com/olane-labs/olane/commit/5c45d90))

## <small>0.7.12-alpha.5 (2025-10-23)</small>

- testing ([344682a](https://github.com/olane-labs/olane/commit/344682a))

## <small>0.7.12-alpha.4 (2025-10-23)</small>

- fix for routing ([90417ca](https://github.com/olane-labs/olane/commit/90417ca))
- minor change ([f98c4d9](https://github.com/olane-labs/olane/commit/f98c4d9))
- minor change ([5c05e5f](https://github.com/olane-labs/olane/commit/5c05e5f))

## <small>0.7.12-alpha.3 (2025-10-22)</small>

- manual correction of dependencies ([3ed0d9a](https://github.com/olane-labs/olane/commit/3ed0d9a))
- modified repo to remove unused / redundant func ([54b1eab](https://github.com/olane-labs/olane/commit/54b1eab))

## <small>0.7.12-alpha.2 (2025-10-22)</small>

- lerna experiment ([b1e3171](https://github.com/olane-labs/olane/commit/b1e3171))
- Release v0.7.12-alpha.1 ([c5559b0](https://github.com/olane-labs/olane/commit/c5559b0))

# Changelog

All notable changes to Olane OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- CONTRIBUTING.md: Comprehensive contribution guidelines
- CODE_OF_CONDUCT.md: Community standards and behavior guidelines
- SECURITY.md: Security vulnerability reporting policy
- GitHub issue templates (bug report, feature request, documentation, question)
- Pull request template

---

## [0.7.3] - 2025-10-06

### Added

<!-- List new features and additions -->

### Changed

<!-- List changes in existing functionality -->

### Deprecated

<!-- List soon-to-be removed features -->

### Removed

<!-- List removed features -->

### Fixed

<!-- List bug fixes -->

### Security

<!-- List security fixes -->

---

## [0.7.2] - YYYY-MM-DD

<!-- Previous version entries -->

---

## [0.7.1] - YYYY-MM-DD

<!-- Previous version entries -->

---

## [0.7.0] - YYYY-MM-DD

### Added

- Initial public release of Olane OS
- Core packages: o-core, o-node, o-lane, o-leader, o-os
- Tool system with discoverable capabilities
- Intent-driven execution via o-lane
- Hierarchical addressing with o:// protocol
- P2P networking via libp2p
- Leader-based discovery and coordination
- Example implementations
- Documentation at olane.com/docs

---

## Categories

Use these categories for organizing changes:

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

## Versioning Guide

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes and small improvements

---

[Unreleased]: https://github.com/olane-labs/olane/compare/v0.7.3...HEAD
[0.7.3]: https://github.com/olane-labs/olane/releases/tag/v0.7.3
[0.7.2]: https://github.com/olane-labs/olane/releases/tag/v0.7.2
[0.7.1]: https://github.com/olane-labs/olane/releases/tag/v0.7.1
[0.7.0]: https://github.com/olane-labs/olane/releases/tag/v0.7.0
