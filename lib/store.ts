"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { TodoList, Section, CheckItem } from "./data";
import { supabase } from "./supabase";

export interface Store {
  id: string;
  name: string;
  color: string;
}

export interface ItemWithStores extends CheckItem {
  storeIds: string[];
  position?: number;
}

export interface SectionWithStores extends Omit<Section, "items"> {
  items: ItemWithStores[];
  position?: number;
}

export interface TodoListWithStores extends Omit<TodoList, "sections"> {
  sections: SectionWithStores[];
  stores: Store[]; // move here
}

interface AppState {
  lists: TodoListWithStores[];
  activeListId: string | null;
}

const STORE_COLORS = [
  "#f59e0b", "#10b981", "#6366f1", "#f43f5e",
  "#0ea5e9", "#a855f7", "#ec4899", "#14b8a6",
];

function buildState(
  rawLists: any[],
  rawSections: any[],
  rawItems: any[],
  rawItemStores: any[],
  rawStores: any[],
  rawListStores: any[]
): { lists: TodoListWithStores[] } {

  const allStores: Record<string, Store> = {};
  for (const r of rawStores) {
    allStores[r.id] = { id: r.id, name: r.name, color: r.color };
  }

  const storesByList: Record<string, Store[]> = {};
  for (const row of rawListStores) {
    if (!storesByList[row.list_id]) storesByList[row.list_id] = [];
    const store = allStores[row.store_id];
    if (store) storesByList[row.list_id].push(store);
  }

  const storesByItem: Record<string, string[]> = {};
  for (const row of rawItemStores) {
    if (!storesByItem[row.item_id]) storesByItem[row.item_id] = [];
    storesByItem[row.item_id].push(row.store_id);
  }

  const itemsBySection: Record<string, ItemWithStores[]> = {};
  for (const row of rawItems) {
    if (!itemsBySection[row.section_id]) itemsBySection[row.section_id] = [];
    itemsBySection[row.section_id].push({
      id: row.id,
      text: row.text,
      checked: row.checked,
      doNotCarry: row.do_not_carry ?? false,
      storeIds: storesByItem[row.id] ?? [],
      position: row.position,
    });
  }
  for (const arr of Object.values(itemsBySection)) {
    arr.sort((a: any, b: any) => a.position - b.position);
  }

  const sectionsByList: Record<string, SectionWithStores[]> = {};
  for (const row of rawSections) {
    if (!sectionsByList[row.list_id]) sectionsByList[row.list_id] = [];
    sectionsByList[row.list_id].push({
      id: row.id,
      title: row.title,
      items: itemsBySection[row.id] ?? [],
      position: row.position,
    });
  }
  for (const arr of Object.values(sectionsByList)) {
    arr.sort((a: any, b: any) => a.position - b.position);
  }

  const lists: TodoListWithStores[] = rawLists
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      icon: row.icon ?? "📝",
      sections: sectionsByList[row.id] ?? [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      stores: storesByList[row.id] ?? []
    }))
    .sort((a, b) => a.createdAt - b.createdAt);

  return { lists };
}

const lastMutationAt = { current: 0 };
const GRACE_MS = 3000;

export function useAppState() {
  const [state, setState] = useState<AppState>({ lists: [], activeListId: null });
  const [mounted, setMounted] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Pending mutations counter ─────────────────────────────────────────────
  // A ref so it never causes re-renders and is always current in closures.

  // Wraps every DB write: increments before, decrements after.
  // This tells the realtime handler to skip reloading while our own
  // writes are in-flight, preventing the optimistic state from being
  // overwritten by a stale DB read.
  const withPending = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    lastMutationAt.current = Date.now();
    try {
      return await fn();
    } finally {
      // Keep the guard up long enough for the realtime echo to arrive and be ignored.
      // Realtime events typically fire within 100-300ms of the write completing.
    }
  }, []);

  // ── Load everything ───────────────────────────────────────────────────────
  const loadAll = useCallback(async (isInitial = false) => {
    if (!isInitial && Date.now() - lastMutationAt.current < GRACE_MS) {
      console.log("[loadAll] SKIPPED");
      return;
    }

    const [
      { data: lists },
      { data: sections },
      { data: items },
      { data: itemStores },
      { data: stores },
      { data: listStores }
    ] = await Promise.all([
      supabase.from("lists").select("*"),
      supabase.from("sections").select("*"),
      supabase.from("items").select("*"),
      supabase.from("item_stores").select("*"),
      supabase.from("stores").select("*"),
      supabase.from("list_stores").select("*")
    ]);

    // Re-read fresh after the async gap
    if (!isInitial && Date.now() - lastMutationAt.current < GRACE_MS) {
      console.log("[loadAll] ABORTED after fetch");
      return;
    }

    const built = buildState(
      lists ?? [], sections ?? [], items ?? [], itemStores ?? [], stores ?? [], listStores ?? []
    );

    const savedId = localStorage.getItem("activeListId");
    const validId = savedId && built.lists.find(l => l.id === savedId)
      ? savedId
      : built.lists[0]?.id ?? null;

    setState((prev) => ({
      ...built,
      activeListId: prev.activeListId ?? validId,
    }));
    setMounted(true);
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    loadAll(true); // initial load — never skip
    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lists" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "sections" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_stores" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "list_stores" }, () => loadAll())
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  // ─── List actions ─────────────────────────────────────────────────────────

  const setActiveList = useCallback((id: string) => {
    localStorage.setItem("activeListId", id);
    setState((prev) => ({ ...prev, activeListId: id }));
  }, []);

  const addList = useCallback(async (list: TodoList) => {
    const listWithStores: TodoListWithStores = {
      ...list,
      stores: [],
      sections: list.sections.map((s) => ({
        ...s,
        items: s.items.map((i) => ({ ...i, storeIds: [] })),
      })),
    };
    // Optimistic
    setState((prev) => ({ ...prev, lists: [...prev.lists, listWithStores], activeListId: list.id }));

    await withPending(async () => {
      await supabase.from("lists").insert({
        id: list.id, title: list.title, description: list.description, icon: list.icon,
      });
      for (const [i, section] of list.sections.entries()) {
        await supabase.from("sections").insert({
          id: section.id, list_id: list.id, title: section.title, position: i,
        });
      }
    });
  }, [withPending]);

  const deleteList = useCallback(async (listId: string) => {
    // Optimistic
    setState((prev) => {
      const lists = prev.lists.filter((l) => l.id !== listId);
      return {
        ...prev, lists,
        activeListId: prev.activeListId === listId ? (lists[0]?.id ?? null) : prev.activeListId,
      };
    });

    await withPending(async () => supabase.from("lists").delete().eq("id", listId));
  }, [withPending]);

  // ─── Item actions ─────────────────────────────────────────────────────────

  const toggleItem = useCallback(async (listId: string, sectionId: string, itemId: string) => {
    // Read current value BEFORE setState, not inside it
    const currentItem = state.lists
      .find(l => l.id === listId)?.sections
      .find(s => s.id === sectionId)?.items
      .find(i => i.id === itemId);

    if (!currentItem) return;
    const newChecked = !currentItem.checked;

    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.map((s) => s.id !== sectionId ? s : {
          ...s,
          items: s.items.map((i) => i.id !== itemId ? i : { ...i, checked: newChecked }),
        }),
      }),
    }));

    await withPending(async () =>
      supabase.from("items").update({ checked: newChecked }).eq("id", itemId)
    );
  }, [withPending, state.lists]);

  const toggleDoNotCarry = useCallback(async (listId: string, sectionId: string, itemId: string) => {
    const currentItem = state.lists
      .find(l => l.id === listId)?.sections
      .find(s => s.id === sectionId)?.items
      .find(i => i.id === itemId);

    if (!currentItem) return;
    const newValue = !currentItem.doNotCarry;

    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.map((s) => s.id !== sectionId ? s : {
          ...s,
          items: s.items.map((i) => i.id !== itemId ? i : { ...i, doNotCarry: newValue }),
        }),
      }),
    }));

    await withPending(async () =>
      supabase.from("items").update({ do_not_carry: newValue }).eq("id", itemId)
    );
  }, [withPending, state.lists]);


  const addItem = useCallback(async (listId: string, sectionId: string, text: string) => {
    const id = Math.random().toString(36).slice(2);
    let position = 0;
    // Optimistic
    setState((prev) => {
      const list = prev.lists.find((l) => l.id === listId);
      const section = list?.sections.find((s) => s.id === sectionId);
      position = section?.items.length ?? 0;
      return {
        ...prev,
        lists: prev.lists.map((l) => l.id !== listId ? l : {
          ...l,
          sections: l.sections.map((s) => s.id !== sectionId ? s : {
            ...s,
            items: [...s.items, { id, text, checked: false, storeIds: [] }],
          }),
        }),
      };
    });

    await withPending(async () =>
      supabase.from("items").insert({ id, section_id: sectionId, text, checked: false, position })
    );
  }, [withPending]);

  const deleteItem = useCallback(async (listId: string, sectionId: string, itemId: string) => {
    // Optimistic
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.map((s) => s.id !== sectionId ? s : {
          ...s,
          items: s.items.filter((i) => i.id !== itemId),
        }),
      }),
    }));

    await withPending(async () => supabase.from("items").delete().eq("id", itemId));
  }, [withPending]);

  const addSection = useCallback(async (listId: string, title: string) => {
    const id = Math.random().toString(36).slice(2);
    let position = 0;
    // Optimistic
    setState((prev) => {
      const list = prev.lists.find((l) => l.id === listId);
      position = list?.sections.length ?? 0;
      return {
        ...prev,
        lists: prev.lists.map((l) => l.id !== listId ? l : {
          ...l,
          sections: [...l.sections, { id, title, items: [] }],
        }),
      };
    });

    await withPending(async () =>
      supabase.from("sections").insert({ id, list_id: listId, title, position })
    );
  }, [withPending]);

  const deleteSection = useCallback(async (listId: string, sectionId: string) => {
    // Optimistic
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.filter((s) => s.id !== sectionId),
      }),
    }));

    await withPending(async () => supabase.from("sections").delete().eq("id", sectionId));
  }, [withPending]);

  const uncheckAll = useCallback(async (listId: string) => {
    const list = state.lists.find((l) => l.id === listId);
    if (!list) return;

    // Optimistic
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({ ...i, checked: false })),
        })),
      }),
    }));

    const itemIds = list.sections.flatMap((s) => s.items.map((i) => i.id));
    if (itemIds.length > 0) {
      await withPending(async () =>
        supabase.from("items").update({ checked: false }).in("id", itemIds)
      );
    }
  }, [withPending, state.lists]);

  // ─── Store actions ────────────────────────────────────────────────────────

  const addStore = useCallback(async (name: string, listId: string): Promise<Store> => {
    const id = Math.random().toString(36).slice(2);
    
    // Get stores from the target list instead of state.stores
    const listStores = state.lists.find(l => l.id === listId)?.stores ?? [];
    const used = new Set(listStores.map(s => s.color));
    const color =
      STORE_COLORS.find(c => !used.has(c))
      ?? STORE_COLORS[listStores.length % STORE_COLORS.length];
    
    const store: Store = { id, name, color };

    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l, stores: [...l.stores, store],
      }),
    }));

    await withPending(async () => {
      await supabase.from("stores").insert({ id, name, color });
      await supabase.from("list_stores").insert({ list_id: listId, store_id: id });
    });
    return store;
  }, [withPending, state.lists]);

  const deleteStore = useCallback(async (storeId: string, listId: string) => {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        stores: l.stores.filter((s) => s.id !== storeId),
        sections: l.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({ ...i, storeIds: i.storeIds.filter((sid) => sid !== storeId) })),
        })),
      }),
    }));

    await withPending(async () =>
      supabase.from("list_stores")
        .delete()
        .eq("list_id", listId)
        .eq("store_id", storeId)
    );
  }, [withPending]);

  const toggleItemStore = useCallback(async (
    listId: string, sectionId: string, itemId: string, storeId: string
  ) => {
    let adding = false;
    // Optimistic
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => l.id !== listId ? l : {
        ...l,
        sections: l.sections.map((s) => s.id !== sectionId ? s : {
          ...s,
          items: s.items.map((i) => {
            if (i.id !== itemId) return i;
            const has = i.storeIds.includes(storeId);
            adding = !has;
            return { ...i, storeIds: has ? i.storeIds.filter((sid) => sid !== storeId) : [...i.storeIds, storeId] };
          }),
        }),
      }),
    }));

    await withPending(async () =>
      adding
        ? supabase.from("item_stores").insert({ item_id: itemId, store_id: storeId })
        : supabase.from("item_stores").delete().eq("item_id", itemId).eq("store_id", storeId)
    );
  }, [withPending]);

  return {
    state, mounted,
    setActiveList, addList, deleteList,
    toggleItem, toggleDoNotCarry,
    addItem, deleteItem, addSection, deleteSection, uncheckAll,
    addStore, deleteStore, toggleItemStore,
  };
}