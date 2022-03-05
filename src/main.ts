import * as core from "@actions/core";
import github from "@actions/github";
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

    const freshSession = core.getBooleanInput("fresh", { required: false });
    if (freshSession) {
      await session.start();
    } else {
      // If neither of these exist, create a new session.
      const resumed = await session.resume();
      if (!resumed) {
        await session.start();
      }
    }

    // 2. Check cache to determine whether a TCOD instance has already been created; alternative check https://github.com/actions/toolkit/tree/main/packages/core
    // 2.1 No: Create a TCOD instance
    // 2.2 Yes: Use endpoint from cache
    // 3. Write the TCOD network endpoint to the config.
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
