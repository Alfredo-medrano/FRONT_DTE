'use client';

import { useState, useEffect } from 'react';
import { useCRMStore, PipelineCard } from '@/stores/crm-store';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, MoreVertical, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const COLUMNAS = ['Prospecto', 'Contactado', 'Propuesta', 'Negociacion', 'Cerrado'] as const;

export default function PipelinePage() {
  const { cards, moveCard, addCard, deleteCard, clientes } = useCRMStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pipeline de Ventas</h2>
          <p className="text-muted-foreground">Flujo visual (Kanban) para tus oportunidades de negocio.</p>
        </div>
        <Button onClick={() => {
           // Quick add demo
           if (clientes.length === 0) {
              alert('Crea un cliente primero para agregar oportunidades');
              return;
           }
           addCard({
              clienteId: clientes[0].id,
              titulo: 'Renovación de Servicios',
              montoEstimado: 1500,
              columna: 'Prospecto'
           });
        }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Oportunidad
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full min-h-[500px] items-start">
            {COLUMNAS.map(colId => {
              const colCards = cards.filter((c: PipelineCard) => c.columna === colId);
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground hover:text-destructive" onClick={() => deleteCard(card.id)}>
                                       <X className="h-4 w-4" />
                                    </Button>
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
    </div>
  );
}
