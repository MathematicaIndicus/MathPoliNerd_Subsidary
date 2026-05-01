function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const map = { home: 0, about: 1, blogs: 2, contact: 3 };
  const links = document.querySelectorAll('.nav-links .nav-link');
  if (links[map[id]]) links[map[id]].classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(initReveal, 100);
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
});

function toggleMenu() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
}

function initReveal() {
  const els = document.querySelectorAll('.page.active .reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), index * 80);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => observer.observe(el));
}

function filterPosts(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.blog-row').forEach(row => {
    const show = cat === 'all' || row.dataset.cat === cat;
    row.style.display = show ? 'grid' : 'none';
    row.style.opacity = show ? '1' : '0';
  });
}

let blogPosts = [];
const POST_CLICK_COUNTS_KEY = 'mathPoliNerdPostClickCounts';

const categoryLabels = {
  'game-theory': 'Game Theory',
  voting: 'Voting Theory',
  econ: 'Political Economy',
  philosophy: 'Philosophy',
  analysis: 'Analysis',
  statistics: 'Statistics',
  algebra: 'Algebra'
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getPostClickCounts() {
  try {
    return JSON.parse(localStorage.getItem(POST_CLICK_COUNTS_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function savePostClickCounts(counts) {
  try {
    localStorage.setItem(POST_CLICK_COUNTS_KEY, JSON.stringify(counts));
  } catch (error) {
    // Browsing modes can block localStorage; the post should still open normally.
  }
}

function recordPostClick(slug) {
  if (!slug) return;

  const counts = getPostClickCounts();
  counts[slug] = (Number(counts[slug]) || 0) + 1;
  savePostClickCounts(counts);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function estimateReadMinutes(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function getMostClickedPost() {
  const counts = getPostClickCounts();
  return blogPosts.reduce((winner, post) => {
    const clicks = Number(counts[post.slug]) || 0;
    if (!clicks) return winner;
    if (!winner || clicks > winner.clicks) return { post, clicks };
    if (clicks === winner.clicks && new Date(post.createdAt) > new Date(winner.post.createdAt)) {
      return { post, clicks };
    }
    return winner;
  }, null)?.post || null;
}

function renderFeaturedEssay() {
  const featuredPost = getMostClickedPost();
  if (!featuredPost) return;

  const label = document.getElementById('featuredLabel');
  const title = document.getElementById('featuredTitle');
  const excerpt = document.getElementById('featuredExcerpt');
  const button = document.getElementById('featuredButton');
  const image = document.getElementById('featuredImage');

  if (label) label.textContent = '\u2726 Most Read Essay';
  if (title) title.textContent = featuredPost.title;
  if (excerpt) excerpt.textContent = featuredPost.excerpt || 'A reader favorite from the archive.';
  if (button) {
    button.onclick = () => showPost(featuredPost.slug);
    button.textContent = 'Read Essay \u2192';
  }
  if (image && featuredPost.image) {
    image.innerHTML = `<img src="${escapeHtml(featuredPost.image)}" alt="${escapeHtml(featuredPost.title)}">`;
  }
}

function renderMath(container) {
  if (!window.renderMathInElement) return;

  renderMathInElement(container, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true }
    ],
    throwOnError: false
  });
}

function renderMarkdown(markdown) {
  if (!window.marked || !window.DOMPurify) {
    return `<pre>${escapeHtml(markdown)}</pre>`;
  }

  return DOMPurify.sanitize(marked.parse(markdown || ''));
}

function postImage(post, className) {
  if (!post.image) return `<div class="${className}"></div>`;
  return `<div class="${className}"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}"></div>`;
}

function renderLatestPosts() {
  const latestPosts = document.getElementById('latestPosts');
  if (!latestPosts) return;

  const posts = blogPosts.slice(0, 3);
  if (!posts.length) {
    latestPosts.innerHTML = '<p class="blog-loading">No published posts yet. Create one in the admin editor.</p>';
    return;
  }

  latestPosts.innerHTML = posts.map(post => `
    <article class="post-card reveal" onclick="showPost('${escapeHtml(post.slug)}')">
      <div class="card-img-wrap">
        ${postImage(post, 'card-img')}
        <span class="card-cat">${escapeHtml(categoryLabels[post.category] || post.category)}</span>
      </div>
      <div class="card-body">
        <p class="card-meta">${formatDate(post.createdAt)} &nbsp;&middot;&nbsp; ${post.readMinutes} min read</p>
        <h3 class="card-title">${escapeHtml(post.title)}</h3>
        <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      <div class="card-footer">
        <span class="card-read">Read Article &rarr;</span>
        <span class="card-time">${post.readMinutes} min</span>
      </div>
    </article>
  `).join('');
}

function renderBlogList() {
  const blogList = document.getElementById('blogList');
  if (!blogList) return;

  if (!blogPosts.length) {
    blogList.innerHTML = '<p class="blog-loading">No published posts yet. Create one in the admin editor.</p>';
    return;
  }

  blogList.innerHTML = blogPosts.map(post => `
    <article class="blog-row reveal" data-cat="${escapeHtml(post.category)}" onclick="showPost('${escapeHtml(post.slug)}')">
      <div class="blog-row-img-wrap">
        <div class="blog-row-img">
          ${post.image ? `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}">` : ''}
          <span class="blog-row-badge">${escapeHtml(categoryLabels[post.category] || post.category)}</span>
        </div>
      </div>
      <div>
        <p class="blog-row-cat">${escapeHtml(categoryLabels[post.category] || post.category)}</p>
        <h3 class="blog-row-title">${escapeHtml(post.title)}</h3>
        <p class="blog-row-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="blog-row-footer">
          <span class="blog-row-meta">${formatDate(post.createdAt)} &nbsp;&middot;&nbsp; ${post.readMinutes} min read</span>
          <span class="blog-row-read">Read &rarr;</span>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadBlogPosts() {
  try {
    const response = await fetch('data/posts.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load posts.');

    const posts = await response.json();
    blogPosts = posts
      .filter(post => post.published)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(post => ({
        ...post,
        readMinutes: estimateReadMinutes(post.content)
      }));

    renderLatestPosts();
    renderBlogList();
    renderFeaturedEssay();
    initReveal();
  } catch (error) {
    const message = 'Published posts could not be loaded. Please try again shortly.';
    const latestPosts = document.getElementById('latestPosts');
    const blogList = document.getElementById('blogList');
    if (latestPosts) latestPosts.innerHTML = `<p class="blog-loading">${message}</p>`;
    if (blogList) blogList.innerHTML = `<p class="blog-loading">${message}</p>`;
  }
}

function showPost(slug) {
  const post = blogPosts.find(item => item.slug === slug);
  const reader = document.getElementById('postReader');
  if (!post || !reader) return;

  recordPostClick(slug);

  reader.innerHTML = `
    <p class="blog-row-cat">${escapeHtml(categoryLabels[post.category] || post.category)}</p>
    <h1 class="post-reader-title">${escapeHtml(post.title)}</h1>
    <p class="post-reader-meta">${formatDate(post.createdAt)} &nbsp;&middot;&nbsp; ${post.readMinutes} min read</p>
    ${post.image ? `<img class="post-reader-image" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}">` : ''}
    <div class="post-reader-content">${renderMarkdown(post.content)}</div>
  `;
  renderMath(reader);
  showPage('post');
}

function submitForm() {
  const fname = document.getElementById('fname').value.trim();
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('message').value.trim();

  if (!fname || !email || !msg) {
    alert('Please fill in your name, email, and message.');
    return;
  }

  const successMsg = document.getElementById('successMsg');
  successMsg.style.display = 'block';

  ['fname', 'lname', 'email', 'subject', 'message'].forEach(id => {
    document.getElementById(id).value = '';
  });

  setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  const firstLink = document.querySelector('.nav-links .nav-link');
  if (firstLink) firstLink.classList.add('active');
  loadBlogPosts();
  initReveal();
});
