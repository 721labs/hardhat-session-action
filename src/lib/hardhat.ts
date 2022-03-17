import * as core from "@actions/core";
import * as glob from "@actions/glob";
import fs from "fs";
import * as readline from "readline";
import path from "path";

enum ConfigFileType {
  JS = "js",
  TS = "ts"
}

type SessionConfigMeta = { path: string; type: ConfigFileType };

class HardhatUtils {
  public static async findConfig(
    cmd: string,
    preference?: ConfigFileType
  ): Promise<string> {
    // Check for passed in `--config` or `--tsconfig` flags
    const match = cmd.match(/--(ts)?config\s(?<path>(\w|\.|\/)+)/);
    if (match) return match?.groups?.path as string;
    else {
      // Glob the filesystem
      // TODO: this is unnecessary with `hardhat-directory`
      const patterns = [
        "**/**/**/hardhat.config.ts",
        "**/**/**/hardhat.config.js",
        "!node_modules"
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
  ): Promise<SessionConfigMeta> {
    const filetype = filepath.endsWith(ConfigFileType.JS)
      ? ConfigFileType.JS
      : ConfigFileType.TS;

    // Write the session config alongside the existent config
    const configFilePath = path.join(
      path.dirname(filepath),
      `hardhat-session.config.${filetype}`
    );

    const sessionNetworkConfig = `"${sessionId}":{url:"https://tcod.app3.dev/api/v0/instance/${sessionId}",chainId:1337},`;

    // Read the file

    const lines: Array<string> = [];

    const reader = readline.createInterface({
      input: fs.createReadStream(filepath)
    });

    reader.on("line", (line: string) => {
      if (line.match(/"?networks"?:\s?{\s?},?/)) {
        lines.push(`networks: {${sessionNetworkConfig}},`);
      } else if (line.includes("networks: {")) {
        lines.push(line);
        // Match the expected indentation
        const indentation = line.split("networks")[0];
        lines.push(`${indentation}${indentation}${sessionNetworkConfig}`);
      } else {
        lines.push(line);
      }
    });

    return new Promise((resolve) => {
      reader.on("close", () => {
        const data = lines.join("\n");
        fs.writeFileSync(configFilePath, data);
        resolve({ path: configFilePath, type: filetype });
      });
    });
  }

  public static async addNetwork(
    cmd: string,
    sessionId: string
  ): Promise<SessionConfigMeta> {
    const filepath = await HardhatUtils.findConfig(cmd);
    const config = await HardhatUtils.writeSessionConfig(filepath, sessionId);

    return config;
  }

  /**
   * If a command contains the `config` or `tsconfig` flag, strip it.
   * @param cmd
   * @returns cmd without config flag.
   */
  public static stripFlags(cmd: string): string {
    let clean: string = cmd;

    // Strip `--config` and `--tsconfig`
    const confMatch = cmd.match(/(?<flag>\s--(ts)?config\s(\w|\.|\/)+)/);
    if (confMatch) {
      const flag = confMatch?.groups?.flag as string;
      clean = clean.replace(flag, "");
    }

    // Strip `--network`
    const netMatch = clean.match(/(?<network>\s--network\s(\w+))/);
    if (netMatch) {
      const network = netMatch?.groups?.network as string;
      clean = clean.replace(network, "");
    }

    return clean;
  }
}

export default HardhatUtils;
export { ConfigFileType };
export type { SessionConfigMeta };
