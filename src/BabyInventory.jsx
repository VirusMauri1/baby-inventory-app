/**
 * BABY INVENTORY APP — Firebase Edition
 * =======================================
 * Login con Google real · Lista blanca de correos · Firestore sync
 *
 * ANTES DE USAR:
 * 1. npm install firebase
 * 2. Reemplaza los valores de FIREBASE_CONFIG con los tuyos
 * 3. Agrega los correos familiares en ALLOWED_EMAILS
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { initializeApp }                                               from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
}                                                                      from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
}                                                                      from "firebase/firestore";

// ─────────────────────────────────────────────
// 🔧 CONFIGURACIÓN — reemplaza con tus valores
// ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBQdtN9q8yKecCgPMtAhUIrG14xLctr1RY",
  authDomain:        "baby-inventory-53045.firebaseapp.com",
  projectId:         "baby-inventory-53045",
  storageBucket:     "baby-inventory-53045.firebasestorage.app",
  messagingSenderId: "714667708675",
  appId:             "1:714667708675:web:186ae7c84a5eb9d9775936",
};

// ─────────────────────────────────────────────
// 👨‍👩‍👧 CORREOS AUTORIZADOS — agrega los de tu familia
// ─────────────────────────────────────────────
const ALLOWED_EMAILS = [
  "dimasanaro2005@gmail.com",
  "sofia.archila95@gmail.com",
  "Vesuviusdiz@gmail.com",
  "joansa2002@gmail.com",
  // Añade más correos aquí
];

// ─────────────────────────────────────────────
// INICIALIZAR FIREBASE
// ─────────────────────────────────────────────
const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─────────────────────────────────────────────
// TEMA OSCURO
// ─────────────────────────────────────────────
const T = {
  bg:        "#0f1117",
  bgCard:    "#1a1d27",
  bgInput:   "#13151e",
  bgHover:   "#22253a",
  border:    "#2a2d3e",
  borderFoc: "#6366f1",
  text:      "#e2e8f0",
  textMuted: "#6b7280",
  textDim:   "#9ca3af",
  accent:    "#6366f1",
  accentBg:  "#6366f120",
  red:       "#ef4444",
  redBg:     "#ef444418",
  redBorder: "#ef444440",
  green:     "#22c55e",
  greenBg:   "#22c55e18",
  orange:    "#f97316",
  orangeBg:  "#f9731618",
  purple:    "#a855f7",
  purpleBg:  "#a855f718",
  blue:      "#3b82f6",
  blueBg:    "#3b82f618",
};

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es-GT", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
};
const fmtDateShort = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-GT", { day:"2-digit", month:"2-digit", year:"numeric" });
};

// ─────────────────────────────────────────────
// CONTEXTOS
// ─────────────────────────────────────────────
const AuthCtx = createContext(null);
const AppCtx  = createContext(null);

// ─────────────────────────────────────────────
// ICONOS
// ─────────────────────────────────────────────
const PATHS = {
  home:      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  box:       "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  tag:       "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
  clock:     "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  plus:      "M12 4v16m8-8H4",
  trash:     "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  edit:      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  warning:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  check:     "M5 13l4 4L19 7",
  x:         "M6 18L18 6M6 6l12 12",
  restore:   "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  logout:    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  minus:     "M20 12H4",
  chevright: "M9 5l7 7-7 7",
  shield:    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

const Icon = ({ name, size = 20, color, style: s = {} }) => {
  if (name === "google") return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={s}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={s}>
      {PATHS[name] && <path d={PATHS[name]} />}
    </svg>
  );
};

// ─────────────────────────────────────────────
// ESTILOS GLOBALES
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #0f1117; font-family: system-ui, -apple-system, sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0f1117; }
  ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 3px; }
  input, textarea, select { color-scheme: dark; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes slideIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
function GlobalStyles() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
}

// ─────────────────────────────────────────────
// UI BASE
// ─────────────────────────────────────────────
function Card({ children, style: extra = {} }) {
  return <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:16, ...extra }}>{children}</div>;
}
function Badge({ children, color = T.accent }) {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:600, background:`${color}20`, color }}>{children}</span>;
}
function StockBadge({ stock }) {
  const low = stock < 20;
  return (
    <Badge color={low ? T.red : T.green}>
      {low && <Icon name="warning" size={11} color={T.red} />}
      {stock} uds
    </Badge>
  );
}

// ─────────────────────────────────────────────
// AUTH PROVIDER
// ─────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [authError, setAuthError] = useState(null);
  const [checking,  setChecking]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (ALLOWED_EMAILS.includes(firebaseUser.email)) {
          setUser({
            uid:   firebaseUser.uid,
            email: firebaseUser.email,
            name:  firebaseUser.displayName || firebaseUser.email.split("@")[0],
            photo: firebaseUser.photoURL,
          });
          setAuthError(null);
        } else {
          await signOut(auth);
          setUser(null);
          setAuthError(`El correo ${firebaseUser.email} no está autorizado. Contacta al administrador.`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setChecking(false);
    });
    return unsub;
  }, []);

  const loginGoogle = async () => {
    setAuthError(null);
    setChecking(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      setChecking(false);
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Cerraste la ventana antes de completar el login. Intenta de nuevo.");
      } else if (err.code === "auth/popup-blocked") {
        setAuthError("El navegador bloqueó la ventana emergente. Permite popups para este sitio.");
      } else {
        setAuthError("Error al iniciar sesión. Intenta de nuevo.");
        console.error(err);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, checking, authError, loginGoogle, logout, setAuthError }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ─────────────────────────────────────────────
// APP PROVIDER — Firestore
// ─────────────────────────────────────────────
const INITIAL_CATEGORIES = [
  { name:"Pañales",          emoji:"👶", color:T.accent },
  { name:"Toallitas húmedas",emoji:"🧴", color:T.blue  },
];

function AppProvider({ children }) {
  const { user } = useContext(AuthCtx);
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [movements,  setMovements]  = useState([]);
  const [dataReady,  setDataReady]  = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      if (data.length === 0) {
        // Crear categorías iniciales si la colección está vacía
        INITIAL_CATEGORIES.forEach(cat => addDoc(collection(db, "categories"), cat).catch(() => {}));
      } else {
        setCategories(data);
      }
    });

    const unsubProds = onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc")),
      (snap) => {
        setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
        setDataReady(true);
      }
    );

    const unsubMovs = onSnapshot(
      query(collection(db, "movements"), orderBy("timestamp", "desc")),
      (snap) => setMovements(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );

    return () => { unsubCats(); unsubProds(); unsubMovs(); };
  }, [user]);

  const logMovement = useCallback((action, productId, details = {}) => {
    addDoc(collection(db, "movements"), {
      timestamp: serverTimestamp(),
      userId:    user?.uid,
      userName:  user?.name || "Usuario",
      action, productId, ...details,
    }).catch(console.error);
  }, [user]);

  // CATEGORÍAS
  const addCategory    = (name, emoji = "📦", color = T.accent) =>
    addDoc(collection(db, "categories"), { name, emoji, color });
  const updateCategory = (id, data) =>
    updateDoc(doc(db, "categories", id), data);
  const deleteCategory = async (id) => {
    const inUse = products.some(p => p.categoryId === id && p.status === "ACTIVE");
    if (inUse) return { error:"Hay productos activos en esta categoría." };
    await deleteDoc(doc(db, "categories", id));
    return { ok:true };
  };

  // PRODUCTOS
  const addProduct = async (data) => {
    const total = (data.qtyPerPack || 0) * (data.numPacks || 0);
    const ref = await addDoc(collection(db, "products"), {
      ...data, stock:total, status:"ACTIVE",
      createdAt:serverTimestamp(), updatedAt:serverTimestamp(), createdBy:user?.uid,
    });
    logMovement("CREATED", ref.id, { description:`${data.brand} ${data.line}`, delta:total });
  };

  const updateProduct = async (id, data) => {
    const total = (data.qtyPerPack || 0) * (data.numPacks || 0);
    await updateDoc(doc(db, "products", id), { ...data, stock:total, updatedAt:serverTimestamp() });
    logMovement("UPDATED", id, { description:`${data.brand} ${data.line}` });
  };

  const consumeProduct = async (id, qty) => {
    const p = products.find(x => x.id === id);
    if (!p || p.stock < qty) return false;
    const newStock = p.stock - qty;
    await updateDoc(doc(db, "products", id), { stock:newStock, updatedAt:serverTimestamp() });
    logMovement("CONSUMED", id, { description:`${p.brand} ${p.line}`, delta:-qty, stockAfter:newStock });
    return true;
  };

  const softDeleteProduct = async (id) => {
    const p = products.find(x => x.id === id);
    await updateDoc(doc(db, "products", id), {
      status:"DELETED", deletedAt:serverTimestamp(), deletedBy:user?.name,
    });
    logMovement("DELETED", id, { description: p ? `${p.brand} ${p.line}` : id });
  };

  const restoreProduct = async (id) => {
    const p = products.find(x => x.id === id);
    await updateDoc(doc(db, "products", id), { status:"ACTIVE", deletedAt:null, deletedBy:null });
    logMovement("RESTORED", id, { description: p ? `${p.brand} ${p.line}` : id });
  };

  const activeProducts   = products.filter(p => p.status === "ACTIVE");
  const deletedProducts  = products.filter(p => p.status === "DELETED");
  const lowStockProducts = activeProducts.filter(p => p.stock < 20);

  return (
    <AppCtx.Provider value={{
      categories, addCategory, updateCategory, deleteCategory,
      products:activeProducts, deletedProducts, lowStockProducts, allProducts:products,
      addProduct, updateProduct, consumeProduct, softDeleteProduct, restoreProduct,
      movements, dataReady,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function LoginScreen() {
  const { loginGoogle, authError, setAuthError, checking } = useContext(AuthCtx);

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(135deg,#1a1d27 0%,#0f1117 60%,#1a1027 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:400, animation:"fadeIn 0.4s ease-out" }}>

        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:82, height:82, borderRadius:"50%", background:`${T.accent}20`, border:`2px solid ${T.accent}50`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:40, marginBottom:"1rem", boxShadow:`0 0 48px ${T.accent}30` }}>
            👶
          </div>
          <h1 style={{ color:"#fff", fontSize:30, fontWeight:900, margin:0, letterSpacing:"-0.5px" }}>BabyStock</h1>
          <p style={{ color:T.textMuted, marginTop:6, fontSize:15 }}>Inventario familiar del bebé</p>
        </div>

        <Card style={{ padding:"2rem", boxShadow:"0 25px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:T.accentBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="shield" size={20} color={T.accent} />
            </div>
            <div>
              <p style={{ fontSize:16, fontWeight:700, color:T.text, margin:0 }}>Acceso privado</p>
              <p style={{ fontSize:12, color:T.textMuted, margin:0 }}>Solo miembros de la familia</p>
            </div>
          </div>

          {/* Error */}
          {authError && (
            <div style={{ background:T.redBg, border:`1px solid ${T.redBorder}`, borderRadius:10, padding:"12px 14px", marginBottom:"1rem", display:"flex", gap:8, alignItems:"flex-start" }}>
              <Icon name="warning" size={18} color={T.red} style={{ flexShrink:0, marginTop:1 }} />
              <div style={{ flex:1 }}>
                <p style={{ color:T.red, fontSize:13, fontWeight:600, margin:"0 0 2px" }}>Acceso denegado</p>
                <p style={{ color:T.red, fontSize:13, margin:0, opacity:0.85 }}>{authError}</p>
              </div>
              <button onClick={() => setAuthError(null)} style={{ background:"none", border:"none", cursor:"pointer", color:T.red, fontSize:18, lineHeight:1, flexShrink:0 }}>×</button>
            </div>
          )}

          {/* Botón Google */}
          <button
            onClick={loginGoogle}
            disabled={checking}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              padding:"15px 20px", borderRadius:12,
              border:`1.5px solid ${checking ? T.accent : T.border}`,
              background: checking ? T.accentBg : T.bgHover,
              cursor: checking ? "not-allowed" : "pointer",
              fontSize:15, fontWeight:600, color:T.text, transition:"all 0.2s",
            }}
            onMouseOver={e => { if (!checking) e.currentTarget.style.borderColor = T.borderFoc; }}
            onMouseOut={e => { if (!checking) e.currentTarget.style.borderColor = T.border; }}
          >
            {checking ? (
              <>
                <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.accent, animation:"spin 0.8s linear infinite" }} />
                Esperando confirmación...
              </>
            ) : (
              <>
                <Icon name="google" size={20} />
                Continuar con Google
              </>
            )}
          </button>

          <p style={{ fontSize:11, color:T.textMuted, textAlign:"center", marginTop:"1.25rem", lineHeight:1.6, opacity:0.7 }}>
            Si tu correo no aparece en la lista, contacta al administrador para que te agregue.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"flex-end", background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div style={{ width:"100%", background:T.bgCard, borderRadius:"20px 20px 0 0", maxHeight:"90dvh", overflow:"auto", paddingBottom:"env(safe-area-inset-bottom,1rem)", animation:"slideIn 0.25s ease-out", border:`1px solid ${T.border}`, borderBottom:"none" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1rem 1rem 0" }}>
          <h2 style={{ fontSize:17, fontWeight:700, margin:0, color:T.text }}>{title}</h2>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", background:T.bgHover, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={16} color={T.textDim} />
          </button>
        </div>
        <div style={{ padding:"1rem" }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORMULARIO PRODUCTO
// ─────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel, categories }) {
  const empty = { categoryId:categories[0]?.id||"", brand:"", line:"", size:"", qtyPerPack:"", numPacks:"", notes:"" };
  const [form,   setForm]   = useState(() => initial
    ? { categoryId:initial.categoryId||"", brand:initial.brand||"", line:initial.line||"", size:initial.size||"", qtyPerPack:initial.qtyPerPack||"", numPacks:initial.numPacks||"", notes:initial.notes||"" }
    : empty
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = useCallback((k) => (e) => setForm(prev => ({ ...prev, [k]:e.target.value })), []);
  const total = (Number(form.qtyPerPack)||0) * (Number(form.numPacks)||0);

  const validate = () => {
    const e = {};
    if (!form.categoryId)      e.categoryId = "Selecciona una categoría";
    if (!form.brand.trim())    e.brand      = "Requerido";
    if (!form.line.trim())     e.line       = "Requerido";
    if (!(form.qtyPerPack > 0)) e.qtyPerPack = "Mayor a 0";
    if (!(form.numPacks   > 0)) e.numPacks   = "Mayor a 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave({ ...form, qtyPerPack:Number(form.qtyPerPack), numPacks:Number(form.numPacks) });
    setSaving(false);
  };

  const field = (key) => ({
    width:"100%", padding:"12px 14px", borderRadius:10,
    border:`1.5px solid ${errors[key] ? T.red : T.border}`,
    background: errors[key] ? `${T.red}0a` : T.bgInput,
    color:T.text, fontSize:15, outline:"none",
  });

  return (
    <div>
      <div style={{ marginBottom:"1rem" }}>
        <label style={{ display:"block", fontSize:13, fontWeight:500, color:T.textDim, marginBottom:5 }}>Categoría <span style={{ color:T.red }}>*</span></label>
        <select value={form.categoryId} onChange={set("categoryId")} style={field("categoryId")}>
          <option value="">-- Selecciona --</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        {errors.categoryId && <p style={{ color:T.red, fontSize:12, marginTop:4 }}>{errors.categoryId}</p>}
      </div>

      {[
        { k:"brand", label:"Marca",           placeholder:"Ej: Huggies",      required:true  },
        { k:"line",  label:"Línea / Edición", placeholder:"Ej: Supreme Care", required:true  },
        { k:"size",  label:"Talla (opcional)",placeholder:"Ej: RN, S, M, L",  required:false },
      ].map(({ k, label, placeholder, required }) => (
        <div key={k} style={{ marginBottom:"1rem" }}>
          <label style={{ display:"block", fontSize:13, fontWeight:500, color:T.textDim, marginBottom:5 }}>
            {label} {required && <span style={{ color:T.red }}>*</span>}
          </label>
          <input value={form[k]} onChange={set(k)} placeholder={placeholder} style={field(k)} />
          {errors[k] && <p style={{ color:T.red, fontSize:12, marginTop:4 }}>{errors[k]}</p>}
        </div>
      ))}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1rem" }}>
        {[
          { k:"qtyPerPack", label:"Unid. por paquete" },
          { k:"numPacks",   label:"N.º de paquetes"   },
        ].map(({ k, label }) => (
          <div key={k}>
            <label style={{ display:"block", fontSize:13, fontWeight:500, color:T.textDim, marginBottom:5 }}>
              {label} <span style={{ color:T.red }}>*</span>
            </label>
            <input type="number" min="1" value={form[k]} onChange={set(k)} style={field(k)} />
            {errors[k] && <p style={{ color:T.red, fontSize:11, marginTop:4 }}>{errors[k]}</p>}
          </div>
        ))}
      </div>

      {total > 0 && (
        <div style={{ background:T.greenBg, border:`1.5px solid ${T.green}40`, borderRadius:10, padding:"10px 14px", marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:14, color:T.green }}>Total calculado</span>
          <span style={{ fontSize:18, fontWeight:800, color:T.green }}>{total} unidades</span>
        </div>
      )}

      <div style={{ marginBottom:"1.5rem" }}>
        <label style={{ display:"block", fontSize:13, fontWeight:500, color:T.textDim, marginBottom:5 }}>Comentarios</label>
        <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Notas adicionales..."
          style={{ ...field("notes"), resize:"vertical" }} />
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:"14px", borderRadius:12, border:`1.5px solid ${T.border}`, background:"transparent", fontSize:15, cursor:"pointer", color:T.textDim }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ flex:2, padding:"14px", borderRadius:12, background:saving?T.border:T.accent, border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "Guardando..." : (initial ? "Guardar cambios" : "Registrar producto")}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────
function Header({ title, action, onBack }) {
  const { user, logout } = useContext(AuthCtx);
  const [showMenu, setShowMenu] = useState(false);
  return (
    <header style={{ position:"sticky", top:0, zIndex:50, background:`${T.bg}ee`, backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.border}`, padding:"0 1rem" }}>
      <div style={{ display:"flex", alignItems:"center", height:56, gap:10 }}>
        {onBack && (
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, background:T.bgHover, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="chevright" size={18} color={T.textDim} style={{ transform:"rotate(180deg)" }} />
          </button>
        )}
        <h1 style={{ flex:1, fontSize:17, fontWeight:800, color:T.text, margin:0 }}>{title}</h1>
        {action}
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ width:36, height:36, borderRadius:"50%", background:`${T.accent}25`, border:`2px solid ${T.accent}40`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:0 }}>
            {user?.photo
              ? <img src={user.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} referrerPolicy="no-referrer" alt="" />
              : <span style={{ fontSize:14, fontWeight:700, color:T.accent }}>{(user?.name||"U")[0].toUpperCase()}</span>
            }
          </button>
          {showMenu && (
            <div style={{ position:"absolute", top:42, right:0, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:"8px", minWidth:200, boxShadow:`0 10px 40px rgba(0,0,0,0.5)`, zIndex:200 }}>
              <div style={{ padding:"8px", borderBottom:`1px solid ${T.border}`, marginBottom:4 }}>
                <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:0 }}>{user?.name}</p>
                <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>{user?.email}</p>
              </div>
              <button onClick={() => { logout(); setShowMenu(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 8px", borderRadius:8, border:"none", background:"none", cursor:"pointer", color:T.red, fontSize:14 }}>
                <Icon name="logout" size={16} color={T.red} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
function BottomNav({ currentPage, setPage }) {
  const tabs = [
    { id:"dashboard",  icon:"home",  label:"Inicio"     },
    { id:"inventory",  icon:"box",   label:"Inventario" },
    { id:"categories", icon:"tag",   label:"Categorías" },
    { id:"history",    icon:"clock", label:"Historial"  },
  ];
  return (
    <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:`${T.bgCard}f5`, backdropFilter:"blur(12px)", borderTop:`1px solid ${T.border}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
      {tabs.map(t => {
        const active = currentPage === t.id;
        return (
          <button key={t.id} onClick={() => setPage(t.id)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"10px 0 8px", border:"none", background:"none", cursor:"pointer", color:active?T.accent:T.textMuted, gap:3, transition:"color 0.15s" }}>
            <div style={{ width:32, height:28, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8, background:active?T.accentBg:"transparent" }}>
              <Icon name={t.icon} size={20} color={active?T.accent:T.textMuted} />
            </div>
            <span style={{ fontSize:10, fontWeight:active?700:400 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────
// TARJETA PRODUCTO
// ─────────────────────────────────────────────
function ProductCard({ product, onConsume, onEdit, onDelete }) {
  const { categories } = useContext(AppCtx);
  const cat = categories.find(c => c.id === product.categoryId);
  const low = product.stock < 20;
  return (
    <Card style={{ overflow:"hidden" }}>
      <div style={{ height:6, background:low?`linear-gradient(90deg,${T.red},${T.orange})`:`linear-gradient(90deg,${T.accent},${T.purple})` }} />
      <div style={{ padding:"14px 12px 12px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
              <span style={{ fontSize:16 }}>{cat?.emoji||"📦"}</span>
              <span style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>{cat?.name}</span>
            </div>
            <p style={{ fontSize:15, fontWeight:800, color:T.text, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.brand}</p>
            <p style={{ fontSize:12, color:T.textDim, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.line}{product.size?` · ${product.size}`:""}</p>
          </div>
          <StockBadge stock={product.stock} />
        </div>
        <div style={{ display:"flex", gap:6, marginTop:10 }}>
          <button onClick={() => onConsume(product)} style={{ flex:1, padding:"10px 0", borderRadius:10, background:T.accentBg, border:`1px solid ${T.accent}40`, color:T.accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>Consumir</button>
          <button onClick={() => onEdit(product)} style={{ width:38, height:38, borderRadius:10, background:T.bgHover, border:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="edit" size={15} color={T.textDim} />
          </button>
          <button onClick={() => onDelete(product)} style={{ width:38, height:38, borderRadius:10, background:T.redBg, border:`1px solid ${T.redBorder}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="trash" size={15} color={T.red} />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// MODAL CONSUMO
// ─────────────────────────────────────────────
function ConsumeModal({ product, open, onClose }) {
  const { consumeProduct } = useContext(AppCtx);
  const [qty,    setQty]    = useState(1);
  const [done,   setDone]   = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setQty(1); setDone(false); } }, [open]);

  const handle = async () => {
    if (qty < 1 || qty > product?.stock) return;
    setSaving(true);
    await consumeProduct(product.id, qty);
    setSaving(false);
    setDone(true);
  };

  if (!product) return null;
  return (
    <Modal open={open} onClose={onClose} title="Registrar consumo">
      {done ? (
        <div style={{ textAlign:"center", padding:"1rem 0" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:T.greenBg, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:"1rem" }}>
            <Icon name="check" size={28} color={T.green} />
          </div>
          <p style={{ fontWeight:800, fontSize:17, color:T.text, margin:"0 0 8px" }}>Consumo registrado</p>
          <p style={{ color:T.textMuted, fontSize:14 }}>Quedan <strong style={{ color:T.text }}>{product.stock - qty}</strong> unidades.</p>
          <button onClick={onClose} style={{ marginTop:"1.5rem", width:"100%", padding:"14px", borderRadius:12, background:T.accent, border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>Listo</button>
        </div>
      ) : (
        <>
          <Card style={{ padding:"14px", marginBottom:"1.5rem" }}>
            <p style={{ fontSize:13, color:T.textMuted, margin:"0 0 4px" }}>{product.brand} {product.line}{product.size?` · ${product.size}`:""}</p>
            <p style={{ fontSize:15, color:T.text, margin:0 }}>Stock actual: <strong style={{ color:T.accent }}>{product.stock} unidades</strong></p>
          </Card>
          <label style={{ display:"block", fontSize:14, fontWeight:500, color:T.textDim, marginBottom:8 }}>Cantidad a consumir</label>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1.5rem" }}>
            <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:44, height:44, borderRadius:12, background:T.bgHover, border:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="minus" size={20} color={T.text} />
            </button>
            <input type="number" min="1" max={product.stock} value={qty}
              onChange={e => setQty(Math.min(product.stock,Math.max(1,Number(e.target.value))))}
              style={{ flex:1, textAlign:"center", padding:"12px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.bgInput, fontSize:22, fontWeight:700, color:T.text, outline:"none" }} />
            <button onClick={() => setQty(q => Math.min(product.stock,q+1))} style={{ width:44, height:44, borderRadius:12, background:T.accent, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="plus" size={20} color="#fff" />
            </button>
          </div>
          <div style={{ background:T.blueBg, borderRadius:10, padding:"10px 14px", marginBottom:"1.5rem", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:14, color:T.blue }}>Quedarán</span>
            <span style={{ fontSize:15, fontWeight:700, color:T.blue }}>{product.stock - qty} unidades</span>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"14px", borderRadius:12, border:`1.5px solid ${T.border}`, background:"transparent", fontSize:15, cursor:"pointer", color:T.textDim }}>Cancelar</button>
            <button onClick={handle} disabled={saving||qty>product.stock}
              style={{ flex:2, padding:"14px", borderRadius:12, background:saving?T.border:T.accent, border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
              {saving?"Guardando...":"Registrar consumo"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────
// MODAL ELIMINAR
// ─────────────────────────────────────────────
function DeleteModal({ product, open, onClose }) {
  const { softDeleteProduct } = useContext(AppCtx);
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setStep(1); }, [open]);

  const handleDelete = async () => {
    if (product.stock > 0 && step === 1) { setStep(2); return; }
    setSaving(true);
    await softDeleteProduct(product.id);
    setSaving(false);
    onClose();
  };

  if (!product) return null;
  return (
    <Modal open={open} onClose={onClose} title="Eliminar producto">
      <div style={{ textAlign:"center", padding:"0.5rem 0" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:T.redBg, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:"1rem" }}>
          <Icon name="trash" size={28} color={T.red} />
        </div>
        <p style={{ fontWeight:700, fontSize:16, color:T.text, margin:"0 0 8px" }}>
          {step===1 ? "¿Eliminar este producto?" : "⚠️ El producto tiene stock"}
        </p>
        <p style={{ color:T.textMuted, fontSize:14, lineHeight:1.6 }}>
          {step===1
            ? `Eliminarás "${product.brand} ${product.line}". Podrás restaurarlo desde la Papelera.`
            : `Este producto aún tiene ${product.stock} unidades. ¿Eliminar de todas formas?`}
        </p>
        <div style={{ display:"flex", gap:10, marginTop:"1.5rem" }}>
          <button onClick={onClose} style={{ flex:1, padding:"14px", borderRadius:12, border:`1.5px solid ${T.border}`, background:"transparent", fontSize:15, cursor:"pointer", color:T.textDim }}>Cancelar</button>
          <button onClick={handleDelete} disabled={saving}
            style={{ flex:1, padding:"14px", borderRadius:12, background:T.red, border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
            {saving?"Eliminando...":(step===1?"Eliminar":"Sí, eliminar")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ setPage }) {
  const { products, lowStockProducts, categories, movements } = useContext(AppCtx);
  const { user } = useContext(AuthCtx);
  const totalUnits = products.reduce((s,p) => s+p.stock, 0);
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h<12) return "Buenos días";
    if (h<19) return "Buenas tardes";
    return "Buenas noches";
  };
  const MOV_CFG = {
    CREATED:  { label:"agregó",   icon:"plus",    color:T.green  },
    CONSUMED: { label:"consumió", icon:"minus",   color:T.orange },
    DELETED:  { label:"eliminó",  icon:"trash",   color:T.red    },
    RESTORED: { label:"restauró", icon:"restore", color:T.purple },
    UPDATED:  { label:"editó",    icon:"edit",    color:T.blue   },
  };
  const stats = [
    { label:"Productos",      value:products.length,         color:T.accent },
    { label:"Total unidades", value:totalUnits,              color:T.green  },
    { label:"Categorías",     value:categories.length,       color:T.purple },
    { label:"Stock bajo",     value:lowStockProducts.length, color:T.red    },
  ];
  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="BabyStock 👶" action={
        <button onClick={() => setPage("add")} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:20, background:T.accent, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Agregar
        </button>
      } />
      <div style={{ padding:"1rem" }}>
        <p style={{ fontSize:15, color:T.textMuted, marginBottom:"1.25rem" }}>
          {getGreeting()}, <strong style={{ color:T.text }}>{user?.name}</strong> 👋
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1.5rem" }}>
          {stats.map(s => (
            <Card key={s.label} style={{ padding:"14px 16px" }}>
              <p style={{ fontSize:11, color:s.color, margin:"0 0 4px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", opacity:0.8 }}>{s.label}</p>
              <p style={{ fontSize:30, fontWeight:900, color:s.color, margin:0, letterSpacing:"-1px" }}>{s.value}</p>
            </Card>
          ))}
        </div>
        {lowStockProducts.length > 0 && (
          <Card style={{ padding:"14px", marginBottom:"1.5rem", border:`1px solid ${T.orange}40`, background:T.orangeBg }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <Icon name="warning" size={18} color={T.orange} />
              <span style={{ fontSize:14, fontWeight:700, color:T.orange }}>Stock bajo</span>
            </div>
            {lowStockProducts.slice(0,3).map(p => (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${T.orange}20` }}>
                <span style={{ fontSize:13, color:T.text }}>{p.brand} {p.line}</span>
                <StockBadge stock={p.stock} />
              </div>
            ))}
            {lowStockProducts.length > 3 && (
              <button onClick={() => setPage("inventory")} style={{ fontSize:13, color:T.orange, background:"none", border:"none", cursor:"pointer", marginTop:8, padding:0 }}>
                Ver todos ({lowStockProducts.length}) →
              </button>
            )}
          </Card>
        )}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:T.text, margin:0 }}>Últimos movimientos</h2>
            <button onClick={() => setPage("history")} style={{ fontSize:13, color:T.accent, background:"none", border:"none", cursor:"pointer" }}>Ver todos</button>
          </div>
          {movements.slice(0,5).map(m => {
            const c = MOV_CFG[m.action]||{ label:m.action, icon:"clock", color:T.textMuted };
            return (
              <div key={m.id} style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`${c.color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name={c.icon} size={16} color={c.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:T.text, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    <strong>{m.userName}</strong> {c.label} <em style={{ color:T.textDim }}>{m.description}</em>
                    {m.delta && <strong style={{ color:m.delta>0?T.green:T.red }}> {m.delta>0?"+":""}{m.delta} uds</strong>}
                  </p>
                  <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>{fmtDate(m.timestamp)}</p>
                </div>
              </div>
            );
          })}
          {movements.length === 0 && <p style={{ fontSize:14, color:T.textMuted, textAlign:"center", padding:"2rem 0" }}>Aún no hay movimientos</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INVENTARIO
// ─────────────────────────────────────────────
function Inventory({ setPage }) {
  const { products, categories, updateProduct } = useContext(AppCtx);
  const [search,     setSearch]      = useState("");
  const [filterCat,  setFilterCat]   = useState("all");
  const [filterLow,  setFilterLow]   = useState(false);
  const [consumeProd,setConsumeProd] = useState(null);
  const [editProd,   setEditProd]    = useState(null);
  const [deleteProd, setDeleteProd]  = useState(null);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (
      (!q || p.brand.toLowerCase().includes(q) || p.line.toLowerCase().includes(q) || (p.size||"").toLowerCase().includes(q)) &&
      (filterCat==="all" || p.categoryId===filterCat) &&
      (!filterLow || p.stock<20)
    );
  });

  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Inventario" action={
        <button onClick={() => setPage("add")} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:20, background:T.accent, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Nuevo
        </button>
      } />
      <div style={{ padding:"1rem" }}>
        <div style={{ position:"relative", marginBottom:"1rem" }}>
          <Icon name="search" size={18} color={T.textMuted} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por marca, línea, talla..."
            style={{ width:"100%", padding:"12px 14px 12px 40px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.bgInput, fontSize:15, color:T.text, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:"1rem" }}>
          {[{ id:"all", label:"Todas", emoji:"" }, ...categories.map(c => ({ id:c.id, label:c.name, emoji:c.emoji }))].map(item => (
            <button key={item.id} onClick={() => setFilterCat(item.id)}
              style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:`1.5px solid ${filterCat===item.id?T.accent:T.border}`, background:filterCat===item.id?T.accentBg:T.bgCard, color:filterCat===item.id?T.accent:T.textDim, fontSize:13, cursor:"pointer", fontWeight:filterCat===item.id?700:400, whiteSpace:"nowrap" }}>
              {item.emoji} {item.label}
            </button>
          ))}
          <button onClick={() => setFilterLow(!filterLow)}
            style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:`1.5px solid ${filterLow?T.red:T.border}`, background:filterLow?T.redBg:T.bgCard, color:filterLow?T.red:T.textDim, fontSize:13, cursor:"pointer", fontWeight:filterLow?700:400 }}>
            ⚠️ Stock bajo
          </button>
        </div>
        <p style={{ fontSize:13, color:T.textMuted, marginBottom:"0.75rem" }}>{filtered.length} producto{filtered.length!==1?"s":""}</p>
        {filtered.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {filtered.map(p => <ProductCard key={p.id} product={p} onConsume={setConsumeProd} onEdit={setEditProd} onDelete={setDeleteProd} />)}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"3rem 0" }}>
            <p style={{ fontSize:40, margin:"0 0 8px" }}>📦</p>
            <p style={{ fontSize:15, color:T.textMuted }}>{search?"No se encontraron productos":"No hay productos aún"}</p>
          </div>
        )}
      </div>
      <ConsumeModal product={consumeProd} open={!!consumeProd} onClose={() => setConsumeProd(null)} />
      <DeleteModal  product={deleteProd}  open={!!deleteProd}  onClose={() => setDeleteProd(null)} />
      <Modal open={!!editProd} onClose={() => setEditProd(null)} title="Editar producto">
        {editProd && (
          <ProductForm key={editProd.id} initial={editProd} categories={categories}
            onSave={async data => { await updateProduct(editProd.id,data); setEditProd(null); }}
            onCancel={() => setEditProd(null)} />
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// AGREGAR PRODUCTO
// ─────────────────────────────────────────────
function AddProduct({ setPage }) {
  const { addProduct, categories } = useContext(AppCtx);
  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Nuevo producto" onBack={() => setPage("inventory")} />
      <div style={{ padding:"1rem" }}>
        <ProductForm categories={categories}
          onSave={async data => { await addProduct(data); setPage("inventory"); }}
          onCancel={() => setPage("inventory")} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────────
function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useContext(AppCtx);
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [newName, setNewName] = useState("");
  const [newEmoji,setNewEmoji]= useState("📦");
  const [error,   setError]   = useState("");
  const emojis = ["📦","👶","🧴","🍼","👗","🧸","🧹","🍎","💊","🎒"];
  const countP = (id) => products.filter(p => p.categoryId===id).length;

  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Categorías" action={
        <button onClick={() => setShowAdd(!showAdd)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:20, background:T.accent, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          <Icon name="plus" size={16} color="#fff" /> Nueva
        </button>
      } />
      <div style={{ padding:"1rem" }}>
        {error && (
          <div style={{ background:T.redBg, border:`1px solid ${T.redBorder}`, borderRadius:10, padding:"10px 14px", marginBottom:"1rem", color:T.red, fontSize:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            {error}
            <button onClick={() => setError("")} style={{ background:"none", border:"none", color:T.red, cursor:"pointer", fontSize:18 }}>×</button>
          </div>
        )}
        {showAdd && (
          <Card style={{ padding:"1rem", marginBottom:"1rem" }}>
            <p style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:"0.75rem" }}>Nueva categoría</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:"0.75rem" }}>
              {emojis.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  style={{ width:38, height:38, borderRadius:9, border:`2px solid ${newEmoji===e?T.accent:T.border}`, background:newEmoji===e?T.accentBg:T.bgInput, fontSize:18, cursor:"pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la categoría"
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, background:T.bgInput, fontSize:15, color:T.text, outline:"none", marginBottom:"0.75rem", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setShowAdd(false); setError(""); }} style={{ flex:1, padding:"12px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"transparent", fontSize:14, cursor:"pointer", color:T.textDim }}>Cancelar</button>
              <button onClick={async () => {
                if (!newName.trim()) { setError("El nombre es requerido"); return; }
                await addCategory(newName.trim(), newEmoji);
                setNewName(""); setNewEmoji("📦"); setShowAdd(false); setError("");
              }} style={{ flex:2, padding:"12px", borderRadius:10, background:T.accent, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>Crear</button>
            </div>
          </Card>
        )}
        {categories.map(cat => (
          <Card key={cat.id} style={{ padding:"14px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:`${cat.color||T.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, border:`1px solid ${cat.color||T.accent}30` }}>
              {cat.emoji}
            </div>
            <div style={{ flex:1 }}>
              {editCat?.id === cat.id ? (
                <div style={{ display:"flex", gap:6 }}>
                  <input value={editCat.name} onChange={e => setEditCat({ ...editCat, name:e.target.value })}
                    style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1.5px solid ${T.accent}`, background:T.bgInput, color:T.text, fontSize:14, outline:"none" }} />
                  <button onClick={async () => { await updateCategory(editCat.id,{name:editCat.name,emoji:editCat.emoji}); setEditCat(null); }}
                    style={{ padding:"7px 12px", borderRadius:8, background:T.accent, border:"none", color:"#fff", fontSize:13, cursor:"pointer" }}>✓</button>
                  <button onClick={() => setEditCat(null)}
                    style={{ padding:"7px 10px", borderRadius:8, background:T.bgHover, border:"none", fontSize:13, cursor:"pointer", color:T.textDim }}>✕</button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:T.text, margin:0 }}>{cat.name}</p>
                  <p style={{ fontSize:12, color:T.textMuted, margin:0 }}>{countP(cat.id)} producto{countP(cat.id)!==1?"s":""}</p>
                </>
              )}
            </div>
            {editCat?.id!==cat.id && (
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setEditCat(cat)} style={{ width:34, height:34, borderRadius:8, background:T.bgHover, border:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name="edit" size={15} color={T.textDim} />
                </button>
                {countP(cat.id)===0 && (
                  <button onClick={async () => { const r = await deleteCategory(cat.id); if (r?.error) setError(r.error); }}
                    style={{ width:34, height:34, borderRadius:8, background:T.redBg, border:`1px solid ${T.redBorder}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="trash" size={15} color={T.red} />
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORIAL
// ─────────────────────────────────────────────
function History() {
  const { movements } = useContext(AppCtx);
  const CFG = {
    CREATED:  { label:"Agregado",   color:T.green,  icon:"plus"    },
    CONSUMED: { label:"Consumido",  color:T.orange, icon:"minus"   },
    DELETED:  { label:"Eliminado",  color:T.red,    icon:"trash"   },
    RESTORED: { label:"Restaurado", color:T.purple, icon:"restore" },
    UPDATED:  { label:"Editado",    color:T.blue,   icon:"edit"    },
  };
  const grouped = movements.reduce((acc,m) => {
    const day = fmtDateShort(m.timestamp);
    if (!acc[day]) acc[day]=[];
    acc[day].push(m);
    return acc;
  }, {});
  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Historial" />
      <div style={{ padding:"1rem" }}>
        {Object.keys(grouped).length===0 ? (
          <div style={{ textAlign:"center", padding:"3rem 0" }}>
            <p style={{ fontSize:40, margin:"0 0 8px" }}>📋</p>
            <p style={{ fontSize:15, color:T.textMuted }}>No hay movimientos aún</p>
          </div>
        ) : Object.entries(grouped).map(([day,items]) => (
          <div key={day} style={{ marginBottom:"1.5rem" }}>
            <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, marginBottom:"0.75rem", letterSpacing:"0.08em", textTransform:"uppercase" }}>{day}</p>
            {items.map(m => {
              const c = CFG[m.action]||{ label:m.action, color:T.textMuted, icon:"clock" };
              return (
                <Card key={m.id} style={{ padding:"12px", marginBottom:8, display:"flex", gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${c.color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon name={c.icon} size={18} color={c.color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:12, color:c.color, fontWeight:700 }}>{c.label}</span>
                      {m.delta && <span style={{ fontSize:13, fontWeight:700, color:m.delta>0?T.green:T.red }}>{m.delta>0?"+":""}{m.delta}</span>}
                    </div>
                    <p style={{ fontSize:13, color:T.text, margin:"2px 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      <strong>{m.userName}</strong> · {m.description||""}
                    </p>
                    <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>
                      {(m.timestamp?.toDate?m.timestamp.toDate():new Date(m.timestamp||Date.now())).toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAPELERA
// ─────────────────────────────────────────────
function Trash({ setPage }) {
  const { deletedProducts, restoreProduct, categories } = useContext(AppCtx);
  return (
    <div style={{ paddingBottom:80 }}>
      <Header title="Papelera 🗑️" onBack={() => setPage("inventory")} />
      <div style={{ padding:"1rem" }}>
        {deletedProducts.length===0 ? (
          <div style={{ textAlign:"center", padding:"3rem 0" }}>
            <p style={{ fontSize:40, margin:"0 0 8px" }}>🗑️</p>
            <p style={{ fontSize:15, color:T.textMuted }}>La papelera está vacía</p>
          </div>
        ) : deletedProducts.map(p => {
          const cat = categories.find(c => c.id===p.categoryId);
          return (
            <Card key={p.id} style={{ padding:"14px", marginBottom:10, display:"flex", gap:12, alignItems:"flex-start", border:`1px solid ${T.redBorder}` }}>
              <div style={{ width:44, height:44, borderRadius:12, background:T.redBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                {cat?.emoji||"📦"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:15, fontWeight:700, color:T.red, margin:"0 0 2px" }}>{p.brand} {p.line}</p>
                <p style={{ fontSize:12, color:T.textMuted, margin:"0 0 4px" }}>{cat?.name}{p.size?` · ${p.size}`:""}</p>
                {p.deletedAt && <p style={{ fontSize:11, color:T.textMuted, margin:0, opacity:0.7 }}>Eliminado {fmtDate(p.deletedAt)}</p>}
              </div>
              <button onClick={() => restoreProduct(p.id)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:10, background:T.greenBg, border:`1px solid ${T.green}40`, color:T.green, fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                <Icon name="restore" size={15} color={T.green} /> Restaurar
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────
function LoadingScreen({ message = "Cargando..." }) {
  return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:"1.5rem" }}>👶</div>
        <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${T.border}`, borderTopColor:T.accent, animation:"spin 0.8s linear infinite", margin:"0 auto 1rem" }} />
        <p style={{ color:T.textMuted, fontSize:14 }}>{message}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
function AppRouter() {
  const [page, setPage] = useState("dashboard");
  const { dataReady }   = useContext(AppCtx);
  const navPages        = ["dashboard","inventory","categories","history"];

  if (!dataReady) return <LoadingScreen message="Sincronizando datos..." />;

  const renderPage = () => {
    switch (page) {
      case "dashboard":  return <Dashboard  setPage={setPage} />;
      case "inventory":  return <Inventory  setPage={setPage} />;
      case "add":        return <AddProduct setPage={setPage} />;
      case "categories": return <Categories />;
      case "history":    return <History />;
      case "trash":      return <Trash      setPage={setPage} />;
      default:           return <Dashboard  setPage={setPage} />;
    }
  };

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100dvh", background:T.bg, position:"relative" }}>
      {renderPage()}
      {navPages.includes(page) && <BottomNav currentPage={page} setPage={setPage} />}
      {page==="inventory" && (
        <button onClick={() => setPage("trash")}
          style={{ position:"fixed", bottom:80, right:"calc(50% - 224px)", width:44, height:44, borderRadius:"50%", background:T.bgCard, border:`1.5px solid ${T.redBorder}`, boxShadow:`0 4px 16px rgba(0,0,0,0.3)`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:90 }}>
          <Icon name="trash" size={18} color={T.red} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
function AppInner() {
  const { user, loading } = useContext(AuthCtx);
  if (loading) return <LoadingScreen message="Verificando sesión..." />;
  if (!user)   return <LoginScreen />;
  return <AppProvider><AppRouter /></AppProvider>;
}

export default function BabyInventory() {
  return (
    <>
      <GlobalStyles />
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </>
  );
}