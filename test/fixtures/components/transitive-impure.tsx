// Component that imports a helper, which imports business logic
import React from "react";
import { formatDate } from "./helper.js";

export function TransitiveImpure() {
  return <div>{formatDate(new Date())}</div>;
}
