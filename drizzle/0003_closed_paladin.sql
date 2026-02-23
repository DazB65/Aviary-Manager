CREATE TABLE `clutchEggs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broodId` int NOT NULL,
	`userId` int NOT NULL,
	`eggNumber` int NOT NULL,
	`outcome` enum('unknown','fertile','infertile','cracked','hatched','died') NOT NULL DEFAULT 'unknown',
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clutchEggs_id` PRIMARY KEY(`id`)
);
