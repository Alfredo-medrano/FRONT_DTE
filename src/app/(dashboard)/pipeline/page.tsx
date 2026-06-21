'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCRMStore, PipelineCard } from '@/stores/crm-store';
import { useEmisorStore } from '@/hooks/use-emisor';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, FileText, Edit2, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLUMNAS = ['Prospecto', 'Contactado', 'Propuesta', 'Negociacion', 'Cerrado'] as const;

export default function PipelinePage() {
  const { cards, moveCard, addCard, updateCard, deleteCard, clientes } = useCRMStore();
  const { emisorId } = useEmisorStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // ── Estado del modal de creación/edición ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clienteId: '',
    titulo: '',
    montoEstimado: 0,
    columna: 'Prospecto' as PipelineCard['columna'],
  });

  const handleOpenCreate = () => {
    if (clientes.length === 0) {
      alert('Crea un cliente primero para agregar oportunidades');
      return;
    }
    setEditingId(null);
    setForm({ clienteId: clientes[0].id, titulo: '', montoEstimado: 0, columna: 'Prospecto' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (card: PipelineCard) => {
    setEditingId(card.id);
    setForm({ 
      clienteId: card.clienteId, 
      titulo: card.titulo, 
      montoEstimado: card.montoEstimado, 
      columna: card.columna 
    });
    setIsModalOpen(true);
  };

  const handleGuardar = () => {
    if (!form.titulo.trim() || !form.clienteId) return;
    if (editingId) {
      updateCard(editingId, form);
    } else {
      addCard(form);
    }
    setIsModalOpen(false);
  };

  // Filtrar tarjetas por el emisor actual
  const filteredCards = useMemo(() => {
    const activeEmisor = emisorId || 'default';
    return cards.filter((c: PipelineCard) => c.emisorId === activeEmisor);
  }, [cards, emisorId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    moveCard(draggableId, destination.droppableId);
  };

  const getClienteNombre = (id: string) => {
    return clientes.find(c => c.id === id)?.nombre || 'Cliente Desconocido';
  };

  const handleConvertir = (clienteId: string) => {
     router.push(`/facturas/nueva?cliente=${clienteId}`);
  };

  if (!mounted) return null; // Avoid hydration mismatch on DND

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-bold tracking-tight">Pipeline de Ventas</h2>
            <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20 text-[11px] font-medium py-0.5 px-2 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Local
            </Badge>
          </div>
          <p className="text-muted-foreground">Flujo visual (Kanban) para tus oportunidades de negocio.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Oportunidad
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full min-h-[500px] items-start">
            {COLUMNAS.map(colId => {
              const colCards = filteredCards.filter((c: PipelineCard) => c.columna === colId);
              const totalColumna = colCards.reduce((acc: number, current: PipelineCard) => acc + current.montoEstimado, 0);

              return (
                <div key={colId} className="flex flex-col flex-shrink-0 w-80 bg-muted/40 rounded-xl border">
                  <div className="p-4 flex items-center justify-between border-b bg-card rounded-t-xl shrink-0">
                    <h3 className="font-semibold text-sm">{colId} <Badge variant="secondary" className="ml-2 font-mono">{colCards.length}</Badge></h3>
                    <span className="text-xs text-muted-foreground font-medium">${totalColumna.toLocaleString()}</span>
                  </div>
                  
                  <Droppable droppableId={colId}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 p-3 space-y-3 min-h-[150px]"
                      >
                        {colCards.map((card: PipelineCard, index: number) => (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card className="shadow-sm hover:shadow-md transition-shadow">
                                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1">
                                       <CardTitle className="text-sm font-semibold leading-tight">{card.titulo}</CardTitle>
                                       <span className="text-xs text-muted-foreground">{getClienteNombre(card.clienteId)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 -mt-1 -mr-2">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(card)}>
                                         <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteCard(card.id)}>
                                         <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-2">
                                     <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20">
                                        ${card.montoEstimado.toLocaleString()}
                                     </Badge>
                                  </CardContent>
                                  {colId === 'Cerrado' && (
                                     <CardFooter className="p-4 pt-0">
                                        <Button size="sm" className="w-full text-xs" variant="secondary" onClick={() => handleConvertir(card.clienteId)}>
                                           <FileText className="h-3 w-3 mr-2" /> Convertir a DTE
                                        </Button>
                                     </CardFooter>
                                  )}
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Modal de creación/edición de oportunidad */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Oportunidad' : 'Nueva Oportunidad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <select
                id="cliente"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.clienteId}
                onChange={e => setForm({ ...form, clienteId: e.target.value })}
              >
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título de la Oportunidad</Label>
              <Input 
                id="titulo"
                value={form.titulo} 
                onChange={e => setForm({ ...form, titulo: e.target.value })} 
                placeholder="Ej. Renovación de Servicios IT" 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto Estimado (USD)</Label>
              <Input 
                id="monto"
                type="number" 
                value={form.montoEstimado} 
                onChange={e => setForm({ ...form, montoEstimado: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="columna">Fase del Embudo</Label>
              <select
                id="columna"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.columna}
                onChange={e => setForm({ ...form, columna: e.target.value as PipelineCard['columna'] })}
              >
                {COLUMNAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} size="sm" disabled={!form.titulo.trim() || !form.clienteId}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
