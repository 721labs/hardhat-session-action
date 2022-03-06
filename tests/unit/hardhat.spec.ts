import HardHatUtils, { ConfigFileType } from "../../src/hardhat";
import type { SessionConfigMeta } from "../../src/hardhat";

import { expect } from "chai";

import path from "path";
import fs from "fs";

const networkConfig =
  'test:{"url":"https://tcod.app3.dev/v0/instance/test","chainId":1337';

describe("HardhatUtils", () => {
  let jsConfigPath: string;
  let tsConfigPath: string;

  context("#findConfig", () => {
    it("Can parse a js config from a cmd", async () => {
      const cmd = "yarn hardhat test --config sub/test.js --version";
      const parsed = await HardHatUtils.findConfig(cmd);
      expect(parsed).to.equal("sub/test.js");
    });
    it("Can parse a ts config from a cmd", async () => {
      const cmd = "yarn hardhat test --tsconfig test.ts --help";
      const parsed = await HardHatUtils.findConfig(cmd);
      expect(parsed).to.equal("test.ts");
    });
    it("Can parse a config from the filesystem", async () => {
      const cmd = "yarn hardhat test";
      const parsed = await HardHatUtils.findConfig(cmd, ConfigFileType.JS);
      expect(parsed).to.satisfy((path: string) =>
        path.endsWith("/tests/hardhat/hardhat.config.js")
      );
      jsConfigPath = parsed;
    });
    it("Can parse a ts config from the filesystem", async () => {
      const cmd = "yarn hardhat test";
      const parsed = await HardHatUtils.findConfig(cmd, ConfigFileType.TS);
      expect(parsed).to.satisfy((path: string) =>
        path.endsWith("/tests/hardhat/hardhat.config.ts")
      );
      tsConfigPath = parsed;
    });
  });

  context("#writeSessionConfig", () => {
    describe("Updates JS Configs", () => {
      let configPathDir: string;
      let configMeta: SessionConfigMeta;

      before(async () => {
        configPathDir = path.dirname(jsConfigPath);
        configMeta = await HardHatUtils.writeSessionConfig(
          jsConfigPath,
          "test"
        );
      });

      after(() => {
        fs.rmSync(configMeta.path);
      });

      it("Writes the config file", () => {
        expect(configMeta.path).to.equal(
          path.join(configPathDir, "hardhat-session.config.js")
        );
      });

      it("Config contains network config", () => {
        const data = fs.readFileSync(configMeta.path).toString();
        const oneLine = data.replaceAll("\n", "");
        expect(oneLine).to.contain(networkConfig);
      });

      it("Meta contains type", () => {
        expect(configMeta.type).to.equal(ConfigFileType.JS);
      });
    });

    describe("Updates TS Configs", () => {
      let configPathDir: string;
      let configMeta: SessionConfigMeta;

      before(async () => {
        configPathDir = path.dirname(tsConfigPath);
        configMeta = await HardHatUtils.writeSessionConfig(
          tsConfigPath,
          "test"
        );
      });

      after(() => {
        fs.rmSync(configMeta.path);
      });

      it("Writes the config file", () => {
        expect(configMeta.path).to.equal(
          path.join(configPathDir, "hardhat-session.config.ts")
        );
      });

      it("Config contains network config", () => {
        const data = fs.readFileSync(configMeta.path).toString();
        const oneLine = data.replaceAll("\n", "");
        expect(oneLine).to.contain(networkConfig);
      });

      it("Meta contains type", () => {
        expect(configMeta.type).to.equal(ConfigFileType.TS);
      });
    });
  });
});
