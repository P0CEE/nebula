import { type JWTPayload, jwtVerify } from "jose";

export type Session = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  teamId?: string;
};

type CustomJWTPayload = JWTPayload & {
  user_metadata?: {
    email?: string;
    full_name?: string;
    [key: string]: string | undefined | null;
  };
};

export async function verifyAccessToken(
  accessToken?: string,
): Promise<Session | null> {
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(
      accessToken,
      new TextEncoder().encode(process.env.JWT_SECRET),
    );

    const customPayload = payload as CustomJWTPayload;

    return {
      user: {
        id: customPayload.sub!,
        email: customPayload.user_metadata?.email,
        full_name: customPayload.user_metadata?.full_name || undefined,
      },
    };
  } catch (_error) {
    return null;
  }
}
