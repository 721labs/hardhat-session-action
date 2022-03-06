// Libs
import fs from "fs";
import * as core from "@actions/core";
import { restoreCache, saveCache } from "@actions/cache";
import { exec } from "@actions/exec";
import api, { HttpMethod, makeTraceHeader, baseAPIConfig } from "./api";
import { delay } from "./utils";
import * as io from "@actions/io";

// Types
import type { AxiosPromise } from "axios";

// Env vars
const { ImageOS, GITHUB_RUN_ID } = process.env;
const runId = parseInt(GITHUB_RUN_ID as string, 10);

const MAX_RETRY_TIMEOUT = 1000 * 20; // wait up to 20s for the session to start

class Session {
  public id?: string = "";
  private _jobId: string = "";

  private _retryTimer: number = 0;

  /**
   * The session is accessible via all jobs of a given matrix-configuration within this workflow.
   * As a result, we need to gather the matrix configuration during setup.
   */
  private async _buildJobMatrix() {
    let nodeVersion = "";

    await exec("node -v", [], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          nodeVersion += data.toString();
        },
      },
    });

    //@ts-ignore
    this._jobId = `${runId}-${ImageOS}-${nodeVersion.replaceAll(".", "_")}`;
  }

  private _validateCacheId() {
    if (this._jobId === "") {
      throw new Error("session.setup must be called to accessing the cache!");
    }
  }

  private get _cachePaths(): Array<string> {
    return [`**/${this._jobId}`];
  }

  private get _cacheDir(): string {
    return `./${this._jobId}`;
  }

  private async _cacheSessionId(id: string): Promise<void> {
    this._validateCacheId();

    // Create cache directory
    await io.mkdirP(this._cacheDir);

    // Write a file to the cache directory
    fs.writeFileSync(`${this._cacheDir}/.exists`, "1");

    // Save the cache directory
    /**
     * Cache ID is used to persist the Session ID between steps and jobs. Because `this._jobId`
     * is deterministic, we can always use it to look up a given Session ID.  To do so, we take
     * advantage of GitHub's `restoreCache` mechanism which allows for fragments to be passed in.
     */
    await saveCache(this._cachePaths, `${this._jobId}--${this.id}`);

    // Delete the cache dir
    await io.rmRF(this._cacheDir);
  }

  private async _decacheSessionId(): Promise<string | null> {
    this._validateCacheId();

    // Restore the cache
    const cacheKey = await restoreCache(
      this._cachePaths,
      this._jobId, // should never hit
      [`${this._jobId}--`]
    );

    return cacheKey ? cacheKey?.split("--")[1] : null;
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
        })
      );
      core.error(JSON.stringify(response));
      throw error;
    }
  }

  async setup(): Promise<void> {
    await this._buildJobMatrix();
  }

  async start(): Promise<void> {
    try {
      // Create a new session
      const { data } = await this._request(HttpMethod.Post, "instance");

      this.id = data.id;

      await this._cacheSessionId(data.id);

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
