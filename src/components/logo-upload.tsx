"use client";

import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removeLogo, updateLogo } from "@/actions/settings";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_BYTES = 512 * 1024; // 512 KB

export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(logoUrl);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("error.logoInvalid"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("error.logoTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setPreview(dataUrl);
      startTransition(async () => {
        const result = await updateLogo(dataUrl);
        if (!result.ok) {
          toast.error(result.error);
          setPreview(logoUrl);
          return;
        }
        toast.success(t("settings.logoUpdated"));
        router.refresh();
      });
    };
    reader.readAsDataURL(file);
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeLogo();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPreview(null);
      toast.success(t("settings.logoRemoved"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.logo")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">{t("settings.logoDesc")}</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {preview ? t("settings.logoReplace") : t("settings.logoUpload")}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" /> {t("settings.logoRemove")}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.logoHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
