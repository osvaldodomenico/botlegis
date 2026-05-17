-- CreateTable bot_contatos
CREATE TABLE `bot_contatos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `telefone` VARCHAR(30) NOT NULL,
    `nome` VARCHAR(150) NULL,
    `estado` VARCHAR(30) NOT NULL DEFAULT 'NOVO',
    `municipio_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bot_contatos_telefone_key`(`telefone`),
    INDEX `bot_contatos_estado_idx`(`estado`),
    INDEX `bot_contatos_municipio_id_idx`(`municipio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable bot_mensagens
CREATE TABLE `bot_mensagens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `contato_id` BIGINT NOT NULL,
    `direcao` VARCHAR(10) NOT NULL,
    `texto` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bot_mensagens_contato_id_idx`(`contato_id`),
    INDEX `bot_mensagens_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bot_contatos` ADD CONSTRAINT `bot_contatos_municipio_id_fkey`
    FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bot_mensagens` ADD CONSTRAINT `bot_mensagens_contato_id_fkey`
    FOREIGN KEY (`contato_id`) REFERENCES `bot_contatos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
