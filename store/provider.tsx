"use client";
import { ReactNode, useMemo } from "react";
import { Provider } from "react-redux";
import { createStore } from "@/store/store";

export function ReduxProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore(), []);

  return <Provider store={store}>{children}</Provider>;
}

export default ReduxProvider;