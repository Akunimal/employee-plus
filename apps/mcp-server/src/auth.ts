import { CognitoJwtVerifier } from "aws-jwt-verify";

type VerifiedAccessToken = { sub?: string };
type AccessTokenVerifier = { verify: (token: string) => Promise<VerifiedAccessToken> };
type UserResolver = (request: Request | undefined) => Promise<string>;

export function bearerTokenFromRequest(request: Request | undefined) {
  const value = request?.headers.get("authorization");
  if (!value) return undefined;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match?.[1];
}

export function createUserResolver(options: {
  environment?: string;
  userPoolId?: string;
  clientId?: string;
  verifier?: AccessTokenVerifier;
} = {}): UserResolver {
  const environment = options.environment ?? process.env.NODE_ENV ?? "development";
  if (environment !== "production") {
    return async (request) => {
      const userId = request?.headers.get("x-employee-user-id");
      return userId && /^[a-zA-Z0-9_-]{1,80}$/.test(userId) ? userId : "demo-user";
    };
  }

  const userPoolId = options.userPoolId ?? process.env.COGNITO_USER_POOL_ID;
  const clientId = options.clientId ?? process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) throw new Error("Cognito production configuration is incomplete.");
  const verifier = options.verifier ?? CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId });

  return async (request) => {
    const token = bearerTokenFromRequest(request);
    if (!token) throw new Error("Authentication is required.");
    try {
      const payload = await verifier.verify(token);
      if (!payload.sub || !/^[a-zA-Z0-9_-]{1,80}$/.test(payload.sub)) throw new Error("Invalid subject.");
      return payload.sub;
    } catch {
      throw new Error("Authentication is required.");
    }
  };
}
