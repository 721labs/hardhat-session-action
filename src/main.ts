import * as core from "@actions/core";
import github from "@actions/github";
import { exec } from "@actions/exec";

(async () => {
  try {
    // Validate that the working directory has a hardhat config file

    // Validate that the given arg is a valid Hardhat cmd
    const cmd = core.getInput("cmd");
    console.log(`$ yarn hardhat ${cmd}`);
    await exec("yarn", ["hardhat", cmd, "--help"]);

    // 2. Check cache to determine whether a TCOD instance has already been created; alternative check https://github.com/actions/toolkit/tree/main/packages/core
    // 2.1 No: Create a TCOD instance
    // 2.2 Yes: Use endpoint from cache
    // 3. Write the TCOD network endpoint to the config.
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
