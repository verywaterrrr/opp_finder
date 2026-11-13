# Opportunities

Local, private-first student opportunity browser for Hong Kong and Shenzhen.

## Start

Requires Node.js 22.13 or newer (the local database uses `node:sqlite`).

```sh
npm install
npm run build
npm start
```

Open http://127.0.0.1:5173. The server intentionally listens only on this computer. It is not a secure public deployment: do not expose the port to the internet. Profile, recurring weekly availability and saved items are stored in the browser. The database is stored in `data/`, with local owner-only file permissions.

A macOS LaunchAgent named `local.opportunities-hub` starts the local server on login. While it is running, the public sources refresh approximately every 24 hours; it also refreshes on startup if the previous successful HKUST refresh is more than a day old. The computer must be running for this to happen. The Refresh button runs a refresh immediately. To disable the service, run `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.opportunities-hub.plist` and remove the plist if it is no longer wanted.

## Sources and limitations

Public discovery checks the HKUST University Event Calendar, HKUST CSE's internship listing, HKU's competition directory, HKUST Entrepreneurship Center events, CUHK Knowledge Transfer Office competitions, CityUHK external events, and HackerTrip's public Shenzhen listings. It is selective, and neither complete nor a guarantee of first-year eligibility. Listings with unstated eligibility or times remain visible. Follow the source link to verify current eligibility and registration. Automated extraction may miss changes or classify an event incorrectly. Source failures preserve prior data. Open statuses become unknown after seven days without verification.

The schedule filter uses the weekly grid only when a source provides an unambiguous single-day event time. It treats every selected half-hour as recurring weekly, in Hong Kong time. Listings without enough time information remain visible.

## Mailbox

The mailbox records are a one-time snapshot imported using the connected Outlook account. The snapshot is also published on GitHub Pages at the owner’s request. It includes message subjects and Outlook links, but not email bodies. Outlook links still require access to the original account. The snapshot does not update automatically.

Automatic mailbox syncing has been deferred. The current records are a one-time snapshot and can be removed from the Mailbox view.

## Tests

```sh
npm test
npm run build
```

## GitHub Pages

The public build is a static site. GitHub Actions refreshes public sources and publishes a JSON snapshot daily. A separate mailbox snapshot is published with the site at the owner’s request; it is not refreshed automatically. The visitor's profile, saved items and availability remain in their own browser. Data is only as current and complete as its sources. The public site has no live mailbox connection or server-side account. Scheduled Actions may run late, and a failed source retains its previous public records.

To build the public version locally:

```sh
node scripts/generate-public-data.js
VITE_PUBLIC_MODE=true npm run build
```
