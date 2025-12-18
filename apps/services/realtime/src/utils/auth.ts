import { type JWTPayload, jwtVerify } from "jose";

export type SocketSession = {
  user: {
    id: string;
    username?: string;
    email?: string;
  };
};

type CustomJWTPayload = JWTPayload & {
  user_metadata?: {
    email?: string;
    username?: string;
    full_name?: string;
  };
};

export async function verifySocketToken(
  token?: string,
): Promise<SocketSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
    );

    const customPayload = payload as CustomJWTPayload;

    return {
      user: {
        id: customPayload.sub!,
        username: customPayload.user_metadata?.username,
        email: customPayload.user_metadata?.email,
      },
    };
  } catch (_error) {
    return null;
  }
}
