-- Migration: configura modelo OpenAI para gpt-4o
INSERT INTO integracoes_configuracoes (namespace, chave, valor, criptografado, created_at, updated_at)
VALUES ('openai', 'model', 'gpt-4o', 0, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE valor = 'gpt-4o', criptografado = 0, updated_at = NOW(3);
