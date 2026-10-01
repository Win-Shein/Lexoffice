"use client";

import { BlobProvider } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import {
  InvoicePdfDocument,
  type InvoicePdfData,
} from "@/components/invoice-pdf";

export function PdfPreview({ data }: { data: InvoicePdfData }) {
  const { t } = useI18n();

  return (
    <BlobProvider document={<InvoicePdfDocument data={data} />}>
      {({ url, loading, error }) => {
        if (error) {
          return (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {t("pdf.failed")}
            </div>
          );
        }
        if (loading || !url) {
          return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("pdf.creating")}
            </div>
          );
        }
        return (
          <iframe
            title="PDF"
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="h-full w-full rounded-b-lg border-0 bg-white"
          />
        );
      }}
    </BlobProvider>
  );
}
