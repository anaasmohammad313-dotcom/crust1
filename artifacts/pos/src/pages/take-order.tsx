import { useEffect, useState, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { getCategoryIcon, getItemIcon } from "@/lib/menu-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Minus, X, Trash2, Printer, Search, ShoppingBag, WifiOff, ChevronDown, Banknote, Smartphone, CreditCard, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { 
  useListMenuCategories, 
  useGetSettings,
  OrderInput, 
  MenuItem, 
  DiscountType, 
  PaymentMethod 
} from "@workspace/api-client-react";
import { useOfflineOrders } from "@/hooks/use-offline-orders";

// Types
interface CartItem extends MenuItem {
  cartId: string;
  quantity: number;
}

export default function TakeOrder() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("");

  // Payment splits
  type SplitMethod = "cash" | "upi" | "card" | "pending";
  type SplitEntry = { method: SplitMethod; amount: string };
  const [splits, setSplits] = useState<SplitEntry[]>([{ method: "cash", amount: "" }]);

  const splitsNumeric = splits.map(s => ({ method: s.method, amount: parseFloat(s.amount) || 0 }));
  const splitAllocated = splitsNumeric.reduce((sum, s) => sum + s.amount, 0);

  const toggleSplitMethod = (method: SplitMethod, currentTotal: number) => {
    setSplits(prev => {
      const exists = prev.find(s => s.method === method);
      if (exists) {
        return prev.length > 1 ? prev.filter(s => s.method !== method) : prev;
      }
      const allocated = prev.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      const remaining = Math.max(0, currentTotal - allocated);
      return [...prev, { method, amount: remaining > 0 ? remaining.toFixed(0) : "" }];
    });
  };

  const setSplitAmount = (method: SplitMethod, value: string) => {
    setSplits(prev => prev.map(s => s.method === method ? { ...s, amount: value } : s));
  };

  const resetPayment = () => setSplits([{ method: "cash", amount: "" }]);

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Optional customer details
  const [showDetails, setShowDetails] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cashierName, setCashierName] = useState("");

  // Invoice
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useListMenuCategories();
  const { data: settings } = useGetSettings();
  const { placeOrder, pendingCount, isSyncing } = useOfflineOrders();

  const TABLES = useMemo(
    () => ["Take Away", ...Array.from({ length: settings?.maxTables ?? 20 }, (_, i) => `Table ${i + 1}`)],
    [settings?.maxTables]
  );

  // If the admin lowers maxTables while a now-out-of-range table is selected,
  // force the receptionist to re-select rather than silently keeping a stale
  // (now-invalid) table on the order.
  useEffect(() => {
    if (tableNumber && !TABLES.includes(tableNumber)) {
      setTableNumber("");
      toast({
        title: "Table no longer available",
        description: "The selected table was removed from the configuration. Please select another.",
        variant: "destructive",
      });
    }
  }, [TABLES, tableNumber, toast]);

  // Initialize category
  useEffect(() => {
    if (categories.length > 0 && activeCategory === null) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Derived state
  const filteredItems = useMemo(() => {
    if (!categories) return [];
    
    let items: MenuItem[] = [];
    if (search) {
      // Search across all categories
      items = categories.flatMap(c => c.items).filter(i => 
        i.name.toLowerCase().includes(search.toLowerCase()) && i.active
      );
    } else {
      // Filter by category
      const category = categories.find(c => c.id === activeCategory);
      items = category ? category.items.filter(i => i.active) : [];
    }
    return items;
  }, [categories, activeCategory, search]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountAmount = useMemo(() => {
    if (!discountValue || subtotal === 0) return 0;
    if (discountType === "amount") return Math.min(discountValue, subtotal);
    if (discountType === "percent") return Math.min(subtotal * (discountValue / 100), subtotal);
    return 0;
  }, [subtotal, discountType, discountValue]);

  const total = subtotal - discountAmount;

  // Cart actions
  const addToCart = (item: MenuItem) => {
    if (!tableNumber) {
      toast({ title: "Select a table first", description: "Choose a table or Take Away before adding items.", variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, cartId: Math.random().toString(36).substring(7), quantity: 1 }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0)); // Ensure we remove if somehow qty goes to 0 (though we clamp to 1 in the UI usually, or remove on 0)
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    if (window.confirm("Clear current order?")) {
      setCart([]);
      setDiscountValue(0);
    }
  };

  const handleGenerateBill = () => {
    if (!tableNumber) {
      toast({ title: "Select a table first", description: "Choose a table or Take Away before generating the bill.", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add at least one item before generating the bill.", variant: "destructive" });
      return;
    }
    if (splits.length > 1 && Math.abs(splitAllocated - total) > 1) {
      toast({ title: "Payment amounts don't match", description: `Allocated ${formatCurrency(splitAllocated)} but total is ${formatCurrency(total)}. Adjust the split amounts.`, variant: "destructive" });
      return;
    }

    const isSplit = splits.length > 1;
    const orderData: OrderInput = {
      tableNumber,
      customerName: customerName || null,
      phoneNumber: phoneNumber || null,
      cashierName: cashierName || null,
      discountType: discountValue > 0 ? discountType : null,
      discountValue: discountValue > 0 ? discountValue : null,
      items: cart.map(item => ({ menuItemId: item.id, quantity: item.quantity })),
      ...(isSplit
        ? { paymentSplits: splitsNumeric }
        : { paymentMethod: splits[0].method }),
    };

    const resetAll = () => {
      setCart([]);
      setDiscountValue(0);
      setTableNumber("");
      resetPayment();
      setCustomerName("");
      setPhoneNumber("");
      setCashierName("");
      setShowDetails(false);
    };

    placeOrder(orderData, {
      onSuccess: (order) => {
        resetAll();
        setCompletedOrderId(order.id);
        setShowInvoice(true);
        toast({ title: "Order completed successfully!" });
      },
      onOffline: () => {
        resetAll();
        toast({
          title: "Saved offline — will sync when back online",
          description: "No internet connection. Order queued and will be sent automatically.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="flex h-full flex-col lg:flex-row w-full bg-muted/30">
      {/* Left: Menu Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r-2 border-border/50">
        <header className="flex-none p-4 bg-background border-b-2 border-border/50 shadow-sm z-10 flex flex-col sm:flex-row gap-4 justify-between items-center no-print">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="text-2xl font-bold tracking-tight text-foreground whitespace-nowrap">Take Order</h1>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30 animate-pulse">
                <WifiOff className="w-3 h-3" />
                {isSyncing ? "Syncing…" : `${pendingCount} offline`}
              </div>
            )}
          </div>
          <div className="w-full sm:w-72">
            <SearchInput 
              placeholder="Search menu items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>
        </header>

        {/* Categories (fully visible, wraps to multiple rows) */}
        {!search && (
          <div className="flex-none bg-background border-b-2 border-border/50 no-print">
            <div className="flex flex-wrap p-4 gap-3">
              {isLoadingCategories ? (
                Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-32 rounded-xl" />)
              ) : (
                categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    className={cn(
                      "category-btn rounded-xl h-12 px-5 font-semibold transition-all shadow-none whitespace-nowrap gap-2",
                      activeCategory === cat.id 
                        ? "active ring-2 ring-primary/20 ring-offset-2 ring-offset-background" 
                        : "border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className="text-base leading-none">{getCategoryIcon(cat.name)}</span>
                    {cat.name}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Menu Grid */}
        <ScrollArea className="flex-1 p-4 sm:p-6 no-print">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-24">
            {isLoadingCategories ? (
              Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No items found</p>
              </div>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="menu-card group relative flex flex-col text-left bg-background rounded-2xl p-4 sm:p-5 border-2 border-border/50 hover:border-primary transition-all hover:shadow-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 leading-none">
                    {getItemIcon(item.name)}
                  </div>
                  <div className="flex-1 font-bold text-lg sm:text-xl leading-tight mb-2 pr-2 text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </div>
                  <div className="font-mono font-semibold text-primary/80">
                    {formatCurrency(item.price)}
                  </div>
                  <div className="card-icon absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart/Bill Area */}
      <div className="order-panel flex-none w-full lg:w-[400px] xl:w-[450px] bg-background flex flex-col h-[50vh] lg:h-full border-t-2 lg:border-t-0 lg:border-l-2 border-border shadow-2xl z-20 no-print">
        <div className="flex-none p-4 sm:p-6 border-b-2 border-border bg-sidebar text-sidebar-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Order Summary
            </h2>
            <Badge variant="secondary" className="bg-sidebar-border text-sidebar-foreground hover:bg-sidebar-border font-mono text-sm px-3 py-1">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </Badge>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sidebar-foreground/70 text-xs uppercase tracking-wide">Table Number *</Label>
            <Select value={tableNumber} onValueChange={setTableNumber}>
              <SelectTrigger className="font-semibold bg-sidebar-accent text-sidebar-foreground border-sidebar-border">
                <SelectValue placeholder="Select table before adding items" />
              </SelectTrigger>
              <SelectContent>
                {TABLES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-20">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Cart is empty</p>
              {!tableNumber && <p className="text-sm mt-1">Select a table to start adding items</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={item.cartId} className="flex flex-col gap-2 p-3 sm:p-4 bg-muted/40 rounded-xl border-2 border-border/50">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold leading-tight flex gap-2">
                      <span className="text-muted-foreground font-mono">{index + 1}.</span>
                      {item.name}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex flex-col font-mono text-muted-foreground text-sm">
                      <span>{formatCurrency(item.price)} each</span>
                      <span className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                    <div className="flex items-center bg-background rounded-lg border-2 border-border/50 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => {
                          if (item.quantity > 1) updateQuantity(item.cartId, -1);
                          else removeFromCart(item.cartId);
                        }}
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted active:bg-accent transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="w-10 text-center font-bold font-mono">
                        {item.quantity}
                      </div>
                      <button 
                        onClick={() => updateQuantity(item.cartId, 1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted active:bg-accent transition-colors text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals & Actions */}
        <div className="flex-none p-4 sm:p-5 bg-muted/30 border-t-2 border-border space-y-4">

          {/* Payment Method / Split */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Payment Method *</Label>
              {splits.length > 1 && (
                <span className={cn(
                  "text-xs font-bold font-mono px-2 py-0.5 rounded-full",
                  Math.abs(splitAllocated - total) <= 1
                    ? "bg-green-500/15 text-green-600"
                    : "bg-destructive/15 text-destructive"
                )}>
                  {Math.abs(splitAllocated - total) <= 1
                    ? "✓ Balanced"
                    : `${splitAllocated > total ? "+" : ""}${formatCurrency(splitAllocated - total)} off`}
                </span>
              )}
            </div>
            {/* Method toggle buttons */}
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: "cash"    as const, label: "Cash",    Icon: Banknote },
                { value: "upi"     as const, label: "UPI",     Icon: Smartphone },
                { value: "card"    as const, label: "Card",    Icon: CreditCard },
                { value: "pending" as const, label: "Pending", Icon: Clock },
              ]).map(({ value, label, Icon }) => {
                const active = splits.some(s => s.method === value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleSplitMethod(value, total)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-xs transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                    {active && splits.length > 1 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Split amount inputs — only shown when 2+ methods active */}
            {splits.length > 1 && (
              <div className="space-y-1.5 pt-1">
                {splits.map(({ method, amount }) => {
                  const icons: Record<string, React.ReactNode> = {
                    cash: <Banknote className="w-3.5 h-3.5" />,
                    upi: <Smartphone className="w-3.5 h-3.5" />,
                    card: <CreditCard className="w-3.5 h-3.5" />,
                    pending: <Clock className="w-3.5 h-3.5" />,
                  };
                  return (
                    <div key={method} className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground w-20 shrink-0 capitalize">
                        {icons[method]} {method}
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={amount}
                          onChange={e => setSplitAmount(method, e.target.value)}
                          className="pl-7 font-mono font-bold text-sm h-9"
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between text-xs font-semibold pt-1 border-t border-dashed border-border/50">
                  <span className="text-muted-foreground">Remaining to allocate</span>
                  <span className={cn("font-mono", Math.abs(total - splitAllocated) <= 1 ? "text-green-600" : "text-destructive")}>
                    {formatCurrency(Math.max(0, total - splitAllocated))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Discount (Optional)</Label>
            <div className="flex gap-2">
              <ToggleGroup type="single" value={discountType} onValueChange={(val) => val && setDiscountType(val as DiscountType)} className="justify-start bg-muted p-1 rounded-lg shrink-0">
                <ToggleGroupItem value="amount" className="font-semibold px-3 text-xs">₹</ToggleGroupItem>
                <ToggleGroupItem value="percent" className="font-semibold px-3 text-xs">%</ToggleGroupItem>
              </ToggleGroup>
              <Input
                type="number"
                placeholder="0"
                className="flex-1 font-mono font-bold"
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          {/* Optional Customer Details */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDetails && "rotate-180")} />
                <span className="font-semibold uppercase tracking-wide">Customer Details (Optional)</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input placeholder="Phone number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <Input placeholder="Cashier name" value={cashierName} onChange={(e) => setCashierName(e.target.value)} />
            </CollapsibleContent>
          </Collapsible>

          {/* Totals */}
          <div className="space-y-1.5 text-sm pt-1 border-t border-dashed border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-primary font-bold">
                <span>Discount</span>
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span className="text-3xl font-black text-primary font-mono tracking-tight">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear
            </Button>
            <Button
              size="lg"
              className="btn-glow w-full shadow-lg shadow-primary/20"
              onClick={handleGenerateBill}
              disabled={cart.length === 0 || !tableNumber}
            >
              Generate Bill
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Print View (Rendered specifically for printing) */}
      {showInvoice && completedOrderId && (
        <InvoicePrintView 
          orderId={completedOrderId} 
          onClose={() => {
            setShowInvoice(false);
            setCompletedOrderId(null);
          }} 
        />
      )}
    </div>
  );
}

// Separate component to handle the specific data fetching for the completed invoice
import { useGetOrder } from "@workspace/api-client-react";
import { useLocation } from "wouter";

function InvoicePrintView({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const { data: order, isLoading } = useGetOrder(orderId);
  const [printLayout, setPrintLayout] = useState<'receipt' | 'a4'>('receipt');
  const [printed, setPrinted] = useState(false);
  const [, navigate] = useLocation();

  // Trigger browser print. The order is already saved (createOrder succeeded
  // before this view is shown), so printing just opens the browser dialog.
  const handlePrint = () => {
    window.print();
    setPrinted(true);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 no-print">
        <Skeleton className="h-[600px] w-[400px] rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col items-center justify-start p-4 sm:p-8 overflow-auto">
      
      {/* Controls - Only visible on screen */}
      <div className="bg-card border-2 border-border shadow-xl rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between w-full max-w-3xl no-print sticky top-0 z-10">
        {printed ? (
          <div className="flex flex-wrap gap-4 items-center justify-between w-full">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Printer className="w-5 h-5" /> Bill Printed Successfully
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/history")}>
                View Order History
              </Button>
              <Button onClick={onClose} className="shadow-sm">
                Start New Order
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant={printLayout === 'receipt' ? "default" : "outline"} onClick={() => setPrintLayout('receipt')}>
                80mm Receipt
              </Button>
              <Button variant={printLayout === 'a4' ? "default" : "outline"} onClick={() => setPrintLayout('a4')}>
                A4 Invoice
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" /> Close
              </Button>
              <Button onClick={handlePrint} className="shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> Print Bill
              </Button>
            </div>
          </>
        )}
      </div>

      {/* The Printable Container */}
      <div className={cn(
        "bg-white text-black print-only mx-auto print:m-0 print:p-0",
        printLayout === 'receipt' 
          ? "w-[300px] p-6 shadow-2xl font-mono text-sm print:w-auto print:shadow-none" 
          : "w-full max-w-[800px] p-12 shadow-2xl font-sans print:w-full print:max-w-none print:shadow-none"
      )}>
        {/* Header */}
        <div className={cn("text-center mb-6", printLayout === 'receipt' ? "border-b-2 border-dashed border-gray-300 pb-4" : "border-b-2 border-gray-800 pb-6 flex justify-between items-end text-left")}>
          <div className={cn("flex items-center gap-3", printLayout === 'receipt' ? "flex-col" : "flex-row")}>
            <img src={logo} alt="Crust - The Street Food" className={cn("w-auto", printLayout === 'receipt' ? "h-12" : "h-14")} />
            <div>
              <h1 className={cn("font-black uppercase tracking-widest", printLayout === 'receipt' ? "text-2xl mb-1" : "text-3xl mb-1")}>Crust</h1>
              <p className="text-gray-600">123 Culinary Avenue, Food District</p>
              <p className="text-gray-600">Tel: +91 98765 43210</p>
            </div>
          </div>
          {printLayout === 'a4' && (
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-400 mb-2">INVOICE</h2>
              <p className="font-bold text-lg">{order.invoiceNumber}</p>
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className={cn("mb-6 text-sm grid gap-2", printLayout === 'receipt' ? "grid-cols-1" : "grid-cols-2 bg-gray-50 p-4 rounded-lg")}>
          {printLayout === 'receipt' && (
            <div className="flex justify-between">
              <span className="font-bold">Invoice:</span>
              <span>{order.invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="font-bold text-gray-500 w-24">Date:</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="font-bold text-gray-500 w-24">Table:</span>
            <span className="font-bold">{order.tableNumber}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="font-bold text-gray-500 w-24">Cashier:</span>
            <span>{order.cashierName || 'Admin'}</span>
          </div>
          {(order.customerName || order.phoneNumber) && (
            <div className="flex justify-between sm:justify-start sm:gap-2 sm:col-span-2 mt-2 pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-500 w-24">Customer:</span>
              <span>
                {order.customerName} {order.phoneNumber ? `(${order.phoneNumber})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b-2 text-gray-500 uppercase tracking-wider", printLayout === 'receipt' ? "border-dashed border-gray-300 text-xs" : "border-gray-800 text-sm")}>
                <th className="py-2 w-full">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className={cn("border-b", printLayout === 'receipt' ? "border-dashed border-gray-200" : "border-gray-200")}>
                  <td className="py-2 sm:py-3 pr-2 font-semibold text-gray-900">{item.name}</td>
                  <td className="py-2 sm:py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2 sm:py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 sm:py-3 text-right font-semibold">{formatCurrency(item.itemTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className={cn("ml-auto space-y-2 text-sm", printLayout === 'receipt' ? "w-full" : "w-1/2")}>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discountValue && order.discountValue > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : 'Flat'})</span>
              <span>-{formatCurrency(order.subtotal - order.total)}</span>
            </div>
          )}
          <div className={cn("flex justify-between items-center font-black pt-2", printLayout === 'receipt' ? "border-t-2 border-dashed border-gray-400 text-xl" : "border-t-2 border-gray-800 text-2xl")}>
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {order.paymentMethod === 'split' && order.paymentSplits ? (
            <div className="pt-2 text-xs space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Payment</span>
                <span className="font-bold uppercase">Split</span>
              </div>
              {order.paymentSplits.map((s, i) => (
                <div key={i} className="flex justify-between text-gray-500 pl-2">
                  <span className="capitalize">— {s.method}</span>
                  <span className="font-mono font-semibold">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between text-gray-500 pt-2 text-xs">
              <span>Payment Method</span>
              <span className="uppercase font-bold">{order.paymentMethod}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn("text-center mt-8 text-gray-500 font-medium", printLayout === 'receipt' ? "pt-4 border-t-2 border-dashed border-gray-300 text-xs" : "pt-8 mt-12 border-t border-gray-200")}>
          <p>Thank you for dining with us!</p>
          <p className="mt-1">Please visit again.</p>
        </div>
      </div>
    </div>
  );
}
