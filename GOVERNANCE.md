# Governance

This document describes the governance model for Olane OS.

---

## Overview {#overview}

Olane OS is an open source project maintained by **Olane Inc.** with contributions from the community. This document outlines how decisions are made, who has authority, and how contributors can get involved.

---

## Project Leadership {#leadership}

### Core Team

The **Core Team** consists of maintainers employed by Olane Inc. who have commit access and decision-making authority.

**Responsibilities:**
- Review and merge pull requests
- Make architectural decisions
- Manage releases and versioning
- Enforce Code of Conduct
- Set project direction and roadmap

**Current Core Team:**
- Maintained by Olane Inc. (contact: maintainers@olane.io)

### Package Maintainers

Each package may have dedicated maintainers responsible for:
- Package-specific features and bug fixes
- Package documentation
- Reviewing package-specific PRs
- Release coordination for their package

---

## Decision-Making Process {#decision-making}

### Types of Decisions

**1. Minor Changes** (no review needed)
- Documentation fixes (typos, clarity)
- Bug fixes with tests
- Code style improvements
- Minor refactoring

**2. Standard Changes** (single maintainer approval)
- New features (non-breaking)
- Significant bug fixes
- Performance improvements
- New examples or templates

**3. Major Changes** (core team consensus)
- Breaking changes
- New packages
- Major architectural changes
- Changes to governance or contribution policies
- Security-sensitive changes

### RFC Process (Request for Comments)

For **major changes**, we use an RFC process:

1. **Create an RFC issue** with `[RFC]` prefix
2. **Describe the problem** and proposed solution
3. **Allow 7-14 days** for community feedback
4. **Core team reviews** and makes final decision
5. **Implementation** proceeds if approved

**Example RFC template:**

```markdown
## [RFC] Feature Name

### Problem
Describe the problem this solves

### Proposed Solution
Detailed explanation with code examples

### Alternatives Considered
What other approaches were considered?

### Impact
- Backward compatibility
- Performance implications
- Documentation requirements

### Timeline
Proposed implementation timeline
```

---

## Contribution Rights {#contribution-rights}

### Contributor Levels

**1. Contributors**
- Anyone who submits a PR or issue
- No special permissions required
- Recognized in release notes

**2. Regular Contributors**
- Consistent, quality contributions over time
- May be invited to join community calls
- Can be tagged for reviews on relevant PRs

**3. Package Maintainers**
- Trusted contributors with expertise in specific packages
- Write access to specific package directories
- Can approve PRs for their packages
- Nominated by core team

**4. Core Team**
- Full repository access
- Final decision-making authority
- Employees of Olane Inc.

### How to Become a Maintainer

**Path to Package Maintainer:**
1. Make consistent, high-quality contributions
2. Demonstrate expertise in a specific package
3. Help review PRs and issues
4. Express interest to core team
5. Core team nominates and votes

**Requirements:**
- 10+ merged PRs in target package
- 3+ months of active participation
- Deep understanding of package architecture
- Commitment to project values

---

## Release Process {#release-process}

### Release Cadence

- **Patch releases** (0.7.x): As needed for bug fixes
- **Minor releases** (0.x.0): Monthly (approximately)
- **Major releases** (x.0.0): As needed for breaking changes

### Release Authority

- **Patch releases**: Any core team member
- **Minor releases**: Core team consensus
- **Major releases**: Core team consensus + community RFC

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes

### Release Checklist

Before releasing:
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Security review (for major/minor releases)
- [ ] Migration guide (for breaking changes)
- [ ] Community notification prepared

---

## Communication Channels {#communication}

### Public Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community discussion
- **Discord**: Real-time community chat
- **Twitter**: Announcements and updates
- **Email**: support@olane.io

### Private Channels

- **Core Team Meetings**: Weekly (internal)
- **Security Discussions**: security@olane.io
- **Legal/Compliance**: legal@olane.io

### Community Calls

- **Frequency**: Monthly (planned)
- **Format**: Open to all contributors
- **Topics**: Roadmap updates, Q&A, demos

---

## Code of Conduct Enforcement {#coc-enforcement}

### Enforcement Team

The **Code of Conduct Enforcement Team** consists of:
- Core team members
- Community moderators (as project grows)

**Contact**: conduct@olane.io

### Process

1. **Report received** at conduct@olane.io
2. **Acknowledgment** within 48 hours
3. **Investigation** by enforcement team
4. **Decision** made according to [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
5. **Action taken** and parties notified
6. **Appeal process** available

---

## Security Governance {#security-governance}

### Security Team

- Core team members handle security issues
- External security researchers recognized for responsible disclosure

### Security Process

See [SECURITY.md](./SECURITY.md) for full details.

**Key points:**
- Security issues reported privately to security@olane.io
- 90-day disclosure timeline
- Coordinated vulnerability disclosure
- Security advisories published on GitHub

---

## Project Roadmap {#roadmap}

### Public Roadmap

Our roadmap is publicly available at:
- GitHub Projects: https://github.com/olane-labs/olane/projects
- Documentation: https://olane.com/roadmap

### Roadmap Input

Community can influence roadmap through:
- Feature requests (GitHub issues)
- RFC proposals for major features
- Community calls and discussions
- Direct feedback to core team

---

## License and Copyright {#license}

### License

Olane OS is licensed under the [ISC License](./LICENSE).

### Copyright

- Copyright holder: Olane Inc.
- Contributors retain copyright on their contributions
- By contributing, you agree to license your contributions under ISC

### Contributor License Agreement (CLA)

**Current policy**: No CLA required

We may implement a CLA in the future if needed for:
- Legal protection
- Patent grants
- Commercial partnerships

Contributors will be notified before any CLA requirement.

---

## Conflict Resolution {#conflict-resolution}

### Technical Disagreements

1. **Discussion**: Open discussion on GitHub or Discord
2. **RFC**: Create RFC for major decisions
3. **Core team vote**: If consensus not reached
4. **Final decision**: Core team has final authority

### Conduct Issues

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) enforcement process.

### Appeal Process

Decisions can be appealed to:
- Core team (via maintainers@olane.io)
- Olane Inc. leadership (for governance issues)

---

## Amendments {#amendments}

### Proposing Changes

To propose governance changes:
1. Create an RFC issue with `[GOVERNANCE]` prefix
2. Explain rationale and proposed changes
3. Allow 14+ days for community feedback
4. Core team makes final decision

### Approval Process

- **Minor changes**: Single core team member approval
- **Major changes**: Core team consensus
- **Structural changes**: Olane Inc. approval required

---

## Project Values {#values}

Olane OS is guided by these values:

### 🌐 Open and Inclusive
- Welcome contributors of all backgrounds
- Transparent decision-making
- Public roadmap and discussions

### 🚀 Innovation-Focused
- Push boundaries of agentic computing
- Experiment with new patterns
- Learn from failures

### 💯 Quality-First
- High code quality standards
- Comprehensive testing
- Clear documentation

### 🤝 Community-Driven
- Value community feedback
- Recognize contributions
- Foster collaboration

### 🔒 Security-Conscious
- Proactive security practices
- Responsible disclosure
- Privacy protection

---

## Contact {#contact}

### Governance Questions

- **Email**: governance@olane.io
- **GitHub Discussions**: https://github.com/olane-labs/olane/discussions

### Core Team

- **Email**: maintainers@olane.io
- **Website**: https://olane.com/team

---

**Version**: 1.0  
**Last Updated**: 2025-10-06  
**Next Review**: 2026-04-06 (6 months)

This governance model will evolve as the project grows. We welcome feedback from the community.

