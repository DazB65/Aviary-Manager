CREATE INDEX "birds_userId_idx" ON "birds" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "birds_speciesId_idx" ON "birds" USING btree ("speciesId");--> statement-breakpoint
CREATE INDEX "broods_userId_idx" ON "broods" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "broods_pairId_idx" ON "broods" USING btree ("pairId");--> statement-breakpoint
CREATE INDEX "clutchEggs_userId_idx" ON "clutchEggs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "events_userId_idx" ON "events" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "events_birdId_idx" ON "events" USING btree ("birdId");--> statement-breakpoint
CREATE INDEX "events_pairId_idx" ON "events" USING btree ("pairId");