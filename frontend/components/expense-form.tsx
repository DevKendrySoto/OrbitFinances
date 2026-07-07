'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExpenseAction } from '@/app/expenses/actions';
import { createExpenseSchema, type CreateExpenseValues } from '@/lib/validators/expense';
import { EXPENSE_CATEGORY_LABEL } from '@/lib/categories';
import { today } from '@/lib/date-range';

export function ExpenseForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateExpenseValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      currency: 'DOP',
      category: 'SUPERMARKET',
      spentAt: today(),
    },
  });

  function onSubmit(values: CreateExpenseValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createExpenseAction(values);
      if (!result.success) {
        setServerError(result.message ?? 'No se pudo registrar el gasto');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <select
            id="category"
            className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
            {...register('category')}
          >
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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

      <div className="space-y-2">
        <Label htmlFor="spentAt">Fecha</Label>
        <Input id="spentAt" type="date" {...register('spentAt')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input id="description" {...register('description')} />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Registrar gasto'}
      </Button>
    </form>
  );
}
