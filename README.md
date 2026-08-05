# Oh Jamming — Client

Frontend for **Oh Jamming**, a web app for booking a spot in a jam session.

Consumes the [oh-jamming-api](https://github.com/JimeBlue/oh-jamming-api) backend.

## Tech stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- daisyUI 5

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The API must be running on the URL set in `NEXT_PUBLIC_API_URL`.

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the dev server (Turbopack)  |
| `npm run build` | Production build                  |
| `npm run start` | Serve the production build        |
| `npm run lint`  | Run ESLint                        |

## Environment variables

| Variable              | Description               |
| --------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Oh Jamming API |
