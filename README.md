# MathPoliNerd_Subsidary

Static personal website and blog for GitHub Pages.

## Publishing blog posts

The public site reads published posts from `data/posts.json`, so it can run on GitHub Pages without a backend.

To edit posts locally:

1. Run `npm start`.
2. Open `http://localhost:3000/admin.html`.
3. Use the local token `local-dev-token`, unless `BLOG_ADMIN_TOKEN` is set.
4. Create or edit posts and mark the ones you want online as published.
5. Commit and push the updated `data/posts.json`.

GitHub Pages will redeploy after the push, and online readers will see the updated published posts.
