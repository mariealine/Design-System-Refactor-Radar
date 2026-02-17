// Helper that imports business logic — used by transitive-impure.tsx to trigger transitive violation
import { format } from "@/lib/date-utils";

export function formatDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
