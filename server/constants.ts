import { resolve } from "path"
import { config } from "dotenv"

config({ path: resolve(__dirname, "../.env") })

const ENVIRONMENT_VARIABLES = [
  "NODE_ENV",
  "SERVER_URL",
  "PORT",
  "COOKIE_SECRET",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
  "OAUTH_ACCESS_TOKEN_URI",
  "OAUTH_AUTHORIZATION_URI",
  "OAUTH_PROFILE_URI",
];

interface Constants {
  [key: string]: string;
}

const _constants: Constants = { };

for (const v of ENVIRONMENT_VARIABLES) {
  if (process.env[v] === undefined) {
    throw new Error(`Required environment variable was not set: ${v}`);
  }
  _constants[v] = process.env[v] || "";
}

const constants: Constants = Object.freeze(_constants);
export default constants;
