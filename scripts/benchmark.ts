#!/usr/bin/env bun

import { join, dirname } from "path";
import { mkdir, exists } from "fs/promises";
import { resetDev } from "./reset";

const SCRIPT_DIR = dirname(import.meta.path);
const ROOT_DIR = join(SCRIPT_DIR, "..");

const RUNS = 3;
const OUTPUT_DIR = join(ROOT_DIR, "benchmark-results");
const CLAUDE_PATH = "/Users/sawyerhood/.claude/local/claude";

interface TestCase {
  name: string;
  directory?: string;
  prompt: (methodInstruction: string) => string;
  reset?: () => Promise<void>;
}

const TEST_CASES: Record<string, TestCase> = {
  "game-tracker": {
    name: "game-tracker",
    directory: join(ROOT_DIR, "game-tracker"),
    prompt: (instruction) =>
      `Start the dev server and ${instruction} to create an account (with a unique and secure email and password), login, add 5 games (rate them all a 9), and view the collection. think`,
    reset: resetDev,
  },
};

type Method = "dev-browser" | "playwright-skill" | "playwright-mcp";

const METHODS: Record<Method, string> = {
  "dev-browser": "use the dev browser",
  "playwright-skill": "use the playwright skill",
  "playwright-mcp": "use playwright mcp",
};

interface PluginConfig {
  enabledPlugins: Record<string, boolean>;
  allowedMcpServers?: Array<{ serverName?: string; serverCommand?: string[] }>;
}

interface McpConfig {
  mcpServers: Record<string, { type: string; command: string; args: string[] }>;
}

const METHOD_CONFIGS: Record<
  Method,
  { plugins: PluginConfig; mcp: McpConfig }
> = {
  "dev-browser": {
    plugins: {
      enabledPlugins: {
        "dev-browser@dev-browser-marketplace": true,
        "playwright-skill@playwright-skill": false,
        "example-skills@anthropic-agent-skills": false,
      },
    },
    mcp: { mcpServers: {} },
  },
  "playwright-skill": {
    plugins: {
      enabledPlugins: {
        "dev-browser@dev-browser-marketplace": false,
        "playwright-skill@playwright-skill": true,
        "example-skills@anthropic-agent-skills": true,
      },
    },
    mcp: { mcpServers: {} },
  },
  "playwright-mcp": {
    plugins: {
      enabledPlugins: {
        "dev-browser@dev-browser-marketplace": false,
        "playwright-skill@playwright-skill": false,
        "example-skills@anthropic-agent-skills": false,
      },
      allowedMcpServers: [{ serverName: "playwright" }],
    },
    mcp: {
      mcpServers: {
        playwright: {
          type: "stdio",
          command: "npx",
          args: ["-y", "@playwright/mcp@latest"],
        },
      },
    },
  },
};

async function configureMethod(
  method: Method,
  testCase: TestCase
): Promise<void> {
  const config = METHOD_CONFIGS[method];
  const dir = testCase.directory || ROOT_DIR;
  const settingsFile = join(dir, ".claude", "settings.local.json");
  const mcpFile = join(dir, ".mcp.json");

  // Ensure .claude directory exists
  await mkdir(join(dir, ".claude"), { recursive: true });

  // Write settings and MCP config
  await Bun.write(settingsFile, JSON.stringify(config.plugins, null, 2));
  await Bun.write(mcpFile, JSON.stringify(config.mcp, null, 2));

  console.log(`Configured for method: ${method}`);
}

async function resetIfNeeded(testCase: TestCase): Promise<void> {
  if (testCase.reset) {
    await testCase.reset();
  }
}

async function runBenchmark(
  method: Method,
  instruction: string,
  run: number,
  testCase: TestCase
): Promise<void> {
  const outputPath = join(
    OUTPUT_DIR,
    `${testCase.name}-${method}-run${run}.jsonl`
  );
  const prompt = testCase.prompt(instruction);
  const dir = testCase.directory || ROOT_DIR;
  const mcpFile = join(dir, ".mcp.json");

  const outputFile = Bun.file(outputPath);
  const writer = outputFile.writer();

  // Build command args
  const args = [
    CLAUDE_PATH,
    "-p",
    prompt,
    "--dangerously-skip-permissions",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  // Add MCP config if method has MCP servers
  const config = METHOD_CONFIGS[method];
  if (Object.keys(config.mcp.mcpServers).length > 0) {
    args.push("--mcp-config", mcpFile);
  }

  const proc = Bun.spawn(args, {
    cwd: dir,
    stdout: "pipe",
    stderr: "inherit",
  });

  // Stream output to both console and file
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    process.stdout.write(text);
    writer.write(text);
  }

  writer.end();
  await proc.exited;
}

function printUsage(): void {
  console.log("Usage: bun run scripts/benchmark.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  --test-case <name>   Run specific test case (default: all)");
  console.log("  --method <name>      Run specific method (default: all)");
  console.log("");
  console.log(`Available test cases: ${Object.keys(TEST_CASES).join(", ")}`);
  console.log(`Available methods: ${Object.keys(METHODS).join(", ")}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let methodsToRun: Method[];
  let testCasesToRun: TestCase[];

  // Parse arguments
  let testCaseArg: string | undefined;
  let methodArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--test-case" && args[i + 1]) {
      testCaseArg = args[++i];
    } else if (args[i] === "--method" && args[i + 1]) {
      methodArg = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  // Determine which test cases to run
  if (testCaseArg) {
    if (!(testCaseArg in TEST_CASES)) {
      console.error(`Unknown test case: ${testCaseArg}`);
      console.error(
        `Available test cases: ${Object.keys(TEST_CASES).join(", ")}`
      );
      process.exit(1);
    }
    testCasesToRun = [TEST_CASES[testCaseArg]];
  } else {
    testCasesToRun = Object.values(TEST_CASES);
  }

  // Determine which methods to run
  if (methodArg) {
    if (!(methodArg in METHODS)) {
      console.error(`Unknown method: ${methodArg}`);
      console.error(`Available methods: ${Object.keys(METHODS).join(", ")}`);
      process.exit(1);
    }
    methodsToRun = [methodArg as Method];
  } else {
    methodsToRun = Object.keys(METHODS) as Method[];
  }

  // Check if test case directories exist
  for (const testCase of testCasesToRun) {
    if (testCase.directory && !(await exists(testCase.directory))) {
      console.error(
        `Error: ${testCase.name} directory not found at ${testCase.directory}`
      );
      console.error(
        "Run ./setup.sh first to set up the required repositories."
      );
      process.exit(1);
    }
  }

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const testCase of testCasesToRun) {
    console.log("");
    console.log(`======= Test Case: ${testCase.name} =======`);

    for (const method of methodsToRun) {
      console.log("");
      console.log(`=== Running benchmark for: ${method} ===`);
      const instruction = METHODS[method];

      // Configure plugins and MCPs for this method
      await configureMethod(method, testCase);

      for (let run = 1; run <= RUNS; run++) {
        console.log(
          `--- Run ${run} of ${RUNS} for ${testCase.name}/${method} ---`
        );

        await resetIfNeeded(testCase);
        await runBenchmark(method, instruction, run, testCase);

        console.log("");
        console.log(
          `Saved: ${OUTPUT_DIR}/${testCase.name}-${method}-run${run}.jsonl`
        );
      }
    }
  }

  console.log("");
  console.log("=== All benchmarks complete ===");
  console.log(
    "Run 'bun run scripts/generate-benchmark.ts' to generate comparison report"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
