-- AlterTable
ALTER TABLE `bot_contatos` ADD COLUMN `ultima_cidade` VARCHAR(150) NULL,
    ADD COLUMN `ultima_regiao` VARCHAR(150) NULL,
    ADD COLUMN `ultimo_topico` VARCHAR(50) NULL,
    ADD COLUMN `perfil` VARCHAR(30) NULL;
