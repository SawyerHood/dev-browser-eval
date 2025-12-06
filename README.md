# Dev Browser Eval

Benchmarking suite for testing different browser automation methods with Claude Code against the game-tracker application.

## Setup

```bash
./setup.sh
```

This will:
1. Clone the game-tracker repository
2. Copy `.env.local` from `~/game-tracker/.env.local`
3. Install dependencies

## Running Benchmarks

Run all benchmarks (3 runs each):
```bash
./scripts/benchmark.sh
```

Run a specific method:
```bash
./scripts/benchmark.sh dev-browser
./scripts/benchmark.sh playwright-skill
./scripts/benchmark.sh playwright-mcp
./scripts/benchmark.sh vanilla
```

## Generate Report

After running benchmarks:
```bash
bun run scripts/generate-benchmark.ts
```

This generates `benchmark-comparison.md` with averaged results.

## Methods

| Method | Description |
|--------|-------------|
| `dev-browser` | Use the dev browser |
| `playwright-skill` | Use the playwright skill |
| `playwright-mcp` | Use playwright MCP |
| `vanilla` | Use playwright directly |

## Utility Scripts

- `./scripts/reset-dev.sh` - Reset dev environment (kills ports, clears /tmp, resets DB)
- `./scripts/reset-db.sh` - Reset just the database
