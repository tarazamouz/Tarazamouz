/* موتور محاسبه و تصحیح: مستقل از ظاهر برنامه (قابل تست در Node) */
(function (root) {
  const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";

  function normDigits(s) {
    return String(s).replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => AR.indexOf(d));
  }
  // تبدیل ورودی کاربر به عدد؛ NaN یعنی نامعتبر، خالی یعنی 0
  function parseAmount(s) {
    if (s === null || s === undefined) return 0;
    let t = normDigits(s).trim().replace(/[\s,٬،]/g, "").replace(/٫/g, ".");
    if (t === "") return 0;
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return NaN;
    return Number(t);
  }
  const r3 = n => Math.round(n * 1000) / 1000;
  // نمایش عدد با ارقام فارسی
  function fa(x) { return String(x).replace(/\d/g, d => FA[d]); }
  function fmt(n) {
    n = r3(n);
    let [i, f] = String(n).split(".");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return fa(f ? i + "٫" + f : i);
  }

  // سطرهای ورودی کاربر: [{acc, d, c}] با رشته‌ی مبلغ
  function cleanRows(rows) {
    const errors = [], out = [];
    rows.forEach((r, i) => {
      const hasAcc = !!r.acc;
      const d = parseAmount(r.d), c = parseAmount(r.c);
      const empty = !hasAcc && (r.d || "") === "" && (r.c || "") === "";
      if (empty) return;
      if (Number.isNaN(d) || Number.isNaN(c)) { errors.push(`مبلغ سطر ${fa(i + 1)} را فقط با عدد وارد کن.`); return; }
      if (!hasAcc) { errors.push(`برای سطر ${fa(i + 1)} حساب انتخاب نشده است.`); return; }
      if (d > 0 && c > 0) { errors.push(`در سطر ${fa(i + 1)} هم بدهکار و هم بستانکار پر شده؛ هر سطر فقط یک سمت دارد.`); return; }
      if (d < 0 || c < 0) { errors.push(`مبلغ سطر ${fa(i + 1)} نمی‌تواند منفی باشد.`); return; }
      if (d === 0 && c === 0) { errors.push(`برای سطر ${fa(i + 1)} مبلغ وارد نشده است.`); return; }
      out.push({ acc: r.acc, d, c });
    });
    return { rows: out, errors };
  }

  function totals(rows) {
    let d = 0, c = 0;
    rows.forEach(r => { d += r.d; c += r.c; });
    return { d: r3(d), c: r3(c), diff: r3(Math.abs(d - c)), balanced: r3(d) === r3(c) && d > 0 };
  }

  function toMap(rows) {
    const m = {};
    rows.forEach(r => {
      if (r.d) m[r.acc + "|d"] = r3((m[r.acc + "|d"] || 0) + r.d);
      if (r.c) m[r.acc + "|c"] = r3((m[r.acc + "|c"] || 0) + r.c);
    });
    return m;
  }
  function solToRows(sol) { return sol.map(s => ({ acc: s.a, d: s.d || 0, c: s.c || 0 })); }

  function sameMap(a, b) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => b[k] === a[k]);
  }
  function mismatchCount(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0; keys.forEach(k => { if (a[k] !== b[k]) n++; });
    return n;
  }

  /* تصحیح سند. names: نقشه‌ی شناسه‌ی حساب به نام نمایشی */
  function gradeJournal(rawRows, solutions, names) {
    const res = { ok: false, messages: [], totals: null };
    const cl = cleanRows(rawRows);
    if (cl.errors.length) { res.messages = cl.errors; return res; }
    if (cl.rows.length < 2) { res.messages = ["هر سند حداقل دو سطر دارد: یک حساب بدهکار و یک حساب بستانکار."]; return res; }
    const t = totals(cl.rows); res.totals = t;
    const user = toMap(cl.rows);
    const maps = solutions.map(s => toMap(solToRows(s)));
    if (maps.some(m => sameMap(user, m))) { res.ok = true; return res; }

    const msgs = [];
    if (!t.balanced) msgs.push(`سند متعادل نیست: جمع بدهکار ${fmt(t.d)} و جمع بستانکار ${fmt(t.c)} است.`);
    // نزدیک‌ترین پاسخ
    let best = maps[0], bestN = Infinity;
    maps.forEach(m => { const n = mismatchCount(user, m); if (n < bestN) { bestN = n; best = m; } });
    const nm = id => "«" + (names[id] || id) + "»";
    const wanted = {}; // acc -> {d, c}
    Object.keys(best).forEach(k => { const [a, s] = k.split("|"); (wanted[a] = wanted[a] || {})[s] = best[k]; });
    const have = {};
    Object.keys(user).forEach(k => { const [a, s] = k.split("|"); (have[a] = have[a] || {})[s] = user[k]; });
    Object.keys(wanted).forEach(a => {
      if (!have[a]) msgs.push(`حساب ${nm(a)} در سند نیست.`);
      else {
        ["d", "c"].forEach(s => {
          if (wanted[a][s] && !have[a][s]) msgs.push(`سمت حساب ${nm(a)} اشتباه است؛ از خودت بپرس این رویداد آن را زیاد می‌کند یا کم؟`);
          else if (wanted[a][s] && have[a][s] !== wanted[a][s]) msgs.push(`مبلغ حساب ${nm(a)} درست نیست.`);
        });
      }
    });
    Object.keys(have).forEach(a => { if (!wanted[a]) msgs.push(`حساب ${nm(a)} در این رویداد نقشی ندارد.`); });
    if (!msgs.length) msgs.push("سند هنوز درست نیست؛ حساب‌ها، سمت‌ها و مبلغ‌ها را دوباره بررسی کن.");
    res.messages = msgs.slice(0, 4);
    return res;
  }

  /* دفتر کل و تراز از روی اسناد ثبت‌شده: entries = [{rows:[{acc,d,c}], ...}] */
  function buildLedger(entries, accounts) {
    const L = {};
    entries.forEach((e, idx) => {
      e.rows.forEach(r => {
        const a = L[r.acc] = L[r.acc] || { acc: r.acc, lines: [], d: 0, c: 0 };
        a.lines.push({ no: idx + 1, d: r.d || 0, c: r.c || 0 });
        a.d = r3(a.d + (r.d || 0)); a.c = r3(a.c + (r.c || 0));
      });
    });
    const list = Object.values(L).map(a => {
      const bal = r3(a.d - a.c);
      return { ...a, balD: bal > 0 ? bal : 0, balC: bal < 0 ? -bal : 0 };
    });
    list.sort((x, y) => Object.keys(accounts).indexOf(x.acc) - Object.keys(accounts).indexOf(y.acc));
    const td = r3(list.reduce((s, a) => s + a.balD, 0)), tc = r3(list.reduce((s, a) => s + a.balC, 0));
    return { list, totalD: td, totalC: tc, balanced: td === tc };
  }

  const api = { parseAmount, fmt, fa, cleanRows, totals, gradeJournal, buildLedger, normDigits };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
