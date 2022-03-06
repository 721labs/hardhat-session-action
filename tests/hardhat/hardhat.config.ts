import "@nomiclabs/hardhat-truffle5";

import "./custom-task.js";

export default {
  // Includes some unused data for testing that it's maintained when
  // the session network config is written.
  solidity: "0.8.10",
  networks: {
    hardhat: {
      chainId: 1337
    }
  },
  paths: {
    tests: "./tests"
  }
};
