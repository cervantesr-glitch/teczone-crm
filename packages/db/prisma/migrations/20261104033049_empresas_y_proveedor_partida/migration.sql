-- Catálogo de empresas emisoras y datos del proveedor en las partidas.
-- La empresa única que existía (app_settings 'company') pasa a ser la primera del catálogo,
-- la de todas las cotizaciones existentes y la empresa por omisión de todos los usuarios.

-- CreateTable
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `legal_name` VARCHAR(191) NOT NULL,
    `rfc` VARCHAR(191) NOT NULL,
    `tax_regime` VARCHAR(191) NULL,
    `postal_code` VARCHAR(10) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo` MEDIUMBLOB NULL,
    `logo_mime` VARCHAR(40) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `companies_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Primera empresa a partir de los datos configurados (o "TecZone" si nunca se capturaron).
SET @company_id = UUID();

INSERT INTO `companies` (`id`, `name`, `legal_name`, `rfc`, `address`, `phone`, `email`, `website`, `updated_at`)
SELECT
    @company_id,
    COALESCE(NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.name'))), ''), 'TecZone'),
    COALESCE(
        NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.legalName'))), ''),
        NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.name'))), ''),
        'TecZone'
    ),
    COALESCE(UPPER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.rfc')))), ''),
    NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.address'))), ''),
    NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.phone'))), ''),
    NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.email'))), ''),
    NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.`value`, '$.website'))), ''),
    CURRENT_TIMESTAMP(3)
FROM (SELECT 1 AS `one`) AS d
LEFT JOIN `app_settings` s ON s.`key` = 'company';

-- Los datos ya viven en el catálogo.
DELETE FROM `app_settings` WHERE `key` = 'company';

-- AlterTable
ALTER TABLE `quote_items` ADD COLUMN `supplier_description` TEXT NULL,
    ADD COLUMN `supplier_sku` VARCHAR(64) NULL;

-- AlterTable
ALTER TABLE `quote_versions` ADD COLUMN `company_snapshot` JSON NULL;

-- AlterTable: se agrega nula, se llena y luego se vuelve obligatoria.
ALTER TABLE `quotes` ADD COLUMN `company_id` CHAR(36) NULL;
UPDATE `quotes` SET `company_id` = @company_id;
ALTER TABLE `quotes` MODIFY `company_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `default_company_id` CHAR(36) NULL;
UPDATE `users` SET `default_company_id` = @company_id;

-- CreateIndex
CREATE INDEX `quotes_company_id_idx` ON `quotes`(`company_id`);

-- CreateIndex
CREATE INDEX `users_default_company_id_idx` ON `users`(`default_company_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_default_company_id_fkey` FOREIGN KEY (`default_company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
