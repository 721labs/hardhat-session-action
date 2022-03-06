import HardHatUtils, { ConfigPreference } from "../../src/hardhat";

import { expect } from "chai";

describe("HardhatUtils", () => {
  context("#_findConfig", () => {
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
      const parsed = await HardHatUtils.findConfig(cmd, ConfigPreference.JS);
      expect(parsed).to.satisfy((path: string) =>
        path.endsWith("/tests/hardhat/hardhat.config.js")
      );
    });
    it("Can parse a ts config from the filesystem", async () => {
      const cmd = "yarn hardhat test";
      const parsed = await HardHatUtils.findConfig(cmd, ConfigPreference.TS);
      expect(parsed).to.satisfy((path: string) =>
        path.endsWith("/tests/hardhat/hardhat.config.ts")
      );
    });
  });
});
