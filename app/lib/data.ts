"use client";

import { useEffect, useMemo, useState } from "react";
import { predict } from "./predict";
import type { Customer, ModelJson } from "./predict";

export type Segments = {
  overall: { n: number; rate: number };
} & Record<string, { label: string; n: number; rate: number }[] | { n: number; rate: number }>;

export type TestCustomer = Customer & { id: string; churned: number };
export type Scored = { customer: TestCustomer; p: number };

const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export function useJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    load<T>(url)
      .then((d) => alive && setData(d))
      .catch((e: Error) => {
        cache.delete(url); // allow a retry on the next mount
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return { data, error };
}

export const useModel = () => useJson<ModelJson>("/model.json");
export const useSegments = () => useJson<Segments>("/data/segments.json");

/** Held-out test customers scored by the model, highest risk first. */
export function useScored() {
  const { data: model, error: e1 } = useModel();
  const { data: customers, error: e2 } = useJson<TestCustomer[]>("/data/customers.json");
  const scored = useMemo<Scored[] | null>(() => {
    if (!model || !customers) return null;
    return customers
      .map((customer) => ({ customer, p: predict(model, customer).probability }))
      .sort((a, b) => b.p - a.p);
  }, [model, customers]);
  return { model, scored, error: e1 ?? e2 };
}
