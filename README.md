# Teu-Im

Real-time AI interpretation platform for multilingual meetings and events.

## Overview

Teu-Im is a comprehensive platform that enables live speech-to-text interpretation across multiple languages. The system captures audio from participants, transcribes it in real-time using AI, and provides instant translation into target languages. The platform consists of:

- **Web App** - Management dashboard for organizers to create projects, monitor live sessions, and analyze interpretation data
- **Mobile PWA** - Attendee interface for participants to view live interpretation in their preferred language
- **Desktop App** - Native Tauri application providing enhanced desktop experience for moderators and live session management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Desktop**: Tauri 2.0, Vite, React
- **Mobile**: Next.js 15 (PWA), React 19
- **Backend**: Node.js with Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Speech-to-Text**: Soniox API
- **Monorepo**: pnpm workspaces, Turbo
- **Code Quality**: TypeScript, ESLint, Prettier

## Prerequisites

- **Node.js** 20+
- **pnpm** 10.28.1+
- **Rust** 1.70+ (for desktop app compilation)
- **Git** for version control

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Create `.env.local` in each app directory:

#### `/apps/web/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SONIOX_API_KEY=your-soniox-key
```

#### `/apps/mobile/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### `/apps/desktop/.env.local`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Development Commands

```bash
# Run all apps in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Lint TypeScript and format code
pnpm lint

# Clean build artifacts and node_modules
pnpm clean
```

### 4. App-Specific Commands

**Web App** (`apps/web`):
```bash
cd apps/web
pnpm dev          # Start dev server on http://localhost:3000
pnpm build        # Build for production
pnpm start        # Start production server
```

**Mobile App** (`apps/mobile`):
```bash
cd apps/mobile
pnpm dev          # Start dev server on http://localhost:3001
pnpm build        # Build for production
```

**Desktop App** (`apps/desktop`):
```bash
cd apps/desktop
pnpm dev          # Start Tauri dev with hot reload
pnpm tauri:build  # Build native executable
```

## Project Structure

```
Teu-Im/
├── apps/
│   ├── web/              # Management dashboard (Next.js 15)
│   ├── mobile/           # Attendee PWA (Next.js 15)
│   └── desktop/          # Desktop app (Tauri 2.0 + Vite)
├── packages/
│   ├── shared/           # Common types and utilities
│   ├── ui/               # Reusable UI components and design system
│   └── supabase/         # Supabase client configuration and types
├── docs/                 # Project documentation
├── pnpm-workspace.yaml   # Monorepo workspace configuration
└── turbo.json            # Turbo build system config
```

## Apps Overview

### Web App (`apps/web`)

The management dashboard for project organizers. Built with Next.js 15 and React 19.

**Key Routes**:
- `/` - Landing page
- `/login` - Authentication
- `/signup` - User registration
- `/(dashboard)` - Protected dashboard routes
  - `/projects` - Project management
  - `/projects/[id]` - Project details and settings
  - `/projects/[id]/sessions` - Session history
  - `/sessions/[id]` - Session playback and analytics
  - `/analytics` - Global interpretation analytics
  - `/live` - Live session monitoring

**Features**:
- User authentication via Supabase
- Create and manage interpretation projects
- Start/pause/end live sessions
- Monitor real-time interpretation quality
- View session analytics and transcripts
- Export session data as SRT/CSV

### Mobile App (`apps/mobile`)

A Progressive Web App for attendees to view live interpretation during events.

**Key Routes**:
- `/audience/[code]` - Attendee join page
- Live interpretation view with language selection
- Real-time subtitle display

### Desktop App (`apps/desktop`)

Native desktop application built with Tauri 2.0 for enhanced desktop experience.

**Features**:
- Native system integration
- Offline-capable architecture
- Real-time speech-to-text via Soniox
- Integration with desktop audio systems

## Shared Packages

### `packages/shared`
Common types, utilities, and constants used across all apps:
- Type definitions for projects, sessions, and interpretations
- Validation helpers
- Utility functions for project code generation

### `packages/ui`
Shared UI component library and design system:
- Reusable React components
- Tailwind CSS configuration and design tokens
- Common styling utilities
- Exported for use in all apps

### `packages/supabase`
Supabase client configuration and types:
- Server-side Supabase client setup
- Browser-side Supabase client
- Database type definitions
- Helper functions for database operations

## API Endpoints

The web app exposes a comprehensive REST API for session management and data operations.

### Authentication
- `POST /api/auth/signup` - User registration

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Sessions
- `POST /api/projects/[id]/sessions` - Start new session
- `GET /api/projects/[id]/sessions` - List project sessions
- `PATCH /api/sessions/[sessionId]/status` - Update session status
- `GET /api/sessions/[sessionId]/history` - Get session transcript history
- `GET /api/sessions/[sessionId]/export` - Export session data

### Audio
- `POST /api/sessions/[sessionId]/audio/chunks` - Register audio chunk metadata
- `GET /api/sessions/[sessionId]/audio/chunks` - List audio chunks with signed URLs

### Audience (Attendees)
- `POST /api/audience/token` - Request temporary access token
- `POST /api/join` - Join project with credentials

### Utilities
- `GET /api/soniox/temp-key` - Get temporary Soniox API key
- `GET /api/releases/latest` - Get latest desktop app release info
- `POST /api/search` - Search sessions and transcripts
- `GET /api/projects/[id]/analytics` - Get project analytics
- `GET /api/projects/[id]/analytics/summary` - Get analytics summary

See [docs/API.md](./docs/API.md) for detailed endpoint documentation.

## Environment Variables Reference

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Supabase service role key (web only) |
| `SONIOX_API_KEY` | Server | Yes | Soniox speech-to-text API key (web only) |
| `VITE_SUPABASE_URL` | Client | Yes | Supabase URL (desktop) |
| `VITE_SUPABASE_ANON_KEY` | Client | Yes | Supabase anonymous key (desktop) |

## Running Tests

```bash
# Run tests across all packages
pnpm test

# Run tests for specific app
cd apps/web
pnpm test
```

## Performance Testing

The project uses **Lighthouse CI** for automated performance regression testing on every pull request.

### Lighthouse CI Configuration

- **File**: `lighthouserc.js`
- **Workflow**: `.github/workflows/lighthouse.yml`
- **Trigger**: Runs on push to main and all pull requests

### Performance Thresholds

The following Lighthouse scores are enforced:

| Category | Threshold | Level |
|----------|-----------|-------|
| Performance | 80+ | Warning |
| Accessibility | 90+ | Error (fails PR) |
| Best Practices | 90+ | Warning |
| SEO | 80+ | Warning |

### Running Lighthouse Locally

To run Lighthouse CI locally before pushing:

```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli@latest

# Run Lighthouse audit
lhci collect --config=./lighthouserc.js
lhci assert --config=./lighthouserc.js
```

### CI Results

Lighthouse CI results are automatically uploaded to temporary public storage and are available in:
- GitHub Actions workflow artifacts
- Pull request checks section
- Lighthouse CI storage (temporary link provided in workflow output)

## Code Style and Linting

The project follows strict TypeScript and ESLint rules with automatic formatting via Prettier.

```bash
# Check for linting issues
pnpm lint

# Format code (auto-run on commit via husky)
pnpm format
```

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Install dependencies: `pnpm install`
3. Make changes following the code style guide
4. Commit messages follow conventional commits format
5. Push and create a Pull Request

### Code Guidelines

- Use TypeScript for type safety
- Follow React 19 functional component patterns
- Minimize bundle size - use code splitting where appropriate
- Write accessible HTML (semantic tags, ARIA labels)
- Document complex logic with comments
- Use the shared packages for common types and utilities

### Commit Hooks

Husky automatically runs pre-commit hooks:
- Prettier formatting
- ESLint checks
- Type checking (via lint-staged)

## Build and Deployment

### Web App Production Build
```bash
cd apps/web
pnpm build
pnpm start
```

### Desktop App Release Build
```bash
cd apps/desktop
pnpm tauri:build
```
Built executable will be in `src-tauri/target/release/`

### Mobile App
Deploy as a standard Next.js PWA to a hosting provider:
```bash
cd apps/mobile
pnpm build
```

## Troubleshooting

### Port already in use
- Web dev: Uses port 3000 (change with `PORT=3001 pnpm dev`)
- Mobile dev: Uses port 3001
- Desktop: Uses port 1420 for Vite

### Supabase connection issues
1. Verify environment variables are set correctly
2. Check Supabase project is active
3. Ensure ANON_KEY has proper RLS policies configured

### Turbo cache issues
```bash
# Clear turbo cache
pnpm exec turbo cache clean
```

## Additional Resources

- [Web App Architecture](./apps/web/CLAUDE.md)
- [API Documentation](./docs/API.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Tauri Documentation](https://tauri.app/docs)

## License

Proprietary - All rights reserved

## Support

For issues and questions:
1. Check existing GitHub issues
2. Review documentation in `docs/` directory
3. Contact the development team
