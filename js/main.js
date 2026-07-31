/* ==========================================================================
   PrimeFix — shared front-end behaviour
   - mobile nav toggle
   - one-shot stat count-up (respects prefers-reduced-motion)
   - service list: fetched from /api/services (backed by the Google Sheet),
     falls back to DEFAULT_SERVICES if the API isn't reachable yet (e.g.
     when previewing the static files before Functions are deployed).
   ========================================================================== */

(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();

// Count up any element with data-countup="TARGET_NUMBER"
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-countup]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-countup'), 10) || 0;
    if (reduce) { el.textContent = target; return; }
    var start = null;
    var duration = 900;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
})();

/* Default services — mirrors the PrimeFix service board. Used as a fallback
   so the site still renders correctly before the Google Sheet API is wired
   up, and if the API call ever fails. The live Sheet is the source of truth
   once /api/services is deployed. */
window.DEFAULT_SERVICES = [
  { id: 1, name: 'Ceiling Water Seepage', description: 'We detect and repair ceiling water seepage effectively.', isNew: false },
  { id: 2, name: 'Skirting Level Seepage', description: 'We treat skirting level seepage and dampness permanently.', isNew: false },
  { id: 3, name: 'Painting', description: 'Professional painting services for interior and exterior.', isNew: false },
  { id: 4, name: 'Electrical', description: 'Safe and reliable electrical installation and repair services.', isNew: false },
  { id: 5, name: 'Cleaning', description: 'Home, office and commercial cleaning services.', isNew: false },
  { id: 6, name: 'Carpentry', description: 'All types of wood work, furniture, doors, windows and fittings.', isNew: false },
  { id: 7, name: 'Sliding Windows & Doors', description: 'Sliding windows, doors, partitions installation and repair.', isNew: false },
  { id: 8, name: 'Plumbing', description: 'All types of plumbing installation and repair services.', isNew: false },
  { id: 9, name: 'Invisible Grill', description: 'Invisible grill for balcony, windows & staircase — safe & durable.', isNew: true },
  { id: 10, name: 'Pigeon Net', description: 'Pigeon net installation — keep birds out, keep space clean.', isNew: true },
  { id: 11, name: 'Fabrication Works', description: 'All types of fabrication works — MS, SS, gates, railings, shed & more.', isNew: true },
  { id: 12, name: 'All Civil Works & More', description: 'Plumbing, tiles, plaster, masonry and all types of civil maintenance works.', isNew: false }
];

async function loadServices() {
  try {
    var res = await fetch('/api/services');
    if (!res.ok) throw new Error('bad response');
    var data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
    return data;
  } catch (e) {
    return window.DEFAULT_SERVICES;
  }
}

function ticketHTML(svc) {
  var noStr = String(svc.id).padStart(2, '0');
  var photoSrc = svc.image || ('/images/services/' + svc.id + '.jpg');
  return (
    '<article class="ticket">' +
      '<span class="ticket-perf" aria-hidden="true"></span>' +
      '<div class="ticket-photo">' +
        (svc.isNew ? '<span class="ticket-new">NEW</span>' : '') +
        '<img src="' + photoSrc + '" alt="' + svc.name + '" loading="lazy" ' +
          'onerror="this.closest(\'.ticket-photo\').style.display=\'none\'">' +
      '</div>' +
      '<div class="ticket-body">' +
        '<div class="ticket-head">' +
          '<span class="ticket-no mono">SVC-' + noStr + '</span>' +
        '</div>' +
        '<h3>' + svc.name + '</h3>' +
        '<p>' + svc.description + '</p>' +
      '</div>' +
    '</article>'
  );
}

document.addEventListener('DOMContentLoaded', function () {
  var previewMount = document.getElementById('service-preview');
  var fullMount = document.getElementById('service-full');
  if (!previewMount && !fullMount) return;

  loadServices().then(function (services) {
    if (previewMount) {
      previewMount.innerHTML = services.slice(0, 6).map(ticketHTML).join('');
    }
    if (fullMount) {
      fullMount.innerHTML = services.map(ticketHTML).join('');
    }
  });
});
