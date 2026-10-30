# Contact form setup (Cloudflare Pages + Resend)

The Contact form posts to `functions/api/contact.js`, a Cloudflare Pages Function. It checks the submission, then sends the email through Resend. The visitor sees a confirmation message on the page, or lands on `thanks.html` if JavaScript is off.

## 1. Resend
1. Create a Resend account and add the domain `hailant.ca` (Domains, then Add Domain).
2. Add the DNS records Resend shows (SPF, DKIM) where hailant.ca's DNS is managed. If the domain is on Cloudflare DNS, Resend can add them for you.
3. Wait for the domain to show as Verified.
4. Create an API key (API Keys, then Create) with "Sending access". Copy it once; it is not shown again.

## 2. Cloudflare Pages
1. Workers & Pages, then Create, Pages, Connect to Git, and choose the `testHAI` repo with branch `main`.
2. Build command: leave empty. Build output directory: `/` (the repo root). The `functions/` folder is detected automatically.
3. After the first deploy, open Settings, then Variables and Secrets, and add (for Production):
   - `RESEND_API_KEY`: your Resend key. Add it as a Secret.
   - `CONTACT_TO`: where enquiries go (default `info@hailant.ca`).
   - `CONTACT_FROM`: sender on the verified domain, for example `Hailant Website <website@hailant.ca>`.
   - `SEND_CONFIRMATION`: `true` to also email a confirmation copy to the visitor (default off).
4. Redeploy so the variables take effect.
5. Custom domains: add `hailant.ca` under the Pages project.

## 3. Test
Submit the live form. You should receive the email at `CONTACT_TO`, and replying goes to the visitor. If it fails, the page shows an error with the email address as a fallback. Check Pages, then Functions, then Real-time logs.

## Notes
- Spam protection: a hidden trap field, field checks, a same-site check, and length limits. If spam gets through, add Cloudflare Turnstile.
- Update the Privacy Policy to list Resend (email delivery) and Cloudflare (hosting) as service providers. Resend is a US-based service.
- GitHub Pages cannot run this function; use Cloudflare Pages for hosting.
