import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// O auto-cleanup do Testing Library se registra num afterEach global, que só
// existe com `globals: true` no vitest.config. Como este projeto não usa
// globals, cada teste deixava o DOM do anterior montado e as buscas por texto
// falhavam com "Found multiple elements".
afterEach(() => {
  cleanup();
});
