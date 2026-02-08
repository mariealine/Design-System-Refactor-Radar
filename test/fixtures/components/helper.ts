// Helper file that imports business logic
import { db } from "@/db/client";

export function formatDate(date: Date): string {
  // This helper imports business logic, making transitive-impure.tsx impure
  return date.toISOString();
}
