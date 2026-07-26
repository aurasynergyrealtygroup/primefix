document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('lead-form');
  var status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type="submit"]');
    var original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.className = '';
    status.textContent = '';

    var payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      service: form.service.value,
      message: form.message.value.trim()
    };

    if (!payload.name || !payload.phone) {
      status.className = 'err';
      status.textContent = 'Please share your name and phone number so we can call you back.';
      submitBtn.disabled = false;
      submitBtn.textContent = original;
      return;
    }

    try {
      var res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('request failed');
      status.className = 'ok';
      status.textContent = 'Thanks — your request is in. We\u2019ll call you back shortly.';
      form.reset();
    } catch (err) {
      status.className = 'err';
      status.textContent = 'Something went wrong sending this. Please call us directly at 9623581199.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
});
