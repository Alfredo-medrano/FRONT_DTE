'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, FileText, Edit2, Save, X, Shield } from 'lucide-react';
import { useAPI } from '@/hooks/use-api';
import { useEmisorStore } from '@/hooks/use-emisor';

export default function MiEmpresaPage() {
  const { data, isLoading } = useAPI('/admin/tenants/current/emisores');
  const emisorName = useEmisorStore((s) => s.emisorName);
  const emisores: any[] = Array.isArray(data) ? data : [];
  const empresa = emisores[0] || null;

  const [isEditing, setIsEditing] = useState(false);

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
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setIsEditing(false)}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
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
                <InfoRow label="Nombre Comercial" value={empresa.nombreComercial || '—'} />
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
                <InfoRow label="Correo" value={empresa.correo} icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />} />
                <InfoRow label="Teléfono" value={empresa.telefono} icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />} />
                <InfoRow label="Departamento" value={empresa.departamento} />
                <InfoRow label="Municipio" value={empresa.municipio} />
                <InfoRow label="Dirección" value={empresa.complemento} />
              </div>

              {/* Códigos MH */}
              <div className="space-y-4 md:col-span-2 pt-2 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Configuración de Establecimiento
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoRow label="Código Establecimiento" value={empresa.codEstableMH || 'M001'} mono />
                  <InfoRow label="Punto de Venta" value={empresa.codPuntoVentaMH || 'P001'} mono />
                  <InfoRow label="Tipo Establecimiento" value={empresa.tipoEstablecimiento || '01'} mono />
                </div>
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
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`text-sm font-medium flex items-center gap-1.5 ${mono ? 'font-mono' : ''}`}>
        {icon}
        {value || '—'}
      </div>
    </div>
  );
}
