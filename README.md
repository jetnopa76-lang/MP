# MyPhoto — Deploy Guide

## Option 1: Netlify (Easiest — No Terminal Needed)

1. Go to **https://app.netlify.com/signup** and create a free account
2. From your Netlify dashboard, click **"Add new site" → "Import an existing project"**
3. Choose **"Deploy manually"** (drag & drop)
4. But first you need to build — see Option 1b below

### Option 1b: Netlify with GitHub (Recommended)

1. Create a GitHub account at github.com if you don't have one
2. Create a new repository and upload all the files from this folder
3. Go to **https://app.netlify.com** → **"Add new site" → "Import an existing project"**
4. Connect your GitHub account and select the repository
5. Netlify auto-detects the build settings from `netlify.toml`
6. Click **Deploy** — your site will be live in ~60 seconds
7. Netlify gives you a URL like `your-site-name.netlify.app`
8. To use your own domain: **Site settings → Domain management → Add custom domain**

## Option 2: Vercel (Also Easy)

1. Go to **https://vercel.com/signup** and create a free account
2. Push this folder to a GitHub repository  
3. In Vercel, click **"New Project"** → Import your GitHub repo
4. It auto-detects Vite — click **Deploy**
5. Live in ~30 seconds at `your-project.vercel.app`

## Option 3: Build Locally First

If you want to build on your own computer:

```bash
# Install Node.js from https://nodejs.org first (LTS version)

# Then in this folder:
npm install
npm run build

# The 'dist' folder now contains your complete site
# Upload 'dist' contents to any static host
```

## Connecting Your Domain (myphoto.com)

After deploying to Netlify or Vercel:

1. In your hosting dashboard, add your custom domain
2. At your domain registrar (GoDaddy, Namecheap, etc.), update DNS:
   - For Netlify: Add a CNAME record pointing to your Netlify URL
   - For Vercel: Add a CNAME record pointing to `cname.vercel-dns.com`
3. SSL/HTTPS is automatic and free on both platforms

## What's Included

- Full React e-commerce app with admin panel
- Product management with per-size preview scenes
- Customer photo upload, positioning, and checkout
- Order management with PDF generation
- Page builder (About, FAQ, etc.)
- Hero section customization
- Mobile responsive design
- All data stored in browser localStorage

## Next Steps After Going Live

- **Stripe Integration**: Replace the demo payment form with real Stripe checkout
- **Database**: Move from localStorage to a real database (Supabase, Firebase)
- **Image CDN**: Use Cloudinary or AWS S3 for product images instead of data URLs
- **Email notifications**: Send order confirmations via SendGrid or similar
