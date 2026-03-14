# live-location

Small Node.js + Socket.IO app for collecting live coordinates, storing them on disk, and visualizing them in real time on a map.

## What this project does

*   Serves a live map dashboard.
*   Accepts location updates over HTTP and Socket.IO.
*   Stores all received points in `data/locations.json`.
*   Reverse-geocodes each point to a readable address with OpenStreetMap Nominatim.
*   Broadcasts new points and clear events to all connected clients.

## Tech stack

*   Node.js
*   Express
*   Socket.IO
*   Plain HTML + browser JavaScript
*   Tailwind via CDN
*   Google Maps JavaScript API

## Project structure

```
live-location/
├─ data/
│  └─ locations.json        # created automatically
├─ public/
│  ├─ index.html            # live map dashboard
│  └─ track-me.html         # geolocation sender page
├─ package.json
├─ server.js
└─ README.md
```

## Pages

### `/` -> `public/index.html`
[https://live-location-96ki.onrender.com/](https://live-location-96ki.onrender.com/)

Main dashboard page.

Features:

*   Shows all stored coordinates on a Google Map.
*   Draws a polyline across the received points.
*   Marks start point, latest point, and intermediate dots.
*   Shows a sidebar with recent points.
*   Displays timestamp, coordinates, reverse-geocoded address, and metadata.
*   Receives real-time updates through Socket.IO.
*   Lets the user clear all stored locations.
*   Supports auto-zoom toggle.

### `/track-me.html` -> `public/track-me.html`
[https://live-location-96ki.onrender.com/track-me.html](https://live-location-96ki.onrender.com/track-me.html)

Client page for sending the current browser location to the server.

Features:

*   Uses browser geolocation with `watchPosition`.
*   Sends live coordinates every 5 seconds.
*   Supports manual `Send once`.
*   Includes `Start tracking` and `Stop` controls.
*   Adds metadata such as accuracy, heading, speed, altitude, and source.
*   Sends points with label `track-me`.
*   Shows example client snippets for JavaScript and Flutter Socket.IO integration.

## How data flows

1.  A client sends coordinates through HTTP or Socket.IO.
2.  The server validates and normalizes the payload.
3.  The server fetches a human-readable address using reverse geocoding.
4.  The point is appended to `data/locations.json`.
5.  The server emits the new point to all connected clients.
6.  The dashboard updates the map and recent-points list live.

## Install

From the `live-location` directory:

```
npm install
```

## Run

Development:

```
npm run dev
```

Production-style start:

```
npm start
```

Default URL:

```
http://localhost:3000
```

## Available npm commands

*   `npm install` - install dependencies
*   `npm run dev` - start the server with Node.js
*   `npm start` - start the server
*   `npm test` - currently not implemented and exits with an error

## Environment

The server uses:

*   `PORT` - optional port override, defaults to `3000`

Example:

```
PORT=4000 npm start
```

On PowerShell:

```
$env:PORT=4000
npm start
```

## API

### `GET /api/locations`

Returns all saved entries.

Example response:

```
{
  "db": [
    {
      "coords": { "lat": 37.42, "lng": -122.08 },
      "meta": { "source": "track-me" },
      "label": "track-me",
      "ts": 1710000000000,
      "address": "Mountain View, California, United States"
    }
  ]
}
```

### `POST /api/locations`

Creates a new location entry.

Example request:

```
{
  "coords": { "lat": 37.42, "lng": -122.08 },
  "meta": { "speed": 12.3, "battery": 0.8 },
  "label": "device-123"
}
```

If coordinates are invalid, the server returns:

```
{ "message": "Invalid coords" }
```

### `DELETE /api/locations`

Clears all stored points.

Example response:

```
{ "ok": true }
```

## Socket.IO events

### Server -> client

*   `locations:init` - sends the full saved array on connection
*   `locations:new` - sends one new enriched location entry
*   `locations:clear` - informs clients that all data was removed

### Client -> server

*   `location:new` - submit a new location payload
*   `locations:clear` - clear all saved locations

## Payload shape

Typical saved entry:

```
{
  "coords": {
    "lat": 37.42,
    "lng": -122.08
  },
  "meta": {
    "accuracy": 12,
    "speed": 4.2,
    "source": "track-me"
  },
  "label": "track-me",
  "ts": 1710000000000,
  "address": "Mountain View, Santa Clara County, California, United States"
}
```

## Storage

*   Data is persisted in `data/locations.json`.
*   The server creates the `data` directory and file automatically if missing.
*   File format is:

```
{
  "db": []
}
```

## Notes and caveats

*   `public/index.html` contains a Google Maps API key directly in the page. For real deployment, replace it with your own key and restrict it properly.
*   Reverse geocoding depends on the Nominatim service being reachable.
*   Location tracking in `/track-me.html` requires browser geolocation permission.
*   On some browsers, geolocation works only on `localhost` or HTTPS origins.

## Quick start

```
cd live-location
npm install
npm run dev
```

Then open:

*   `http://localhost:3000/` for the live map
*   `http://localhost:3000/track-me.html` for the location sender