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

/**
 * jsdom não implementa a API de Pointer Capture nem `scrollIntoView`, e o
 * Radix chama as duas ao abrir um Select ou um menu. Sem estes stubs o teste
 * morre em "target.hasPointerCapture is not a function" — falha do ambiente,
 * não do componente.
 */
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
