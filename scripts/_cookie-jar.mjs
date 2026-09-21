/** Minimal cookie jar for Node fetch smoke tests. */
export class CookieJar {
  constructor() {
    /** @type {Map<string, string>} */
    this.map = new Map();
  }

  store(_base, setCookieHeader) {
    const parts = String(setCookieHeader).split(/,(?=\s*[^;]+=[^;]+)/);
    for (const part of parts.length ? parts : [setCookieHeader]) {
      const nv = String(part).split(";")[0]?.trim();
      if (!nv || !nv.includes("=")) continue;
      const eq = nv.indexOf("=");
      const name = nv.slice(0, eq);
      const value = nv.slice(eq + 1);
      if (value === "" || /Max-Age=0/i.test(part) || /Expires=.*1970/i.test(part)) {
        this.map.delete(name);
      } else {
        this.map.set(name, value);
      }
    }
  }

  headerFor(_base) {
    if (!this.map.size) return "";
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}
