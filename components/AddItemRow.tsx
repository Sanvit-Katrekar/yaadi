"use client";
import { useState } from "react";

interface Props {
  onAdd: (text: string) => void;
}

export default function AddItemRow({ onAdd }: Props) {
  const [val, setVal] = useState("");
  const [active, setActive] = useState(false);

  function submit() {
    if (!val.trim()) { setActive(false); return; }
    onAdd(val.trim());
    setVal("");
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors group"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="w-4 h-4 rounded flex items-center justify-center text-base leading-none" style={{ color: "var(--amber)" }}>+</span>
        <span className="group-hover:text-amber-400 transition-colors">Add item</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-1">
      <input
        autoFocus
        className="flex-1 bg-transparent text-sm outline-none py-1"
        style={{ color: "var(--text-primary)", borderBottom: "1.5px solid var(--amber)" }}
        placeholder="Item name…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setActive(false);
        }}
        onBlur={submit}
      />
    </div>
  );
}
