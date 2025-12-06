---
description: Check benchmark JSONL results and update success rates in benchmark-comparison.md
allowed-tools: Bash, Read, Edit, Glob
---

# Update Benchmark Success Rates

Check the last line of all JSONL files in `benchmark-results/` to verify task completion and update the success rate column in `benchmark-comparison.md`.

## Steps

1. Find all `*.jsonl` files in `benchmark-results/`
2. Read the last line of each file (contains the final result JSON)
3. For each run, check if:
   - The task completed successfully (`"subtype":"success"`)
   - The average score is correct (should be 9.0)
4. Calculate success rate for each method (dev-browser, playwright-mcp, playwright-skill)
5. Update the table in `benchmark-comparison.md` with the Success Rate column

## Success Criteria

A run is successful if:
- The result shows `"subtype":"success"`
- The result mentions an average score of 9.0 (not 8.0 or other values)

## Output Format

Update the markdown table to include:
```
| Method | Time | Cost (USD) | Turns | Success Rate |
```

Where Success Rate shows the percentage and fraction, e.g., `100% (3/3)` or `67% (2/3)`.
