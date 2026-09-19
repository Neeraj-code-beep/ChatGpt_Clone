# Branding Decision: Product Name "Nexa"

- **Status**: Adopted
- **Date**: 2026-09-19

---

## Decision

The product name for this application is **Nexa**.

- **Primary display name**: Nexa
- **Tagline**: "Your AI, with context."

---

## Scope of This Change

This branding decision covers **user-facing product identity only**:

- Frontend UI text (navbar, sidebar, landing page, login, register, chat, composer)
- Browser title and meta description
- AI system prompt identity (`<name>Nexa</name>`)
- Memory extraction and query intent prompts
- README files (root, client, server, docs)
- Documentation introductions

---

## What Was NOT Renamed (and Why)

The following technical identifiers are intentionally **unchanged** to avoid breaking infrastructure, deployments, lockfiles, and API contracts:

| Identifier | Current Value | Reason for Keeping |
|---|---|---|
| Repository folder | `Chatgpt_Clone` | Repository rename is a separate operation; requires GitHub/remote coordination |
| Root package name | `chatgpt-clone-workspace` | Internal workspace name; changing causes lockfile churn with no user-facing benefit |
| Client package name | `chatgpt-clone-client` | Changing triggers lockfile regeneration and may affect Render build caching |
| Server package name | `chatgpt_clone` | Same as above; no user visibility |
| MongoDB database name | `chatgpt_clone` | Renaming requires data migration and environment variable changes across all deployments |
| Pinecone index name | `chatgptclone` | Renaming requires re-indexing all vectors; destructive operation |
| Render service names | `chatgpt-clone-api`, `chatgpt-clone-client` | Renaming changes public URLs; requires coordinated CORS and environment updates |
| VPS deployment paths | `/var/www/chatgpt-clone` | Renaming requires systemd/nginx reconfiguration on any deployed VPS |
| Environment variables | `MONGODB_URL`, `PINECONE_API_KEY`, etc. | Standard technical names; no product branding in these |
| API routes | `/api/auth/*`, `/api/chat/*` | Functional endpoints; not product-branded |
| Socket.IO events | `ai-message`, `ai-response`, `error` | Protocol contract; renaming breaks clients |
| Internal code identifiers | `HELPER_SYSTEM_INSTRUCTION`, `chatGpt_clone_index` | Internal variable names; renaming is a code refactor, not a branding change |

---

## Rationale

Separating product branding from internal technical infrastructure names is standard practice:

1. **Stability**: Technical names are depended on by lockfiles, deployment configs, database schemas, and third-party services. Changing them introduces risk with no user-facing benefit.
2. **Reversibility**: Product names can change again without touching infrastructure.
3. **Deployment safety**: No environment variable, CORS, or URL changes are required.
4. **Data integrity**: No database migrations or vector re-indexing needed.
