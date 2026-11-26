/* بطاقات الطلبيات: one question at a time, feedback after each answer, score out of 100 and the path.
   No sign-in, no data sent anywhere, nothing stored: everything stays on this page. */
(function () {
  "use strict";
  var Q = window.QUIZ, ui = Q.ui;
  var LET = ["أ", "ب", "ج", "د"];
  var CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  var $ = function (id) { return document.getElementById(id); };
  var state = { i: 0, answers: [] };
  var voice = null;

  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function show(id) {
    ["start", "quiz", "result"].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function text(id, s) { $(id).textContent = s; }

  /* ---------- start ---------- */
  text("t-kicker", ui.kicker); text("t-title", ui.title); text("t-hello", ui.hello); text("t-steps", ui.steps);
  text("t-start", ui.start); text("t-next", ui.next); text("t-listen", ui.listen); text("t-again", ui.again);
  // on the site itself the first step (open the link) is done and the last (back to the book) comes with the result
  Q.steps.slice(1, 5).forEach(function (s, k) {
    var li = document.createElement("li");
    li.innerHTML = '<span class="n">' + ar(k + 1) + "</span><span></span>";
    li.lastChild.textContent = s;
    $("steps").appendChild(li);
  });
  $("go").addEventListener("click", function () { state = { i: 0, answers: [] }; show("quiz"); render(); });

  /* ---------- read aloud (only if the device has an Arabic voice) ---------- */
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^ar/i.test(v.lang); });
    voice = vs[0] || null;
    $("listen").hidden = !voice;
  }
  if ("speechSynthesis" in window) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }
  $("listen").addEventListener("click", function () {
    if (!voice) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance($("stem").textContent);
    u.voice = voice; u.lang = voice.lang; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  });

  /* ---------- question ---------- */
  function render() {
    var q = Q.questions[state.i];
    $("count").innerHTML = ui.card + " <b>" + ar(state.i + 1) + "</b> " + ui.of + " " + ar(Q.questions.length);
    var dots = $("dots"); dots.innerHTML = "";
    Q.questions.forEach(function (_, k) {
      var li = document.createElement("li");
      if (k < state.i) li.className = "done"; else if (k === state.i) li.className = "now";
      dots.appendChild(li);
    });
    // digits stay in the book's style but a little larger, so the small ٠ is not missed
    $("stem").innerHTML = "";
    q.stem.split(/([٠-٩]+)/).forEach(function (part, k) {
      if (!part) return;
      if (k % 2) { var d = document.createElement("b"); d.className = "d"; d.textContent = part; $("stem").appendChild(d); }
      else $("stem").appendChild(document.createTextNode(part));
    });
    var pic = $("pic");
    pic.hidden = !q.img;
    pic.className = "pic" + (q.frame ? " frame" : "");
    if (q.img) { $("pic-img").src = q.img; $("pic-img").alt = "صورة السؤال"; }
    var box = $("options"); box.innerHTML = "";
    q.options.forEach(function (o, k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "opt"; b.dataset.k = k;
      var inner = '<span class="letter">' + LET[k] + '</span><span class="mark" aria-hidden="true"></span>';
      if (o.img) inner += '<img src="' + o.img + '" alt="">';
      else if (o.num) inner += '<span class="num">' + o.num + "</span>";
      else inner += '<span class="txt"></span>';
      b.innerHTML = inner;
      if (o.text) b.querySelector(".txt").textContent = o.text;
      b.setAttribute("aria-label", LET[k] + (o.text ? "، " + o.text : o.num ? "، " + o.num : ""));
      b.addEventListener("click", function () { choose(k); });
      box.appendChild(b);
    });
    $("feedback").hidden = true;
    var card = $("card"); card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    $("stem").focus({ preventScroll: true });
    preload(state.i + 1);
  }

  function choose(k) {
    var q = Q.questions[state.i];
    if (state.answers.length > state.i) return;
    var ok = k === q.correct;
    state.answers.push({ n: q.n, unit: q.unit, chosen: k, ok: ok });
    var opts = $("options").children;
    for (var j = 0; j < opts.length; j++) {
      var b = opts[j];
      b.disabled = true;
      if (j === k) {
        b.classList.add(ok ? "right" : "wrong");
        b.querySelector(".mark").innerHTML = ok ? CHECK : CROSS;
      } else if (!ok && j === q.correct) {
        b.classList.add("reveal");
        b.querySelector(".mark").innerHTML = CHECK;
        var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = ui.answer; b.appendChild(tag);
      } else {
        b.classList.add("dim");
      }
    }
    var fb = $("feedback");
    fb.className = "feedback " + (ok ? "is-right" : "is-wrong");
    $("fb-buddy").src = ok ? "img/ui/ulba-joy.webp" : "img/ui/ulba-think.webp";
    text("fb-text", ok ? q.right : q.wrong[String(k)]);
    text("t-next", state.i === Q.questions.length - 1 ? ui.finish : ui.next);
    fb.hidden = false;
    fb.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
    $("next").focus({ preventScroll: true });
  }

  $("next").addEventListener("click", function () {
    if (state.answers.length <= state.i) return;
    if (state.i < Q.questions.length - 1) { state.i += 1; render(); window.scrollTo(0, 0); }
    else result();
  });

  function preload(i) {
    var q = Q.questions[i];
    if (!q) return;
    [q.img].concat(q.options.map(function (o) { return o.img; })).forEach(function (src) { if (src) { var im = new Image(); im.src = src; } });
  }

  /* ---------- result ---------- */
  function pathFor(score) {
    for (var k = 0; k < Q.paths.length; k++) if (score >= Q.paths[k].from && score <= Q.paths[k].to) return Q.paths[k];
    return Q.paths[score < 25 ? 0 : score <= 75 ? 1 : 2];
  }
  function result() {
    var right = state.answers.filter(function (a) { return a.ok; }).length;
    var score = right * Q.points;
    var p = pathFor(score);
    text("r-score-label", ui.score); text("r-score", ar(score)); text("r-of", ui.outof);
    text("r-path-label", ui.path); text("r-path-name", p.name); text("r-say", p.say);
    $("r-path-img").src = p.img;
    $("r-goto").innerHTML = "";
    $("r-goto").appendChild(document.createTextNode(ui.goto + " "));
    var qn = document.createElement("q"); qn.textContent = p.name; $("r-goto").appendChild(qn);
    var missed = {};
    state.answers.forEach(function (a) { if (!a.ok) missed[a.unit] = true; });
    var list = $("r-practice"); list.innerHTML = "";
    var keys = Object.keys(Q.units).filter(function (u) { return missed[u]; });
    if (keys.length) {
      text("r-practice-title", ui.practice);
      keys.forEach(function (u) { var li = document.createElement("li"); li.textContent = Q.units[u]; list.appendChild(li); });
    } else {
      text("r-practice-title", ui.allright);
    }
    show("result");
  }
  $("again").addEventListener("click", function () { show("start"); });
})();
