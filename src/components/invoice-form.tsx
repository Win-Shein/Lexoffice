"use client";

import { AlertTriangle, CheckCircle2, Plus, Save, Send, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createInvoice } from "@/actions/invoice";
import { useI18n } from "@/components/i18n-provider";
import type { InvoicePdfData, InvoicePdfSeller } from "@/components/invoice-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceStatus, TaxType } from "@/generated/prisma/enums";
import { formatCurrency } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { CreateInvoicePayload } from "@/lib/types";
import {
  TAX_LABEL_BY_TYPE,
  TAX_RATE_BY_TYPE,
  calcInvoiceTotals,
  isKleinbetrag,
} from "@/lib/vat";

const PdfPreview = dynamic(
  () => import("@/components/pdf-preview").then((mod) => mod.PdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        …
      </div>
    ),
  },
);

export type CustomerOption = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postalCode: string | null;
  country: string;
  vatId: string | null;
};

export type SellerInfo = InvoicePdfSeller;

type FormItem = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxType: TaxType;
};

const TAX_OPTIONS: TaxType[] = [
  TaxType.STANDARD_19,
  TaxType.REDUCED_7,
  TaxType.EXEMPT_0,
];

function emptyItem(): FormItem {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    quantity: "1",
    unit: "Stück",
    unitPrice: "",
    taxType: TaxType.STANDARD_19,
  };
}

export function InvoiceForm({
  customers,
  seller,
  nextInvoiceNumber,
  defaults,
}: {
  customers: CustomerOption[];
  seller: SellerInfo & { isSmallBiz: boolean };
  nextInvoiceNumber: string;
  defaults: { issueDate: string; dueDate: string; performanceDate: string };
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(defaults.issueDate);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [performanceDate, setPerformanceDate] = useState(defaults.performanceDate);
  const [taxType, setTaxType] = useState<TaxType>(TaxType.STANDARD_19);
  const [isSmallBiz, setIsSmallBiz] = useState(seller.isSmallBiz);
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  const customer = customers.find((entry) => entry.id === customerId) ?? null;

  const lines = useMemo(
    () =>
      items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity.replace(",", ".")) || 0,
        unitPrice: Number(item.unitPrice.replace(",", ".")) || 0,
        taxType: isSmallBiz || isReverseCharge ? TaxType.EXEMPT_0 : item.taxType,
      })),
    [items, isSmallBiz, isReverseCharge],
  );

  const totals = useMemo(
    () => calcInvoiceTotals(lines, { isSmallBiz, isReverseCharge }),
    [lines, isSmallBiz, isReverseCharge],
  );

  const warnings = useMemo(() => {
    const list: TranslationKey[] = [];
    if (!seller.taxNumber && !seller.vatId) list.push("warning.taxIdMissing");
    if (!customer) list.push("warning.selectCustomer");
    if (isReverseCharge && !customer?.vatId) list.push("warning.reverseChargeVatId");
    if (isKleinbetrag(totals.totalGross) && !isSmallBiz) list.push("warning.kleinbetrag");
    return list;
  }, [seller, customer, isReverseCharge, totals.totalGross, isSmallBiz]);

  const previewData: InvoicePdfData = useMemo(
    () => ({
      invoiceNumber: nextInvoiceNumber,
      issueDate,
      dueDate,
      performanceDate,
      status: "DRAFT",
      notes: notes || null,
      subtotalNet: totals.subtotalNet,
      vatAmount: totals.vatAmount,
      totalGross: totals.totalGross,
      isSmallBiz,
      isReverseCharge,
      seller,
      customer: {
        name: customer?.name ?? "Rechnungsempfänger",
        address: customer?.address ?? "",
        city: customer?.city ?? null,
        postalCode: customer?.postalCode ?? null,
        country: customer?.country ?? "Deutschland",
        vatId: customer?.vatId ?? null,
      },
      items: items.map((item, index) => ({
        description: item.description || `Position ${index + 1}`,
        quantity: Number(item.quantity.replace(",", ".")) || 0,
        unit: item.unit,
        unitPrice: Number(item.unitPrice.replace(",", ".")) || 0,
        totalNet:
          lines[index]?.quantity && lines[index]?.unitPrice
            ? Math.round(lines[index].quantity * lines[index].unitPrice * 100) / 100
            : 0,
        taxType: isSmallBiz || isReverseCharge ? TaxType.EXEMPT_0 : item.taxType,
      })),
    }),
    [
      nextInvoiceNumber,
      issueDate,
      dueDate,
      performanceDate,
      notes,
      totals,
      isSmallBiz,
      isReverseCharge,
      seller,
      customer,
      items,
      lines,
    ],
  );

  function updateItem(key: string, patch: Partial<FormItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function submit(status: InvoiceStatus) {
    if (!customerId) {
      toast.error(t("invoiceForm.selectCustomerError"));
      return;
    }
    if (items.every((item) => !item.description.trim())) {
      toast.error(t("invoiceForm.addItemError"));
      return;
    }

    const payload: CreateInvoicePayload = {
      customerId,
      issueDate,
      dueDate,
      performanceDate,
      notes: notes || undefined,
      status,
      isSmallBiz,
      isReverseCharge,
      taxType: isSmallBiz || isReverseCharge ? TaxType.EXEMPT_0 : taxType,
      items: items
        .filter((item) => item.description.trim())
        .map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity.replace(",", ".")) || 0,
          unit: item.unit || "Stück",
          unitPrice: Number(item.unitPrice.replace(",", ".")) || 0,
          taxType: isSmallBiz || isReverseCharge ? TaxType.EXEMPT_0 : item.taxType,
        })),
    };

    startTransition(async () => {
      const result = await createInvoice(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      for (const warning of result.warnings ?? []) {
        toast.warning(warning);
      }
      toast.success(t("invoiceForm.created"));
      router.push(`/invoices/${result.id}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invoiceForm.details")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("invoiceForm.number")}</Label>
              <Input value={nextInvoiceNumber} readOnly className="bg-muted font-mono" />
              <p className="text-xs text-muted-foreground">{t("invoiceForm.numberHint")}</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer">{t("invoiceForm.recipient")}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder={t("invoiceForm.selectCustomer")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.city ? ` · ${option.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 ? (
                <p className="text-xs text-destructive">{t("invoiceForm.noCustomers")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueDate">{t("invoiceForm.issueDate")}</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performanceDate">{t("invoiceForm.performanceDate")}</Label>
              <Input
                id="performanceDate"
                type="date"
                value={performanceDate}
                onChange={(event) => setPerformanceDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t("invoiceForm.dueDate")}</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("invoiceForm.items")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              <Plus className="h-4 w-4" /> {t("invoiceForm.addItem")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.key}
                className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-12"
              >
                <div className="space-y-1 sm:col-span-5">
                  <Label className="text-xs">{t("invoiceForm.itemDescription")}</Label>
                  <Input
                    value={item.description}
                    placeholder={t("invoiceForm.itemDescriptionPlaceholder")}
                    onChange={(event) =>
                      updateItem(item.key, { description: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("invoiceForm.quantity")}</Label>
                  <Input
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.key, { quantity: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">{t("invoiceForm.unit")}</Label>
                  <Input
                    value={item.unit}
                    onChange={(event) => updateItem(item.key, { unit: event.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("invoiceForm.unitPrice")}</Label>
                  <Input
                    inputMode="decimal"
                    value={item.unitPrice}
                    placeholder="0,00"
                    onChange={(event) =>
                      updateItem(item.key, { unitPrice: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("invoiceForm.taxRate")}</Label>
                  <Select
                    value={isSmallBiz || isReverseCharge ? TaxType.EXEMPT_0 : item.taxType}
                    onValueChange={(value) =>
                      updateItem(item.key, { taxType: value as TaxType })
                    }
                    disabled={isSmallBiz || isReverseCharge}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {TAX_RATE_BY_TYPE[option]} %
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between sm:col-span-12">
                  <span className="text-sm text-muted-foreground">
                    {t("invoiceForm.itemTotal", { index: index + 1 })}{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(
                        (lines[index]?.quantity ?? 0) * (lines[index]?.unitPrice ?? 0),
                      )}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((current) =>
                        current.filter((entry) => entry.key !== item.key),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" /> {t("invoiceForm.remove")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invoiceForm.taxOptions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{t("invoiceForm.defaultTaxRate")}</Label>
              <Select
                value={taxType}
                onValueChange={(value) => setTaxType(value as TaxType)}
                disabled={isSmallBiz || isReverseCharge}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TAX_LABEL_BY_TYPE[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("invoiceForm.smallBiz")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("invoiceForm.smallBizDesc")}
                </p>
              </div>
              <Switch
                checked={isSmallBiz}
                onCheckedChange={setIsSmallBiz}
                aria-label={t("invoiceForm.smallBiz")}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("invoiceForm.reverseCharge")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("invoiceForm.reverseChargeDesc")}
                </p>
              </div>
              <Switch
                checked={isReverseCharge}
                onCheckedChange={setIsReverseCharge}
                aria-label={t("invoiceForm.reverseCharge")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("invoiceForm.notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("invoiceForm.notesPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("invoiceForm.compliance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> {t("invoiceForm.complianceOk")}
              </div>
            ) : (
              warnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t(warning)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => submit(InvoiceStatus.DRAFT)}
          >
            <Save className="h-4 w-4" /> {t("invoiceForm.saveDraft")}
          </Button>
          <Button type="button" disabled={pending} onClick={() => submit(InvoiceStatus.SENT)}>
            <Send className="h-4 w-4" /> {t("invoiceForm.create")}
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("invoiceForm.pdfPreview")}</CardTitle>
            <Badge variant="secondary">{t("invoiceForm.live")}</Badge>
          </CardHeader>
          <div className="h-[560px] border-t border-border">
            <PdfPreview data={previewData} />
          </div>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("common.subtotal")}</span>
              <span>{formatCurrency(totals.subtotalNet)}</span>
            </div>
            {totals.breakdown.map((entry) => (
              <div key={entry.taxType} className="flex justify-between">
                <span className="text-muted-foreground">USt {entry.rate} %</span>
                <span>{formatCurrency(entry.tax)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>{t("common.total")}</span>
              <span>{formatCurrency(totals.totalGross)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
