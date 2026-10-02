"use client";

import { Check, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryOption,
} from "@/actions/category";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryType } from "@/generated/prisma/enums";

const NO_PARENT = "__none__";

export function CategoryManagerDialog({
  type,
  trigger,
}: {
  type: CategoryType;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState(NO_PARENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState(NO_PARENT);

  const topLevel = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );
  const childrenOf = useCallback(
    (parentId: string) => categories.filter((category) => category.parentId === parentId),
    [categories],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCategories(type);
      setCategories(result);
    } finally {
      setLoading(false);
    }
  }, [type]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNewName("");
      setNewParentId(NO_PARENT);
      setEditingId(null);
      void reload();
    }
  }

  function onAdd() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategory(type, {
        name,
        parentId: newParentId === NO_PARENT ? null : newParentId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("categories.created"));
      setNewName("");
      setNewParentId(NO_PARENT);
      await reload();
      router.refresh();
    });
  }

  function onSaveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await updateCategory(id, {
        name,
        parentId: editParentId === NO_PARENT ? null : editParentId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("categories.updated"));
      setEditingId(null);
      await reload();
      router.refresh();
    });
  }

  function onDelete(category: CategoryOption) {
    if (!window.confirm(t("categories.confirmDelete", { name: category.name }))) return;
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("categories.deleted"));
      await reload();
      router.refresh();
    });
  }

  const parentOptions = (excludeId?: string) =>
    topLevel.filter((category) => category.id !== excludeId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === CategoryType.ITEM
              ? t("categories.itemTitle")
              : t("categories.expenseTitle")}
          </DialogTitle>
          <DialogDescription>{t("categories.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onAdd();
            }}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-category">{t("categories.new")}</Label>
                <Input
                  id="new-category"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder={t("categories.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("categories.parent")}</Label>
                <Select value={newParentId} onValueChange={setNewParentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>{t("categories.noParent")}</SelectItem>
                    {parentOptions().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || !newName.trim()}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("categories.add")}
              </Button>
            </div>
          </form>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("categories.loading")}
              </p>
            ) : categories.length === 0 ? (
              <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Tags className="h-6 w-6 opacity-40" />
                {t("categories.empty")}
              </p>
            ) : (
              topLevel.map((category) => (
                <div key={category.id}>
                  {renderRow(category, false)}
                  {childrenOf(category.id).map((child) => (
                    <div key={child.id} className="pl-5">
                      {renderRow(child, true)}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  function renderRow(category: CategoryOption, isChild: boolean) {
    if (editingId === category.id) {
      return (
        <div
          key={category.id}
          className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
        >
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            className="h-8 min-w-[140px] flex-1"
            autoFocus
          />
          <Select value={editParentId} onValueChange={setEditParentId}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>{t("categories.noParent")}</SelectItem>
              {parentOptions(category.id).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pending}
            onClick={() => onSaveEdit(category.id)}
            aria-label={t("common.save")}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditingId(null)}
            aria-label={t("common.cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div
        key={category.id}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
      >
        <span className="flex-1 truncate text-sm">
          {isChild ? <span className="mr-1 text-muted-foreground">↳</span> : null}
          {category.name}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setEditingId(category.id);
            setEditName(category.name);
            setEditParentId(category.parentId ?? NO_PARENT);
          }}
          aria-label={t("common.edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          disabled={pending}
          onClick={() => onDelete(category)}
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }
}
