import "express-session";

declare module "express-session" {
  interface SessionData {
    receptionist?: {
      id: number;
      employeeId: string;
      username: string;
      fullName: string;
      role: "admin" | "receptionist" | "cashier";
    };
  }
}
