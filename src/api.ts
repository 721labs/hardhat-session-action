// Libs
import axios from "axios";
import { randomUUID } from "crypto";

// Types

enum HttpMethod {
  Get = "GET",
  Post = "POST",
}

// Constants

const TRACE_KEY = "x-hardhat-session-trace";
const RELEASE_KEY = "x-hardhat-session-release";
const VERSION_KEY = "x-hardhat-session-version";
const VERSION = "0.0.1";

const api = axios.create({
  baseURL: "https://tcod.app3.dev/api/v0",
  headers: {
    [RELEASE_KEY]: process.env.GIT_SHA || "",
    [VERSION_KEY]: VERSION,
  },
});

// Functions

function makeTraceHeader(): { [key: string]: string } {
  return { [TRACE_KEY]: randomUUID() };
}

export default api;
export { HttpMethod, makeTraceHeader };
