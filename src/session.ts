// Libs
import fs from "fs";
import * as core from "@actions/core";
import { restoreCache, saveCache } from "@actions/cache";
import { exec } from "@actions/exec";
import api, { HttpMethod, makeTraceHeader } from "./api";
import axios from "axios";

// Types
import type { AxiosPromise } from "axios";

// Env vars
const { ImageOS, GITHUB_RUN_ID } = process.env;
const runId = parseInt(GITHUB_RUN_ID as string, 10);

class Session {
  private _id?: string;
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

    const id = `hardhatSessionId-${runId}-${ImageOS}-${nodeVersion}`;

    this._cacheId = id;
  }

  private get _cacheFilename() {
    return `./${this._cacheId}.txt`;
  }

  private _validateCacheId() {
    if (this._cacheId === "") {
      throw new Error("session.setup must be called to accessing the cache!");
    } else {
      core.info(`Using Cache: ${this._cacheId}`);
    }
  }

  private async _cacheSessionId(id: string): Promise<void> {
    this._validateCacheId();
    // First write the session id to the filesystem
    fs.writeFileSync(this._cacheFilename, id);
    await saveCache([this._cacheFilename], this._cacheId);
  }

  private async _decacheSessionId(): Promise<string | null> {
    this._validateCacheId();

    // Check cache (originated w/in previous job).
    const cacheKey = await restoreCache([this._cacheFilename], this._cacheId);

    // Read id from file
    if (cacheKey) {
      core.info(`Cache Key: ${cacheKey}`);
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
    try {
      return await api({
        method,
        url: endpoint,
        headers: { ...makeTraceHeader() },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Access to config, request, and response
        core.error(
          JSON.stringify({
            method,
            url: endpoint,
            headers: error.request.headers,
          })
        );
      }
      throw error;
    }
  }

  async setup(): Promise<void> {
    await this._buildCacheId();
  }

  async start(): Promise<void> {
    try {
      // Create a new session
      const { data } = await this._request(HttpMethod.Post, "instance");

      await this._cacheSessionId(data.id);

      this._id = data.id;

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
      this._id = id;
      return true;
    } else {
      core.info("No Session Found");
      return false;
    }
  }
}

export default Session;
