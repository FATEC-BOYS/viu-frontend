'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  dadosFiscaisApi,
  faltaPreencher,
  mascararCep,
  mascararDocumento,
  rotuloDoDocumento,
  rotuloDoNome,
  UFS,
  type DadosFiscaisEntrada,
  type TipoPessoa,
} from '@/lib/dadosFiscais'

/**
 * Os dados que uma nota fiscal precisa.
 *
 * O VIU não emite nota hoje — os termos dizem isso na cláusula 4.2 — e este
 * formulário não muda isso. Ele existe porque emitir depende destes campos e
 * não havia um só deles no produto; e porque quem emite a própria nota precisa
 * tê-los reunidos em algum lugar.
 *
 * O texto do cartão diz exatamente isso. Pedir CPF e endereço completo
 * insinuando uma emissão que não acontece seria arrancar dado pessoal com uma
 * promessa falsa.
 *
 * Nada aqui confere documento: quem faz isso é o servidor, e a recusa dele
 * chega com o campo e o motivo. É o mesmo arranjo da chave PIX em /saques —
 * o algoritmo dos dígitos verificadores nos dois lados seriam duas verdades
 * sobre o que é um CNPJ válido.
 */

const VAZIO: DadosFiscaisEntrada = {
  tipoPessoa: 'JURIDICA',
  documento: '',
  razaoSocial: '',
  nomeFantasia: '',
  inscricaoMunicipal: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
}

export default function DadosFiscaisCard() {
  const [form, setForm] = useState<DadosFiscaisEntrada>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [jaPreenchido, setJaPreenchido] = useState(false)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  const carregar = () => {
    setCarregando(true)
    setErro(null)
    dadosFiscaisApi
      .get()
      .then((res) => {
        const d = res.data
        setJaPreenchido(d !== null)
        if (d) {
          setForm({
            tipoPessoa: d.tipoPessoa,
            // O servidor manda formatado; é o que a pessoa reconhece.
            documento: d.documentoFormatado,
            razaoSocial: d.razaoSocial,
            nomeFantasia: d.nomeFantasia ?? '',
            inscricaoMunicipal: d.inscricaoMunicipal ?? '',
            cep: d.cepFormatado,
            logradouro: d.logradouro,
            numero: d.numero,
            complemento: d.complemento ?? '',
            bairro: d.bairro,
            cidade: d.cidade,
            uf: d.uf,
          })
        }
      })
      /* Falha de leitura precisa aparecer como falha: cair no formulário
         vazio faria alguém redigitar tudo por cima do que já existe. */
      .catch((e: unknown) =>
        setErro((e as { message?: string })?.message ?? 'Não foi possível carregar seus dados fiscais.'),
      )
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  const trocarTipo = (tipoPessoa: TipoPessoa) =>
    // O documento some: um CPF digitado não vira CNPJ por mudar o seletor, e
    // deixá-lo ali só produziria uma recusa do servidor.
    setForm((p) => ({ ...p, tipoPessoa, documento: '' }))

  async function salvar() {
    setSalvando(true)
    try {
      await dadosFiscaisApi.salvar(form)
      setJaPreenchido(true)
      toast.success('Dados fiscais salvos.')
    } catch (e: unknown) {
      // A mensagem do servidor diz qual campo corrigir — "CNPJ inválido",
      // "CEP inválido — são oito dígitos".
      toast.error((e as { message?: string })?.message ?? 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover() {
    try {
      await dadosFiscaisApi.remover()
      setForm(VAZIO)
      setJaPreenchido(false)
      toast.success('Dados fiscais removidos.')
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Não foi possível remover.')
    } finally {
      setConfirmarRemocao(false)
    }
  }

  const campo = (k: keyof DadosFiscaisEntrada) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados fiscais
        </CardTitle>
        {/* A razão do pedido, dita como ela é. Pedir CPF e endereço completo
            insinuando uma emissão que não acontece seria arrancar dado pessoal
            com promessa falsa. */}
        <p className="text-sm text-muted-foreground">
          O VIU ainda não emite nota fiscal. Estes dados ficam guardados na sua conta, só para
          você, e são o que qualquer emissão futura vai exigir — além de reunirem num lugar o
          que você precisa para emitir a sua.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {carregando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : erro ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button size="sm" variant="outline" onClick={carregar}>Tentar de novo</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="df-tipo">Tipo de pessoa</Label>
                <Select value={form.tipoPessoa} onValueChange={(v) => trocarTipo(v as TipoPessoa)}>
                  <SelectTrigger id="df-tipo" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JURIDICA">Pessoa jurídica (CNPJ)</SelectItem>
                    <SelectItem value="FISICA">Pessoa física (CPF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="df-doc">{rotuloDoDocumento(form.tipoPessoa)}</Label>
                <Input
                  id="df-doc"
                  inputMode="numeric"
                  value={form.documento}
                  onChange={(e) => campo('documento')(mascararDocumento(e.target.value, form.tipoPessoa))}
                  placeholder={form.tipoPessoa === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="df-nome">{rotuloDoNome(form.tipoPessoa)}</Label>
                <Input id="df-nome" value={form.razaoSocial} onChange={(e) => campo('razaoSocial')(e.target.value)} />
              </div>
              {/* Nome fantasia e inscrição municipal só existem para PJ: pedi-los
                  a uma pessoa física é pedir o que ela não tem. */}
              {form.tipoPessoa === 'JURIDICA' && (
                <div className="space-y-2">
                  <Label htmlFor="df-fantasia">Nome fantasia <span className="text-muted-foreground">(opcional)</span></Label>
                  <Input id="df-fantasia" value={form.nomeFantasia ?? ''} onChange={(e) => campo('nomeFantasia')(e.target.value)} />
                </div>
              )}
            </div>

            {form.tipoPessoa === 'JURIDICA' && (
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="df-im">Inscrição municipal <span className="text-muted-foreground">(opcional)</span></Label>
                <Input id="df-im" value={form.inscricaoMunicipal ?? ''} onChange={(e) => campo('inscricaoMunicipal')(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Quem presta serviço e emite NFS-e costuma ter uma. Nem todo município exige.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <div className="space-y-2">
                <Label htmlFor="df-cep">CEP</Label>
                <Input
                  id="df-cep"
                  inputMode="numeric"
                  value={form.cep}
                  onChange={(e) => campo('cep')(mascararCep(e.target.value))}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="df-logradouro">Logradouro</Label>
                <Input id="df-logradouro" value={form.logradouro} onChange={(e) => campo('logradouro')(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="df-numero">Número</Label>
                <Input id="df-numero" value={form.numero} onChange={(e) => campo('numero')(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="df-compl">Complemento <span className="text-muted-foreground">(opcional)</span></Label>
                <Input id="df-compl" value={form.complemento ?? ''} onChange={(e) => campo('complemento')(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
              <div className="space-y-2">
                <Label htmlFor="df-bairro">Bairro</Label>
                <Input id="df-bairro" value={form.bairro} onChange={(e) => campo('bairro')(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="df-cidade">Cidade</Label>
                <Input id="df-cidade" value={form.cidade} onChange={(e) => campo('cidade')(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="df-uf">UF</Label>
                <Select value={form.uf} onValueChange={campo('uf')}>
                  <SelectTrigger id="df-uf" className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={salvar} disabled={salvando || faltaPreencher(form)} className="w-full sm:w-auto">
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar dados fiscais
              </Button>
              {/* Só aparece quando há o que remover — um botão que apaga o
                  nada é um botão que só sabe confundir. */}
              {jaPreenchido && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmarRemocao(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>

            {/* Diz por que o botão está desligado, em vez de deixar a pessoa
                procurando o campo que falta. */}
            {faltaPreencher(form) && (
              <p className="text-xs text-muted-foreground">
                Preencha documento, {rotuloDoNome(form.tipoPessoa).toLowerCase()} e o endereço
                completo. Nota fiscal com endereço pela metade é recusada na emissão.
              </p>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover seus dados fiscais?</AlertDialogTitle>
            <AlertDialogDescription>
              Eles saem da sua conta. Você pode preencher de novo quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={remover}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
