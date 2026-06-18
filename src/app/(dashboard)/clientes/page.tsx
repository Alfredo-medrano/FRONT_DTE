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
import { DEPARTAMENTOS, getMunicipiosPorDepto, ACTIVIDADES_ECONOMICAS } from '@/lib/catalogos-mh';

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente } = useCRMStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const resp = await fetchClient<any>('/api/dte/v2/facturas?limit=500');
      const facturas = Array.isArray(resp) ? resp : resp?.data || resp?.datos || [];
      
      let agregados = 0;
      facturas.forEach((f: any) => {
        if (f.receptorNombre && f.receptorNombre !== 'Consumidor Final') {
          const doc = f.receptorNumDoc || '';
          if (!clientes.some((c: Cliente) => c.nit === doc || c.nombre === f.receptorNombre)) {
            // BUG FIX (M3): Eliminar hardcodes de datos que no tenemos.
            // Usar strings vacíos para campos opcionales en lugar de valores falsos
            // ('N/A', '06', '14') que contaminaban la BD con datos incorrectos.
            addCliente({
              nombre: f.receptorNombre,
              tipoDocumento: f.receptorTipoDoc || '36',
              nit: doc,
              correo: f.receptorCorreo || '',
              telefono: f.receptorTelefono || '',
              actividadEconomica: f.receptorCodActividad || '',
              departamento: f.receptorDepartamento || '',
              municipio: f.receptorMunicipio || '',
              complemento: f.receptorComplemento || '',
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
    tipoDocumento: '36',
    nit: '',
    nrc: '',
    correo: '',
    telefono: '',
    actividadEconomica: '',
    departamento: '06',
    municipio: '14',
    complemento: ''
  });

  const filtered = clientes.filter((c: Cliente) => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) || 
    c.nit.includes(search)
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      tipoDocumento: '36',
      nit: '',
      nrc: '',
      correo: '',
      telefono: '',
      actividadEconomica: '',
      departamento: '06',
      municipio: '14',
      complemento: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setFormData({
      nombre: cliente.nombre,
      tipoDocumento: cliente.tipoDocumento || '36',
      nit: cliente.nit,
      nrc: cliente.nrc || '',
      correo: cliente.correo,
      telefono: cliente.telefono || '',
      actividadEconomica: cliente.actividadEconomica || '',
      departamento: cliente.departamento || '06',
      municipio: cliente.municipio || '14',
      complemento: cliente.complemento || ''
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    if (formData.nombre && formData.nit) {
      if (editingId) {
        updateCliente(editingId, formData);
      } else {
        addCliente(formData as Omit<Cliente, 'id' | 'createdAt'>);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        tipoDocumento: '36',
        nit: '',
        nrc: '',
        correo: '',
        telefono: '',
        actividadEconomica: '',
        departamento: '06',
        municipio: '14',
        complemento: ''
      });
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
          <Button onClick={handleOpenCreate}>
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
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                           <Edit className="h-4 w-4 text-muted-foreground" />
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cliente' : 'Registrar Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            
            {/* Datos Generales */}
            <div className="space-y-1">
              <Label htmlFor="nombre">Razón Social / Nombre</Label>
              <Input 
                 id="nombre"
                 value={formData.nombre} 
                 onChange={e => setFormData({...formData, nombre: e.target.value})} 
                 placeholder="Ej. Distribuidora El Sol"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tipoDocumento">Tipo de Documento</Label>
              <select
                id="tipoDocumento"
                value={formData.tipoDocumento || '36'}
                onChange={e => setFormData({...formData, tipoDocumento: e.target.value})}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="36">NIT</option>
                <option value="13">DUI</option>
                <option value="02">Carné de Extranjero</option>
                <option value="03">Pasaporte</option>
                <option value="37">Otro</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nit">Número de Documento</Label>
              <Input 
                 id="nit"
                 value={formData.nit} 
                 onChange={e => setFormData({...formData, nit: e.target.value})} 
                 placeholder="Ej. 0614-280493-101-1"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="nrc">NRC (Registro de Contribuyente)</Label>
              <Input 
                 id="nrc"
                 value={formData.nrc} 
                 onChange={e => setFormData({...formData, nrc: e.target.value})} 
                 placeholder="Ej. 123456-7"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="correo">Correo Electrónico</Label>
              <Input 
                 id="correo"
                 type="email"
                 value={formData.correo} 
                 onChange={e => setFormData({...formData, correo: e.target.value})} 
                 placeholder="Ej. cliente@empresa.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input 
                 id="telefono"
                 value={formData.telefono} 
                 onChange={e => setFormData({...formData, telefono: e.target.value})} 
                 placeholder="Ej. 2222-3333"
              />
            </div>

            {/* Actividad Económica */}
            <div className="col-span-1 md:col-span-2 space-y-1">
              <Label htmlFor="actividadEconomica">Actividad Económica (MH)</Label>
              <select
                id="actividadEconomica"
                value={formData.actividadEconomica || ''}
                onChange={e => setFormData({...formData, actividadEconomica: e.target.value})}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Seleccionar Actividad --</option>
                {ACTIVIDADES_ECONOMICAS.map(a => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.codigo} - {a.descripcion.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Dirección */}
            <div className="space-y-1">
              <Label htmlFor="departamento">Departamento</Label>
              <select
                id="departamento"
                value={formData.departamento || '06'}
                onChange={e => setFormData({...formData, departamento: e.target.value, municipio: ''})}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DEPARTAMENTOS.map(d => (
                  <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="municipio">Municipio</Label>
              <select
                id="municipio"
                value={formData.municipio || '14'}
                onChange={e => setFormData({...formData, municipio: e.target.value})}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {getMunicipiosPorDepto(formData.departamento || '06').map(m => (
                  <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1">
              <Label htmlFor="complemento">Dirección / Complemento</Label>
              <Input 
                 id="complemento"
                 value={formData.complemento} 
                 onChange={e => setFormData({...formData, complemento: e.target.value})} 
                 placeholder="Calle, Colonia, N° de local/casa"
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
