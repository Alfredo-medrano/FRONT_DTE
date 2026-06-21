'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Mail, Phone, MapPin, FileText, Edit2, Save, X, Shield, 
  AlertTriangle, Wifi, WifiOff, RefreshCw, CheckCircle2, Lock, ShieldAlert,
  Upload, Loader2, Key, Trash2
} from 'lucide-react';
import { useAPI } from '@/hooks/use-api';
import { useEmisorStore } from '@/hooks/use-emisor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { fetchClient } from '@/lib/api-client';
import { useSWRConfig } from 'swr';
import { DEPARTAMENTOS, getMunicipiosPorDepto } from '@/lib/catalogos-mh';

export default function MiEmpresaPage() {
  const { data, isLoading, mutate } = useAPI<any[]>('/api/dte/v2/mi-cuenta/emisores');
  const emisorName = useEmisorStore((s) => s.emisorName);
  const emisores = Array.isArray(data) ? data : [];
  const empresa = emisores[0] || null;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombreComercial: '',
    correo: '',
    telefono: '',
    departamento: '06',
    municipio: '14',
    complemento: '',
    codEstableMH: 'M001',
    codPuntoVentaMH: 'P001',
    tipoEstablecimiento: '01',
  });

  const startEditing = () => {
    if (empresa) {
      setFormData({
        nombreComercial: empresa.nombreComercial || '',
        correo: empresa.correo || '',
        telefono: empresa.telefono || '',
        departamento: empresa.departamento || '06',
        municipio: empresa.municipio || '14',
        complemento: empresa.complemento || '',
        codEstableMH: empresa.codEstableMH || 'M001',
        codPuntoVentaMH: empresa.codPuntoVentaMH || 'P001',
        tipoEstablecimiento: empresa.tipoEstablecimiento || '01',
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!empresa) return;
    setSaving(true);
    try {
      await fetchClient(`/api/dte/v2/mi-cuenta/emisores/${empresa.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      await mutate();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Encabezado ──────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mi Empresa</h2>
        <p className="text-muted-foreground text-sm">
          Información fiscal registrada ante el Ministerio de Hacienda.
        </p>
      </div>

      {/* ── Tarjeta principal de empresa ─ */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl">
              {emisorName ? emisorName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <CardTitle className="text-lg">{empresa?.nombre || emisorName || 'Mi Empresa'}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {empresa?.activo ? (
                  <Badge className="bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20">
                    <Shield className="h-3 w-3 mr-1" />
                    Verificada con Hacienda
                  </Badge>
                ) : (
                  <Badge variant="secondary">Pendiente de verificación</Badge>
                )}
              </CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditing} disabled={isLoading || !empresa}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {empresa ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Datos fiscales */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Datos Fiscales
                </h3>
                <InfoRow label="NIT" value={empresa.nit} mono />
                <InfoRow label="NRC" value={empresa.nrc} mono />
                
                {isEditing ? (
                  <div className="space-y-1">
                    <Label htmlFor="nombreComercial" className="text-xs text-muted-foreground font-semibold uppercase">Nombre Comercial</Label>
                    <Input
                      id="nombreComercial"
                      value={formData.nombreComercial}
                      onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                      className="h-9"
                    />
                  </div>
                ) : (
                  <InfoRow label="Nombre Comercial" value={empresa.nombreComercial || '—'} />
                )}
                
                <InfoRow label="Actividad Económica" value={`${empresa.codActividad} — ${empresa.descActividad}`} />
                <InfoRow
                  label="Ambiente"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        empresa.ambiente === '00' || empresa.ambiente === 'PRUEBAS'
                          ? 'text-orange-600 bg-orange-50 border-orange-200'
                          : 'text-green-600 bg-green-50 border-green-200'
                      }
                    >
                      {empresa.ambiente === '00' || empresa.ambiente === 'PRUEBAS' ? '🧪 Pruebas' : '🟢 Producción'}
                    </Badge>
                  }
                />
              </div>

              {/* Contacto y dirección */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Contacto y Dirección
                </h3>
                
                {isEditing ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="correo" className="text-xs text-muted-foreground font-semibold uppercase">Correo</Label>
                      <Input
                        id="correo"
                        type="email"
                        value={formData.correo}
                        onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="telefono" className="text-xs text-muted-foreground font-semibold uppercase">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') })}
                        className="h-9"
                        maxLength={8}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="depto" className="text-xs text-muted-foreground font-semibold uppercase">Departamento</Label>
                      <select
                        id="depto"
                        value={formData.departamento}
                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value, municipio: '' })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {DEPARTAMENTOS.map((d) => (
                          <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="muni" className="text-xs text-muted-foreground font-semibold uppercase">Municipio</Label>
                      <select
                        id="muni"
                        value={formData.municipio}
                        onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        disabled={!formData.departamento}
                      >
                        <option value="">Seleccionar municipio...</option>
                        {getMunicipiosPorDepto(formData.departamento).map((m) => (
                          <option key={`${m.departamento}-${m.codigo}`} value={m.codigo}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="complemento" className="text-xs text-muted-foreground font-semibold uppercase">Dirección</Label>
                      <Input
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Correo" value={empresa.correo} icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />} />
                    <InfoRow label="Teléfono" value={empresa.telefono} icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />} />
                    <InfoRow label="Departamento" value={DEPARTAMENTOS.find(d => d.codigo === empresa.departamento)?.nombre || empresa.departamento} />
                    <InfoRow label="Municipio" value={getMunicipiosPorDepto(empresa.departamento).find(m => m.codigo === empresa.municipio)?.nombre || empresa.municipio} />
                    <InfoRow label="Dirección" value={empresa.complemento} />
                  </>
                )}
              </div>

              {/* Códigos MH */}
              <div className="space-y-4 md:col-span-2 pt-2 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Configuración de Establecimiento
                </h3>
                
                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="codEstableMH" className="text-xs text-muted-foreground font-semibold uppercase">Código Establecimiento</Label>
                      <Input
                        id="codEstableMH"
                        value={formData.codEstableMH}
                        onChange={(e) => setFormData({ ...formData, codEstableMH: e.target.value })}
                        className="h-9 font-mono"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="codPuntoVentaMH" className="text-xs text-muted-foreground font-semibold uppercase">Punto de Venta</Label>
                      <Input
                        id="codPuntoVentaMH"
                        value={formData.codPuntoVentaMH}
                        onChange={(e) => setFormData({ ...formData, codPuntoVentaMH: e.target.value })}
                        className="h-9 font-mono"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tipoEstablecimiento" className="text-xs text-muted-foreground font-semibold uppercase">Tipo Establecimiento</Label>
                      <select
                        id="tipoEstablecimiento"
                        value={formData.tipoEstablecimiento}
                        onChange={(e) => setFormData({ ...formData, tipoEstablecimiento: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="01">01. Sucursal / Casa Matriz</option>
                        <option value="02">02. Oficina</option>
                        <option value="03">03. Bodega</option>
                        <option value="04">04. Punto de Venta</option>
                        <option value="07">07. Otro</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoRow label="Código Establecimiento" value={empresa.codEstableMH || 'M001'} mono />
                    <InfoRow label="Punto de Venta" value={empresa.codPuntoVentaMH || 'P001'} mono />
                    <InfoRow label="Tipo Establecimiento" value={empresa.tipoEstablecimiento || '01'} mono />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Cargando datos de tu empresa...' : 'No se encontraron datos de empresa.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Control de Contingencia ── */}
      <ContingenciaControlCard />

      {/* ── Certificado de Firma ────── */}
      {empresa && (
        <CertificadoFirmaCard empresa={empresa} mutateEmisor={mutate} />
      )}

      {/* ── Seguridad ───────────────── */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Seguridad
          </CardTitle>
          <CardDescription>
            Tus credenciales del Ministerio de Hacienda están encriptadas con AES-256.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Clave API de Hacienda</p>
              <p className="text-xs text-muted-foreground">Almacenada de forma encriptada</p>
            </div>
            <Badge variant="outline" className="text-green-600 bg-green-50">
              🔒 Protegida
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Componente de Control de Contingencia ──

function ContingenciaControlCard() {
  const { data: state, mutate } = useAPI<any>('/api/dte/v2/mi-cuenta/contingencia');
  const { mutate: globalMutate } = useSWRConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'activar' | 'desactivar' | 'limpiar' | null>(null);
  const [password, setPassword] = useState('');
  const [tipoCont, setTipoCont] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const handleOpenDialog = (type: 'activar' | 'desactivar' | 'limpiar') => {
    setActionType(type);
    setPassword('');
    setTipoCont(1);
    setMotivo('');
    setErrorMsg('');
    setSyncResult(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('La contraseña es obligatoria');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      let endpoint = '';
      if (actionType === 'activar') {
        endpoint = '/api/dte/v2/mi-cuenta/contingencia/activar';
      } else if (actionType === 'desactivar') {
        endpoint = '/api/dte/v2/mi-cuenta/contingencia/desactivar';
      } else {
        endpoint = '/api/dte/v2/mi-cuenta/contingencia/limpiar';
      }

      const payload = actionType === 'activar' 
        ? { passwordApi: password, tipoContingencia: tipoCont, motivoContingencia: motivo }
        : { passwordApi: password };

      const res = await fetchClient<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.exito) {
        if (actionType === 'desactivar' && res.datos) {
          setSyncResult(res.datos);
        }
        setDialogOpen(false);
        mutate();
        globalMutate('/api/dte/v2/mi-cuenta/alertas-contingencia');
      } else {
        setErrorMsg(res.mensaje || 'Error al procesar la operación');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetchClient<any>('/api/dte/v2/mi-cuenta/contingencia/regularizar', {
        method: 'POST',
      });
      if (res.exito && res.datos) {
        setSyncResult(res.datos);
        mutate();
      }
    } catch (err: any) {
      alert(`Error al regularizar: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!state) return null;

  const getStatusText = () => {
    if (state.contingenciaManual) return 'Contingencia Manual Activa';
    if (state.dtesPendientes > 0) return 'Contingencia Automática Activa';
    return 'Operación Normal';
  };

  const getStatusBadgeClass = () => {
    if (state.contingenciaManual) return 'bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/20';
    if (state.dtesPendientes > 0) return 'bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20';
    return 'bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20';
  };

  return (
    <Card className="border-amber-500/20 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Módulo de Control de Contingencia
          </CardTitle>
          <CardDescription>
            Activa el modo contingencia manual o regulariza los documentos retenidos offline.
          </CardDescription>
        </div>
        <Badge className={`px-2.5 py-0.5 rounded border text-[11px] font-semibold tracking-wider uppercase select-none ${getStatusBadgeClass()}`}>
          {getStatusText()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pings & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Healthcheck Semáforo */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Conexión MH</span>
              <div className="text-sm font-medium flex items-center gap-1.5">
                {state.conexionMH ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">En Línea</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
                    <span className="text-red-500 font-semibold">Desconectado</span>
                  </>
                )}
              </div>
            </div>
            <div className={`h-3 w-3 rounded-full ${state.conexionMH ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'}`} />
          </div>

          {/* DTEs Retenidos */}
          <div className="flex flex-col rounded-lg border bg-muted/40 p-4 justify-center">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">DTEs en Cola</span>
            <div className="text-lg font-bold flex items-baseline gap-1.5 mt-0.5">
              <span className={state.dtesPendientes > 0 ? 'text-amber-500 font-mono' : 'font-mono'}>{state.dtesPendientes}</span>
              <span className="text-xs text-muted-foreground font-normal">documentos pendientes</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {state.contingenciaManual ? (
              <Button 
                variant="destructive" 
                className="flex-1 h-11"
                onClick={() => handleOpenDialog('desactivar')}
              >
                <Wifi className="h-4 w-4 mr-2" />
                Salir de Contingencia
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1 h-11 border-amber-500/40 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300"
                onClick={() => handleOpenDialog('activar')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Forzar Contingencia
              </Button>
            )}

            {state.dtesPendientes > 0 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  disabled={syncing || !state.conexionMH}
                  className="flex-1 sm:flex-none h-11 px-4"
                  title="Sincronizar ahora"
                  onClick={handleManualSync}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                </Button>
                
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-none h-11 px-4 bg-red-600 hover:bg-red-700 text-white font-medium"
                  title="Detener y limpiar cola de contingencia"
                  onClick={() => handleOpenDialog('limpiar')}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Limpiar Cola
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sync results presentation */}
        {syncResult && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2 text-xs md:text-sm animate-in fade-in-0 duration-200">
            <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sincronización de Contingencia Completada
            </h4>
            <div className="grid grid-cols-2 gap-y-1 md:grid-cols-4 font-mono text-muted-foreground">
              <div>Total: <span className="font-bold text-foreground">{syncResult.procesados}</span></div>
              <div>Éxito: <span className="font-bold text-green-600">{syncResult.exitosos}</span></div>
              <div>Fallo: <span className="font-bold text-red-500">{syncResult.fallidos}</span></div>
              <div className="col-span-2 md:col-span-1 truncate">ID Evento: <span className="font-bold text-foreground" title={syncResult.codigoGeneracionEvento}>{syncResult.codigoGeneracionEvento?.substring(0,8)}...</span></div>
            </div>
            {syncResult.fallas && syncResult.fallas.length > 0 && (
              <div className="border-t border-red-500/10 pt-2 mt-2 space-y-1">
                <span className="font-semibold text-red-500">Errores detallados de transmisión:</span>
                {syncResult.fallas.map((f: any, idx: number) => (
                  <div key={idx} className="font-mono text-[11px] text-red-400">
                    • {f.codigoGeneracion?.substring(0,8)}: {typeof f.error === 'object' ? JSON.stringify(f.error) : f.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dialog Modal */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'activar' && (
                  <>
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    Forzar Contingencia Manual
                  </>
                )}
                {actionType === 'desactivar' && (
                  <>
                    <Wifi className="h-5 w-5 text-green-500" />
                    Desactivar Contingencia & Sincronizar
                  </>
                )}
                {actionType === 'limpiar' && (
                  <>
                    <Trash2 className="h-5 w-5 text-red-500" />
                    Detener y Limpiar Cola de Contingencia
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'activar' && 'El sistema dejará de conectarse temporalmente con Hacienda y firmará todas las facturas de forma local e instantánea.'}
                {actionType === 'desactivar' && 'Se restaurará la operación normal. El sistema enviará el Evento de Contingencia detallando todos los DTEs emitidos durante este periodo y los transmitirá a Hacienda.'}
                {actionType === 'limpiar' && '⚠️ Esta acción eliminará permanentemente todos los DTEs locales que están en cola en estado CONTINGENCIA y no han sido transmitidos a Hacienda. Esta operación no se puede deshacer.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {actionType === 'activar' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="tipoCont">Tipo de Contingencia (MH CAT-005)</Label>
                    <select
                      id="tipoCont"
                      value={tipoCont}
                      onChange={(e) => setTipoCont(parseInt(e.target.value, 10))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value={1}>1. No disponibilidad de sistemas del MH</option>
                      <option value={2}>2. Fallas en el Internet del emisor</option>
                      <option value={3}>3. Fallas en el suministro eléctrico del emisor</option>
                      <option value={4}>4. Fallas en el sistema informático del emisor</option>
                      <option value={5}>5. Otros motivos</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="motivo">Motivo / Descripción</Label>
                    <Input
                      id="motivo"
                      placeholder="Ej. Corte de fibra óptica por accidente en zona"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      required={tipoCont === 5}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Contraseña API de Hacienda
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                  {errorMsg}
                </p>
              )}

              <DialogFooter className="flex justify-end gap-2 border-t pt-3 -mx-4 -mb-4 bg-muted/30">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                 <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  variant={actionType === 'limpiar' ? 'destructive' : actionType === 'activar' ? 'default' : 'secondary'}
                >
                  {isSubmitting ? 'Validando...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ── Componente auxiliar ────────────────

function InfoRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      <div className={`text-sm font-medium flex items-center gap-1.5 ${mono ? 'font-mono' : ''}`}>
        {icon}
        {value || '—'}
      </div>
    </div>
  );
}

// ── Componente de Certificado de Firma ──

function CertificadoFirmaCard({ empresa, mutateEmisor }: { empresa: any; mutateEmisor: () => void }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Validar extensión
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'crt' && ext !== 'xml') {
      setErrorMsg('Formato de archivo no válido. Solo se admiten archivos .crt o .xml');
      return;
    }

    // Validar tamaño < 1MB
    if (file.size > 1024 * 1024) {
      setErrorMsg('El archivo excede el tamaño máximo permitido de 1MB');
      return;
    }

    // Si ya existe un certificado configurado, pedir confirmación
    if (empresa.certUploadedAt) {
      setPendingFile(file);
      setConfirmDialogOpen(true);
    } else {
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!password.trim()) {
      setErrorMsg('Debes ingresar la contraseña del certificado antes de subirlo.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('certificado', file);
    formData.append('mhClavePrivada', password.trim());

    try {
      const res = await fetchClient<any>(`/api/dte/v2/mi-cuenta/emisores/${empresa.id}/certificado`, {
        method: 'POST',
        body: formData,
      });

      if (res.exito || res.success) {
        setSuccessMsg(`Certificado cargado con éxito para el NIT ${res.nitDetectado || empresa.nit}`);
        mutateEmisor();
      } else {
        setErrorMsg(res.mensaje || 'Error al procesar el certificado, intenta nuevamente');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación con el servidor');
    } finally {
      setLoading(false);
      setPendingFile(null);
      setPassword('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmOverwrite = () => {
    setConfirmDialogOpen(false);
    if (pendingFile) {
      uploadFile(pendingFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return fechaStr;
    }
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Certificado de Firma
        </CardTitle>
        <CardDescription>
          Certificado digital (.crt o .xml) emitido por el Ministerio de Hacienda para firmar tus documentos tributarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          accept=".crt,.xml"
          className="hidden"
          onChange={handleFileChange}
          disabled={loading || !password.trim()}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Contraseña del Certificado
          </label>
          <input
            type="password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ingresa la contraseña de tu llave privada..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <p className="text-[0.8rem] text-muted-foreground">
            Ingresa la contraseña que asignaste a tu llave privada al descargar el certificado de Hacienda.
          </p>
        </div>

        {!empresa.certUploadedAt ? (
          <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                No tienes un certificado de firma configurado.
              </p>
              <p className="text-xs text-muted-foreground">
                Para emitir documentos tributarios electrónicos necesitas ingresar tu contraseña y luego subir el archivo .crt o .xml que te entregó el Ministerio de Hacienda al registrarte como emisor.
              </p>
            </div>
            <Button
              onClick={triggerFileInput}
              disabled={loading || !password.trim()}
              className="w-full md:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Certificado
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-4 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Certificado activo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
                <div>NIT del emisor: <span className="font-semibold text-foreground">{empresa.nit}</span></div>
                <div>Última actualización: <span className="font-semibold text-foreground">{formatFecha(empresa.certUploadedAt)}</span></div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={triggerFileInput}
              disabled={loading || !password.trim()}
              className="w-full md:w-auto shrink-0 border-green-500/30 hover:bg-green-500/10 text-green-700 dark:text-green-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar Certificado
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Subiendo certificado...</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                ¿Reemplazar certificado de firma?
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro? Esto reemplazará tu certificado actual y modificará la clave con la que firmas los DTEs.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2 border-t pt-3 -mx-4 -mb-4 bg-muted/30">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmDialogOpen(false);
                  setPendingFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmOverwrite}
              >
                Reemplazar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
