// Libs
import fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as github from "@actions/github";
import { exec } from "@actions/exec";
import api, { HttpMethod, makeTraceHeader } from "./api";

// Types
import type { AxiosPromise } from "axios";

const { ImageOS } = process.env;

class Session {
  public id?: string;

  private _cacheId: string = "";

  /**
   * The session is accessible via all jobs of a given matrix-configuration within this workflow.
   */
  private async _buildCacheId() {
    let nodeVersion = "";

    await exec("node -v", [], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          nodeVersion += data.toString();
        },
      },
    });

    const id = `hardhatSessionId-${github.context.runId}-${ImageOS}-${nodeVersion}`;

    core.info(`Session: ${id}`);

    this._cacheId = id;
  }

  private get _cacheFilename() {
    return `${this._cacheId}.txt`;
  }

  private async _cacheSessionId(id: string): Promise<void> {
    // First write the session id to the filesystem
    fs.writeFileSync(this._cacheFilename, id);

    await cache.saveCache([this._cacheFilename], this._cacheId);
  }

  private async _decacheSessionId(): Promise<string | null> {
    // Check cache (originated w/in previous job).
    const cacheKey = await cache.restoreCache(
      [this._cacheFilename],
      this._cacheId
    );

    // Read id from file
    if (cacheKey) {
      const data = fs.readFileSync(this._cacheFilename, "utf-8");
      return data;
    } else {
      return null;
    }
  }

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

  async setup(): Promise<void> {
    await this._buildCacheId();
  }

  async start(): Promise<void> {
    try {
      // Create a new session
      const { data } = await this._request(HttpMethod.Post, "instance");

      await this._cacheSessionId(data.id);

      this.id = data.id;

      core.info(`Session Started: ${data.id}`);
    } catch (error) {
      core.error("Unable to start session");
      throw error;
    }
  }

  async resume(): Promise<boolean> {
    const id = await this._decacheSessionId();
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
