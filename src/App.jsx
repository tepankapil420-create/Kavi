import React, { useEffect, useMemo, useState } from "react";
import { supabase, ADMIN_EMAIL, BUCKET } from "./supabase";
import {
  LayoutDashboard, Images, FolderTree, Settings, LogOut, Plus, Pencil,
  Trash2, Upload, X, Menu, Search, ChevronRight, Eye, EyeOff, RefreshCw
} from "lucide-react";

const emptyForm = { name: "", parent_id: "" };

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(!supabase);
  const [settings, setSettings] = useState({ brand_name: "YOUR BRAND", logo_url: null });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeMain, setActiveMain] = useState(null);
  const [activeSub, setActiveSub] = useState("all");
  const [adminTab, setAdminTab] = useState("products");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loginEmail, setLoginEmail] = useState(ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState("");
  const [categoryModal, setCategoryModal] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyForm);
  const [productModal, setProductModal] = useState(null);
  const [productForm, setProductForm] = useState({ code: "", category_id: "", image: null, is_active: true });
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next) => {
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  async function loadData() {
    if (!supabase) return;
    const [{ data: cats, error: catError }, { data: prods, error: prodError }, { data: site }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order").order("name"),
      supabase.from("products").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()
    ]);
    if (catError) setNotice(catError.message);
    if (prodError) setNotice(prodError.message);
    setCategories(cats || []);
    setProducts(prods || []);
    if (site) setSettings(site);
    const mains = (cats || []).filter(c => !c.parent_id);
    if (!activeMain && mains.length) setActiveMain(mains[0].id);
  }

  useEffect(() => { loadData(); }, [isAdmin]);

  const mains = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const subs = useMemo(() => categories.filter(c => c.parent_id === activeMain), [categories, activeMain]);
  const visibleProducts = useMemo(() => {
    let list = products.filter(p => p.is_active);
    if (activeSub !== "all") list = list.filter(p => p.category_id === activeSub);
    else if (activeMain) {
      const ids = categories.filter(c => c.parent_id === activeMain).map(c => c.id);
      list = list.filter(p => ids.includes(p.category_id));
    }
    if (search.trim()) list = list.filter(p => p.code.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, categories, activeMain, activeSub, search]);

  async function signIn(e) {
    e.preventDefault();
    setNotice("");
    if (loginEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setNotice("This email is not authorised for the admin panel.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setNotice(error.message);
    else { setLoginPassword(""); navigate("/admin"); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function uploadFile(file, prefix) {
    if (!file) return null;
    const safeName = `${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(safeName, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(safeName);
    return data.publicUrl;
  }

  async function saveCategory(e) {
    e.preventDefault();
    const payload = { name: categoryForm.name.trim(), parent_id: categoryForm.parent_id || null };
    if (!payload.name) return;
    const result = categoryModal?.id
      ? await supabase.from("categories").update(payload).eq("id", categoryModal.id)
      : await supabase.from("categories").insert(payload);
    if (result.error) return setNotice(result.error.message);
    setCategoryModal(null); setCategoryForm(emptyForm); await loadData();
    setNotice("Category saved.");
  }

  async function deleteCategory(category) {
    if (!confirm(`Delete "${category.name}" and its related items?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) setNotice(error.message); else { setNotice("Category deleted."); await loadData(); }
  }

  async function saveProduct(e) {
    e.preventDefault();
    try {
      let image_url = productModal?.image_url || "";
      if (productForm.image) image_url = await uploadFile(productForm.image, "product");
      if (!image_url) return setNotice("Please choose a product image.");
      const payload = {
        code: productForm.code.trim(),
        category_id: productForm.category_id,
        image_url,
        is_active: productForm.is_active
      };
      if (!payload.code || !payload.category_id) return setNotice("Enter a code and choose a subcategory.");
      const result = productModal?.id
        ? await supabase.from("products").update(payload).eq("id", productModal.id)
        : await supabase.from("products").insert(payload);
      if (result.error) return setNotice(result.error.message);
      setProductModal(null); setProductForm({ code: "", category_id: "", image: null, is_active: true });
      await loadData(); setNotice("Product saved.");
    } catch (err) { setNotice(err.message || "Image upload failed."); }
  }

  async function deleteProduct(product) {
    if (!confirm(`Delete product ${product.code}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) setNotice(error.message); else { setNotice("Product deleted."); await loadData(); }
  }

  async function toggleProduct(product) {
    const { error } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
    if (error) setNotice(error.message); else await loadData();
  }

  async function saveLogo(e) {
    e.preventDefault();
    try {
      if (!logoFile) return setNotice("Choose a logo image first.");
      const logo_url = await uploadFile(logoFile, "logo");
      const { error } = await supabase.from("site_settings").update({ logo_url, brand_name: settings.brand_name }).eq("id", 1);
      if (error) return setNotice(error.message);
      setLogoFile(null); await loadData(); setNotice("Brand logo updated.");
    } catch (err) { setNotice(err.message); }
  }

  if (loading) return <div className="center-screen">Loading catalogue…</div>;
  if (configMissing) return <SetupMessage />;
  if (path.startsWith("/admin") && !isAdmin) {
    return <div className="login-wrap">
      <form className="login-card" onSubmit={signIn}>
        <div className="brand-mark">A</div>
        <p className="eyebrow">SECURE AREA</p>
        <h1>Admin login</h1>
        <p className="muted">Sign in with your authorised admin account.</p>
        <label>Email address</label>
        <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
        {notice && <div className="notice">{notice}</div>}
        <button className="primary full" type="submit">Sign in</button>
        <button className="text-button full" type="button" onClick={() => navigate("/")}>Back to website</button>
      </form>
    </div>;
  }

  if (path.startsWith("/admin") && isAdmin) {
    return <div className="admin-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="side-brand"><div className="brand-mark small">A</div><span>Catalogue Admin</span></div>
        <div className="side-label">MANAGEMENT</div>
        <button className={adminTab === "products" ? "side-link active" : "side-link"} onClick={() => { setAdminTab("products"); setMobileNav(false); }}><Images size={18}/> Products</button>
        <button className={adminTab === "categories" ? "side-link active" : "side-link"} onClick={() => { setAdminTab("categories"); setMobileNav(false); }}><FolderTree size={18}/> Categories</button>
        <button className={adminTab === "settings" ? "side-link active" : "side-link"} onClick={() => { setAdminTab("settings"); setMobileNav(false); }}><Settings size={18}/> Brand settings</button>
        <div className="sidebar-bottom"><span className="muted tiny">{session.user.email}</span><button className="side-link" onClick={signOut}><LogOut size={18}/> Sign out</button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><button className="icon-button mobile-only" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><div><p className="eyebrow">CONTROL PANEL</p><h1>{adminTab === "products" ? "Products" : adminTab === "categories" ? "Categories" : "Brand settings"}</h1></div><button className="outline" onClick={() => navigate("/")}>View website <ChevronRight size={16}/></button></header>
        {notice && <div className="notice notice-row">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {adminTab === "products" && <section className="panel">
          <div className="panel-head"><div><h2>Product catalogue</h2><p className="muted">Upload images and assign unique product codes.</p></div><button className="primary" onClick={() => { setProductForm({ code: "", category_id: subs[0]?.id || "", image: null, is_active: true }); setProductModal({}); }}><Plus size={17}/> Add product</button></div>
          <div className="toolbar"><span className="muted">{products.length} total products</span><button className="icon-button" onClick={loadData}><RefreshCw size={17}/></button></div>
          <div className="admin-product-grid">{products.map(p => <div className="admin-product" key={p.id}><img src={p.image_url} alt={p.code}/><div className="admin-product-info"><b>{p.code}</b><span className={p.is_active ? "status live" : "status hidden"}>{p.is_active ? "Published" : "Hidden"}</span></div><div className="admin-actions"><button title="Edit" onClick={() => { setProductForm({ code: p.code, category_id: p.category_id, image: null, is_active: p.is_active }); setProductModal(p); }}><Pencil size={16}/></button><button title={p.is_active ? "Hide" : "Publish"} onClick={() => toggleProduct(p)}>{p.is_active ? <EyeOff size={16}/> : <Eye size={16}/>}</button><button title="Delete" onClick={() => deleteProduct(p)}><Trash2 size={16}/></button></div></div>)}</div>
        </section>}
        {adminTab === "categories" && <section className="panel">
          <div className="panel-head"><div><h2>Category management</h2><p className="muted">Manage main categories and subcategories.</p></div><button className="primary" onClick={() => { setCategoryForm(emptyForm); setCategoryModal({}); }}><Plus size={17}/> Add category</button></div>
          <div className="category-admin-list">{mains.map(main => <div className="category-admin-card" key={main.id}><div className="category-row"><b>{main.name}</b><div><button className="mini-action" onClick={() => { setCategoryForm({ name: main.name, parent_id: "" }); setCategoryModal(main); }}><Pencil size={15}/> Edit</button><button className="mini-action danger" onClick={() => deleteCategory(main)}><Trash2 size={15}/> Delete</button><button className="mini-action" onClick={() => { setCategoryForm({ name: "", parent_id: main.id }); setCategoryModal({}); }}><Plus size={15}/> Subcategory</button></div></div>{categories.filter(c => c.parent_id === main.id).map(sub => <div className="sub-row" key={sub.id}><span>↳ {sub.name}</span><div><button onClick={() => { setCategoryForm({ name: sub.name, parent_id: main.id }); setCategoryModal(sub); }}><Pencil size={14}/></button><button onClick={() => deleteCategory(sub)}><Trash2 size={14}/></button></div></div>)}</div>)}</div>
        </section>}
        {adminTab === "settings" && <section className="panel settings-panel"><h2>Brand settings</h2><p className="muted">Update the logo shown on your public catalogue.</p><form onSubmit={saveLogo}><label>Brand name</label><input value={settings.brand_name || ""} onChange={e => setSettings({ ...settings, brand_name: e.target.value })}/><label>Upload brand logo</label><input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)}/>{settings.logo_url && <img className="logo-preview" src={settings.logo_url} alt="Current logo"/>}<button className="primary" type="submit"><Upload size={17}/> Save logo</button></form></section>}
      </main>
      {categoryModal !== null && <div className="modal-backdrop" onClick={() => setCategoryModal(null)}><form className="modal" onClick={e => e.stopPropagation()} onSubmit={saveCategory}><button className="modal-close" type="button" onClick={() => setCategoryModal(null)}><X/></button><h2>{categoryModal?.id ? "Edit category" : "Add category"}</h2><label>Category name</label><input autoFocus value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required placeholder="e.g. Men, Women, Cars"/><label>Parent category</label><select value={categoryForm.parent_id} onChange={e => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}><option value="">Main category</option>{mains.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><button className="primary full" type="submit">Save category</button></form></div>}
      {productModal !== null && <div className="modal-backdrop" onClick={() => setProductModal(null)}><form className="modal" onClick={e => e.stopPropagation()} onSubmit={saveProduct}><button className="modal-close" type="button" onClick={() => setProductModal(null)}><X/></button><h2>{productModal?.id ? "Edit product" : "Add product"}</h2><label>Unique product code</label><input value={productForm.code} onChange={e => setProductForm({ ...productForm, code: e.target.value })} required placeholder="e.g. MEN001"/><label>Subcategory</label><select value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })} required><option value="">Select subcategory</option>{categories.filter(c => c.parent_id).map(c => <option key={c.id} value={c.id}>{mains.find(m => m.id === c.parent_id)?.name} / {c.name}</option>)}</select><label>Product image {productModal?.image_url && "(optional when replacing)"}</label><input type="file" accept="image/*" onChange={e => setProductForm({ ...productForm, image: e.target.files?.[0] || null })}/>{productModal?.image_url && <img className="modal-preview" src={productModal.image_url} alt="Current product"/>}<label className="checkbox-label"><input type="checkbox" checked={productForm.is_active} onChange={e => setProductForm({ ...productForm, is_active: e.target.checked })}/> Publish on website</label><button className="primary full" type="submit">Save product</button></form></div>}
    </div>;
  }

  return <div className="site">
    <header className="site-header"><button className="brand-lockup" onClick={() => navigate("/")}><div className="brand-logo">{settings.logo_url ? <img src={settings.logo_url} alt="Brand logo"/> : <span>{(settings.brand_name || "B").slice(0,1).toUpperCase()}</span>}</div><strong>{settings.brand_name || "YOUR BRAND"}</strong></button><a className="admin-link" href="/admin" onClick={e => { e.preventDefault(); navigate("/admin"); }}>Admin <ChevronRight size={15}/></a></header>
    <main className="catalogue">
      <div className="intro"><p className="eyebrow">OUR COLLECTION</p><h1>Explore the catalogue.</h1><p className="muted">Browse by category and find your product using its unique code.</p></div>
      <div className="main-categories">{mains.map((m, i) => <button key={m.id} className={`main-category ${activeMain === m.id ? "selected" : ""}`} onClick={() => { setActiveMain(m.id); setActiveSub("all"); }}><span className="category-number">0{i+1}</span><span>{m.name}</span><ChevronRight size={19}/></button>)}</div>
      <div className="catalogue-tools"><div className="tabs"><button className={activeSub === "all" ? "tab active" : "tab"} onClick={() => setActiveSub("all")}>All</button>{subs.map(s => <button key={s.id} className={activeSub === s.id ? "tab active" : "tab"} onClick={() => setActiveSub(s.id)}>{s.name}</button>)}</div><div className="search-box"><Search size={17}/><input placeholder="Search product code" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
      <div className="product-grid">{visibleProducts.map(p => <article className="product-card" key={p.id}><div className="product-image"><img src={p.image_url} alt={p.code} loading="lazy"/></div><div className="product-caption"><span>PRODUCT CODE</span><strong>{p.code}</strong></div></article>)}</div>
      {visibleProducts.length === 0 && <div className="empty-state"><Images size={34}/><h3>No products to show yet</h3><p>Products added from the admin panel will appear here.</p></div>}
    </main>
    <footer className="site-footer"><span>© {new Date().getFullYear()} {settings.brand_name || "Your Brand"}</span><span>Product Catalogue</span></footer>
  </div>;
}

function SetupMessage() {
  return <div className="setup-wrap"><div className="setup-card"><div className="brand-mark">A</div><p className="eyebrow">INITIAL SETUP REQUIRED</p><h1>Connect your catalogue</h1><p className="muted">Add your Supabase project URL and anon key to a <code>.env</code> file. Follow the README for the full setup, database schema, admin account and Vercel deployment.</p><ol><li>Create a Supabase project.</li><li>Run <code>supabase/schema.sql</code> in SQL Editor.</li><li>Create the authorised admin user in Supabase Authentication.</li><li>Copy <code>.env.example</code> to <code>.env</code> and add your project credentials.</li></ol><p className="muted tiny">Never put your Supabase service-role key or admin password in frontend code.</p></div></div>;
}

export default App;
