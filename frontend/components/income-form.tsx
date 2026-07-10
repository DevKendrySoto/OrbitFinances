'use client';

import { useState, useTransition } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createIncomeAction, updateIncomeAction } from '@/app/incomes/actions';
import { createIncomeSchema, editIncomeSchema, type CreateIncomeValues } from '@/lib/validators/income';
import { today } from '@/lib/date-range';

interface ExistingIncome {
  id: string;
  type: 'SALARY' | 'FREELANCE' | 'OTHER';
  currency: 'USD' | 'DOP';
  amount: string;
  period: string;
  receivedAt: string;
  description: string | null;
}

export function IncomeForm({ income }: { income?: ExistingIncome }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const todayValue = today();
  const isEdit = Boolean(income);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIncomeValues>({
    resolver: zodResolver(
      isEdit ? editIncomeSchema : createIncomeSchema,
    ) as unknown as Resolver<CreateIncomeValues>,
    defaultValues: income
      ? {
          type: income.type,
          currency: income.currency,
          amount: Number(income.amount),
          period: income.period,
          receivedAt: income.receivedAt.slice(0, 10),
          description: income.description ?? '',
        }
      : {
          currency: 'DOP',
          type: 'SALARY',
          period: todayValue.slice(0, 7),
          receivedAt: todayValue,
        },
  });

  function onSubmit(values: CreateIncomeValues) {
    setServerError(null);
    startTransition(async () => {
      const result = income
        ? await updateIncomeAction(income.id, values)
        : await createIncomeAction(values);
      if (!result.success) {
        setServerError(result.message ?? 'No se pudo guardar el ingreso');
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
          {isEdit ? (
            <p className="flex h-8 items-center text-sm text-muted-foreground">
              {income!.currency} (no editable)
            </p>
          ) : (
            <select
              id="currency"
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
              {...register('currency')}
            >
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          )}
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
        {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar ingreso'}
      </Button>
    </form>
  );
}
