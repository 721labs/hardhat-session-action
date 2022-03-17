# Hardhat Session GitHub Action

[![CI](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml/badge.svg)](https://github.com/721labs/hardhat-session-action/actions/workflows/ci.yml)

GitHub Action for running your Hardhat tests in a dedicated, session-lived container.

Once created, a session is accessible via all jobs for a given matrix-configuration within a workflow.

### Usage

```yaml
# Set the output of the start session step in order to make it available in downstream jobs.
outputs:
  session-id: ${{ steps.start-session.outputs.session-id }}
  session-endpoint: ${{ steps.start-session.outputs.session-endpoint }}
steps:
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
      # e.g. Started in same job, previous step: `${{ steps.previously-started-session.outputs.session-id }}`
      # e.g. Started in previous job: `${{ needs.test-action-new-session.outputs.session-id }}`
      # Type: String
      # Required: False
      session-id: ""
      # Directory containing your Hardhat project if it's not contained within root.
      # Note that the action does not read job.defaults.run.working_directory.
      # If `hardhat-directory` is set, it's unnecessary to pass `--config` within `cmd`.
      # Type: String
      # Required: False
      hardhat-directory: ""
```

#### Inputs

| id                  | type   | required | default | description                                                                                                                                                                |
| ------------------- | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmd`               | string | true     | null    | Hardhat command to run, including flags                                                                                                                                    |
| `session-id`        | string | false    | null    | To resume a session, pass in the session id                                                                                                                                |
| `hardhat-directory` | string | false    | null    | If Hardhat project is not within root (for example if you use a nested-package directory structure), the relative path to the directory that contains your Hardhat project |

#### Ouputs

| id                 | type   | description                                                                                                            |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `session-id`       | string | The ID for a newly started session. Useful for resuming previous sessions.                                             |
| `session-endpoint` | string | The JSON RPC endpoint for a newly created session. Useful for passing into subsequent tests to create an HTTP Provider |

#### Example Workflow

##### .github/workflows/tests.yml

```yaml
name: Tests
jobs:
  contract-migrations:
    name: "Contract Migration Tests"
    outputs:
      session-endpoint: ${{ steps.migration-00.outputs.session-endpoint }}
    steps:
      - uses: actions/checkout@master
      - uses: actions/setup-node@v2
      - run: "yarn install --frozen-lockfile --dev"
      - run: "yarn hardhat compile"
      - name: "Run Migration:00"
        id: migration-00
        uses: 721labs/hardhat-session-action@latest
        with:
          cmd: "migration:00"
          hardhat-directory: ./packages/contracts
      - name: "Run Migration:01"
        uses: 721labs/hardhat-session-action@latest
        with:
          cmd: "migration:01"
          session-id: ${{ steps.migration-00.outputs.session-id }}
          hardhat-directory: ./packages/contracts
  unit:
    name: "Unit Tests"
    needs: [contract-migrations]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: "yarn install --frozen-lockfile --dev"
      - run: "mocha"
        env:
          CHAIN_ENDPOINT: ${{ needs.contract-migrations.outputs.session-endpoint }}
```

##### tests/web3.spec.ts

```typescript
import Web3 from "web3";

let web3: Web3;

describe("Web3", () => {
  before(() => {
    web3 = new Web3(process.env.CHAIN_ENDPOINT as string);
  });

  // ... your tests ...
});
```
