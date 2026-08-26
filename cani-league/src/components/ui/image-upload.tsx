"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Link as LinkIcon, X, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  shape?: "circle" | "square";
  bucketName?: string;
  className?: string;
};

/**
 * Redimensiona y comprime una imagen en el cliente para que sea ultra ligera (WebP/JPEG, max 400px)
 */
async function compressImageClient(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Generar JPEG / WebP comprimido
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  label = "Imagen",
  shape = "circle",
  bucketName = "images",
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // 1. Comprimir en cliente para carga instantánea y tamaño óptimo
      const compressedDataUrl = await compressImageClient(file, 400, 0.85);

      // 2. Intentar subir a Supabase Storage si el bucket existe
      try {
        const supabase = createClient();
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            onChange(publicUrlData.publicUrl);
            setUploading(false);
            return;
          }
        }
      } catch (storageErr) {
        // Si Supabase Storage no está configurado, usamos de forma transparente la imagen comprimida
        console.warn("Storage upload fallback to compressed data URL:", storageErr);
      }

      // 3. Fallback directo a la imagen optimizada
      onChange(compressedDataUrl);
    } catch (err) {
      setError("No se pudo procesar la imagen seleccionada.");
    } finally {
      setUploading(false);
    }
  }

  function handleUrlSubmit() {
    if (!urlDraft.trim()) return;
    onChange(urlDraft.trim());
    setUrlDraft("");
    setShowUrlInput(false);
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {label && (
        <Label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </Label>
      )}

      {/* INPUT FILE NATIVO (Fototeca / Cámara en móvil) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        {/* PREVIEW CONTAINER */}
        <div
          className={cn(
            "relative flex size-20 shrink-0 items-center justify-center overflow-hidden border-2 bg-muted/50 transition-all",
            shape === "circle" ? "rounded-full" : "rounded-2xl",
            value ? "border-primary/40 shadow-xs" : "border-dashed border-border",
          )}
        >
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Preview"
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity hover:opacity-100"
                title="Eliminar imagen"
              >
                <X className="size-5 text-white" />
              </button>
            </>
          ) : (
            <ImageIcon className="size-8 text-muted-foreground/50" />
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
              <span className="animate-spin text-primary">⏳</span>
            </div>
          )}
        </div>

        {/* ACCIONES DE SUBIDA */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5 font-display font-semibold"
            >
              <Camera className="size-4" />
              <span>{value ? "Cambiar foto" : "Subir de la fototeca"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <LinkIcon className="size-3.5" />
              <span>URL</span>
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                className="size-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Elige una foto desde tu móvil (cámara o galería) o pega un enlace.
          </p>
        </div>
      </div>

      {/* INPUT URL OPCIONAL */}
      {showUrlInput && (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://ejemplo.com/foto.jpg"
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlSubmit}
            className="h-8 gap-1 px-3 text-xs"
          >
            <Check className="size-3.5" />
            Aplicar
          </Button>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
