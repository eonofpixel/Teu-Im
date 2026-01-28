# Supabase Row Level Security (RLS) Documentation

All tables in the Teu-Im schema have RLS enabled. This document maps every
policy to its business intent so that future migrations can be reviewed
against the security model without digging into raw SQL.

---

## Access Model Summary

| Entity | Owner Read | Owner Write | Public Read | Cross-Org Access |
|--------|-----------|-------------|-------------|-----------------|
| `users` | Own row only | Own row only | No | No |
| `projects` | Own projects | Own projects | No | Via org membership (future) |
| `sessions` | Via project ownership | Via project ownership | No | No |
| `interpretations` | Via project ownership | Via project ownership | **Yes** (viewer support) | No |
| `organizations` | Org members | Org admins+ | No | No |
| `organization_members` | Same-org members | Org admins+ | No | No |
| `audio_chunks` | Via project ownership | Via project ownership | No | No |
| `storage: session-audio` | Via project ownership | Via project ownership | No | No |

---

## Migration 001: Initial Schema

### `users`
- **SELECT** — `auth.uid() = id` : Users can only read their own profile.
- **UPDATE** — `auth.uid() = id` : Users can only modify their own profile.
- **INSERT** — `auth.uid() = id` : Users can only create their own profile row (triggered on signup).

### `projects`
- **ALL** — `auth.uid() = user_id` : Full CRUD restricted to the project owner.

### `sessions`
- **ALL** — Session belongs to a project whose `user_id = auth.uid()` : Only the project owner manages sessions.

### `interpretations`
- **SELECT** — `true` : Public read access. Enables the attendee viewer to receive real-time subtitles without authentication.
- **INSERT** — Project ownership chain verified via `sessions -> projects -> user_id` : Only the project owner (or their server processes) can write interpretation data.

---

## Migration 002: Storage RLS

### `storage.objects` on bucket `session-audio`
All policies require the object path to begin with a `session_id` that belongs
to a project owned by `auth.uid()`.

- **INSERT** — Owner uploads audio to their sessions.
- **SELECT** — Owner reads audio from their sessions.
- **DELETE** — Owner deletes audio from their sessions.

> Note: The bucket is private (`public = false`). All access requires authentication.

---

## Migration 003: Organizations & Teams

### `organizations`
- **SELECT** — Members of the organization (via `organization_members`) can view it.
- **UPDATE** — Admins or owners can modify organization details.
- **DELETE** — Only the owner can delete an organization.
- **INSERT** — Any authenticated user can create an organization (they become the owner via application logic).

### `organization_members`
- **SELECT** — Members of the same organization can see each other.
- **INSERT** — Admins+ can invite new members.
- **UPDATE** — Admins+ can modify member roles.
- **DELETE** — Users can leave themselves; admins+ can remove others.

---

## Migration 004: Audio Chunks

### `audio_chunks`
All policies follow the project ownership chain: `audio_chunks -> sessions -> projects -> user_id`.

- **SELECT** — Project owners can read chunk metadata.
- **INSERT** — Project owners can register new chunks.
- **DELETE** — Project owners can remove chunks.

---

## Security Notes

1. **API keys stored in `users.soniox_api_key`** — Stored in plaintext in the current schema. The RLS policy (`auth.uid() = id`) ensures users can only read/write their own key. For additional protection, consider encrypting at rest using pgcrypto or a Vault integration.

2. **Interpretation public read** — The `interpretations` SELECT policy grants public read. This is intentional for the attendee viewer flow but means any authenticated Supabase client can query interpretation data if they know the `session_id`. Session IDs are UUIDs and not guessable, so this is acceptable for the current threat model.

3. **Password comparison in `/api/join`** — Project passwords are short (4 chars) and intended for convenience joins, not security-critical access. The API returns a generic "not found" message on wrong password to prevent enumeration.
