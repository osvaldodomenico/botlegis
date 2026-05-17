-- Migration: configura modelo OpenAI para gpt-4o
INSERT INTO integracoes_configuracoes (namespace, chave, valor, criptografado)
VALUES ('openai', 'model', 'gpt-4o', 0)
ON DUPLICATE KEY UPDATE valor = 'gpt-4o', criptografado = 0;
