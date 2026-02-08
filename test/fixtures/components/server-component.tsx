// Component using Next.js server APIs
import { headers } from "next/headers";
import { cache } from "next/cache";

export function ServerComponent() {
  const headersList = headers();
  return <div>Server component</div>;
}
