(function(){
"use strict";
const E = Engine, fa = E.fa;
const names = {}; Object.keys(ACCOUNTS).forEach(k => names[k] = ACCOUNTS[k].n);
const $ = s => document.querySelector(s);
const app = $("#app");

/* ---------- ذخیره‌سازی و حساب ---------- */
const mem = {}; const memStore = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
let store = memStore, storageOK = false;
try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); store = localStorage; storageOK = true; } catch (e) {}
const auth = Auth.create(store);
const GUEST = auth.GUEST;
const newData = () => ({ v: 2, name: "", done: {}, attempts: {}, entries: [], reflect: {} });
let user = null, S = null;
function loadUser(u){ user = u; S = Object.assign(newData(), auth.loadData(u) || {}); }
function save(){ if(user) auth.saveData(user, S); }
try { const old = localStorage.getItem("hesabdari-karbordi-v1"); if(old && !auth.hasData(GUEST)) auth.saveData(GUEST, JSON.parse(old)); } catch(e){}
const ses = auth.getSession(); if(ses) loadUser(ses);

/* ---------- ابزار ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const md = s => fa(esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));
const allEx = () => LESSONS.flatMap(l => l.exercises);
const doneCount = () => allEx().filter(x => S.done[x.id]).length;
const exDone = L => L.exercises.filter(x => S.done[x.id]).length;
const lessonDone = L => exDone(L) === L.exercises.length;
const nextLesson = () => LESSONS.find(l => !lessonDone(l));
const hasProgress = () => S && (doneCount() > 0 || S.entries.length > 0);
let toastT;
function toast(m){ const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2400); }
function setTab(tab){ document.querySelectorAll("nav.bar button").forEach(b => { if(b.dataset.tab === tab) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); }); }
function show(html, tab, chrome){
  chrome = chrome !== false;
  app.innerHTML = html; setTab(tab);
  $("#top").hidden = !chrome || !user; $("#nav").hidden = !chrome || !user;
  if(user) $("#uchip").innerHTML = user === GUEST ? "مهمان" : `<span class="ltr">${esc(user)}</span>`;
  window.scrollTo(0, 0);
}
const storageBanner = () => storageOK ? "" : '<div class="warn">ذخیره‌سازی مرورگر در دسترس نیست (شاید حالت خصوصی است)؛ پیشرفتت فقط تا بستن صفحه می‌ماند.</div>';
const nextEx = (L, idx) => {
  if(idx < L.exercises.length - 1) return `<button class="btn" data-a="go" data-to="ex/${L.id}/${idx + 1}">تمرین بعدی</button>`;
  const i = LESSONS.indexOf(L), nx = LESSONS[i + 1];
  return `<button class="btn" data-a="go" data-to="lesson/${L.id}">پایان درس و بازگشت</button>` + (nx ? `<button class="btn alt" data-a="go" data-to="lesson/${nx.id}">درس بعدی: ${md(nx.title)}</button>` : "");
};

/* ---------- ورود و ساخت حساب ---------- */
let authTab = "login";
const ERR = {
  bad_username: "نام کاربری باید ۵ حرف انگلیسی کوچک و ۳ عدد باشد، مثل tarax123.",
  short_pw: "رمز باید حداقل ۶ نویسه باشد.", same: "رمز نباید با نام کاربری یکی باشد.",
  exists: "این نام کاربری روی این دستگاه قبلاً ساخته شده. نام دیگری بساز یا وارد شو.",
  login_fail: "نام کاربری یا رمز درست نیست.", locked: "چند بار اشتباه زدی؛ ۳۰ ثانیه صبر کن و دوباره امتحان کن.",
  nocrypto: "این مرورگر از رمزنگاری پشتیبانی نمی‌کند. از آخرین نسخه‌ی کروم یا سافاری استفاده کن.",
  storage: "ذخیره‌سازی مرورگر در دسترس نیست؛ حساب ساخته نشد."
};
function viewAuth(){
  const su = authTab === "signup";
  show(`<div class="auth">
    <div class="logo"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="6" fill="#1B3A57"/><rect x="7" y="7" width="18" height="18" rx="2" fill="#F7F9F2"/><path d="M11 12h10M11 16h10M11 20h10" stroke="#C4D1BF" stroke-width="1.5"/><path d="M21 7v18M23 7v18" stroke="#C0392B" stroke-width="1.2"/></svg>
    <h1 style="margin:0">ترازآموز</h1><p class="muted" style="margin:0;text-align:center">دوره‌ی کاربردی حسابداری، رایگان و تمرینی</p></div>
    <div class="tabs" role="tablist"><button role="tab" data-a="authTab" data-k="login" aria-selected="${!su}">ورود</button><button role="tab" data-a="authTab" data-k="signup" aria-selected="${su}">ساخت حساب</button></div>
    <form id="authForm" class="card" novalidate>
      <div class="inline"><div class="field"><label for="au">نام کاربری</label>
        <input type="text" id="au" maxlength="8" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" placeholder="tarax123"></div>
        ${su ? '<button type="button" class="btn alt" data-a="genUser">تولید</button>' : ""}</div>
      ${su ? '<p class="hint muted" style="margin:-4px 0 10px">۵ حرف انگلیسی کوچک و ۳ عدد. می‌توانی خودت بنویسی یا «تولید» را بزنی. این نام فقط مال توست.</p>' : ""}
      <div class="field"><label for="ap">رمز</label><input type="password" id="ap" autocomplete="${su ? "new-password" : "current-password"}"></div>
      ${su ? '<div class="field"><label for="ap2">تکرار رمز</label><input type="password" id="ap2" autocomplete="new-password"><span class="hint">حداقل ۶ نویسه</span></div>' : ""}
      <label class="sw"><input type="checkbox" id="showpw"> نمایش رمز</label>
      <div id="am" role="alert"></div>
      <button class="btn" type="submit" id="asub">${su ? "ساخت حساب" : "ورود"}</button>
    </form>
    ${su ? `<div class="msg info">حساب فقط روی همین دستگاه ساخته می‌شود و بین گوشی‌ها هم‌گام نیست. رمز فراموش‌شده قابل بازیابی نیست؛ نام کاربری و رمز را یادداشت کن و از بخش «من» پشتیبان بگیر.</div>` : ""}
    ${user ? `<button class="btn alt" data-a="go" data-to="">بازگشت</button>` : `<button class="btn ghost" data-a="guest">ادامه به‌عنوان مهمان</button><p class="muted" style="text-align:center;margin-top:8px">در حالت مهمان هم همه‌ی درس‌ها باز است؛ بعداً می‌توانی حساب بسازی و پیشرفتت منتقل می‌شود.</p>`}
  </div>`, null, false);
}
async function doAuth(){
  const u = ($("#au").value || "").trim().toLowerCase(), p = $("#ap").value || "", box = $("#am"), btn = $("#asub");
  const err = m => { box.innerHTML = `<div class="msg bad">${esc(m)}</div>`; };
  if(!u || !p) return err("نام کاربری و رمز را وارد کن.");
  btn.disabled = true; const label = btn.textContent; btn.textContent = "لطفاً صبر کن…";
  try{
    if(authTab === "signup"){
      if(p !== ($("#ap2").value || "")){ err("تکرار رمز با رمز یکی نیست."); return; }
      const carry = (user === GUEST && hasProgress()) ? S : null;
      const r = await auth.createUser(u, p, carry);
      if(!r.ok){ err(ERR[r.error] || "خطا در ساخت حساب."); return; }
      loadUser(u);
      show(`<div class="auth"><div class="card"><h1>حساب ساخته شد</h1>
        <p>نام کاربری تو:</p><p style="font-size:26px;font-weight:800;text-align:center;margin:0 0 8px"><span class="ltr">${esc(u)}</span></p>
        <p>نام کاربری و رمز را جایی امن یادداشت کن. رمز قابل بازیابی نیست.</p>
        ${carry ? '<div class="msg good">پیشرفت حالت مهمان به این حساب منتقل شد.</div>' : ""}
        <button class="btn" data-a="go" data-to="">شروع یادگیری</button></div></div>`, null, false);
    } else {
      const r = await auth.login(u, p);
      if(!r.ok){ err(ERR[r.error] || "ورود انجام نشد."); return; }
      loadUser(u); location.hash = "#/"; route();
    }
  } finally { if(btn.isConnected){ btn.disabled = false; btn.textContent = label; } }
}

/* ---------- خانه ---------- */
function viewHome(){
  const total = allEx().length, d = doneCount(), nxt = nextLesson();
  let h = storageBanner();
  if(user === GUEST) h += `<div class="warn">حالت مهمان: پیشرفتت فقط روی همین مرورگر می‌ماند. <button class="back" data-a="authUp">ساخت حساب</button></div>`;
  h += `<h1>${S.name ? "سلام " + esc(S.name) : "سلام، خوش آمدی"}</h1>
    <p class="muted">همه‌ی درس‌ها رایگان است. هر درس یک موقعیت واقعی کار، نکته‌های ریز و تمرین دارد.</p>
    <div class="card"><b>پیشرفت تو: ${fa(d)} از ${fa(total)} تمرین</b>
      <div class="progress" role="progressbar" aria-valuenow="${d}" aria-valuemin="0" aria-valuemax="${total}"><i style="width:${total ? Math.round(d / total * 100) : 0}%"></i></div></div>`;
  if(nxt) h += `<button class="next" data-a="go" data-to="lesson/${nxt.id}"><small>${exDone(nxt) ? "ادامه بده" : "شروع کن"}</small><b>${esc(nxt.level)}، درس ${fa(nxt.n)}: ${md(nxt.title)}</b></button>`;
  else h += `<div class="msg good">همه‌ی درس‌ها را تمام کردی. آفرین!</div>`;
  LEVEL_NAMES.forEach(name => {
    const ls = LESSONS.filter(l => l.level === name), dn = ls.filter(lessonDone).length;
    const open = nxt ? nxt.level === name : name === LEVEL_NAMES[0];
    h += `<details class="level" ${open ? "open" : ""}><summary><span>${esc(name)}</span><span class="count">${fa(dn)} از ${fa(ls.length)} درس</span></summary><div class="lv-in">` +
      ls.map(L => { const full = lessonDone(L);
        return `<button class="lcard ${full ? "done" : ""}" data-a="go" data-to="lesson/${L.id}"><span class="num">${fa(L.n)}</span><span><h3>${md(L.title)}</h3><span class="muted">${fa(exDone(L))} از ${fa(L.exercises.length)} تمرین</span> ${full ? '<span class="tag done">کامل شد</span>' : ""}</span></button>`; }).join("") + `</div></details>`;
  });
  h += `<p class="muted" style="margin-top:16px">محتوا آموزشی است و جایگزین مشاوره‌ی مالیاتی یا حقوقی نیست. نرخ‌ها و مبلغ‌ها در تمرین‌ها فرضی‌اند.</p>`;
  show(h, "home");
}

/* ---------- درس ---------- */
function viewLesson(id){
  const L = LESSONS.find(l => l.id === id); if(!L) return viewHome();
  let h = `<button class="back" data-a="go" data-to="">بازگشت به فهرست</button>
    <p class="muted" style="margin:0">${esc(L.level)}</p><h1>درس ${fa(L.n)}: ${md(L.title)}</h1>
    <p>${md(L.goal)}</p>
    <div class="scene"><span class="lab">موقعیت واقعی کار</span>${md(L.scene)}</div>
    <span class="lab">نکته‌های ریز</span><ul class="tips">${L.tips.map(t => `<li>${md(t)}</li>`).join("")}</ul>
    <h2>تمرین‌ها</h2>`;
  L.exercises.forEach((x, i) => {
    const dn = !!S.done[x.id];
    h += `<button class="ex ${dn ? "done" : ""}" data-a="go" data-to="ex/${L.id}/${i}"><span class="st">${dn ? "✓" : fa(i + 1)}</span><span>${md(x.title)}</span></button>`;
  });
  if(lessonDone(L)){ const nx = LESSONS[LESSONS.indexOf(L) + 1];
    h += `<div class="msg good" style="margin-top:12px">این درس را کامل کردی.</div>` + (nx ? `<button class="btn" data-a="go" data-to="lesson/${nx.id}">درس بعدی: ${md(nx.title)}</button>` : ""); }
  show(h, "home");
}

/* ---------- تمرین ---------- */
let cur = null;
function viewEx(lid, idx){
  const L = LESSONS.find(l => l.id === lid); idx = +idx;
  if(!L || !L.exercises[idx]) return viewHome();
  const ex = L.exercises[idx];
  cur = { L, ex, idx, fails: 0 };
  let h = `<button class="back" data-a="go" data-to="lesson/${L.id}">بازگشت به درس ${fa(L.n)}</button>
    <p class="muted" style="margin:0">تمرین ${fa(idx + 1)} از ${fa(L.exercises.length)}${S.done[ex.id] ? " | قبلاً درست حل شده؛ می‌توانی دوباره تمرین کنی" : ""}</p>
    <h1>${md(ex.title)}</h1>`;
  if(ex.type === "journal"){
    cur.ed = { rows: [{acc:"",d:"",c:""}, {acc:"",d:"",c:""}], desc: "" };
    h += `<div class="sheet"><p class="story">${md(ex.story)}</p><p class="muted">مبالغ به ${md(ex.unit)}</p>
      <div id="rows"></div><button class="btn ghost" data-a="addRow">افزودن سطر</button><div class="bal" id="bal"></div>
      ${ex.needDesc ? '<label class="lab" for="desc" style="margin-top:10px">شرح سند</label><textarea id="desc" placeholder="چه چیزی، از چه کسی، طبق چه مدرکی؟"></textarea>' : ""}</div>
      <button class="btn" data-a="check">بررسی سند</button><div class="fb" id="fb"></div>`;
  } else if(ex.type === "classify"){
    cur.sel = {};
    h += `<p>برای هر مورد، گروه درست را انتخاب کن.</p><div id="items"></div><button class="btn" data-a="classCheck">بررسی</button><div class="fb" id="fb"></div>`;
  } else if(ex.type === "quiz"){
    cur.sel = {};
    h += (ex.intro ? `<p>${md(ex.intro)}</p>` : "") + ex.questions.map((q, i) => `<div class="item" data-i="${i}"><div><b>${fa(i + 1)})</b> ${md(q.q)}</div>
      <div role="group" aria-label="گزینه‌های سؤال ${fa(i + 1)}">${q.o.map((o, j) => `<button class="opt" data-a="opt" data-i="${i}" data-j="${j}" aria-pressed="false">${md(o)}</button>`).join("")}</div><div class="why" id="why${i}"></div></div>`).join("") +
      `<button class="btn" data-a="quizCheck">بررسی</button><div class="fb" id="fb"></div>`;
  } else if(ex.type === "calc"){
    cur.vals = [];
    h += `<div class="card"><p class="story" style="margin:0">${md(ex.story)}</p></div>` + ex.fields.map((f, i) => `<label class="fld" data-i="${i}"><span>${md(f.l)}${f.u ? " (" + esc(f.u) + ")" : ""}</span><input class="cv" data-i="${i}" inputmode="decimal" autocomplete="off" aria-label="${esc(f.l)}"></label>`).join("") +
      `<button class="btn" data-a="calcCheck">بررسی</button><div class="fb" id="fb"></div>`;
  } else if(ex.type === "reflect"){
    h += `<p>${md(ex.prompt)}</p><textarea id="refl" placeholder="پاسخ خودت را اینجا بنویس"></textarea>
      <button class="btn" data-a="reflectShow" style="margin-top:8px">نمایش پاسخ نمونه</button><div class="fb" id="fb"></div>`;
  }
  h += `<div class="btns">${idx > 0 ? `<button class="btn alt" data-a="go" data-to="ex/${L.id}/${idx - 1}">تمرین قبلی</button>` : ""}${idx < L.exercises.length - 1 ? `<button class="btn alt" data-a="go" data-to="ex/${L.id}/${idx + 1}">تمرین بعدی</button>` : ""}</div>`;
  show(h, "home");
  if(ex.type === "journal"){ renderRows(); updateBal(); }
  if(ex.type === "classify") renderItems();
  if(ex.type === "reflect" && S.reflect[ex.id]) $("#refl").value = S.reflect[ex.id];
}
function fail(){ cur.fails++; S.attempts[cur.ex.id] = (S.attempts[cur.ex.id] || 0) + 1; save(); }
function succeed(){ S.done[cur.ex.id] = true; save(); }

/* --- سند --- */
function renderRows(){
  const ed = cur.ed, ex = cur.ex, many = ed.rows.length > 2;
  $("#rows").innerHTML = ed.rows.map((r, i) => `
    <div class="row ${many ? "has-x" : ""}" data-i="${i}">
      <select class="acc" aria-label="حساب سطر ${fa(i + 1)}"><option value="">حساب را انتخاب کن</option>
        ${ex.accounts.map(a => `<option value="${a}" ${r.acc === a ? "selected" : ""}>${esc(names[a])}</option>`).join("")}</select>
      <div class="amts"><label>بدهکار<input class="d" inputmode="decimal" autocomplete="off" value="${esc(r.d)}"></label>
        <label>بستانکار<input class="c" inputmode="decimal" autocomplete="off" value="${esc(r.c)}"></label></div>
      ${many ? `<button class="x" data-a="delRow" data-i="${i}" aria-label="حذف سطر ${fa(i + 1)}">×</button>` : ""}
    </div>`).join("");
}
function updateBal(){
  let d = 0, c = 0;
  cur.ed.rows.forEach(r => { const x = E.parseAmount(r.d), y = E.parseAmount(r.c); if(!isNaN(x)) d += x; if(!isNaN(y)) c += y; });
  d = Math.round(d * 1000) / 1000; c = Math.round(c * 1000) / 1000;
  const ok = d > 0 && d === c;
  $("#bal").innerHTML = `<div>بدهکار: ${E.fmt(d)}</div><div>بستانکار: ${E.fmt(c)}</div><div class="st ${ok ? "ok" : ""}">${ok ? "متعادل" : (d || c) ? "اختلاف " + E.fmt(Math.abs(d - c)) : "خالی"}</div>`;
}
const solutionTable = sol => `<table><thead><tr><th>حساب</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>` +
  sol.map(r => `<tr><td>${esc(names[r.a])}</td><td class="n">${r.d ? E.fmt(r.d) : ""}</td><td class="n">${r.c ? E.fmt(r.c) : ""}</td></tr>`).join("") + `</tbody></table>`;
function checkJournal(){
  const { ex, ed, L, idx } = cur, fb = $("#fb");
  const g = E.gradeJournal(ed.rows, ex.solutions, names);
  let descBad = false;
  if(g.ok && ex.needDesc){ const d = ed.desc.trim(); descBad = d.length < 20 || !/[\d۰-۹٠-٩]/.test(d); }
  if(g.ok && descBad){ fb.innerHTML = `<div class="msg info"><b>سند درست است، ولی شرح کافی نیست.</b><ul><li>شرح باید بگوید چه چیزی، از چه کسی و طبق چه مدرکی (شماره‌ی فاکتور) ثبت شده است.</li></ul></div>`; return; }
  if(g.ok){
    succeed();
    const rows = ed.rows.map(r => ({ acc: r.acc, d: E.parseAmount(r.d), c: E.parseAmount(r.c) })).filter(r => r.acc && (r.d || r.c));
    const entry = { id: ex.id, title: ex.title, lesson: L.id, book: ex.book || "free", rows, desc: ed.desc.trim() };
    const k = S.entries.findIndex(e => e.id === ex.id); if(k >= 0) S.entries[k] = entry; else S.entries.push(entry);
    save();
    fb.innerHTML = `<div class="msg good"><b>درست است.</b><p style="margin:4px 0 0">${md(ex.explain)}</p></div>${nextEx(L, idx)}<button class="btn alt" data-a="go" data-to="books">دیدن در دفتر من</button>`; return;
  }
  fail();
  fb.innerHTML = `<div class="msg bad"><b>هنوز درست نیست.</b><ul>${g.messages.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>` +
    (cur.fails >= 2 ? `<button class="btn alt" data-a="reveal">نمایش پاسخ</button>` : `<p class="muted">یک بار دیگر امتحان کن. بعد از دو تلاش می‌توانی پاسخ را ببینی.</p>`);
}
function revealJournal(){
  $("#fb").insertAdjacentHTML("beforeend", `<div class="msg info"><b>پاسخ درست</b>${solutionTable(cur.ex.solutions[0])}<p style="margin:8px 0 0">${md(cur.ex.explain)}</p></div>`);
  const b = document.querySelector('[data-a="reveal"]'); if(b) b.remove();
}

/* --- دسته‌بندی --- */
function renderItems(){
  const { ex, sel } = cur;
  $("#items").innerHTML = ex.items.map((it, i) => `<div class="item" data-i="${i}"><div>${fa(i + 1)}) ${md(it.t)}</div>
    <div class="chips" role="group" aria-label="گروه">${ex.groups.map(g => `<button class="chip" data-a="chip" data-i="${i}" data-g="${g}" aria-pressed="${sel[i] === g}">${g}</button>`).join("")}</div><div class="why" id="why${i}"></div></div>`).join("");
}
function classCheck(){
  const { ex, sel, L, idx } = cur, fb = $("#fb");
  const un = ex.items.filter((_, i) => !sel[i]).length;
  if(un){ fb.innerHTML = `<div class="msg info">برای ${fa(un)} مورد هنوز گروهی انتخاب نشده است.</div>`; return; }
  let wrong = 0;
  ex.items.forEach((it, i) => { const ok = sel[i] === it.a; document.querySelector(`.item[data-i="${i}"]`).className = "item " + (ok ? "ok" : "bad"); if(!ok) wrong++; });
  if(!wrong){ succeed(); ex.items.forEach((it, i) => { $("#why" + i).textContent = fa(it.why); });
    fb.innerHTML = `<div class="msg good"><b>همه درست است.</b> توضیح هر مورد زیر آن آمده است.</div>${nextEx(L, idx)}`; return; }
  fail();
  fb.innerHTML = `<div class="msg bad"><b>${fa(wrong)} مورد درست نیست.</b> موارد قرمز را دوباره بررسی کن.</div>` + (cur.fails >= 2 ? `<button class="btn alt" data-a="classReveal">نمایش پاسخ‌ها</button>` : "");
}
function classReveal(){
  cur.ex.items.forEach((it, i) => { $("#why" + i).innerHTML = `پاسخ: <b>${esc(it.a)}</b>. ${md(it.why)}`; });
  const b = document.querySelector('[data-a="classReveal"]'); if(b) b.remove();
}

/* --- چندگزینه‌ای --- */
function quizCheck(){
  const { ex, sel, L, idx } = cur, fb = $("#fb");
  const g = E.gradeQuiz(sel, ex.questions);
  if(g.unanswered.length){ fb.innerHTML = `<div class="msg info">به ${fa(g.unanswered.length)} سؤال هنوز جواب نداده‌ای.</div>`; return; }
  ex.questions.forEach((q, i) => { document.querySelector(`.item[data-i="${i}"]`).className = "item " + (g.wrong.includes(i) ? "bad" : "ok"); });
  if(g.ok){ succeed(); ex.questions.forEach((q, i) => { $("#why" + i).innerHTML = md(q.why); });
    fb.innerHTML = `<div class="msg good"><b>همه درست است.</b> توضیح هر سؤال زیر آن آمده است.</div>${nextEx(L, idx)}`; return; }
  fail();
  fb.innerHTML = `<div class="msg bad"><b>${fa(g.wrong.length)} سؤال درست نیست.</b> سؤال‌های قرمز را دوباره فکر کن.</div>` + (cur.fails >= 2 ? `<button class="btn alt" data-a="quizReveal">نمایش پاسخ‌ها</button>` : "");
}
function quizReveal(){
  cur.ex.questions.forEach((q, i) => { if(cur.sel[i] !== q.a) $("#why" + i).innerHTML = `پاسخ درست: <b>${md(q.o[q.a])}</b>. ${md(q.why)}`; });
  const b = document.querySelector('[data-a="quizReveal"]'); if(b) b.remove();
}

/* --- محاسباتی --- */
function calcCheck(){
  const { ex, L, idx } = cur, fb = $("#fb");
  const g = E.gradeCalc(ex.fields.map((_, i) => cur.vals[i]), ex.fields);
  if(g.res.some(r => r === "empty" || r === "invalid")){
    ex.fields.forEach((_, i) => { document.querySelector(`.fld[data-i="${i}"]`).className = "fld " + (g.res[i] === "ok" ? "ok" : g.res[i] === "bad" ? "bad" : ""); });
    fb.innerHTML = `<div class="msg info">همه‌ی کادرها را فقط با عدد پر کن.</div>`; return; }
  ex.fields.forEach((_, i) => { document.querySelector(`.fld[data-i="${i}"]`).className = "fld " + (g.res[i] === "ok" ? "ok" : "bad"); });
  if(g.ok){ succeed(); fb.innerHTML = `<div class="msg good"><b>درست است.</b><p style="margin:4px 0 0">${md(ex.explain)}</p></div>${nextEx(L, idx)}`; return; }
  fail();
  const wrong = g.res.filter(r => r === "bad").length;
  fb.innerHTML = `<div class="msg bad"><b>${fa(wrong)} مورد درست نیست.</b> موارد قرمز را دوباره حساب کن.</div>` + (cur.fails >= 2 ? `<button class="btn alt" data-a="calcReveal">نمایش پاسخ‌ها</button>` : "");
}
function calcReveal(){
  const { ex } = cur;
  ex.fields.forEach((f, i) => { const el = document.querySelector(`.fld[data-i="${i}"] span`); el.insertAdjacentHTML("beforeend", ` <b>← ${E.fmt(f.a)}</b>`); });
  $("#fb").insertAdjacentHTML("beforeend", `<div class="msg info"><b>راه‌حل</b><p style="margin:4px 0 0">${md(ex.explain)}</p></div>`);
  const b = document.querySelector('[data-a="calcReveal"]'); if(b) b.remove();
}

/* --- پاسخ تشریحی --- */
function reflectShow(){
  const { ex, L, idx } = cur, t = ($("#refl").value || "").trim();
  if(t.length < 20){ $("#fb").innerHTML = '<div class="msg info">اول پاسخ خودت را بنویس (حداقل یک یا دو جمله)، بعد پاسخ نمونه را ببین.</div>'; return; }
  S.reflect[ex.id] = t; succeed();
  $("#fb").innerHTML = `<div class="msg info"><b>پاسخ نمونه</b><p style="margin:4px 0 0">${md(ex.sample)}</p></div><p class="muted">پاسخ خودت را با این مقایسه کن؛ اگر نکته‌ای جا مانده، همان را اضافه کن.</p>${nextEx(L, idx)}`;
}

/* ---------- دفتر من ---------- */
let bookTab = "j", bookKey = "free";
const BOOKS = [["free", "تمرین‌ها"], ["pars", "پارس‌دیزاین"]];
function viewBooks(){
  const ents = S.entries.filter(e => (e.book || "free") === bookKey);
  let h = `<h1>دفتر من</h1><p class="muted">هر سندی که درست ثبت کنی خودکار به روزنامه، کل و تراز اضافه می‌شود. مبالغ به میلیون تومان است.</p>
    <div class="tabs" role="tablist" aria-label="دفتر">${BOOKS.map(([k, n]) => `<button role="tab" data-a="book" data-k="${k}" aria-selected="${bookKey === k}">${n}</button>`).join("")}</div>
    <div class="tabs" role="tablist" aria-label="نوع گزارش">${[["j", "روزنامه"], ["l", "کل"], ["t", "تراز"]].map(([k, n]) => `<button role="tab" data-a="tab" data-k="${k}" aria-selected="${bookTab === k}">${n}</button>`).join("")}</div>`;
  if(!ents.length){
    h += `<div class="card"><p>در این دفتر هنوز سندی ثبت نشده است.</p><p class="muted">${bookKey === "pars" ? "سندهای درس ۹ (پارس‌دیزاین) اینجا جمع می‌شوند." : "تمرین‌های سند زدن را حل کن؛ مثلاً درس ۲."}</p><button class="btn" data-a="go" data-to="${bookKey === "pars" ? "lesson/l9" : "lesson/l2"}">رفتن به تمرین‌ها</button></div>`;
    return show(h, "books");
  }
  if(bookTab === "j"){
    ents.forEach((e, i) => { h += `<div class="card"><h3>سند ${fa(i + 1)}: ${md(e.title)}</h3>
      <table><thead><tr><th>حساب</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>${e.rows.map(r => `<tr><td>${esc(names[r.acc] || r.acc)}</td><td class="n">${r.d ? E.fmt(r.d) : ""}</td><td class="n">${r.c ? E.fmt(r.c) : ""}</td></tr>`).join("")}</tbody></table>
      ${e.desc ? `<p class="muted" style="margin:8px 0 0">شرح: ${esc(e.desc)}</p>` : ""}</div>`; });
  } else {
    const led = E.buildLedger(ents, ACCOUNTS);
    if(bookTab === "l"){
      led.list.forEach(a => { const side = a.balD ? "بدهکار" : a.balC ? "بستانکار" : "صفر";
        h += `<div class="card"><h3>${esc(names[a.acc])}</h3><div class="t2">
          <div><b>بدهکار</b>${a.lines.filter(l => l.d).map(l => `<span>${E.fmt(l.d)} <small class="muted">(سند ${fa(l.no)})</small></span>`).join("")}</div>
          <div><b>بستانکار</b>${a.lines.filter(l => l.c).map(l => `<span>${E.fmt(l.c)} <small class="muted">(سند ${fa(l.no)})</small></span>`).join("")}</div></div>
          <p style="margin:8px 0 0"><b>مانده: ${E.fmt(a.balD || a.balC)} ${side}</b></p></div>`; });
    } else {
      h += `<table><thead><tr><th>حساب</th><th>مانده بدهکار</th><th>مانده بستانکار</th></tr></thead><tbody>${led.list.map(a => `<tr><td>${esc(names[a.acc])}</td><td class="n">${a.balD ? E.fmt(a.balD) : ""}</td><td class="n">${a.balC ? E.fmt(a.balC) : ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>جمع</td><td class="n">${E.fmt(led.totalD)}</td><td class="n">${E.fmt(led.totalC)}</td></tr></tfoot></table>
        <div class="msg ${led.balanced ? "good" : "bad"}" style="margin-top:10px">${led.balanced ? "تراز بسته می‌شود؛ جمع دو ستون برابر است." : "تراز بسته نمی‌شود. اسناد را بررسی کن."}</div>`;
    }
  }
  show(h, "books");
}

/* ---------- من ---------- */
let deferredInstall = null, pwOpen = false;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
function viewMe(){
  const guest = user === GUEST, total = allEx().length;
  show(`<h1>من</h1>${storageBanner()}
    <div class="card"><h3>حساب</h3>
      ${guest ? `<p>حالت مهمان. پیشرفتت فقط روی همین مرورگر ذخیره می‌شود.</p><button class="btn" data-a="authUp">ساخت حساب (پیشرفت منتقل می‌شود)</button><button class="btn alt" data-a="authIn">ورود به حساب دیگر</button>`
      : `<p>نام کاربری: <b class="ltr">${esc(user)}</b></p>
         <div class="btns"><button class="btn alt" data-a="togglePw">تغییر رمز</button><button class="btn alt" data-a="logout">خروج</button></div>
         ${pwOpen ? `<form id="pwForm" style="margin-top:10px"><div class="field"><label for="po">رمز فعلی</label><input type="password" id="po" autocomplete="current-password"></div>
           <div class="field"><label for="pn">رمز جدید (حداقل ۶ نویسه)</label><input type="password" id="pn" autocomplete="new-password"></div><button class="btn" type="submit">ذخیره‌ی رمز جدید</button></form>` : ""}`}
      <p class="muted" style="margin-top:10px">حساب‌ها فقط روی همین دستگاه ساخته می‌شوند و بین گوشی‌ها هم‌گام نیستند. رمز فراموش‌شده قابل بازیابی نیست؛ از پشتیبان استفاده کن.</p></div>
    <div class="card"><h3>نام نمایشی (اختیاری)</h3><input class="name" id="nm" maxlength="30" value="${esc(S.name)}" placeholder="نام"><button class="btn" data-a="saveName">ذخیره‌ی نام</button></div>
    <div class="card"><h3>پیشرفت</h3><p>${fa(doneCount())} از ${fa(total)} تمرین درست حل شده و ${fa(S.entries.length)} سند در دفتر توست.</p></div>
    <div class="card"><h3>نصب روی صفحه‌ی اصلی</h3><p class="muted">در منوی مرورگر گزینه‌ی «افزودن به صفحه‌ی اصلی» را بزن تا مثل برنامه باز شود.</p>${deferredInstall ? '<button class="btn alt" data-a="install">نصب برنامه</button>' : ""}</div>
    <div class="card"><h3>پشتیبان‌گیری</h3><p class="muted">اگر مرورگر را پاک کنی یا گوشی عوض کنی، با این پشتیبان پیشرفتت برمی‌گردد.</p>
      <button class="btn alt" data-a="copyBackup">کپی پشتیبان</button>
      <textarea id="bk" placeholder="متن پشتیبان را اینجا بچسبان" style="margin-top:8px"></textarea>
      <button class="btn alt" data-a="restore" style="margin-top:8px">بازیابی از پشتیبان</button></div>
    <div class="card"><h3>پاک‌کردن</h3><button class="btn danger" data-a="resetProgress">پاک‌کردن پیشرفت</button>
      ${guest ? "" : `<form id="delForm" style="margin-top:10px"><div class="field"><label for="dp">برای حذف حساب، رمز را وارد کن</label><input type="password" id="dp" autocomplete="current-password"></div><button class="btn danger" type="submit">حذف دائمی حساب</button></form>`}</div>
    <p class="muted">نسخه‌ی آزمایشی ۰٫۲. محتوا آموزشی است و جایگزین مشاوره‌ی مالیاتی یا حقوقی نیست.</p>`, "me");
}
function copyBackup(){
  const txt = JSON.stringify(S);
  const fb = () => { const t = $("#bk"); t.value = txt; t.select(); toast("متن را کپی کن و جای امنی نگه دار"); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("پشتیبان کپی شد"), fb); else fb();
}
function restore(){
  try{ const o = JSON.parse(($("#bk").value || "").trim());
    if(!o || typeof o.done !== "object" || !Array.isArray(o.entries)) throw 0;
    S = Object.assign(newData(), o); save(); toast("بازیابی شد"); viewMe();
  }catch(e){ toast("متن پشتیبان معتبر نیست"); }
}

/* ---------- رویدادها ---------- */
const A = {
  go: t => { const to = t.dataset.to; const cur_ = location.hash.replace(/^#\/?/, ""); if(cur_ === to) route(); else location.hash = "#/" + to; },
  authTab: t => { authTab = t.dataset.k; viewAuth(); },
  authUp: () => { authTab = "signup"; location.hash = "#/auth"; route(); },
  authIn: () => { authTab = "login"; location.hash = "#/auth"; route(); },
  genUser: () => { $("#au").value = auth.generateUsername(); },
  guest: () => { loadUser(GUEST); auth.setSession(GUEST); location.hash = "#/"; route(); },
  logout: () => { auth.clearSession(); user = null; S = null; cur = null; authTab = "login"; location.hash = "#/auth"; route(); },
  togglePw: () => { pwOpen = !pwOpen; viewMe(); },
  saveName: () => { S.name = ($("#nm").value || "").trim(); save(); toast("ذخیره شد"); },
  addRow: () => { if(cur.ed.rows.length >= 6) return toast("حداکثر شش سطر"); cur.ed.rows.push({acc:"",d:"",c:""}); renderRows(); updateBal(); const s = document.querySelectorAll("#rows select"); s[s.length - 1].focus(); },
  delRow: t => { cur.ed.rows.splice(+t.dataset.i, 1); renderRows(); updateBal(); },
  check: checkJournal, reveal: revealJournal,
  chip: t => { cur.sel[+t.dataset.i] = t.dataset.g; t.parentNode.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", b === t)); },
  opt: t => { cur.sel[+t.dataset.i] = +t.dataset.j; t.parentNode.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", b === t)); },
  classCheck, classReveal, quizCheck, quizReveal, calcCheck, calcReveal, reflectShow,
  tab: t => { bookTab = t.dataset.k; viewBooks(); },
  book: t => { bookKey = t.dataset.k; viewBooks(); },
  copyBackup, restore,
  resetProgress: () => { if(confirm("همه‌ی پیشرفت و اسناد این حساب پاک شود؟ این کار برگشت ندارد.")){ const n = S.name; S = newData(); S.name = n; save(); toast("پاک شد"); viewMe(); } },
  install: () => { if(deferredInstall){ deferredInstall.prompt(); deferredInstall = null; } }
};
const SCROLL_FB = ["check","classCheck","quizCheck","calcCheck","reflectShow","reveal","classReveal","quizReveal","calcReveal"];
document.addEventListener("click", e => {
  const t = e.target.closest("[data-a]"); if(!t || !A[t.dataset.a]) return;
  A[t.dataset.a](t, e);
  if(SCROLL_FB.indexOf(t.dataset.a) >= 0){ const f = $("#fb"); if(f){ f.style.scrollMarginTop = "70px"; f.scrollIntoView({block:"start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth"}); } }
});
document.addEventListener("input", e => {
  const t = e.target;
  if(t.id === "desc" && cur) { cur.ed.desc = t.value; return; }
  if(t.classList && t.classList.contains("cv") && cur){ cur.vals[+t.dataset.i] = t.value; return; }
  const row = t.closest && t.closest(".row"); if(!row || !cur || !cur.ed) return;
  const r = cur.ed.rows[+row.dataset.i];
  if(t.classList.contains("d")){ r.d = t.value; if(t.value.trim()){ r.c = ""; row.querySelector(".c").value = ""; } }
  if(t.classList.contains("c")){ r.c = t.value; if(t.value.trim()){ r.d = ""; row.querySelector(".d").value = ""; } }
  updateBal();
});
document.addEventListener("change", e => {
  const t = e.target;
  if(t.id === "showpw"){ ["ap","ap2"].forEach(id => { const el = $("#" + id); if(el) el.type = t.checked ? "text" : "password"; }); return; }
  if(t.classList && t.classList.contains("acc") && cur && cur.ed) cur.ed.rows[+t.closest(".row").dataset.i].acc = t.value;
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  const id = e.target.id;
  if(id === "authForm") return doAuth();
  if(id === "pwForm"){
    const r = await auth.changePassword(user, $("#po").value, $("#pn").value);
    if(r.ok){ pwOpen = false; toast("رمز تغییر کرد"); viewMe(); } else toast(ERR[r.error] || "رمز تغییر نکرد");
  }
  if(id === "delForm"){
    if(!confirm("حساب و همه‌ی اطلاعاتش برای همیشه حذف شود؟")) return;
    const r = await auth.deleteUser(user, $("#dp").value);
    if(r.ok){ user = null; S = null; authTab = "login"; toast("حساب حذف شد"); location.hash = "#/auth"; route(); } else toast(ERR[r.error] || "حذف انجام نشد");
  }
});

/* ---------- مسیریابی ---------- */
function route(){
  const p = location.hash.replace(/^#\/?/, "").split("/");
  if(p[0] === "auth") return viewAuth();
  if(!user) return viewAuth();
  if(p[0] === "lesson") return viewLesson(p[1]);
  if(p[0] === "ex") return viewEx(p[1], p[2]);
  if(p[0] === "books") return viewBooks();
  if(p[0] === "me") return viewMe();
  viewHome();
}
window.addEventListener("hashchange", route);
route();
if("serviceWorker" in navigator && location.protocol.indexOf("http") === 0){ navigator.serviceWorker.register("sw.js").catch(() => {}); }
})();
