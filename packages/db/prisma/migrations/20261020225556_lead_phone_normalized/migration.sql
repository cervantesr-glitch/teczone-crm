-- DropIndex
DROP INDEX `leads_phone_idx` ON `leads`;

-- AlterTable
ALTER TABLE `leads` ADD COLUMN `phone_normalized` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `leads_phone_normalized_idx` ON `leads`(`phone_normalized`);

-- CreateIndex
CREATE INDEX `leads_company_name_idx` ON `leads`(`company_name`);
