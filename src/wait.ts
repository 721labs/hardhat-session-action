import * as core from "@actions/core";
import Session from "./lib/session";

(async () => {
  try {
    await new Session().waitUntilReady(process.env.sessionId as string);
  } catch (error) {
    const message = (error as unknown as any).message as string;
    core.setFailed(message);
  }
})();
