
import React, { useState, useEffect, useMemo } from 'react';
import { Product, PackItem, Sale, Stats } from './types';
import { 
  getProducts, 
  addProductToDb, 
  deleteProductFromDb, 
  getSales, 
  addSaleToDb,
  updateProductInDb
} from './services/store';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  PackageIcon, PlusIcon, SearchIcon, LayersIcon, 
  TrendingUpIcon, DollarSignIcon, BoxIcon, TrashIcon, ShoppingCartIcon, XIcon, EditIcon, ChevronRightIcon
} from './components/Icons';
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';

// Interface simplifiée pour éviter les erreurs circulaires
interface SimpleUser {
  uid: string;
  email: string | null;
}

function App() {
  // Auth State - Utilisation de SimpleUser pour éviter le crash JSON
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('elhajiauto@gmail.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [search, setSearch] = useState('');
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'products' | 'packs'>('products');

  // Modals State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddPackOpen, setIsAddPackOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  
  // Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Form States
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', stock: 0, purchasePrice: 0, salePrice: 0, image: '', description: '', isOrderBased: false });
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  
  // Pack Form States
  const [newPackName, setNewPackName] = useState('');
  const [newPackPrice, setNewPackPrice] = useState(0);
  const [newPackStock, setNewPackStock] = useState(0);
  const [newPackImage, setNewPackImage] = useState('');
  const [newPackDescription, setNewPackDescription] = useState('');
  const [newPackIsOrderBased, setNewPackIsOrderBased] = useState(false);
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [packProductSearch, setPackProductSearch] = useState(''); 

  // Sell Form State
  const [sellQty, setSellQty] = useState(1);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
            uid: currentUser.uid,
            email: currentUser.email
        });
        setAuthLoading(false);
        loadData();
      } else {
        setUser(null);
        setAuthLoading(false);
        setProducts([]);
        setSales([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [fetchedProducts, fetchedSales] = await Promise.all([
        getProducts(),
        getSales()
      ]);
      setProducts(fetchedProducts);
      setSales(fetchedSales);
    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setLoginError("Accès refusé. Vérifiez vos identifiants.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Compute Stats
  const stats: Stats = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.totalPrice) || 0), 0);
    const totalProfit = sales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
    const totalSold = sales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    
    const stockValue = products.reduce((acc, p) => {
      // On ne compte la valeur du stock que pour les produits simples pour éviter les doublons avec les packs
      if (p.category === 'pack') return acc;
      const price = Number(p.purchasePrice) || 0;
      const stock = Number(p.stock) || 0;
      return acc + (price * stock);
    }, 0);

    return { revenue: totalRevenue, profit: totalProfit, totalSold, stockValue };
  }, [products, sales]);

  // --- ACTIONS ---

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsInfoModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
        const productData: Omit<Product, 'id'> = {
            name: newProduct.name || 'Produit Sans Nom',
            description: newProduct.description || '',
            purchasePrice: Number(newProduct.purchasePrice) || 0,
            salePrice: Number(newProduct.salePrice) || 0,
            stock: Number(newProduct.stock) || 0,
            category: 'simple',
            totalSold: 0,
            createdAt: Date.now(),
            image: newProduct.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(newProduct.name || 'P')}&background=random&size=200`,
            isOrderBased: newProduct.isOrderBased || false
        };

        const addedProduct = await addProductToDb(productData);
        if (addedProduct) {
            setProducts([addedProduct, ...products]);
            setIsAddProductOpen(false);
            setNewProduct({ name: '', stock: 0, purchasePrice: 0, salePrice: 0, image: '', description: '', isOrderBased: false });
        }
    } catch (error) {
        alert("Erreur: " + error);
    }
  };

  const handleAddPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (packItems.length === 0 || !user) return;

    try {
        const packCost = packItems.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
        
        const packData: Omit<Product, 'id'> = {
            name: newPackName,
            description: newPackDescription || '',
            purchasePrice: packCost,
            salePrice: Number(newPackPrice) || 0,
            stock: Number(newPackStock) || 0, 
            category: 'pack',
            packItems: packItems,
            totalSold: 0,
            createdAt: Date.now(),
            image: newPackImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(newPackName)}&background=random&size=200`,
            isOrderBased: newPackIsOrderBased
        };

        const addedPack = await addProductToDb(packData);
        if (addedPack) {
            setProducts([addedPack, ...products]);
            setIsAddPackOpen(false);
            setNewPackName('');
            setNewPackPrice(0);
            setNewPackStock(0);
            setNewPackImage('');
            setNewPackDescription('');
            setNewPackIsOrderBased(false);
            setPackItems([]);
        }
    } catch (error) {
        alert("Erreur: " + error);
    }
  };

  const addProductToPack = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (packItems.find(p => p.productId === productId)) return;

    setPackItems([...packItems, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitCost: Number(product.purchasePrice) || 0
    }]);
  };

  const updatePackItemQty = (index: number, qty: number) => {
    const newItems = [...packItems];
    newItems[index].quantity = qty;
    setPackItems(newItems);
  };

  const removePackItem = (index: number) => {
    const newItems = [...packItems];
    newItems.splice(index, 1);
    setPackItems(newItems);
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    const qty = Number(sellQty);
    if (qty > selectedProduct.stock && selectedProduct.category === 'simple' && !selectedProduct.isOrderBased) {
      alert("Stock insuffisant !");
      return;
    }

    const salePrice = Number(selectedProduct.salePrice) || 0;
    const purchasePrice = Number(selectedProduct.purchasePrice) || 0;
    const totalPrice = qty * salePrice;
    const profit = qty * (salePrice - purchasePrice);

    const saleData: Omit<Sale, 'id'> = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: qty,
      totalPrice,
      profit,
      date: Date.now()
    };

    try {
        await addSaleToDb(saleData, selectedProduct.stock);
        const updatedProducts = products.map(p => {
            if (p.id === selectedProduct.id) {
              return { 
                ...p, 
                stock: p.stock - qty, 
                totalSold: (p.totalSold || 0) + qty 
              };
            }
            return p;
        });
        setProducts(updatedProducts);
        setSales([{ id: 'temp_' + Date.now(), ...saleData } as Sale, ...sales]);
        setIsSellOpen(false);
        setIsInfoModalOpen(false);
        setSellQty(1);
        loadData();
    } catch (error) {
        alert("Erreur: " + error);
    }
  };
  
  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
        await deleteProductFromDb(productToDelete);
        setProducts(prev => prev.filter(p => p.id !== productToDelete));
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        setIsInfoModalOpen(false);
    } catch (error: any) {
        alert("Impossible de supprimer: " + error.message);
    }
  };

  const openEditModal = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setEditFormData({
        name: product.name,
        description: product.description || '',
        purchasePrice: Number(product.purchasePrice),
        salePrice: Number(product.salePrice),
        stock: Number(product.stock),
        image: product.image || '',
        isOrderBased: product.isOrderBased || false
    });
    setIsEditModalOpen(true);
  };
  
  const openSellModal = (e: React.MouseEvent, product: Product) => {
      e.stopPropagation();
      setSelectedProduct(product);
      setIsSellOpen(true);
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;
    
    try {
        await updateProductInDb(selectedProduct.id, {
            name: editFormData.name,
            description: editFormData.description,
            purchasePrice: Number(editFormData.purchasePrice),
            salePrice: Number(editFormData.salePrice),
            stock: Number(editFormData.stock),
            image: editFormData.image,
            isOrderBased: editFormData.isOrderBased
        });

        const updatedProducts = products.map(p => 
            p.id === selectedProduct.id 
                ? { ...p, ...editFormData, purchasePrice: Number(editFormData.purchasePrice), salePrice: Number(editFormData.salePrice), stock: Number(editFormData.stock), isOrderBased: editFormData.isOrderBased } as Product
                : p
        );
        setProducts(updatedProducts);
        setIsEditModalOpen(false);
        setIsInfoModalOpen(false);
    } catch (error) {
        alert("Erreur: " + error);
    }
  };

  // Filter products based on search AND current view (Simple Products vs Packs)
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const nameHasPack = p.name.toLowerCase().includes('pack');

    // Logic de filtration mise à jour
    let matchesType = false;
    
    if (currentView === 'packs') {
      // Afficher si c'est explicitement un pack OU si le nom contient "pack"
      matchesType = p.category === 'pack' || nameHasPack;
    } else {
      // Afficher si c'est explicitement simple OU (pas de catégorie ET pas "pack" dans le nom)
      matchesType = p.category === 'simple' || (!p.category && !nameHasPack);
    }

    return matchesSearch && matchesType;
  });

  const availableForPack = products.filter(p => 
    (!p.category || p.category === 'simple') && 
    p.name.toLowerCase().includes(packProductSearch.toLowerCase()) &&
    !packItems.find(item => item.productId === p.id)
  );

  const { cost: packTotalCost, profit: packTotalProfit } = useMemo(() => {
    const cost = packItems.reduce((acc, i) => acc + (i.unitCost * i.quantity), 0);
    const profit = newPackPrice - cost;
    return { cost, profit };
  }, [packItems, newPackPrice]);

  if (authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-400 font-medium animate-pulse">Chargement...</div>
            </div>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Visual */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 z-10"></div>
            <img 
                src="https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale mix-blend-overlay"
                alt="Stock Management" 
            />
            <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">M</div>
                    <span className="font-bold text-xl tracking-wide">Mercadona</span>
                </div>
                <div className="max-w-md">
                    <h1 className="text-5xl font-bold mb-6 leading-tight">Gérez votre stock avec élégance.</h1>
                    <p className="text-lg text-slate-300">La solution complète pour suivre vos produits, créer des packs et maximiser vos profits.</p>
                </div>
                <div className="text-sm text-slate-500">© 2024 Mercadona Inc.</div>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center lg:text-left">
                    <h2 className="text-3xl font-bold text-slate-900">Connexion</h2>
                    <p className="mt-2 text-slate-500">Heureux de vous revoir. Entrez vos identifiants.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Adresse Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                            placeholder="email@exemple.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {loginError && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {loginError}
                        </div>
                    )}

                    <button className="w-full bg-indigo-600 text-white h-12 rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-[1.01] shadow-xl shadow-indigo-600/20">
                        Accéder au Dashboard
                    </button>
                </form>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Ultra Modern */}
      <aside className="hidden md:flex flex-col w-20 lg:w-72 bg-white border-r border-slate-200 z-30 transition-all">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-slate-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20 shrink-0">
            M
          </div>
          <span className="font-bold text-xl text-slate-800 ml-4 hidden lg:block tracking-tight">Mercadona</span>
        </div>
        
        <div className="flex-1 py-8 px-4 space-y-2">
          <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 hidden lg:block">Navigation</div>
          
          <button 
            onClick={() => setCurrentView('products')} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all group ${currentView === 'products' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <PackageIcon className={`w-5 h-5 ${currentView === 'products' ? '' : 'group-hover:scale-110'} transition-transform`} />
            <span className="hidden lg:block">Les Produits</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('packs')} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all group ${currentView === 'packs' ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <LayersIcon className={`w-5 h-5 ${currentView === 'packs' ? '' : 'group-hover:scale-110'} transition-transform`} />
            <span className="hidden lg:block">Les Packs</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-all group">
            <XIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="hidden lg:block">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-20 sticky top-0">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
                {currentView === 'products' ? 'Les Produits' : 'Les Packs'}
             </h2>
             <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100">
                Pro
             </span>
          </div>
          
          <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
            <div className="relative group w-full max-w-md hidden sm:block">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher (Cmd+K)" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:shadow-lg transition-all"
              />
            </div>

            {/* NEW MOBILE ADD PACK BUTTON - ONLY ON PACK VIEW */}
            <button 
                onClick={() => setIsAddPackOpen(true)}
                className={`${currentView === 'packs' ? 'flex' : 'hidden'} md:hidden items-center gap-2 px-3 py-2.5 bg-amber-50 text-amber-600 text-sm font-semibold rounded-xl hover:bg-amber-100 transition-all active:scale-95 border border-amber-100`}
                title="Nouveau Pack"
              >
                <LayersIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Pack</span>
            </button>

            {/* MAIN ACTION BUTTON (Dynamic based on view) */}
            <button 
                onClick={() => currentView === 'packs' ? setIsAddPackOpen(true) : setIsAddProductOpen(true)}
                className={`flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all transform active:scale-95 ${currentView === 'packs' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}
              >
                {currentView === 'packs' ? <LayersIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">{currentView === 'packs' ? 'Créer Pack' : 'Ajouter Produit'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bonjour 👋</h1>
            <p className="text-slate-500">Voici ce qui se passe dans votre stock aujourd'hui.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
              title="Revenu Total" 
              value={`${stats.revenue.toFixed(2)} DH`} 
              icon={<DollarSignIcon />} 
              color="indigo"
              trend="+12.5%"
              isPositive={true}
            />
            <StatCard 
              title="Bénéfice Net" 
              value={`${stats.profit.toFixed(2)} DH`} 
              icon={<TrendingUpIcon />} 
              color="emerald"
              trend="+8.2%"
              isPositive={true} 
            />
            <StatCard 
              title="Ventes Totales" 
              value={`${stats.totalSold}`} 
              icon={<ShoppingCartIcon />} 
              color="blue"
              trend="+24"
              isPositive={true} 
            />
            <StatCard 
              title="Valeur Stock" 
              value={`${stats.stockValue.toFixed(2)} DH`} 
              icon={<BoxIcon />} 
              color="amber"
              trend="-2.4%"
              isPositive={false} 
            />
          </div>

          {/* Main Content - Product Grid */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Inventaire ({filteredProducts.length})</h3>
              </div>
              <div className="flex gap-2">
                 <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Exporter</button>
                 <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Filtres</button>
              </div>
            </div>

            <div className="p-6">
              {/* Force Grid to 7 columns on Desktop (lg+) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    className="group bg-white border border-slate-100 rounded-2xl p-3 hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer flex flex-col"
                    onClick={() => handleRowClick(product)}
                  >
                    {/* Image */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3">
                       <img 
                          src={product.image} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${product.name}` }}
                       />
                       {/* Overlay Actions */}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                              onClick={(e) => openSellModal(e, product)}
                              className="p-2 bg-white text-emerald-600 rounded-full hover:scale-110 transition-transform shadow-sm"
                              title="Vendre"
                          >
                              <ShoppingCartIcon className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => openEditModal(e, product)}
                              className="p-2 bg-white text-amber-500 rounded-full hover:scale-110 transition-transform shadow-sm"
                              title="Modifier"
                          >
                              <EditIcon className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => initiateDelete(e, product.id)}
                              className="p-2 bg-white text-rose-500 rounded-full hover:scale-110 transition-transform shadow-sm"
                              title="Supprimer"
                          >
                              <TrashIcon className="w-4 h-4" />
                          </button>
                       </div>
                       {/* Pack Badge */}
                       {product.category === 'pack' && (
                         <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1 z-10">
                           <LayersIcon className="w-3 h-3" /> Pack
                         </div>
                       )}
                       {/* Sur Commande Badge */}
                       {product.isOrderBased && (
                         <div className="absolute top-2 right-2 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1 z-10">
                           Sur Commande
                         </div>
                       )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col">
                       <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2" title={product.name}>{product.name}</h4>
                       
                       <div className="mt-auto pt-2 flex items-end justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Prix</div>
                            <div className="font-bold text-indigo-600">{(Number(product.salePrice) || 0).toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                             {product.category === 'simple' && (
                               <div className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                 {product.stock} en stock
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredProducts.length === 0 && (
                <div className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <SearchIcon className="w-8 h-8 opacity-30" />
                      </div>
                      <p className="text-lg font-medium text-slate-500">Aucun résultat</p>
                      <p className="text-sm">Essayez un autre terme de recherche</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}
      
      {/* Product Info Modal (Details) */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="Détails du Produit"
      >
        {selectedProduct && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative w-full sm:w-40 aspect-square rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                 <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                 />
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedProduct.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                      {selectedProduct.stock > 0 ? 'En Stock' : 'Rupture'}
                    </span>
                    {selectedProduct.isOrderBased && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-100">
                            Sur Commande
                        </span>
                    )}
                    <span className="text-xs text-slate-500">
                       Réf: {selectedProduct.id.substring(0,8).toUpperCase()}
                    </span>
                </div>
                {selectedProduct.description ? (
                  <p className="text-sm text-slate-600 mt-2">{selectedProduct.description}</p>
                ) : (
                    <p className="text-sm text-slate-400 italic mt-2">Aucune description disponible.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div className="p-4 rounded-2xl bg-slate-50 flex flex-col">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Prix Achat</span>
                 <span className="text-xl font-bold text-slate-700">{Number(selectedProduct.purchasePrice).toFixed(2)}</span>
               </div>
               <div className="p-4 rounded-2xl bg-indigo-50 flex flex-col">
                 <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Prix Vente</span>
                 <span className="text-xl font-bold text-indigo-700">{Number(selectedProduct.salePrice).toFixed(2)}</span>
               </div>
               <div className="p-4 rounded-2xl bg-emerald-50 flex flex-col">
                 <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Marge</span>
                 <span className="text-xl font-bold text-emerald-700">{(Number(selectedProduct.salePrice) - Number(selectedProduct.purchasePrice)).toFixed(2)}</span>
               </div>
               <div className="p-4 rounded-2xl bg-amber-50 flex flex-col">
                 <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Vendus</span>
                 <span className="text-xl font-bold text-amber-700">{selectedProduct.totalSold || 0}</span>
               </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-100">
              <button 
                onClick={(e) => openEditModal(e, selectedProduct)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Modifier
              </button>
              <button 
                onClick={(e) => openSellModal(e, selectedProduct)}
                className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                Nouvelle Vente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmation"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
             <TrashIcon className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Êtes-vous sûr ?</h3>
          <p className="text-slate-500 px-4 leading-relaxed">
            Vous êtes sur le point de supprimer ce produit. Cette action est irréversible et retirera toutes les données associées.
          </p>
          <div className="flex gap-4 pt-2">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        title="Ajouter au stock"
      >
        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nom du produit</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
              placeholder="Ex: T-Shirt Premium"
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-5">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prix Achat</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">DH</span>
                    <input 
                    type="number" min="0" step="0.01" required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                    value={newProduct.purchasePrice}
                    onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prix Vente</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">DH</span>
                    <input 
                    type="number" min="0" step="0.01" required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                    value={newProduct.salePrice}
                    onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})}
                    />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stock Initial</label>
            <input 
              type="number" min="0" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
              value={newProduct.stock}
              onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
            />
          </div>

          <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl border border-purple-200">
             <input 
               type="checkbox" 
               id="newProductOrderBased"
               className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
               checked={newProduct.isOrderBased || false}
               onChange={e => setNewProduct({...newProduct, isOrderBased: e.target.checked})}
             />
             <label htmlFor="newProductOrderBased" className="text-sm font-bold text-purple-800 cursor-pointer select-none">
               Sur commande
             </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Image & Description <span className="text-slate-300 font-normal normal-case">(Optionnel)</span></label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm mb-3"
              placeholder="https://... (Lien image)"
              value={newProduct.image || ''}
              onChange={e => setNewProduct({...newProduct, image: e.target.value})}
            />
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm h-20 resize-none"
              placeholder="Détails..."
              value={newProduct.description || ''}
              onChange={e => setNewProduct({...newProduct, description: e.target.value})}
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all mt-4">
            Ajouter le Produit
          </button>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Modification"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nom</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={editFormData.name || ''}
              onChange={e => setEditFormData({...editFormData, name: e.target.value})}
            />
          </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prix Achat</label>
                <input 
                    type="number" min="0" step="0.01" required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={editFormData.purchasePrice || 0}
                    onChange={e => setEditFormData({...editFormData, purchasePrice: Number(e.target.value)})}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prix Vente</label>
                <input 
                    type="number" min="0" step="0.01" required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={editFormData.salePrice || 0}
                    onChange={e => setEditFormData({...editFormData, salePrice: Number(e.target.value)})}
                />
            </div>
          </div>
          
          {selectedProduct?.category === 'simple' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stock</label>
              <input 
                type="number" min="0" required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                value={editFormData.stock || 0}
                onChange={e => setEditFormData({...editFormData, stock: Number(e.target.value)})}
              />
            </div>
          )}

          <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl border border-purple-200">
             <input 
               type="checkbox" 
               id="editProductOrderBased"
               className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
               checked={editFormData.isOrderBased || false}
               onChange={e => setEditFormData({...editFormData, isOrderBased: e.target.checked})}
             />
             <label htmlFor="editProductOrderBased" className="text-sm font-bold text-purple-800 cursor-pointer select-none">
               Sur commande
             </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Infos supplémentaires</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm mb-3"
              placeholder="URL Image"
              value={editFormData.image || ''}
              onChange={e => setEditFormData({...editFormData, image: e.target.value})}
            />
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-20 resize-none"
              placeholder="Description"
              value={editFormData.description || ''}
              onChange={e => setEditFormData({...editFormData, description: e.target.value})}
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all mt-4">
            Sauvegarder
          </button>
        </form>
      </Modal>

      {/* Add Pack Modal */}
      <Modal 
        isOpen={isAddPackOpen} 
        onClose={() => { setIsAddPackOpen(false); setPackProductSearch(''); }} 
        title="Création de Pack"
      >
        <form onSubmit={handleAddPack} className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-4 items-center">
             <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
               <LayersIcon className="w-5 h-5" />
             </div>
             <p className="text-sm text-amber-800">
               Regroupez vos produits pour créer des offres attractives et booster vos ventes moyennes.
             </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nom de l'offre</label>
            <input 
              type="text" required
              placeholder="Ex: Pack Hiver Complet"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              value={newPackName}
              onChange={e => setNewPackName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sélectionner des produits</label>
             <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
               <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                 <SearchIcon className="w-4 h-4 text-slate-400"/>
                 <input 
                   type="text"
                   placeholder="Tapez pour chercher..."
                   className="bg-transparent text-sm w-full outline-none"
                   value={packProductSearch}
                   onChange={e => setPackProductSearch(e.target.value)}
                 />
               </div>
               <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                 {availableForPack.map(p => (
                   <button
                     key={p.id}
                     type="button"
                     onClick={() => addProductToPack(p.id)}
                     className="flex items-center gap-3 p-2 hover:bg-amber-50 rounded-lg text-left w-full transition-all group"
                   >
                     <img src={p.image} className="w-8 h-8 rounded-lg object-cover bg-slate-100" alt="" />
                     <div className="flex-1">
                       <div className="text-sm font-semibold text-slate-700">{p.name}</div>
                     </div>
                     <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                       <PlusIcon className="w-3 h-3" />
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          </div>

          {/* Selected Items */}
          {packItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contenu</label>
              <div className="space-y-2">
                {packItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate ml-2">{item.productName}</span>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1">
                      <span className="text-xs text-slate-400">Qté</span>
                      <input 
                        type="number" min="1"
                        className="w-8 text-center text-sm font-bold bg-transparent outline-none"
                        value={item.quantity}
                        onChange={e => updatePackItemQty(index, Number(e.target.value))}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removePackItem(index)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-2"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stock Initial</label>
            <input 
              type="number" min="0" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              value={newPackStock}
              onChange={e => setNewPackStock(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl border border-purple-200">
             <input 
               type="checkbox" 
               id="newPackOrderBased"
               className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
               checked={newPackIsOrderBased}
               onChange={e => setNewPackIsOrderBased(e.target.checked)}
             />
             <label htmlFor="newPackOrderBased" className="text-sm font-bold text-purple-800 cursor-pointer select-none">
               Sur commande
             </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Coût de revient</p>
                <p className="text-xl font-bold text-slate-700">{packTotalCost.toFixed(2)} DH</p>
             </div>
             <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Prix Vente Pack</p>
                <div className="flex items-center gap-2 justify-end">
                    <input 
                        type="number" min="0" step="0.01" required
                        className="w-24 text-right bg-white border border-amber-200 rounded-lg px-2 py-1 font-bold text-amber-600 outline-none focus:ring-2 focus:ring-amber-500"
                        value={newPackPrice}
                        onChange={e => setNewPackPrice(Number(e.target.value))}
                    />
                    <span className="text-sm font-bold text-amber-600">DH</span>
                </div>
                <p className={`text-xs mt-1 font-bold ${packTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    Marge: {packTotalProfit > 0 ? '+' : ''}{packTotalProfit.toFixed(2)} DH
                </p>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Image & Description</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm mb-3"
              placeholder="URL Image"
              value={newPackImage}
              onChange={e => setNewPackImage(e.target.value)}
            />
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm h-16 resize-none"
              placeholder="Description marketing..."
              value={newPackDescription}
              onChange={e => setNewPackDescription(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={packItems.length === 0}
            className="w-full bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all"
          >
            Lancer le Pack
          </button>
        </form>
      </Modal>

      {/* Sell Modal */}
      <Modal 
        isOpen={isSellOpen} 
        onClose={() => { setIsSellOpen(false); setSellQty(1); }} 
        title="Nouvelle Vente"
      >
        {selectedProduct && (
          <form onSubmit={handleSell} className="space-y-8">
            <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <img src={selectedProduct.image} className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white" alt="" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedProduct.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Stock:</span>
                    <span className="text-sm font-bold text-slate-800">{selectedProduct.stock}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-center block text-xs font-bold text-slate-400 uppercase tracking-widest">Quantité</label>
              <div className="flex items-center justify-center gap-6">
                <button 
                  type="button" 
                  onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                  className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-md transition-all"
                >
                  -
                </button>
                <div className="w-20 text-center">
                    <span className="text-4xl font-black text-slate-800">{sellQty}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSellQty(selectedProduct.category === 'simple' ? Math.min(selectedProduct.stock, sellQty + 1) : sellQty + 1)}
                  className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-md transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-900/20 flex justify-between items-center text-white">
              <div>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Total</p>
                 <p className="text-xs opacity-60 mt-0.5">{selectedProduct.salePrice} DH / unité</p>
              </div>
              <span className="text-3xl font-black tracking-tight">
                {((Number(selectedProduct.salePrice) || 0) * sellQty).toFixed(2)} <span className="text-lg font-normal text-slate-400">DH</span>
              </span>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Valider l'encaissement
            </button>
          </form>
        )}
      </Modal>

    </div>
  );
}

export default App;
