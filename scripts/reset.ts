import { $ } from "bun";
import { join, dirname } from "path";
import { rm, exists } from "fs/promises";

const SCRIPT_DIR = dirname(import.meta.path);
const ROOT_DIR = join(SCRIPT_DIR, "..");
const GAME_TRACKER_DIR = join(ROOT_DIR, "game-tracker");

const DEV_PORTS = [3000, 9222, 9223];

async function killProcessOnPort(port: number): Promise<void> {
  try {
    const result = await $`lsof -ti :${port}`.quiet().text();
    const pid = result.trim();
    if (pid) {
      console.log(`Killing process ${pid} on port ${port}`);
      await $`kill -9 ${pid}`.quiet();
    } else {
      console.log(`No process found on port ${port}`);
    }
  } catch {
    console.log(`No process found on port ${port}`);
  }
}

async function killDevProcesses(): Promise<void> {
  console.log(`Killing processes on ports ${DEV_PORTS.join(", ")}...`);
  for (const port of DEV_PORTS) {
    await killProcessOnPort(port);
  }
}

async function clearTmp(): Promise<void> {
  console.log("");
  console.log("Clearing /tmp directory...");
  try {
    await $`rm -rf /tmp/*`.quiet();
  } catch {
    // Ignore errors from rm
  }
}

export async function resetDb(): Promise<void> {
  console.log("");
  console.log("Resetting database...");

  if (!(await exists(GAME_TRACKER_DIR))) {
    throw new Error(`game-tracker directory not found at ${GAME_TRACKER_DIR}`);
  }

  console.log("Removing existing database...");
  const dbPath = join(GAME_TRACKER_DIR, "dev.db");
  try {
    await rm(dbPath);
  } catch {
    // File might not exist
  }

  console.log("Recreating database with schema...");
  await $`bun run db:push`.cwd(GAME_TRACKER_DIR).quiet();

  console.log("Database reset complete!");
}

export async function resetDev(): Promise<void> {
  await killDevProcesses();
  await clearTmp();
  await resetDb();
  console.log("");
  console.log("Development environment reset complete!");
}

export async function resetDevWithoutDb(): Promise<void> {
  await killDevProcesses();
  await clearTmp();
  console.log("");
  console.log("Development environment reset complete (without db)!");
}
