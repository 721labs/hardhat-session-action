# Hardhat Session GitHub Action

[![CI](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml/badge.svg)](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml)

GitHub Action for running your Hardhat tests in a dedicated, session-lived container.

Once created, a session is accessible via all jobs for a given matrix-configuration within a workflow.

### Usage

```yaml
- uses: 721labs/hardhat-session-action@master
  with:
    # The Hardhat command you want to run within the session container.
    # For example:
    # $ npx hardhat <cmd>
    # Type: String
    # Required: True
    cmd: test --config ./tests/hardhat/hardhat.config.js
    # Start a new session or attempt to resume the previous session?
    # Type: Boolean
    # Required: False
    # Default: false
    fresh: true
```
