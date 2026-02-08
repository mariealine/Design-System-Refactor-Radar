// Impure component - imports business logic
import React from "react";
import { getUserData } from "@/lib/api";
import { db } from "@/db/client";

export function ImpureComponent() {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    getUserData().then(setData);
  }, []);
  
  return <div>{data?.name}</div>;
}
