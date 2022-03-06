import * as core from "@actions/core";
import { exec } from "@actions/exec";

import Session from "./session";

(async () => {
  try {
    // Validate that command is being run within a Hardhat project and that
    // it is a valid command.
    const cmd = core.getInput("cmd", { required: true });
    try {
      await exec(`yarn hardhat ${cmd} --help`, [], { silent: true });
    } catch (error) {
      core.setFailed(`Invalid Command: yarn hardhat ${cmd}`);
      return;
    }

    // Check whether the command requires a session; if not, warn.
    const unnecessary = ["check", "clean", "compile", "flatten", "help"];
    for (const unnecessaryCmd of unnecessary) {
      if (cmd.includes(unnecessaryCmd)) {
        core.warning("Command does not require session");
        return;
      }
    }

    const session = new Session();
    await session.setup();

    // Resume or start new session.
    if (
      // Start a fresh session?
      core.getBooleanInput("fresh", { required: false }) ||
      // Resume a previous session?
      !(await session.resume())
    ) {
      await session.start();
    }

    // Write endpoint to Hardhat Config
    const networkId = `session-${session.id}`;
    // Check for passed in `--config` or `--tsconfig` flags
    // Check default location (`./hardhat.config.js`)

    // Block until the new session is ready to go
    await session.waitUntilReady();

    // Run command against the network
    //await exec(`yarn hardhat ${cmd} --network ${networkId}`);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
