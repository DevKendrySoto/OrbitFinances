'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createIncomeAction } from '@/app/incomes/actions';
import { createIncomeSchema, type CreateIncomeValues } from '@/lib/validators/income';
import { today } from '@/lib/date-range';

export function IncomeForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const todayValue = today();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIncomeValues>({
    resolver: zodResolver(createIncomeSchema),
    defaultValues: {
      currency: 'DOP',
      type: 'SALARY',
      period: todayValue.slice(0, 7),
      receivedAt: todayValue,
    },
  });

  function onSubmit(values: CreateIncomeValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createIncomeAction(values);
      if (!result.success) {
        setServerError(result.message ?? 'No se pudo registrar el ingreso');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
            {...register('type')}
          >
            <option value="SALARY">Salario</option>
            <option value="FREELANCE">Freelance</option>
            <option value="OTHER">Otro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
            {...register('currency')}
          >
            <option value="DOP">DOP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="period">Período</Label>
          <Input id="period" type="month" {...register('period')} />
          {errors.period && <p className="text-sm text-destructive">{errors.period.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="receivedAt">Fecha recibido</Label>
          <Input id="receivedAt" type="date" {...register('receivedAt')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input id="description" {...register('description')} />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Registrar ingreso'}
      </Button>
    </form>
  );
}
