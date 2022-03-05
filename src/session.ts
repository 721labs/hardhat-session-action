import * as core from "@actions/core";

const STATE_ID = "sessionId";

class Session {
  public id?: string;

  async start(): Promise<string> {
    // Create a new session
    // Cache Session ID to job state
    core.saveState(STATE_ID, "");
    // Cache Session ID to artifact cache

    this.id = "";

    core.info("Session Started");

    return this.id;
  }

  async resume(): Promise<boolean> {
    // Check state for a previous session (originated w/in this job).
    let sessionId = core.getState(STATE_ID);
    console.log(sessionId);
    // Check artifact cache for previous session (originated w/in previous job).

    if (false) {
      core.info("Session Resumed");
    } else {
      core.info("No Session Found");
    }

    return false;
  }
}

export default Session;
