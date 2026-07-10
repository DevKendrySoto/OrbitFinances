'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createConversionAction } from '@/app/incomes/[id]/convert/actions';
import {
  createConversionSchema,
  type CreateConversionValues,
} from '@/lib/validators/conversion';

export function ConversionForm({ incomeId }: { incomeId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateConversionValues>({ resolver: zodResolver(createConversionSchema) });

  function onSubmit(values: CreateConversionValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createConversionAction(incomeId, values);
      if (!result.success) {
        setServerError(result.message ?? 'No se pudo registrar la conversión');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amountUsd">Monto a convertir (USD)</Label>
          <Input
            id="amountUsd"
            type="number"
            step="0.01"
            min="0.01"
            {...register('amountUsd', { valueAsNumber: true })}
          />
          {errors.amountUsd && (
            <p className="text-sm text-destructive">{errors.amountUsd.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchangeRate">Tasa (RD$ por US$)</Label>
          <Input
            id="exchangeRate"
            type="number"
            step="0.0001"
            min="0.0001"
            {...register('exchangeRate', { valueAsNumber: true })}
          />
          {errors.exchangeRate && (
            <p className="text-sm text-destructive">{errors.exchangeRate.message}</p>
          )}
        </div>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Convirtiendo...' : 'Convertir'}
      </Button>
    </form>
  );
}
