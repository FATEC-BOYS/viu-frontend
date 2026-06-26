"use client";

import { useMemo, useRef, useState, useId, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Mail, User, Shield } from "lucide-react";

type Tipo = "DESIGNER" | "CLIENTE";

const STEPS = { ROLE: 0, EMAIL_NOME: 1, PASSWORD: 2 } as const;

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
  const min = opts?.minLength ?? 12;
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

function NomeInput({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const valid = value.trim().length >= 2;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Nome</Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="name"
        placeholder="Seu nome"
        disabled={disabled}
        aria-invalid={value && !valid ? true : undefined}
      />
      {value && !valid && (
        <p className="text-[11px] text-destructive">Use ao menos 2 caracteres.</p>
      )}
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
  const v = useMemo(() => validatePassword(password, { email, minLength: 12 }), [password, email]);

  useEffect(() => {
    onStrongChange?.(v.score >= 3 && v.lengthOK && v.numberOK && v.symbolOK && v.lowerOK && v.upperOK);
  }, [v, onStrongChange]);

  const confirmOK = confirm.length > 0 && confirm === password;

  return (
    <div className="space-y-4">
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

        {password && (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Requisitos da senha
            </summary>
            <ul className="mt-2 space-y-1 pl-1">
              <li className="flex items-center gap-1.5">
                {v.lengthOK ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={v.lengthOK ? "text-foreground" : "text-muted-foreground"}>Mín. 12 caracteres</span>
              </li>
              <li className="flex items-center gap-1.5">
                {v.lowerOK && v.upperOK ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={(v.lowerOK && v.upperOK) ? "text-foreground" : "text-muted-foreground"}>Maiúsculas e minúsculas</span>
              </li>
              <li className="flex items-center gap-1.5">
                {v.numberOK ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={v.numberOK ? "text-foreground" : "text-muted-foreground"}>Pelo menos um número</span>
              </li>
              <li className="flex items-center gap-1.5">
                {v.symbolOK ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={v.symbolOK ? "text-foreground" : "text-muted-foreground"}>Pelo menos um símbolo</span>
              </li>
              <li className="flex items-center gap-1.5">
                {v.notEmailPart ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={v.notEmailPart ? "text-foreground" : "text-muted-foreground"}>Evite partes do e-mail</span>
              </li>
              <li className="flex items-center gap-1.5">
                {v.noCommonSeq ? <Check className="h-3 w-3 text-green-600 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={v.noCommonSeq ? "text-foreground" : "text-muted-foreground"}>Evite sequências óbvias</span>
              </li>
            </ul>
          </details>
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

/* ---------------------------------- página ---------------------------------- */

export default function CadastroPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<number>(STEPS.ROLE);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrong, setPasswordStrong] = useState(false);
  const [confirm, setConfirm] = useState("");

  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canNext = useMemo(() => {
    if (step === STEPS.ROLE) return !!tipo;
    if (step === STEPS.EMAIL_NOME) return emailValid && nome.trim().length >= 2;
    if (step === STEPS.PASSWORD) {
      const minRule = password.length >= 12;
      const match = confirm.length > 0 && confirm === password;
      return (passwordStrong || minRule) && match;
    }
    return false;
  }, [step, tipo, emailValid, nome, password, passwordStrong, confirm]);

  const isLast = step === STEPS.PASSWORD;

  const handleBack = () => setStep((s) => Math.max(0, s - 1));
  const handleNext = () => setStep((s) => Math.min(STEPS.PASSWORD, s + 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sendingRef.current) return;
    if (!isLast || !canNext) return;

    try {
      sendingRef.current = true;
      setSending(true);
      setMsg(null);

      await api.post('/auth/register', {
        nome: nome.trim(),
        email,
        senha: password,
        tipo: tipo ?? 'DESIGNER',
      });

      router.replace('/verificar-email');
    } catch (err: any) {
      setMsg(err?.message ?? 'Erro inesperado ao cadastrar.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <Card className="rounded-xl border bg-card">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>Preencha os campos abaixo para começar.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === STEPS.ROLE && (
              <div className="space-y-3">
                <Label>Você é?</Label>
                <RoleSelector value={tipo} onChange={setTipo} />
              </div>
            )}

            {step === STEPS.EMAIL_NOME && (
              <div className="space-y-4">
                <EmailInput
                  value={email}
                  onChange={(v, ok) => { setEmail(v); setEmailValid(ok); }}
                  autoFocus
                  disabled={sending}
                />
                <NomeInput
                  value={nome}
                  onChange={setNome}
                  disabled={sending}
                />
              </div>
            )}

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

            {msg && (
              <p className="text-sm text-center text-destructive" aria-live="polite">
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
