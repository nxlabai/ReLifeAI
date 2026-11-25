"use client";
import { useEffect, useState } from "react";

export type Health = { liner: boolean; supabase: boolean; serviceRole: boolean; guestResearch: boolean };

export function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ liner: false, supabase: false, serviceRole: false, guestResearch: false }));
  }, []);
  return health;
}
