# Student Opportunities Hub Implementation Plan

**Goal:** Build a private-first website that discovers opportunities relevant to students in Hong Kong and Shenzhen, with a personal, private HKUST mailbox feed and direct links to apply or register.

**Architecture:** A responsive web app reads normalized opportunities from a database. Scheduled source adapters discover public opportunities and, separately, relevant messages from the owner's read-only mailbox. The server enforces private access to mailbox-derived records; the visitor's optional profile controls eligibility filtering on their device.

**Proposed stack:** Next.js and TypeScript; PostgreSQL with Prisma; scheduled server-side jobs; Microsoft Graph for an HKUST Microsoft 365 mailbox if permitted; Vitest and Playwright for critical behavior. Choose a hosting provider after confirming budget and scheduled-job support.

**Spec:** The agreed requirements and implementation decisions are recorded in this document; no separate specification exists.

## Global requirements

- [ ] Start with a private deployment for the owner to test; support a later public launch with a private owner-only mailbox feed.
- [ ] Provide switchable Hong Kong and Shenzhen views, plus activity buttons for All, Hackathons, Case competitions, Internships, Workshops, Networking, Volunteering and Other.
- [ ] Include relevant online and hybrid opportunities in both city views when participation is open in both places. Do not assume international eligibility where a source imposes restrictions.
- [ ] Include open and upcoming opportunities by default, with a filter for closed ones. Preserve past listings for reference.
- [ ] Show compact cards with name, organizer, date, deadline, eligibility, format and a direct registration/application button when the source provides them. Omit unsupported details and tags; identify unknown status as unknown rather than inventing a deadline or requirement.
- [ ] Treat opportunities open to undergraduates or students as potentially suitable for first-year students unless a stated rule excludes them; keep unspecified eligibility visible. Show explicit restrictions faithfully.
- [ ] Show requirement hashtags, such as `#CV required`, only when the source states them. Link every listing to its source and show its last successful verification date.
- [ ] Collect an optional first-visit profile (university, study year and interests), persist it locally, and allow later editing and clearing. Provide personalized and all-opportunities views.
- [ ] Hide only clearly incompatible listings in personalized mode; keep unknown eligibility visible. Present stated eligibility on cards so users can check it themselves.
- [ ] Discover public sources and scan the owner's mailbox daily, with an owner-only manual refresh. Display the last successful sync and any sync errors.
- [ ] Keep mailbox-derived listings, email contents, identifiers and links private to the owner. Public sources may independently produce a public listing for the same opportunity.
- [ ] Follow source access terms and rate limits; do not promise exhaustive coverage or invent facts.

## Review focus

- [ ] A source omits eligibility or a deadline: preserve unknown values and avoid claiming an application is open.
- [ ] A first-year student is explicitly excluded: hide the record only in personalized mode, while retaining it in All.
- [ ] An online opportunity has a residency restriction: do not automatically show it as eligible in both cities.
- [ ] A private email and public page refer to the same event: deduplication cannot expose private fields or make the private source public.
- [ ] Mailbox authorization expires or a source fails: retain previously verified data, show stale/error status, and never report a successful refresh.

## Project structure

- `src/app/` — pages, layout, and authenticated API routes.
- `src/components/` — profile popup, switches, filters, opportunity cards and sync status.
- `src/lib/opportunities/` — types, eligibility, status, normalization and deduplication.
- `src/lib/sources/` — public source adapters and source registry.
- `src/lib/mail/` — read-only mailbox authorization, scanning and extraction.
- `src/lib/auth/` — owner authentication and authorization.
- `src/jobs/` — scheduled and manual discovery orchestration.
- `prisma/schema.prisma` — persistent opportunity, provenance, sync and connection models.
- `tests/` — focused unit, integration and browser tests.

## Step-by-step checklist

### 1. Establish the project and domain

- [ ] Initialize the Next.js TypeScript app, Prisma, PostgreSQL, Vitest and Playwright; add documented local environment setup and a sample environment file without secrets.
- [ ] Define an `Opportunity` model with title, organizer, categories, location/format, event dates, registration deadline, registration URL, eligibility statements, explicit requirement tags, status, visibility and timestamps. Make unknown fields nullable.
- [ ] Define separate `SourceEvidence` records with source URL or private message reference, visibility and last verified time. Keep provenance per record so public and private facts never silently merge.
- [ ] Define sync-run records with source, started/completed time, status and sanitized error. Store time zones and timestamps unambiguously; display dates in Hong Kong time unless an event specifies otherwise.
- [ ] Test that missing dates and eligibility remain unknown and that private evidence cannot be returned through public queries.

### 2. Implement profile and eligibility

- [ ] Build the first-visit popup with optional university, study year and interest fields, a skip option and clear privacy copy explaining local storage.
- [ ] Persist the profile in browser local storage, restore it on return, and provide edit and clear controls; do not require account creation.
- [ ] Implement deterministic eligibility matching based only on explicit structured restrictions; return `eligible`, `ineligible` or `unknown` and keep unknown records visible in the personalized view.
- [ ] Add a personalized/All switch and test first-year inclusion, explicit exclusion, unknown eligibility, skipped profiles and profile edits.

### 3. Build the browsing experience

- [ ] Implement accessible Hong Kong/Shenzhen switches and activity buttons, with selected states, keyboard navigation and mobile layouts.
- [ ] Add open/upcoming default filtering, a closed filter, and a visible unknown-status treatment; do not treat a missing deadline as proof registration is open.
- [ ] Render compact cards and source links. Show only supported fields and tags; use an official registration/application URL when available, otherwise link to the official event page with an accurate button label.
- [ ] Handle empty results, loading, unavailable sources and stale data. Test city/category switching, online restrictions, card links, status filtering and mobile/keyboard navigation.

### 4. Secure private access

- [ ] Implement owner authentication using a maintained authentication provider, restricted to the owner's verified account. Configure the initial site so every route requires authentication.
- [ ] Enforce authorization server-side for private listings, source evidence, mailbox operations and refresh endpoints; never rely on hiding UI elements.
- [ ] Prepare a configuration for later public browsing that exposes only public records and keeps owner endpoints protected. Do not change deployment access until requested.
- [ ] Test anonymous, non-owner and owner requests, including direct API access and guessed record IDs.

### 5. Discover and verify public opportunities

- [ ] Research and record an initial set of official university, organizer and opportunity sources for both cities. Record access method, permission/terms, update frequency and coverage limitations for each.
- [ ] Implement a source-adapter interface returning normalized candidates with evidence URLs. Start with sources that permit reliable automated access; avoid bypassing access controls.
- [ ] Extract dates, application links, eligibility and requirements only where supported by source evidence. Normalize duplicate public listings while preserving each source and the most recent successful verification.
- [ ] Schedule daily refreshes and provide an authenticated manual refresh with rate limits and a progress/result indicator.
- [ ] On failures, preserve previously verified listings, mark their verification date and record the error; do not fabricate live status. Test duplicate sources, changes in deadlines, missing data and partial source failures.

### 6. Connect the owner's HKUST mailbox

- [ ] Verify which provider serves the owner's mailbox and whether HKUST permits the required app registration and read-only permissions. Use Microsoft Graph only if Microsoft 365 and tenant policy permit it; document any administrator approval or sign-in step.
- [ ] Implement an owner-initiated, read-only authorization flow using least privilege; securely store and rotate/revoke tokens server-side. Never put tokens in browser storage or repository files.
- [ ] Scan relevant opportunity messages daily using a bounded initial lookback and incremental updates. Extract only useful opportunity facts and retain the minimum private message reference needed for provenance.
- [ ] Keep original message bodies and mailbox-derived records private. Add disconnect and deletion controls for saved mailbox credentials and imported private data; do not alter or send email.
- [ ] Resolve duplicates without leaking email-only details into public records. When no public application link exists, provide an owner-only link to the original message where supported.
- [ ] Test expired permissions, reconnect/disconnect, private/public duplicates, missing links and partial sync failures. If tenant policy blocks access, report the blocker and ship public discovery without claiming mailbox sync works.

### 7. Prepare the private launch

- [ ] Configure production secrets, database backups, scheduled jobs, HTTPS and authentication on a host that supports the chosen architecture; document operating costs and any provider limits before deployment.
- [ ] Seed or run a real discovery cycle and manually verify representative current listings, eligibility, deadlines, tags and registration links against their sources.
- [ ] Run unit, integration and browser tests, production build, accessibility and responsive checks; fix failures and record results.
- [ ] Verify private deployment access, owner-only mailbox data and refresh controls using separate signed-in and signed-out sessions.
- [ ] Document setup, adding sources, sync health, profile storage, mailbox disconnection, data deletion and the steps required for a later public launch.

## Completion criteria

- [ ] A visitor can save or skip a profile, browse either city and each activity type, and reach verified registration or source pages.
- [ ] Unknown facts remain unknown; explicit first-year exclusions and stated requirements are reflected accurately.
- [ ] Public discovery runs daily and reports freshness and failures; coverage is described honestly.
- [ ] The owner's mailbox feed is private and verified end-to-end, or a specific external access blocker is documented.
- [ ] The initial deployment is private, and authorization tests demonstrate that private records cannot be fetched by other users.
