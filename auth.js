/* حساب‌های محلی: نام کاربری (۵ حرف انگلیسی + ۳ عدد) و رمز، روی همین دستگاه.
   رمز هرگز ذخیره نمی‌شود؛ فقط خلاصه‌ی PBKDF2 آن. اطلاعات بین دستگاه‌ها هم‌گام نمی‌شود. */
(function (root) {
  const USERS = "tz:users", SESSION = "tz:session", DATA = "tz:data:", GUEST = "__guest";
  const RE = /^[a-z]{5}[0-9]{3}$/;
  const ITER = 120000;

  function create(storage) {
    const ls = {
      get: k => { try { return storage.getItem(k); } catch (e) { return null; } },
      set: (k, v) => { try { storage.setItem(k, v); return true; } catch (e) { return false; } },
      del: k => { try { storage.removeItem(k); } catch (e) {} }
    };
    const subtle = (root.crypto && root.crypto.subtle) || null;
    const enc = new TextEncoder();
    const b64 = buf => { let s = ""; new Uint8Array(buf).forEach(b => s += String.fromCharCode(b)); return btoa(s); };
    const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const users = () => { try { return JSON.parse(ls.get(USERS) || "{}"); } catch (e) { return {}; } };
    const saveUsers = u => ls.set(USERS, JSON.stringify(u));

    async function hash(pw, salt) {
      const key = await subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
      return b64(await subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, key, 256));
    }
    function validUsername(u) { return RE.test(u); }
    function generateUsername() {
      const C = "bcdfghjklmnprstvz", V = "aeiou";
      const pick = s => s[Math.floor(Math.random() * s.length)];
      for (let tries = 0; tries < 200; tries++) {
        const u = pick(C) + pick(V) + pick(C) + pick(V) + pick(C) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        if (!users()[u]) return u;
      }
      return "tarax000";
    }
    let fails = 0, lockUntil = 0;

    async function createUser(username, pw, initialData) {
      username = String(username || "").trim().toLowerCase();
      if (!subtle) return { ok: false, error: "nocrypto" };
      if (!validUsername(username)) return { ok: false, error: "bad_username" };
      if (String(pw).length < 6) return { ok: false, error: "short_pw" };
      if (pw.toLowerCase() === username) return { ok: false, error: "same" };
      const u = users();
      if (u[username]) return { ok: false, error: "exists" };
      const salt = crypto.getRandomValues(new Uint8Array(16));
      u[username] = { s: b64(salt), h: await hash(pw, salt), t: Date.now() };
      if (!saveUsers(u)) return { ok: false, error: "storage" };
      if (initialData) ls.set(DATA + username, JSON.stringify(initialData));
      ls.set(SESSION, username);
      return { ok: true };
    }
    async function login(username, pw) {
      username = String(username || "").trim().toLowerCase();
      if (!subtle) return { ok: false, error: "nocrypto" };
      if (Date.now() < lockUntil) return { ok: false, error: "locked" };
      const rec = users()[username];
      let ok = false;
      if (rec) ok = (await hash(pw, unb64(rec.s))) === rec.h;
      else await hash(pw, new Uint8Array(16)); // زمان پاسخ برابر
      if (!ok) { fails++; if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; } return { ok: false, error: "login_fail" }; }
      fails = 0; ls.set(SESSION, username); return { ok: true };
    }
    async function changePassword(username, oldPw, newPw) {
      const u = users(), rec = u[username];
      if (!rec) return { ok: false, error: "login_fail" };
      if ((await hash(oldPw, unb64(rec.s))) !== rec.h) return { ok: false, error: "login_fail" };
      if (String(newPw).length < 6) return { ok: false, error: "short_pw" };
      if (newPw.toLowerCase() === username) return { ok: false, error: "same" };
      const salt = crypto.getRandomValues(new Uint8Array(16));
      u[username] = Object.assign({}, rec, { s: b64(salt), h: await hash(newPw, salt) });
      saveUsers(u); return { ok: true };
    }
    async function deleteUser(username, pw) {
      const u = users(), rec = u[username];
      if (!rec || (await hash(pw, unb64(rec.s))) !== rec.h) return { ok: false, error: "login_fail" };
      delete u[username]; saveUsers(u); ls.del(DATA + username); ls.del(SESSION); return { ok: true };
    }
    return {
      GUEST, validUsername, generateUsername, createUser, login, changePassword, deleteUser,
      exists: u => !!users()[u],
      getSession: () => { const s = ls.get(SESSION); return s === GUEST || (s && users()[s]) ? s : null; },
      setSession: s => ls.set(SESSION, s), clearSession: () => ls.del(SESSION),
      loadData: u => { try { return JSON.parse(ls.get(DATA + u) || "null"); } catch (e) { return null; } },
      saveData: (u, d) => ls.set(DATA + u, JSON.stringify(d)),
      hasData: u => ls.get(DATA + u) !== null,
      storageOK: () => { try { storage.setItem("__t", "1"); storage.removeItem("__t"); return true; } catch (e) { return false; } }
    };
  }
  const api = { create, RE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Auth = api;
})(typeof window !== "undefined" ? window : globalThis);
