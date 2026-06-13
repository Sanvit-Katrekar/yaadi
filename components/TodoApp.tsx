"use client";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAppState, Store, ItemWithStores, SectionWithStores } from "@/lib/store";
import NewListModal from "./NewListModal";
import AddItemRow from "./AddItemRow";
import ReactDOM from "react-dom";
import { useConfirm } from "./ConfirmDialog";
import { useIsMobile } from "@/hooks/useIsMobile";

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle cx="20" cy="20" r={r} fill="none"
        stroke={pct === 100 ? "var(--green)" : "var(--amber)"}
        strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central"
        fontSize="9" fill="var(--text-secondary)" fontWeight="600">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18">
      <rect x="1" y="1" width="16" height="16" rx="4"
        fill={checked ? "var(--amber)" : "transparent"}
        stroke={checked ? "var(--amber)" : "var(--border)"}
        strokeWidth="1.5" style={{ transition: "all 0.15s ease" }}
      />
      {checked && (
        <polyline points="4,9 7.5,12.5 13.5,6" fill="none" stroke="#0d1117"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function ListCard({ list, active, onClick }: { list: any; active: boolean; onClick: () => void }) {
  const total = list.sections.reduce((a: number, s: any) => a + s.items.length, 0);
  const done = list.sections.reduce((a: number, s: any) => a + s.items.filter((i: any) => i.checked).length, 0);
  const pct = total ? (done / total) * 100 : 0;
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-xl px-3 py-3.5 transition-all flex items-center gap-3 active:scale-[0.98]"
      style={{ background: active ? "var(--amber-dim)" : "transparent", border: `1.5px solid ${active ? "var(--amber-glow)" : "transparent"}` }}
    >
      <span className="text-2xl shrink-0">{list.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: active ? "var(--amber)" : "var(--text-primary)" }}>{list.title}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{done}/{total} done</div>
      </div>
      <ProgressRing pct={pct} />
    </button>
  );
}

function StorePill({ store, onRemove }: { store: Store; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shrink-0"
      style={{ background: store.color + "22", color: store.color, border: `1px solid ${store.color}44` }}
    >
      {store.name}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-60 hover:opacity-100 transition-opacity leading-none p-0.5"
        style={{ fontSize: 10 }}
      >
        ✕
      </button>
    </span>
  );
}

function StorePopover({
  stores, itemStoreIds, onToggle, onCreateStore, onClose, anchorRef,
}: {
  stores: Store[];
  itemStoreIds: string[];
  onToggle: (storeId: string) => void;
  onCreateStore: (name: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [newName, setNewName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; top: number; left: number } | null>(null);

  const updateCoords = useCallback(() => {
    if (coords !== null) return;
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const top = rect.bottom + 6;
    let left: number;
    if (window.innerWidth < 640) {
      left = Math.max(8, Math.min(rect.left, window.innerWidth - 272));
    } else if (spaceRight >= 264) {
      left = rect.left;
    } else {
      left = window.innerWidth - 272 - 8;
    }
    setCoords({ top, left });
  }, [anchorRef, coords]);

  useEffect(() => {
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [updateCoords]);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (dragging) return;
      const target = e instanceof TouchEvent ? e.touches[0]?.target : e.target;
      if (!target) return;
      if (popoverRef.current?.contains(target as Node) || anchorRef.current?.contains(target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [onClose, anchorRef, dragging]);

  function onDragStart(e: React.PointerEvent) {
    if (!coords) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, top: coords.top, left: coords.left };
    setDragging(true);
  }

  function onDragMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    const newTop = Math.max(8, Math.min(window.innerHeight - 100, dragStartRef.current.top + dy));
    const newLeft = Math.max(8, Math.min(window.innerWidth - 272, dragStartRef.current.left + dx));
    setCoords({ top: newTop, left: newLeft });
  }

  function onDragEnd() {
    dragStartRef.current = null;
    setTimeout(() => setDragging(false), 50);
  }

  if (!coords) return null;

  const maxHeight = window.innerHeight - coords.top - 24;

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] rounded-xl shadow-xl w-64"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        top: coords.top,
        left: coords.left,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: `${Math.max(160, maxHeight)}px`,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Drag handle / header */}
      <div
        className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing rounded-t-xl"
        style={{ borderBottom: "1px solid var(--border-subtle)", touchAction: "none" }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none" style={{ opacity: 0.3 }}>
            <circle cx="3" cy="3" r="1.5" fill="currentColor" />
            <circle cx="9" cy="3" r="1.5" fill="currentColor" />
            <circle cx="3" cy="8" r="1.5" fill="currentColor" />
            <circle cx="9" cy="8" r="1.5" fill="currentColor" />
            <circle cx="3" cy="13" r="1.5" fill="currentColor" />
            <circle cx="9" cy="13" r="1.5" fill="currentColor" />
          </svg>
          <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>TAG STORE</div>
        </div>
        <button
          onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-orange-100 hover:text-orange-300"
          style={{ fontSize: 16 }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 flex flex-col flex-1 overflow-hidden">
        {stores.length === 0 && (
          <p className="text-xs mt-2 mb-1 shrink-0" style={{ color: "var(--text-muted)" }}>
            No stores yet — create one below.
          </p>
        )}

        <div className="overflow-y-auto flex-1 space-y-1 mt-2 mb-2">
          {stores.map((store) => {
            const active = itemStoreIds.includes(store.id);
            return (
              <button
                key={store.id}
                onClick={(e) => { e.stopPropagation(); onToggle(store.id); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left"
                style={{ background: active ? store.color + "22" : "transparent" }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: store.color }} />
                <span className="flex-1 truncate" style={{ color: active ? store.color : "var(--text-primary)" }}>
                  {store.name}
                </span>
                {active && <span style={{ color: store.color, fontSize: 12 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 pt-2 shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <input
            autoFocus
            className="flex-1 bg-transparent text-xs outline-none py-1.5 px-2 rounded"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
            placeholder="New store…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) { onCreateStore(newName.trim()); setNewName(""); }
              if (e.key === "Escape") onClose();
            }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); if (newName.trim()) { onCreateStore(newName.trim()); setNewName(""); } }}
            disabled={!newName.trim()}
            className="px-2.5 py-1.5 rounded text-xs font-semibold"
            style={{
              background: newName.trim() ? "var(--amber)" : "var(--surface)",
              color: newName.trim() ? "#0d1117" : "var(--text-muted)",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Swipeable row wrapper ────────────────────────────────────────────────────

function SwipeableRow({
  onAction, actionLabel, actionIcon, actionColor,
  onDelete,
  children,
}: {
  onAction: () => void;
  actionLabel: string;
  actionIcon: string;
  actionColor: string;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const [offset, setOffset] = useState(0);

  const ACTION_WIDTH = 72;
  const MAX_SWIPE = onDelete ? ACTION_WIDTH * 2 : ACTION_WIDTH + 10;
  const ACTION_THRESHOLD = MAX_SWIPE * 0.55;

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    directionLockedRef.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null || startYRef.current === null) return;
    const deltaX = startXRef.current - e.touches[0].clientX;
    const deltaY = Math.abs(e.touches[0].clientY - startYRef.current);

    if (!directionLockedRef.current) {
      if (Math.abs(deltaX) > 6 || deltaY > 6) {
        directionLockedRef.current = Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
      }
      return;
    }

    if (directionLockedRef.current === "vertical") return;
    e.preventDefault();

    const clamped = Math.max(0, Math.min(deltaX, MAX_SWIPE));
    currentXRef.current = clamped;
    setOffset(clamped);
  }

  function onTouchEnd() {
    if (directionLockedRef.current === "horizontal") {
      setOffset(currentXRef.current >= ACTION_THRESHOLD ? MAX_SWIPE : 0);
    }
    startXRef.current = null;
    startYRef.current = null;
    directionLockedRef.current = null;
  }

  function dismiss() {
    setOffset(0);
    currentXRef.current = 0;
  }

  const isDragging = directionLockedRef.current === "horizontal";

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch rounded-xl overflow-hidden"
        style={{ width: MAX_SWIPE }}
      >
        <button
          onPointerDown={(e) => { e.stopPropagation(); onAction(); dismiss(); }}
          className="flex flex-col items-center justify-center gap-1 flex-1 mr-2"
          style={{ background: actionColor + "2a", color: actionColor }}
        >
          <span className="text-lg leading-none">{actionIcon}</span>
          <span className="text-xs font-semibold leading-none">{actionLabel}</span>
        </button>

        {onDelete && (
          <button
            onPointerDown={(e) => { e.stopPropagation(); onDelete(); dismiss(); }}
            className="flex flex-col items-center justify-center gap-1"
            style={{
              width: ACTION_WIDTH,
              background: "rgba(248,81,73,0.18)",
              color: "var(--red)",
              borderLeft: "1px solid rgba(248,81,73,0.15)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
              <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-semibold leading-none">Delete</span>
          </button>
        )}
      </div>

      <div
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease",
          position: "relative",
          zIndex: 1,
          background: "var(--surface)",
          borderRadius: "0.75rem",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  item, sectionId, stores, onToggle, onDelete, onToggleStore, onCreateStore, onToggleDoNotCarry, dnc,
}: {
  item: ItemWithStores;
  sectionId: string;
  stores: Store[];
  onToggle: (sId: string, iId: string) => void;
  onDelete: (sId: string, iId: string) => void;
  onToggleStore: (sId: string, iId: string, storeId: string) => void;
  onCreateStore: (name: string) => Promise<Store>;
  onToggleDoNotCarry: (sId: string, iId: string) => void;
  dnc?: boolean;
}) {
  const confirm = useConfirm();
  const [showStorePopover, setShowStorePopover] = useState(false);
  const storeButtonRef = useRef<HTMLButtonElement>(null);
  const itemStores = stores.filter((s) => item.storeIds.includes(s.id));

  async function handleCreateStore(name: string) {
    const store = await onCreateStore(name);
    onToggleStore(sectionId, item.id, store.id);
  }

  async function handleRemoveStorePill(store: Store) {
    const ok = await confirm({
      title: "Remove store tag",
      message: `Remove "${store.name}" from "${item.text}"?`,
      confirmLabel: "Remove",
      variant: "warning",
    });
    if (ok) onToggleStore(sectionId, item.id, store.id);
  }

  async function handleDeleteItem() {
    const ok = await confirm({
      title: "Delete item",
      message: `Delete "${item.text}"?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) onDelete(sectionId, item.id);
  }

  return (
    <div className="flex items-start gap-3 px-2 py-2.5">
      {dnc ? (
        <span className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center select-none text-base">🚫</span>
      ) : (
        <button
          onClick={() => onToggle(sectionId, item.id)}
          className="shrink-0 mt-0.5 transition-transform active:scale-90 p-0.5 -m-0.5"
        >
          <CheckIcon checked={item.checked} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <span
          className="text-base sm:text-sm leading-snug"
          style={{
            color: item.checked ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: item.checked ? "line-through" : "none",
            opacity: dnc && !item.checked ? 0.85 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {item.text}
        </span>
        {itemStores.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {itemStores.map((store) => (
              <StorePill key={store.id} store={store} onRemove={() => handleRemoveStorePill(store)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          ref={storeButtonRef}
          onPointerDown={(e) => { e.stopPropagation(); setShowStorePopover((v) => !v); }}
          className="opacity-40 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-xl"
          style={{ color: "var(--amber)", border: "1px solid var(--amber)33" }}
          title="Tag a store"
        >
          🏪
        </button>

        {showStorePopover && (
          <StorePopover
            stores={stores}
            itemStoreIds={item.storeIds}
            onToggle={(storeId) => onToggleStore(sectionId, item.id, storeId)}
            onCreateStore={handleCreateStore}
            onClose={() => setShowStorePopover(false)}
            anchorRef={storeButtonRef}
          />
        )}

        <button
          onPointerDown={(e) => { e.stopPropagation(); onToggleDoNotCarry(sectionId, item.id); }}
          className="hidden sm:flex opacity-40 hover:opacity-100 transition-opacity items-center justify-center w-8 h-8 rounded-lg"
          style={{
            color: dnc ? "var(--green)" : "var(--red)",
            border: `1px solid ${dnc ? "rgba(16,185,129,0.3)" : "rgba(248,81,73,0.2)"}`,
            background: dnc ? "rgba(16,185,129,0.08)" : "transparent",
          }}
          title={dnc ? "Move to carry" : "Mark do not carry"}
        >
          🚫
        </button>

        <button
          onClick={handleDeleteItem}
          className="hidden sm:flex items-center justify-center w-8 h-8 opacity-40 hover:opacity-100 active:opacity-100 transition-opacity rounded-lg"
          style={{ color: "var(--red)", border: "1px solid rgba(248,81,73,0.2)" }}
          title="Delete item"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({
  section, listId, stores, activeStoreFilter, checkFilter, onToggle, onAddItem, onDeleteItem,
  onToggleStore, onCreateStore, onDeleteSection, onToggleDoNotCarry, onToggleSectionStore,
}: {
  section: SectionWithStores;
  listId: string;
  stores: Store[];
  activeStoreFilter: string | null;
  checkFilter: "all" | "unchecked" | "checked";
  onToggle: (sId: string, iId: string) => void;
  onAddItem: (sId: string, text: string) => void;
  onDeleteItem: (sId: string, iId: string) => void;
  onToggleStore: (sId: string, iId: string, storeId: string) => void;
  onCreateStore: (name: string) => Promise<Store>;
  onDeleteSection: (sectionId: string) => void;
  onToggleDoNotCarry: (sId: string, iId: string) => void;
  onToggleSectionStore: (sId: string, storeId: string) => void;  // ← NEW
}) {
  const confirm = useConfirm();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // ── Section-level store popover state ─────────────────────────────────────
  const [showSectionStorePopover, setShowSectionStorePopover] = useState(false);
  const sectionStoreButtonRef = useRef<HTMLButtonElement>(null);

  const visibleItems = section.items.filter((item) => {
    const storeMatch =
      !activeStoreFilter ||
      item.storeIds.includes(activeStoreFilter);

    const checkMatch =
      checkFilter === "all" ||
      (checkFilter === "checked" && item.checked) ||
      (checkFilter === "unchecked" && !item.checked);

    return storeMatch && checkMatch;
  });

  if (visibleItems.length === 0) return null;

  const carryItems = visibleItems.filter((i) => !i.doNotCarry);
  const doNotItems = visibleItems.filter((i) => i.doNotCarry);
  const done = visibleItems.filter((i) => i.checked).length;
  const total = visibleItems.length;

  // Stores currently tagged on this section
  const sectionTaggedStores = stores.filter((s) => section.storeIds.includes(s.id));

  async function handleDeleteSection() {
    const ok = await confirm({
      title: `Delete "${section.title}"?`,
      message: "All items in this section will be permanently deleted.",
      confirmLabel: "Delete section",
      variant: "danger",
    });
    if (ok) onDeleteSection(section.id);
  }

  async function handleCreateStoreForSection(name: string) {
    const store = await onCreateStore(name);
    onToggleSectionStore(section.id, store.id);
  }

  async function handleRemoveSectionStorePill(store: Store) {
    const ok = await confirm({
      title: "Remove store tag",
      message: `Remove "${store.name}" from section "${section.title}"?`,
      confirmLabel: "Remove",
      variant: "warning",
    });
    if (ok) onToggleSectionStore(section.id, store.id);
  }

  return (
    <div className="animate-slide-in mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
      {/* ── Section header ── */}
      <div className="px-4 py-3.5" style={{ background: "var(--surface)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <svg width="14" height="14" viewBox="0 0 14 14"
              style={{ color: "var(--text-muted)", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
            >
              <path d="M2 4l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{section.title}</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">

            {/* ── Section store tag button ── */}
            <button
              ref={sectionStoreButtonRef}
              onPointerDown={(e) => { e.stopPropagation(); setShowSectionStorePopover((v) => !v); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-100 active:scale-95"
              style={{
                color: sectionTaggedStores.length > 0 ? "var(--amber)" : "var(--text-muted)",
                background: sectionTaggedStores.length > 0 ? "var(--amber-dim)" : "transparent",
                border: `1px solid ${sectionTaggedStores.length > 0 ? "var(--amber-glow)" : "var(--border)"}`,
                opacity: sectionTaggedStores.length > 0 ? 1 : 0.5,
              }}
              title="Tag section to a store"
            >
              🏷️
            </button>

            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: done === total && total > 0 ? "var(--green-dim)" : "var(--amber-dim)",
                color: done === total && total > 0 ? "var(--green)" : "var(--amber)",
              }}
            >
              {done}/{total}
            </span>

            {showSectionStorePopover && (
              <StorePopover
                stores={stores}
                itemStoreIds={section.storeIds}
                onToggle={(storeId) => onToggleSectionStore(section.id, storeId)}
                onCreateStore={handleCreateStoreForSection}
                onClose={() => setShowSectionStorePopover(false)}
                anchorRef={sectionStoreButtonRef}
              />
            )}

            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteSection(); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-100 active:scale-95"
              style={{ color: "var(--red)", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.25)", opacity: 0.75 }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Section store pills ── */}
        {sectionTaggedStores.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pl-5">
            {sectionTaggedStores.map((store) => (
              <StorePill
                key={store.id}
                store={store}
                onRemove={() => handleRemoveSectionStorePill(store)}
              />
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-2 pb-3 pt-1" style={{ background: "var(--surface)" }}>

          {/* DO NOT CARRY section */}
          {doNotItems.length > 0 && (
            <div className="mb-2 mx-1 rounded-xl overflow-hidden" style={{ background: "rgba(248,81,73,0.06)", border: "1px solid rgba(248,81,73,0.12)" }}>
              <div className="text-xs font-semibold px-3 pt-2.5 pb-1.5 tracking-wider" style={{ color: "var(--red)", opacity: 0.8 }}>
                DO NOT CARRY{isMobile ? " · swipe left to restore or delete" : ""}
              </div>
              {doNotItems.map((item) => (
                <SwipeableRow
                  key={item.id}
                  onAction={() => onToggleDoNotCarry(section.id, item.id)}
                  actionLabel="Restore"
                  actionIcon="↩️"
                  actionColor="var(--green)"
                  onDelete={() => onDeleteItem(section.id, item.id)}
                >
                  <ItemRow
                    item={item} sectionId={section.id} stores={stores}
                    onToggle={() => {}} onDelete={onDeleteItem}
                    onToggleStore={onToggleStore} onCreateStore={onCreateStore}
                    onToggleDoNotCarry={onToggleDoNotCarry} dnc
                  />
                </SwipeableRow>
              ))}
            </div>
          )}

          {/* Regular carry items */}
          {carryItems.map((item) => (
            <SwipeableRow
              key={item.id}
              onAction={() => onToggleDoNotCarry(section.id, item.id)}
              actionLabel="Don't Carry"
              actionIcon="🚫"
              actionColor="var(--red)"
              onDelete={() => onDeleteItem(section.id, item.id)}
            >
              <ItemRow
                item={item} sectionId={section.id} stores={stores}
                onToggle={onToggle} onDelete={onDeleteItem}
                onToggleStore={onToggleStore} onCreateStore={onCreateStore}
                onToggleDoNotCarry={onToggleDoNotCarry}
              />
            </SwipeableRow>
          ))}

          {!activeStoreFilter && (
            <div className="mt-2 px-1">
              <AddItemRow onAdd={(text) => onAddItem(section.id, text)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Store filter bar ─────────────────────────────────────────────────────────

function StoreFilterBar({
  stores, activeFilter, onSelect, onDeleteStore,
}: {
  stores: Store[];
  activeFilter: string | null;
  onSelect: (id: string | null) => void;
  onDeleteStore: (id: string) => void;
}) {
  const confirm = useConfirm();
  if (stores.length === 0) return null;

  async function handleDeleteStore(store: Store) {
    const ok = await confirm({
      title: `Delete "${store.name}"?`,
      message: "It will be removed from all tagged items.",
      confirmLabel: "Delete store",
      variant: "danger",
    });
    if (ok) onDeleteStore(store.id);
  }

  return (
    <div className="flex items-center gap-2 px-4 lg:px-8 py-3 overflow-x-auto scrollbar-thin shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--background)" }}>
      <span className="text-xs font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>Filter:</span>
      <button
        onClick={() => onSelect(null)}
        className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95"
        style={{
          background: activeFilter === null ? "var(--amber)" : "var(--surface)",
          color: activeFilter === null ? "#0d1117" : "var(--text-secondary)",
          border: `1.5px solid ${activeFilter === null ? "var(--amber)" : "var(--border)"}`,
        }}
      >
        All
      </button>
      {stores.map((store) => {
        const active = activeFilter === store.id;
        return (
          <div key={store.id} className="flex items-center gap-1 shrink-0 group">
            <button
              onClick={() => onSelect(active ? null : store.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: active ? store.color + "33" : "var(--surface)",
                color: active ? store.color : "var(--text-secondary)",
                border: `1.5px solid ${active ? store.color : "var(--border)"}`,
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: store.color }} />
              {store.name}
            </button>
            <button
              onClick={() => handleDeleteStore(store)}
              className="opacity-50 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded-full"
              style={{ color: "var(--red)" }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodoApp() {
  const {
    state, mounted,
    toggleItem, setActiveList, addList, deleteList, addItem, addSection,
    deleteSection, uncheckAll, deleteItem,
    addStore, deleteStore, toggleItemStore,
    toggleDoNotCarry,
    toggleSectionStore,   // ← NEW
  } = useAppState();

  const confirm = useConfirm();
  const [showNewList, setShowNewList] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSectionTo, setAddingSectionTo] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [activeStoreFilter, setActiveStoreFilter] = useState<string | null>(null);

  type CheckFilter = "all" | "unchecked" | "checked";
  const [checkFilter, setCheckFilter] = useState<CheckFilter>("all");

  const activeList = useMemo(
    () => state.lists.find((l) => l.id === state.activeListId) ?? state.lists[0] ?? null,
    [state]
  );

  const createStore = useCallback(
    (name: string) => addStore(name, activeList!.id),
    [activeList?.id, addStore]
  );

  const removeStore = useCallback(
    (storeId: string) => deleteStore(storeId, activeList!.id),
    [activeList?.id, deleteStore]
  );

  useEffect(() => { setActiveStoreFilter(null); }, [state.activeListId]);

  const filteredSections = useMemo(() => {
    if (!activeList) return [];
    let sections = activeList.sections as SectionWithStores[];
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      sections = sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.text.toLowerCase().includes(q)) }))
        .filter((s) => s.items.length > 0 || s.title.toLowerCase().includes(q));
    }
    return sections;
  }, [activeList, searchQ]);

  const totalDone = useMemo(() => activeList?.sections.reduce((a, s) => a + s.items.filter((i) => i.checked).length, 0) ?? 0, [activeList]);
  const totalAll = useMemo(() => activeList?.sections.reduce((a, s) => a + s.items.length, 0) ?? 0, [activeList]);

  async function handleDeleteList() {
    if (!activeList) return;
    const ok = await confirm({
      title: `Delete "${activeList.title}"?`,
      message: "This will permanently delete all sections and items in this list.",
      confirmLabel: "Delete list",
      variant: "danger",
    });
    if (ok) deleteList(activeList.id);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--amber)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading Yaadi…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "var(--amber)", color: "#0d1117" }}>📋</div>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Yaadi</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--green)" }} />
              <span className="text-xs" style={{ color: "var(--green)" }}>Live sync on</span>
            </div>
          </div>
          <button
            className="ml-auto lg:hidden flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ color: "var(--text-muted)", background: "var(--surface-elevated)" }}
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {state.lists.map((list) => (
            <ListCard key={list.id} list={list} active={list.id === activeList?.id}
              onClick={() => { setActiveList(list.id); setSidebarOpen(false); }} />
          ))}
        </div>

        <div className="p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setShowNewList(true)}
            className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--amber)", color: "#0d1117" }}
          >
            + New List
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header
          className="flex items-center gap-3 px-4 lg:px-8 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--background)" }}
        >
          <button
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ color: "var(--text-secondary)", background: "var(--surface)" }}
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {activeList && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl shrink-0">{activeList.icon}</span>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>{activeList.title}</h1>
                {activeList.description && (
                  <p className="text-xs truncate hidden sm:block" style={{ color: "var(--text-muted)" }}>{activeList.description}</p>
                )}
              </div>
              <span
                className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: totalDone === totalAll && totalAll > 0 ? "var(--green-dim)" : "var(--amber-dim)", color: totalDone === totalAll && totalAll > 0 ? "var(--green)" : "var(--amber)" }}
              >
                {totalDone}/{totalAll}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="relative hidden sm:block">
              <input
                className="pl-8 pr-3 py-2 rounded-xl text-sm outline-none w-44 focus:w-56 transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="Search…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>🔍</span>
            </div>
            {activeList && (
              <Link
                href="/stats"
                className="flex items-center justify-center h-9 px-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95 gap-1.5"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                <span>🏆</span>
                <span className="hidden sm:inline">Stats</span>
              </Link>
            )}
            {activeList && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Reset list?",
                    message: "This will uncheck all items in the current list.",
                    confirmLabel: "Reset",
                    variant: "warning",
                  });
                  if (ok) uncheckAll(activeList.id);
                }}
                className="flex items-center justify-center h-9 px-3.5 rounded-xl gap-2 transition-all hover:opacity-80 active:scale-95"
                style={{ background: "var(--surface)", color: "var(--amber)", border: "1px solid var(--border)" }}
              >
                <span className="text-lg sm:text-sm">⟲</span>
                <span className="hidden sm:inline font-semibold text-sm">Reset</span>
              </button>
            )}
            {activeList && (
              <button
                onClick={handleDeleteList}
                className="flex items-center justify-center h-9 px-3.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95 gap-1.5"
                style={{ background: "rgba(248,81,73,0.12)", color: "var(--red)", border: "1.5px solid rgba(248,81,73,0.35)" }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </header>

        {activeList && totalAll > 0 && (
          <div className="h-1 shrink-0" style={{ background: "var(--border-subtle)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${(totalDone / totalAll) * 100}%`, background: totalDone === totalAll ? "var(--green)" : "var(--amber)" }}
            />
          </div>
        )}

        {activeList && (
          <div
            className="flex items-center gap-2 px-4 lg:px-8 py-3 overflow-x-auto scrollbar-thin shrink-0"
            style={{
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--background)",
            }}
          >
            <span
              className="text-xs font-semibold shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              Status:
            </span>

            <button
              onClick={() => setCheckFilter("all")}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95"
              style={{
                background: checkFilter === "all" ? "var(--amber)" : "var(--surface)",
                color: checkFilter === "all" ? "#0d1117" : "var(--text-secondary)",
                border: `1.5px solid ${
                  checkFilter === "all" ? "var(--amber)" : "var(--border)"
                }`,
              }}
            >
              All
            </button>

            <button
              onClick={() => setCheckFilter("unchecked")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95"
              style={{
                background:
                  checkFilter === "unchecked"
                    ? "rgba(248, 158, 11, 0.18)"
                    : "var(--surface)",
                color:
                  checkFilter === "unchecked"
                    ? "var(--amber)"
                    : "var(--text-secondary)",
                border: `1.5px solid ${
                  checkFilter === "unchecked"
                    ? "var(--amber)"
                    : "var(--border)"
                }`,
              }}
            >
              Pending
            </button>

            <button
              onClick={() => setCheckFilter("checked")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95"
              style={{
                background:
                  checkFilter === "checked"
                    ? "rgba(16, 185, 129, 0.18)"
                    : "var(--surface)",
                color:
                  checkFilter === "checked"
                    ? "var(--green)"
                    : "var(--text-secondary)",
                border: `1.5px solid ${
                  checkFilter === "checked"
                    ? "var(--green)"
                    : "var(--border)"
                }`,
              }}
            >
              Completed
            </button>
          </div>
        )}

        {activeList && (
          <StoreFilterBar
            stores={activeList.stores}
            activeFilter={activeStoreFilter}
            onSelect={setActiveStoreFilter}
            onDeleteStore={removeStore}
          />
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 lg:px-8 py-6">
          {!activeList ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <span className="text-5xl">📋</span>
              <p style={{ color: "var(--text-muted)" }}>No lists yet. Create one!</p>
              <button
                onClick={() => setShowNewList(true)}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
                style={{ background: "var(--amber)", color: "#0d1117" }}
              >
                + New List
              </button>
            </div>
          ) : (
            <>
              {activeStoreFilter && filteredSections.every((s) => s.items.filter((i) => i.storeIds.includes(activeStoreFilter!)).length === 0) && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No items tagged with "{activeList.stores.find((s) => s.id === activeStoreFilter)?.name}".
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tap 🏪 on any item to tag it.</p>
                </div>
              )}

              {filteredSections.length === 0 && searchQ && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No items match "{searchQ}"</p>
                </div>
              )}

              <div className="relative sm:hidden mb-4">
                <input
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  placeholder="Search items…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>🔍</span>
              </div>

              <div className="max-w-2xl mx-auto w-full">
                {filteredSections.map((section) => (
                  <SectionBlock
                    key={section.id}
                    section={section}
                    listId={activeList.id}
                    stores={activeList.stores}
                    activeStoreFilter={activeStoreFilter}
                    checkFilter={checkFilter}
                    onToggle={(sId, iId) => toggleItem(activeList.id, sId, iId)}
                    onAddItem={(sId, text) => addItem(activeList.id, sId, text)}
                    onDeleteItem={(sId, iId) => deleteItem(activeList.id, sId, iId)}
                    onDeleteSection={(sId) => deleteSection(activeList.id, sId)}
                    onToggleStore={(sId, iId, storeId) => toggleItemStore(activeList.id, sId, iId, storeId)}
                    onCreateStore={createStore}
                    onToggleDoNotCarry={(sId, iId) => toggleDoNotCarry(activeList.id, sId, iId)}
                    onToggleSectionStore={(sId, storeId) => toggleSectionStore(activeList.id, sId, storeId)}
                  />
                ))}

                {!activeStoreFilter && (
                  addingSectionTo === activeList.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--amber)", color: "var(--text-primary)" }}
                        placeholder="Section name…"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSectionName.trim()) { addSection(activeList.id, newSectionName.trim()); setNewSectionName(""); setAddingSectionTo(null); }
                          if (e.key === "Escape") { setAddingSectionTo(null); setNewSectionName(""); }
                        }}
                      />
                      <button
                        onClick={() => { if (newSectionName.trim()) addSection(activeList.id, newSectionName.trim()); setNewSectionName(""); setAddingSectionTo(null); }}
                        className="px-5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all"
                        style={{ background: "var(--amber)", color: "#0d1117" }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSectionTo(activeList.id)}
                      className="flex items-center gap-2 text-sm py-3 px-4 rounded-xl mt-2 transition-colors hover:opacity-80 active:scale-95 w-full justify-center"
                      style={{ color: "var(--text-muted)", border: "1.5px dashed var(--border)" }}
                    >
                      <span style={{ color: "var(--amber)" }}>+</span> Add Section
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showNewList && <NewListModal onClose={() => setShowNewList(false)} onAdd={addList} />}
    </div>
  );
}
