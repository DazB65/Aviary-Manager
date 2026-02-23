CREATE TABLE `birds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`speciesId` int NOT NULL,
	`ringId` varchar(64),
	`name` varchar(128),
	`gender` enum('male','female','unknown') NOT NULL DEFAULT 'unknown',
	`dateOfBirth` date,
	`colorMutation` varchar(128),
	`photoUrl` text,
	`notes` text,
	`fatherId` int,
	`motherId` int,
	`status` enum('alive','deceased','sold','unknown') NOT NULL DEFAULT 'alive',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `birds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `breedingPairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`maleId` int NOT NULL,
	`femaleId` int NOT NULL,
	`pairingDate` date,
	`status` enum('active','resting','retired') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `breedingPairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pairId` int NOT NULL,
	`season` varchar(16),
	`eggsLaid` int DEFAULT 0,
	`layDate` date,
	`fertilityCheckDate` date,
	`expectedHatchDate` date,
	`actualHatchDate` date,
	`chicksSurvived` int DEFAULT 0,
	`status` enum('incubating','hatched','failed','abandoned') NOT NULL DEFAULT 'incubating',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`notes` text,
	`eventDate` date NOT NULL,
	`eventType` enum('vet','banding','medication','weaning','sale','other') NOT NULL DEFAULT 'other',
	`birdId` int,
	`pairId` int,
	`completed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `species` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commonName` varchar(128) NOT NULL,
	`scientificName` varchar(128),
	`category` varchar(64),
	`incubationDays` int NOT NULL DEFAULT 14,
	`clutchSizeMin` int,
	`clutchSizeMax` int,
	`isCustom` boolean DEFAULT false,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `species_id` PRIMARY KEY(`id`)
);
