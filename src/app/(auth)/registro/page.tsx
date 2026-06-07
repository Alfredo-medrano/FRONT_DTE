'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistroStore, RegistroData } from '@/stores/registro-store';
import { useAuthStore } from '@/hooks/use-auth';
import { useEmisorStore } from '@/hooks/use-emisor';
import { fetchClient } from '@/lib/api-client';
import { DEPARTAMENTOS, getMunicipiosPorDepto, ACTIVIDADES_ECONOMICAS } from '@/lib/catalogos-mh';
import { PLANES, PlanDTE } from '@/lib/planes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  MapPin,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Check,
  Crown,
} from 'lucide-react';
import Link from 'next/link';

// ── Step indicator labels ──────────────────────
const STEPS = [
  { icon: Building2, label: 'Empresa' },
  { icon: MapPin, label: 'Dirección' },
  { icon: KeyRound, label: 'Plan & MH' },
  { icon: CheckCircle2, label: 'Confirmar' },
];

// ── NIT Mask helper ────────────────────────────
function formatNIT(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 4) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length <= 13) return `${digits.slice(0, 4)}-${digits.slice(4, 10)}-${digits.slice(10)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 10)}-${digits.slice(10, 13)}-${digits.slice(13, 14)}`;
}

export default function RegistroPage() {
  const router = useRouter();
  const { step, data, nextStep, prevStep, updateData, isSubmitting, submitError, setSubmitting, setSubmitError, reset } =
    useRegistroStore();
  const setEmisor = useEmisorStore((s) => s.setEmisor);
  const [apiKeyVisible, setApiKeyVisible] = useState<string | null>(null);

  // ── Validación por paso ──────────────────────
  const isStep1Valid = Boolean(
    data.razonSocial.trim() &&
      data.nit.match(/^\d{4}-\d{6}-\d{3}-\d{1}$/) &&
      data.nrc.trim() &&
      data.codActividad &&
      data.correo.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) &&
      data.telefono.match(/^\d{8}$/)
  );

  const isStep2Valid = Boolean(data.departamento && data.municipio && data.complemento.trim().length >= 5);

  const isStep3Valid = Boolean(data.mhClaveApi.trim() && data.plan);

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid, true][step];

  // ── Municipios filtrados ─────────────────────
  const municipiosFiltrados = useMemo(
    () => (data.departamento ? getMunicipiosPorDepto(data.departamento) : []),
    [data.departamento]
  );

  // ── Submit registration ──────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const resp = await fetchClient<{
        emisor: any;
        tenant: any;
        apiKey: { key: string };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          descActividad:
            data.descActividad ||
            ACTIVIDADES_ECONOMICAS.find((a) => a.codigo === data.codActividad)?.descripcion ||
            '',
        }),
      });

      // Mostrar API Key (solo una vez)
      if (resp.apiKey?.key) {
        setApiKeyVisible(resp.apiKey.key);
      }

      if (resp.emisor) {
        setEmisor(resp.emisor.id, resp.emisor.nombre || data.razonSocial);
      }

      // No redirigir inmediatamente — mostrar la API Key primero
    } catch (err: any) {
      setSubmitError(err.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    reset();
    router.push('/dashboard');
  };

  // ── Si registro fue exitoso, mostrar API Key ─
  if (apiKeyVisible) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-950/40 via-background to-emerald-950/30 p-4">
        <Card className="w-full max-w-lg border-green-500/30 shadow-2xl shadow-green-500/10">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 ring-4 ring-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">¡Cuenta Creada Exitosamente!</CardTitle>
            <CardDescription>Tu empresa ha sido registrada en el sistema DTE.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                API Key — Guárdala, NO se mostrará de nuevo
              </div>
              <code className="block break-all rounded bg-muted p-3 text-xs font-mono select-all">
                {apiKeyVisible}
              </code>
            </div>
            <Button className="w-full" size="lg" onClick={handleGoToDashboard}>
              <Sparkles className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950/80 via-background to-blue-950/40 p-4 md:p-8">
      {/* ── Back to Login ────────────────────── */}
      <div className="w-full max-w-3xl mb-6">
        <Link href="/setup" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver a Iniciar Sesión
        </Link>
      </div>

      {/* ── Stepper ──────────────────────────── */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const isDone = idx < step;
            const isCurrent = idx === step;
            return (
              <div key={idx} className="flex flex-1 items-center gap-0">
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                      ${isDone ? 'bg-primary border-primary text-primary-foreground scale-95' : ''}
                      ${isCurrent ? 'border-primary bg-primary/10 text-primary scale-110 ring-4 ring-primary/20' : ''}
                      ${!isDone && !isCurrent ? 'border-muted-foreground/30 text-muted-foreground/50' : ''}
                    `}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground/50'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 mt-[-18px]">
                    <div className={`h-0.5 w-full transition-colors duration-300 ${isDone ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card Container ───────────────────── */}
      <Card className="w-full max-w-3xl shadow-2xl border-primary/10 backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">{STEPS[step].label}</CardTitle>
          <CardDescription>
            {step === 0 && 'Ingresa los datos fiscales de tu empresa tal como aparecen en el NIT.'}
            {step === 1 && 'Dirección fiscal registrada ante el Ministerio de Hacienda.'}
            {step === 2 && 'Selecciona tu plan y conecta tus credenciales del Ministerio.'}
            {step === 3 && 'Revisa toda la información antes de crear tu cuenta.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ══════════════════════════════════ */}
          {/* PASO 1: DATOS DE EMPRESA          */}
          {/* ══════════════════════════════════ */}
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reg-razon">Razón Social *</Label>
                <Input
                  id="reg-razon"
                  placeholder="Mi Empresa S.A. de C.V."
                  value={data.razonSocial}
                  onChange={(e) => updateData({ razonSocial: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-comercial">Nombre Comercial</Label>
                <Input
                  id="reg-comercial"
                  placeholder="Mi Marca (opcional)"
                  value={data.nombreComercial}
                  onChange={(e) => updateData({ nombreComercial: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-nit">NIT *</Label>
                <Input
                  id="reg-nit"
                  placeholder="0614-000000-000-0"
                  value={data.nit}
                  onChange={(e) => updateData({ nit: formatNIT(e.target.value) })}
                  maxLength={17}
                />
                <p className="text-xs text-muted-foreground">Formato: 0000-000000-000-0</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-nrc">NRC *</Label>
                <Input
                  id="reg-nrc"
                  placeholder="123456-7"
                  value={data.nrc}
                  onChange={(e) => updateData({ nrc: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-actividad">Actividad Económica *</Label>
                <select
                  id="reg-actividad"
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={data.codActividad}
                  onChange={(e) => {
                    const act = ACTIVIDADES_ECONOMICAS.find((a) => a.codigo === e.target.value);
                    updateData({
                      codActividad: e.target.value,
                      descActividad: act?.descripcion || '',
                    });
                  }}
                >
                  <option value="">Seleccionar actividad...</option>
                  {ACTIVIDADES_ECONOMICAS.map((act) => (
                    <option key={act.codigo} value={act.codigo}>
                      {act.codigo} — {act.descripcion}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-correo">Correo Electrónico *</Label>
                <Input
                  id="reg-correo"
                  type="email"
                  placeholder="facturacion@miempresa.com"
                  value={data.correo}
                  onChange={(e) => updateData({ correo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-tel">Teléfono *</Label>
                <Input
                  id="reg-tel"
                  placeholder="22223333"
                  maxLength={8}
                  value={data.telefono}
                  onChange={(e) => updateData({ telefono: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                />
                <p className="text-xs text-muted-foreground">8 dígitos sin guion</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════ */}
          {/* PASO 2: DIRECCIÓN FISCAL          */}
          {/* ══════════════════════════════════ */}
          {step === 1 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reg-depto">Departamento *</Label>
                <select
                  id="reg-depto"
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={data.departamento}
                  onChange={(e) => updateData({ departamento: e.target.value, municipio: '' })}
                >
                  <option value="">Seleccionar departamento...</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-muni">Municipio *</Label>
                <select
                  id="reg-muni"
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={data.municipio}
                  onChange={(e) => updateData({ municipio: e.target.value })}
                  disabled={!data.departamento}
                >
                  <option value="">
                    {data.departamento ? 'Seleccionar municipio...' : 'Primero selecciona un departamento'}
                  </option>
                  {municipiosFiltrados.map((m) => (
                    <option key={`${m.departamento}-${m.codigo}`} value={m.codigo}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reg-compl">Dirección Complemento *</Label>
                <Input
                  id="reg-compl"
                  placeholder="Ej: Col. Escalón, 75 Av. Norte #123, San Salvador"
                  value={data.complemento}
                  onChange={(e) => updateData({ complemento: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Mínimo 5 caracteres. Incluye colonia, calle, número de local.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════ */}
          {/* PASO 3: PLAN & CREDENCIALES MH    */}
          {/* ══════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-8">
              {/* Plan Selector */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Selecciona tu Plan *</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {PLANES.map((plan: PlanDTE) => {
                    const isSelected = data.plan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => updateData({ plan: plan.id })}
                        className={`
                          relative text-left rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-lg group
                          ${isSelected
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-muted hover:border-muted-foreground/30 bg-card'
                          }
                        `}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                              <Crown className="h-3 w-3" />
                              POPULAR
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-2xl mr-2">{plan.iconEmoji}</span>
                            <span className="font-bold text-lg">{plan.nombre}</span>
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </div>

                        <div className="mb-3">
                          <span className="text-2xl font-extrabold">{plan.precio.split('/')[0]}</span>
                          <span className="text-sm text-muted-foreground">/mes</span>
                        </div>

                        <p className="text-xs text-muted-foreground mb-3">{plan.descripcion}</p>

                        <ul className="space-y-1.5">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-xs text-muted-foreground pl-5">
                              +{plan.features.length - 4} más...
                            </li>
                          )}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MH Credentials */}
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-base font-semibold">Credenciales del Ministerio de Hacienda</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="reg-mhclave">Clave API de Hacienda *</Label>
                    <Input
                      id="reg-mhclave"
                      type="password"
                      placeholder="La contraseña que te asignó el MH"
                      value={data.mhClaveApi}
                      onChange={(e) => updateData({ mhClaveApi: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta clave se validará contra la API del Ministerio de Hacienda y se almacenará de forma encriptada (AES-256).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-ambiente">Ambiente</Label>
                    <select
                      id="reg-ambiente"
                      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={data.ambiente}
                      onChange={(e) => updateData({ ambiente: e.target.value as '00' | '01' })}
                    >
                      <option value="00">Pruebas (00)</option>
                      <option value="01">Producción (01)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════ */}
          {/* PASO 4: CONFIRMACIÓN              */}
          {/* ══════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5">
              {submitError && (
                <div className="rounded-lg bg-destructive/10 text-destructive p-4 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Error en el registro</p>
                    <p className="text-sm mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              <ConfirmSection title="Datos de Empresa">
                <ConfirmRow label="Razón Social" value={data.razonSocial} />
                {data.nombreComercial && <ConfirmRow label="Nombre Comercial" value={data.nombreComercial} />}
                <ConfirmRow label="NIT" value={data.nit} mono />
                <ConfirmRow label="NRC" value={data.nrc} mono />
                <ConfirmRow
                  label="Actividad"
                  value={`${data.codActividad} — ${
                    data.descActividad || ACTIVIDADES_ECONOMICAS.find((a) => a.codigo === data.codActividad)?.descripcion || ''
                  }`}
                />
                <ConfirmRow label="Correo" value={data.correo} />
                <ConfirmRow label="Teléfono" value={data.telefono} />
              </ConfirmSection>

              <ConfirmSection title="Dirección Fiscal">
                <ConfirmRow
                  label="Departamento"
                  value={DEPARTAMENTOS.find((d) => d.codigo === data.departamento)?.nombre || data.departamento}
                />
                <ConfirmRow
                  label="Municipio"
                  value={municipiosFiltrados.find((m) => m.codigo === data.municipio)?.nombre || data.municipio}
                />
                <ConfirmRow label="Complemento" value={data.complemento} />
              </ConfirmSection>

              <ConfirmSection title="Plan & Configuración">
                <ConfirmRow
                  label="Plan"
                  value={(() => {
                    const p = PLANES.find((pl) => pl.id === data.plan);
                    return p ? `${p.iconEmoji} ${p.nombre} — ${p.precio}` : data.plan;
                  })()}
                />
                <ConfirmRow label="Ambiente" value={data.ambiente === '00' ? 'Pruebas' : 'Producción'} />
                <ConfirmRow label="Credenciales MH" value="••••••••" />
              </ConfirmSection>
            </div>
          )}

          {/* ── Navigation Buttons ───────────── */}
          <div className="flex items-center justify-between pt-6 border-t">
            {step > 0 ? (
              <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={nextStep} disabled={!canProceed}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-[200px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando con MH...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Crear Cuenta
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Footer ───────────────────────────── */}
      <p className="mt-6 text-center text-xs text-muted-foreground max-w-md">
        Al registrarte, tus credenciales del Ministerio de Hacienda se validarán en tiempo real y se almacenarán
        con encriptación AES-256-GCM. Cumplimos con ISO 27001.
      </p>
    </div>
  );
}

// ── Subcomponentes de Confirmación ──────────────

function ConfirmSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 border-b">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function ConfirmRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-right max-w-[60%] truncate ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}
