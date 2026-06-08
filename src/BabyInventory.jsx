/**
 * BABY INVENTORY APP
 * ==================
 * App completa de gestión de inventario para bebé.
 * 
 * PARA CONECTAR FIREBASE:
 * 1. Crea un proyecto en https://console.firebase.google.com
 * 2. Activa Authentication > Google Sign-In
 * 3. Activa Firestore Database
 * 4. Activa Storage
 * 5. Reemplaza firebaseConfig con tus credenciales reales
 * 6. En Firestore Rules, permite solo usuarios autorizados
 * 
 * Por ahora la app funciona con estado local (localStorage).
 * Para activar Firebase, descomenta las secciones marcadas con [FIREBASE].
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─────────────────────────────────────────────
// CONFIGURACIÓN FIREBASE [FIREBASE - DESCOMENTA]
// ─────────────────────────────────────────────
/*
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
*/

// ─────────────────────────────────────────────
// CORREOS AUTORIZADOS
// ─────────────────────────────────────────────
const ALLOWED_EMAILS = [
  "madre@example.com",
  "padre@example.com",
  "administrador@example.com",
  // Añade aquí los correos reales de tu familia
];

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
const genId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtDateShort = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ─────────────────────────────────────────────
// LOCALSTORAGE (sustituye Firestore en demo)
// ─────────────────────────────────────────────
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const INITIAL_CATEGORIES = [
  { id: "cat_paniales", name: "Pañales", emoji: "👶", color: "#4F6AF5" },
  { id: "cat_toallitas", name: "Toallitas húmedas", emoji: "🧴", color: "#06B6D4" },
];

// ─────────────────────────────────────────────
// CONTEXTOS
// ─────────────────────────────────────────────
const AuthCtx = createContext(null);
const AppCtx = createContext(null);

// ─────────────────────────────────────────────
// ICONOS SVG INLINE
// ─────────────────────────────────────────────
const Icon = ({ name, size = 20, className = "" }) => {
  const paths = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    plus: "M12 4v16m8-8H4",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    restore: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    minus: "M20 12H4",
    photo: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    chevdown: "M19 9l-7 7-7-7",
    chevup: "M5 15l7-7 7 7",
    chevright: "M9 5l7 7-7 7",
    google: null,
    baby: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
  };
  if (name === "google") return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name] && <path d={paths[name]} />}
    </svg>
  );
};

// ─────────────────────────────────────────────
// PROVEEDOR DE AUTENTICACIÓN
// ─────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Demo: restaurar sesión de localStorage
    const saved = LS.get("demo_user", null);
    setUser(saved);
    setLoading(false);

    // [FIREBASE] Reemplaza el bloque de arriba con:
    /*
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && ALLOWED_EMAILS.includes(firebaseUser.email)) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName, photo: firebaseUser.photoURL });
      } else if (firebaseUser) {
        signOut(auth);
        setAuthError("Tu correo no está autorizado para acceder.");
        setUser(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
    */
  }, []);

  const loginDemo = (email) => {
    if (!ALLOWED_EMAILS.includes(email)) {
      setAuthError("Tu correo no está autorizado para acceder.");
      return;
    }
    const u = { uid: genId(), email, name: email.split("@")[0], photo: null };
    LS.set("demo_user", u);
    setUser(u);
    setAuthError(null);
  };

  const loginGoogle = async () => {
    setAuthError(null);
    // [FIREBASE] Descomenta para usar Google real:
    /*
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setAuthError("Error al iniciar sesión con Google.");
    }
    */
    // Demo: simula login Google con primer correo permitido
    loginDemo(ALLOWED_EMAILS[0]);
  };

  const logout = () => {
    LS.set("demo_user", null);
    setUser(null);
    // [FIREBASE]: signOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, authError, loginGoogle, loginDemo, logout, setAuthError }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ─────────────────────────────────────────────
// PROVEEDOR DE DATOS DE LA APP
// ─────────────────────────────────────────────
function AppProvider({ children }) {
  const { user } = useContext(AuthCtx);
  const [categories, setCategories] = useState(() => LS.get("categories", INITIAL_CATEGORIES));
  const [products, setProducts] = useState(() => LS.get("products", []));
  const [movements, setMovements] = useState(() => LS.get("movements", []));

  // Persistir en localStorage
  useEffect(() => { LS.set("categories", categories); }, [categories]);
  useEffect(() => { LS.set("products", products); }, [products]);
  useEffect(() => { LS.set("movements", movements); }, [movements]);

  const addMovement = useCallback((action, productId, details = {}) => {
    const mv = { id: genId(), timestamp: now(), userId: user?.uid, userName: user?.name || "Usuario", action, productId, ...details };
    setMovements(prev => [mv, ...prev].slice(0, 500));
  }, [user]);

  // CATEGORÍAS
  const addCategory = (name, emoji = "📦", color = "#4F6AF5") => {
    const cat = { id: genId(), name, emoji, color };
    setCategories(prev => [...prev, cat]);
  };
  const updateCategory = (id, data) => setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteCategory = (id) => {
    const inUse = products.some(p => p.categoryId === id && p.status === "ACTIVE");
    if (inUse) return { error: "Hay productos activos en esta categoría." };
    setCategories(prev => prev.filter(c => c.id !== id));
    return { ok: true };
  };

  // PRODUCTOS
  const addProduct = (data) => {
    const total = (data.qtyPerPack || 0) * (data.numPacks || 0);
    const p = { id: genId(), ...data, stock: total, status: "ACTIVE", createdAt: now(), updatedAt: now() };
    setProducts(prev => [...prev, p]);
    addMovement("CREATED", p.id, { description: `${data.brand} ${data.line}`, delta: total });
    return p;
  };
  const updateProduct = (id, data) => {
    const total = (data.qtyPerPack || 0) * (data.numPacks || 0);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data, stock: total, updatedAt: now() } : p));
    addMovement("UPDATED", id, { description: `${data.brand} ${data.line}` });
  };
  const consumeProduct = (id, qty) => {
    let ok = false;
    setProducts(prev => prev.map(p => {
      if (p.id === id && p.stock >= qty) {
        ok = true;
        const newStock = p.stock - qty;
        addMovement("CONSUMED", id, { description: `${p.brand} ${p.line}`, delta: -qty, stockAfter: newStock });
        return { ...p, stock: newStock, updatedAt: now() };
      }
      return p;
    }));
    return ok;
  };
  const softDeleteProduct = (id) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: "DELETED", deletedAt: now(), deletedBy: user?.name } : p));
    const p = products.find(x => x.id === id);
    addMovement("DELETED", id, { description: p ? `${p.brand} ${p.line}` : id });
  };
  const restoreProduct = (id) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: "ACTIVE", deletedAt: null, deletedBy: null } : p));
    const p = products.find(x => x.id === id);
    addMovement("RESTORED", id, { description: p ? `${p.brand} ${p.line}` : id });
  };

  const activeProducts = products.filter(p => p.status === "ACTIVE");
  const deletedProducts = products.filter(p => p.status === "DELETED");
  const lowStockProducts = activeProducts.filter(p => p.stock < 20);

  return (
    <AppCtx.Provider value={{
      categories, addCategory, updateCategory, deleteCategory,
      products: activeProducts, deletedProducts, lowStockProducts, allProducts: products,
      addProduct, updateProduct, consumeProduct, softDeleteProduct, restoreProduct,
      movements
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ─────────────────────────────────────────────
// PANTALLA DE LOGIN
// ─────────────────────────────────────────────
function LoginScreen() {
  const { loginGoogle, loginDemo, authError, setAuthError } = useContext(AuthCtx);
  const [demoEmail, setDemoEmail] = useState(ALLOWED_EMAILS[0]);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: "1rem" }}>
            👶
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: 0 }}>BabyStock</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 6, fontSize: 15 }}>Inventario familiar del bebé</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
          <h2 style={{ margin: "0 0 1.5rem", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Bienvenidos</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Esta app es privada. Solo los miembros de la familia autorizados pueden acceder.
          </p>

          {authError && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: "1rem", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Icon name="warning" size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#dc2626", fontSize: 14, fontWeight: 500, margin: 0 }}>{authError}</p>
                <button onClick={() => setAuthError(null)} style={{ color: "#ef4444", fontSize: 12, marginTop: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Cerrar</button>
              </div>
            </div>
          )}

          <button
            onClick={loginGoogle}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 500, color: "#1a1a2e", transition: "all 0.2s", marginBottom: "1rem" }}
            onMouseOver={e => e.currentTarget.style.background = "#f8fafc"}
            onMouseOut={e => e.currentTarget.style.background = "#fff"}
          >
            <Icon name="google" size={20} />
            Continuar con Google
          </button>

          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <button onClick={() => setShowDemo(!showDemo)} style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
              Demo sin Firebase →
            </button>
          </div>

          {showDemo && (
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem" }}>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Selecciona un usuario demo:</p>
              <select value={demoEmail} onChange={e => setDemoEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 8, fontSize: 14 }}>
                {ALLOWED_EMAILS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button
                onClick={() => loginDemo(demoEmail)}
                style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#4F6AF5", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                Entrar en modo demo
              </button>
            </div>
          )}

          <p style={{ fontSize: 11, color: "#cbd5e1", textAlign: "center", marginTop: "1rem", lineHeight: 1.5 }}>
            Acceso restringido. Si no tienes permiso, contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NAVBAR INFERIOR
// ─────────────────────────────────────────────
function BottomNav({ currentPage, setPage }) {
  const tabs = [
    { id: "dashboard", icon: "home", label: "Inicio" },
    { id: "inventory", icon: "box", label: "Inventario" },
    { id: "categories", icon: "tag", label: "Categorías" },
    { id: "history", icon: "clock", label: "Historial" },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 8px", border: "none", background: "none", cursor: "pointer", color: currentPage === t.id ? "#4F6AF5" : "#94a3b8", gap: 3 }}>
          <Icon name={t.icon} size={22} />
          <span style={{ fontSize: 10, fontWeight: currentPage === t.id ? 600 : 400 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────
function Header({ title, action, onBack }) {
  const { user, logout } = useContext(AuthCtx);
  const [showMenu, setShowMenu] = useState(false);
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", height: 56, gap: 10 }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevright" size={18} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{title}</h1>
        {action}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {user?.photo
              ? <img src={user.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : <span style={{ fontSize: 14, fontWeight: 600, color: "#4F6AF5" }}>{(user?.name || "U")[0].toUpperCase()}</span>
            }
          </button>
          {showMenu && (
            <div style={{ position: "absolute", top: 42, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px", minWidth: 160, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", zIndex: 200 }}>
              <p style={{ fontSize: 12, color: "#94a3b8", padding: "4px 8px", margin: 0 }}>{user?.email}</p>
              <button onClick={() => { logout(); setShowMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 8px", borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}>
                <Icon name="logout" size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// BADGE DE STOCK
// ─────────────────────────────────────────────
function StockBadge({ stock }) {
  const low = stock < 20;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: low ? "#fee2e2" : "#dcfce7", color: low ? "#dc2626" : "#16a34a" }}>
      {low && <Icon name="warning" size={12} />}
      {stock} uds
    </span>
  );
}

// ─────────────────────────────────────────────
// MODAL BASE
// ─────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "90dvh", overflow: "auto", paddingBottom: "env(safe-area-inset-bottom, 1rem)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1rem 0" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#1a1a2e" }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "1rem" }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORMULARIO DE PRODUCTO
// ─────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel }) {
  const { categories } = useContext(AppCtx);
  const empty = { categoryId: categories[0]?.id || "", brand: "", line: "", size: "", qtyPerPack: "", numPacks: "", imageUrl: "", notes: "" };
  const [form, setForm] = useState(initial ? { ...initial } : empty);
  const [errors, setErrors] = useState({});
  const total = (Number(form.qtyPerPack) || 0) * (Number(form.numPacks) || 0);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.categoryId) e.categoryId = "Selecciona una categoría";
    if (!form.brand.trim()) e.brand = "Requerido";
    if (!form.line.trim()) e.line = "Requerido";
    if (!form.qtyPerPack || form.qtyPerPack <= 0) e.qtyPerPack = "Debe ser mayor a 0";
    if (!form.numPacks || form.numPacks <= 0) e.numPacks = "Debe ser mayor a 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSave({ ...form, qtyPerPack: Number(form.qtyPerPack), numPacks: Number(form.numPacks) }); };

  const Field = ({ label, k, placeholder, type = "text", required }) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
        {label}{required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type} value={form[k]} placeholder={placeholder}
        onChange={e => set(k, e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${errors[k] ? "#fca5a5" : "#e2e8f0"}`, fontSize: 15, boxSizing: "border-box", outline: "none", background: errors[k] ? "#fff5f5" : "#fff" }}
      />
      {errors[k] && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors[k]}</p>}
    </div>
  );

  return (
    <div>
      {/* Categoría */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Categoría <span style={{ color: "#ef4444" }}>*</span></label>
        <select value={form.categoryId} onChange={e => set("categoryId", e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${errors.categoryId ? "#fca5a5" : "#e2e8f0"}`, fontSize: 15, background: "#fff", boxSizing: "border-box" }}>
          <option value="">-- Selecciona --</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        {errors.categoryId && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.categoryId}</p>}
      </div>

      <Field label="Marca" k="brand" placeholder="Ej: Huggies" required />
      <Field label="Línea / Edición" k="line" placeholder="Ej: Supreme Care" required />
      <Field label="Talla (opcional)" k="size" placeholder="Ej: RN, S, M, L" />

      {/* Cantidades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Unid. por paquete <span style={{ color: "#ef4444" }}>*</span></label>
          <input type="number" min="1" value={form.qtyPerPack} onChange={e => set("qtyPerPack", e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${errors.qtyPerPack ? "#fca5a5" : "#e2e8f0"}`, fontSize: 15, boxSizing: "border-box" }} />
          {errors.qtyPerPack && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.qtyPerPack}</p>}
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>N.º de paquetes <span style={{ color: "#ef4444" }}>*</span></label>
          <input type="number" min="1" value={form.numPacks} onChange={e => set("numPacks", e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${errors.numPacks ? "#fca5a5" : "#e2e8f0"}`, fontSize: 15, boxSizing: "border-box" }} />
          {errors.numPacks && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.numPacks}</p>}
        </div>
      </div>

      {/* Total calculado */}
      {total > 0 && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "10px 14px", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#166534" }}>Total calculado</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>{total} unidades</span>
        </div>
      )}

      <Field label="URL de imagen (opcional)" k="imageUrl" placeholder="https://..." />

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Comentarios</label>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Notas adicionales..."
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, resize: "vertical", boxSizing: "border-box" }} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 15, cursor: "pointer", color: "#374151" }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} style={{ flex: 2, padding: "14px", borderRadius: 12, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          {initial ? "Guardar cambios" : "Registrar producto"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TARJETA DE PRODUCTO
// ─────────────────────────────────────────────
function ProductCard({ product, onConsume, onEdit, onDelete, onView }) {
  const { categories } = useContext(AppCtx);
  const cat = categories.find(c => c.id === product.categoryId);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Imagen */}
      <div style={{ height: 120, background: cat ? `${cat.color}18` : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 40 }}>{cat?.emoji || "📦"}</span>
        }
        {product.stock < 20 && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#fef2f2", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="warning" size={12} style={{ color: "#dc2626" }} />
            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Stock bajo</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 2px" }}>{cat?.name}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{product.brand}</p>
            <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{product.line}{product.size ? ` · ${product.size}` : ""}</p>
          </div>
          <StockBadge stock={product.stock} />
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => onConsume(product)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "#4F6AF520", border: "none", color: "#4F6AF5", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Consumir
          </button>
          <button onClick={() => onEdit(product)} style={{ width: 38, height: 38, borderRadius: 10, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="edit" size={16} style={{ color: "#64748b" }} />
          </button>
          <button onClick={() => onDelete(product)} style={{ width: 38, height: 38, borderRadius: 10, background: "#fef2f2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="trash" size={16} style={{ color: "#ef4444" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL DE CONSUMO
// ─────────────────────────────────────────────
function ConsumeModal({ product, open, onClose }) {
  const { consumeProduct } = useContext(AppCtx);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setQty(1); setDone(false); } }, [open]);

  const handle = () => {
    if (qty > 0 && qty <= product?.stock) {
      consumeProduct(product.id, qty);
      setDone(true);
    }
  };

  if (!product) return null;
  return (
    <Modal open={open} onClose={onClose} title="Registrar consumo">
      {done ? (
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Icon name="check" size={28} style={{ color: "#16a34a" }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", margin: "0 0 4px" }}>¡Consumo registrado!</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>Quedan <strong>{product.stock - qty}</strong> unidades de {product.brand} {product.line}.</p>
          <button onClick={onClose} style={{ marginTop: "1rem", width: "100%", padding: "14px", borderRadius: 12, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Listo</button>
        </div>
      ) : (
        <>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>{product.brand} {product.line}{product.size ? ` · ${product.size}` : ""}</p>
            <p style={{ fontSize: 15, color: "#1a1a2e", margin: 0 }}>Stock actual: <strong>{product.stock} unidades</strong></p>
          </div>

          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>Cantidad a consumir</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 12, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="minus" size={20} />
            </button>
            <input type="number" min="1" max={product.stock} value={qty} onChange={e => setQty(Math.min(product.stock, Math.max(1, Number(e.target.value))))}
              style={{ flex: 1, textAlign: "center", padding: "12px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 22, fontWeight: 700 }} />
            <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} style={{ width: 44, height: 44, borderRadius: 12, background: "#4F6AF5", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={20} style={{ color: "#fff" }} />
            </button>
          </div>

          {product.stock - qty >= 0 && (
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 14px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#3b82f6" }}>Quedarán</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1d4ed8" }}>{product.stock - qty} unidades</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 15, cursor: "pointer" }}>Cancelar</button>
            <button onClick={handle} disabled={qty > product.stock}
              style={{ flex: 2, padding: "14px", borderRadius: 12, background: qty > product.stock ? "#e2e8f0" : "#4F6AF5", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: qty > product.stock ? "not-allowed" : "pointer" }}>
              Registrar consumo
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────
// MODAL DE CONFIRMACIÓN DE BORRADO
// ─────────────────────────────────────────────
function DeleteModal({ product, open, onClose }) {
  const { softDeleteProduct } = useContext(AppCtx);
  const [step, setStep] = useState(1);

  useEffect(() => { if (open) setStep(1); }, [open]);

  const handleDelete = () => {
    if (product.stock > 0 && step === 1) { setStep(2); return; }
    softDeleteProduct(product.id);
    onClose();
  };

  if (!product) return null;
  return (
    <Modal open={open} onClose={onClose} title="Eliminar producto">
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
          <Icon name="trash" size={28} style={{ color: "#ef4444" }} />
        </div>
        <p style={{ fontWeight: 600, fontSize: 16, color: "#1a1a2e", margin: "0 0 8px" }}>
          {step === 1 ? "¿Eliminar este producto?" : "⚠️ El producto tiene stock"}
        </p>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          {step === 1
            ? `Estás por eliminar "${product.brand} ${product.line}". Podrás restaurarlo desde la Papelera.`
            : `Este producto aún tiene ${product.stock} unidades registradas. ¿Deseas eliminarlo de todas formas?`
          }
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 15, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleDelete} style={{ flex: 1, padding: "14px", borderRadius: 12, background: "#ef4444", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            {step === 1 ? "Eliminar" : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ setPage }) {
  const { products, lowStockProducts, categories, movements } = useContext(AppCtx);
  const { user } = useContext(AuthCtx);
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);

  const getHour = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const actionLabel = { CREATED: "agregó", CONSUMED: "registró consumo", DELETED: "eliminó", RESTORED: "restauró", UPDATED: "editó" };

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="BabyStock 👶" action={
        <button onClick={() => setPage("add")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="plus" size={16} style={{ color: "#fff" }} /> Agregar
        </button>
      } />
      <div style={{ padding: "1rem" }}>
        {/* Saludo */}
        <p style={{ fontSize: 15, color: "#64748b", marginBottom: "1rem" }}>
          {getHour()}, <strong style={{ color: "#1a1a2e" }}>{user?.name}</strong> 👋
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { label: "Productos", value: products.length, color: "#4F6AF5", bg: "#eff3ff" },
            { label: "Total unidades", value: totalUnits, color: "#059669", bg: "#f0fdf4" },
            { label: "Categorías", value: categories.length, color: "#d97706", bg: "#fffbeb" },
            { label: "Stock bajo", value: lowStockProducts.length, color: "#dc2626", bg: "#fef2f2" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px" }}>
              <p style={{ fontSize: 12, color: s.color, margin: "0 0 4px", fontWeight: 500, opacity: 0.8 }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Alertas stock bajo */}
        {lowStockProducts.length > 0 && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: "14px", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Icon name="warning" size={18} style={{ color: "#f97316" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#c2410c" }}>Alertas de stock bajo</span>
            </div>
            {lowStockProducts.slice(0, 3).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fed7aa" }}>
                <span style={{ fontSize: 13, color: "#78350f" }}>{p.brand} {p.line}</span>
                <StockBadge stock={p.stock} />
              </div>
            ))}
            {lowStockProducts.length > 3 && (
              <button onClick={() => setPage("inventory")} style={{ fontSize: 13, color: "#f97316", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
                Ver todos ({lowStockProducts.length}) →
              </button>
            )}
          </div>
        )}

        {/* Últimos movimientos */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>Últimos movimientos</h2>
            <button onClick={() => setPage("history")} style={{ fontSize: 13, color: "#4F6AF5", background: "none", border: "none", cursor: "pointer" }}>Ver todos</button>
          </div>
          {movements.slice(0, 5).map(m => (
            <div key={m.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: m.action === "CONSUMED" ? "#fef2f2" : m.action === "DELETED" ? "#fef2f2" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={m.action === "CONSUMED" ? "minus" : m.action === "DELETED" ? "trash" : m.action === "RESTORED" ? "restore" : "plus"} size={16}
                  style={{ color: m.action === "CONSUMED" || m.action === "DELETED" ? "#ef4444" : "#16a34a" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "#1a1a2e", margin: "0 0 2px" }}>
                  <strong>{m.userName}</strong> {actionLabel[m.action] || m.action} <em>{m.description}</em>
                  {m.delta && <strong style={{ color: m.delta > 0 ? "#16a34a" : "#ef4444" }}> {m.delta > 0 ? "+" : ""}{m.delta} uds</strong>}
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{fmtDate(m.timestamp)}</p>
              </div>
            </div>
          ))}
          {movements.length === 0 && <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>Aún no hay movimientos</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: INVENTARIO
// ─────────────────────────────────────────────
function Inventory({ setPage }) {
  const { products, categories } = useContext(AppCtx);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterLow, setFilterLow] = useState(false);
  const [consumeProduct, setConsumeProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const { addProduct, updateProduct } = useContext(AppCtx);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.brand.toLowerCase().includes(q) || p.line.toLowerCase().includes(q) || (p.size || "").toLowerCase().includes(q);
    const matchCat = filterCat === "all" || p.categoryId === filterCat;
    const matchLow = !filterLow || p.stock < 20;
    return matchSearch && matchCat && matchLow;
  });

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Inventario" action={
        <button onClick={() => setPage("add")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="plus" size={16} style={{ color: "#fff" }} /> Nuevo
        </button>
      } />

      <div style={{ padding: "1rem" }}>
        {/* Búsqueda */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <Icon name="search" size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por marca, línea, talla..."
            style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 15, boxSizing: "border-box" }} />
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: "1rem" }}>
          <button onClick={() => setFilterCat("all")}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filterCat === "all" ? "#4F6AF5" : "#e2e8f0"}`, background: filterCat === "all" ? "#4F6AF5" : "#fff", color: filterCat === "all" ? "#fff" : "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Todas
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? "all" : c.id)}
              style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filterCat === c.id ? "#4F6AF5" : "#e2e8f0"}`, background: filterCat === c.id ? "#4F6AF5" : "#fff", color: filterCat === c.id ? "#fff" : "#374151", fontSize: 13, cursor: "pointer" }}>
              {c.emoji} {c.name}
            </button>
          ))}
          <button onClick={() => setFilterLow(!filterLow)}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filterLow ? "#ef4444" : "#e2e8f0"}`, background: filterLow ? "#fef2f2" : "#fff", color: filterLow ? "#ef4444" : "#374151", fontSize: 13, cursor: "pointer" }}>
            ⚠️ Stock bajo
          </button>
        </div>

        {/* Contador */}
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: "0.75rem" }}>{filtered.length} producto{filtered.length !== 1 ? "s" : ""}</p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p}
                onConsume={setConsumeProduct}
                onEdit={setEditProduct}
                onDelete={setDeleteProduct}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ fontSize: 40, marginBottom: "0.5rem" }}>📦</p>
            <p style={{ fontSize: 15, color: "#94a3b8" }}>{search ? "No se encontraron productos" : "No hay productos aún"}</p>
          </div>
        )}
      </div>

      <ConsumeModal product={consumeProduct} open={!!consumeProduct} onClose={() => setConsumeProduct(null)} />
      <DeleteModal product={deleteProduct} open={!!deleteProduct} onClose={() => setDeleteProduct(null)} />
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Editar producto">
        {editProduct && (
          <ProductForm initial={editProduct} onSave={data => { updateProduct(editProduct.id, data); setEditProduct(null); }} onCancel={() => setEditProduct(null)} />
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: AGREGAR PRODUCTO
// ─────────────────────────────────────────────
function AddProduct({ setPage }) {
  const { addProduct } = useContext(AppCtx);
  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Nuevo producto" onBack={() => setPage("inventory")} />
      <div style={{ padding: "1rem" }}>
        <ProductForm
          onSave={data => { addProduct(data); setPage("inventory"); }}
          onCancel={() => setPage("inventory")}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: CATEGORÍAS
// ─────────────────────────────────────────────
function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useContext(AppCtx);
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [error, setError] = useState("");

  const countProducts = (id) => products.filter(p => p.categoryId === id).length;

  const handleAdd = () => {
    if (!newName.trim()) { setError("El nombre es requerido"); return; }
    addCategory(newName.trim(), newEmoji);
    setNewName(""); setNewEmoji("📦"); setShowAdd(false); setError("");
  };

  const handleDelete = (id) => {
    const result = deleteCategory(id);
    if (result?.error) setError(result.error);
  };

  const handleUpdate = () => {
    if (!editCat.name.trim()) return;
    updateCategory(editCat.id, { name: editCat.name, emoji: editCat.emoji });
    setEditCat(null);
  };

  const emojis = ["📦", "👶", "🧴", "🍼", "👗", "🧸", "🧹", "🍎", "💊", "🎒"];

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Categorías" action={
        <button onClick={() => setShowAdd(!showAdd)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="plus" size={16} style={{ color: "#fff" }} /> Nueva
        </button>
      } />
      <div style={{ padding: "1rem" }}>
        {error && <div style={{ background: "#fee2e2", borderRadius: 10, padding: "10px 14px", marginBottom: "1rem", color: "#dc2626", fontSize: 14 }}>{error} <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", float: "right" }}>×</button></div>}

        {/* Formulario nueva categoría */}
        {showAdd && (
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: "1rem", marginBottom: "1rem", border: "1.5px solid #e2e8f0" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: "0.75rem" }}>Nueva categoría</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
              {emojis.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${newEmoji === e ? "#4F6AF5" : "#e2e8f0"}`, background: newEmoji === e ? "#eff3ff" : "#fff", fontSize: 18, cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la categoría"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, marginBottom: "0.75rem", boxSizing: "border-box" }} />
            {error && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: "0.5rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowAdd(false); setError(""); }} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleAdd} style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Crear</button>
            </div>
          </div>
        )}

        {/* Lista */}
        {categories.map(cat => (
          <div key={cat.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${cat.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {cat.emoji}
            </div>
            <div style={{ flex: 1 }}>
              {editCat?.id === cat.id ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={editCat.name} onChange={e => setEditCat({ ...editCat, name: e.target.value })}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #4F6AF5", fontSize: 14 }} />
                  <button onClick={handleUpdate} style={{ padding: "6px 12px", borderRadius: 8, background: "#4F6AF5", border: "none", color: "#fff", fontSize: 13, cursor: "pointer" }}>✓</button>
                  <button onClick={() => setEditCat(null)} style={{ padding: "6px 10px", borderRadius: 8, background: "#f1f5f9", border: "none", fontSize: 13, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", margin: 0 }}>{cat.name}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{countProducts(cat.id)} producto{countProducts(cat.id) !== 1 ? "s" : ""}</p>
                </>
              )}
            </div>
            {editCat?.id !== cat.id && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setEditCat(cat)} style={{ width: 34, height: 34, borderRadius: 8, background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="edit" size={15} style={{ color: "#64748b" }} />
                </button>
                {countProducts(cat.id) === 0 && (
                  <button onClick={() => handleDelete(cat.id)} style={{ width: 34, height: 34, borderRadius: 8, background: "#fef2f2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="trash" size={15} style={{ color: "#ef4444" }} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: HISTORIAL
// ─────────────────────────────────────────────
function History() {
  const { movements } = useContext(AppCtx);

  const actionConfig = {
    CREATED: { label: "Producto agregado", color: "#16a34a", bg: "#f0fdf4", icon: "plus" },
    CONSUMED: { label: "Consumo registrado", color: "#d97706", bg: "#fffbeb", icon: "minus" },
    DELETED: { label: "Producto eliminado", color: "#dc2626", bg: "#fef2f2", icon: "trash" },
    RESTORED: { label: "Producto restaurado", color: "#7c3aed", bg: "#f5f3ff", icon: "restore" },
    UPDATED: { label: "Producto editado", color: "#0284c7", bg: "#f0f9ff", icon: "edit" },
  };

  const grouped = movements.reduce((acc, m) => {
    const day = fmtDateShort(m.timestamp);
    if (!acc[day]) acc[day] = [];
    acc[day].push(m);
    return acc;
  }, {});

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Historial" />
      <div style={{ padding: "1rem" }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ fontSize: 40 }}>📋</p>
            <p style={{ fontSize: 15, color: "#94a3b8" }}>No hay movimientos registrados</p>
          </div>
        ) : (
          Object.entries(grouped).map(([day, items]) => (
            <div key={day} style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>{day}</p>
              {items.map(m => {
                const cfg = actionConfig[m.action] || { label: m.action, color: "#64748b", bg: "#f8fafc", icon: "clock" };
                return (
                  <div key={m.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px", marginBottom: 8, display: "flex", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name={cfg.icon} size={18} style={{ color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                        {m.delta && <span style={{ fontSize: 13, fontWeight: 700, color: m.delta > 0 ? "#16a34a" : "#ef4444" }}>{m.delta > 0 ? "+" : ""}{m.delta}</span>}
                      </div>
                      <p style={{ fontSize: 14, color: "#1a1a2e", margin: "2px 0" }}>
                        <strong>{m.userName}</strong> · {m.description || ""}
                      </p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                        {new Date(m.timestamp).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PANTALLA: PAPELERA
// ─────────────────────────────────────────────
function Trash({ setPage }) {
  const { deletedProducts, restoreProduct, categories } = useContext(AppCtx);

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header title="Papelera" onBack={() => setPage("inventory")} />
      <div style={{ padding: "1rem" }}>
        {deletedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ fontSize: 40 }}>🗑️</p>
            <p style={{ fontSize: 15, color: "#94a3b8" }}>La papelera está vacía</p>
          </div>
        ) : (
          deletedProducts.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 14, padding: "14px", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {cat?.emoji || "📦"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#991b1b", margin: "0 0 2px" }}>{p.brand} {p.line}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 4px" }}>
                    {cat?.name}{p.size ? ` · ${p.size}` : ""}
                  </p>
                  {p.deletedAt && (
                    <p style={{ fontSize: 11, color: "#fca5a5", margin: 0 }}>
                      Eliminado {fmtDate(p.deletedAt)}{p.deletedBy ? ` por ${p.deletedBy}` : ""}
                    </p>
                  )}
                </div>
                <button onClick={() => restoreProduct(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                  <Icon name="restore" size={15} /> Restaurar
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROUTER PRINCIPAL
// ─────────────────────────────────────────────
function AppRouter() {
  const [page, setPage] = useState("dashboard");
  const navPages = ["dashboard", "inventory", "categories", "history"];
  const showNav = navPages.includes(page);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard setPage={setPage} />;
      case "inventory": return <Inventory setPage={setPage} />;
      case "add": return <AddProduct setPage={setPage} />;
      case "categories": return <Categories />;
      case "history": return <History />;
      case "trash": return <Trash setPage={setPage} />;
      default: return <Dashboard setPage={setPage} />;
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: "#f8fafc", position: "relative" }}>
      {renderPage()}
      {showNav && <BottomNav currentPage={page} setPage={setPage} />}
      {/* Botón papelera flotante en inventario */}
      {page === "inventory" && (
        <button onClick={() => setPage("trash")}
          style={{ position: "fixed", bottom: 80, right: 16, width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "1.5px solid #fca5a5", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
          <Icon name="trash" size={18} style={{ color: "#ef4444" }} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CARGA
// ─────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>👶</div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#4F6AF5", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
function AppInner() {
  const { user, loading } = useContext(AuthCtx);
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default function BabyInventory() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
