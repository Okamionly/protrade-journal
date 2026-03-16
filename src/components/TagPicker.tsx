"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useTags, Tag } from "@/hooks/useTags";

interface TagPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

const TAG_COLORS = ["#6b7280", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"];

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const { tags, addTag } = useTags();
  const [showInput, setShowInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleTag = (tagName: string) => {
    if (selected.includes(tagName)) {
      onChange(selected.filter((t) => t !== tagName));
    } else {
      onChange([...selected, tagName]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;
    try {
      const created = await addTag({ name: newTag.trim(), color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] });
      onChange([...selected, created.name]);
      setNewTag("");
      setShowInput(false);
    } catch { /* ignore duplicates */ }
  };

  const getTagColor = (name: string): string => {
    const tag = tags.find((t) => t.name === name);
    return tag?.color || "#6b7280";
  };

  const unselected = tags.filter((t) => !selected.includes(t.name));

  return (
    <div className="relative">
      <div
        className="input-field min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-pointer"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {selected.length === 0 && (
          <span style={{ color: "var(--text-muted)" }} className="text-sm">Sélectionner des tags...</span>
        )}
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ background: getTagColor(name) }}
          >
            {name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleTag(name); }}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
          style={{ background: "var(--bg-card-solid)", border: "1px solid var(--border)" }}
        >
          {unselected.map((tag: Tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => { toggleTag(tag.name); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:opacity-80 transition"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              {tag.name}
              {tag._count && <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>{tag._count.trades}</span>}
            </button>
          ))}
          {!showInput ? (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition"
              style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Créer un tag
            </button>
          ) : (
            <div className="px-3 py-2 flex gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder="Nouveau tag..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateTag())}
              />
              <button type="button" onClick={handleCreateTag} className="btn-primary text-white px-2 py-1 rounded-lg text-xs">
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
