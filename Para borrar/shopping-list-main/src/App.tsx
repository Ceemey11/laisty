// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  query,
  where,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Search, 
  Store, 
  RefreshCcw,
  AlertTriangle,
  LogOut,
  UserCircle,
  Mail,
  Lock,
  ArrowLeft,
  Share2,
  Copy,
  Users,
  CheckCircle,
  X,
  Minus,
  Edit
} from 'lucide-react';

// --- TU CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCFwluXW6iFFyuLw1pgkP8kGQ94FNxa5uc",
  authDomain: "lista-de-la-compra-c6e01.firebaseapp.com",
  projectId: "lista-de-la-compra-c6e01",
  storageBucket: "lista-de-la-compra-c6e01.firebasestorage.app",
  messagingSenderId: "1039300941532",
  appId: "1:1039300941532:web:dc31680c56f6c191468619",
  measurementId: "G-EQYCX8XJD6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Paleta de Colores para Supermercados Dinámicos ---
const COLOR_PALETTE = [
  { name: 'blue', color: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
  { name: 'green', color: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50' },
  { name: 'orange', color: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50' },
  { name: 'purple', color: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
  { name: 'red', color: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50' },
  { name: 'teal', color: 'bg-teal-600', text: 'text-teal-600', light: 'bg-teal-50' },
  { name: 'yellow', color: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' },
  { name: 'pink', color: 'bg-pink-600', text: 'text-pink-600', light: 'bg-pink-50' },
  { name: 'indigo', color: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' },
  { name: 'cyan', color: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50' },
];

const COMMON_PRODUCTS = [
  "Aceite de oliva", "Aceite de girasol", "Agua", "Ajos", "Arroz", "Atún", "Azúcar",
  "Café", "Caldo", "Carne picada", "Cebollas", "Cerveza", "Cereales", "Champú",
  "Chocolate", "Detergente", "Embutido", "Espaguetis", "Galletas", "Gel de baño",
  "Harina", "Huevos", "Jamón", "Leche", "Lechuga", "Legumbres", "Limones",
  "Mantequilla", "Manzanas", "Mayonesa", "Naranjas", "Pan", "Pan de molde",
  "Papel higiénico", "Pasta de dientes", "Patatas", "Pechuga de pollo", "Pescado",
  "Pimientos", "Plátanos", "Queso", "Refrescos", "Sal", "Servilletas", "Suavizante",
  "Tomate frito", "Tomates", "Vinagre", "Yogures", "Zanahorias"
];

// --- Helper Functions ---
const toTitleCase = (str) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// --- Estilos Globales para corregir Layout de Vite/StackBlitz ---
// Esto sobreescribe los estilos por defecto que centran la app y la hacen oscura
const GlobalStyles = () => (
  <style>{`
    :root {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      line-height: 1.5;
      font-weight: 400;
      color-scheme: light;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f9fafb !important; /* bg-gray-50 */
      color: #111827; /* text-gray-900 */
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      place-items: unset !important;
      min-width: unset !important;
      min-height: 100vh !important;
      width: 100% !important;
      background-color: #f9fafb !important;
    }
    #root {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      text-align: left !important;
      width: 100% !important;
      min-height: 100vh;
      display: block !important;
    }
  `}</style>
);

// --- COMPONENTE DE LISTA INDIVIDUAL ---
function ShoppingListView({ listId, listName, onBack, currentUser }) {
  const [items, setItems] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // Estados formulario
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedSupermarket, setSelectedSupermarket] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estados para crear nuevo supermercado
  const [isCreatingSuper, setIsCreatingSuper] = useState(false);
  const [newSuperName, setNewSuperName] = useState("");

  // Estados Compartir
  const [inviteEmail, setInviteEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);

  // Cargar items y supermercados
  useEffect(() => {
    const q = query(collection(db, 'shopping_lists', listId, 'items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(fetchedItems);
      setLoading(false);
    });

    const unsubList = onSnapshot(doc(db, 'shopping_lists', listId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSharedUsers(data.sharedWith || []);
        
        const loadedSupers = data.supermarkets || [];
        setSupermarkets(loadedSupers);

        if (loadedSupers.length > 0) {
            setSelectedSupermarket(prev => {
              const exists = loadedSupers.some(s => s.name === prev);
              return exists ? prev : loadedSupers[0].name;
            });
        }
      }
    });

    return () => { unsubscribe(); unsubList(); };
  }, [listId]);

  const activeGridSupermarkets = useMemo(() => {
    const supersWithItems = supermarkets.filter(sup => 
      items.some(item => item.supermarket === sup.name)
    );
    return supersWithItems.sort((a, b) => {
      const countA = items.filter(i => i.supermarket === a.name).length;
      const countB = items.filter(i => i.supermarket === b.name).length;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [items, supermarkets]);

  // Acciones en la base de datos (Lista de productos)
  const handleUpdateQuantity = async (itemId, currentQty, change) => {
    const newQty = currentQty + change;
    
    if (newQty < 1) {
        // Si baja de 1, borrar
        await deleteDoc(doc(db, 'shopping_lists', listId, 'items', itemId));
    } else {
        // Actualizar cantidad
        await updateDoc(doc(db, 'shopping_lists', listId, 'items', itemId), {
            quantity: newQty
        });
    }
  };

  const handleDeleteItem = async (id) => {
    await deleteDoc(doc(db, 'shopping_lists', listId, 'items', id));
  };

  // Acciones locales (Formulario Añadir)
  const handleFormQtyChange = (change) => {
    const newQty = quantity + change;
    if (newQty < 1) {
        // Si es < 1 en el formulario, reseteamos el formulario
        setProductName("");
        setQuantity(1);
        setShowSuggestions(false);
    } else {
        setQuantity(newQty);
    }
  };

  const handleCreateSupermarket = async (e) => {
    if (e) e.preventDefault(); 
    if (!newSuperName.trim()) return;
    
    const colorIndex = supermarkets.length % COLOR_PALETTE.length;
    const newStyle = COLOR_PALETTE[colorIndex];
    
    const newSuper = {
        ...newStyle,
        name: toTitleCase(newSuperName.trim())
    };

    try {
        await updateDoc(doc(db, 'shopping_lists', listId), {
            supermarkets: arrayUnion(newSuper)
        });
        setSelectedSupermarket(newSuper.name);
        setNewSuperName(""); 
        setIsCreatingSuper(false); 
    } catch (e) { console.error(e); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    
    if (!selectedSupermarket) {
        alert("Primero añade un supermercado (ej: Mercadona, Frutería...)");
        return;
    }

    try {
      await addDoc(collection(db, 'shopping_lists', listId, 'items'), {
        name: toTitleCase(productName.trim()),
        quantity,
        supermarket: selectedSupermarket,
        createdAt: serverTimestamp(),
        addedBy: currentUser.displayName || currentUser.email.split('@')[0],
        completed: false
      });
      // RESETEO DE ESTADOS TRAS AÑADIR
      setProductName("");
      setQuantity(1); 
      setShowSuggestions(false);
    } catch (e) { console.error(e); }
  };

  const executeClearSupermarket = async () => {
    if (!deleteConfirmation) return;
    const itemsToDelete = items.filter(i => i.supermarket === deleteConfirmation.name);
    setDeleteConfirmation(null);
    itemsToDelete.forEach(async (item) => {
      await deleteDoc(doc(db, 'shopping_lists', listId, 'items', item.id));
    });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await updateDoc(doc(db, 'shopping_lists', listId), {
        sharedWith: arrayUnion(inviteEmail.toLowerCase().trim())
      });
      setShareStatus("success");
      setTimeout(() => setShareStatus(""), 3000);
      setInviteEmail("");
    } catch (error) {
      console.error(error);
      setShareStatus("error");
    }
  };

  const generateShareLink = () => `${window.location.origin}${window.location.pathname}?listId=${listId}`;
  
  const copyShareLink = () => {
    navigator.clipboard.writeText(generateShareLink());
    alert("Enlace copiado");
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <GlobalStyles />
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between sticky top-16 z-10">
        <div className="flex items-center gap-3">
          {/* BOTÓN PARA VOLVER A HOME */}
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition" title="Volver al inicio"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
          <h2 className="text-xl font-bold text-gray-800 truncate max-w-[200px]">{listName}</h2>
        </div>
        <button onClick={() => setShareModalOpen(true)} className="p-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition" title="Compartir lista">
          <Share2 className="w-5 h-5"/>
        </button>
      </div>

      {/* Modals */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <div className="flex items-center gap-2 mb-4 text-gray-800">
               <Users className="w-5 h-5"/> <h3 className="font-bold text-lg">Compartir Lista</h3>
            </div>
            
            <form onSubmit={handleInvite} className="flex gap-2 mb-4">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="amigo@email.com" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"/>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition">Añadir</button>
            </form>
            {shareStatus === 'success' && <p className="text-green-600 text-sm mb-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Usuario añadido.</p>}

            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Enlace de invitación</p>
              <div className="flex gap-2">
                <input readOnly value={generateShareLink()} className="flex-1 text-xs bg-white border px-2 py-1 rounded text-gray-600 truncate"/>
                <button onClick={copyShareLink} className="p-1.5 bg-white border rounded hover:bg-gray-100" title="Copiar"><Copy className="w-4 h-4 text-gray-600"/></button>
              </div>
            </div>

            {sharedUsers.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Compartido con:</p>
                <div className="flex flex-wrap gap-2">
                  {sharedUsers.map(email => (
                    <span key={email} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">{email}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><AlertTriangle className="text-red-600"/> <h3 className="font-bold">¿Vaciar {deleteConfirmation.name}?</h3></div>
            <p className="text-sm text-gray-600 mb-4">Esto eliminará **todos** los productos de este supermercado en la lista.</p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setDeleteConfirmation(null)} className="px-4 py-2 text-gray-600">Cancelar</button>
              <button onClick={executeClearSupermarket} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Vaciar</button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO AÑADIR */}
      <div className="bg-white rounded-2xl shadow-lg p-6 relative">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-700"><Plus className="text-green-600"/> Añadir Producto</h2>
          <form onSubmit={handleAddItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Input Producto */}
              <div className="md:col-span-7 relative">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400"/>
                  <input
                    type="text"
                    value={productName}
                    autoComplete="off"
                    onChange={(e)=>{
                      setProductName(e.target.value);
                      if(e.target.value.length>0) {
                        setSuggestions(COMMON_PRODUCTS.filter(p=>p.toLowerCase().includes(e.target.value.toLowerCase())).slice(0,5));
                        setShowSuggestions(true);
                      } else setShowSuggestions(false);
                    }}
                    placeholder="¿Qué falta?"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900"
                  />
                  {productName && (
                    <button 
                      type="button" 
                      onClick={() => setProductName("")} 
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 bg-transparent border-none hover:bg-transparent"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {suggestions.map((s,i)=>(
                        <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); setProductName(s); setShowSuggestions(false); }} className="w-full text-left px-4 py-3 hover:bg-green-50 active:bg-green-100 border-b border-gray-50 last:border-b-0">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* CONTROL DE CANTIDAD (Nuevo Diseño) */}
              <div className="md:col-span-5">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Cantidad</label>
                   <div className="flex items-center gap-2 h-[42px]">
                      <button 
                        type="button"
                        onClick={() => handleFormQtyChange(-1)}
                        className={`w-12 h-full flex items-center justify-center rounded-xl transition ${
                          quantity === 1 
                            ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'
                        }`}
                      >
                        {quantity === 1 ? <Trash2 className="w-5 h-5"/> : <Minus className="w-5 h-5"/>}
                      </button>
                      
                      <div className="flex-1 h-full bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center font-bold text-gray-800 text-lg">
                        {quantity}
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleFormQtyChange(1)}
                        className="w-12 h-full bg-yellow-400 text-yellow-900 hover:bg-yellow-500 rounded-xl flex items-center justify-center transition shadow-sm font-bold"
                      >
                        <Plus className="w-5 h-5"/>
                      </button>
                   </div>
              </div>
            </div>

            {/* Supermercados */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Supermercado</label>
                {!isCreatingSuper && (
                    <button type="button" onClick={() => setIsCreatingSuper(true)} className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                        <Plus className="w-3 h-3"/> Nuevo Súper
                    </button>
                )}
              </div>
              
              {isCreatingSuper && (
                  <div className="mb-3 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={newSuperName} 
                          onChange={e => setNewSuperName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSupermarket(); } }}
                          autoComplete="off"
                          placeholder="Nombre del Súper..."
                          className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 text-sm"
                          autoFocus
                        />
                        {newSuperName && (
                          <button 
                              type="button" 
                              onClick={() => setNewSuperName("")} 
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none hover:bg-transparent"
                          >
                              <X className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                    <button type="button" onClick={handleCreateSupermarket} disabled={!newSuperName.trim()} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">Añadir</button>
                    <button type="button" onClick={() => setIsCreatingSuper(false)} className="bg-gray-100 text-gray-500 px-2 rounded-lg hover:bg-gray-200"><X className="w-4 h-4"/></button>
                  </div>
              )}

              {supermarkets.length === 0 ? (
                  <div className="text-sm text-gray-400 italic text-center border-2 border-dashed border-gray-100 rounded-lg p-3">No hay supermercados. ¡Crea el primero!</div>
              ) : (
                  <div className="flex flex-wrap gap-2">
                    {supermarkets.map((sup) => (
                      <button key={sup.name} type="button" onClick={()=>setSelectedSupermarket(sup.name)} className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-sm font-medium border transition-all ${selectedSupermarket===sup.name?`${sup.color} text-white shadow-md transform scale-105`:'bg-white text-gray-600 hover:bg-gray-50'}`}>{sup.name}</button>
                    ))}
                  </div>
              )}
            </div>

            <button type="submit" disabled={!productName.trim() || supermarkets.length === 0} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black transition active:scale-95 disabled:opacity-50">Añadir Producto</button>
          </form>
      </div>

      {/* GRID RESULTADOS (Con Controles de Cantidad en la Lista) */}
      {loading ? (
          <div className="text-center py-10 text-gray-400 animate-pulse">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
            <Store className="w-16 h-16 text-gray-200 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-600">Lista vacía</h3>
            <p className="text-gray-400 text-sm mt-1">Añade supermercados y productos para empezar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {activeGridSupermarkets.map((sup) => {
              const supItems = items.filter(i => i.supermarket === sup.name);
              return (
                <div key={sup.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className={`${sup.light} p-3 border-b border-gray-100 flex justify-between items-center`}>
                    <div>
                      <h3 className={`font-bold ${sup.text} text-sm uppercase tracking-wider`}>{sup.name}</h3>
                      <span className="text-xs text-gray-400">{supItems.length} items</span>
                    </div>
                    <button onClick={()=>setDeleteConfirmation({name:sup.name})} className="p-1.5 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition"><RefreshCcw className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className="p-2 space-y-2">
                    {supItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-gray-900 block truncate leading-tight" title={item.name}>{item.name}</span>
                          <span className="text-xs text-gray-400">{item.addedBy ? `por ${item.addedBy}` : ''}</span>
                        </div>
                        
                        {/* CONTROLES DE CANTIDAD EN ITEM */}
                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
                                    item.quantity === 1 
                                    ? 'bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200' 
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                }`}
                            >
                                {item.quantity === 1 ? <Trash2 className="w-4 h-4"/> : <Minus className="w-4 h-4"/>}
                            </button>
                            
                            <span className="w-6 text-center font-bold text-gray-800 text-sm">
                                {item.quantity}
                            </span>
                            
                            <button 
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                className="w-8 h-8 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 rounded-full flex items-center justify-center transition shadow-sm"
                            >
                                <Plus className="w-4 h-4"/>
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// --- COMPONENTE DASHBOARD ---
function Dashboard({ currentUser, onSelectList }) {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmationList, setDeleteConfirmationList] = useState(null);
  const [renameListId, setRenameListId] = useState(null);
  const [renameNewName, setRenameNewName] = useState("");

  useEffect(() => {
    const q1 = query(collection(db, 'shopping_lists'), where("owner", "==", currentUser.email));
    const q2 = query(collection(db, 'shopping_lists'), where("sharedWith", "array-contains", currentUser.email));

    let myLists = [];
    let sharedLists = [];

    const unsub1 = onSnapshot(q1, (snap) => {
      myLists = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'mine' }));
      updateState();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      sharedLists = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'shared' }));
      updateState();
    });

    const updateState = () => {
      const all = [...myLists, ...sharedLists].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      const unique = all.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
      setLists(unique);
      setLoading(false);
    };

    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await addDoc(collection(db, 'shopping_lists'), {
        name: newListName.trim(),
        owner: currentUser.email,
        sharedWith: [],
        supermarkets: [], // Inicialmente vacía de supermercados
        createdAt: serverTimestamp()
      });
      setNewListName("");
    } catch (e) { console.error(e); }
  };
  
  // NUEVA FUNCIÓN: ELIMINAR LISTA
  const handleDeleteList = async (listId) => {
      await deleteDoc(doc(db, 'shopping_lists', listId));
      setDeleteConfirmationList(null);
  };
  
  // NUEVA FUNCIÓN: RENOMBRAR LISTA
  const handleRenameList = async (e) => {
      e.preventDefault();
      if (!renameNewName.trim() || !renameListId) return;

      try {
          await updateDoc(doc(db, 'shopping_lists', renameListId), {
              name: renameNewName.trim()
          });
          setRenameListId(null);
          setRenameNewName("");
      } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      <GlobalStyles />
       {/* Modal de Confirmación de Eliminar */}
       {deleteConfirmationList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><AlertTriangle className="text-red-600"/> <h3 className="font-bold">¿Eliminar '{deleteConfirmationList.name}'?</h3></div>
            <p className="text-sm text-gray-600 mb-4">Esta acción es permanente y eliminará también todos sus productos.</p>
            <div className="flex justify-end gap-3">
              <button onClick={(e)=>{ e.stopPropagation(); setDeleteConfirmationList(null); }} className="px-4 py-2 text-gray-600">Cancelar</button>
              <button onClick={(e)=>{ e.stopPropagation(); handleDeleteList(deleteConfirmationList.id); }} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Renombrar */}
      {renameListId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                  <button onClick={() => setRenameListId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                  <div className="flex items-center gap-2 mb-4 text-gray-800">
                     <Edit className="w-5 h-5"/> <h3 className="font-bold text-lg">Renombrar Lista</h3>
                  </div>
                  <form onSubmit={handleRenameList} className="flex flex-col gap-4">
                      <input 
                          type="text" 
                          value={renameNewName} 
                          onChange={e => setRenameNewName(e.target.value)} 
                          placeholder="Nuevo nombre" 
                          className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                          autoFocus
                      />
                      <button type="submit" disabled={!renameNewName.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition disabled:opacity-50">Renombrar</button>
                  </form>
              </div>
          </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl shadow-lg">
           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="text-green-600"/> Nueva Lista</h2>
           <form onSubmit={handleCreateList} className="flex gap-2">
             <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ej: Barbacoa, Casa..." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"/>
             <button type="submit" disabled={!newListName.trim()} className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition disabled:opacity-50">Crear</button>
           </form>
         </div>

         <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">Mis Listas</h3>
            {loading ? <div className="text-center py-10 text-gray-400">Cargando listas...</div> : lists.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-400">No tienes ninguna lista creada.</p></div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map(list => (
                   <div key={list.id} className="relative w-full">
                       <button onClick={() => onSelectList(list)} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition text-left group relative overflow-hidden w-full">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><ShoppingCart className="w-16 h-16 text-green-600 transform rotate-12"/></div>
                          <h4 className="font-bold text-lg text-gray-800 mb-1 pr-16">{list.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             {list.type === 'mine' ? <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Propietario</span> : <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3"/> Compartida</span>}
                             <span>• {list.createdAt?.toDate().toLocaleDateString()}</span>
                          </div>
                       </button>
                       {/* BOTONES DE ACCIÓN */}
                       {list.type === 'mine' && (
                           <div className="absolute top-2 right-2 flex gap-1 z-10">
                               <button 
                                   onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setRenameListId(list.id);
                                       setRenameNewName(list.name);
                                   }} 
                                   title="Renombrar"
                                   className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
                               >
                                   <Edit className="w-4 h-4"/>
                               </button>
                               <button 
                                   onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setDeleteConfirmationList(list); 
                                   }} 
                                   title="Eliminar"
                                   className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                               >
                                   <Trash2 className="w-4 h-4"/>
                               </button>
                           </div>
                       )}
                   </div>
                ))}
               </div>
            )}
         </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState('home');
  const [currentList, setCurrentList] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const params = new URLSearchParams(window.location.search);
        const listIdParam = params.get('listId');
        if (listIdParam) {
           getDoc(doc(db, 'shopping_lists', listIdParam)).then((snap) => {
             if (snap.exists()) {
               const data = snap.data();
               const isOwner = data.owner === u.email;
               const isShared = data.sharedWith?.includes(u.email);
               if (isOwner || isShared) {
                 setCurrentList({ id: snap.id, ...data });
                 setView('list');
               } else {
                 if(!isOwner && !isShared) {
                    alert("No tienes permiso. Pide acceso a: " + u.email);
                    window.history.replaceState({}, document.title, window.location.pathname);
                 }
               }
             }
           });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !password) { setAuthError("Completa todos los campos"); return; }
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { setAuthError("Error de autenticación."); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null); setView('home'); setCurrentList(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans w-full">
        <GlobalStyles />
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <div className="bg-green-100 p-5 rounded-full mb-6 inline-block shadow-sm"><ShoppingCart className="w-10 h-10 text-green-600" /></div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Súper Lista</h1>
          <p className="text-gray-500 mb-6">{isRegistering ? "Crea tu cuenta" : "Inicia sesión"}</p>
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div><label className="text-xs font-bold text-gray-500 ml-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none" required /></div></div>
            <div><label className="text-xs font-bold text-gray-500 ml-1">Contraseña</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none" required /></div></div>
            {authError && <div className="text-sm text-red-500 bg-red-50 p-2 rounded-lg text-center">{authError}</div>}
            <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition">{isRegistering ? "Registrarse" : "Entrar"}</button>
          </form>
          <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
            {isRegistering ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }} className="text-green-600 font-bold hover:underline">{isRegistering ? "Entrar" : "Regístrate"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12 w-full">
      <GlobalStyles />
      <header className="bg-white shadow-sm sticky top-0 z-20 w-full">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center w-full">
          <div className="flex items-center gap-2 text-green-700 cursor-pointer" onClick={() => { setView('home'); setCurrentList(null); }}>
            <ShoppingCart className="w-6 h-6"/><h1 className="text-lg font-bold hidden sm:block">Súper Lista</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full pl-1 pr-3 py-1"><UserCircle className="w-6 h-6 text-gray-400"/><span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">{user.displayName || user.email?.split('@')[0]}</span></div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><LogOut className="w-5 h-5"/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 w-full">
        {view === 'home' ? (
          <Dashboard currentUser={user} onSelectList={(list) => { setCurrentList(list); setView('list'); }}/>
        ) : (
          <ShoppingListView 
            listId={currentList.id} 
            listName={currentList.name}
            currentUser={user}
            onBack={() => { setView('home'); setCurrentList(null); window.history.replaceState({}, document.title, window.location.pathname); }}
          />
        )}
      </main>
    </div>
  );
}