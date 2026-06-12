"use client";
import { useState } from "react";
import { TodoList } from "@/lib/data";

const ICONS = ["📝", "🛒", "✈️", "🏠", "💼", "🎓", "🏋️", "🎉", "🔧", "📚"];

interface Props {
  onClose: () => void;
  onAdd: (list: TodoList) => void;
}

export default function NewListModal({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("📝");

  function submit() {
    if (!title.trim()) return;
    const list: TodoList = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      description: desc.trim(),
      icon,
      sections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAdd(list);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="animate-slide-in rounded-2xl border p-6 w-full max-w-md" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
        <h2 className="text-lg font-semibold mb-5 text-white" style={{ color: "var(--text-primary)" }}>New List</h2>

        <div className="mb-4">
          <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>ICON</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                style={{
                  background: icon === ic ? "var(--amber-dim)" : "var(--surface)",
                  border: `2px solid ${icon === ic ? "var(--amber)" : "var(--border)"}`,
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>TITLE</label>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
            placeholder="e.g. Weekly Groceries"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>DESCRIPTION (optional)</label>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
            placeholder="e.g. Shared list for the week"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1.5px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: title.trim() ? "var(--amber)" : "var(--surface)",
              color: title.trim() ? "#0d1117" : "var(--text-muted)",
              border: "none",
            }}
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}
