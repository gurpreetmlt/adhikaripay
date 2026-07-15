import { toast } from "react-hot-toast";
import type { CatalogCategoryView } from "@/lib/types";
import { getCategoryIcon } from "@/lib/icons";
import { ServiceTile } from "./ServiceTile";

export function CategorySection({ category }: { category: CatalogCategoryView }) {
  const Icon = getCategoryIcon(category.icon);
  const showAepsMark = category.code === "BANKING_SERVICES";
  const showViewAll = category.code === "RECHARGE_AND_BILLS";

  return (
    <section className="rounded-2xl border border-border-subtle bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} stroke="url(#brand-gradient)" />
          <h2 className="text-base font-semibold text-gray-900">{category.name}</h2>
        </div>
        {showAepsMark && <span className="text-xs font-bold tracking-wide text-gray-300">AEPS</span>}
        {showViewAll && (
          <button
            onClick={() => toast("Full service list — coming soon", { icon: "🚧" })}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            View All ›
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
        {category.services.map((service) => (
          <ServiceTile key={service.id} code={service.code} name={service.name} badge={service.badge} />
        ))}
      </div>
    </section>
  );
}
