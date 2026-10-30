// Contact form: send without leaving the page and show a confirmation.
// Without JavaScript the form still posts to /api/contact, which redirects to thanks.html.
(function () {
  var form = document.getElementById('contact-form');
  if (!form || !window.fetch || !window.FormData) return;

  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');
  var original = button.textContent;

  function say(kind, html) {
    status.className = 'form-status form-status-' + kind;
    status.innerHTML = html;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.className = 'form-status';
    status.textContent = '';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok && data.ok, error: data.error };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.error || '');
        var card = form.parentNode;
        var done = document.createElement('div');
        done.className = 'form-card form-done';
        done.setAttribute('role', 'status');
        done.innerHTML =
          '<h2 id="form-title" tabindex="-1">Thank you. We have your request.</h2>' +
          '<p>We will follow up by email to schedule your conversation.</p>' +
          '<p><a class="btn btn-brand" href="index.html">Back to the home page</a></p>';
        card.replaceChild(done, form);
        done.querySelector('h2').focus();
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : 'Something went wrong.';
        say('error', msg + ' You can also email us at <a href="mailto:info@hailant.ca">info@hailant.ca</a>.');
        button.disabled = false;
        button.textContent = original;
      });
  });
})();
