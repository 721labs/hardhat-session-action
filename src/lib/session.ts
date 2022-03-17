// Libs
import * as core from "@actions/core";
import api, { HttpMethod, makeTraceHeader, baseAPIConfig } from "./api";
import { delay } from "./utils";

// Types
import type { AxiosPromise } from "axios";

const MAX_RETRY_TIMEOUT = 1000 * 20; // wait up to 20s for the session to start

class Session {
  private _retryTimer: number = 0;

  private async _request(
    method: HttpMethod,
    endpoint: string
  ): Promise<AxiosPromise> {
    const headers = { ...makeTraceHeader() };
    try {
      return await api({
        method,
        url: endpoint,
        headers
      });
    } catch (error) {
      const response = (error as unknown as any).response;
      core.error(
        JSON.stringify({
          request: {
            method,
            host: baseAPIConfig.baseURL,
            endpoint: endpoint,
            headers: { ...headers, ...baseAPIConfig.headers }
          }
        })
      );
      core.error(JSON.stringify(response));
      throw error;
    }
  }

  async start(): Promise<string> {
    try {
      // Create a new session
      const { data } = await this._request(HttpMethod.Post, "instance");
      core.info(`Session Started: ${data.id}`);
      return data.id;
    } catch (error) {
      core.error("Unable to start session");
      throw error;
    }
  }

  async waitUntilReady(id: string): Promise<void> {
    const { data } = await this._request(
      HttpMethod.Get,
      `instance/${id}/status`
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
        await this.waitUntilReady(id);
      } else {
        // TODO: Do a better job handling.
        throw new Error("Session took to long to ready");
      }
    }
  }
}

export default Session;
