ALTER TABLE `breedingPairs` ADD `season` int;--> statement-breakpoint
ALTER TABLE `userSettings` ADD `breedingYear` int;--> statement-breakpoint
ALTER TABLE `breedingPairs` ADD CONSTRAINT `breedingPairs_userId_male_female_season_unique` UNIQUE(`userId`,`maleId`,`femaleId`,`season`);