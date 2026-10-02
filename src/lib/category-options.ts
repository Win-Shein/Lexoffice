export type CategoryChoice = {
  name: string;
  label: string;
};

type CategoryLike = {
  id: string;
  name: string;
  parentId: string | null;
};

const byName = (a: CategoryLike, b: CategoryLike) => a.name.localeCompare(b.name);

/**
 * Builds the option list for a category <Select>: top-level categories first,
 * each followed by its subcategories labelled as "Parent › Child".
 */
export function buildCategoryChoices(categories: CategoryLike[]): CategoryChoice[] {
  const top = categories.filter((category) => !category.parentId).sort(byName);
  const choices: CategoryChoice[] = [];

  for (const parent of top) {
    choices.push({ name: parent.name, label: parent.name });
    const children = categories
      .filter((category) => category.parentId === parent.id)
      .sort(byName);
    for (const child of children) {
      choices.push({ name: child.name, label: `${parent.name} › ${child.name}` });
    }
  }

  const knownParents = new Set(categories.map((category) => category.id));
  const orphans = categories
    .filter((category) => category.parentId && !knownParents.has(category.parentId))
    .sort(byName);
  for (const orphan of orphans) {
    choices.push({ name: orphan.name, label: orphan.name });
  }

  return choices;
}
