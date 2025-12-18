"use client";

import { Button } from "@nebula/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nebula/ui/dialog";
import { Textarea } from "@nebula/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { uploadMedia } from "@/utils/upload-media";

export function CreatePostModal() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.posts.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.posts.getRecent.infiniteQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.posts.getMyPosts.infiniteQueryKey(),
        });
        // Invalidate profile posts (getByUserId)
        queryClient.invalidateQueries({
          queryKey: [["posts", "getByUserId"]],
        });
        // Invalidate timeline
        queryClient.invalidateQueries({
          queryKey: [["timeline", "getTimeline"]],
        });
        resetForm();
        setOpen(false);
      },
    }),
  );

  const resetForm = () => {
    setContent("");
    setFile(null);
    setPreview(null);
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadError(null);

    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  const removeFile = () => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    let mediaUrl: string | undefined;
    let mediaType: "image" | "video" | undefined;

    if (file) {
      setUploading(true);
      setUploadError(null);

      try {
        const result = await uploadMedia(file);
        mediaUrl = result.url;
        mediaType = result.mediaType;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
        return;
      }

      setUploading(false);
    }

    createMutation.mutate({
      content: content || " ",
      mediaUrl,
      mediaType,
    });
  };

  const isSubmitting = uploading || createMutation.isPending;
  const canSubmit = (content.trim() || file) && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-full text-lg font-bold py-6 bg-primary hover:bg-primary/90">
          Poster
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value)
            }
            placeholder="What's on your mind?"
            className="min-h-[120px] resize-none"
            maxLength={280}
          />

          {preview && (
            <div className="relative">
              {file?.type.startsWith("video/") ? (
                <video
                  src={preview}
                  controls
                  className="w-full rounded-lg max-h-64 object-contain bg-black"
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full rounded-lg max-h-64 object-contain bg-muted"
                />
              )}
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/90"
              >
                &times;
              </button>
            </div>
          )}

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className="cursor-pointer p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </label>
              <span className="text-sm text-muted-foreground">
                {content.length}/280
              </span>
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {uploading
                ? "Uploading..."
                : createMutation.isPending
                  ? "Posting..."
                  : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
