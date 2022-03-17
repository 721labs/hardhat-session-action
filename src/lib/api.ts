// Libs
import axios from "axios";
import { randomUUID } from "crypto";

// Types

enum HttpMethod {
  Get = "GET",
  Post = "POST"
}

// Constants

const TRACE_KEY = "x-hardhat-session-trace";
const RELEASE_KEY = "x-hardhat-session-release";
const VERSION_KEY = "x-hardhat-session-version";
const VERSION = "0.0.2";

const baseAPIConfig = {
  baseURL: "https://tcod.app3.dev/api/v0",
  headers: {
    [RELEASE_KEY]: process.env.GIT_SHA || "",
    [VERSION_KEY]: VERSION
  }
};

const api = axios.create(baseAPIConfig);

// Functions

function makeTraceHeader(): { [key: string]: string } {
  return { [TRACE_KEY]: randomUUID() };
}

export default api;
export { HttpMethod, makeTraceHeader, baseAPIConfig };
