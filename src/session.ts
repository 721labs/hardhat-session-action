// Libs
import fs from "fs";
import * as core from "@actions/core";
import { restoreCache, saveCache } from "@actions/cache";
import { exec } from "@actions/exec";
import api, { HttpMethod, makeTraceHeader, baseAPIConfig } from "./api";
import { delay } from "./utils";
import * as io from "@actions/io";
import * as glob from "@actions/glob";

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

    this._jobId = `${runId}-${ImageOS}-${nodeVersion}`;
  }

  private _validateCacheId() {
    if (this._jobId === "") {
      throw new Error("session.setup must be called to accessing the cache!");
    }
  }

  /**
   * Cache ID is used to persist the Session ID between steps and jobs. Because `this._jobId`
   * is deterministic, we can always use it to look up a given Session ID.  To do so, we take
   * advantage of GitHub's `restoreCache` mechanism which allows for fragments to be passed in.
   */
  private get _cacheKey(): string {
    //@ts-ignore
    return `${this._jobId}`.replaceAll(".", "_");
  }

  private get _cachePaths(): Array<string> {
    return [`**/${this._cacheKey}`];
  }

  private get _cacheDir(): string {
    return `./${this._cacheKey}`;
  }

  private async _cacheSessionId(id: string): Promise<void> {
    this._validateCacheId();

    // Create cache directory
    await io.mkdirP(this._cacheDir);

    // Write the session id to the cache directory
    fs.writeFileSync(`${this._cacheDir}/${id}`, id);

    // Save the cache directory
    await saveCache(this._cachePaths, this._cacheKey);

    // Delete the cache dir
    await io.rmRF(this._cacheDir);
  }

  private async _decacheSessionId(): Promise<string | null> {
    this._validateCacheId();

    // Create cache directory
    console.log("\nBEFORE mkdirP");
    await exec("ls -l\n");
    await io.mkdirP(this._cacheDir);
    console.log("\nAFTER mkdirP");
    await exec("ls -l\n");

    // Restore the cache
    const cacheKey = await restoreCache(this._cachePaths, this._cacheKey);

    console.log(`\nCACHE KEY: ${cacheKey}`);

    // DEV: View the contents of the cache
    console.log("\nAFTER restoreCache");
    await exec("ls -l");

    console.log("\nInside of Cache Dir:");
    await exec(`ls ${cacheKey}`);

    // const globber = await glob.create(`${cacheKey}/*`);
    // const files = await globber.glob();
    // console.log(files);

    throw new Error("!");
    //const id = cacheKey ? fs.readFileSync(this._cacheKey).toString() : null;

    // Delete the cache dir
    await io.rmRF(this._cacheDir);

    //return id;
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
