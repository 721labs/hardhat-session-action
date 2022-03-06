import * as core from "@actions/core";
import * as glob from "@actions/glob";
import fs from "fs";
import * as readline from "readline";
import path from "path";

enum ConfigPreference {
  JS = "js",
  TS = "ts",
}

class HardhatUtils {
  public static async findConfig(
    cmd: string,
    preference?: ConfigPreference
  ): Promise<string> {
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
        ) as string;
      } else throw core.setFailed("Unable to parse Hardhat config");
    }
  }

  public static async writeSessionConfig(
    filepath: string,
    sessionId: string
  ): Promise<string> {
    const filetype = filepath.endsWith(ConfigPreference.JS)
      ? ConfigPreference.JS
      : ConfigPreference.TS;

    // Write the session config alongside the existent config
    const configFilePath = path.join(
      path.dirname(filepath),
      `hardhat-session.config.${filetype}`
    );

    // Format the network config
    const sessionNetworkConfig = JSON.stringify({
      [sessionId]: {
        url: `https://tcod.app3.dev/v0/instance/${sessionId}`,
        chainId: 1337,
      },
    })
      .replace('{"test"', "test")
      .replace("}}", "},");

    // Read the file

    const lines: Array<string> = [];

    const reader = readline.createInterface({
      input: fs.createReadStream(filepath),
    });

    reader.on("line", (line: string) => {
      lines.push(line);
      if (line.includes("networks: {")) {
        lines.push(sessionNetworkConfig);
      }
    });

    return new Promise((resolve) => {
      reader.on("close", () => {
        const data = lines.join("\n");
        fs.writeFileSync(configFilePath, data);
        resolve(configFilePath);
      });
    });
  }

  public static async addNetwork(
    cmd: string,
    sessionId: string
  ): Promise<string> {
    const filepath = await HardhatUtils.findConfig(cmd);
    const sessionConfigPath = await HardhatUtils.writeSessionConfig(
      filepath,
      sessionId
    );

    return sessionConfigPath;
  }
}

export default HardhatUtils;
export { ConfigPreference };
