/* -- 1. Tabela 'users'
-- Estrutura baseada na sua captura de tela 'Captura de Tela 2025-11-04 às 09.22.08.png'.
*/
CREATE TABLE IF NOT EXISTS users (
    discord_id BIGINT(20) UNSIGNED NOT NULL,
    in_game_id INT(10) UNSIGNED NULL,
    last_known_username VARCHAR(255) NULL,
    
    PRIMARY KEY (discord_id),
    UNIQUE KEY idx_in_game_id (in_game_id)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/* -- 2. Tabela 'reports'
-- Estrutura baseada na sua captura de tela 'Captura de Tela 2025-11-04 às 09.22.23.png'.
-- A CHAVE ESTRANGEIRA (FOREIGN KEY) FOI REMOVIDA para evitar o erro.
-- Os Índices (INDEX) foram mantidos para performance.
*/
CREATE TABLE IF NOT EXISTS reports (
    message_id VARCHAR(255) NOT NULL,
    user_id BIGINT(20) UNSIGNED NULL,
    ticket_id VARCHAR(255) NULL,
    report_type VARCHAR(255) NULL,
    jump_url TEXT NULL,
    details TEXT NULL,
    `timestamp` DATETIME NULL,
    staff_mencionado TEXT NULL,
    tipo_relatorio VARCHAR(255) NULL,
    
    PRIMARY KEY (message_id),
    
    /* --- Índices para Otimização (Mantidos) --- */
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (`timestamp`),
    INDEX idx_report_type (report_type),
    INDEX idx_tipo_relatorio (tipo_relatorio)
    
    /* -- A 'FOREIGN KEY (fk_user_id)' foi removida desta seção 
    -- para prevenir o erro 'a foreign key constraint fails'.
    */
        
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;