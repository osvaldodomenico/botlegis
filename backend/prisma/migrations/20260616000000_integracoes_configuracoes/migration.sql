-- CreateTable
CREATE TABLE `integracoes_configuracoes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `namespace` VARCHAR(50) NOT NULL,
    `chave` VARCHAR(100) NOT NULL,
    `valor` TEXT NOT NULL,
    `criptografado` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_integracoes_configuracoes_namespace`(`namespace`),
    UNIQUE INDEX `uniq_integracoes_configuracoes_namespace_chave`(`namespace`, `chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
