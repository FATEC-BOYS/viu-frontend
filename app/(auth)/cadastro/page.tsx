// app/(auth)/cadastro/page.tsx
"use client";

import { useMemo, useRef, useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getBaseUrl } from "@/lib/baseUrl";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Mail, User, Shield } from "lucide-react";

type Tipo = "DESIGNER" | "CLIENTE";

const STEPS = { ROLE: 0, EMAIL_AVATAR: 1, PASSWORD: 2 } as const;

/* ---------------------------------- helpers ---------------------------------- */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const COMMON_SEQUENCES = [
  "1234", "12345", "123456", "qwer", "asdf", "zxcv",
  "abcd", "0000", "1111", "password", "senha", "qwerty"
];

function suggestEmailFix(email: string) {
  const m = email.match(/@(gmai|gmal|gmial|gmail\.c|gmail\.co)$/i);
  if (m) return "Você quis dizer @gmail.com?";
  return null;
}
function splitEmailParts(email?: string) {
  if (!email) return [];
  const [local, domain] = email.toLowerCase().split("@");
  const domainParts = (domain || "").split(".").filter(Boolean);
  return [local, ...domainParts].filter((s) => s && s.length >= 3);
}
function containsAny(h: string, needles: string[]) {
  return needles.some((n) => n && h.includes(n));
}

function validatePassword(pwd: string, opts?: { minLength?: number; email?: string }) {
  const min = opts?.minLength ?? 10;
  const lengthOK = pwd.length >= min;
  const lowerOK = /[a-z]/.test(pwd);
  const upperOK = /[A-Z]/.test(pwd);
  const numberOK = /\d/.test(pwd);
  const symbolOK = /[^A-Za-z0-9]/.test(pwd);

  const lowered = pwd.toLowerCase();
  const parts = splitEmailParts(opts?.email);
  const notEmailPart = !containsAny(lowered, parts);

  const noCommonSeq =
    !containsAny(lowered, COMMON_SEQUENCES) &&
    !/(.)\1{2,}/.test(pwd);

  let rawScore = 0;
  if (lengthOK) rawScore++;
  if (lowerOK && upperOK) rawScore++;
  if (numberOK) rawScore++;
  if (symbolOK) rawScore++;
  if (notEmailPart && noCommonSeq) rawScore = Math.min(4, rawScore + 1);
  if (pwd.length < Math.max(8, min - 2)) rawScore = Math.min(rawScore, 2);

  const suggestions: string[] = [];
  if (!lengthOK) suggestions.push(`Use ao menos ${min} caracteres.`);
  if (!(lowerOK && upperOK)) suggestions.push("Misture maiúsculas e minúsculas.");
  if (!numberOK) suggestions.push("Inclua pelo menos um número.");
  if (!symbolOK) suggestions.push("Inclua um símbolo (ex.: !@#$%).");
  if (!notEmailPart) suggestions.push("Evite usar partes do seu e-mail.");
  if (!noCommonSeq) suggestions.push("Evite sequências fáceis ou repetições.");

  return {
    lengthOK, lowerOK, upperOK, numberOK, symbolOK,
    notEmailPart, noCommonSeq,
    score: Math.max(0, Math.min(4, rawScore)) as 0 | 1 | 2 | 3 | 4,
    suggestions,
  };
}

/* --------------------------- sub-blocos (inline) --------------------------- */

function RoleSelector({
  value, onChange, disabled,
}: { value: Tipo | null; onChange: (t: Tipo) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["DESIGNER", "CLIENTE"] as const).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            className={cn(
              "group relative rounded-lg border px-4 py-3 text-left transition",
              "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              active ? "border-primary ring-2 ring-primary/30" : "border-border"
            )}
            onClick={() => onChange(t)}
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {t === "DESIGNER" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="font-medium">{t === "DESIGNER" ? "Designer" : "Cliente"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t === "DESIGNER"
                ? "Acesso ao dashboard completo."
                : "Acompanha materiais por links compartilhados."}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function EmailInput({
  value, onChange, disabled, autoFocus,
}: {
  value: string; onChange: (v: string, isValid: boolean) => void;
  disabled?: boolean; autoFocus?: boolean;
}) {
  const id = useId();
  const trimmed = value.trim();
  const valid = useMemo(() => emailRegex.test(trimmed), [trimmed]);
  const hint = useMemo(() => suggestEmailFix(trimmed), [trimmed]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>E-mail</Label>
      <div className="relative">
        <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type="email"
          className="pl-8"
          value={value}
          onChange={(e) => onChange(e.target.value, emailRegex.test(e.target.value.trim()))}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={value ? (!valid || !!hint) : undefined}
          disabled={disabled}
          placeholder="seu@email.com"
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {!valid && value && (
        <p className="text-[11px] text-destructive">Digite um e-mail válido.</p>
      )}
    </div>
  );
}

function AvatarPicker({
  valueUrl, onPick, disabled,
}: {
  valueUrl: string | null; onPick: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(valueUrl);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function handleFile(f: File) {
    const objectUrl = URL.createObjectURL(f);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = objectUrl;
    setPreview(objectUrl);
    onPick(f, objectUrl);
  }

  return (
    <div className="space-y-2">
      <Label>Foto (opcional)</Label>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border">
          {preview ? (
            <Image
              src={preview}
              alt="Avatar preview"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
              Sem foto
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (!f) return;
              const maxMB = 5;
              if (f.size > maxMB * 1024 * 1024) {
                alert(`A imagem deve ter no máximo ${maxMB}MB.`);
                return;
              }
              handleFile(f);
            }}
            disabled={disabled}
            className="max-w-xs"
          />
          {preview && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPreview(null);
                onPick(null, null);
              }}
              disabled={disabled}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StrengthBar({ score }: { score: 0 | 1 | 2 | 3 | 4 }) {
  const labels = ["Muito fraca", "Fraca", "Ok", "Boa", "Excelente"];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-full rounded-full",
              i < score ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{labels[score]}</p>
    </div>
  );
}

function PasswordInputs({
  email, password, setPassword, confirm, setConfirm, disabled, onStrongChange,
}: {
  email: string;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  disabled?: boolean;
  onStrongChange?: (ok: boolean) => void;
}) {
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const v = useMemo(() => validatePassword(password, { email, minLength: 10 }), [password, email]);

  useEffect(() => {
    onStrongChange?.(v.score >= 3 && v.lengthOK && v.numberOK && v.symbolOK && v.lowerOK && v.upperOK);
  }, [v, onStrongChange]);

  const confirmOK = confirm.length > 0 && confirm === password;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={password ? (!v.lengthOK || !confirmOK ? true : false) : undefined}
            disabled={disabled}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            disabled={disabled}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <StrengthBar score={v.score} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <li className="flex items-center gap-2">
            {v.lengthOK ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={v.lengthOK ? "text-foreground" : "text-muted-foreground"}>Mín. 10 caracteres</span>
          </li>
          <li className="flex items-center gap-2">
            {v.lowerOK && v.upperOK ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={(v.lowerOK && v.upperOK) ? "text-foreground" : "text-muted-foreground"}>Maiúsculas e minúsculas</span>
          </li>
          <li className="flex items-center gap-2">
            {v.numberOK ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={v.numberOK ? "text-foreground" : "text-muted-foreground"}>Número</span>
          </li>
          <li className="flex items-center gap-2">
            {v.symbolOK ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={v.symbolOK ? "text-foreground" : "text-muted-foreground"}>Símbolo</span>
          </li>
          <li className="flex items-center gap-2">
            {v.notEmailPart ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={v.notEmailPart ? "text-foreground" : "text-muted-foreground"}>Sem partes do e-mail</span>
          </li>
          <li className="flex items-center gap-2">
            {v.noCommonSeq ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={v.noCommonSeq ? "text-foreground" : "text-muted-foreground"}>Sem sequências óbvias</span>
          </li>
        </ul>
        {v.suggestions.length > 0 && password && (
          <p className="text-[11px] text-muted-foreground">Dicas: {v.suggestions.join(" ")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Confirmar senha</Label>
        <div className="relative">
          <Input
            type={show2 ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={confirm ? (!confirmOK ? true : false) : undefined}
            disabled={disabled}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setShow2((s) => !s)}
            aria-label={show2 ? "Ocultar confirmação" : "Mostrar confirmação"}
            disabled={disabled}
          >
            {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {!!confirm && confirm !== password && (
          <p className="text-[11px] text-destructive">As senhas não coincidem.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Dica: use uma frase longa com números e símbolos. Ex: <em>Coelho!Salta#12</em>
        </p>
      </div>
    </div>
  );
}

function Stepper({
  canBack, canNext, onBack, onNext, isLastStep, submitting,
}: {
  canBack: boolean; canNext: boolean; onBack(): void; onNext(): void;
  isLastStep: boolean; submitting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      <Button type="button" variant="ghost" onClick={onBack} disabled={!canBack || submitting}>
        Voltar
      </Button>
      <Button type={isLastStep ? "submit" : "button"} onClick={isLastStep ? undefined : onNext} disabled={!canNext || submitting}>
        {isLastStep ? (submitting ? "Criando…" : "Criar conta") : "Continuar"}
      </Button>
    </div>
  );
}

function SocialGoogle({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" className="w-full gap-2" onClick={onClick} disabled={disabled}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 5.4 29.6 3.3 24 3.3 12.4 3.3 3 12.7 3 24.3S12.4 45.3 24 45.3c11.3 0 21-8.2 21-21 0-1.6-.2-3.1-.4-4.8z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.9C14.8 16.5 19 14 24 14c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 7.4 29.6 5.3 24 5.3c-7.1 0-13.3 3.6-17 9.4z"/>
        <path fill="#4CAF50" d="M24 43.3c5.2 0 9.6-1.7 12.8-4.7l-6-4.9C29.1 35.3 26.7 36 24 36c-5.3 0-9.7-3.4-11.4-8.1l-6.6 5C9.8 39.5 16.4 43.3 24 43.3z"/>
        <path fill="#1976D2" d="M45 24.3c0-1.3-.1-2.6-.4-3.8H24v8h11.3c-.7 3.4-2.8 6.2-5.8 8.1l6 4.9C39.9 38.9 45 32.4 45 24.3z"/>
      </svg>
      Continuar com Google
    </Button>
  );
}

/* ---------------------------------- página ---------------------------------- */

export default function CadastroPage() {
  const router = useRouter();

  const [step, setStep] = useState<number>(STEPS.ROLE);

  const [tipo, setTipo] = useState<Tipo | null>(null);

  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordStrong, setPasswordStrong] = useState(false);
  const [confirm, setConfirm] = useState("");

  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === STEPS.ROLE) return !!tipo;
    if (step === STEPS.EMAIL_AVATAR) return emailValid; // avatar opcional
    if (step === STEPS.PASSWORD) {
      const minRule = password.length >= 8;
      const match = confirm.length > 0 && confirm === password;
      return (passwordStrong || minRule) && match;
    }
    return false;
  }, [step, tipo, emailValid, password, passwordStrong, confirm]);

  const isLast = step === STEPS.PASSWORD;

  const handleBack = () => setStep((s) => Math.max(0, s - 1));
  const handleNext = () => setStep((s) => Math.min(STEPS.PASSWORD, s + 1));

  async function handleGoogle() {
    try {
      setSending(true);
      setMsg(null);
      const redirectTo = `${getBaseUrl()}/auth/callback?tipo=${encodeURIComponent(tipo ?? "DESIGNER")}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setMsg(`Erro ao redirecionar para o Google: ${error.message}`);
    } catch (err) {
      console.error(err);
      setMsg("Não foi possível iniciar o cadastro com Google.");
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sendingRef.current) return;
    if (!isLast || !canNext) return;

    try {
      sendingRef.current = true;
      setSending(true);
      setMsg(null);

      const emailRedirectTo = `${getBaseUrl()}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { tipo: tipo ?? "DESIGNER" },
        },
      });

      if (error) {
        setMsg(`Erro ao cadastrar: ${error.message}`);
        return;
      }

      // tenta enviar avatar (se possível agora)
      if (avatarFile) {
        try {
          const { data: sess } = await supabase.auth.getSession();
          const userId = sess?.session?.user?.id ?? data.user?.id;
          if (userId) {
            const ext = avatarFile.name.split(".").pop() || "jpg";
            const path = `users/${userId}.${ext}`;
            const up = await supabase.storage
              .from("avatars")
              .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || "image/*" });
            if (!up.error) {
              await supabase.auth.updateUser({ data: { tipo: tipo ?? "DESIGNER", avatar_path: path } });
            }
          }
        } catch (uerr) {
          console.warn("Falha ao enviar avatar agora (tente depois):", uerr);
        }
      }

      if (data?.user && !data.user.confirmed_at) {
        setMsg("Conta criada! Verifique seu e-mail e clique no link de confirmação.");
        return;
      }

      router.replace("/auth/callback");
    } catch (err) {
      console.error("Cadastro - exception:", err);
      setMsg("Erro inesperado ao cadastrar.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  /* ----------------------------------- UI ----------------------------------- */

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        {/* Card SEM a classe .card (pra não herdar o grid de fundo) */}
        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
                ← Voltar
              </Button>
              <div className="opacity-0 pointer-events-none select-none">←</div>
            </div>

            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>Use Google ou avance pelos passos abaixo.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google sempre visível */}
            <SocialGoogle onClick={handleGoogle} disabled={sending} />

            {/* divisor */}
            <div className="relative flex items-center my-1">
              <Separator className="flex-1" />
              <span className="px-3 text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Step 1: tipo */}
            {step === STEPS.ROLE && (
              <div className="space-y-4">
                <Label>Você é?</Label>
                <RoleSelector value={tipo} onChange={setTipo} />
                <p className="text-xs text-muted-foreground">
                  Clientes acessam materiais via links compartilhados. Designers têm dashboard completo.
                </p>
              </div>
            )}

            {/* Step 2: email + avatar */}
            {step === STEPS.EMAIL_AVATAR && (
              <div className="space-y-6">
                <EmailInput
                  value={email}
                  onChange={(v, ok) => { setEmail(v); setEmailValid(ok); }}
                  autoFocus
                  disabled={sending}
                />
                <AvatarPicker
                  valueUrl={avatarPreview}
                  onPick={(file, url) => { setAvatarFile(file); setAvatarPreview(url); }}
                  disabled={sending}
                />
              </div>
            )}

            {/* Step 3: senha */}
            {step === STEPS.PASSWORD && (
              <PasswordInputs
                email={email}
                password={password}
                setPassword={setPassword}
                confirm={confirm}
                setConfirm={setConfirm}
                disabled={sending}
                onStrongChange={setPasswordStrong}
              />
            )}

            {/* feedback */}
            {msg && (
              <p className="text-sm text-center text-muted-foreground" aria-live="polite">
                {msg}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", step >= 0 ? "bg-primary" : "bg-muted")} />
              <span className={cn("h-1.5 w-1.5 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
              <span className={cn("h-1.5 w-1.5 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            </div>

            <Stepper
              canBack={step > STEPS.ROLE}
              canNext={canNext}
              onBack={handleBack}
              onNext={handleNext}
              isLastStep={isLast}
              submitting={sending}
            />

            <p className="text-sm text-center">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
