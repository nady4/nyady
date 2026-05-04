"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/hooks/useStore";

interface InitTask {
  action: (userId: string) => Promise<string[]>;
  initializer: (ids: string[]) => { payload: string[]; type: string };
}

export function useInitData(userId?: string, tasks: InitTask[] = []) {
  const dispatch = useAppDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;

    initialized.current = true;

    tasks.forEach(({ action, initializer }) => {
      action(userId!)
        .then((ids) => {
          dispatch(initializer(ids));
        })
        .catch((error) => {
          console.error(`Error initializing data for user ${userId}:`, error);
        });
    });
  }, [dispatch, userId, tasks]);
}