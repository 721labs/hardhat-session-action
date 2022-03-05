import core from "@actions/core";
import github from "@actions/github";

try {
  // 1. Validate that the working directory has a hardhat config file
  // 2. Check cache to determine whether a TCOD instance has already been created
  // 2.1 No: Create a TCOD instance
  // 2.2 Yes: Use endpoint from cache
  // 3. Write the TCOD network endpoint to the config.
  console.log("Hello World");
} catch (error) {}
