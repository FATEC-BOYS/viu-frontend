This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Variáveis de Ambiente

### Desenvolvimento Local

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# OpenAI (para TTS e transcrição)
OPENAI_API_KEY=sk-proj-...
```

### Vercel (Produção)

Para configurar as variáveis de ambiente no Vercel:

1. Acesse seu projeto no dashboard do Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione cada variável:
   - **Key**: Nome da variável (ex: `OPENAI_API_KEY`)
   - **Value**: Valor da variável (ex: `sk-proj-...`)
   - **Environments**: Selecione Production, Preview e/ou Development

4. Após adicionar, faça um novo deploy ou force redeploy para aplicar as mudanças

**Importante**:
- Variáveis com prefixo `NEXT_PUBLIC_` são expostas no cliente (navegador)
- Variáveis sem prefixo são acessíveis apenas no servidor (API routes)
- Use `process.env.NOME_DA_VARIAVEL` para acessar as variáveis no código

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
