import { useState, useEffect, useRef } from "react";
import {
  Loader2, Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  Check, X, ToggleLeft, ToggleRight, UtensilsCrossed, ImagePlus, ImageOff, ImageIcon
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  active: boolean;
  imageUrl: string | null;
}

// Max size for an uploaded item image, before base64 encoding.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

interface Category {
  id: number;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

const API = "/api";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Inline editable text ──────────────────────────────────────────────────────
function InlineEdit({
  value, onSave, className,
}: { value: string; onSave: (v: string) => Promise<void>; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const save = async () => {
    if (!draft.trim() || draft.trim() === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    try { await onSave(draft.trim()); setEditing(false); }
    catch (e: any) { /* parent toasts */ }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className={cn("cursor-pointer hover:underline decoration-dotted underline-offset-2", className)}
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to rename"
      >{value}</span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        className="h-7 text-sm px-2 w-44"
        disabled={saving}
      />
      <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-500 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button onClick={() => { setEditing(false); setDraft(value); }} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </span>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────
function ItemRow({
  item, categories, onUpdate, onDelete,
}: {
  item: MenuItem;
  categories: Category[];
  onUpdate: (id: number, patch: Partial<Pick<MenuItem, "name" | "price" | "active" | "categoryId" | "imageUrl">>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(String(item.price));
  const [savingPrice, setSavingPrice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const priceRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Max size is 2MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await onUpdate(item.id, { imageUrl: dataUrl });
    } catch (err: any) {
      toast({ title: err.message ?? "Upload failed", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    setUploadingImage(true);
    try { await onUpdate(item.id, { imageUrl: null }); }
    catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    finally { setUploadingImage(false); }
  };

  useEffect(() => { if (editingPrice) priceRef.current?.select(); }, [editingPrice]);

  const savePrice = async () => {
    const val = parseFloat(priceDraft);
    if (isNaN(val) || val < 0) { toast({ title: "Invalid price", variant: "destructive" }); return; }
    if (val === item.price) { setEditingPrice(false); return; }
    setSavingPrice(true);
    try { await onUpdate(item.id, { price: val }); setEditingPrice(false); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSavingPrice(false); }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 border-border/50 transition-colors",
      !item.active && "opacity-50"
    )}>
      {/* Image */}
      <div className="shrink-0 relative w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border/50">
        {uploadingImage ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="shrink-0 flex flex-col gap-0.5">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title={item.imageUrl ? "Replace image" : "Upload image"}
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        {item.imageUrl && (
          <button
            onClick={removeImage}
            disabled={uploadingImage}
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
            title="Remove image"
          >
            <ImageOff className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={item.name}
          className="text-sm font-medium"
          onSave={async (name) => {
            try { await onUpdate(item.id, { name }); }
            catch (e: any) { toast({ title: e.message, variant: "destructive" }); throw e; }
          }}
        />
      </div>

      {/* Price */}
      <div className="shrink-0">
        {editingPrice ? (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">₹</span>
            <Input
              ref={priceRef}
              type="number"
              min={0}
              step={0.5}
              value={priceDraft}
              onChange={e => setPriceDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") savePrice(); if (e.key === "Escape") { setEditingPrice(false); setPriceDraft(String(item.price)); } }}
              className="h-7 w-24 text-sm px-2 font-mono"
              disabled={savingPrice}
            />
            <button onClick={savePrice} disabled={savingPrice} className="text-green-600 hover:text-green-500 disabled:opacity-50">
              {savingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setEditingPrice(false); setPriceDraft(String(item.price)); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : (
          <button
            onClick={() => { setPriceDraft(String(item.price)); setEditingPrice(true); }}
            className="font-mono text-sm font-semibold text-primary hover:underline decoration-dotted underline-offset-2"
            title="Click to edit price"
          >
            {formatCurrency(item.price)}
          </button>
        )}
      </div>

      {/* Active toggle */}
      <button
        onClick={async () => {
          try { await onUpdate(item.id, { active: !item.active }); }
          catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
        }}
        title={item.active ? "Disable item" : "Enable item"}
        className={cn("shrink-0 transition-colors", item.active ? "text-green-500 hover:text-green-400" : "text-muted-foreground hover:text-foreground")}
      >
        {item.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
      </button>

      {/* Delete */}
      <button
        disabled={deleting}
        onClick={async () => {
          if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
          setDeleting(true);
          try { await onDelete(item.id); }
          catch (e: any) { toast({ title: e.message, variant: "destructive" }); setDeleting(false); }
        }}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        title="Delete item"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Add item inline form ──────────────────────────────────────────────────────
function AddItemForm({ categoryId, onAdd }: { categoryId: number; onAdd: (name: string, price: number, imageUrl: string | null) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) nameRef.current?.focus(); }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-border/50"
      >
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    );
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Max size is 2MB", variant: "destructive" });
      return;
    }
    try { setImageUrl(await fileToDataUrl(file)); }
    catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  };

  const submit = async () => {
    if (!name.trim()) { toast({ title: "Item name required", variant: "destructive" }); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { toast({ title: "Valid price required", variant: "destructive" }); return; }
    setSaving(true);
    try { await onAdd(name.trim(), p, imageUrl); setName(""); setPrice(""); setImageUrl(null); setOpen(false); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-dashed border-border/50">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      <button
        onClick={() => imageInputRef.current?.click()}
        disabled={saving}
        className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border/50 hover:border-primary transition-colors disabled:opacity-50"
        title="Add image (optional)"
      >
        {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <Input ref={nameRef} placeholder="Item name" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        className="flex-1 h-8 text-sm" disabled={saving} />
      <div className="relative shrink-0 w-28">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
        <Input type="number" min={0} step={0.5} placeholder="0" value={price}
          onChange={e => setPrice(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          className="pl-6 h-8 text-sm font-mono" disabled={saving} />
      </div>
      <button onClick={submit} disabled={saving} className="text-green-600 hover:text-green-500 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button onClick={() => { setOpen(false); setName(""); setPrice(""); setImageUrl(null); }} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MenuEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add category
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const catInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await apiFetch("/menu-categories-admin");
      setCategories(data);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (user?.role !== "admin") {
    return <div className="p-8 text-muted-foreground">Admin access required.</div>;
  }

  // ── Category actions ────────────────────────────────────────────────────────
  const renameCategory = async (id: number, name: string) => {
    const data = await apiFetch(`/menu-categories/${id}`, {
      method: "PATCH", body: JSON.stringify({ name }),
    });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: data.name } : c));
  };

  const moveCategory = async (id: number, dir: -1 | 1) => {
    const idx = categories.findIndex(c => c.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const updated = [...categories];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    // Assign new sortOrders
    const reordered = updated.map((c, i) => ({ ...c, sortOrder: i }));
    setCategories(reordered);

    // Persist both affected categories
    await Promise.all([
      apiFetch(`/menu-categories/${reordered[idx].id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: reordered[idx].sortOrder }) }),
      apiFetch(`/menu-categories/${reordered[targetIdx].id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: reordered[targetIdx].sortOrder }) }),
    ]).catch(e => { toast({ title: e.message, variant: "destructive" }); load(); });
  };

  const deleteCategory = async (id: number) => {
    await apiFetch(`/menu-categories/${id}`, { method: "DELETE" });
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const sortOrder = categories.length;
      const data = await apiFetch("/menu-categories", {
        method: "POST", body: JSON.stringify({ name: newCatName.trim(), sortOrder }),
      });
      setCategories(prev => [...prev, { ...data, items: [] }]);
      setNewCatName("");
      catInputRef.current?.focus();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setAddingCat(false);
    }
  };

  // ── Item actions ────────────────────────────────────────────────────────────
  const addItem = async (categoryId: number, name: string, price: number, imageUrl: string | null) => {
    const data = await apiFetch("/menu-items", {
      method: "POST", body: JSON.stringify({ categoryId, name, price, active: true, imageUrl }),
    });
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, items: [...c.items, data] } : c
    ));
  };

  const updateItem = async (id: number, patch: Partial<Pick<MenuItem, "name" | "price" | "active" | "categoryId" | "imageUrl">>) => {
    const data = await apiFetch(`/menu-items/${id}`, {
      method: "PATCH", body: JSON.stringify(patch),
    });
    setCategories(prev => prev.map(c => ({
      ...c,
      items: c.items.map(item => item.id === id ? data : item),
    })));
    // If category changed, move item
    if (patch.categoryId !== undefined) {
      setCategories(prev => {
        const item = prev.flatMap(c => c.items).find(i => i.id === id);
        if (!item) return prev;
        return prev.map(c => ({
          ...c,
          items: c.id === patch.categoryId
            ? [...c.items.filter(i => i.id !== id), data]
            : c.items.filter(i => i.id !== id),
        }));
      });
    }
  };

  const deleteItem = async (id: number) => {
    await apiFetch(`/menu-items/${id}`, { method: "DELETE" });
    setCategories(prev => prev.map(c => ({ ...c, items: c.items.filter(i => i.id !== id) })));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-none p-4 sm:p-6 border-b-2 border-border bg-background flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" /> Menu Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage categories and items — click any name or price to edit inline</p>
        </div>
        <Badge variant="outline" className="font-mono">
          {categories.reduce((s, c) => s + c.items.length, 0)} items · {categories.length} categories
        </Badge>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No categories yet</p>
            <p className="text-sm mt-1">Add your first category below</p>
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={cat.id} className="rounded-xl border-2 border-border overflow-hidden bg-card">
              {/* Category header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveCategory(cat.id, -1)}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                    title="Move up"
                  ><ChevronUp className="w-4 h-4" /></button>
                  <button
                    onClick={() => moveCategory(cat.id, 1)}
                    disabled={idx === categories.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                    title="Move down"
                  ><ChevronDown className="w-4 h-4" /></button>
                </div>

                {/* Name */}
                <div className="flex-1 font-bold text-base">
                  <InlineEdit
                    value={cat.name}
                    onSave={async name => {
                      try { await renameCategory(cat.id, name); }
                      catch (e: any) { toast({ title: e.message, variant: "destructive" }); throw e; }
                    }}
                  />
                </div>

                {/* Item count */}
                <Badge variant="secondary" className="text-xs shrink-0">
                  {cat.items.length} {cat.items.length === 1 ? "item" : "items"}
                </Badge>

                {/* Delete category */}
                <button
                  onClick={async () => {
                    if (cat.items.length > 0) {
                      toast({ title: "Cannot delete", description: "Remove all items from this category first.", variant: "destructive" });
                      return;
                    }
                    if (!confirm(`Delete category "${cat.name}"?`)) return;
                    try { await deleteCategory(cat.id); }
                    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
                  }}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Items */}
              {cat.items.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground italic">No items yet</div>
              )}
              {cat.items.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                />
              ))}

              {/* Add item */}
              <AddItemForm categoryId={cat.id} onAdd={(name, price, imageUrl) => addItem(cat.id, name, price, imageUrl)} />
            </div>
          ))
        )}

        {/* Add category */}
        <div className="rounded-xl border-2 border-dashed border-border p-4 flex items-center gap-3">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={catInputRef}
            placeholder="New category name…"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            className="flex-1 h-9"
            disabled={addingCat}
          />
          <Button onClick={addCategory} disabled={addingCat || !newCatName.trim()} className="shrink-0">
            {addingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Category"}
          </Button>
        </div>
      </div>
    </div>
  );
}
