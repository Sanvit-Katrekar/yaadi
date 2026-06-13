"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = "danger" | "warning";

interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: Variant;
}

interface DialogState extends DialogOptions {
  resolve: (value: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

let _openDialog: ((opts: DialogOptions) => Promise<boolean>) | null = null;

export function useConfirm() {
  return useCallback((opts: DialogOptions) => {
    if (!_openDialog) return Promise.resolve(false);
    return _openDialog(opts);
  }, []);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Mount <ConfirmDialogProvider /> once near the root of your app (e.g. in layout.tsx).

export function ConfirmDialogProvider() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [visible, setVisible] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    _openDialog = (opts: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...opts, resolve });
        // Small delay so the animation starts from hidden → visible
        requestAnimationFrame(() => setVisible(true));
      });
    return () => { _openDialog = null; };
  }, []);

  // Focus the confirm button when it opens (a11y)
  useEffect(() => {
    if (visible) confirmBtnRef.current?.focus();
  }, [visible]);

  // Keyboard: Escape → cancel
  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleChoice(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChoice(confirmed: boolean) {
    setVisible(false);
    // Wait for the exit animation before clearing state
    setTimeout(() => {
      dialog?.resolve(confirmed);
      setDialog(null);
    }, 200);
  }

  if (!dialog) return null;

  const variant = dialog.variant ?? "danger";
  const confirmLabel = dialog.confirmLabel ?? "Confirm";

  const iconPath =
    variant === "warning"
      ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z"
      : "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";

  const confirmColors =
    variant === "danger"
      ? { bg: "#E24B4A", hover: "#c73b3a", text: "#fff" }
      : { bg: "#c17d20", hover: "#a86b19", text: "#fff" };

  const iconColors =
    variant === "danger"
      ? { bg: "rgba(226,75,74,0.12)", icon: "#E24B4A" }
      : { bg: "var(--amber-dim)", icon: "var(--amber)" };
      
  const content = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleChoice(false); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        transition: "background 0.2s ease",
        // Allow centering on wider screens via the inner sheet
      }}
    >
      {/* Sheet — slides up from bottom on mobile, centered modal on desktop */}
      <div
        style={{
          background: "var(--surface, #1a1f27)",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 420,
          padding: "28px 24px max(24px, env(safe-area-inset-bottom, 24px))",
          transform: visible ? "translateY(0)" : "translateY(80px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.32,0.72,0,1), opacity 0.18s ease",
          // On desktop, switch to a proper centered modal
          ["@media (minWidth: 480px)" as string]: {
            borderRadius: 16,
          },
        }}
        className="confirm-dialog-sheet"
      >
        {/* Drag handle pill (mobile feel) */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "var(--border, rgba(255,255,255,0.15))",
            margin: "0 auto 20px",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: iconColors.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={iconColors.icon}>
            <path d={iconPath} />
          </svg>
        </div>

        {/* Text */}
        <p
          style={{
            margin: "0 0 8px",
            textAlign: "center",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-primary, #e6edf3)",
            lineHeight: 1.3,
          }}
        >
          {dialog.title}
        </p>
        <p
          style={{
            margin: "0 0 28px",
            textAlign: "center",
            fontSize: 14,
            color: "var(--text-muted, #8b949e)",
            lineHeight: 1.55,
          }}
        >
          {dialog.message}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            ref={confirmBtnRef}
            onClick={() => handleChoice(true)}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              border: "none",
              background: confirmColors.bg,
              color: confirmColors.text,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {confirmLabel}
          </button>

          <button
            onClick={() => handleChoice(false)}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              border: "1px solid var(--border, rgba(255,255,255,0.12))",
              background: "var(--surface-elevated, rgba(255,255,255,0.06))",
              color: "var(--text-secondary, #a0aab4)",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              transition: "opacity 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Desktop: re-center the sheet */}
      <style>{`
        @media (minWidth: 480px) {
          .confirm-dialog-sheet {
            border-radius: 16px !important;
            margin-bottom: 0 !important;
            position: relative;
            top: 0;
          }
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
