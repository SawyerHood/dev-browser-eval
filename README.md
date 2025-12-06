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
bun run scripts/benchmark.ts
```

Run a specific method:
```bash
bun run scripts/benchmark.ts dev-browser
bun run scripts/benchmark.ts playwright-skill
bun run scripts/benchmark.ts playwright-mcp
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
| `dev-browser` | Use the dev browser plugin |
| `playwright-skill` | Use the playwright skill plugin |
| `playwright-mcp` | Use playwright MCP server |

## Utility Scripts

- `bun run scripts/reset.ts` - Reset dev environment (kills ports, clears /tmp, resets DB)
