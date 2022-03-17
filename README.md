# Hardhat Session GitHub Action

[![CI](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml/badge.svg)](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml)

GitHub Action for running your Hardhat tests in a dedicated, session-lived container.

Once created, a session is accessible via all jobs for a given matrix-configuration within a workflow.

### Usage

```yaml
- uses: 721labs/hardhat-session-action@main
  id: start-session
  with:
    # The Hardhat command, including flags, you wish to run within the session container.
    # For example:
    # $ npx hardhat <cmd>
    # $ npx hardhat run test --show-stack-traces --verbose
    #
    # Note that some commands such as `node` as well as the
    # `--network` flag are unnecessary.
    #
    # Type: String
    # Required: True
    cmd: ""
    # ID of session to resume; acquired through a previous output.
    # e.g. `${{ steps.start-session.outputs.session-id }}`
    # Type: String
    # Required: False
    session-id: ""
    # Directory containing your Hardhat project if not the root dir.
    # Note that the action does not read job.defaults.run.working_directory.
    # Type: String
    # Required: False
    working-directory: ""
```
