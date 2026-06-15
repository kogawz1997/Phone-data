import jwt from "jsonwebtoken";

export type SessionUser = {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  name: string;
};

export function signSession(user: SessionUser, secret: string) {
  return jwt.sign(user, secret, { expiresIn: "7d" });
}

export function verifySession(token: string, secret: string): SessionUser {
  return jwt.verify(token, secret) as SessionUser;
}
