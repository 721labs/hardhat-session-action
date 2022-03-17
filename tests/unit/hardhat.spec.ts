import HardHatUtils, { ConfigFileType } from "../../src/lib/hardhat";
import type { SessionConfigMeta } from "../../src/lib/hardhat";

import { expect } from "chai";

import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

describe("HardhatUtils", () => {
  let jsConfigPath: string;
  let tsConfigPath: string;

  context("#stripFlags", () => {
    it("strips --config", () => {
      expect(
        HardHatUtils.stripFlags(
          "yarn hardhat test --config subdir/hardhat.config.js"
        )
      ).to.equal("yarn hardhat test");
    });

    it("does not strip when {--config|--network} is absent", () => {
      expect(HardHatUtils.stripFlags("yarn hardhat --version")).to.equal(
        "yarn hardhat --version"
      );
    });

    it("strips --network", () => {
      expect(
        HardHatUtils.stripFlags("yarn hardhat node --network localhost")
      ).to.equal("yarn hardhat node");
    });

    it("strips multiple flags simultaneously (e.g. `--config && --network`)", () => {
      expect(
        HardHatUtils.stripFlags(
          "yarn hardhat node --network localhost --config hardhat.config.ts"
        )
      ).to.equal("yarn hardhat node");
    });
  });

  context("#findConfig", () => {
    it("Can parse a js config from a cmd", async () => {
      const cmd = "yarn hardhat test --config sub/test.js --version";
      const parsed = await HardHatUtils.findConfig(cmd);
      expect(parsed).to.equal("sub/test.js");
    });
    it("Can parse a ts config from a cmd", async () => {
      const cmd = "yarn hardhat test --config test.ts --help";
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
      let networkConfig: string;

      before(async () => {
        const sessionId = randomUUID().split("-")[0];
        networkConfig = `"${sessionId}":{url:"https://tcod.app3.dev/api/v0/instance/${sessionId}",chainId:1337},`;

        configPathDir = path.dirname(jsConfigPath);
        configMeta = await HardHatUtils.writeSessionConfig(
          jsConfigPath,
          sessionId
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
      let networkConfig: string;

      before(async () => {
        const sessionId = randomUUID().split("-")[0];
        networkConfig = `"${sessionId}":{url:"https://tcod.app3.dev/api/v0/instance/${sessionId}",chainId:1337},`;

        configPathDir = path.dirname(tsConfigPath);
        configMeta = await HardHatUtils.writeSessionConfig(
          tsConfigPath,
          sessionId
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
