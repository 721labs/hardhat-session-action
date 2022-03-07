import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as io from "@actions/io";

import Session from "./session";
import HardhatUtils, { ConfigFileType } from "./hardhat";

(async () => {
  try {
    // Validate that command is being run within a Hardhat project and that
    // it is a valid command.
    const cmd = core.getInput("cmd", { required: true });

    // First check against known commands.

    if (cmd.includes("node")) {
      core.warning("This has no effect: session node is already running");
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

    // Then check against user-defined commands.

    try {
      // DEV: List the valid commands
      await exec("ls");
      await exec(`yarn hardhat --help`);
      await exec(`yarn hardhat ${cmd} --help`, [], { silent: true });
    } catch (error) {
      core.setFailed(`Invalid Command: yarn hardhat ${cmd}`);
      return;
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

    // Write the session Hardhat config
    const configMeta = await HardhatUtils.addNetwork(cmd, session.id as string);

    const cleanCmd = HardhatUtils.stripFlags(cmd);

    // Block until the new session is ready to go
    await session.waitUntilReady();

    // Run command against the network
    const configFlag =
      configMeta.type === ConfigFileType.JS ? "config" : "tsconfig";
    await exec(
      `yarn hardhat ${cleanCmd} --${configFlag} ${configMeta.path} --network ${session.id}`
    );

    // Clean up
    await io.rmRF(configMeta.path);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
