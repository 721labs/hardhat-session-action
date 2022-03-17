const { task } = require("hardhat/config");

task("hello-world", "Prints `Hello World`").setAction(() => {
  console.log("Hello World");
});

module.exports = {
  solidity: "0.8.10",
  networks: {}
};
