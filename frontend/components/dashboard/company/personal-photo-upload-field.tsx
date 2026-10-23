"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UserCircle, Upload } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { resolveCompanyLogoUrl } from "@/lib/company-portal";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 512;

type PersonalPhotoUploadFieldProps = {
  photoUrl?: string | null;
  displayName?: string;
  uploading: boolean;
  error?: string | null;
  onSelect: (file: File) => void;
};

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], file.name, { type: blob.type || file.type }));
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function PersonalPhotoUploadField({ photoUrl, displayName, uploading, error, onSelect }: PersonalPhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLocalError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Unsupported file format. Upload PNG, JPG, JPEG, or WEBP only.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError("Photo file must be 2MB or smaller.");
      return;
    }

    const processed = await compressImage(file);
    setPreview(URL.createObjectURL(processed));
    onSelect(processed);
  }

  const displaySrc = preview || resolveCompanyLogoUrl(photoUrl);
  const combinedError = localError || error;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-raised)]">
          {displaySrc ? (
            <Image src={displaySrc} alt={`${displayName || "Profile"} photo`} width={64} height={64} className="h-full w-full object-cover" unoptimized />
          ) : (
            <AppIcon icon={UserCircle} size="lg" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] px-3 py-1.5 text-sm font-semibold text-[var(--ds-text)] transition-colors duration-150 hover:bg-[var(--ds-surface-raised)] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <AppIcon icon={Upload} size="xs" />
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
          <p className="ds-caption">PNG, JPG, or WEBP. Max 2MB.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {combinedError ? <p role="alert" className="text-xs font-medium text-[var(--ds-danger)]">{combinedError}</p> : null}
    </div>
  );
}
