import React from 'react';
import { CheckCircle2, Loader2, XCircle, FileDigit, ShieldAlert, Send, Building, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DteLifecycleTrackerProps {
  currentStatus: string; // 'CREADO', 'TRANSMITIDO', 'PROCESADO', 'ERROR', 'RECHAZADO', 'ANULADO'
  errorMessage?: string;
  className?: string;
}

export function DteLifecycleTracker({ currentStatus, errorMessage, className }: DteLifecycleTrackerProps) {
  // Mapping currentStatus to a step index
  const getStepIndex = () => {
    switch (currentStatus) {
      case 'CREADO': return 0;
      case 'FIRMADO': return 1;
      case 'CONTINGENCIA': return 1; // Signed locally, pending transmission
      case 'TRANSMITIDO': return 2;
      case 'VALIDANDO': return 3; // Synthetic state we can pass
      case 'PROCESADO': return 4;
      case 'ERROR': return 2; // Assuming error happened during transmit
      case 'RECHAZADO': return 3; // Rejected by MH
      case 'ANULADO': return 4;
      default: return 0; // SIN ESTADO
    }
  };

  const isError = currentStatus === 'ERROR' || currentStatus === 'RECHAZADO' || currentStatus === 'ANULADO';
  const currentStep = getStepIndex();

  const steps = [
    { id: 0, label: 'Preparado', icon: FileDigit, description: 'Validación local' },
    { id: 1, label: 'Firmado', icon: ShieldAlert, description: 'Firma electrónica' },
    { id: 2, label: 'Transmitido', icon: Send, description: 'Enviado a MH' },
    { id: 3, label: 'Validando MH', icon: Building, description: 'Motor de reglas' },
    { id: 4, label: 'Procesado', icon: ShieldCheck, description: 'Sello MH' },
  ];

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative flex items-start justify-between w-full">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 w-full h-1 bg-muted rounded-full overflow-hidden" aria-hidden="true">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-in-out", 
              isError ? "bg-destructive" : "bg-emerald-500"
            )}
            style={{ width: `${(Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const isActive = idx === currentStep && !isError;
          const isCompleted = idx < currentStep || (idx === currentStep && currentStatus === 'PROCESADO');
          const isFailed = idx === currentStep && isError;

          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex flex-col items-center group z-10 w-1/5">
              <div 
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-colors duration-300",
                  isCompleted ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : 
                  isActive ? "border-primary bg-primary/10 text-primary" : 
                  isFailed ? "border-destructive bg-destructive/10 text-destructive" :
                  "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isFailed ? (
                  <XCircle className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="mt-2 flex flex-col items-center text-center">
                <span className={cn(
                  "text-xs font-semibold uppercase tracking-tight",
                  isCompleted ? "text-emerald-600 dark:text-emerald-400" :
                  isFailed ? "text-destructive" :
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px] leading-tight hidden sm:block">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {isError && errorMessage && (
        <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-start gap-2">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-mono text-xs overflow-hidden break-words">{errorMessage}</div>
        </div>
      )}
    </div>
  );
}
