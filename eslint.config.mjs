import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Dívida conhecida: ~200 ocorrências de `any`, a maioria em payloads de
      // API que nunca foram tipados. Fica como aviso para o lint poder rodar
      // bloqueante no CI hoje, em vez de ficar desligado esperando uma
      // limpeza que não tem dono. Ver TECH_DEBT.md.
      "@typescript-eslint/no-explicit-any": "warn",
      // Import ou variável sobrando não quebra nada em produção; entra como
      // aviso para não travar PR por causa de limpeza cosmética.
      "@typescript-eslint/no-unused-vars": "warn",
      // Depende de análise caso a caso; corrigir errado quebra o efeito.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
