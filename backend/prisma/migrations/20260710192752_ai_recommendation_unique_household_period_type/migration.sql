-- CreateIndex
CREATE UNIQUE INDEX "AIRecommendation_householdId_period_type_key" ON "AIRecommendation"("householdId", "period", "type");
