# MathPoliNerd_Subsidary

Static public website with a separate blog API/admin server.

## Architecture

- `index.html`, `style.css`, `script.js`, `config.js`, `MyPicture.jpeg`, and `.nojekyll` are the public static website.
- `server.js` is the blog API/admin server. It stores posts in `data/posts.json`.
- `admin.html` is a browser admin editor. You can open it locally or host it privately and point it at the blog server.

## Local development

1. Create a `.env` file with `BLOG_ADMIN_TOKEN=your-long-random-token`.
2. Run `npm start`.
3. Open `http://localhost:3000/` for the public site.
4. Open `http://localhost:3000/admin.html` for the admin editor.
5. Paste the token from your `.env` file into the admin page.

## Deployment

1. Deploy the blog server somewhere that can run Node.js.
2. Set these environment variables on the server:
   - `BLOG_ADMIN_TOKEN`: a long private token only you know.
   - `PUBLIC_ORIGINS`: your public website origin, for example `https://yourname.github.io`. Use `*` while testing if needed.
   - `CONTACT_TO_EMAIL`: the private email address where contact form messages should be delivered.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP credentials for a verified sender account. For Gmail, use an app password rather than your main account password.
   - `PORT`: optional. Many hosts set this automatically.
3. Confirm the API works at `https://your-server.example/api/posts`.
4. Edit `config.js` before publishing the static site:

```js
window.MathPoliNerdConfig = {
  BLOG_API_BASE_URL: "https://your-server.example",
  ADMIN_API_BASE_URL: "https://your-server.example"
};
```

5. Publish the static files to GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, or any static host.
6. Open `admin.html`, confirm the Blog Server URL points at your server, paste `BLOG_ADMIN_TOKEN`, and create posts.
