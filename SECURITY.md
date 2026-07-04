# Security Policy

## Overview

This document outlines the security measures implemented in Vertex IDE's sidecar and provides guidelines for secure deployment.

## Security Features

### 1. Path Traversal Protection

**Implementation**: `WorkspaceGuard`

All filesystem operations are validated to ensure they remain within the configured workspace directory. This prevents:

- Access to files outside the workspace (e.g., `/etc/passwd`)
- Directory traversal attacks using `../` sequences
- Symbolic link attacks pointing outside the workspace

**Configuration**:

```bash
WORKSPACE_PATH=/path/to/workspace  # All operations restricted to this path
```

### 2. Rate Limiting

**Implementation**: `RateLimiter`

API requests are rate-limited to prevent abuse:

- Default: 100 requests per 60 seconds per IP
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- HTTP 429 returned when limit exceeded

**Configuration**:

```bash
RATE_LIMIT_REQ=100        # Max requests
RATE_LIMIT_WINDOW=60      # Window in seconds
```

### 3. CORS Protection

**Implementation**: CORS middleware with whitelist

Cross-Origin Resource Sharing is restricted to specific origins:

- Only configured origins can access the API
- Credentials are allowed but only for whitelisted origins
- Preflight requests are properly handled

**Configuration**:

```bash
CORS_ORIGIN=http://localhost:4200,http://localhost:1420
```

### 4. File Size Limits

**Implementation**: Size validation on all file operations

Prevents denial of service via large file operations:

- Default max file size: 10MB
- Rejects write operations exceeding limit
- Returns 413 Payload Too Large for oversized files

**Configuration**:

```bash
MAX_FILE_SIZE=10485760    # 10MB in bytes
```

### 5. Security Headers

The following security headers are added to all responses:

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Limits referrer leakage

### 6. File Extension Restrictions

Certain file types are blocked from reading:

- Executables: `.exe`, `.dll`, `.so`, `.dylib`, `.bin`
- Keys/Certificates: `.key`, `.pem`, `.p12`, `.pfx`, `.crt`
- Environment files: `.env`, `.env.local`, `.env.production`

### 7. Input Validation

All inputs are validated:

- Paths: Checked for null bytes, length limits (4096 chars), and path traversal
- Content: Validated as UTF-8 string with size limits
- Filenames: Validated for invalid characters and path components

### 8. Origin Enforcement (CSRF / drive-by protection)

**Implementation**: Origin-check middleware (FS + terminal sidecars) and
WebSocket `verifyClient` (terminal sidecar).

CORS alone is not sufficient for a localhost service: it blocks a page from
*reading* a cross-origin response, but a "simple" request (a `text/plain` POST
that skips the preflight) still executes server-side, and WebSocket upgrades
bypass CORS entirely. Because a single request can write files or spawn a
shell, both sidecars now reject any request whose `Origin` header is present
and not on the allowlist, and the terminal WebSocket rejects disallowed origins
at the upgrade handshake. A missing `Origin` (non-browser clients like curl) is
allowed — browsers always send a truthful, unforgeable `Origin`, so a drive-by
web page can never reach the sidecars.

**Configuration**:

```bash
# FS sidecar
CORS_ORIGIN=http://localhost:5173,http://localhost:1420
# Terminal sidecar
TERMINAL_CORS_ORIGIN=http://localhost:5173,http://localhost:1420
```

### 9. Workspace Root Boundary

**Implementation**: `WorkspaceGuard` root boundary + `POST /fs/workspace` check.

`POST /fs/workspace` lets the client switch the active workspace folder. To
prevent it from being repointed at arbitrary disk locations (`/`, `/etc`,
another user's home), the new path must stay within a configured root boundary.

**Configuration**:

```bash
WORKSPACE_ROOT=/Users/me/projects   # defaults to the user's home directory
```

### 10. Git Token Handling (CORS proxy)

Cloning from the browser routes requests through a CORS proxy because git hosts
do not send CORS headers. The **default proxy is public**
(`cors.isomorphic-git.org`) and can observe any `Authorization` header that
passes through it. For **private repositories**:

- Prefer a self-hosted proxy (`@isomorphic-git/cors-proxy`) via
  `GitCloneOptions.corsProxy` or the `GitClient` constructor.
- Use a fine-grained, read-only, revocable token — never a classic full-scope
  PAT.
- The clone dialog surfaces this warning whenever a token is entered.

Deploy tokens (Cloudflare) are sent directly to `api.cloudflare.com` (no third
party) and are never persisted to IndexedDB/localStorage.

## Deployment Security

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
WORKSPACE_PATH=/absolute/path/to/workspace

# Recommended for production
RATE_LIMIT_REQ=50
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=5242880  # 5MB
```

### Network Security

1. **Firewall**: Restrict port 3001 to localhost only in production
2. **Reverse Proxy**: Use nginx/caddy for TLS termination
3. **VPN/Internal Network**: Run sidecar only on internal networks

### File System Permissions

Ensure the sidecar process has minimal permissions:

```bash
# Create dedicated user
useradd -r -s /bin/false vertex-sidecar

# Set ownership
chown -R vertex-sidecar:vertex-sidecar /path/to/workspace

# Run with limited user
su - vertex-sidecar -c "bun run index.ts"
```

### Monitoring

Monitor for suspicious activity:

- Failed authentication attempts (403 responses)
- Rate limit violations (429 responses)
- Large file operations
- Access to blocked file types

## Security Checklist

Before deploying to production:

- [ ] Changed default `WORKSPACE_PATH` from current directory
- [ ] Restricted `CORS_ORIGIN` to production domains only
- [ ] Reduced `RATE_LIMIT_REQ` to appropriate level
- [ ] Set appropriate `MAX_FILE_SIZE` limit
- [ ] Running with non-root user
- [ ] Firewall configured to restrict access
- [ ] TLS/SSL enabled via reverse proxy
- [ ] Logging enabled and monitored
- [ ] `.env` file not committed to git
- [ ] Regular security updates applied

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Open a private GitHub Security Advisory draft in this repository
3. If advisories are unavailable, contact the maintainers through GitHub with a private report
4. Provide detailed impact, reproduction steps, and proposed mitigations (if available)
5. Allow time for a patch before public disclosure

## Security Updates

This project follows responsible disclosure. Security updates will be:

- Released as patch versions
- Documented in CHANGELOG.md
- Announced via security advisories

## Audit Commands

Regular security audits:

```bash
# Node.js dependencies
bun audit

# Rust dependencies (if using Tauri)
cd apps/desktop/src-tauri && cargo audit

# Check for outdated packages
bun outdated
```

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [OWASP CORS](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [Tauri Security](https://tauri.app/v1/references/security/)
