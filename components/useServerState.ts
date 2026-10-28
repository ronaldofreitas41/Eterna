"use client";

import { useEffect, useState } from "react";

/**
 * Estado local que começa com os dados do servidor e é substituído quando o servidor manda dados novos
 * (por exemplo, depois de uma alteração feita em outro aparelho e do router.refresh do LiveSync).
 */
export function useServerState<T>(server: T) {
  const [value, setValue] = useState(server);
  useEffect(() => setValue(server), [server]);
  return [value, setValue] as const;
}
