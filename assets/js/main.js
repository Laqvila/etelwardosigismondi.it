(function () {
  "use strict";

  /* Prima istruzione: segnala al CSS che il JS e' vivo. Le animazioni di comparsa (.rv)
     nascondono il contenuto solo sotto questa classe: senza script tutto resta visibile. */
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = (document.body.getAttribute("data-lang") || "it").toLowerCase();
  var assets = document.body.getAttribute("data-assets") || "assets/";
  var root = document.body.getAttribute("data-root") || "";

  /* ---------- Menu mobile: pulsante, Esc, clic fuori, focus ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    function setMenu(open, refocus) {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var lbl = toggle.getAttribute(open ? "data-label-close" : "data-label-open");
      if (lbl) toggle.setAttribute("aria-label", lbl);
      if (open) {
        var first = links.querySelector("a");
        if (first) first.focus();
      } else if (refocus) {
        toggle.focus();
      }
    }
    toggle.addEventListener("click", function () { setMenu(!links.classList.contains("open"), false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) setMenu(false, true);
    });
    /* Tocco o clic FUORI dal menu: lo chiude. Si ascolta pointerdown e non il
       click, perche' Safari iOS non consegna a document il click di un tocco su
       un punto qualunque della pagina; il click resta per i browser senza
       Pointer Events. */
    function closeIfOutside(e) {
      if (!links.classList.contains("open")) return;
      if (links.contains(e.target) || toggle.contains(e.target)) return;
      setMenu(false, false);
    }
    document.addEventListener(window.PointerEvent ? "pointerdown" : "click", closeIfOutside);
    /* Il focus che ESCE dal menu con la tastiera (Tab oltre l'ultima voce) lo
       chiude, ma SOLO se e' andato a un altro elemento (relatedTarget). Con
       relatedTarget nullo non si fa nulla: e' cio' che manda Safari, su iPhone e
       Mac, al tocco su una voce del menu. Per WebKit i link non prendono il focus
       al clic, e al mousedown toglie il focus alla voce attiva PRIMA del click.
       Chiudendo qui, la voce toccata spariva (display:none) prima che il click
       arrivasse: su iPhone nessuna voce del menu portava da nessuna parte. */
    links.addEventListener("focusout", function (e) {
      if (!links.classList.contains("open") || !e.relatedTarget) return;
      if (links.contains(e.relatedTarget) || toggle.contains(e.relatedTarget)) return;
      setMenu(false, false);
    });
  }

  /* ---------- Torna in cima ---------- */
  var backTop = document.querySelector(".back-top");
  function onScroll() {
    if (backTop) backTop.classList.toggle("show", window.scrollY > 900);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var main = document.getElementById("contenuto");
      if (main) main.focus({ preventScroll: true });
    });
  }

  /* ---------- Comparsa discreta all'ingresso nel viewport ----------
     REGOLA D'ORO: il contenuto non deve MAI restare nascosto.

     La versione precedente usava threshold:0.08, cioe' chiedeva che l'8% di un
     elemento fosse visibile. Un blocco piu' alto del viewport non puo' arrivarci:
     l'elenco del 2025 nella rassegna e' alto 13.604px e in uno schermo da 812px
     raggiunge al massimo 812/13.604 = 0,0597. La soglia non veniva MAI superata,
     .in non veniva mai aggiunta e ".js .rv{opacity:0}" restava attiva per sempre:
     162 articoli su 258 erano invisibili, e non solo su telefono — serviva un
     viewport alto 1.089px, quindi erano invisibili anche su desktop.

     Ora: soglia 0 (basta che l'elemento tocchi il viewport) e, per gli elementi
     piu' alti dello schermo, nessuna animazione affatto — non se ne potrebbe
     comunque vedere l'ingresso, e nasconderli e' solo un rischio. */
  var rvEls = document.querySelectorAll(".rv");
  function reveal(el) { el.classList.add("in"); }
  if (rvEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var rvObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { reveal(e.target); rvObs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
    rvEls.forEach(function (el) {
      if (el.getBoundingClientRect().height > window.innerHeight * 0.85) reveal(el);
      else rvObs.observe(el);
    });
    /* Rete di sicurezza: se a pagina caricata un elemento e' gia' nello schermo
       ma per qualsiasi ragione non e' stato scoperto, lo si scopre comunque. */
    window.addEventListener("load", function () {
      rvEls.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    });
  } else {
    rvEls.forEach(reveal);
  }

  /* Lo "spotlight" al cursore e' stato rimosso: l'alone era rgba(181,136,58,.14),
     cioe' 1,15:1 sul fondo — impercettibile — e costava un listener pointermove
     su ogni superficie (41 sulla sola pagina dei comunicati). Il feedback al
     passaggio del mouse ora e' dato dal bordo della card, che si vede davvero. */

  /* ---------- Timeline: filtri descritti nell'URL (?f=... &t=...) ----------
     I filtri sono link: senza JS portano alla stessa pagina con la query e la timeline
     resta completa. Con JS il filtro si applica in pagina, l'URL viene aggiornato e il
     numero di risultati e' annunciato dalla regione aria-live. */
  /* Niente :has(): Safari prima della 15.4 non lo conosce e querySelector, non
     capendo il selettore, LANCIA un errore che fermerebbe lo script da qui in poi
     (ricerca, form contatti). Stesso risultato a mano: il primo gruppo di filtri
     che non contiene i pulsanti della rassegna. */
  var filterGroup = null;
  document.querySelectorAll(".filters[aria-label]").forEach(function (g) {
    if (!filterGroup && !g.querySelector(".pr-filter")) filterGroup = g;
  });
  var timeline = document.querySelector(".timeline");
  if (filterGroup && timeline) {
    var filterLinks = filterGroup.querySelectorAll(".filter[data-filter]");
    var statusEl = document.querySelector(".filter-status[data-total]");
    var items = timeline.querySelectorAll(".tl-item");
    var isFullList = items.length === parseInt(statusEl ? statusEl.getAttribute("data-total") : "0", 10);

    function announce(shown) {
      if (!statusEl) return;
      var total = parseInt(statusEl.getAttribute("data-total"), 10) || items.length;
      var txt = shown === 1 ? statusEl.getAttribute("data-one") : statusEl.getAttribute("data-many").replace("%d", shown);
      statusEl.textContent = txt + " " + statusEl.getAttribute("data-of") + " " + total;
    }
    function applyFilter(key, terr, pushUrl) {
      var shown = 0;
      items.forEach(function (li) {
        var ok = key === "tutto" || li.getAttribute("data-ambito") === key || li.getAttribute("data-cat") === key;
        if (ok && terr) ok = li.getAttribute("data-terr") === terr;
        if (ok) { li.removeAttribute("hidden"); shown++; } else { li.setAttribute("hidden", ""); }
      });
      filterLinks.forEach(function (a) {
        if (a.getAttribute("data-filter") === key) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      announce(shown);
      if (pushUrl && window.history && history.replaceState) {
        var url = location.pathname + (key === "tutto" ? "" : "?f=" + encodeURIComponent(key) + (terr ? "&t=" + encodeURIComponent(terr) : ""));
        history.replaceState(null, "", url);
      }
    }
    var params = new URLSearchParams(location.search);
    var initial = params.get("f") || "tutto";
    var terrParam = params.get("t") || "";
    if (isFullList) {
      /* pagina con l'elenco completo: il filtro si applica qui */
      filterLinks.forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          applyFilter(a.getAttribute("data-filter"), "", true);
        });
      });
      applyFilter(initial, terrParam, false);
    } else {
      /* estratto (home): i link portano alla timeline completa, qui si annuncia solo il totale */
      announce(items.length);
    }
  }

  /* ---------- Rassegna completa: nazionale / locale ---------- */
  var prFilters = document.querySelectorAll(".pr-filter");
  if (prFilters.length) {
    var prRows = document.querySelectorAll(".pr-archive .press-list li[data-scope]");
    var prYears = document.querySelectorAll(".press-year");
    var prStatus = document.querySelector("[data-pr-status]");
    prFilters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var scope = btn.getAttribute("data-scope");
        var shown = 0;
        prFilters.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        prRows.forEach(function (row) {
          var show = scope === "all" || row.getAttribute("data-scope") === scope;
          if (show) { row.removeAttribute("hidden"); shown++; } else { row.setAttribute("hidden", ""); }
        });
        prYears.forEach(function (y) {
          if (y.querySelector("li:not([hidden])")) y.removeAttribute("hidden"); else y.setAttribute("hidden", "");
        });
        if (prStatus) prStatus.textContent = shown + " " + (prStatus.getAttribute("data-articles") || "");
      });
    });
  }

  /* ---------- Ricerca: indice statico per lingua, caricato solo quando serve ---------- */
  var index = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch(assets + "data/search-" + lang + ".json").then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) { index = d; return d; }).catch(function () { return []; });
  }
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function search(q, data) {
    var terms = norm(q).split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!terms.length) return [];
    return data.map(function (it) {
      var hay = norm(it.t + " " + (it.s || "") + " " + (it.x || "") + " " + (it.k || ""));
      var title = norm(it.t);
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) < 0) return null;
        score += title.indexOf(terms[i]) >= 0 ? 3 : 1;
      }
      return { it: it, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score || (b.it.d || "").localeCompare(a.it.d || ""); })
      .slice(0, 30).map(function (r) { return r.it; });
  }
  function renderResults(list, q, ul, statusEl) {
    ul.textContent = "";
    if (!statusEl) return;
    if (!q || q.trim().length < 2) { statusEl.textContent = statusEl.getAttribute("data-hint") || ""; return; }
    if (!list.length) { statusEl.textContent = (statusEl.getAttribute("data-none") || "") + " “" + q + "”"; return; }
    statusEl.textContent = list.length + " " + (list.length === 1 ? statusEl.getAttribute("data-one") : statusEl.getAttribute("data-many"));
    list.forEach(function (it) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = root + it.u;
      var k = document.createElement("span"); k.className = "kind"; k.textContent = it.k + (it.d ? " · " + it.d : "");
      var t = document.createElement("span"); t.className = "title"; t.textContent = it.t;
      a.appendChild(k); a.appendChild(t);
      if (it.s) { var s = document.createElement("span"); s.className = "snip"; s.textContent = it.s; a.appendChild(s); }
      li.appendChild(a); ul.appendChild(li);
    });
  }
  function bindSearch(input, ul, statusEl) {
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value;
        loadIndex().then(function (d) { renderResults(search(q, d), q, ul, statusEl); });
      }, 120);
    });
  }
  var dialog = document.getElementById("search-dialog");
  var trigger = document.querySelector(".search-trigger");
  if (dialog && trigger && typeof dialog.showModal === "function") {
    var dInput = dialog.querySelector("input[type=search]");
    var dList = dialog.querySelector(".search-results");
    var dStatus = dialog.querySelector(".search-status");
    trigger.setAttribute("aria-haspopup", "dialog");   /* con JS il link apre una finestra modale */
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      dialog.showModal();
      loadIndex();
      if (dInput) dInput.focus();
    });
    dialog.querySelector("[data-close]").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () { trigger.focus(); });
    if (dInput && dList) bindSearch(dInput, dList, dStatus);
  }
  var pageForm = document.querySelector("[data-search-page]");
  if (pageForm) {
    var pInput = pageForm.querySelector("input[type=search]");
    var pList = document.querySelector("[data-search-results]");
    var pStatus = document.querySelector("[data-search-status]");
    var q0 = new URLSearchParams(location.search).get("q") || "";
    if (pInput && pList) {
      bindSearch(pInput, pList, pStatus);
      pageForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = pInput.value;
        loadIndex().then(function (d) { renderResults(search(q, d), q, pList, pStatus); });
        if (history.replaceState) history.replaceState(null, "", location.pathname + (q ? "?q=" + encodeURIComponent(q) : ""));
      });
      if (q0) { pInput.value = q0; loadIndex().then(function (d) { renderResults(search(q0, d), q0, pList, pStatus); }); }
    }
  }

  /* ---------- Modulo di segnalazione ----------
     Con data-endpoint il messaggio va al Worker Cloudflare (fetch, risposta JSON)
     che lo recapita all'email istituzionale; senza endpoint (anteprima senza
     Worker) si ripiega sul mailto di prima. Validazione accessibile: errore
     collegato al campo con aria-describedby, focus sul primo campo sbagliato,
     esito annunciato dalla regione aria-live. */
  var form = document.getElementById("contact-form");
  if (form) {
    var endpoint = form.getAttribute("data-endpoint") || "";
    var statusBox = document.querySelector(".form-status");
    var tField = form.querySelector('input[name="t"]');
    if (tField) tField.value = String(Date.now());   /* il Worker scarta gli invii in meno di 3 secondi */
    var submitBtn = form.querySelector('button[type="submit"]');
    var mailTo = form.getAttribute("data-mail") || "";

    function clearField(input, field) {
      field.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
    function markBad(input, field, id) {
      field.classList.add("invalid");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", id + "-err");
    }
    function showStatus(kind, title, text, withMail) {
      if (!statusBox) return;
      statusBox.textContent = "";
      statusBox.className = "form-status show" + (kind === "err" ? " err" : "");
      if (title) { var h = document.createElement("h3"); h.textContent = title; statusBox.appendChild(h); }
      var p = document.createElement("p"); p.textContent = text + (withMail && mailTo ? " " : "");
      if (withMail && mailTo) { var a = document.createElement("a"); a.href = "mailto:" + mailTo; a.textContent = mailTo; p.appendChild(a); p.appendChild(document.createTextNode(".")); }
      statusBox.appendChild(p);
      statusBox.focus();
    }
    function validate() {
      var firstBad = null;
      ["cf-name", "cf-email", "cf-subject", "cf-msg", "cf-consent"].forEach(function (id) {
        var input = document.getElementById(id);
        if (!input) return;
        var field = input.closest(".form-field");
        var ok;
        if (input.type === "checkbox") ok = input.checked;
        else if (input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
        else ok = !!input.value.trim();
        if (!ok) { markBad(input, field, id); if (!firstBad) firstBad = input; }
        else clearField(input, field);
        input.addEventListener(input.type === "checkbox" ? "change" : "input", function () { clearField(input, field); }, { once: true });
      });
      return firstBad;
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var firstBad = validate();
      if (firstBad) { firstBad.focus(); return; }
      var reason = document.getElementById("cf-reason");
      var subject = document.getElementById("cf-subject").value.trim();
      if (!endpoint) {
        /* anteprima senza Worker: si compone l'email nel programma di posta */
        var msg = document.getElementById("cf-msg").value.trim();
        var name = document.getElementById("cf-name").value.trim();
        var subj = (reason && reason.value ? reason.value + " — " : "") + subject;
        window.location.href = "mailto:" + mailTo + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(msg + "\n\n— " + name);
        return;
      }
      var token = form.querySelector('input[name="cf-turnstile-response"]');
      if (token && !token.value) { showStatus("err", "", form.getAttribute("data-captcha") || "", false); return; }
      var label = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = form.getAttribute("data-sending") || label; }
      function done() { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = label; } }
      function fail(detail) {
        done();
        if (window.turnstile && typeof window.turnstile.reset === "function") { try { window.turnstile.reset(); } catch (e) {} }
        showStatus("err", "", (detail ? detail + " " : "") + (form.getAttribute("data-fail") || ""), true);
      }
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j && j.ok, j: j || {} }; }); })
        .then(function (res) {
          if (!res.ok) { fail(res.j.errore || ""); return; }
          done();
          form.hidden = true;
          showStatus("ok", form.getAttribute("data-ok-h") || "", form.getAttribute("data-ok-p") || "", false);
        })
        .catch(function () { fail(""); });
    });
  }

  onScroll();
})();
