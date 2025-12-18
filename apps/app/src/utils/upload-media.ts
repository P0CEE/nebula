type UploadResponse = {
  url: string;
  mediaType: "image" | "video";
  key: string;
};

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((c) => c.startsWith("access_token="));
  return tokenCookie ? (tokenCookie.split("=")[1] ?? null) : null;
}

export async function uploadMedia(file: File): Promise<UploadResponse> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);

  const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:3017";

  const response = await fetch(`${mediaUrl}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  return response.json();
}
