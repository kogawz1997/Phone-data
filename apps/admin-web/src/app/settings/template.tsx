"use client";

import type { ReactNode } from "react";
import SafeMockupPolish from "./safe-mockup-polish";

export default function SettingsTemplate({ children }: { children: ReactNode }) {
  return <div data-settings-template="safe-mockup">{children}<SafeMockupPolish /></div>;
}
