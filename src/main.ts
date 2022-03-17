import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as io from "@actions/io";

import Session from "./lib/session";
import HardhatUtils, { ConfigFileType } from "./lib/hardhat";

(async () => {
  try {
    const session = new Session();
    const id = await session.start();
    core.setOutput("session-id", id);

    //await session.setup();

    // Resume or start new session.
    // if (
    //   // Start a fresh session?
    //   core.getBooleanInput("fresh", { required: false }) ||
    //   // Resume a previous session?
    //   !(await session.resume())
    // ) {
    //   await session.start();
    // }

    // TODO: Move next into separate file

    // const cmd = core.getInput("cmd", { required: true });

    // // Write the session Hardhat config
    // const configMeta = await HardhatUtils.addNetwork(cmd, session.id as string);

    // const cleanCmd = HardhatUtils.stripFlags(cmd);

    // // Block until the new session is ready to go
    // await session.waitUntilReady();

    // // Run command against the network
    // const configFlag =
    //   configMeta.type === ConfigFileType.JS ? "config" : "tsconfig";
    // await exec(
    //   `yarn hardhat ${cleanCmd} --${configFlag} ${configMeta.path} --network ${session.id}`
    // );

    // // Clean up
    // await io.rmRF(configMeta.path);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
