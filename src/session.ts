// Libs
import fs from "fs";
import * as core from "@actions/core";
import { restoreCache, saveCache } from "@actions/cache";
import { exec } from "@actions/exec";
import api, { HttpMethod, makeTraceHeader, baseAPIConfig } from "./api";
import { delay } from "./utils";

// Types
import type { AxiosPromise } from "axios";

// Env vars
const { ImageOS, GITHUB_RUN_ID } = process.env;
const runId = parseInt(GITHUB_RUN_ID as string, 10);

const MAX_RETRY_TIMEOUT = 1000 * 20; // wait up to 20s for the session to start

class Session {
  public id?: string;
  private _cacheId: string = "";

  private _retryTimer: number = 0;

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

    this._cacheId = `${runId}-${ImageOS}-${nodeVersion}`;
  }

  private _validateCacheId() {
    if (this._cacheId === "") {
      throw new Error("session.setup must be called to accessing the cache!");
    } else {
      core.info(`Using Cache: ${this._cacheId}`);
    }
  }

  private get _cacheFilePath(): string {
    return `${this._cacheId}-${this.id}`;
  }

  private async _cacheSessionId(id: string): Promise<void> {
    this._validateCacheId();
    // First write the session id to the filesystem
    fs.writeFileSync(this._cacheFilePath, id);
    await saveCache([this._cacheFilePath], this._cacheFilePath);
  }

  private async _decacheSessionId(): Promise<string | null> {
    this._validateCacheId();

    // Check cache (originated w/in previous job).
    const cacheKey = await restoreCache([this._cacheFilePath], "", [
      this._cacheFilePath,
    ]);
    core.info(`CACHE HIT: ${cacheKey}`);

    // Read id from file
    // TODO: Reading from the cache isn't working.
    if (cacheKey) {
      await exec("ls"); // DEV:
      const data = fs.readFileSync(this._cacheId, "utf-8");
      return data;
    } else {
      return null;
    }
  }

  private async _request(
    method: HttpMethod,
    endpoint: string
  ): Promise<AxiosPromise> {
    const headers = { ...makeTraceHeader() };
    try {
      return await api({
        method,
        url: endpoint,
        headers,
      });
    } catch (error) {
      const response = (error as unknown as any).response;
      core.error(
        JSON.stringify({
          request: {
            method,
            host: baseAPIConfig.baseURL,
            endpoint: endpoint,
            headers: { ...headers, ...baseAPIConfig.headers },
          },
          response: {
            status: response.statusCode,
            headers: response.headers,
          },
        })
      );
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
      return true;
    } else {
      core.info("No Session Found");
      return false;
    }
  }

  async waitUntilReady(): Promise<void> {
    const { data } = await this._request(
      HttpMethod.Get,
      `instance/${this.id}/status`
    );
    core.info(`Session Status: ${data.status}`);
    if (data.status === "Ready") return;
    else if (data.status === "Swept") {
      // TODO: Do a better job handling.
      throw new Error("Session Swept");
    } else {
      if (this._retryTimer < MAX_RETRY_TIMEOUT) {
        await delay(3000);
        this._retryTimer += 3000;
        await this.waitUntilReady();
      } else {
        // TODO: Do a better job handling.
        throw new Error("Session took to long to ready");
      }
    }
  }
}

export default Session;
