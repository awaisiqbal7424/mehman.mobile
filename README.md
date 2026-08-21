# Mehman — mobile

One native app for both sides of the Mehman marketplace: travellers browsing and
booking, and Mezbans (hosts) running their listings. iOS and Android from a
single React Native codebase.

It talks to the same backend as the two web apps (`Mehman.co` and
`Mehman.provider`), so nothing here needs a new API.

---

## Running it

```bash
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (Android) or the Camera app (iOS). For a
build with the native modules compiled in:

```bash
npx expo run:android
npx expo run:ios      # macOS only
```

`npm run typecheck` runs TypeScript over the whole project.

### Pointing at a different backend

Production is set in `app.json` (`extra.apiUrl`). To override it for a build or
a dev session, copy `.env.example` to `.env.local` and set:

```
EXPO_PUBLIC_API_URL=https://staging.example.com
```

> **`expo start --web` will not load data.** The API only sends CORS headers to
> `mehman.co`, so a browser on `localhost` is refused. Native builds have no CORS
> and are unaffected. The web target exists for laying out screens quickly, not
> for testing against real data.

---

## Shipping

Builds go through EAS (`eas.json` has the three profiles):

```bash
npx eas build --profile preview   --platform android   # installable APK
npx eas build --profile production --platform all      # store builds
npx eas submit --platform ios
```

Bundle id / package name: `co.mehman.app`.

---

## How it is put together

```
app/                       expo-router — the file tree IS the navigation
  _layout.tsx              providers, session bootstrap, root stack
  index.tsx                sends you to the guest or host side
  (auth)/                  sign in · sign up · forgot password
  (guest)/                 Explore · Search · Trips · Inbox · Profile  (tabs)
  (host)/                  Today · Bookings · Calendar · Listings · More (tabs)
  package/[id]             a listing, with the booking sheet
  provider/[id]            a host's page
  booking/[id]             one booking, and what to do about it
  checkout · payment/      the money path
  trip-builder · trip/[id] custom trips
  chat/[id]                one conversation (live over SignalR)
  host/                    onboarding, listing editor, earnings, quotes,
                           reviews, messages, seasonal pricing

src/
  api/client.ts            axios + JWT in the device keychain
  api/services.ts          every endpoint, both sides, in one file
  components/ui/           the design system (Button, Card, Sheet, …)
  components/              PackageCard, BookingCard, Calendar
  store/                   auth (incl. the role switch), wishlist
  theme/                   colours, spacing, type scale, elevation
  types/                   shared with the web apps, plus host shapes
  utils/                   formatting, package-type rules
```

### One app, two roles

The thing that makes this one app rather than two is `src/store/auth.ts`. An
account is a traveller by default; if it also owns an **approved** business, the
profile screen offers **Switch to hosting** and the host tabs become reachable.
The chosen role is remembered between launches, but only restored if the
business is still approved — the `(host)` layout re-checks and redirects
otherwise, so a withdrawn approval or a stale deep link cannot land someone in a
panel where every request would fail.

Hosts reach the traveller side the same way, from **More → Switch to
travelling**. Nobody has to sign out to change hats.

### Decisions worth knowing

- **Tokens live in the device keychain** (`expo-secure-store`), not in
  `AsyncStorage`. Since axios interceptors are synchronous and SecureStore is
  not, the token is mirrored in memory and hydrated once at launch.
- **Prices always state their unit.** The same card carries tours priced per
  seat and stays priced per night; a bare number next to two different things is
  how people get surprised at checkout.
- **Nothing marks a payment complete.** Guests transfer to a wallet and upload
  the receipt; verification is a human decision, made elsewhere.
- **Confirming a booking creates it as `PENDING` before payment.** If the
  transfer fails or is abandoned, the host still has a booking they can see and
  chase, rather than nothing.
- **Destructive actions go through a sheet, never an OS alert**, so the wording
  and the consequences are ours to state.
- **Loading shows the shape of what is coming**, not a centred spinner. On a
  mountain road that is the difference between "slow" and "broken".

### What is not wired up

- **Listing photos picked on the phone stay on the phone.** There is no image
  upload endpoint yet, so the listing editor warns rather than pretending. Add
  the endpoint and `host/listing/[id].tsx` is the only file that changes.
- **Payment receipts** use the same endpoint the web app expects; if it answers
  404/405 the app falls back to WhatsApp rather than losing the screenshot.
- **Push notifications**: `expo-notifications` is installed and the backend has
  an `expoKey` field on notifications, but registration is not implemented.
