-- CreateTable
CREATE TABLE `municipios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `uf` CHAR(2) NOT NULL DEFAULT 'SP',
    `bloco` VARCHAR(150) NULL,
    `regiao` VARCHAR(150) NULL,
    `rm_ra` VARCHAR(150) NULL,
    `mesorregiao` VARCHAR(150) NULL,
    `microrregiao` VARCHAR(150) NULL,
    `divisao_regional` VARCHAR(150) NULL,
    `projecao_votos` INTEGER NOT NULL DEFAULT 0,
    `coordenacao` VARCHAR(255) NULL,
    `lideranca` VARCHAR(255) NULL,
    `funcao_cargo` VARCHAR(150) NULL,
    `projecao_2` INTEGER NULL,
    `coord_lideranca_2` VARCHAR(255) NULL,
    `funcao_cargo_2` VARCHAR(150) NULL,
    `projecao_apoio_iurd` INTEGER NULL,
    `projecao_base` INTEGER NULL DEFAULT 0,
    `eleitores_22` INTEGER NULL,
    `votos_validos_22` INTEGER NULL,
    `percentual_mv` DOUBLE NULL,
    `votos_22` INTEGER NULL,
    `percentual_perda` DOUBLE NULL,
    `observacoes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `municipios_nome_key`(`nome`),
    INDEX `municipios_nome_idx`(`nome`),
    INDEX `municipios_regiao_idx`(`regiao`),
    INDEX `municipios_projecao_votos_idx`(`projecao_votos`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria_projecoes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `municipio_id` BIGINT NOT NULL,
    `valor_antigo` INTEGER NULL,
    `valor_novo` INTEGER NULL,
    `alterado_por` VARCHAR(150) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs_importacao` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `arquivo` VARCHAR(255) NOT NULL,
    `linhas_processadas` INTEGER NOT NULL DEFAULT 0,
    `linhas_com_erro` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL,
    `erros` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(150) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auditoria_projecoes` ADD CONSTRAINT `auditoria_projecoes_municipio_id_fkey` FOREIGN KEY (`municipio_id`) REFERENCES `municipios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
