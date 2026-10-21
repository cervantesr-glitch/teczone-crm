-- CreateTable
CREATE TABLE `accounts` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `legal_name` VARCHAR(191) NULL,
    `rfc` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `company_size` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `owner_id` CHAR(36) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `accounts_rfc_key`(`rfc`),
    INDEX `accounts_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `phone_normalized` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `decision_role` ENUM('ECONOMICO', 'TECNICO', 'USUARIO', 'OTRO') NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `contacts_account_id_idx`(`account_id`),
    INDEX `contacts_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunities` (
    `id` CHAR(36) NOT NULL,
    `folio_number` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `pipeline` ENUM('PYME', 'SOLUCIONES') NOT NULL,
    `stage` ENUM('SOLICITUD', 'COSTEO_MARGEN', 'COTIZACION_ENVIADA', 'NEGOCIACION', 'CALIFICACION', 'DISCOVERY', 'DEMO_POC', 'PROPUESTA_SOW', 'NEGOCIACION_SLA', 'GANADA', 'PERDIDA') NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `primary_contact_id` CHAR(36) NULL,
    `owner_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(14, 2) NULL,
    `currency` ENUM('MXN', 'USD') NULL,
    `probability` INTEGER NULL,
    `expected_close_date` DATE NULL,
    `closed_at` DATETIME(3) NULL,
    `lost_reason` TEXT NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `opportunities_folio_number_key`(`folio_number`),
    INDEX `opportunities_pipeline_stage_idx`(`pipeline`, `stage`),
    INDEX `opportunities_owner_id_idx`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunity_stage_history` (
    `id` CHAR(36) NOT NULL,
    `opportunity_id` CHAR(36) NOT NULL,
    `from_stage` ENUM('SOLICITUD', 'COSTEO_MARGEN', 'COTIZACION_ENVIADA', 'NEGOCIACION', 'CALIFICACION', 'DISCOVERY', 'DEMO_POC', 'PROPUESTA_SOW', 'NEGOCIACION_SLA', 'GANADA', 'PERDIDA') NULL,
    `to_stage` ENUM('SOLICITUD', 'COSTEO_MARGEN', 'COTIZACION_ENVIADA', 'NEGOCIACION', 'CALIFICACION', 'DISCOVERY', 'DEMO_POC', 'PROPUESTA_SOW', 'NEGOCIACION_SLA', 'GANADA', 'PERDIDA') NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `opportunity_stage_history_opportunity_id_idx`(`opportunity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_converted_account_id_fkey` FOREIGN KEY (`converted_account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_converted_contact_id_fkey` FOREIGN KEY (`converted_contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_converted_opportunity_id_fkey` FOREIGN KEY (`converted_opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_primary_contact_id_fkey` FOREIGN KEY (`primary_contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunity_stage_history` ADD CONSTRAINT `opportunity_stage_history_opportunity_id_fkey` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunity_stage_history` ADD CONSTRAINT `opportunity_stage_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
