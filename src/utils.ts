import * as core from "@actions/core";
import * as glob from "@actions/glob";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateHardhatConfig(cmd: string, sessionId: string) {
  let filepath: string;

  // Check for passed in `--config` or `--tsconfig` flags
  const match = cmd.match(/--(ts)?config\s(?<path>.+)/);
  if (match) filepath = (match?.groups?.path as string).split(" ")[0];
  else {
    // Glob the filesystem
    const patterns = ["hardhat.config.ts", "hardhat.config.js"];
    const globber = await glob.create(patterns.join("\n"));
    const files = await globber.glob();
    if (files) filepath = files[0];
    else throw core.setFailed("Unable to parse Hardhat config");
  }

  core.info(`Using Hardhat config: ${filepath}`);
}

export { delay, updateHardhatConfig };