import * as core from "@actions/core";
import HardhatUtils from "./lib/hardhat";

(async () => {
  try {
    const sessionId = process.env.sessionId as string;
    const cmd = process.env.cmd as string;

    // Write the session Hardhat config
    const configMeta = await HardhatUtils.addNetwork(cmd, sessionId as string);

    core.setOutput("clean-cmd", HardhatUtils.stripFlags(cmd));
    core.setOutput("config-path", configMeta.path);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
