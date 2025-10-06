# Security Policy

## Reporting Security Vulnerabilities {#reporting}

**TL;DR**: Found a security issue? Email **security@olane.io** with details. Do not create public issues for security vulnerabilities.

---

## Our Commitment {#commitment}

Security is a top priority for Olane OS. We appreciate the security research community's efforts to responsibly disclose vulnerabilities and will work with you to address any issues promptly.

**We commit to:**
- Acknowledge receipt of your report within **48 hours**
- Provide an initial assessment within **5 business days**
- Keep you informed of our progress
- Credit you for the discovery (unless you prefer to remain anonymous)
- Work with you to understand and resolve the issue

---

## Supported Versions {#supported-versions}

We provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.7.x   | ✅ Yes             | Current stable |
| 0.6.x   | ⚠️ Limited support | Critical fixes only |
| < 0.6   | ❌ No              | Unsupported |

**Recommendation**: Always use the latest stable version for the best security posture.

---

## How to Report a Vulnerability {#how-to-report}

### Step 1: Email Us

Send a detailed report to **developer@olane.com** with:

**Subject line**: `[SECURITY] Brief description`

**Include:**
- **Description**: Clear explanation of the vulnerability
- **Impact**: What could an attacker accomplish?
- **Affected versions**: Which versions are vulnerable?
- **Reproduction steps**: How to reproduce the issue
- **Proof of concept**: Code, screenshots, or videos (if applicable)
- **Suggested fix**: If you have ideas (optional)
- **Your contact info**: For follow-up communication

**Example report:**

```
Subject: [SECURITY] Authentication bypass in o-login package

Description:
An authentication bypass vulnerability exists in the o-login package that 
allows an attacker to forge authentication tokens without valid credentials.

Impact:
An attacker could gain unauthorized access to any tool node requiring 
authentication, potentially exposing sensitive data or allowing unauthorized 
operations.

Affected Versions:
- o-login v0.7.0 through v0.7.3

Reproduction Steps:
1. Start an o-login protected node
2. Send a specially crafted request with token: "admin::<empty>"
3. Node accepts the request without proper validation

Proof of Concept:
[Include code, cURL command, or screenshots]

Suggested Fix:
Add proper token validation in src/auth/validator.ts at line 45

Contact:
- Name: [Your name]
- Email: [Your email]
- PGP Key: [If applicable]
```

### Step 2: Wait for Acknowledgment

We will acknowledge receipt within **48 hours** and provide:
- Confirmation we received your report
- Initial assessment of severity
- Estimated timeline for investigation
- Whether we need additional information

### Step 3: Coordinate Disclosure

We will work with you to:
- Understand the full scope of the vulnerability
- Develop and test a fix
- Coordinate a responsible disclosure timeline
- Prepare security advisory

---

## What to Expect {#what-to-expect}

### Our Response Process

1. **Triage** (0-2 days)
   - Acknowledge receipt
   - Assign severity rating
   - Assign to security team

2. **Investigation** (2-7 days)
   - Reproduce the issue
   - Assess impact and scope
   - Identify affected versions

3. **Fix Development** (1-4 weeks, depending on severity)
   - Develop patch
   - Test thoroughly
   - Coordinate with you for validation

4. **Release** (1-7 days after fix)
   - Release patched version
   - Publish security advisory
   - Credit reporter (if desired)

5. **Post-Release**
   - Monitor for exploitation attempts
   - Update documentation
   - Conduct post-mortem

### Severity Levels

We use CVSS v3.1 scoring to assess severity:

| Severity | CVSS Score | Response Time | Examples |
|----------|-----------|---------------|----------|
| **Critical** | 9.0-10.0 | 24-48 hours | Remote code execution, authentication bypass |
| **High** | 7.0-8.9 | 1-2 weeks | Data exposure, privilege escalation |
| **Medium** | 4.0-6.9 | 2-4 weeks | DoS, information disclosure |
| **Low** | 0.1-3.9 | As scheduled | Minor information leaks |

---

## Scope {#scope}

### In Scope

**Vulnerabilities in:**
- All packages in the `@olane/*` namespace
- Core infrastructure code
- Authentication and authorization systems
- Network communication (o-node, o-protocol)
- Tool execution and sandboxing
- Data storage and retrieval
- Examples and templates (if they represent security anti-patterns)

**Types of vulnerabilities:**
- Remote code execution (RCE)
- Authentication bypass
- Authorization bypass
- SQL/NoSQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Denial of service (DoS)
- Information disclosure
- Privilege escalation
- Insecure deserialization
- Path traversal
- Command injection

### Out of Scope

**Not eligible for security reports:**
- Vulnerabilities in third-party dependencies (report to upstream)
- Social engineering attacks
- Physical attacks
- Denial of service via resource exhaustion (unless amplification > 10x)
- Issues requiring physical access to the system
- Issues in unsupported versions (< 0.6)
- Theoretical vulnerabilities without proof of exploitability
- Missing security best practices without proof of vulnerability
- Reports from automated scanners without validation

**If unsure, ask**: security@olane.io

---

## Responsible Disclosure Guidelines {#disclosure}

We ask that security researchers:

### ✅ Do

- **Report vulnerabilities privately** to security@olane.io
- **Give us reasonable time** to address the issue (typically 90 days)
- **Act in good faith** to avoid privacy violations and service disruption
- **Provide detailed reports** with reproduction steps
- **Engage with us** throughout the disclosure process

### ❌ Don't

- **Publicly disclose vulnerabilities** before we've issued a fix
- **Access, modify, or delete data** beyond what's necessary to demonstrate the vulnerability
- **Degrade service performance** or availability
- **Use vulnerabilities** for personal gain
- **Share vulnerability details** with others before public disclosure

---

## Bug Bounty Program {#bug-bounty}

**Current Status**: We do not currently operate a formal bug bounty program.

However, we deeply appreciate security research and will:
- Publicly credit you in our security advisory (if desired)
- Send Olane swag as a token of appreciation
- Consider you for future bug bounty programs (when available)

We are exploring options for a formal bug bounty program and will update this document when available.

---

## Security Best Practices {#best-practices}

### For Developers Using Olane

**Authentication:**
```typescript
import { oLoginTool } from '@olane/o-login';

// ✅ Always use authentication for production nodes
const node = new oLaneTool({
  address: new oAddress('o://protected-node'),
  authProvider: new oLoginTool({
    requiredPermissions: ['read', 'write']
  })
});
```

**Input Validation:**
```typescript
// ✅ Validate all parameters
_params_process_data() {
  return {
    data: { 
      type: 'string', 
      required: true,
      validate: (value: string) => {
        if (value.length > 10000) {
          throw new Error('Data too large');
        }
        return true;
      }
    }
  };
}
```

**Error Handling:**
```typescript
// ✅ Don't leak sensitive information in errors
try {
  await database.query(sql);
} catch (error) {
  // ❌ Don't expose internal details
  // throw new Error(`SQL error: ${error.message}`);
  
  // ✅ Log internally, return generic error
  logger.error('Database query failed', { error, sql });
  throw new oError('Failed to process request');
}
```

**Network Security:**
```typescript
// ✅ Use TLS for production
const node = new oNodeTool({
  address: new oAddress('o://node'),
  network: {
    listeners: ['/ip4/0.0.0.0/tcp/4999/tls'],
    tlsCert: process.env.TLS_CERT,
    tlsKey: process.env.TLS_KEY
  }
});
```

**Dependency Management:**
```bash
# ✅ Regularly audit dependencies
npm audit

# ✅ Update to patched versions
npm update

# ✅ Use lock files
npm ci  # Use package-lock.json
```

---

## Security Advisories {#advisories}

We publish security advisories at:
- **GitHub Security Advisories**: https://github.com/olane-labs/olane/security/advisories
- **Website**: https://olane.com/security
- **NPM**: Package-specific advisories on npm

**Subscribe to updates:**
- Watch the GitHub repository
- Follow [@olane](https://twitter.com/olane) on Twitter
- Subscribe to our security mailing list: security-updates@olane.io

---

## Contact {#contact}

### Security Team

- **Email**: security@olane.io
- **PGP Key**: Available at https://olane.com/security/pgp-key.asc
- **Response Time**: Within 48 hours

### Other Security-Related Contacts

- **General Support**: support@olane.io
- **Code of Conduct Violations**: conduct@olane.io
- **Legal/Compliance**: legal@olane.io

---

## Acknowledgments {#acknowledgments}

We thank the following researchers for responsibly disclosing vulnerabilities:

*(List will be updated as security researchers contribute)*

---

## Security Updates {#updates}

**Current Security Notices:**

*No active security advisories at this time.*

**Recent Security Updates:**

*No security updates published yet.*

---

## Legal {#legal}

### Safe Harbor

We support safe harbor for security research conducted:
- In good faith
- Without violating privacy or service availability
- In compliance with this policy
- In accordance with applicable laws

If you follow these guidelines, we will not pursue legal action against you for security research.

### Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 0-2**: Acknowledgment sent
- **Day 2-7**: Initial assessment
- **Day 7-90**: Fix development and testing
- **Day 90**: Public disclosure (or sooner if fix is ready and tested)

We may request extension beyond 90 days for complex vulnerabilities.

---

## Questions?

If you have questions about this security policy:
- **Email**: security@olane.io
- **GitHub Discussions**: [Ask publicly](https://github.com/olane-labs/olane/discussions) (for policy questions, not vulnerabilities)

---

**Version**: 1.0  
**Last Updated**: 2025-10-06  
**Effective Date**: 2025-10-06

Thank you for helping keep Olane OS secure! 🔒

