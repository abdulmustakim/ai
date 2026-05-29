# PixelForge AI - Connected AI Image Generator Website

This is an ultra professional AI image generator website with a secure Node.js backend connection.

The frontend is in `public/`. The backend is in `server.js` and calls the OpenAI Images API from the server so your API key is not exposed in the browser.

## Project Structure

```txt
ai-image-website-connected/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## How to Run

### 1. Install Node.js

Use Node.js 18 or newer.

### 2. Install packages

```bash
npm install
```

### 3. Create your `.env` file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
copy .env.example .env
```

Then open `.env` and add your API key:

```env
OPENAI_API_KEY=sk-your-real-api-key-here
OPENAI_IMAGE_MODEL=gpt-image-2
PORT=3000
MAX_IMAGES_PER_REQUEST=4
MAX_REQUESTS_PER_WINDOW=10
```

### 4. Start the website

```bash
npm start
```

Open this in your browser:

```txt
http://localhost:3000
```

## Important Security Notes

- Never put your API key inside `public/app.js`.
- Never upload `.env` to GitHub.
- The `.gitignore` file already blocks `.env` and `node_modules/`.
- Use a backend server for real AI generation because browser JavaScript is visible to users.

## What Was Connected

- `POST /api/generate-image` backend route
- OpenAI Images API call using `openai.images.generate()`
- Secure `.env` API key system
- Frontend `fetch('/api/generate-image')` integration
- PNG base64 preview and download support
- Image size mapping:
  - Square: `1024x1024`
  - Landscape: `1536x1024`
  - Portrait: `1024x1536`
- Quality mapping:
  - Standard: `low`
  - HD: `medium`
  - Ultra 4K: `high`
- Basic rate limiting to protect your API credits
- Demo fallback if backend/API key is not ready

## Deploy Notes

GitHub Pages can host only the frontend, not the Node.js backend. For real AI generation, deploy this project on a backend-capable service such as:

- Render
- Railway
- Vercel serverless functions
- VPS hosting
- Replit

For production, add user login, image history database, payment/credit system, and cloud storage.
