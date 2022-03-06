const { task } = require("hardhat/config");

module.exports = task("hsa:print", "Prints a given message")
  .addParam("message", "Your message")
  .setAction(({ message }, hre) => {
    console.log("Network: ", hre.network.name);
    console.log("Message: ", message);
  });
