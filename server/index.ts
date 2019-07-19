import next from "next";
import express from "express";
import bodyParser from "body-parser";
import ClientOAuth2 from "client-oauth2";
import crypto from "crypto";
import {URL} from "url";
import got from "got";
import constants from "./constants";
import sessions from "client-sessions";

const dev = constants.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const server = express();

server.use(sessions({
  cookieName: "session",
  secret: constants.COOKIE_SECRET,
  duration: 60 * 60 * 1000, // 60 minutes
  activeDuration: 15 * 60 * 1000, // 15 minutes
  cookie: {httpOnly: true, sameSite: "lax"},
}));

const jsonParser = bodyParser.json();
const FxAOAuthClient = new ClientOAuth2({
  clientId: constants.OAUTH_CLIENT_ID,
  clientSecret: constants.OAUTH_CLIENT_SECRET,
  accessTokenUri: constants.OAUTH_ACCESS_TOKEN_URI,
  authorizationUri: constants.OAUTH_AUTHORIZATION_URI,
  redirectUri: constants.SERVER_URL + "/oauth/return",
  scopes: ["profile"],
});

server.get("/oauth/init", jsonParser, (req, res) => {
  // Set a random state string in a cookie so that we can verify
  // the user when they're redirected back to us after auth.
  const state = crypto.randomBytes(40).toString("hex");
  req.session!.state = state;
  const url = new URL(FxAOAuthClient.code.getUri({state}));
  const fxaParams = new URL(req.url, constants.SERVER_URL);

  url.searchParams.append("action", "signin");

  fxaParams.searchParams.forEach(function(value: string, key: string) {
    url.searchParams.append(key, value);
  });

  res.redirect(url.href);
});

server.get("/oauth/return", jsonParser, async (req, res) => {
  if (!req.session!.state) {
    throw new Error("oauth-invalid-session");
  }

  const fxaUser = await FxAOAuthClient.code.getToken(
    req.originalUrl,
    { state: req.session!.state }
  );

  // Clear the session.state to clean up and avoid any replays
  req.session!.state = null;

  const data = await got(constants.OAUTH_PROFILE_URI, {
    headers: {
      Authorization: `Bearer ${fxaUser.accessToken}`,
    },
  });

  req.session!.user = JSON.parse(data.body);

  res.redirect("/");
});

server.get("/user/logout", jsonParser, (req, res) => {
  req.session!.user = null;
  res.redirect("/");
});

// NextJS handles the rest
server.get('*', (req, res) => {
  return handle(req, res);
});

(async () => {
  try {
      await app.prepare();
      server.listen(constants.PORT);
      console.log(`> Ready on http://localhost:${constants.PORT}`);
  }
  catch (err) {
      console.error(err.message);
  }
})();