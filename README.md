<h1 align="center"> 📋 Yaadi </h1>

<br />

<div align="center">
    <img src="assets/icon.png" height=200/>
</div>

> A modern, mobile-first shopping & packing list app with live sync, store tagging, and smart carry management.


## Features

### 📝 List Management
- Create multiple named lists, each with a custom icon and optional description
- Switch between lists instantly via the collapsible sidebar
- Delete lists with a single confirmation step
- Per-list progress tracked with an animated ring indicator

### 🗂️ Sections
- Organize items within a list into named sections (e.g. "Produce", "Toiletries")
- Collapse/expand sections individually to reduce visual noise
- Delete entire sections (with all their items) in one action
- Live `(done / total)` badge on each section header

### ✅ Items
- Add items to any section via a quick-add input row
- Check off items with an animated checkbox; checked items show with a strikethrough
- Delete individual items via button (desktop) or swipe gesture (mobile)
- Full-text search across all items in the active list

### 🏪 Store Tagging
- Tag any item with one or more stores (e.g. "Carrefour", "IKEA")
- Create new stores inline from the item's store popover — no separate settings page needed
- Stores are assigned auto-generated colors and displayed as colored pills on each item
- Filter the entire list view by store to see only relevant items when you're at a specific shop
- Delete stores globally (removes the tag from all items)

### 🚫 Do Not Carry
- Mark items as "Do Not Carry" to move them to a visually distinct sub-section
- Useful for items that are already packed, not needed this trip, or intentionally excluded
- Restore items back to the carry list with one tap or a swipe action
- **Desktop:** dedicated 🚫 toggle button per row; Mobile: swipe left to reveal actions

### 📱 Mobile-First UX
- Swipeable rows on mobile: swipe left to reveal context-sensitive action buttons
  - On carry items: "Don't Carry" + "Delete"
  - On do-not-carry items: "Restore" + "Delete"
- Direction-locked swipe detection (won't interfere with vertical page scroll)
- Full responsive layout — sidebar slides in as a drawer on small screens
- Larger touch targets on mobile for all interactive elements

### 🔍 Search
- Inline search bar (header on desktop, top of content area on mobile)
- Filters items and sections in real time as you type
- Sections with no matching items are hidden automatically

### 📊 Progress Tracking
- Animated progress bar at the top of the content area
- Per-list progress ring in the sidebar
- Color transitions from amber → green when all items are checked
- `Reset` button to uncheck all items in the active list in one tap

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| State | Custom `useAppState` hook (`/lib/store`) |
| Portals | `ReactDOM.createPortal` (store popover) |
| Persistence | Live sync via `useAppState` (store abstraction) |

---

### Key components in `TodoApp.tsx`

| Component | Responsibility |
|---|---|
| `TodoApp` | Top-level layout, routing between lists, header, sidebar |
| `SectionBlock` | Renders a single section with its items and add-item row |
| `ItemRow` | Single item with checkbox, store pills, and action buttons |
| `SwipeableRow` | Touch gesture wrapper that reveals action buttons on swipe |
| `StorePopover` | Floating store picker/creator, rendered via a portal |
| `StoreFilterBar` | Horizontal chip bar for filtering items by store |
| `ListCard` | Sidebar entry for a list with progress ring |
| `ProgressRing` | SVG ring that animates between 0–100% |
| `CheckIcon` | Animated checkbox SVG |

---

State mutations are handled through named actions exposed by `useAppState`:

| Action | Description |
|---|---|
| `toggleItem` | Check / uncheck an item |
| `addItem` | Add a new item to a section |
| `deleteItem` | Remove an item |
| `addSection` | Create a new section in a list |
| `deleteSection` | Remove a section and all its items |
| `addList` | Create a new list |
| `deleteList` | Remove a list |
| `setActiveList` | Switch the active list |
| `uncheckAll` | Reset all items in a list |
| `addStore` | Create a new store |
| `deleteStore` | Remove a store globally |
| `toggleItemStore` | Add or remove a store tag from an item |
| `toggleDoNotCarry` | Move an item between carry and do-not-carry |

---

## How access works

This app uses a token-based magic link system.

There is no login page or OAuth flow.

Access is restricted via magic link. Only users with a valid invite URL can view the app.

1. The owner shares a URL in the format `https://yourapp.com/?token=your_access_token`
2. On first visit, the token is validated and stored in a secure HTTP-only cookie
3. Subsequent visits work automatically via the cookie — no token in URL needed
4. Anyone visiting without a valid token sees an **Access Denied** page
5. To revoke access, change `ACCESS_TOKEN` in your environment and redeploy

> **Note:** The `ACCESS_TOKEN` is never exposed to the browser. It lives only in the server environment and is compared server-side in `proxy.ts` before any page is rendered.

## Getting Started

#### Environment Variables

Create a `.env.local` file (or configure these variables in your hosting provider):

```env
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase publishable (anon) key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Secret token used to grant access to the site
ACCESS_TOKEN=your_secret_token

# Production cookie domain (optional)
# Example: example.com
COOKIE_DOMAIN=your_domain
```

**Notes**:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are exposed to the browser and are safe to use on the client.
- `ACCESS_TOKEN` should remain secret and must never be exposed to users.
- `COOKIE_DOMAIN` is only required in production when serving the app from a custom domain. Leave it unset for local development.

#### Run server

```bash
# Development

npm install
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## UX Conventions

- **Amber** (`var(--amber)`) — primary accent, active states, in-progress indicators
- **Green** (`var(--green)`) — completion states, restore actions
- **Red** (`var(--red)`) — destructive actions, do-not-carry indicators
- All destructive actions (delete list, section, item, store) require a confirmation dialog
- The app never loses state between navigating lists — all state is kept in memory and synced live

