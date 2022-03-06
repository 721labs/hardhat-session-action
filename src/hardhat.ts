import * as core from "@actions/core";
import * as glob from "@actions/glob";

class HardhatUtils {
  private static async _findConfig(cmd: string) {
    // Check for passed in `--config` or `--tsconfig` flags
    const match = cmd.match(/--(ts)?config\s(?<path>.+)/);
    if (match) return (match?.groups?.path as string).split(" ")[0];
    else {
      // Glob the filesystem
      const patterns = ["hardhat.config.ts", "hardhat.config.js"];
      const globber = await glob.create(patterns.join("\n"));
      const files = await globber.glob();
      if (files) return files[0];
      else throw core.setFailed("Unable to parse Hardhat config");
    }
  }

  public static async updateConfig(cmd: string, sessionId: string) {
    const filepath = await HardhatUtils._findConfig(cmd);
  }
}

export default HardhatUtils;
