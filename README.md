# Brand Catalogue Website

A responsive public product catalogue with a protected admin panel.

## Stack
- React + Vite
- Supabase Auth, Postgres and Storage
- Vercel hosting

## 1. Create Supabase project
Create a project at https://supabase.com and keep its Project URL and anon/public key.

## 2. Set up database and image storage
In Supabase, open **SQL Editor**, create a new query, paste all of `supabase/schema.sql`, and run it.

This creates:
- Main and subcategory management
- Product records with unique codes and image URLs
- Site logo settings
- Public read / admin-only write RLS policies
- Public `catalogue-images` bucket with admin-only uploads/deletes

The SQL restricts write access to `tepankapil420@gmail.com`. Do not change that email unless you also update `src/supabase.js` and the SQL policies.

## 3. Create the admin login
In Supabase Dashboard:
1. Open **Authentication → Users**.
2. Choose **Add user**.
3. Create the user with the admin email configured in this project.
4. Set a strong password there (do not put the password in source code, GitHub, or Vercel environment variables).
5. If email confirmation is enabled, confirm the account / use the dashboard's supported confirmation flow.

The password supplied in chat is deliberately not embedded in the project. If it is a real password used anywhere else, change it before using this site.

## 4. Run locally
Install Node.js (LTS), then in this folder:

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Then run:

```bash
npm run dev
```

Open the local URL shown by Vite. Public catalogue is `/`; admin is `/admin`.

## 5. Deploy to Vercel
1. Push this project to a private GitHub repository.
2. Import the repository in https://vercel.com.
3. Add these Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.
5. Add your production domain to Supabase Authentication → URL Configuration → Site URL and Redirect URLs.
6. Redeploy after changing environment variables.

`vercel.json` includes an SPA rewrite so `/admin` loads correctly.

## Admin features
- Add/edit/delete main categories and subcategories.
- Upload product images and assign unique codes.
- Replace an image by editing a product and choosing a new image.
- Publish/hide and delete products.
- Upload/update the brand logo.

## Notes
- This is a static frontend hosted on Vercel; Supabase provides persistent data, authentication and image storage.
- Only the configured admin email can write data. The anon key is designed to be public; never use the Supabase service-role key in frontend code.
- Product images are public so visitors can view them. Admin-only policies control uploads, edits and deletion.
- Before public launch, test login, image uploads, category deletion and mobile layout.
