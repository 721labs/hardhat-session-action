import * as core from "@actions/core";
import * as glob from "@actions/glob";

enum ConfigPreference {
  JS = "js",
  TS = "ts",
}

class HardhatUtils {
  public static async findConfig(cmd: string, preference?: ConfigPreference) {
    // Check for passed in `--config` or `--tsconfig` flags
    const match = cmd.match(/--(ts)?config\s(?<path>.+)/);
    if (match) return (match?.groups?.path as string).split(" ")[0];
    else {
      // Glob the filesystem
      const patterns = [
        "**/**/**/hardhat.config.ts",
        "**/**/**/hardhat.config.js",
        "!node_modules",
      ];
      const globber = await glob.create(patterns.join("\n"));
      const files = await globber.glob();
      if (files) {
        return files.find((filename) =>
          preference ? filename.endsWith(preference) : filename
        );
      } else throw core.setFailed("Unable to parse Hardhat config");
    }
  }

  public static async updateConfig(cmd: string, sessionId: string) {
    const filepath = await HardhatUtils.findConfig(cmd);
  }
}

export default HardhatUtils;
export { ConfigPreference };
