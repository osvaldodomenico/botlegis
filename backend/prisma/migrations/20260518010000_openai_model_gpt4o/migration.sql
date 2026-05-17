-- Migration: atualiza modelo OpenAI para gpt-4o
INSERT INTO integracao_configuracoes (namespace, chave, valor, criptografado)
VALUES ('openai', 'model', 'gpt-4o', 0)
ON DUPLICATE KEY UPDATE valor = 'gpt-4o', criptografado = 0;
