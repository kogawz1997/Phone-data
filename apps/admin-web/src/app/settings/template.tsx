"use client";

import type { ReactNode } from "react";
import SafeMockupPolish from "./safe-mockup-polish";
import SafeMockupPolishV2 from "./safe-mockup-polish-v2";

export default function SettingsTemplate({ children }: { children: ReactNode }) {
  return <div data-settings-template="safe-mockup">{children}<SafeMockupPolish /><SafeMockupPolishV2 /></div>;
}
