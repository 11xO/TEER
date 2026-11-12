import { useEffect, useState } from 'react';
import { watch } from '../api/firebase.js';

export function useDatabaseValue(path, initialValue = null, database = 'primary') {
  const [state, setState] = useState({ path: null, database, value: initialValue, loading: Boolean(path), error: null });
  useEffect(() => {
    if (!path) return undefined;
    return watch(path,
      (value) => setState({ path, database, value, loading: false, error: null }),
      (error) => setState({ path, database, value: null, loading: false, error }), database);
  }, [path, database]);
  if (!path) return { value: initialValue, loading: false, error: null };
  if (state.path !== path || state.database !== database) return { value: initialValue, loading: true, error: null };
  return { value: state.value ?? initialValue, loading: state.loading, error: state.error };
}
