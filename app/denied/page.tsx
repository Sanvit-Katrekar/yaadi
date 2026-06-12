export default function DeniedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex flex-col items-center text-center max-w-sm w-full gap-6">

        {/* Icon lockup */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
            style={{ background: "rgba(248,81,73,0.12)", border: "1.5px solid rgba(248,81,73,0.25)" }}
          >
            🔒
          </div>
          {/* Subtle amber glow dot */}
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--amber)", fontSize: 9, color: "#0d1117", fontWeight: 700 }}
          >
            !
          </span>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold" style={{ color: "#ffffff" }}>
            Access Denied
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            You need a valid invite link to open this list.
            <br />
            Check your messages, or ask the list owner to share it again.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.1)" }} />

        {/* Help hint */}
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
          Already have a link?
          <br />
          <span style={{ color: "var(--amber)" }}>
            Open it directly from your message thread.
          </span>
        </p>
      </div>
    </div>
  );
}
