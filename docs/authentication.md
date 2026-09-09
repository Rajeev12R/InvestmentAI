# Authentication & Credential Management — Phase 9

## 1. Password Security
* **Salted Hashing:** User passwords are hashed using PBKDF2 (`sha512`, 10,000 iterations, 64-byte key) with unique 16-byte random salts.
* **Plaintext Prohibition:** Plaintext passwords are never stored, logged, or returned in API responses.

## 2. Session Lifecycle
* **Cryptographic Tokens:** Sessions use 256-bit cryptographically secure random tokens.
* **Storage Hashing:** The database stores only SHA-256 hashes of the session tokens.
* **Session Invalidation:** Immediate revocation upon logout or administrative access revocation.

## 3. Scoped API Keys
* **Workspace Scoping:** Every API key is strictly tied to a single `workspaceId`.
* **One-Time Secret Exposure:** Full key secrets (`inv_live_...`) are returned only upon creation.
* **Fingerprint Storage:** The backend stores only SHA-256 key fingerprints.
* **Fine-Grained Scopes:** API keys declare explicit permission scopes (`scopes: ['truth.read', 'copilot.read']`).
