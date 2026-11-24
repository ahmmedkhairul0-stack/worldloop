# WORLDLOOP — connect and launch

This is the cloud-connected static website project. The front end is ready to connect; it is **not live until you complete the account setup below**.

## 1. Create a Supabase project
A parent/guardian should manage any account or service that requires an adult account holder or legal agreement.
1. Open https://supabase.com and create a project.
2. Save the project database password privately. Do not send it to anyone.
3. In Project Settings → API, copy the **Project URL** and the **anon/public** key (or publishable key).

## 2. Add the public client configuration
Open `js/config.js` and replace:
- `YOUR_SUPABASE_PROJECT_URL` with the Project URL
- `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY` with the anon/public or publishable key

Only the public anon/publishable key belongs in browser code. **Never use `service_role` or secret keys in this website.**

## 3. Create the database
In Supabase → SQL Editor → New query, paste all of `supabase/migrations/001_worldloop.sql`, then click Run. Confirm there are no errors.

## 4. Set up email authentication
In Supabase → Authentication → URL Configuration:
- Set Site URL to your eventual website URL.
- Add that URL to Redirect URLs.
For initial local testing, use a local static server URL such as `http://localhost:5500` and add it to allowed redirects. Email confirmation should remain enabled for public launch. Configure an email sender and test confirmation/password-reset messages.

## 5. Preview locally
Because the project uses browser ES modules, serve the folder through a local web server (not `file://`). On a computer with Python installed, from this folder run:
`python -m http.server 5500`
Then open `http://localhost:5500`.

## 6. Publish
Upload this folder to a static host or connect its Git repository. Set the public website URL as the Supabase Site URL and allowed redirect. Test signup, confirmation, login, password reset, lesson submission, save, completion, and reporting.

## Moderation is required before public launch
New lessons are inserted as `pending`; only approved lessons are publicly visible. This package intentionally has no public client-side moderation controls. A trusted adult moderator can review rows in Supabase Table Editor:
- `public.lessons`: inspect pending submissions, then change `status` to `approved` or `rejected`.
- `public.lesson_reports`: review user reports and remove harmful content through the trusted dashboard.
Never give public users database admin access.

## Important launch gaps
Before inviting the public, add a documented privacy policy and terms, account deletion workflow, rate limiting/abuse controls, moderator coverage, backups/monitoring, accessibility review and security review. Do not collect precise location, school, phone number, or other unnecessary personal data. Do not enable direct messages for the initial release. Use age-appropriate moderation and have a responsible adult oversee public deployment and moderation.

This starter is a functional foundation, not a security certification or a guarantee of compliance with laws/platform policies.

## 7. Deploy with Vercel (GitHub)
1. Push the extracted project contents to the root of your GitHub repository. `index.html` must be at the repository root.
2. Open https://vercel.com, sign in using the GitHub account that owns the repository, and choose **Add New → Project**.
3. Import the `worldloop` repository.
4. For this plain HTML/CSS/JavaScript project, leave the framework preset as **Other**. Leave Build Command and Output Directory empty; use `.` as the root directory.
5. Deploy. When Vercel gives you a website URL, copy it.
6. In Supabase → Authentication → URL Configuration, set **Site URL** to that Vercel URL and add the same URL (and any needed preview URL) under **Redirect URLs**.
7. Test signup, email confirmation, login, password reset email, lesson submission, saving, completion and reporting.

If GitHub already contains the project, Vercel can import it directly; you do not need to upload the files a second time. Every later push to the connected branch normally triggers a new deployment.
