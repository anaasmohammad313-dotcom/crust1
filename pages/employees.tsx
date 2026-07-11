import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, KeyRound, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Employee {
  id: number;
  employeeId: string;
  username: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
}

const API = "/api";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export default function Employees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const loadEmployees = () => {
    setLoading(true);
    apiFetch("/receptionists")
      .then(setEmployees)
      .catch((e) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEmployees(); }, []);

  if (user?.role !== "admin") {
    return <div className="p-8 text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-none p-4 sm:p-6 border-b-2 border-border bg-background flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage receptionist & cashier accounts</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-xl border-2 border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="text-left px-4 py-3">Employee ID</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Username</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Mobile</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="bg-background hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{emp.employeeId}</td>
                    <td className="px-4 py-3 font-semibold">{emp.fullName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{emp.username}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{emp.mobile ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.role === "admin" ? "default" : "secondary"} className="capitalize">{emp.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.status === "active" ? "default" : "destructive"} className="capitalize">
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                      {emp.lastLogin ? new Date(emp.lastLogin).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditTarget(emp)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setResetTarget(emp)} title="Reset password">
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className={`h-8 w-8 ${emp.status === "active" ? "text-orange-500 hover:text-orange-600" : "text-green-500 hover:text-green-600"}`}
                          onClick={async () => {
                            try {
                              await apiFetch(`/receptionists/${emp.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: emp.status === "active" ? "inactive" : "active" }),
                              });
                              loadEmployees();
                            } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
                          }}
                          title={emp.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {emp.status === "active" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </Button>
                        {emp.employeeId !== "ADMIN001" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(emp)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No employees found.</p>
            )}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <AddEmployeeDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadEmployees(); }} />

      {/* Edit Dialog */}
      {editTarget && (
        <EditEmployeeDialog employee={editTarget} onClose={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); loadEmployees(); }} />
      )}

      {/* Reset Password Dialog */}
      {resetTarget && (
        <ResetPasswordDialog employee={resetTarget} onClose={() => setResetTarget(null)} onSuccess={() => { setResetTarget(null); toast({ title: "Password reset successfully" }); }} />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete {deleteTarget.fullName}?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This action cannot be undone. All their audit logs will be retained.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                try {
                  await apiFetch(`/receptionists/${deleteTarget.id}`, { method: "DELETE" });
                  setDeleteTarget(null); loadEmployees();
                } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
              }}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Sub-dialogs ──────────────────────────────────────────────────────────────

function AddEmployeeDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", fullName: "", mobile: "", email: "", password: "", role: "receptionist" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/receptionists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSuccess();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name *" value={form.fullName} onChange={(v) => setForm(f => ({ ...f, fullName: v }))} />
            <Field label="Username *" value={form.username} onChange={(v) => setForm(f => ({ ...f, username: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" value={form.mobile} onChange={(v) => setForm(f => ({ ...f, mobile: v }))} />
            <Field label="Email" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} />
          </div>
          <Field label="Password *" type="password" value={form.password} onChange={(v) => setForm(f => ({ ...f, password: v }))} />
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ employee, onClose, onSuccess }: { employee: Employee; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: employee.fullName, mobile: employee.mobile ?? "", email: employee.email ?? "", role: employee.role });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/receptionists/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSuccess();
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit {employee.fullName}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 py-2">
          <Field label="Full Name" value={form.fullName} onChange={(v) => setForm(f => ({ ...f, fullName: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" value={form.mobile} onChange={(v) => setForm(f => ({ ...f, mobile: v }))} />
            <Field label="Email" value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ employee, onClose, onSuccess }: { employee: Employee; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await apiFetch(`/receptionists/${employee.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      onSuccess();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Password — {employee.fullName}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 py-2">
          <Field label="New Password" type="password" value={password} onChange={setPassword} autoFocus />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text", autoFocus }: { label: string; value: string; onChange: (v: string) => void; type?: string; autoFocus?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} />
    </div>
  );
}
