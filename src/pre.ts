/**
 * Validates that a given Hardhat command is valid.
 */
import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

(async () => {
  try {
    // Validate that the current directory contains a package.json file
    // i.e. that it's the Hardhat project directory.
    const globber = await glob.create("package.json", {
      followSymbolicLinks: false
    });
    const files = await globber.glob();
    if (!files) {
      throw {
        message: "Action must be run within your Hardhat project"
      };
    }

    // Validate that command is being run within a Hardhat project and that
    // it is a valid command.
    const cmd = core.getInput("cmd", { required: true });

    // First check against known commands.

    if (cmd.includes("node")) {
      throw {
        message: "cmd `node` no effect: session node is already running"
      };
    }

    // Check whether the command requires a session; if not, warn.
    const unnecessary = ["check", "clean", "compile", "flatten", "help"];
    for (const unnecessaryCmd of unnecessary) {
      if (cmd.includes(unnecessaryCmd)) {
        throw {
          message: "Command does not require session"
        };
      }
    }

    // Then check against user-defined commands.

    try {
      await exec(`yarn hardhat ${cmd} --help`, [], { silent: true });
    } catch (error) {
      throw {
        message: `Invalid Command: yarn hardhat ${cmd}`
      };
    }
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
