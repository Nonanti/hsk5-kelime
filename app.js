/* HSK 1-5 Kelime Kampı — durum localStorage'da */
(function () {
  'use strict';

  var KEY = 'hsk5kamp_v1';
  var state = load();

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.known) return s;
    } catch (e) {}
    return { known: {}, goal: 10, days: {}, queue: {}, extra: 0 };
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var byHanzi = {};
  WORDS.forEach(function (w) { byHanzi[w.h] = w; });
  var orderIdx = {};
  WORDS.forEach(function (w, i) { orderIdx[w.h] = i; });

  function unlearned() { return WORDS.filter(function (w) { return !state.known[w.h]; }); }

  // --- bugunku kuyruk: gune ozel, kaydediliyor ---
  function todayQueue() {
    var t = todayStr();
    if (!state.queue[t]) {
      state.queue[t] = unlearned().slice(0, state.goal).map(function (w) { return w.h; });
      save();
    }
    // bilinenleri kuyruktan dusur, veri seti sirasina gore diz
    state.queue[t] = state.queue[t].filter(function (h) { return !state.known[h]; })
      .sort(function (a, b) { return (orderIdx[a] || 0) - (orderIdx[b] || 0); });
    return state.queue[t];
  }

  function addExtra() {
    var t = todayStr();
    var inq = {};
    state.queue[t].forEach(function (h) { inq[h] = 1; });
    var extra = unlearned().filter(function (w) { return !inq[w.h]; }).slice(0, 10)
      .map(function (w) { return w.h; });
    state.queue[t] = state.queue[t].concat(extra);
    save();
  }

  // --- seri ---
  function streak() {
    var s = 0, d = new Date();
    if (!state.days[todayStr()]) d.setDate(d.getDate() - 1); // bugun henuz yoksa dun baslar
    for (;;) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (state.days[k]) { s++; d.setDate(d.getDate() - 1); } else break;
    }
    return s;
  }

  // --- TTS ---
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.8;
    speechSynthesis.speak(u);
  }

  // --- gorunum gecisleri ---
  var views = ['today', 'themes', 'quiz', 'all', 'settings'];
  function show(v) {
    views.forEach(function (x) {
      document.getElementById('view-' + x).classList.toggle('active', x === v);
    });
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === v);
    });
    if (v === 'today') renderToday();
    if (v === 'themes') renderThemes();
    if (v === 'all') renderAll('');
    if (v === 'settings') renderSettings();
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.view); });
  });

  // --- header istatistikleri ---
  function renderStats() {
    var known = Object.keys(state.known).length;
    var total = WORDS.length;
    document.getElementById('statKnown').textContent = known;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPct').textContent = Math.round(known / total * 100) + '%';
    document.getElementById('statStreak').textContent = streak();
    document.getElementById('statEta').textContent = known >= total ? '0' : Math.ceil((total - known) / state.goal);
    document.getElementById('progressFill').style.width = (known / total * 100) + '%';
  }

  // --- BUGUN ---
  var current = null;
  function renderToday() {
    renderStats();
    var q = todayQueue();
    var doneBox = document.getElementById('todayDone');
    var cardArea = document.getElementById('cardArea');
    var info = document.getElementById('todayInfo');

    var t = todayStr();
    var doneToday = state.days[t] || 0;

    if (q.length === 0) {
      cardArea.classList.add('hidden');
      doneBox.classList.remove('hidden');
      var left = unlearned().length;
      document.getElementById('doneSummary').textContent =
        left === 0 ? 'Bütün 2496 kelime bitti! 🏆 Artık quiz ile taze tut.'
          : 'Bugün ' + doneToday + ' kelime öğrendin. Kalan: ' + left + ' kelime.';
      info.textContent = '';
      return;
    }
    doneBox.classList.add('hidden');
    cardArea.classList.remove('hidden');
    info.innerHTML = 'Bugünkü hedef: <b>' + state.goal + '</b> kelime · bugün öğrenilen: <b>' + doneToday + '</b>';
    current = q[0];
    renderCard();
  }

  function renderCard() {
    var w = byHanzi[current];
    var card = document.getElementById('flashcard');
    card.classList.remove('flipped');
    document.getElementById('cardHanzi').textContent = w.h;
    document.getElementById('cardLevel').textContent = 'HSK ' + w.lv;
    document.getElementById('cardHanziBack').textContent = w.h;
    document.getElementById('cardPinyin').textContent = w.p;
    document.getElementById('cardMeaning').textContent = w.tr;
    document.getElementById('cardTrad').textContent = 'HSK ' + w.lv + ' · EN: ' + w.m.join('; ') + ' · geleneksel: ' + w.t + ' · ' + themeName(w.th);
    var q = todayQueue();
    document.getElementById('queueLeft').textContent = 'kuyrukta kalan: ' + q.length + ' kelime';
  }

  function themeName(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i].name;
    return id;
  }

  document.getElementById('flashcard').addEventListener('click', function () {
    this.classList.toggle('flipped');
    if (this.classList.contains('flipped')) speak(current);
  });
  document.getElementById('btnSpeak').addEventListener('click', function () { speak(current); });
  document.getElementById('btnKnow').addEventListener('click', function () {
    state.known[current] = true;
    var t = todayStr();
    state.days[t] = (state.days[t] || 0) + 1;
    state.queue[t] = state.queue[t].filter(function (h) { return h !== current; });
    save();
    renderToday();
  });
  document.getElementById('btnAgain').addEventListener('click', function () {
    var t = todayStr();
    state.queue[t].push(state.queue[t].shift()); // sona at
    save();
    current = state.queue[t][0];
    renderCard();
  });
  document.getElementById('btnExtra').addEventListener('click', function () {
    addExtra(); renderToday();
  });
  document.getElementById('btnGoQuiz').addEventListener('click', function () { show('quiz'); });

  // --- TEMALAR ---
  function renderThemes() {
    var el = document.getElementById('themeList');
    el.innerHTML = '';
    THEMES.forEach(function (th) {
      var words = WORDS.filter(function (w) { return w.th === th.id; });
      var known = words.filter(function (w) { return state.known[w.h]; }).length;
      var item = document.createElement('div');
      item.className = 'theme-item';
      var head = '<div class="theme-head"><span class="theme-name">' + th.name + '</span>' +
        '<span class="theme-count">' + known + ' / ' + words.length + '</span></div>' +
        '<div class="theme-bar"><div style="width:' + (known / words.length * 100) + '%"></div></div>';
      var chips = '<div class="theme-words">' + words.map(function (w) {
        return '<span class="word-chip' + (state.known[w.h] ? ' known' : '') + '" data-h="' + w.h + '">' + w.h + '</span>';
      }).join('') + '</div>';
      item.innerHTML = head + chips;
      item.addEventListener('click', function (e) {
        var chip = e.target.closest('.word-chip');
        if (chip) {
          e.stopPropagation();
          var w = byHanzi[chip.dataset.h];
          speak(w.h);
          alert(w.h + '  [' + w.p + ']\n\n' + w.tr + '\n\nEN: ' + w.m.join('; '));
          return;
        }
        item.classList.toggle('open');
      });
      el.appendChild(item);
    });
  }

  // --- QUIZ ---
  var quiz = null;
  function startQuiz() {
    var pool = WORDS.filter(function (w) { return state.known[w.h]; });
    if (pool.length < 8) {
      alert('Quiz için en az 8 öğrenilmiş kelime lazım. Şu an: ' + pool.length);
      return;
    }
    var qs = [];
    var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 10);
    shuffled.forEach(function (w) {
      var dir = Math.random() < 0.5 ? 'h2m' : 'm2h';
      var distract = pool.filter(function (x) { return x.h !== w.h; })
        .sort(function () { return Math.random() - 0.5; }).slice(0, 3);
      qs.push({ w: w, dir: dir, opts: shuffle([w].concat(distract)) });
    });
    quiz = { qs: qs, i: 0, score: 0 };
    document.getElementById('quizSetup').classList.add('hidden');
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('quizArea').classList.remove('hidden');
    renderQ();
  }
  function shuffle(a) { return a.sort(function () { return Math.random() - 0.5; }); }

  function renderQ() {
    var q = quiz.qs[quiz.i];
    var qEl = document.getElementById('quizQ');
    if (q.dir === 'h2m') {
      qEl.innerHTML = '<div style="font-size:3rem">' + q.w.h + '</div><div class="sub">bunun anlamı ne?</div>';
    } else {
      qEl.innerHTML = '<div style="font-size:1.2rem">' + q.w.tr + '</div><div class="sub">hangi kelime?</div>';
    }
    var opts = document.getElementById('quizOpts');
    opts.innerHTML = '';
    q.opts.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'quiz-opt';
      b.textContent = q.dir === 'h2m' ? o.tr : o.h + '  (' + o.p + ')';
      b.addEventListener('click', function () {
        var correct = o.h === q.w.h;
        if (correct) { quiz.score++; speak(q.w.h); }
        b.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          Array.prototype.forEach.call(opts.children, function (c, idx) {
            if (q.opts[idx].h === q.w.h) c.classList.add('correct');
          });
        }
        Array.prototype.forEach.call(opts.children, function (c) { c.disabled = true; });
        setTimeout(nextQ, 900);
      });
      opts.appendChild(b);
    });
    document.getElementById('quizStatus').textContent =
      'soru ' + (quiz.i + 1) + ' / ' + quiz.qs.length + ' · skor: ' + quiz.score;
  }

  function nextQ() {
    quiz.i++;
    if (quiz.i >= quiz.qs.length) {
      document.getElementById('quizArea').classList.add('hidden');
      var r = document.getElementById('quizResult');
      r.classList.remove('hidden');
      var pct = quiz.score / quiz.qs.length;
      var msg = pct === 1 ? 'Mükemmel! 🏆' : pct >= 0.7 ? 'Güzel iş! 💪' : 'Tekrar lazım 🔁';
      r.innerHTML = '<h2>' + msg + '</h2><p>Skor: ' + quiz.score + ' / ' + quiz.qs.length + '</p>' +
        '<button class="btn ok" id="btnQuizAgain">↻ Yeni quiz</button>';
      document.getElementById('btnQuizAgain').addEventListener('click', startQuiz);
      return;
    }
    renderQ();
  }
  document.getElementById('btnStartQuiz').addEventListener('click', startQuiz);

  // --- TUM KELIMELER ---
  function renderAll(q) {
    var el = document.getElementById('allList');
    var ql = q.toLowerCase();
    var list = WORDS.filter(function (w) {
      if (!ql) return true;
      return w.h.indexOf(q) >= 0 || w.p.toLowerCase().indexOf(ql) >= 0 ||
        w.tr.toLowerCase().indexOf(ql) >= 0 ||
        w.m.join(' ').toLowerCase().indexOf(ql) >= 0;
    }).slice(0, 300);
    el.innerHTML = list.map(function (w) {
      return '<div class="all-row' + (state.known[w.h] ? ' known' : '') + '">' +
        '<span class="hz">' + w.h + ' <small style="color:var(--muted);font-size:.7rem">HSK' + w.lv + '</small></span><span class="py">' + w.p + '</span>' +
        '<span class="mn">' + w.tr + ' <i style="opacity:.6;font-style:normal">(' + w.m.join('; ') + ')</i></span>' +
        '<span class="sp" data-h="' + w.h + '">🔊</span>' +
        '<span class="tick" data-h="' + w.h + '">' + (state.known[w.h] ? '✅' : '⬜') + '</span></div>';
    }).join('') || '<div class="muted">sonuç yok</div>';
    el.querySelectorAll('.sp').forEach(function (s) {
      s.addEventListener('click', function () { speak(s.dataset.h); });
    });
    el.querySelectorAll('.tick').forEach(function (s) {
      s.addEventListener('click', function () {
        var h = s.dataset.h;
        if (state.known[h]) delete state.known[h]; else state.known[h] = true;
        save(); renderAll(document.getElementById('searchBox').value); renderStats();
      });
    });
  }
  document.getElementById('searchBox').addEventListener('input', function () { renderAll(this.value); });

  // --- AYARLAR ---
  var GOALS = [5, 10, 15, 20, 25, 30];
  function renderSettings() {
    var box = document.getElementById('goalButtons');
    box.innerHTML = '';
    GOALS.forEach(function (g) {
      var b = document.createElement('button');
      b.className = 'goal-btn' + (state.goal === g ? ' active' : '');
      b.textContent = g + ' kelime/gün';
      b.addEventListener('click', function () {
        state.goal = g;
        delete state.queue[todayStr()]; // bugunku kuyrugu yeni hedefle kur
        save(); renderSettings(); renderStats();
      });
      box.appendChild(b);
    });
  }
  document.getElementById('btnReset').addEventListener('click', function () {
    if (confirm('Tüm ilerleme silinsin mi? Geri alınamaz!')) {
      localStorage.removeItem(KEY);
      state = load();
      show('today');
    }
  });

  // baslangic
  renderStats();
  show('today');
})();
