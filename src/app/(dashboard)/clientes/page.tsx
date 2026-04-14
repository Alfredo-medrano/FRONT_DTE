'use client';

import { useState } from 'react';
import { useCRMStore, Cliente } from '@/stores/crm-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Edit, FileText, DownloadCloud, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchClient } from '@/lib/api-client';

export default function ClientesPage() {
  const { clientes, addCliente, deleteCliente } = useCRMStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const resp = await fetchClient<any>('/api/dte/v2/facturas?limit=500');
      const facturas = Array.isArray(resp) ? resp : resp?.data || resp?.datos || [];
      
      let agregados = 0;
      facturas.forEach((f: any) => {
        if (f.receptorNombre && f.receptorNombre !== 'Consumidor Final') {
          // Extraer documento (por backend suele venir en receptorNumDoc o el cliente puede tener NIT)
          const doc = f.receptorNumDoc || '00000000-0';
          if (!clientes.some((c: Cliente) => c.nit === doc || c.nombre === f.receptorNombre)) {
            addCliente({
              nombre: f.receptorNombre,
              nit: doc,
              correo: f.receptorCorreo || '',
              telefono: 'N/A',
              actividadEconomica: 'No especificada'
            });
            agregados++;
          }
        }
      });
      alert(`Sincronización completada. Se importaron ${agregados} clientes nuevos desde tus facturas históricas.`);
    } catch (e) {
      console.error(e);
      alert('Error al sincronizar clientes. Revisa tu conexión.');
    } finally {
      setIsSyncing(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Cliente>>({
    nombre: '',
    nit: '',
    nrc: '',
    correo: '',
    telefono: '',
    actividadEconomica: ''
  });

  const filtered = clientes.filter((c: Cliente) => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) || 
    c.nit.includes(search)
  );

  const handleCreate = () => {
    if (formData.nombre && formData.nit) {
      addCliente(formData as Omit<Cliente, 'id' | 'createdAt'>);
      setIsModalOpen(false);
      setFormData({ nombre: '', nit: '', nrc: '', correo: '', telefono: '', actividadEconomica: '' });
    }
  };

  const handleFacturar = (cliente: Cliente) => {
    // Navigate and pass query params or context to prepopulate the form
    router.push(`/facturas/nueva?cliente=${cliente.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Directorio de Clientes</h2>
          <p className="text-muted-foreground">Administra la base de datos de clientes para facturación rápida.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DownloadCloud className="h-4 w-4 mr-2" />}
            Sincronizar Historial
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
           <div className="relative w-full max-w-sm">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input 
               placeholder="Buscar por Nombre / NIT..." 
               className="pl-8" 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>NIT/Doc</TableHead>
                <TableHead>NRC</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {filtered.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No hay clientes registrados que coincidan con la búsqueda.
                     </TableCell>
                  </TableRow>
               ) : (
                  filtered.map((c: Cliente) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{c.nit}</TableCell>
                      <TableCell className="font-mono text-xs">{c.nrc || 'N/A'}</TableCell>
                      <TableCell>
                         <div className="text-sm">{c.correo}</div>
                         <div className="text-xs text-muted-foreground">{c.telefono}</div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleFacturar(c)}>
                           <FileText className="h-4 w-4 mr-1" /> Facturar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCliente(c.id)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Razón Social</Label>
              <Input 
                 className="col-span-3" 
                 value={formData.nombre} 
                 onChange={e => setFormData({...formData, nombre: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">NIT / DUI</Label>
              <Input 
                 className="col-span-3" 
                 value={formData.nit} 
                 onChange={e => setFormData({...formData, nit: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">NRC</Label>
              <Input 
                 className="col-span-3" 
                 value={formData.nrc} 
                 onChange={e => setFormData({...formData, nrc: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Correo</Label>
              <Input 
                 className="col-span-3" 
                 type="email"
                 value={formData.correo} 
                 onChange={e => setFormData({...formData, correo: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formData.nombre || !formData.nit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
