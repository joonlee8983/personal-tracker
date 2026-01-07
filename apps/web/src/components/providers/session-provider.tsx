"use client";

import { AuthProvider } from "./auth-provider";

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  return <AuthProvider>{children}</AuthProvider>;
}

