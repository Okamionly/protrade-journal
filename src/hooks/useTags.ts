"use client";

import { useState, useEffect, useCallback } from "react";

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { trades: number };
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) setTags(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = async (data: { name: string; color?: string }) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setTags((prev) => [...prev, { ...created, _count: { trades: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    }
    const err = await res.json();
    throw new Error(err.error || "Erreur");
  };

  const deleteTag = async (id: string) => {
    const previous = tags;
    setTags((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setTags(previous);
      return false;
    }
    return true;
  };

  return { tags, loading, fetchTags, addTag, deleteTag };
}
