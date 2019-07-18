import next from "next";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import ClientOAuth2 from "client-oauth2";
import crypto from "crypto";
import {URL} from "url";
import got from "got";

const COOKIE_SECRET = "cookiesecretz";
const OAUTH_CLIENT_ID = "e3c2bbf56bfec4f8";
const OAUTH_CLIENT_SECRET = "b163cbd0f58cdbb3513fd091c16713bcce4f1d9bc59ca43a123758dc81104ce4";
const ACCESS_TOKEN_URI = "https://oauth-stable.dev.lcip.org/v1/token";
const AUTHORIZATION_URI = "https://oauth-stable.dev.lcip.org/v1/authorization";
const PROFILE_URI = "https://stable.dev.lcip.org/profile/v1/profile";
const port = parseInt(process.env.PORT || '3000', 10);
const SERVER_URL = `http://localhost:${port}`;

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const server = express();

server.use(session({
  secret: COOKIE_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 60 minutes
    // TODO: set cookie.secure = true in prod.
  }
}))

const jsonParser = bodyParser.json();
const FxAOAuthClient = new ClientOAuth2({
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  accessTokenUri: ACCESS_TOKEN_URI,
  authorizationUri: AUTHORIZATION_URI,
  redirectUri: SERVER_URL + "/oauth/return",
  scopes: ["profile"],
});

server.get("/oauth/init", jsonParser, (req, res) => {
  // Set a random state string in a cookie so that we can verify
  // the user when they're redirected back to us after auth.
  const state = crypto.randomBytes(40).toString("hex");
  req.session!.state = state;
  const url = new URL(FxAOAuthClient.code.getUri({state}));
  const fxaParams = new URL(req.url, SERVER_URL);

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

  const data = await got(PROFILE_URI, {
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
      server.listen(port);
      console.log(`> Ready on http://localhost:${port}`);
  }
  catch (err) {
      console.error(err.message);
  }
})();