import { CategoryType } from "@/generated/prisma/enums";

export const DEFAULT_ITEM_CATEGORIES = [
  "Dienstleistung",
  "Produkt",
  "Material",
  "Lizenz",
  "Sonstiges",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Software",
  "Miete",
  "Bewirtung",
  "Ausstattung",
  "Infrastruktur",
  "Reise",
  "Beratung",
  "Marketing",
  "Sonstiges",
];

export function defaultCategoryRows(userId: string) {
  return [
    ...DEFAULT_ITEM_CATEGORIES.map((name) => ({
      userId,
      name,
      type: CategoryType.ITEM,
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      userId,
      name,
      type: CategoryType.EXPENSE,
    })),
  ];
}
