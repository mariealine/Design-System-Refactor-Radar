// Pure UI component - no business logic imports
import React from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";

export function PureComponent() {
  return <Button className={clsx("px-4 py-2")}>Click me</Button>;
}
