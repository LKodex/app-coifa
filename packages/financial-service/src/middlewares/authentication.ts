import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const KC_HOST = process.env.KEYCLOAK_HOST;
const KC_REALM = process.env.KEYCLOAK_REALM ?? "facoffee";
const KEYCLOAK_URL = `${KC_HOST}/realms/${KC_REALM}`;

export async function authentication(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.substring("Bearer ".length) : null;
    const isBearerToken = Boolean(token);
    if (!isBearerToken) {
        return res
            .status(401)
            .json({ unauthenticated: "Must be provided an bearer JWT token" });
    }
    
    const decodedToken = jwt.decode(token!);
    const isTokenDecoded = Boolean(decodedToken);
    if (!isTokenDecoded) {
        return res
            .status(401)
            .json({ unauthenticated: "Invalid Bearer JWT token provided" });
    }

    const openidConfiguration = await fetch(`${KEYCLOAK_URL}/.well-known/openid-configuration`);
    const isRequestConfigSuccessful = Boolean(openidConfiguration);
    if (!isRequestConfigSuccessful) {
        const ONE_MINUTE = 60;
        return res
            .status(503)
            .setHeader("Retry-After", ONE_MINUTE)
            .json({ error: "Can't reach the authentication service" });
    }

    const openidJsonConfiguration: any = await openidConfiguration.json();
    const userinfoEndpoint = openidJsonConfiguration.userinfo_endpoint;
    await fetch(userinfoEndpoint)
        .then(res => { res.json(); })
        .then(userinfo => {
            req.auth = userinfo;
        });
    next();
}
