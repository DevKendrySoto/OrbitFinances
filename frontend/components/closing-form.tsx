'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClosingAction } from '@/app/reports/actions';

export function ClosingForm() {
  const [month, setMonth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createClosingAction(month);
      if (!result.success) {
        setError(result.message ?? 'No se pudo crear el cierre');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="closing-month">Cerrar mes</Label>
        <Input
          id="closing-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? 'Cerrando...' : 'Crear cierre'}
      </Button>
      {error && <p className="pb-1 text-sm text-destructive">{error}</p>}
    </form>
  );
}
