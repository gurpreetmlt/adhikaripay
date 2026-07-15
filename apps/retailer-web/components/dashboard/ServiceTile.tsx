"use client";

import { toast } from "react-hot-toast";
import clsx from "clsx";
import { getServiceIcon } from "@/lib/icons";

interface ServiceTileProps {
  code: string;
  name: string;
  badge?: string | null;
}

export function ServiceTile({ code, name, badge }: ServiceTileProps) {
  const Icon = getServiceIcon(code);
  const isNew = badge === "NEW";

  return (
    <button
      onClick={() => toast(`${name} — coming soon`, { icon: "🚧" })}
      className="relative flex flex-col items-center gap-2 rounded-lg p-3 pt-4 text-center transition hover:bg-surface"
    >
      {badge && (
        <span
          className={clsx(
            "absolute top-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            isNew ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
          )}
        >
          {badge}
        </span>
      )}
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-100">
        <Icon size={20} stroke="url(#brand-gradient)" />
      </span>
      <span className="text-xs font-medium leading-tight text-gray-700">{name}</span>
    </button>
  );
}
