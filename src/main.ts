import * as core from "@actions/core";
import Session from "./lib/session";

(async () => {
  try {
    const session = new Session();
    const id = await session.start();
    core.setOutput("session-id", id);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
