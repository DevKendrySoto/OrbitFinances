'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGoalAction } from '@/app/goals/actions';
import { createGoalSchema, type CreateGoalValues } from '@/lib/validators/goal';

export function GoalForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGoalValues>({ resolver: zodResolver(createGoalSchema) });

  function onSubmit(values: CreateGoalValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createGoalAction(values);
      if (!result.success) {
        setServerError(result.message ?? 'No se pudo crear la meta');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la meta</Label>
        <Input id="name" placeholder="Ej. Fondo de emergencia" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="targetAmount">Monto objetivo</Label>
          <Input
            id="targetAmount"
            type="number"
            step="0.01"
            min="0.01"
            {...register('targetAmount', { valueAsNumber: true })}
          />
          {errors.targetAmount && (
            <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            defaultValue="DOP"
            className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
            {...register('currency')}
          >
            <option value="DOP">DOP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDate">Fecha objetivo (opcional)</Label>
        <Input id="targetDate" type="date" {...register('targetDate')} />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear meta'}
      </Button>
    </form>
  );
}
