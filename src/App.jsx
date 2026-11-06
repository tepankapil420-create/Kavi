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
  const [imagePreview, setImagePreview] = useState(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

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
