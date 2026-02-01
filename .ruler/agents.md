# Better-T-Stack Project Rules

This is an Extractify project created with Better-T-Stack CLI.

## Project Overview

**Extractify** is an AI-powered ETL (Extract, Transform, Load) platform that leverages Large Language Models to intelligently extract structured data from unstructured sources. It combines modern AI capabilities with traditional data pipeline patterns to automate data extraction workflows.

### Core Concepts

- **Attribute Models**: Define structured schemas for data extraction (strings, arrays, objects, nested types)
- **Model Versioning**: Version control for extraction schemas (v1, v2, etc.)
- **Data Sources**: Documents, Images, Audio files, and future triggers (social media, web pages)
- **LLM Extraction**: Apply AI models to extract data matching your schema from any source
- **Integration Targets**: Export extracted data to Spreadsheets, PostgreSQL, MongoDB, and more

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Fullstack application (TanStack Start)

- **`packages/auth/`** - Authentication logic and utilities
- **`packages/db/`** - Database schema and utilities
- **`packages/env/`** - Shared environment variables and validation
- **`packages/config/`** - Shared TypeScript configuration

## Available Scripts

- `bun run dev` - Start all apps in development mode
- `bun run build` - Build all apps
- `bun run lint` - Lint all packages
- `bun run typecheck` - Type check all packages

## Database Commands

All database operations should be run from the web workspace:

- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open database studio
- `bun run db:generate` - Generate Drizzle files
- `bun run db:migrate` - Run database migrations

Database schema files are located in `apps/web/src/db/schema/`

## Authentication

Authentication is powered by Better Auth:

- Auth configuration is in `packages/auth/src/`
- Web app auth client is in `apps/web/src/lib/auth-client.ts`

## Project Configuration

This project includes a `bts.jsonc` configuration file that stores your Better-T-Stack settings:

- Contains your selected stack configuration (database, ORM, backend, frontend, etc.)
- Used by the CLI to understand your project structure
- Safe to delete if not needed

## Key Points

- This is a Turborepo monorepo using bun workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `bun run command-name`
- Turborepo handles build caching and parallel execution
- Git hooks are configured with Lefthook for pre-commit checks

---

## Domain Architecture

### Attribute Models

Attribute models define what data should be extracted from sources. Models support:

- **Scalar Types**: string, number, boolean, date
- **Complex Types**: arrays, nested objects, enums
- **Validation Rules**: required fields, patterns, min/max constraints
- **AI Hints**: Prompts and context to guide LLM extraction

### Data Sources

| Source Type | Status | Description |
|-------------|--------|-------------|
| Documents (PDF, DOCX) | Core | Text extraction with layout awareness |
| Images | Core | OCR + visual understanding |
| Audio | Core | Transcription + content extraction |
| Web Pages | Future | URL scraping with dynamic content |
| Social Media | Future | Twitter/X, LinkedIn triggers |
| Email | Future | Inbox monitoring and extraction |

### Integration Targets

| Target | Status | Description |
|--------|--------|-------------|
| Google Sheets | Core | Direct spreadsheet integration |
| PostgreSQL | Core | Structured database export |
| MongoDB | Core | Document database export |
| REST API | Future | Webhook/API callbacks |
| S3/Storage | Future | File-based exports |
| Airtable | Future | Low-code database integration |

## Development Guidelines

### Coding Standards

- Use TypeScript strictly (`strict: true`)
- Follow Biome for linting and formatting
- Use Drizzle ORM for database operations
- Prefer server actions over API routes when possible

### AI/LLM Integration

- Use structured outputs (JSON mode) for reliable extraction
- Implement token-aware chunking for large documents
- Cache extraction results to reduce API costs
- Support multiple LLM providers (OpenAI, Anthropic, local)

### Testing Strategy

- Unit tests for extraction logic
- Integration tests for data pipelines
- E2E tests for critical user flows
- Cost monitoring for LLM API usage
