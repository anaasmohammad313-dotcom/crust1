import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button size="lg">Return to POS</Button>
        </Link>
      </div>
    </div>
  );
}
