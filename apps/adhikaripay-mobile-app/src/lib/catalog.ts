import type { CatalogService, CatalogCategory } from "@adhikaripay/shared-types";

export type { CatalogService };

export function flattenCatalogServices(categories: CatalogCategory[]): CatalogService[] {
  return categories.flatMap((c) => c.services);
}

export function findServiceByCode(
  categories: CatalogCategory[],
  code: string,
): CatalogService | undefined {
  return flattenCatalogServices(categories).find((s) => s.code === code);
}
