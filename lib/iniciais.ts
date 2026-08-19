/** Iniciais de um nome para usar como fallback de avatar. Duas letras, no máximo. */
export function iniciais(nome?: string | null) {
  if (!nome) return "??";
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}
