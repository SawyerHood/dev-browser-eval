# Benchmark Comparison

*Averaged over 3 runs per method*

| Method | Time | Cost (USD) | Turns | Success Rate |
|--------|------|------------|-------|--------------|
| **Dev Browser** | 3m 53s | $0.88 | 29 | 100% (3/3) |
| Playwright MCP | 4m 31s | $1.45 | 51 | 100% (3/3) |
| Playwright Skill | 8m 07s | $1.45 | 38 | 67% (2/3) |

## Analysis

**Fastest: Dev Browser** - 3m 53s
- 14% faster than Playwright MCP (38s saved)
- 52% faster than Playwright Skill (254s saved)

**Cheapest: Dev Browser** - $0.88
- 39% cheaper than Playwright MCP ($0.57 saved)
- 39% cheaper than Playwright Skill ($0.57 saved)

**Fewest Turns: Dev Browser** - 29 turns
- 43% fewer turns than Playwright MCP (22 fewer)
- 24% fewer turns than Playwright Skill (9 fewer)

