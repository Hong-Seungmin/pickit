import { useCallback, useEffect, useRef, useState } from "react";
import {
  configByteSize,
  loadConfig,
  onConfigChanged,
  saveConfig,
  type StorageArea,
} from "../storage";
import { type Config, emptyConfig } from "../types";

export interface UseConfig {
  config: Config;
  loading: boolean;
  area: StorageArea;
  byteSize: number;
  /** Update + persist. Accepts a value or updater fn. */
  update: (next: Config | ((prev: Config) => Config)) => Promise<void>;
}

export function useConfig(): UseConfig {
  const [config, setConfig] = useState<Config>(emptyConfig());
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState<StorageArea>("sync");
  const [byteSize, setByteSize] = useState(0);

  // Mirror of the latest config so update() can compute from current state
  // without depending on it, and a serialized snapshot of what we last wrote so
  // we can ignore storage.onChanged echoes of our own writes (a single boolean
  // flag can't survive rapid saves like slider drags).
  const configRef = useRef<Config>(config);
  const lastWritten = useRef<string>("");

  const apply = useCallback((c: Config) => {
    configRef.current = c;
    setConfig(c);
    void configByteSize(c).then(setByteSize);
  }, []);

  useEffect(() => {
    let alive = true;
    loadConfig().then((c) => {
      if (!alive) return;
      lastWritten.current = JSON.stringify(c);
      apply(c);
      setLoading(false);
    });
    const unsub = onConfigChanged((c) => {
      const s = JSON.stringify(c);
      if (s === lastWritten.current) return; // echo of our own write
      lastWritten.current = s;
      apply(c); // genuine external change (e.g. another device)
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [apply]);

  const update = useCallback(
    async (next: Config | ((prev: Config) => Config)) => {
      const value =
        typeof next === "function"
          ? (next as (p: Config) => Config)(configRef.current)
          : next;
      lastWritten.current = JSON.stringify(value);
      apply(value);
      const used = await saveConfig(value);
      setArea(used);
    },
    [apply],
  );

  return { config, loading, area, byteSize, update };
}
