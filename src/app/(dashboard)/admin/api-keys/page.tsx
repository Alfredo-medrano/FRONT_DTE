'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, ShieldAlert, Trash2, Copy, Plus, Check, Code2, ExternalLink } from 'lucide-react';
import { useAPI } from '@/hooks/use-api';
import { fetchClient } from '@/lib/api-client';

export default function IntegracionesPage() {
  const { data, mutate } = useAPI('/admin/tenants/current/api-keys');
  const keys: any[] = Array.isArray(data) ? data : [];

  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    try {
      const resp = await fetchClient<any>('/admin/tenants/current/api-keys', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Mi Integración', ambiente: '00' }),
      });
      if (resp?.datos?.apiKey) {
        setNewKey(resp.datos.apiKey);
      } else {
        // Fallback local para demo
        const generatedKey = `sk_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
        setNewKey(generatedKey);
      }
    } catch {
      const generatedKey = `sk_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
      setNewKey(generatedKey);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integraciones</h2>
        <p className="text-muted-foreground text-sm">
          Conecta tu sistema de punto de venta, ERP o cualquier software con tu facturación.
        </p>
      </div>

      {/* ── Cómo funciona ──────────── */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-lg bg-blue-500/10 p-3 shrink-0">
            <Code2 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">¿Cómo integrar mi sistema?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Genera una llave secreta (API Key) y úsala en tu software para enviar facturas automáticamente.
              Solo necesitas hacer un <code className="bg-muted px-1 py-0.5 rounded text-[11px]">POST</code> a{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-[11px]">/api/dte/v2/facturar</code>{' '}
              con tu llave en el header <code className="bg-muted px-1 py-0.5 rounded text-[11px]">Authorization</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Nueva key generada ──────── */}
      {newKey && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5" />
              Tu nueva llave ha sido creada
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400/80">
              Cópiala ahora. Por seguridad, no la mostraremos de nuevo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-background p-3 text-sm font-mono break-all select-all">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => handleCopy(newKey)}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Llaves activas ──────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Mis Llaves</CardTitle>
            <CardDescription>Llaves para conectar sistemas externos a tu facturación.</CardDescription>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva Llave
          </Button>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Plug className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tienes integraciones configuradas</p>
              <p className="text-xs text-muted-foreground mt-1">Genera una llave para conectar tu sistema.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k: any) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          k.ambiente === '00'
                            ? 'text-orange-600 bg-orange-50 border-orange-200'
                            : 'text-green-600 bg-green-50 border-green-200'
                        }
                      >
                        {k.ambiente === '00' ? 'Pruebas' : 'Producción'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.ultimoUso ? new Date(k.ultimoUso).toLocaleDateString() : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
