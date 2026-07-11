import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { 
  useListOrders, 
  useGetOrder, 
  useUpdateOrderStatus,
  ListOrdersParams,
  PaymentMethod,
  OrderStatus
} from "@workspace/api-client-react";
import { ReceiptText, Search, Printer, X, RotateCcw, Ban, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TABLES = ["Take Away", ...Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`)];

export default function OrderHistory() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ListOrdersParams>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Apply search term to either invoice number or phone number based on heuristics
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = searchTerm.trim();
      if (!val) {
        setFilters(prev => ({ ...prev, invoiceNumber: undefined, phoneNumber: undefined, customerName: undefined }));
      } else if (/^\d{10}$/.test(val)) {
        setFilters(prev => ({ ...prev, phoneNumber: val, invoiceNumber: undefined, customerName: undefined }));
      } else if (val.startsWith("INV")) {
        setFilters(prev => ({ ...prev, invoiceNumber: val, phoneNumber: undefined, customerName: undefined }));
      } else {
        setFilters(prev => ({ ...prev, customerName: val, invoiceNumber: undefined, phoneNumber: undefined }));
      }
    }
  };

  const { data: orders = [], isLoading } = useListOrders(filters);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'paid': return 'success';
      case 'cancelled': return 'destructive';
      case 'refunded': return 'secondary';
      default: return 'default';
    }
  };

  const getPaymentColor = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'upi': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'card': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-full flex-col w-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-none p-4 sm:p-6 bg-card border-b-2 border-border shadow-sm z-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ReceiptText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Order History</h1>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="flex-none p-4 bg-muted/30 border-b border-border flex flex-wrap gap-4 items-center">
        <div className="w-full sm:w-64">
          <Input 
            placeholder="Search INV / Phone / Name + Enter" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            className="bg-background"
          />
        </div>

        <div className="w-full sm:w-48">
          <Input 
            type="date" 
            value={filters.date || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value || undefined }))}
            className="bg-background"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select 
            value={filters.tableNumber || "all"} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, tableNumber: val === "all" ? undefined : val }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {TABLES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select 
            value={filters.paymentMethod || "all"} 
            onValueChange={(val) => setFilters(prev => ({ ...prev, paymentMethod: val === "all" ? undefined : val as PaymentMethod }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All Payment Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="ghost" 
          onClick={() => {
            setFilters({});
            setSearchTerm("");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filters
        </Button>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/10">
        <div className="bg-card rounded-xl border-2 border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-foreground">Invoice</TableHead>
                <TableHead className="font-bold text-foreground">Date</TableHead>
                <TableHead className="font-bold text-foreground">Table</TableHead>
                <TableHead className="font-bold text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-foreground text-right">Total</TableHead>
                <TableHead className="font-bold text-foreground">Payment</TableHead>
                <TableHead className="font-bold text-foreground text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>No orders found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="font-mono font-medium">{order.invoiceNumber}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</TableCell>
                    <TableCell className="font-medium">{order.tableNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName || "-"}</span>
                        <span className="text-xs text-muted-foreground">{order.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border", getPaymentColor(order.paymentMethod))}>
                        {order.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusColor(order.status)} className="uppercase tracking-widest text-[10px]">
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}
    </div>
  );
}

function OrderDetailModal({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const { toast } = useToast();
  const { data: order, isLoading, refetch } = useGetOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const [printLayout, setPrintLayout] = useState<'receipt' | 'a4'>('receipt');

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!order) return;
    if (window.confirm(`Are you sure you want to mark this order as ${newStatus.toUpperCase()}?`)) {
      updateStatus.mutate({ id: order.id, data: { status: newStatus } }, {
        onSuccess: () => {
          toast({ title: `Order ${order.invoiceNumber} marked as ${newStatus}` });
          refetch(); // Refetch single order detail
          // Invalidation of list happens usually via queryClient, but refetching the specific order is enough for the modal view
        },
        onError: (err) => {
          toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl min-h-[50vh] flex items-center justify-center">
          <Skeleton className="w-full h-[400px] rounded-xl" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-2 border-border shadow-2xl rounded-2xl no-print bg-muted/20">
        
        {/* Header Options */}
        <div className="flex-none bg-card border-b-2 border-border p-4 sm:p-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold font-mono">{order.invoiceNumber}</h2>
            <Badge variant={order.status === 'paid' ? 'success' : order.status === 'cancelled' ? 'destructive' : 'secondary'} className="uppercase tracking-widest">
              {order.status}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {order.status === 'paid' && (
              <>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleStatusChange('cancelled')}>
                  <Ban className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button variant="outline" className="text-secondary hover:bg-secondary/10 hover:text-secondary-foreground" onClick={() => handleStatusChange('refunded')}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Refund
                </Button>
              </>
            )}
            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <div className="flex bg-muted rounded-lg p-1">
              <Button size="sm" variant={printLayout === 'receipt' ? 'default' : 'ghost'} onClick={() => setPrintLayout('receipt')}>
                <ReceiptText className="w-4 h-4 mr-2" /> Receipt
              </Button>
              <Button size="sm" variant={printLayout === 'a4' ? 'default' : 'ghost'} onClick={() => setPrintLayout('a4')}>
                <FileText className="w-4 h-4 mr-2" /> A4
              </Button>
            </div>
            <Button onClick={handlePrint} className="shadow-sm">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div className="flex-1 overflow-auto p-6 sm:p-10 flex justify-center bg-muted/20">
          <div className={cn(
            "bg-card text-card-foreground print-only mx-auto print:m-0 print:p-0 transition-all",
            printLayout === 'receipt' 
              ? "w-[300px] p-6 shadow-xl font-mono text-sm border border-border print:w-auto print:shadow-none print:border-none" 
              : "w-full max-w-[800px] p-12 shadow-xl font-sans border border-border print:w-full print:max-w-none print:shadow-none print:border-none"
          )}>
            {/* Header */}
            <div className={cn("text-center mb-6", printLayout === 'receipt' ? "border-b-2 border-dashed border-muted-foreground/30 pb-4" : "border-b-2 border-foreground pb-6 flex justify-between items-end text-left")}>
              <div className={cn("flex items-center gap-3", printLayout === 'receipt' ? "flex-col" : "flex-row")}>
                <img src={logo} alt="Crust - The Street Food" className={cn("w-auto", printLayout === 'receipt' ? "h-12" : "h-14")} />
                <div>
                  <h1 className={cn("font-black uppercase tracking-widest", printLayout === 'receipt' ? "text-2xl mb-1" : "text-3xl mb-1")}>Crust</h1>
                  <p className="text-muted-foreground">123 Culinary Avenue, Food District</p>
                  <p className="text-muted-foreground">Tel: +91 98765 43210</p>
                </div>
              </div>
              {printLayout === 'a4' && (
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-muted-foreground mb-2">INVOICE</h2>
                  <p className="font-bold text-lg">{order.invoiceNumber}</p>
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className={cn("mb-6 text-sm grid gap-2", printLayout === 'receipt' ? "grid-cols-1" : "grid-cols-2 bg-muted/50 p-4 rounded-lg")}>
              {printLayout === 'receipt' && (
                <div className="flex justify-between">
                  <span className="font-bold">Invoice:</span>
                  <span>{order.invoiceNumber}</span>
                </div>
              )}
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="font-bold text-muted-foreground w-24">Date:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="font-bold text-muted-foreground w-24">Table:</span>
                <span className="font-bold">{order.tableNumber}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="font-bold text-muted-foreground w-24">Cashier:</span>
                <span>{order.cashierName || 'Admin'}</span>
              </div>
              {(order.customerName || order.phoneNumber) && (
                <div className="flex justify-between sm:justify-start sm:gap-2 sm:col-span-2 mt-2 pt-2 border-t border-border">
                  <span className="font-bold text-muted-foreground w-24">Customer:</span>
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
                  <tr className={cn("border-b-2 text-muted-foreground uppercase tracking-wider", printLayout === 'receipt' ? "border-dashed border-muted-foreground/30 text-xs" : "border-foreground text-sm")}>
                    <th className="py-2 w-full">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className={cn("border-b", printLayout === 'receipt' ? "border-dashed border-muted-foreground/20" : "border-border")}>
                      <td className="py-2 sm:py-3 pr-2 font-semibold text-foreground">{item.name}</td>
                      <td className="py-2 sm:py-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="py-2 sm:py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 sm:py-3 text-right font-semibold">{formatCurrency(item.itemTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className={cn("ml-auto space-y-2 text-sm", printLayout === 'receipt' ? "w-full" : "w-1/2")}>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountValue && order.discountValue > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount ({order.discountType === 'percent' ? `${order.discountValue}%` : 'Flat'})</span>
                  <span>-{formatCurrency(order.subtotal - order.total)}</span>
                </div>
              )}
              <div className={cn("flex justify-between items-center font-black pt-2", printLayout === 'receipt' ? "border-t-2 border-dashed border-muted-foreground/40 text-xl" : "border-t-2 border-foreground text-2xl")}>
                <span>TOTAL</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-2 text-xs">
                <span>Payment Method</span>
                <span className="uppercase font-bold">{order.paymentMethod}</span>
              </div>
            </div>

            {/* Footer */}
            <div className={cn("text-center mt-8 text-muted-foreground font-medium", printLayout === 'receipt' ? "pt-4 border-t-2 border-dashed border-muted-foreground/30 text-xs" : "pt-8 mt-12 border-t border-border")}>
              <p>Thank you for dining with us!</p>
              <p className="mt-1">Please visit again.</p>
              
              {order.status !== 'paid' && (
                <div className="mt-4 p-2 border-2 border-destructive text-destructive font-bold uppercase tracking-widest text-lg rounded-lg transform -rotate-12 w-max mx-auto opacity-80">
                  {order.status}
                </div>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
