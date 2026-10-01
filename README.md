# Snakes & Ladders — Wheel of Fate

A responsive local multiplayer board game built with React and Vite.

## Development

```bash
npm install
npm run dev
```

On Windows, these commands automatically stage the source under `%LOCALAPPDATA%\SnakeLadderDev` before invoking Node. This avoids Node's `EPERM` error when the repository is stored inside OneDrive.

To test on another device connected to the same Wi-Fi, run `npm run dev:lan` and open the displayed network URL on that device.

## Production

```bash
npm run build
npm run preview
```

The local Windows build command remains `npm run build`. For a Linux production host, use `npm run build:render`.

## Deploy the complete game on Render

This repository includes `render.yaml`, which deploys the React client and the
authoritative Socket.IO server together as one Render Web Service.

1. Push the repository to GitHub.
2. In Render, select **New > Blueprint** and connect the repository.
3. Approve the service described by `render.yaml`.
4. After deployment, open the generated `https://...onrender.com` address.

Render uses `npm ci && npm run build:render` to build and `npm start` to run the
game. The `/health` endpoint is used for health checks. No
`VITE_MULTIPLAYER_SERVER_URL` is required because the website and Socket.IO
server share the same origin.

## Online multiplayer (Phase 4A)

During local development, online rooms use a separate authoritative Socket.IO service. Start it in one terminal with `npm run server`, then start the frontend in a second terminal with `npm run dev` or `npm run dev:lan`.

The default server is `http://<frontend-host>:3001`. For production builds, set `VITE_MULTIPLAYER_SERVER_URL=https://your-realtime-server.example.com`. Static hosts can serve the frontend, but `server/` must be deployed to a Node.js host supporting persistent WebSockets. Set `CLIENT_ORIGIN` there to the frontend origin and `MULTIPLAYER_PORT` if port 3001 is unavailable.

Phase 4A includes private rooms, unique colors, host settings, ready states, lobby synchronization, validation, rate limiting, and cleanup. Authoritative gameplay synchronization is intentionally reserved for Phase 4B.

### Share from your own PC

Cloudflare Tunnel is supported for temporary public play sessions. Stop any existing `npm run server` process, then run:

```powershell
npm run public
```

The command builds the game, starts the authoritative server, and prints a temporary `https://...trycloudflare.com` link. Share that single link with your friends. Everyone chooses **Online Game** and joins the same room code. Keep the PowerShell window open; closing it or pressing Ctrl+C removes public access. The temporary address changes the next time you run the command.

## Test the included production build on Windows

The production build is a self-contained file. Double-click `dist/index.html` to run it directly without a server. You can still use `start-preview.bat` if you prefer testing through localhost.
