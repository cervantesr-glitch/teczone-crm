-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(36) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('HARDWARE', 'SOFTWARE', 'SERVICIOS') NOT NULL,
    `brand` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'pieza',
    `unit_cost` DECIMAL(14, 2) NOT NULL,
    `list_price` DECIMAL(14, 2) NOT NULL,
    `currency` ENUM('MXN', 'USD') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    INDEX `products_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` CHAR(36) NOT NULL,
    `folio_number` INTEGER NOT NULL AUTO_INCREMENT,
    `opportunity_id` CHAR(36) NOT NULL,
    `contact_id` CHAR(36) NULL,
    `owner_id` CHAR(36) NOT NULL,
    `status` ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'AUTORIZADA', 'ENVIADA', 'EN_NEGOCIACION', 'ACEPTADA', 'RECHAZADA', 'VENCIDA') NOT NULL DEFAULT 'BORRADOR',
    `current_version` INTEGER NOT NULL DEFAULT 1,
    `rejected_reason` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `quotes_folio_number_key`(`folio_number`),
    INDEX `quotes_opportunity_id_idx`(`opportunity_id`),
    INDEX `quotes_owner_id_status_idx`(`owner_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_versions` (
    `id` CHAR(36) NOT NULL,
    `quote_id` CHAR(36) NOT NULL,
    `number` INTEGER NOT NULL,
    `currency` ENUM('MXN', 'USD') NOT NULL,
    `exchange_rate` DECIMAL(10, 4) NOT NULL,
    `tax_rate` DECIMAL(5, 2) NOT NULL,
    `valid_until` DATE NOT NULL,
    `terms` TEXT NULL,
    `notes` TEXT NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `margin_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `min_margin_pct` DECIMAL(5, 2) NOT NULL,
    `approved_by_id` CHAR(36) NULL,
    `approved_at` DATETIME(3) NULL,
    `approval_comment` TEXT NULL,
    `issued_at` DATETIME(3) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quote_versions_quote_id_number_key`(`quote_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_items` (
    `id` CHAR(36) NOT NULL,
    `version_id` CHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `product_id` CHAR(36) NULL,
    `sku` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit_cost` DECIMAL(14, 2) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `discount_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(14, 2) NOT NULL,
    `line_cost` DECIMAL(14, 2) NOT NULL,

    INDEX `quote_items_version_id_position_idx`(`version_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_status_history` (
    `id` CHAR(36) NOT NULL,
    `quote_id` CHAR(36) NOT NULL,
    `from_status` ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'AUTORIZADA', 'ENVIADA', 'EN_NEGOCIACION', 'ACEPTADA', 'RECHAZADA', 'VENCIDA') NULL,
    `to_status` ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'AUTORIZADA', 'ENVIADA', 'EN_NEGOCIACION', 'ACEPTADA', 'RECHAZADA', 'VENCIDA') NOT NULL,
    `version_number` INTEGER NOT NULL,
    `user_id` CHAR(36) NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `quote_status_history_quote_id_created_at_idx`(`quote_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updated_by_id` CHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_opportunity_id_fkey` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_versions` ADD CONSTRAINT `quote_versions_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_versions` ADD CONSTRAINT `quote_versions_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_versions` ADD CONSTRAINT `quote_versions_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `quote_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_status_history` ADD CONSTRAINT `quote_status_history_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_status_history` ADD CONSTRAINT `quote_status_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
