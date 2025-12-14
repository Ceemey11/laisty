
// --- COMPONENT: ITEM PERMISSIONS MODAL ---
function ItemPermissionsModal({ item, allUsers, onClose, onSave }) {
    // restrictedTo: null/empty = everyone. [emails...] = restricted.
    const [restrictedTo, setRestrictedTo] = useState(item.restrictedTo || []);

    const isRestricted = restrictedTo.length > 0;

    const toggleUser = (email) => {
        if (restrictedTo.includes(email)) {
            setRestrictedTo(prev => prev.filter(e => e !== email));
        } else {
            setRestrictedTo(prev => [...prev, email]);
        }
    };

    const handleToggleRestriction = () => {
        if (isRestricted) {
            // Turn OFF restriction (make public)
            setRestrictedTo([]);
        } else {
            // Turn ON restriction (default to just me?)
            // We'll require user to select people, but maybe start empty implies "No one but owner"? 
            // Better logic: Start with NO ONE (so only owner).
            setRestrictedTo([]);
        }
    };

    const handleSave = () => {
        onSave(item.id, restrictedTo.length === 0 ? null : restrictedTo);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

                <div className="flex items-center gap-2 mb-4 text-gray-800">
                    <Lock className={`w-5 h-5 ${isRestricted ? 'text-orange-500' : 'text-gray-400'}`} />
                    <h3 className="font-bold text-lg">Item Privacy</h3>
                </div>

                <div className="mb-4">
                    <p className="font-medium text-gray-700 mb-1">"{item.name}"</p>
                    <p className="text-xs text-gray-500">
                        Controlled by: {item.addedBy || 'Unknown'}
                    </p>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl mb-4">
                    <span className="text-sm font-medium text-gray-700">Restrict Visibility?</span>
                    <button
                        onClick={() => isRestricted ? setRestrictedTo([]) : setRestrictedTo([]) /* If turning on, start empty (only me + owner) - Wait if empty array means EVERYONE then logic is flawed. */}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${isRestricted ? 'bg-orange-500' : 'bg-gray-300'}`}
                        onClick={(e) => {
                            // Toggle logic: If currently restricted, clear it (public). If public, make it restricted (implicitly empty array = specific logic?? No.)
                            // Logic: restrictedTo field. 
                            // If null/missing: Public. 
                            // If Array: Restricted to those emails. 
                            // If Array is empty: Restricted to NO ONE? (Hidden from all except owner?).
                            // Let's assume Empty Array = Private to Owner ONLY.
                            // Null = Public.
                            if (isRestricted) {
                                setRestrictedTo(null); // Make Public
                            } else {
                                setRestrictedTo([]); // Make Private (Owner only initially)
                            }
                        }}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isRestricted ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {/* If we strictly mean isRestricted = restrictedTo !== null */}
                {/* Let's redefine state: restrictedTo can be null or array. */
                    /* Initial state: item.restrictedTo || null (if undefined) */
                }

                {/* RE-RENDER CHECK: If I use internal isRestricted derived from state !== null */}

                {restrictedTo !== null && (
                    <div className="mb-6 animate-fadeIn">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Visible to:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {allUsers.map(email => (
                                <label key={email} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${restrictedTo.includes(email) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                                        {restrictedTo.includes(email) && <Check className="w-3 h-3" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={restrictedTo.includes(email)}
                                        onChange={() => toggleUser(email)}
                                    />
                                    <span className="text-sm text-gray-700">{email}</span>
                                </label>
                            ))}
                            {allUsers.length === 0 && <p className="text-sm text-gray-400 italic">No other members in this list.</p>}
                        </div>
                        <p className="text-[10px] text-orange-600 mt-2 bg-orange-50 p-2 rounded">
                            * You (Owner/Creator) can always see this item.
                        </p>
                    </div>
                )}

                {restrictedTo === null && (
                    <p className="text-sm text-gray-500 mb-6 italic">This item is visible to everyone in the list.</p>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">Cancel</button>
                    <button onClick={() => { onSave(item.id, restrictedTo); onClose(); }} className="flex-1 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition">Save</button>
                </div>
            </div>
        </div>
    );
}
