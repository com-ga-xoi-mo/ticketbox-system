# Implementation Checklist: Checkin-mobile UI (from PNG mockups)

**Source**: 2 PNG mockups (Login, Scan/Main). Method adapted from pixel-perfect-ui skill
(section-by-section + exact tokens), translated to React Native + Paper.
**Status**: 🟡 Pending Approval

## Design tokens (read from mockups)

| Token | Value |
|---|---|
| Background (navy) | `#0a0f1c` → `#0d1424` (subtle dark gradient) |
| Primary / action (blue) | `#2563eb` (buttons, accepted banner, active tab) |
| Card surface | `#141c2e`, border `#243049`, radius 16 |
| Input fill | `#0e1626`, radius 10, height ~48 |
| Text primary | `#f8fafc` · secondary `#8a94a6` · label `#cbd3e1` |
| Success (check) | green `#22c55e` · Warning (duplicate) amber `#f59e0b` |
| Pending badge | amber `#b45309` pill · Clear-terminal link red `#f87171` |
| Icons | MaterialCommunityIcons |

## Sections

### S1 — Login screen (mockup 1)
- [ ] Dark gradient background
- [ ] Centered Card: ticket icon badge (blue rounded square), "TicketBox" title, "Check-in Staff" subtitle
- [ ] Email field: label + filled input + mail icon + placeholder `staff@ticketbox.com`
- [ ] Password field: label + filled input + lock icon + eye toggle
- [ ] Row: "Remember me" checkbox (left) + "Forgot Password?" link (right, blue)
- [ ] Login button (blue, full width, arrow icon)
- [ ] Footer: "Need support? Contact IT" (Contact IT blue)

### S2 — Top app bar (mockup 2)
- [ ] Appbar dark: ticket icon + "TicketBox" left, "Logout" + icon right

### S3 — Camera + reticle + result banner (mockup 2)
- [ ] Camera with white corner-bracket reticle overlay
- [ ] Result banner = blue card with check-circle icon, bold title ("Ticket Valid"), message subtitle
- [ ] "Scan another ticket" button (translucent blue, scan icon)
- [ ] NOTE: seat text ("Sec 102, Row G…") is NOT in scan data → show real result message

### S4 — Sync status (mockup 2)
- [ ] "Sync Status" header (sync icon) + "N Pending" amber pill badge
- [ ] "LAST SYNC RESULT" label + rows (Accepted ✓ N, Duplicate ⚠ N) in dark pills
- [ ] "Sync pending" button (blue) + "Clear terminal" link (red) — gated by online/offline rule
- [ ] Keep existing mode-aware visibility (hide when online + empty queue)

### S5 — Bottom tab bar (mockup 2)
- [ ] Tabs: Scan (active blue), Tickets, Sync (with notification dot)
- [ ] NOTE: "Tickets" has no feature/data → placeholder screen ("coming soon")

## Notes / gaps requiring a decision
- **Seat info** in banner: not available from backend scan result → render the result message.
- **Tickets tab**: no backing feature → placeholder. (Or drop the tab — needs user call.)
- **Accepted = blue** per mockup (not green); duplicate/invalid keep amber/red.
