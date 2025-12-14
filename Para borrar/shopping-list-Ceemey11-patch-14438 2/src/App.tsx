// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithCustomToken, // Importación necesaria para Canvas auth
  signInAnonymously // Importación necesaria para Canvas auth
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
  getDoc,
  getDocs,
  orderBy // Importar orderBy para ordenar listas
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
  Edit,
  Sparkles
} from 'lucide-react';

// --- YOUR FIREBASE CONFIGURATION (USE CANVAS GLOBALS) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
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

// --- CONFIGURACIÓN DE RUTAS DE FIRESTORE PARA CANVAS ---
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const LIST_COLLECTION_NAME = 'shopping_lists';

// Colección pública (para que varias personas puedan compartir y acceder a documentos)
const getListCollectionRef = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', LIST_COLLECTION_NAME);

// Subcolección para ítems de una lista específica
const getItemCollectionRef = (listId) => collection(db, 'artifacts', APP_ID, 'public', 'data', LIST_COLLECTION_NAME, listId, 'items');
// --- FIN CONFIGURACIÓN DE RUTAS DE FIRESTORE ---

// --- Color Palette for Dynamic Shops ---
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

// --- Helper Functions ---
const toTitleCase = (str) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// --- Global Styles to fix Vite/StackBlitz Layout ---
// This overwrites default styles that center the app and make it dark
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

// --- Función para actualizar la marca de tiempo de la lista ---
const updateListTimestamp = async (listId) => {
    try {
        await updateDoc(doc(getListCollectionRef(db), listId), {
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error updating list timestamp:", e);
    }
};

// --- INDIVIDUAL LIST COMPONENT ---
function ShoppingListView({ listId, listName, onBack, currentUser }) {
  // Renombrado de 'categories' a 'shops'
  const [items, setItems] = useState([]);
  const [shops, setShops] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  // STATES for shop management
  const [shopActionConfirmation, setShopActionConfirmation] = useState(null); // { name: string, type: 'delete' | 'clear' }
  const [renameShop, setRenameShop] = useState(null); // { oldName: string, newName: string }
  
  // Form states
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedShop, setSelectedShop] = useState(""); // Renombrado
  
  // States for creating new shop
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  // Share States
  const [inviteEmail, setInviteEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);

  // GEMINI API States
  const [generatedIdeas, setGeneratedIdeas] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load items and shops
  useEffect(() => {
    const q = query(getItemCollectionRef(listId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(fetchedItems);
      setLoading(false);
    });

    const unsubList = onSnapshot(doc(getListCollectionRef(db), listId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSharedUsers(data.sharedWith || []);
        
        // El campo en DB se mantiene como 'supermarkets' por compatibilidad
        const loadedShops = data.supermarkets || []; 
        setShops(loadedShops);

        if (loadedShops.length > 0) {
            setSelectedShop(prev => {
              const exists = loadedShops.some(s => s.name === prev);
              return exists ? prev : loadedShops[0].name;
            });
        } else {
            setSelectedShop("");
        }
      }
    });

    return () => { unsubscribe(); unsubList(); };
  }, [listId]);

  const activeGridShops = useMemo(() => {
    // Usamos item.supermarket porque es el nombre del campo en Firestore
    const shopsWithItems = shops.filter(cat => 
      items.some(item => item.supermarket === cat.name)
    );
    return shopsWithItems.sort((a, b) => {
      const countA = items.filter(i => i.supermarket === a.name).length;
      const countB = items.filter(i => i.supermarket === b.name).length;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [items, shops]); // Changed dependency 'categories' to 'shops'

  // --- GEMINI API FUNCTION: GENERATE IDEAS ---
  const handleGenerateIdeas = async () => {
    if (!selectedShop) {
        console.error("Please select a Shop/Location first.");
        return;
    }

    setIsGenerating(true);
    setGeneratedIdeas([]);
    
    // System instruction to guide the model's tone and format
    const systemPrompt = `You are a creative assistant specialized in list building. Your task is to suggest 5 practical and useful items to add to the shopping list based on the list's context and the current shop/location. Provide the items as a numbered list, one item per line, without extra dialogue or introduction.`;

    // User query based on context
    const userQuery = `The list is named "${listName}" and the current shop/location is "${selectedShop}". Suggest 5 items that could be needed.`;

    const apiKey = ""; // Canvas will provide this
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API returned status ${response.status}`);
            
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                // Parse the text response (split by newline, clean up numbering/whitespace)
                const ideas = text.split('\n')
                    .map(line => line.replace(/^\s*\d+\.\s*/, '').trim()) // Remove leading numbers (1., 2., etc.) and whitespace
                    .filter(line => line.length > 0)
                    .slice(0, 5); // Take max 5 clean ideas

                setGeneratedIdeas(ideas);
                break; // Exit loop on success
            }
        } catch (error) {
            console.error(`Attempt ${attempts + 1} failed:`, error);
            attempts++;
            if (attempts < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000)); // Exponential backoff
            }
        }
    }

    setIsGenerating(false);
  };
  // --- END GEMINI API FUNCTION ---

  // Database actions (Product List)
  const handleUpdateQuantity = async (itemId, currentQty, change) => {
    const newQty = currentQty + change;
    
    if (newQty < 1) {
        await deleteDoc(doc(getItemCollectionRef(listId), itemId));
    } else {
        await updateDoc(doc(getItemCollectionRef(listId), itemId), {
            quantity: newQty
        });
    }
    await updateListTimestamp(listId); // Actualizar timestamp
  };

  const handleDeleteItem = async (id) => {
    await deleteDoc(doc(getItemCollectionRef(listId), id));
    await updateListTimestamp(listId); // Actualizar timestamp
  };

  // Local actions (Add Form)
  const handleFormQtyChange = (change) => {
    const newQty = quantity + change;
    if (newQty < 1) {
        setProductName("");
        setQuantity(1);
    } else {
        setQuantity(newQty);
    }
  };

  // Función renombrada
  const handleCreateShop = async (e) => {
    if (e) e.preventDefault(); 
    if (!newShopName.trim()) return;
    
    const normalizedNewName = toTitleCase(newShopName.trim());
    // Usamos 'shops' en el estado local
    if (shops.some(s => s.name === normalizedNewName)) {
        console.error("Shop already exists."); // Cambiado el mensaje
        return;
    }

    const colorIndex = shops.length % COLOR_PALETTE.length;
    const newStyle = COLOR_PALETTE[colorIndex];
    
    const newShop = {
        ...newStyle,
        name: normalizedNewName
    };

    try {
        // El campo en DB se mantiene como 'supermarkets'
        await updateDoc(doc(getListCollectionRef(db), listId), {
            supermarkets: arrayUnion(newShop)
        });
        await updateListTimestamp(listId); // Actualizar timestamp
        setSelectedShop(newShop.name); // Renombrado
        setNewShopName(""); 
        setIsCreatingShop(false); 
    } catch (e) { console.error(e); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    
    // Usamos 'selectedShop'
    if (!selectedShop) {
        console.error("First add a Shop (e.g., Online Store, Local Market, Hardware Store...)"); // Cambiado el mensaje
        return;
    }

    try {
      await addDoc(getItemCollectionRef(listId), {
        name: toTitleCase(productName.trim()),
        quantity,
        // El campo en DB se mantiene como 'supermarket'
        supermarket: selectedShop, 
        createdAt: serverTimestamp(),
        addedBy: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.uid),
        completed: false
      });
      await updateListTimestamp(listId); // Actualizar timestamp
      setProductName("");
      setQuantity(1); 
    } catch (e) { console.error(e); }
  };

  // Función para añadir una idea generada
  const handleQuickAddIdea = async (idea, index) => {
    if (!selectedShop) return;

    try {
        await addDoc(getItemCollectionRef(listId), {
            name: toTitleCase(idea),
            quantity: 1,
            supermarket: selectedShop, 
            createdAt: serverTimestamp(),
            addedBy: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : currentUser.uid),
            completed: false
        });
        await updateListTimestamp(listId); 
        
        // Eliminar la idea de la lista de sugerencias
        setGeneratedIdeas(prev => prev.filter((_, i) => i !== index));

    } catch (e) { 
        console.error("Error adding generated item:", e); 
    }
  };


  // Función renombrada
  const executeClearShop = async () => {
    if (!shopActionConfirmation || shopActionConfirmation.type !== 'clear') return;
    
    const shopName = shopActionConfirmation.name;
    // Usamos item.supermarket para la consulta DB
    const itemsToDelete = items.filter(i => i.supermarket === shopName);
    
    setShopActionConfirmation(null);
    itemsToDelete.forEach(async (item) => {
      await deleteDoc(doc(getItemCollectionRef(listId), item.id));
    });
    if (itemsToDelete.length > 0) {
        await updateListTimestamp(listId); // Actualizar timestamp
    }
  };

  // Función renombrada
  const handleRenameShop = async (e) => {
    e.preventDefault();
    if (!renameShop || !renameShop.newName.trim()) {
        setRenameShop(null);
        return;
    }

    const oldName = renameShop.oldName;
    const newName = toTitleCase(renameShop.newName.trim());
    const listRef = doc(getListCollectionRef(db), listId);

    // Usamos 'shops' en el estado local
    const isDuplicate = shops.some(s => s.name === newName && s.name !== oldName);
    
    if (isDuplicate) {
        console.error("The new shop name already exists."); // Cambiado el mensaje
        setRenameShop(null); 
        return;
    }

    if (newName === oldName) {
        setRenameShop(null);
        return;
    }
    
    setRenameShop(null); 

    try {
      setItems(prevItems => prevItems.map(item => 
          // Usamos item.supermarket para la consulta DB
          item.supermarket === oldName ? { ...item, supermarket: newName } : item
      ));

      // Consulta y update usan 'supermarket'
      const itemsToUpdateQ = query(getItemCollectionRef(listId), where('supermarket', '==', oldName));
      const itemsSnapshot = await getDocs(itemsToUpdateQ);

      const updatePromises = itemsSnapshot.docs.map(itemDoc => {
          return updateDoc(doc(getItemCollectionRef(listId), itemDoc.id), {
              supermarket: newName
          });
      });
      
      Promise.all(updatePromises).catch(error => {
          console.error("Error updating subcollection items in DB:", error);
      });

      // El campo en DB se mantiene como 'supermarkets'
      const updatedShops = shops.map(s => {
        if (s.name === oldName) {
            return { ...s, name: newName };
        }
        return s;
      });

      await updateDoc(listRef, { supermarkets: updatedShops });
      await updateListTimestamp(listId); // Actualizar timestamp
      setShops(updatedShops); 
      
      if (selectedShop === oldName) {
        setSelectedShop(newName);
      }

    } catch (e) {
      console.error("Error renaming shop and updating items:", e); // Cambiado el mensaje
    }
  };

  // Función renombrada
  const handleDeleteShop = async () => {
    if (!shopActionConfirmation || shopActionConfirmation.type !== 'delete') return;

    const shopName = shopActionConfirmation.name;
    const listRef = doc(getListCollectionRef(db), listId);
    
    setShopActionConfirmation(null); 

    try {
        // Consulta y delete usan 'supermarket'
        const itemsToDeleteQ = query(getItemCollectionRef(listId), where('supermarket', '==', shopName));
        const itemsSnapshot = await getDocs(itemsToDeleteQ);

        const deletePromises = itemsSnapshot.docs.map(itemDoc => {
             return deleteDoc(doc(getItemCollectionRef(listId), itemDoc.id));
        });
        await Promise.all(deletePromises);


        // El campo en DB se mantiene como 'supermarkets'
        const updatedShops = shops.filter(s => s.name !== shopName);
        await updateDoc(listRef, { supermarkets: updatedShops });
        await updateListTimestamp(listId); // Actualizar timestamp
        
        setShops(updatedShops); 

        if (selectedShop === shopName) {
            setSelectedShop(updatedShops.length > 0 ? updatedShops[0].name : "");
        }

    } catch (e) {
        console.error("Error deleting shop and its items:", e); // Cambiado el mensaje
    }
  };


  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await updateDoc(doc(getListCollectionRef(db), listId), {
        sharedWith: arrayUnion(inviteEmail.toLowerCase().trim())
      });
      await updateListTimestamp(listId); // Actualizar timestamp
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
    const link = generateShareLink();

    // Strategy 1: Use document.execCommand('copy') which is generally allowed in iframes
    const textarea = document.createElement('textarea');
    textarea.value = link;
    // Make the textarea invisible and append it to the body
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        setShareStatus("link-copied");
        setTimeout(() => setShareStatus(""), 2000);
    } catch (err) {
        console.error('Error copying using execCommand:', err);
        // Fallback to Strategy 2 (Modern API - may still be blocked, but good to try if execCommand fails)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                setShareStatus("link-copied");
                setTimeout(() => setShareStatus(""), 2000);
            }).catch(e => {
                console.error('Final clipboard copy failed:', e);
                // If both fail, the user will have to manually copy the URL from the input field
                setShareStatus("error");
                setTimeout(() => setShareStatus(""), 4000);
            });
        } else {
             // If no clipboard method works
            setShareStatus("error");
            setTimeout(() => setShareStatus(""), 4000);
        }
    } finally {
        // Clean up the textarea element
        document.body.removeChild(textarea);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <GlobalStyles />
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between sticky top-16 z-10">
        <div className="flex items-center gap-3">
          {/* BUTTON TO GO BACK HOME */}
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition" title="Go back home"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
          <h2 className="text-xl font-bold text-gray-800 truncate max-w-[200px]">{listName}</h2>
        </div>
        <button onClick={() => setShareModalOpen(true)} className="p-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition" title="Share list">
          <Share2 className="w-5 h-5"/>
        </button>
      </div>

      {/* Modals */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
            <div className="flex items-center gap-2 mb-4 text-gray-800">
               <Users className="w-5 h-5"/> <h3 className="font-bold text-lg">Share List</h3>
            </div>
            
            <form onSubmit={handleInvite} className="flex gap-2 mb-4">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="friend@email.com" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"/>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-black transition">Add</button>
            </form>
            {shareStatus === 'success' && <p className="text-green-600 text-sm mb-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> User added.</p>}
            {shareStatus === 'link-copied' && <p className="text-blue-600 text-sm mb-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Link copied to clipboard.</p>}
            {shareStatus === 'error' && <p className="text-red-600 text-sm mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Copy failed. Please copy the URL manually.</p>}


            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Invitation Link</p>
              <div className="flex gap-2">
                <input readOnly value={generateShareLink()} className="flex-1 text-xs bg-white border px-2 py-1 rounded text-gray-600 truncate"/>
                <button type="button" onClick={copyShareLink} className="p-1.5 bg-white border rounded hover:bg-gray-100" title="Copy"><Copy className="w-4 h-4 text-gray-600"/></button>
              </div>
            </div>

            {sharedUsers.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Shared with:</p>
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

      {/* SHOP ACTION CONFIRMATION MODAL */}
      {shopActionConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className={shopActionConfirmation.type === 'delete' ? "text-red-600" : "text-yellow-600"}/> 
                <h3 className="font-bold">
                    {shopActionConfirmation.type === 'delete' ? `Delete ${shopActionConfirmation.name} shop?` : `Clear ${shopActionConfirmation.name} shop?`}
                </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                {shopActionConfirmation.type === 'delete' 
                    ? `This action will delete the shop from your list AND all ${items.filter(i => i.supermarket === shopActionConfirmation.name).length} associated products.`
                    : "This action will ONLY delete the products from this shop from the list."
                }
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setShopActionConfirmation(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button 
                  onClick={shopActionConfirmation.type === 'delete' ? handleDeleteShop : executeClearShop} 
                  className={`px-4 py-2 rounded-lg font-bold ${shopActionConfirmation.type === 'delete' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-yellow-900'}`}
              >
                  {shopActionConfirmation.type === 'delete' ? 'Delete All' : 'Clear Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME SHOP MODAL */}
      {renameShop && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                  <button onClick={() => setRenameShop(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                  <div className="flex items-center gap-2 mb-4 text-gray-800">
                     <Edit className="w-5 h-5"/> <h3 className="font-bold text-lg">Rename Shop</h3>
                  </div>
                  <form onSubmit={handleRenameShop} className="flex flex-col gap-4">
                      <input 
                          type="text" 
                          value={renameShop.newName} 
                          onChange={e => setRenameShop({...renameShop, newName: e.target.value})} 
                          placeholder={renameShop.oldName} 
                          className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                          autoFocus
                      />
                      <button type="submit" disabled={!renameShop.newName.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition disabled:opacity-50">Rename</button>
                  </form>
              </div>
          </div>
      )}

      {/* ADD FORM */}
      <div className="bg-white rounded-2xl shadow-lg p-6 relative">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-700"><Plus className="text-green-600"/> Add Product</h2>
          <form onSubmit={handleAddItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Product Input */}
              <div className="md:col-span-7 relative">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Product</label>
                <div className="relative">
                  {/* Search icon removed to simplify input */}
                  <input
                    type="text"
                    value={productName}
                    autoComplete="off"
                    onChange={(e)=>{
                      setProductName(e.target.value);
                      // REMOVED: Suggestions logic
                    }}
                    placeholder="What's missing?"
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900"
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
                  {/* REMOVED: Suggestions JSX block */}
                </div>
              </div>
              
              {/* QUANTITY CONTROL */}
              <div className="md:col-span-5">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Quantity</label>
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

            {/* Shops/Ubicaciones */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Shop / Location</label>
                {!isCreatingShop && (
                    <button type="button" onClick={() => setIsCreatingShop(true)} className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                        <Plus className="w-3 h-3"/> New Shop
                    </button>
                )}
              </div>
              
              {isCreatingShop && (
                  <div className="mb-3 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={newShopName} 
                          onChange={e => setNewShopName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateShop(); } }}
                          autoComplete="off"
                          placeholder="Shop Name (e.g., Online Store, Local Market, Hardware Store...)"
                          className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-gray-900 text-sm"
                          autoFocus
                        />
                        {newShopName && (
                          <button 
                              type="button" 
                              onClick={() => setNewShopName("")} 
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none hover:bg-transparent"
                          >
                              <X className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                    <button type="button" onClick={handleCreateShop} disabled={!newShopName.trim()} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">Add</button>
                    <button type="button" onClick={() => setIsCreatingShop(false)} className="bg-gray-100 text-gray-500 px-2 rounded-lg hover:bg-gray-200"><X className="w-4 h-4"/></button>
                  </div>
              )}

              {shops.length === 0 ? (
                  <div className="text-sm text-gray-400 italic text-center border-2 border-dashed border-gray-100 rounded-lg p-3">No shops. Create the first one!</div>
              ) : (
                  <div className="flex flex-wrap gap-2">
                    {shops.map((cat) => (
                        // SELECTION BUTTON WITH ACTIONS
                        <div key={cat.name} className="relative group/super">
                            <button 
                                type="button" 
                                onClick={()=>setSelectedShop(cat.name)} 
                                className={`min-w-[100px] py-2 px-3 pr-16 rounded-lg text-sm font-medium border transition-all relative z-10 
                                ${selectedShop===cat.name ? `${cat.color} text-white shadow-md transform scale-105` : 'bg-white text-gray-600 hover:bg-gray-50'}
                                `}
                            >
                                {cat.name}
                            </button>
                            {/* ACTION BUTTONS (Now visible) */}
                            <div className="absolute right-0 top-0 h-full flex items-center p-1 z-20 transition-opacity">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRenameShop({ oldName: cat.name, newName: cat.name }); }} 
                                    title="Rename"
                                    className={`p-1 rounded-full text-xs transition z-30 opacity-75 hover:opacity-100 
                                    ${selectedShop===cat.name ? `bg-white/20 text-white hover:bg-white/40` : `bg-gray-100 text-gray-600 hover:bg-gray-200`}
                                    `}
                                >
                                    <Edit className="w-3 h-3"/>
                                </button>
                                {/* Delete button always visible */}
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShopActionConfirmation({ name: cat.name, type: 'delete' }); }} 
                                    title="Delete Shop"
                                    className={`p-1 rounded-full text-xs transition z-30 opacity-75 hover:opacity-100 
                                    ${selectedShop===cat.name ? `bg-red-500/50 text-white hover:bg-red-600/70` : `bg-red-100 text-red-600 hover:bg-red-200`}
                                    `}
                                >
                                    <X className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>

            {/* BUTTONS LAYOUT MODIFIED */}
            <div className="flex gap-4 items-center">
              <button 
                  type="submit" 
                  disabled={!productName.trim() || shops.length === 0} 
                  className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black transition active:scale-95 disabled:opacity-50"
              >
                  Add Product
              </button>
              <button 
                  type="button" 
                  onClick={handleGenerateIdeas}
                  disabled={!selectedShop || isGenerating}
                  title="Generate Ideas ✨"
                  className="w-12 h-12 flex items-center justify-center bg-yellow-400 text-yellow-900 rounded-xl shadow-lg hover:bg-yellow-500 transition active:scale-95 disabled:opacity-50"
              >
                  {isGenerating ? (
                      <RefreshCcw className="w-5 h-5 animate-spin"/>
                  ) : (
                      <Sparkles className="w-5 h-5"/>
                  )}
              </button>
            </div>
            {/* END BUTTONS LAYOUT MODIFIED */}
          </form>
      </div>
      
      {/* GENERATED IDEAS SECTION */}
      {generatedIdeas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-700"><Sparkles className="text-yellow-600"/> Quick Ideas from Gemini</h3>
          <div className="flex flex-wrap gap-2">
            {generatedIdeas.map((idea, index) => (
              <div key={index} className="bg-yellow-50 text-yellow-800 text-sm font-medium px-3 py-1.5 rounded-full border border-yellow-200 flex items-center gap-2">
                <span>{idea}</span>
                <button 
                  onClick={() => handleQuickAddIdea(idea, index)}
                  title={`Add ${idea}`}
                  className="text-green-600 hover:text-green-700 p-1 rounded-full bg-white transition"
                >
                  <Plus className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* RESULTS GRID (With Quantity Controls in the List) */}
      {loading ? (
          <div className="text-center py-10 text-gray-400 animate-pulse">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
            <Store className="w-16 h-16 text-gray-200 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-600">Empty List</h3>
            <p className="text-gray-400 text-sm mt-1">Add shops and products to start.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {activeGridShops.map((cat) => {
              // Usamos cat.name para buscar items en item.supermarket (campo DB)
              const catItems = items.filter(i => i.supermarket === cat.name);
              return (
                <div key={cat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className={`${cat.light} p-3 border-b border-gray-100 flex justify-between items-center`}>
                    <div>
                      <h3 className={`font-bold ${cat.text} text-sm uppercase tracking-wider`}>{cat.name}</h3>
                      <span className="text-xs text-gray-400">{catItems.length} items</span>
                    </div>
                    {/* ONLY KEEP THE CLEAR PRODUCTS BUTTON HERE */}
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setShopActionConfirmation({ name: cat.name, type: 'clear' })} 
                            title="Clear (Delete products)"
                            className="p-1.5 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition"
                        >
                            <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {catItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-gray-900 block truncate leading-tight" title={item.name} data-completed={item.completed}>
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-400">{item.addedBy ? `by ${item.addedBy}` : ''}</span>
                        </div>
                        
                        {/* QUANTITY CONTROLS ON ITEM */}
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

// --- DASHBOARD COMPONENT ---
function Dashboard({ currentUser, onSelectList }) {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmationList, setDeleteConfirmationList] = useState(null);
  const [renameListId, setRenameListId] = useState(null);
  const [renameNewName, setRenameNewName] = useState("");

  useEffect(() => {
    // Definimos el valor a usar para buscar el propietario/compartido.
    const identifier = currentUser.email && currentUser.email.includes('@') ? currentUser.email : currentUser.uid;

    // CONSULTAS SIN ORDER BY para evitar el error de índice
    const q1 = query(getListCollectionRef(db), where("owner", "==", identifier));
    const q2 = query(getListCollectionRef(db), where("sharedWith", "array-contains", identifier));

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
      // 1. Combinar listas
      const combined = [...myLists, ...sharedLists];
      
      // 2. Filtrar duplicados
      const unique = combined.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
      
      // 3. Ordenar la lista combinada final por el campo updatedAt (o createdAt como fallback) en JavaScript
      unique.sort((a, b) => {
          // Si dateA o dateB no tienen segundos (aún no guardados en Firebase), usamos 0
          const dateA = a.updatedAt || a.createdAt;
          const dateB = b.updatedAt || b.createdAt;

          // Se asume que dateA y dateB son objetos Timestamp de Firestore si existen
          const timeA = dateA?.seconds || 0;
          const timeB = dateB?.seconds || 0;

          // Orden descendente (más reciente primero: timeB - timeA)
          return timeB - timeA;
      });
      
      setLists(unique);
      setLoading(false);
    };

    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const ownerIdentifier = currentUser.email && currentUser.email.includes('@') ? currentUser.email : currentUser.uid;

    try {
      await addDoc(getListCollectionRef(db), {
        name: newListName.trim(),
        owner: ownerIdentifier,
        sharedWith: [],
        // Usamos 'supermarkets' en DB por compatibilidad con la estructura original
        supermarkets: [], 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp() // Inicializar updatedAt
      });
      setNewListName("");
    } catch (e) { console.error("Error creating list:", e); }
  };
  
  // FUNCTION: DELETE LIST
  const handleDeleteList = async (listId) => {
      await deleteDoc(doc(getListCollectionRef(db), listId));
      setDeleteConfirmationList(null);
  };
  
  // FUNCTION: RENAME LIST (Closure ensured with cleanup)
  const handleRenameList = async (e) => {
      e.preventDefault();
      
      const newName = renameNewName.trim();
      
      if (!newName || !renameListId) {
          setRenameListId(null);
          setRenameNewName("");
          return;
      }

      try {
          await updateDoc(doc(getListCollectionRef(db), renameListId), {
              name: newName,
              updatedAt: serverTimestamp() // Actualizar timestamp
          });
          
          setRenameListId(null);
          setRenameNewName("");
      } catch (e) { 
          console.error(e);
      } 
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      <GlobalStyles />
       {/* Delete Confirmation Modal */}
       {deleteConfirmationList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><AlertTriangle className="text-red-600"/> <h3 className="font-bold">Delete '{deleteConfirmationList.name}'?</h3></div>
            <p className="text-sm text-gray-600 mb-4">This action is permanent and will delete all its products.</p>
            <div className="flex justify-end gap-3">
              <button onClick={(e)=>{ e.stopPropagation(); setDeleteConfirmationList(null); }} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={(e)=>{ e.stopPropagation(); handleDeleteList(deleteConfirmationList.id); }} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameListId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                  <button onClick={() => setRenameListId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                  <div className="flex items-center gap-2 mb-4 text-gray-800">
                     <Edit className="w-5 h-5"/> <h3 className="font-bold text-lg">Rename List</h3>
                  </div>
                  <form onSubmit={handleRenameList} className="flex flex-col gap-4">
                      <input 
                          type="text" 
                          value={renameNewName} 
                          onChange={e => setRenameNewName(e.target.value)} 
                          placeholder="New name" 
                          className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                          autoFocus
                      />
                      <button type="submit" disabled={!renameNewName.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition disabled:opacity-50">Rename</button>
                  </form>
              </div>
          </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl shadow-lg">
           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="text-green-600"/> New List</h2>
           <form onSubmit={handleCreateList} className="flex gap-2">
             <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="E.g., Home Decor, Groceries, Construction... " className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"/>
             <button type="submit" disabled={!newListName.trim()} className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-black transition disabled:opacity-50">Create</button>
           </form>
         </div>

         <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">My Lists</h3>
            {loading ? <div className="text-center py-10 text-gray-400">Loading lists...</div> : lists.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-400">You don't have any lists created.</p></div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map(list => (
                   <div key={list.id} className="relative w-full">
                       <button onClick={() => onSelectList(list)} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition text-left group relative overflow-hidden w-full">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition"><ShoppingCart className="w-16 h-16 text-green-600 transform rotate-12"/></div>
                          <h4 className="font-bold text-lg text-gray-800 mb-1 pr-16">{list.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             {list.type === 'mine' ? <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Owner</span> : <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3"/> Shared</span>}
                             {/* Mostrar última actualización */}
                             {list.updatedAt ? (
                                <span className="text-gray-400">
                                   • Last updated: {new Date(list.updatedAt?.seconds * 1000).toLocaleDateString()} {new Date(list.updatedAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             ) : (
                                <span className="text-gray-400">
                                   • Created: {list.createdAt?.toDate().toLocaleDateString()}
                                </span>
                             )}
                          </div>
                       </button>
                       {/* ACTION BUTTONS */}
                       {list.type === 'mine' && (
                           <div className="absolute top-2 right-2 flex gap-1 z-10">
                               <button 
                                   onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setRenameListId(list.id);
                                       setRenameNewName(list.name);
                                   }} 
                                   title="Rename"
                                   className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
                               >
                                   <Edit className="w-4 h-4"/>
                               </button>
                               <button 
                                   onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setDeleteConfirmationList(list); 
                                   }} 
                                   title="Delete"
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

// --- MAIN COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState('home');
  const [currentList, setCurrentList] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Nuevo estado

  // FIX: Mover handleLogout al cuerpo principal para que sea accesible en el JSX de App
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null); setView('home'); setCurrentList(null);
  };

  useEffect(() => {
    // Variable para almacenar la función de limpieza de onAuthStateChanged
    let unsubscribeAuth = null;

    const initializeAuth = async () => {
        // 1. Perform initial sign-in required for Canvas/Firestore rules
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        try {
            if (token) {
                await signInWithCustomToken(auth, token);
            } else {
                // Fallback to anonymous sign-in if no custom token is available
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Initial Canvas authentication failed:", error);
            // Non-fatal, as user can log in via email/password later
        }

        // 2. Set up the state listener (This returns the unsubscribe function)
        unsubscribeAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setIsAuthReady(true); // Auth status is now confirmed/set
            
            if (u) {
                const params = new URLSearchParams(window.location.search);
                const listIdParam = params.get('listId');
                if (listIdParam) {
                   // FIX: Usar getListCollectionRef
                   getDoc(doc(getListCollectionRef(db), listIdParam)).then((snap) => {
                     if (snap.exists()) {
                       const data = snap.data();
                       // FIX: Usar UID si email no está disponible para el check de owner/shared
                       const identifier = u.email && u.email.includes('@') ? u.email : u.uid;
                       const isOwner = data.owner === identifier;
                       const isShared = data.sharedWith?.includes(identifier);

                       if (isOwner || isShared) {
                         setCurrentList({ id: snap.id, ...data });
                         setView('list');
                       } else {
                         if(!isOwner && !isShared) {
                            console.error("You do not have permission. Request access from: " + u.email);
                            // FIX: Capturar el SecurityError en el entorno de iframe
                            try {
                                window.history.replaceState({}, document.title, window.location.pathname);
                            } catch(e) {
                                console.warn("History modification blocked during deep link cleanup:", e.message);
                            }
                         }
                       }
                     }
                   });
                }
            }
        });
    };
    
    // Ejecutar la inicialización
    initializeAuth();

    // Devolver la función de limpieza que usará el listener de onAuthStateChanged
    return () => { 
        if (unsubscribeAuth) {
            unsubscribeAuth(); 
        }
    };

  }, []); // Run once on mount

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !password) { setAuthError("Please fill in all fields."); return; }
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { setAuthError("Authentication error."); }
  };

  // Si la autenticación no está lista, mostramos una pantalla de carga
  if (!isAuthReady) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <GlobalStyles />
            <div className="text-gray-500 flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 animate-spin"/> Loading application...
            </div>
        </div>
    );
  }


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans w-full">
        <GlobalStyles />
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <div className="bg-green-100 p-5 rounded-full mb-6 inline-block shadow-sm"><ShoppingCart className="w-10 h-10 text-green-600" /></div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Super List</h1>
          <p className="text-gray-500 mb-6">{isRegistering ? "Create your account" : "Log in"}</p>
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div><label className="text-xs font-bold text-gray-500 ml-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none" required /></div></div>
            <div><label className="text-xs font-bold text-gray-500 ml-1">Password</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none" required /></div></div>
            {authError && <div className="text-sm text-red-500 bg-red-50 p-2 rounded-lg text-center">{authError}</div>}
            <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition">{isRegistering ? "Register" : "Log In"}</button>
          </form>
          <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
            {isRegistering ? "Already have an account? " : "Don't have an account? "}
            <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }} className="text-green-600 font-bold hover:underline">{isRegistering ? "Log In" : "Register"}</button>
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
            <ShoppingCart className="w-6 h-6"/><h1 className="text-lg font-bold hidden sm:block">Super List</h1>
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
            // FIX: Envolver window.history.replaceState en try...catch
            onBack={() => { 
                setView('home'); 
                setCurrentList(null); 
                try { 
                    window.history.replaceState({}, document.title, window.location.pathname); 
                } catch(e) {
                    console.warn("History modification blocked:", e.message);
                }
            }}
          />
        )}
      </main>
    </div>
  );
}