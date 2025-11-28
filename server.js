const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'locations.json');
const PORT = process.env.PORT || 3000;
const USER_AGENT = 'live-location-app/1.0 (+https://example.com)';

const ensureStorage = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ db: [] }, null, 2));
  }
};

const readDb = () => {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.db)) {
      return parsed.db;
    }
  } catch (err) {
    console.error('Failed to read coord store', err);
  }
  return [];
};

const persistDb = (entries) => {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ db: entries }, null, 2));
};

const normalizeEntry = (payload) => {
  const source = payload?.coords ? payload.coords : payload;
  const lat = Number(source?.lat);
  const lng = Number(source?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const meta =
    payload?.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? payload.meta
      : null;

  const label =
    typeof payload?.label === 'string' && payload.label.trim().length
      ? payload.label.trim()
      : typeof source?.label === 'string' && source.label.trim().length
        ? source.label.trim()
        : undefined;

  return {
    coords: {
      lat,
      lng
    },
    meta,
    label,
    ts: Date.now(),
  };
};

const fetchAddress = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    if (!res.ok) {
      throw new Error(`Reverse geocode failed: ${res.status}`);
    }
    const data = await res.json();
    return data?.display_name || null;
  } catch (err) {
    console.warn('Could not fetch address', err);
    return null;
  }
};

const withAddress = async (entry) => {
  const lat = entry?.coords?.lat;
  const lng = entry?.coords?.lng;
  const address = Number.isFinite(lat) && Number.isFinite(lng) ? await fetchAddress(lat, lng) : null;
  return { ...entry, address };
};

const addEntry = (entry) => {
  const db = readDb();
  db.push(entry);
  persistDb(db);
  return entry;
};

const clearDb = () => {
  persistDb([]);
  return [];
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/locations', (_req, res) => {
  res.json({ db: readDb() });
});

app.post('/api/locations', async (req, res) => {
  const entry = normalizeEntry(req.body);
  if (!entry) {
    return res.status(400).json({ message: 'Invalid coords' });
  }
  const enriched = await withAddress(entry);
  addEntry(enriched);
  io.emit('locations:new', enriched);
  res.status(201).json(enriched);
});

app.delete('/api/locations', (_req, res) => {
  clearDb();
  io.emit('locations:clear');
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.emit('locations:init', readDb());

  socket.on('location:new', async (payload) => {
    const entry = normalizeEntry(payload);
    if (!entry) {
      console.warn('Received invalid coords from socket payload', payload);
      return;
    }

    const enriched = await withAddress(entry);
    addEntry(enriched);
    io.emit('locations:new', enriched);
  });

  socket.on('locations:clear', () => {
    clearDb();
    io.emit('locations:clear');
  });
});

ensureStorage();
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
