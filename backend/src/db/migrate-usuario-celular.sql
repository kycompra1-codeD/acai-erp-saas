-- Adiciona campo celular no perfil do usuário
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
