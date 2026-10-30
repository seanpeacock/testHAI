// Cloudflare Pages Function: receives the Contact form and sends it through Resend.
//
// Environment variables (set in Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY     (secret, required) your Resend API key
//   CONTACT_TO         where enquiries are sent. Default: info@hailant.ca
//   CONTACT_FROM       sender on a domain verified in Resend. Default: "Hailant Website <website@hailant.ca>"
//   SEND_CONFIRMATION  set to "true" to also email a confirmation copy to the visitor. Default: off

const OFFICES = ['Calgary', 'Edmonton', 'Kelowna', 'Victoria', 'Elsewhere in Western Canada'];
const LIMITS = { name: 100, email: 200, company: 150, message: 3000 };

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

function reply(request, ok, status, errorMessage) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, error: errorMessage }), {
      status: ok ? 200 : status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  if (ok) return Response.redirect(new URL('/thanks.html', request.url).toString(), 303);
  const page =
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Message not sent | Hailant</title>' +
    '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">' +
    '<h1>Message not sent</h1><p>' + esc(errorMessage) + '</p>' +
    '<p><a href="/contact.html">Back to the contact form</a></p></body>';
  return new Response(page, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function sendEmail(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Resend responded ' + res.status);
}

export async function onRequestPost({ request, env }) {
  // Only accept submissions that come from this site.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return reply(request, false, 403, 'This request was not allowed.');
  }

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return reply(request, false, 400, 'We could not read your message. Please try again.');
  }

  // Hidden trap field: real visitors never fill it in. Pretend success so bots move on.
  if ((form.get('company_website') || '').toString().trim() !== '') {
    return reply(request, true, 200);
  }

  const get = (k) => (form.get(k) || '').toString().trim();
  const name = get('name');
  const email = get('email');
  const company = get('company');
  const office = get('office');
  const message = get('message');

  if (!name || !email || !company) {
    return reply(request, false, 400, 'Please fill in your name, work email, and company.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(request, false, 400, 'Please enter a valid email address.');
  }
  for (const k of ['name', 'email', 'company', 'message']) {
    if (get(k).length > LIMITS[k]) return reply(request, false, 400, 'One of the fields is too long.');
  }
  if (office && !OFFICES.includes(office)) {
    return reply(request, false, 400, 'Please choose a city from the list.');
  }
  if (!env.RESEND_API_KEY) {
    return reply(request, false, 500, 'The form is not set up yet. Please email us instead.');
  }

  const to = env.CONTACT_TO || 'info@hailant.ca';
  const from = env.CONTACT_FROM || 'Hailant Website <website@hailant.ca>';

  const text =
    'New conversation request\n\n' +
    'Name: ' + name + '\nEmail: ' + email + '\nCompany: ' + company +
    '\nNearest office: ' + (office || 'Not given') + '\n\nMessage:\n' + (message || '(none)');
  const html =
    '<h2>New conversation request</h2>' +
    '<p><strong>Name:</strong> ' + esc(name) + '<br><strong>Email:</strong> ' + esc(email) +
    '<br><strong>Company:</strong> ' + esc(company) +
    '<br><strong>Nearest office:</strong> ' + esc(office || 'Not given') + '</p>' +
    '<p><strong>Message:</strong></p><p>' + esc(message || '(none)').replace(/\n/g, '<br>') + '</p>';

  try {
    await sendEmail(env, {
      from,
      to: [to],
      reply_to: email,
      subject: oneLine('New conversation request: ' + name + ' (' + company + ')'),
      text,
      html,
    });

    if ((env.SEND_CONFIRMATION || '').toLowerCase() === 'true') {
      // A failed confirmation copy should not turn a received request into an error.
      try {
        await sendEmail(env, {
          from,
          to: [email],
          reply_to: to,
          subject: 'We received your request | Hailant',
          text:
            'Hi ' + name + ',\n\nThanks for contacting Hailant. We will follow up by email to schedule your conversation.\n\n' +
            'Your message:\n' + (message || '(none)') + '\n\nHailant',
        });
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    return reply(request, false, 502, 'We could not send your message just now. Please try again or email us.');
  }

  return reply(request, true, 200);
}

// Anything other than POST is not supported.
export async function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
