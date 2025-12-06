#!/usr/bin/env bun

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

interface BenchmarkResult {
  duration_ms: number
  num_turns: number
  total_cost_usd: number
}

interface RunData {
  time_ms: number
  cost: number
  turns: number
}

interface MethodData {
  name: string
  key: string
  runs: RunData[]
  time_ms: number // average
  cost: number // average
  turns: number // average
}

interface EvalData {
  name: string
  methods: MethodData[]
}

const METHOD_DISPLAY_NAMES: Record<string, string> = {
  'dev-browser': 'Dev Browser',
  'playwright-skill': 'Playwright Skill',
  'playwright-mcp': 'Playwright MCP',
  'vanilla': 'Vanilla',
}

// Order for consistent display
const METHOD_ORDER = ['dev-browser', 'playwright-skill', 'playwright-mcp', 'vanilla']

function formatTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}

function calcPercentDiff(a: number, b: number): number {
  return Math.round(((b - a) / b) * 100)
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function parseFilename(filename: string): { eval: string; method: string } | null {
  // Match pattern: {eval}-{method}-run{n}.jsonl or {method}-run{n}.jsonl
  const match = filename.match(/^(.+)-run\d+\.jsonl$/)
  if (!match) return null

  const prefix = match[1]

  // Try to find which method this is
  for (const method of METHOD_ORDER) {
    if (prefix.endsWith(method)) {
      const evalPrefix = prefix.slice(0, -(method.length + 1)) // Remove -{method}
      return {
        eval: evalPrefix || 'default',
        method,
      }
    }
  }

  return null
}

function generateMethodAnalysis(methods: MethodData[]): string {
  if (methods.length === 0) return ''

  const fastest = methods[0] // Already sorted by time
  const cheapest = methods.reduce((a, b) => (a.cost < b.cost ? a : b))
  const fewestTurns = methods.reduce((a, b) => (a.turns < b.turns ? a : b))

  let md = ''

  // Fastest analysis
  md += `**Fastest: ${fastest.name}** - ${formatTime(fastest.time_ms)}\n`
  for (const m of methods) {
    if (m.name !== fastest.name) {
      const pct = calcPercentDiff(fastest.time_ms, m.time_ms)
      const saved = Math.round((m.time_ms - fastest.time_ms) / 1000)
      md += `- ${pct}% faster than ${m.name} (${saved}s saved)\n`
    }
  }

  md += '\n'

  // Cheapest analysis
  md += `**Cheapest: ${cheapest.name}** - ${formatCost(cheapest.cost)}\n`
  for (const m of methods) {
    if (m.name !== cheapest.name) {
      const pct = calcPercentDiff(cheapest.cost, m.cost)
      const saved = m.cost - cheapest.cost
      md += `- ${pct}% cheaper than ${m.name} (${formatCost(saved)} saved)\n`
    }
  }

  md += '\n'

  // Fewest turns analysis
  md += `**Fewest Turns: ${fewestTurns.name}** - ${fewestTurns.turns} turns\n`
  for (const m of methods) {
    if (m.name !== fewestTurns.name) {
      const pct = calcPercentDiff(fewestTurns.turns, m.turns)
      const saved = m.turns - fewestTurns.turns
      md += `- ${pct}% fewer turns than ${m.name} (${saved} fewer)\n`
    }
  }

  return md
}

function generateMethodTable(methods: MethodData[]): string {
  if (methods.length === 0) return ''

  const fastest = methods[0] // Already sorted by time

  let md = '| Method | Time | Cost (USD) | Turns |\n'
  md += '|--------|------|------------|-------|\n'

  for (const m of methods) {
    const isFastest = m.name === fastest.name
    const name = isFastest ? `**${m.name}**` : m.name
    md += `| ${name} | ${formatTime(m.time_ms)} | ${formatCost(m.cost)} | ${m.turns} |\n`
  }

  return md
}

async function main() {
  const rootDir = join(import.meta.dir, '..')
  const resultsDir = join(rootDir, 'benchmark-results')

  let files: string[]
  try {
    files = await readdir(resultsDir)
  } catch {
    console.error('No benchmark-results directory found. Run benchmark.sh first.')
    process.exit(1)
  }

  const benchmarkFiles = files.filter((f) => f.endsWith('.jsonl'))

  if (benchmarkFiles.length === 0) {
    console.error('No benchmark results found in benchmark-results/')
    process.exit(1)
  }

  // Group files by eval and method
  // Structure: evalRuns[evalName][methodKey] = RunData[]
  const evalRuns: Record<string, Record<string, RunData[]>> = {}

  for (const file of benchmarkFiles) {
    const parsed = parseFilename(file)
    if (!parsed) continue

    const { eval: evalName, method } = parsed
    const content = await readFile(join(resultsDir, file), 'utf-8')
    // JSONL format: get the last non-empty line which contains the result
    const lines = content.trim().split('\n')
    const lastLine = lines[lines.length - 1]
    const data: BenchmarkResult = JSON.parse(lastLine)

    if (!evalRuns[evalName]) {
      evalRuns[evalName] = {}
    }
    if (!evalRuns[evalName][method]) {
      evalRuns[evalName][method] = []
    }

    evalRuns[evalName][method].push({
      time_ms: data.duration_ms,
      cost: data.total_cost_usd,
      turns: data.num_turns,
    })
  }

  // Convert to structured data
  const evals: EvalData[] = []

  for (const [evalName, methodRuns] of Object.entries(evalRuns)) {
    const methods: MethodData[] = []

    for (const [methodKey, runs] of Object.entries(methodRuns)) {
      const name = METHOD_DISPLAY_NAMES[methodKey] || methodKey
      methods.push({
        name,
        key: methodKey,
        runs,
        time_ms: average(runs.map((r) => r.time_ms)),
        cost: average(runs.map((r) => r.cost)),
        turns: Math.round(average(runs.map((r) => r.turns))),
      })
    }

    // Sort by time (fastest first)
    methods.sort((a, b) => a.time_ms - b.time_ms)

    evals.push({
      name: evalName,
      methods,
    })
  }

  // Sort evals alphabetically (but put 'default' first if it exists)
  evals.sort((a, b) => {
    if (a.name === 'default') return -1
    if (b.name === 'default') return 1
    return a.name.localeCompare(b.name)
  })

  // Build markdown
  let md = '# Benchmark Comparison\n\n'

  // Check if we have multiple evals
  const hasMultipleEvals = evals.length > 1

  if (hasMultipleEvals) {
    // Table of contents
    md += '## Table of Contents\n\n'
    for (const evalData of evals) {
      const displayName = evalData.name === 'default' ? 'Default' : evalData.name.toUpperCase()
      const anchor = evalData.name.toLowerCase().replace(/\s+/g, '-')
      md += `- [${displayName}](#${anchor})\n`
    }
    md += `- [Overall Summary](#overall-summary)\n`
    md += '\n---\n\n'
  }

  // Generate section for each eval
  for (const evalData of evals) {
    const displayName = evalData.name === 'default' ? 'Default' : evalData.name.toUpperCase()
    const numRuns = evalData.methods[0]?.runs.length || 0

    if (hasMultipleEvals) {
      md += `## ${displayName}\n\n`
    }

    if (numRuns > 1) {
      md += `*Averaged over ${numRuns} runs per method*\n\n`
    }

    md += generateMethodTable(evalData.methods)
    md += '\n'

    if (hasMultipleEvals) {
      md += '### Analysis\n\n'
    } else {
      md += '## Analysis\n\n'
    }

    md += generateMethodAnalysis(evalData.methods)
    md += '\n'

    if (hasMultipleEvals) {
      md += '---\n\n'
    }
  }

  // Overall summary if multiple evals
  if (hasMultipleEvals) {
    md += '## Overall Summary\n\n'

    // Aggregate all runs across evals
    const aggregatedRuns: Record<string, RunData[]> = {}

    for (const evalData of evals) {
      for (const method of evalData.methods) {
        if (!aggregatedRuns[method.key]) {
          aggregatedRuns[method.key] = []
        }
        aggregatedRuns[method.key].push(...method.runs)
      }
    }

    const aggregatedMethods: MethodData[] = []

    for (const [methodKey, runs] of Object.entries(aggregatedRuns)) {
      const name = METHOD_DISPLAY_NAMES[methodKey] || methodKey
      aggregatedMethods.push({
        name,
        key: methodKey,
        runs,
        time_ms: average(runs.map((r) => r.time_ms)),
        cost: average(runs.map((r) => r.cost)),
        turns: Math.round(average(runs.map((r) => r.turns))),
      })
    }

    aggregatedMethods.sort((a, b) => a.time_ms - b.time_ms)

    const totalRuns = aggregatedMethods[0]?.runs.length || 0
    md += `*Aggregated across ${evals.length} evals (${totalRuns} total runs per method)*\n\n`

    md += generateMethodTable(aggregatedMethods)
    md += '\n### Analysis\n\n'
    md += generateMethodAnalysis(aggregatedMethods)
  }

  const outputPath = join(rootDir, 'benchmark-comparison.md')
  await writeFile(outputPath, md)
  console.log(`Generated ${outputPath}`)
  console.log(md)
}

main().catch(console.error)
