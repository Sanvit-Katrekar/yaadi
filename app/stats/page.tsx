"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/store";

// ─── Big progress ring ────────────────────────────────────────────────────────

function BigRing({ pct, size = 140 }: { pct: number; size?: number }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "var(--green)" : "var(--amber)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.18} fill={color} fontWeight="700">
        {Math.round(pct)}%
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle"
        fontSize="11" fill="var(--text-muted)" fontWeight="500">
        done
      </text>
    </svg>
  );
}

function SmallRing({ pct }: { pct: number }) {
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

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-3xl font-bold mt-1" style={{ color: color ?? "var(--text-primary)" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function SplitBar({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="w-full">
      <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "var(--green)", minWidth: pct > 0 ? 6 : 0 }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs">
        <span style={{ color: "var(--green)" }}>✓ {done} checked</span>
        <span style={{ color: "var(--amber)" }}>{total - done} remaining</span>
      </div>
    </div>
  );
}

function StoreBarRow({ name, color, count, max }: { name: string; color: string; count: number; max: number }) {
  const pct = max ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <div className="text-sm truncate flex-1" style={{ color: "var(--text-primary)" }}>{name}</div>
      <div className="flex-1 max-w-[160px]">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="text-xs font-semibold w-6 text-right" style={{ color: "var(--text-muted)" }}>{count}</div>
    </div>
  );
}

// ─── Main stats page ──────────────────────────────────────────────────────────

export default function StatsPage() {
  const { state, mounted } = useAppState();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const selectedList = useMemo(
    () => state.lists.find(l => l.id === selectedListId) ?? state.lists[0] ?? null,
    [state.lists, selectedListId]
  );

  // ── Per-list drill-down: section completion + store usage ──
  const listStats = useMemo(() => {
    if (!selectedList) return null;

    const sections = selectedList.sections.map(s => {
      const total = s.items.length;
      const checked = s.items.filter(i => i.checked).length;
      const pct = total ? (checked / total) * 100 : 0;
      return { id: s.id, title: s.title, total, checked, pct };
    });

    const storeCount: Record<string, number> = {};
    for (const s of selectedList.sections) {
      for (const item of s.items) {
        for (const sid of item.storeIds) {
          storeCount[sid] = (storeCount[sid] ?? 0) + 1;
        }
      }
    }
    const storeUsage = selectedList.stores
      .map(store => ({ ...store, count: storeCount[store.id] ?? 0 }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);
    const maxStoreCount = storeUsage[0]?.count ?? 1;

    return { sections, storeUsage, maxStoreCount };
  }, [selectedList]);
  const stats = useMemo(() => {
    const allItems = state.lists.flatMap(l =>
      l.sections.flatMap(s => s.items.map(i => ({
        ...i,
        listTitle: l.title,
        listIcon: l.icon,
        sectionTitle: s.title,
      })))
    );

    const totalItems = allItems.length;
    const totalChecked = allItems.filter(i => i.checked).length;
    const totalDnc = allItems.filter(i => i.doNotCarry).length;
    const totalPct = totalItems ? (totalChecked / totalItems) * 100 : 0;

    // Items never checked (not DNC, not checked) — kept for potential future use

    // Store coverage
    const taggedItems = allItems.filter(i => i.storeIds.length > 0).length;
    const untaggedItems = totalItems - taggedItems;
    const taggedPct = totalItems ? (taggedItems / totalItems) * 100 : 0;

    // Per-list
    const perList = state.lists.map(l => {
      const items = l.sections.flatMap(s => s.items);
      const checked = items.filter(i => i.checked).length;
      const dnc = items.filter(i => i.doNotCarry).length;
      const pct = items.length ? (checked / items.length) * 100 : 0;
      return { id: l.id, title: l.title, icon: l.icon, total: items.length, checked, dnc, pct };
    });

    // Most/least complete (only lists with items)
    const listsWithItems = perList.filter(l => l.total > 0);
    const mostComplete = [...listsWithItems].sort((a, b) => b.pct - a.pct)[0];
    const leastComplete = [...listsWithItems].sort((a, b) => a.pct - b.pct)[0];

    // Store usage
    const storeCount: Record<string, number> = {};
    for (const item of allItems) {
      for (const sid of item.storeIds) {
        storeCount[sid] = (storeCount[sid] ?? 0) + 1;
      }
    }
    const allStoresMap: Record<string, { id: string; name: string; color: string }> = {};
    for (const list of state.lists) {
      for (const store of list.stores) {
        allStoresMap[store.id] = store;
      }
    }
    const storeUsage = Object.entries(storeCount)
      .map(([id, count]) => ({ ...allStoresMap[id], count }))
      .filter(s => s.name)
      .sort((a, b) => b.count - a.count);
    const maxStoreCount = storeUsage[0]?.count ?? 1;

    const mostDncList = [...perList].sort((a, b) => b.dnc - a.dnc)[0];

    return {
      totalItems, totalChecked, totalDnc, totalPct,
      perList, storeUsage, maxStoreCount, mostDncList,
      taggedItems, untaggedItems, taggedPct,
      mostComplete, leastComplete,
    };
  }, [state]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }



  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-4 lg:px-8 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--background)" }}>
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 hover:opacity-80"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Statistics</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{state.lists.length} list{state.lists.length !== 1 ? "s" : ""} · {stats.totalItems} items</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8 space-y-8">

        {/* ── Hero ── */}
        <section className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
          <BigRing pct={stats.totalPct} size={140} />
          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Overall Progress</div>
              <SplitBar done={stats.totalChecked} total={stats.totalItems} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{state.lists.length}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Lists</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>{stats.totalChecked}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Checked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--red)" }}>{stats.totalDnc}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Do Not Carry</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Most / Least complete ── */}
        {stats.mostComplete && stats.leastComplete && stats.mostComplete.id !== stats.leastComplete.id && (
          <section>
            <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Highlights</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--green)" }}>🏆 Most Complete</div>
                <div className="text-lg">{stats.mostComplete.icon}</div>
                <div className="text-sm font-semibold truncate mt-1" style={{ color: "var(--text-primary)" }}>{stats.mostComplete.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stats.mostComplete.checked}/{stats.mostComplete.total} · {Math.round(stats.mostComplete.pct)}%</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--amber)" }}>⚠️ Needs Attention</div>
                <div className="text-lg">{stats.leastComplete.icon}</div>
                <div className="text-sm font-semibold truncate mt-1" style={{ color: "var(--text-primary)" }}>{stats.leastComplete.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stats.leastComplete.checked}/{stats.leastComplete.total} · {Math.round(stats.leastComplete.pct)}%</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Per-list breakdown ── */}
        <section>
          <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Per List</div>
          <div className="space-y-3">
            {stats.perList.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No lists yet.</p>
            )}
            {stats.perList.map(l => (
              <div key={l.id} className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                <span className="text-2xl shrink-0">{l.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{l.title}</span>
                    <span className="text-xs ml-2 shrink-0" style={{ color: "var(--text-muted)" }}>{l.checked}/{l.total}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${l.pct}%`, background: l.pct === 100 ? "var(--green)" : "var(--amber)" }}
                    />
                  </div>
                  {l.dnc > 0 && (
                    <div className="text-xs mt-1.5" style={{ color: "var(--red)", opacity: 0.8 }}>
                      🚫 {l.dnc} do not carry
                    </div>
                  )}
                </div>
                <SmallRing pct={l.pct} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Store coverage ── */}
        {stats.totalItems > 0 && (
          <section>
            <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Store Coverage</div>
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-3xl font-bold" style={{ color: "var(--amber)" }}>{Math.round(stats.taggedPct)}%</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>of items have a store tagged</div>
                </div>
                <div className="text-right text-xs" style={{ color: "var(--text-muted)" }}>
                  <div style={{ color: "var(--amber)" }}>{stats.taggedItems} tagged</div>
                  <div>{stats.untaggedItems} untagged</div>
                </div>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.taggedPct}%`, background: "var(--amber)" }}
                />
              </div>
              {stats.untaggedItems > 0 && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  {stats.untaggedItems} item{stats.untaggedItems !== 1 ? "s" : ""} have no store assigned — tap 🏪 on any item to tag it.
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Most used stores ── */}
        {stats.storeUsage.length > 0 && (
          <section>
            <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Most Used Stores</div>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
              {stats.storeUsage.map(store => (
                <StoreBarRow key={store.id} name={store.name} color={store.color} count={store.count} max={stats.maxStoreCount} />
              ))}
            </div>
          </section>
        )}

        {stats.totalDnc > 0 && (
          <section>
            <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Do Not Carry</div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total DNC Items" value={stats.totalDnc} color="var(--red)" />
              {stats.mostDncList && stats.mostDncList.dnc > 0 && (
                <StatCard
                  label="Most DNC"
                  value={`${stats.mostDncList.icon} ${stats.mostDncList.title}`}
                  sub={`${stats.mostDncList.dnc} item${stats.mostDncList.dnc !== 1 ? "s" : ""}`}
                />
              )}
            </div>
          </section>
        )}



        {/* ── Per-list drill-down ── */}
        {state.lists.length > 0 && (
          <section>
            <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>Drill Down by List</div>

            {/* List picker */}
            <div className="flex gap-2 flex-wrap mb-4">
              {state.lists.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedListId(l.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: selectedList?.id === l.id ? "var(--amber)" : "var(--surface)",
                    color: selectedList?.id === l.id ? "#0d1117" : "var(--text-secondary)",
                    border: `1.5px solid ${selectedList?.id === l.id ? "var(--amber)" : "var(--border)"}`,
                  }}
                >
                  <span>{l.icon}</span>
                  <span className="truncate max-w-[120px]">{l.title}</span>
                </button>
              ))}
            </div>

            {selectedList && listStats && (
              <div className="space-y-4">

                {/* Section completion */}
                {listStats.sections.length > 0 ? (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="px-4 py-2.5 text-xs font-semibold"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                      SECTION COMPLETION
                    </div>
                    <div className="divide-y divide-transparent">
                      {listStats.sections.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-3"
                          style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                        >
                          <SmallRing pct={s.pct} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.title}</div>
                            {s.total === 0
                              ? <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Empty section</div>
                              : <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.checked} of {s.total} done</div>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No sections in this list.</p>
                )}

                {/* Per-list store usage */}
                {listStats.storeUsage.length > 0 ? (
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                      STORE USAGE IN THIS LIST
                    </div>
                    {listStats.storeUsage.map(store => (
                      <StoreBarRow
                        key={store.id}
                        name={store.name}
                        color={store.color}
                        count={store.count}
                        max={listStats.maxStoreCount}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    No store tags used in this list yet — tap 🏪 on any item to tag it.
                  </div>
                )}

              </div>
            )}
          </section>
        )}

        {/* ── Empty state ── */}
        {stats.totalItems === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-5xl">📊</span>
            <p style={{ color: "var(--text-muted)" }}>Add some items to your lists to see stats.</p>
            <Link href="/"
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
              style={{ background: "var(--amber)", color: "#0d1117" }}>
              Go to lists
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
