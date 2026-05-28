import { useState, useEffect } from "react";
import { ref, onValue, off, DataSnapshot } from "firebase/database";
import { db } from "@/firebase";

export function useRealtimeData<T>(path: string, transform?: (data: any) => T): [T | null, boolean, Error | null] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    const dbRef = ref(db, path);
    setLoading(true);

    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (transform) {
          setData(transform(val));
        } else {
          setData(val as T);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching data at ${path}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(dbRef);
      unsubscribe();
    };
  }, [path, transform]);

  return [data, loading, error];
}
