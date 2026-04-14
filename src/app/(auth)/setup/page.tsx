'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth';
import { useEmisorStore } from '@/hooks/use-emisor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ShieldAlert, Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { fetchClient } from '@/lib/api-client';

export default function SetupPage() {
  const router = useRouter();
  const setKeys = useAuthStore((state) => state.setKeys);
  const setEmisor = useEmisorStore((state) => state.setEmisor);

  const [nit, setNit] = useState('');
  const [passwordApi, setPasswordApi] = useState('');
  const [ambiente, setAmbiente] = useState('PRUEBAS');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nit.trim() || !passwordApi.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetchClient<{ token: string; emisor: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ nit: nit.trim(), passwordApi: passwordApi.trim(), ambiente }),
      });
      setKeys(resp.token as string, '');

      if (resp.emisor) {
        setEmisor(resp.emisor.id, resp.emisor.nombre || `Emisor ${nit}`);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950/60 via-background to-blue-950/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* ── Logo / Branding ──────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Factura DTE</h1>
          <p className="text-sm text-muted-foreground">Facturación Electrónica · El Salvador</p>
        </div>

        {/* ── Login Card ──────────── */}
        <Card className="shadow-xl border-primary/10">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-lg">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa con tus credenciales del Ministerio de Hacienda
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="nit">NIT de Empresa</Label>
                <Input
                  id="nit"
                  placeholder="0614-..."
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordApi">Clave de Hacienda</Label>
                <div className="relative">
                  <Input
                    id="passwordApi"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña del MH"
                    value={passwordApi}
                    onChange={(e) => setPasswordApi(e.target.value)}
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ambiente">Ambiente</Label>
                <select
                  id="ambiente"
                  className="flex h-11 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={ambiente}
                  onChange={(e) => setAmbiente(e.target.value)}
                  disabled={loading}
                >
                  <option value="PRUEBAS">🧪 Pruebas</option>
                  <option value="PRODUCCION">🟢 Producción</option>
                </select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                className="w-full h-11"
                type="submit"
                disabled={!nit.trim() || !passwordApi.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                ¿Aún no tienes cuenta?{' '}
                <a href="/registro" className="text-primary hover:underline font-semibold">
                  Regístrate
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Tus credenciales se validan directamente con el Ministerio de Hacienda
          y se almacenan con encriptación AES-256.
        </p>
      </div>
    </div>
  );
}
