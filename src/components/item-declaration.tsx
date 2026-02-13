"use client";
import { ITEM_TYPES, ITEM_TYPE_LABELS } from "@/types";
import type { ItemType } from "@/types";

interface ItemDeclarationProps {
  value: Record<string, string>;
  onChange?: (items: Record<string, string>) => void;
  readOnly?: boolean;
}

export function ItemDeclaration({ value, onChange, readOnly = false }: ItemDeclarationProps) {
  const toggle = (type: ItemType) => {
    if (readOnly || !onChange) return;
    const next = { ...value };
    if (next[type] !== undefined) {
      delete next[type];
    } else {
      next[type] = "";
    }
    onChange(next);
  };

  const setDescription = (type: ItemType, desc: string) => {
    if (readOnly || !onChange) return;
    onChange({ ...value, [type]: desc });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Item Declaration</label>
      <div className="space-y-2">
        {ITEM_TYPES.map((type) => {
          const checked = value[type] !== undefined;
          return (
            <div key={type}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(type)}
                  disabled={readOnly}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{ITEM_TYPE_LABELS[type]}</span>
              </label>
              {checked && (
                <input
                  type="text"
                  value={value[type] || ""}
                  onChange={(e) => setDescription(type, e.target.value)}
                  placeholder={`Describe your ${ITEM_TYPE_LABELS[type].toLowerCase()}...`}
                  readOnly={readOnly}
                  className="mt-1 ml-6 w-[calc(100%-1.5rem)] rounded-lg border border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
