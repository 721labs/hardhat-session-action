// Libs
import fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as github from "@actions/github";
import api, { HttpMethod, makeTraceHeader } from "./api";

// Types
import type { AxiosPromise } from "axios";

// Constants

// The session is accessible via all jobs within this workflow run,
// but cannot be accessed in subsequent or parallel workflows.
const STATE_ID = `hardhatSessionId-${github.context.runId}`;

// Helper Functions
async function cacheSessionId(id: string): Promise<void> {
  // Write Session ID to job state
  core.saveState(STATE_ID, id);

  // Write Session ID to cache

  // First write the session id to the filesystem
  const filename = `${STATE_ID}.txt`;
  fs.writeFileSync(filename, id);

  await cache.saveCache([filename], STATE_ID);
}

async function decacheSessionId(): Promise<string | null> {
  // Check job state (originated w/in this job).
  let sessionId = core.getState(STATE_ID);
  if (sessionId) return sessionId;

  // Check cache (originated w/in previous job).
  const filename = `${STATE_ID}.txt`;
  const cacheKey = await cache.restoreCache([filename], STATE_ID);

  // Read id from file
  if (cacheKey) {
    const data = fs.readFileSync(filename, "utf-8");
    return data;
  } else {
    return null;
  }
}

class Session {
  public id?: string;

  private async _request(
    method: HttpMethod,
    endpoint: string
  ): Promise<AxiosPromise> {
    return await api({
      method,
      url: endpoint,
      headers: { ...makeTraceHeader() },
    });
  }

  async start(): Promise<void> {
    try {
      // Create a new session
      const { data } = await this._request(HttpMethod.Post, "instance");

      await cacheSessionId(data.id);

      this.id = data.id;

      core.info(`Session Started: ${data.id}`);
    } catch (error) {
      core.error("Unable to start session");
      throw error;
    }
  }

  async resume(): Promise<boolean> {
    const id = await decacheSessionId();
    if (!!id) {
      core.info(`Session Resumed: ${id}`);
      this.id = id;
    } else {
      core.info("No Session Found");
    }

    return false;
  }
}

export default Session;
