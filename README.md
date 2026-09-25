# Neon Rush

A real-time 2–8 player browser reaction game built with Node.js, Express and Socket.IO.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser tabs/devices. Create a room in one and join with the room code in the other.

## Deploy

Deploy as a Node web service. Build command: `npm install`. Start command: `npm start`. The service must expose the assigned `PORT` environment variable (already supported).

## Architecture

The server owns room membership, game phase, round timing, target state, click order and scores. Clients render the authoritative state and send only player actions. This prevents clients from directly setting their score.
