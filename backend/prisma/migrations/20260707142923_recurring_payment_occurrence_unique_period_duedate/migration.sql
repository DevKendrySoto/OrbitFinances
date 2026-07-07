-- DropIndex
DROP INDEX "RecurringPaymentOccurrence_recurringPaymentId_period_key";

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPaymentOccurrence_recurringPaymentId_period_dueDat_key" ON "RecurringPaymentOccurrence"("recurringPaymentId", "period", "dueDate");

