/*
 * LANDORA — camada de dados das propostas (modelos)
 * ---------------------------------------------------------------
 * Dois modos:
 *  - "firebase": Firestore + login Google (quando firebase-config.js está preenchido)
 *  - "local":    localStorage do navegador (modo demonstração, só para testar)
 *
 * Estrutura no Firestore:
 *  modelos/{slug}                  -> dados gerais (título, cliente, validade, termos...)
 *  modelos/{slug}/modulos/{id}     -> um documento por módulo (com imagens em base64)
 */
(function () {
  "use strict";
  const V = "10.14.1";
  const cfg = window.FIREBASE_CONFIG;
  const isFb = !!(cfg && cfg.projectId);
  const LK = "landora-store:";

  const sortMods = (a) => a.sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0));

  /* ---------------- Local (demo) ---------------- */
  const local = {
    mode: "local",
    _r(k, d) { try { return JSON.parse(localStorage.getItem(LK + k) || "null") ?? d; } catch (e) { return d; } },
    _w(k, v) { localStorage.setItem(LK + k, JSON.stringify(v)); },
    async getModelo(slug) {
      const m = this._r("m:" + slug, null);
      return m;
    },
    async listModelos() {
      return this._r("index", []).map((s) => this._r("m:" + s, null)).filter(Boolean)
        .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
    },
    async saveModelo(slug, dados, modulos) {
      const idx = this._r("index", []);
      if (!idx.includes(slug)) idx.push(slug);
      this._w("index", idx);
      this._w("m:" + slug, { ...dados, slug, modulos: modulos.map((m, i) => ({ ...m, ordem: i })), atualizadoEm: Date.now() });
    },
    async deleteModelo(slug) {
      this._w("index", this._r("index", []).filter((s) => s !== slug));
      localStorage.removeItem(LK + "m:" + slug);
    },
    async addProposta(d) {
      const l = this._r("contratos", []);
      l.unshift({ ...d, id: "c" + Date.now(), criadoEm: Date.now() });
      this._w("contratos", l);
    },
    async listPropostas() { return this._r("contratos", []); },
    async deleteProposta(id) { this._w("contratos", this._r("contratos", []).filter((c) => c.id !== id)); },
    onAuth(cb) { setTimeout(() => cb({ email: "demo@local", demo: true }), 0); },
    async signIn() {},
    async signOut() {},
  };

  /* ---------------- Firebase ---------------- */
  let _fb;
  async function fb() {
    if (_fb) return _fb;
    _fb = (async () => {
      const [{ initializeApp }, fs, au] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      ]);
      const app = initializeApp(cfg);
      return { fs, au, db: fs.getFirestore(app), auth: au.getAuth(app) };
    })();
    return _fb;
  }

  const remote = {
    mode: "firebase",
    async getModelo(slug) {
      const { fs, db } = await fb();
      const snap = await fs.getDoc(fs.doc(db, "modelos", slug));
      if (!snap.exists()) return null;
      const ms = await fs.getDocs(fs.collection(db, "modelos", slug, "modulos"));
      const modulos = sortMods(ms.docs.map((d) => ({ id: d.id, ...d.data() })));
      return { ...snap.data(), slug, modulos };
    },
    async listModelos() {
      const { fs, db } = await fb();
      const snap = await fs.getDocs(fs.collection(db, "modelos"));
      const out = [];
      for (const d of snap.docs) {
        const ms = await fs.getDocs(fs.collection(db, "modelos", d.id, "modulos"));
        out.push({ ...d.data(), slug: d.id, modulos: sortMods(ms.docs.map((x) => ({ id: x.id, ...x.data() }))) });
      }
      return out.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
    },
    async saveModelo(slug, dados, modulos) {
      const { fs, db } = await fb();
      const antigos = await fs.getDocs(fs.collection(db, "modelos", slug, "modulos"));
      const novos = new Set(modulos.map((m) => m.id));
      // um módulo por vez: cada documento carrega suas imagens (limite de 1 MiB por documento)
      for (const [i, m] of modulos.entries()) {
        const { id, ...resto } = m;
        await fs.setDoc(fs.doc(db, "modelos", slug, "modulos", id), { ...resto, ordem: i });
      }
      for (const d of antigos.docs) if (!novos.has(d.id)) await fs.deleteDoc(d.ref);
      await fs.setDoc(fs.doc(db, "modelos", slug), { ...dados, atualizadoEm: Date.now() });
    },
    async deleteModelo(slug) {
      const { fs, db } = await fb();
      const ms = await fs.getDocs(fs.collection(db, "modelos", slug, "modulos"));
      for (const d of ms.docs) await fs.deleteDoc(d.ref);
      await fs.deleteDoc(fs.doc(db, "modelos", slug));
    },
    async addProposta(d) {
      const { fs, db } = await fb();
      await fs.addDoc(fs.collection(db, "propostas"), { ...d, criadoEm: fs.serverTimestamp() });
    },
    async listPropostas() {
      const { fs, db } = await fb();
      const snap = await fs.getDocs(fs.collection(db, "propostas"));
      return snap.docs.map((x) => { const v = x.data(); return { ...v, id: x.id, criadoEm: v.criadoEm && v.criadoEm.toMillis ? v.criadoEm.toMillis() : 0 }; })
        .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    },
    async deleteProposta(id) {
      const { fs, db } = await fb();
      await fs.deleteDoc(fs.doc(db, "propostas", id));
    },
    async onAuth(cb) {
      const { au, auth } = await fb();
      au.onAuthStateChanged(auth, (u) => cb(u ? { email: u.email, nome: u.displayName } : null));
    },
    async signIn() {
      const { au, auth } = await fb();
      await au.signInWithPopup(auth, new au.GoogleAuthProvider());
    },
    async signOut() {
      const { au, auth } = await fb();
      await au.signOut(auth);
    },
  };

  window.Store = isFb ? remote : local;
})();
