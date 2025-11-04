(function() {
    window.logUtils = {
        // --- FUNÇÕES DE API E FORMATAÇÃO (COMBINADAS DE rdm-utils, revistou, standard) ---

        fetchApiLog: async function(logType, id, accusedId = null, dates = null, startTimestamp = null, endTimestamp = null) {
            try {
                const body = { logType, id, accusedId };
                if (startTimestamp && endTimestamp) {
                    body.startTimestamp = startTimestamp;
                    body.endTimestamp = endTimestamp;
                } else if (dates && dates.length === 2) {
                    body.dates = dates;
                } else {
                    throw new Error("Intervalo de tempo (dates ou timestamps) não fornecido.");
                }

                const response = await fetch('/api/get-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`HTTP error! status: ${response.status}, body: ${JSON.stringify(body)}, Response Body: ${errorBody}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Tenta fazer parse como JSON, se falhar retorna o texto original
                try {
                    return await response.json();
                } catch (jsonError) {
                    console.warn(`Resposta da API para ${logType} não é JSON válido, retornando como texto.`);
                    return { data_text: await response.text() }; // Retorna um objeto indicando que é texto
                }
            } catch (error) {
                console.error(`Erro ao buscar log ${logType}:`, error);
                return { error: `Falha na requisição para ${logType}` };
            }
        },

        formatDateForApi: function(dateString) {
            // Verifica se a string já está no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString)) {
                 // Se já for ISO, assume que é o centro da janela desejada (menos comum, mas possível)
                 // e cria a janela de +/- 1 dia em torno dela. Poderia ajustar se necessário.
                 const centerDate = new Date(dateString);
                 const startDate = new Date(centerDate);
                 startDate.setUTCDate(startDate.getUTCDate() - 1);
                 startDate.setUTCHours(0, 0, 0, 0);
                 const endDate = new Date(centerDate);
                 endDate.setUTCDate(endDate.getUTCDate() + 1);
                 endDate.setUTCHours(23, 59, 59, 999);
                 return [startDate.toISOString(), endDate.toISOString()];
            }
             // Se não for ISO, assume DD/MM/AAAA e processa
            const parts = dateString.split('/');
            if (parts.length !== 3) {
                console.error("Formato de data inválido para formatDateForApi:", dateString);
                // Retorna um intervalo padrão ou lança um erro, dependendo da necessidade
                 const today = new Date();
                 const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                 const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                 return [yesterday.toISOString(), tomorrow.toISOString()]; // Fallback
            }
            const [day, month, year] = parts;
            const selectedDay = new Date(Date.UTC(year, month - 1, day));
             if (isNaN(selectedDay.getTime())) {
                 console.error("Data inválida criada a partir de:", dateString);
                 // Retorna um intervalo padrão ou lança um erro
                 const today = new Date();
                 const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                 const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                 return [yesterday.toISOString(), tomorrow.toISOString()]; // Fallback
             }
            const startDate = new Date(selectedDay);
            startDate.setUTCDate(startDate.getUTCDate() - 1);
            startDate.setUTCHours(0, 0, 0, 0);
            const endDate = new Date(selectedDay);
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            endDate.setUTCHours(23, 59, 59, 999);
            return [startDate.toISOString(), endDate.toISOString()];
        },

        createLogLine: function(key, value) {
            let keyClass = 'key-default';
            // Simplificado para apenas aplicar 'key-red' se a chave contiver 'causa' ou 'assasino'
            if (key.toLowerCase().includes('causa') || key.toLowerCase().includes('assasino')) {
                 keyClass = 'key-red';
            }
            // Formatação especial para Inventário e Armas
            if (key.toLowerCase() === 'inventário' || key.toLowerCase() === 'armas') {
                // Remove espaços extras e divide por <br> ou nova linha, filtrando linhas vazias
                const items = (value || '').split(/<br\s*\/?>|\n/).map(item => item.trim()).filter(item => item !== '');
                const itemsHtml = items.map(item => `<p class="item-list-entry"><span class="value-green">${item}</span></p>`).join('');
                return `<p><span class="${keyClass}">[${key}]:</span></p>${itemsHtml}`;
            }
            // Formatação padrão para outras chaves
            return `<p><span class="${keyClass}">[${key}]:</span> <span class="value-green">${value || ''}</span></p>`;
        },

        _parseApiDate: function(dateString) {
             // Tenta criar o objeto Date. Se a string for inválida, retorna um Date inválido.
            return new Date(dateString);
        },

        formatKillLogEntry: function(logEntry, logType) {
            // Validação robusta da entrada
             if (!logEntry || typeof logEntry !== 'object' || !logEntry.date || typeof logEntry.date !== 'string') {
                 console.warn("[formatKillLogEntry] Registro inválido ou sem data recebido:", logEntry);
                 return '<div class="loot-log-entry"><p class="log-error">Registro inválido ou sem data.</p></div>';
             }

            const logDate = window.logUtils._parseApiDate(logEntry.date);

            // Verifica se a data é válida
            if (isNaN(logDate.getTime())) {
                console.warn(`[formatKillLogEntry] Data inválida detectada para log ${logEntry.id || 'sem ID'}: ${logEntry.date}`);
                return `<div class="loot-log-entry"><p class="log-error">Registro com data inválida: ${logEntry.date}</p></div>`;
            }

            const formattedDate = logDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', ' -');
            const timestampMs = logDate.getTime(); // Guarda o timestamp em milissegundos

            let contentHtml = '';
            const rawContent = (logEntry.contents || '').replace(/<span[^>]*>|<\/span>/g, ''); // Limpa spans HTML
            const parsedContent = {};

            // Divide o conteúdo em linhas e depois processa cada linha para chave/valor
             const lines = rawContent.split(/<br\s*\/?>|\n/); // Divide por <br> ou nova linha
             let currentKey = null;
             lines.forEach(line => {
                 const trimmedLine = line.trim();
                 // Tenta encontrar um padrão [CHAVE]: VALOR
                 const keyMatch = trimmedLine.match(/^\[([^\]]+)\]:\s*(.*)/);
                 if (keyMatch) {
                     currentKey = keyMatch[1].trim(); // Pega a chave
                     // Se o valor for vazio e houver linhas seguintes, elas pertencem a esta chave
                     parsedContent[currentKey] = keyMatch[2].trim();
                 } else if (currentKey && trimmedLine) {
                      // Se não for uma nova chave e a linha não for vazia, adiciona ao valor da chave atual
                     parsedContent[currentKey] += `<br>${trimmedLine}`; // Usa <br> para manter a formatação
                 }
             });

            // Extrai grupos principais e de assassino se existirem
            const mainGroups = parsedContent['GROUPS'] || '';
            if (mainGroups) delete parsedContent['GROUPS'];

            let assasinoGroups = '';
            if (parsedContent['Assasino']) {
                const assasinoContent = parsedContent['Assasino'];
                // Tenta extrair [GROUPS] do final da linha do assassino
                 const assasinoMatch = assasinoContent.match(/^(.*?)(\[GROUPS\]:\s*\{.*\})$/);
                 if (assasinoMatch) {
                     parsedContent['Assasino'] = assasinoMatch[1].trim(); // Atualiza o valor de Assasino
                     assasinoGroups = assasinoMatch[2].match(/\{.*\}/)?.[0] || ''; // Extrai apenas o JSON
                 }
            }

            // --- Monta o HTML do conteúdo ---
            const fieldsToShow = ['Assasino', 'ID', 'INVENTÀRIO', 'ARMAS', 'Localização', 'Causa'];
             fieldsToShow.forEach(key => {
                 if (parsedContent[key]) {
                     // Não mostra o ID se for o mesmo do logEntry.player_id (evita redundância)
                     if (key === 'ID' && parsedContent[key] === String(logEntry.player_id)) return;
                     contentHtml += window.logUtils.createLogLine(key, parsedContent[key]);
                 }
             });
             if (assasinoGroups) {
                 contentHtml += window.logUtils.createLogLine('GROUPS-Assasino', assasinoGroups);
             }

             // Adiciona campos específicos do 'MATOU' se for o caso
             if (logType === 'MATOU') {
                 const idMatch = rawContent.match(/\(ID\):\s*(\d+)/);
                 const sourceMatch = rawContent.match(/\(SOURCE\):\s*(\d+)/);
                 const armaMatch = rawContent.match(/\[ARMA]:\s*([^<\n]+)/);
                 const cdsMatch = rawContent.match(/\[CDS]:\s*([^<\n]+)/);
                 contentHtml += window.logUtils.createLogLine('Matou ID', idMatch ? idMatch[1].trim() : 'N/A');
                 contentHtml += window.logUtils.createLogLine('Source Matou', sourceMatch ? sourceMatch[1].trim() : 'N/A');
                 contentHtml += window.logUtils.createLogLine('ARMA', armaMatch ? armaMatch[1].trim() : 'N/A');
                 contentHtml += window.logUtils.createLogLine('CDS', cdsMatch ? cdsMatch[1].trim() : 'N/A');
             }
             // Adiciona o player_name destacado se for "Não Informado"
             const playerNameHtml = logEntry.player_name && logEntry.player_name.toLowerCase().includes('não informado')
                 ? `<span class="value-boxed-red">${logEntry.player_name}</span>`
                 : `<span class="value-green">${logEntry.player_name || ''}</span>`;

             // Monta o card HTML final
            return `
                <div class="loot-log-entry" data-log-id="${logEntry.id || ''}" data-timestamp="${timestampMs}">
                    <button type="button" class="select-log-btn" aria-pressed="false" title="Selecionar registro"></button>
                    <p><span class="key-id">[ID]:</span> <span class="value-boxed">${logEntry.player_id || 'N/A'}</span> ${playerNameHtml}</p>
                    <p><span class="key-source">[SOURCE]:</span> <span class="value-boxed">${logEntry.source || 'N/A'}</span></p>
                    ${logType === 'MORTE' && mainGroups ? window.logUtils.createLogLine('GROUPS', mainGroups) : ''}
                    <p><span class="key-action">[${logType.toUpperCase()}]</span></p>
                    ${contentHtml}
                    <p><span class="key-date">[DATA]:</span> <span class="value-boxed">${formattedDate}</span></p>
                </div>
            `;
        },

        formatLootLogEntry: function(logEntry) {
            if (!logEntry || !logEntry.date) return '<div class="loot-log-entry"><p class="log-error">Registro inválido ou sem data.</p></div>';

            const fields = {};
             // Divide o conteúdo por <br> ou nova linha, depois processa cada linha
             const lines = (logEntry.contents || '').split(/<br\s*\/?>|\n/);
             lines.forEach(line => {
                 const cleanLine = line.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').trim();
                 // Tenta encontrar o padrão [CHAVE]: VALOR
                 const parts = cleanLine.match(/^(\[.*?\]):\s*(.*)/);
                 if (parts && parts.length === 3) {
                     const key = parts[1].trim(); // Chave com colchetes, ex: "[PEGOU]"
                     const value = parts[2].trim(); // Valor
                     fields[key] = value;
                 }
             });

            const logDate = window.logUtils._parseApiDate(logEntry.date);

            if (isNaN(logDate.getTime())) {
                console.warn(`[formatLootLogEntry] Data inválida detectada para log ${logEntry.id || 'sem ID'}: ${logEntry.date}`);
                return `<div class="loot-log-entry"><p class="log-error">Registro com data inválida: ${logEntry.date}</p></div>`;
            }

            const formattedDate = logDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', ' -');
            const timestampMs = logDate.getTime();

            const playerNameHtml = logEntry.player_name && logEntry.player_name.toLowerCase().includes('não informado')
                ? `<span class="value-boxed-red">${logEntry.player_name}</span>`
                : `<span class="value-green">${logEntry.player_name || ''}</span>`;

            // Usa as chaves exatas encontradas no `fields` ou '' se não existir
            return `
                <div class="loot-log-entry" data-log-id="${logEntry.id || ''}" data-timestamp="${timestampMs}">
                    <button type="button" class="select-log-btn" aria-pressed="false" title="Selecionar registro"></button>
                    <p><span class="key-id">[ID]:</span> <span class="value-boxed">${logEntry.player_id || 'N/A'}</span> ${playerNameHtml}</p>
                    <p><span class="key-source">[SOURCE]:</span> <span class="value-boxed">${logEntry.source || 'N/A'}</span></p>
                    <p><span class="key-action">[REVISTOU]</span></p>
                    <p><span class="key-default">[PEGOU]:</span> <span class="value-green">${fields['[PEGOU]'] || ''}</span></p>
                    <p><span class="key-default">[QUANTIDADE]:</span> <span class="value-green">${fields['[QUANTIDADE]'] || ''}</span></p>
                    <p><span class="key-default">[CDS]:</span> <span class="value-green">${fields['[CDS]'] || ''}</span></p>
                    <p><span class="key-default">[REVISTADOR]:</span> <span class="value-green">${fields['[REVISTADOR]'] || ''}</span></p>
                    <p><span class="key-default">[ALVO]:</span> <span class="value-green">${fields['[ALVO]'] || ''}</span></p>
                    <p><span class="key-date">[DATA]:</span> <span class="value-boxed">${formattedDate}</span></p>
                </div>
            `;
        },

        // --- FUNÇÕES DE MANIPULAÇÃO DE LOGS (MOV Didas de rdm.js, revistou.js, standard.js) ---

        handleMorteLog: async function(placeholderElement, denuncianteId, punido) {
             if (!placeholderElement || !denuncianteId || !punido || !punido.gameId || !punido.logDate) {
                 console.error("[handleMorteLog] Parâmetros inválidos.");
                 if(placeholderElement) placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro interno: Dados insuficientes para buscar log de morte.</p></div>';
                 return;
             }
            const { gameId: currentDenunciadoId, logDate } = punido;
            const dates = window.logUtils.formatDateForApi(logDate);
            placeholderElement.classList.add('log-loading');
            placeholderElement.innerHTML = 'Buscando logs de morte...';
            try {
                const response = await window.logUtils.fetchApiLog('MORTE', denuncianteId, null, dates);
                const allLogs = response && Array.isArray(response.data) ? response.data : [];

                if (allLogs.length === 0) {
                    placeholderElement.innerHTML = `<div class="loot-log-entry"><p>Nenhum log de MORTE encontrado para o denunciante (${denuncianteId}) na data ${logDate} +/- 1 dia.</p></div>`;
                    return;
                }

                // Filtra logs onde o [Assasino] contém o ID do denunciado atual
                 const filteredLogs = allLogs.filter(log => {
                     if (!log || typeof log.contents !== 'string') return false;
                     // Regex para encontrar '[Assasino]:' seguido por qualquer coisa até o ID_DENUNCIADO (como palavra completa)
                     const regex = new RegExp(`\\[Assasino\\]:.*?\\b${currentDenunciadoId}\\b`);
                     return regex.test(log.contents.replace(/<span[^>]*>|<\/span>/g, '')); // Testa no conteúdo limpo
                 });


                const logsToShow = filteredLogs.length > 0 ? filteredLogs : allLogs;
                const message = filteredLogs.length > 0
                    ? `Log específico encontrado para assassino ${currentDenunciadoId}. Mostrando ${logsToShow.length}.`
                    : `Log específico NÃO encontrado para assassino ${currentDenunciadoId}. Mostrando todos os ${logsToShow.length} logs de morte do denunciante.`;
                console.log(`[handleMorteLog] ${message}`);

                placeholderElement.innerHTML = logsToShow.map(log => window.logUtils.formatKillLogEntry(log, 'MORTE')).join('');

            } catch (e) {
                console.error("[handleMorteLog] Erro durante a execução:", e);
                placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro ao buscar log de morte.</p></div>';
            } finally {
                placeholderElement.classList.remove('log-loading');
            }
        },

        handleMatouLog: async function(placeholderElement, denuncianteId, punido) {
             if (!placeholderElement || !denuncianteId || !punido || !punido.gameId || !punido.logDate) {
                 console.error("[handleMatouLog] Parâmetros inválidos.");
                  if(placeholderElement) placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro interno: Dados insuficientes para buscar log de matou.</p></div>';
                 return;
             }
            const { logDate, gameId: currentDenunciadoId } = punido;
            const dates = window.logUtils.formatDateForApi(logDate);
            placeholderElement.classList.add('log-loading');
            placeholderElement.innerHTML = 'Buscando logs de matou...';
            try {
                // Para MATOU: 'i' é o assassino (denunciado), 'a' é a vítima (denunciante)
                const response = await window.logUtils.fetchApiLog('MATOU', denuncianteId, currentDenunciadoId, dates);
                const allLogs = response && Array.isArray(response.data) ? response.data : [];

                if (allLogs.length === 0) {
                    placeholderElement.innerHTML = `<div class="loot-log-entry"><p>Nenhum log de MATOU encontrado para ${currentDenunciadoId} matando ${denuncianteId} na data ${logDate} +/- 1 dia.</p></div>`;
                    return;
                }
                placeholderElement.innerHTML = allLogs.map(log => window.logUtils.formatKillLogEntry(log, 'MATOU')).join('');
            } catch (e) {
                console.error("[handleMatouLog] Erro durante a execução:", e);
                placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro ao buscar log de matou.</p></div>';
            } finally {
                placeholderElement.classList.remove('log-loading');
            }
        },

        fetchLootLogsAfterDeath: async function(placeholderElement, deathLogTimestamp, denuncianteId, punidoPrincipal) {
             if (!placeholderElement || !deathLogTimestamp || !denuncianteId || !punidoPrincipal || !punidoPrincipal.logDate) {
                 console.error("[fetchLootLogsAfterDeath] Parâmetros inválidos.");
                 if(placeholderElement) placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro interno: Dados insuficientes para buscar logs de loot pós-morte.</p></div>';
                 return;
             }
            const timestampMs = parseInt(deathLogTimestamp, 10);
            if (isNaN(timestampMs)) {
                console.error("[fetchLootLogsAfterDeath] Erro: deathLogTimestamp inválido:", deathLogTimestamp);
                placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro: Timestamp do log de morte inválido.</p></div>';
                return;
            }
            const deathTime = new Date(timestampMs);
             if (isNaN(deathTime.getTime())) {
                  console.error("[fetchLootLogsAfterDeath] Erro: Objeto Date inválido criado a partir do timestamp:", timestampMs);
                  placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro: Falha ao processar o timestamp do log de morte.</p></div>';
                  return;
             }
            const fifteenMinStartTime = deathTime.getTime();
            const fifteenMinEndTime = fifteenMinStartTime + (15 * 60 * 1000);
            const twoDayWindow = window.logUtils.formatDateForApi(punidoPrincipal.logDate); // Janela de +/- 1 dia

            placeholderElement.classList.add('log-loading');
            placeholderElement.innerHTML = `Buscando logs de revista (alvo=${denuncianteId}) na janela de ${punidoPrincipal.logDate} +/- 1 dia...`;

            try {
                // Busca ampla: logs de revista onde o DENUNCIANTE ('a') foi o ALVO, na janela de 2 dias.
                 const logData = await window.logUtils.fetchApiLog(
                     'REVISTOU',
                     denuncianteId, // Alvo ('a')
                     null,          // Revistador ('i' = null para buscar todos)
                     twoDayWindow,  // Janela de +/- 1 dia
                     null, null
                 );


                if (logData && Array.isArray(logData.data) && logData.data.length > 0) {
                     console.log(`[fetchLootLogsAfterDeath] ${logData.data.length} logs encontrados na janela de 2 dias. Filtrando para 15 minutos após ${deathTime.toISOString()}...`);
                    // Filtra client-side para a janela de 15 minutos APÓS a morte selecionada
                    const filteredLogs = logData.data.filter(log => {
                        if (!log || !log.date) return false;
                         try {
                             const logTime = new Date(log.date).getTime();
                             return !isNaN(logTime) && logTime >= fifteenMinStartTime && logTime < fifteenMinEndTime;
                         } catch(e) { return false; }
                    });

                    console.log(`[fetchLootLogsAfterDeath] ${filteredLogs.length} logs encontrados DENTRO da janela de 15 minutos.`);

                    if (filteredLogs.length > 0) {
                        placeholderElement.innerHTML = filteredLogs.map(window.logUtils.formatLootLogEntry).join('');
                    } else {
                        placeholderElement.innerHTML = '<div class="loot-log-entry"><p>Nenhum registro de loot encontrado para o denunciante nos 15 minutos seguintes à morte selecionada (dentro da janela de busca de +/- 1 dia).</p></div>';
                    }
                } else {
                    placeholderElement.innerHTML = '<div class="loot-log-entry"><p>Nenhum registro de loot encontrado onde o denunciante foi o alvo na data da ocorrência (+/- 1 dia).</p></div>';
                }
            } catch (e) {
                console.error("[fetchLootLogsAfterDeath] Erro CRÍTICO:", e);
                placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro crítico ao buscar/filtrar logs de loot. Verifique o console.</p></div>';
            } finally {
                placeholderElement.classList.remove('log-loading');
            }
        },

        fetchAndDisplayLootLog: async function(placeholderElement, denuncianteId, punido) {
             if (!placeholderElement || !denuncianteId || !punido || !punido.gameId || !punido.logDate) {
                 console.error("[fetchAndDisplayLootLog] Parâmetros inválidos.");
                  if(placeholderElement) placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro interno: Dados insuficientes para buscar log de revista.</p></div>';
                 return;
             }
            const { logDate, gameId: denunciadoId } = punido;
            const dates = window.logUtils.formatDateForApi(logDate);
            placeholderElement.classList.add('log-loading');
            placeholderElement.innerHTML = 'Buscando logs de revista...';

            try {
                // Para REVISTOU: 'i' é o revistador (denunciado), 'a' é o alvo (denunciante)
                const logData = await window.logUtils.fetchApiLog('REVISTOU', denuncianteId, denunciadoId, dates);

                if (logData.error || !Array.isArray(logData.data)) {
                    placeholderElement.innerHTML = `<div class="loot-log-entry"><p class="log-error">Erro ao buscar os logs de revista para ${denunciadoId} revistando ${denuncianteId}.</p></div>`;
                    return;
                }

                if (logData.data.length === 0) {
                    placeholderElement.innerHTML = `<div class="loot-log-entry"><p>Nenhum registro de loot encontrado entre ${denunciadoId} (revistador) e ${denuncianteId} (alvo) na data ${logDate} +/- 1 dia.</p></div>`;
                    return;
                }

                placeholderElement.innerHTML = logData.data.map(window.logUtils.formatLootLogEntry).join('');
            } catch (e) {
                 console.error("[fetchAndDisplayLootLog] Erro durante execução:", e);
                 placeholderElement.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro ao buscar ou formatar logs de revista.</p></div>';
            } finally {
                 placeholderElement.classList.remove('log-loading');
            }
        },

        handleStandardLogs: async function(containerElement, denuncianteId, punido) {
             if (!containerElement || !denuncianteId || !punido || !punido.gameId || !punido.logDate) {
                 console.error("[handleStandardLogs] Parâmetros inválidos.");
                  containerElement.innerHTML = '<p class="log-error">Erro interno: Dados insuficientes para buscar logs padrão.</p>';
                 return;
             }
            const { logDate, index: punidoIndex, gameId: denunciadoId } = punido;
            const dates = window.logUtils.formatDateForApi(logDate);

            // Cria a estrutura HTML dentro do container fornecido
            containerElement.innerHTML = `
                <h4>Logs Padrão para: ${denunciadoId || 'ID não informado'}</h4>
                <div class="log-section">
                    <h5>LOG MORREU (Denunciante: ${denuncianteId})</h5>
                    <div id="log-morreu-${punidoIndex}" class="log-content log-loading">Buscando...</div>
                </div>
                <div class="log-section">
                    <h5>LOG MATOU (Denunciado: ${denunciadoId} / Vítima: ${denuncianteId})</h5>
                    <div id="log-matou-${punidoIndex}" class="log-content log-loading">Buscando...</div>
                </div>
                <div class="log-section">
                    <div class="checkbox-group">
                        <input type="checkbox" id="check-loot-${punidoIndex}">
                        <label for="check-loot-${punidoIndex}">Consultar Loot Opcional (Todos revistando ${denuncianteId})?</label>
                    </div>
                    <div id="log-revistou-${punidoIndex}" class="log-content hidden"></div>
                </div>
            `;

            const logMorreuEl = document.getElementById(`log-morreu-${punidoIndex}`);
            const logMatouEl = document.getElementById(`log-matou-${punidoIndex}`);
            const checkLoot = document.getElementById(`check-loot-${punidoIndex}`);
            const logRevistouEl = document.getElementById(`log-revistou-${punidoIndex}`);

            // Busca MORTE (denunciante morreu, assassino não especificado na query)
            try {
                const dataMorreu = await window.logUtils.fetchApiLog('MORTE', denuncianteId, null, dates);
                 if (dataMorreu.error || !Array.isArray(dataMorreu.data)) {
                     logMorreuEl.textContent = 'Erro ao buscar logs de morte.';
                     logMorreuEl.classList.add('log-error');
                 } else if (dataMorreu.data.length === 0) {
                     logMorreuEl.textContent = 'Nenhum log de morte encontrado para o denunciante.';
                 } else {
                     logMorreuEl.innerHTML = dataMorreu.data.map(log => window.logUtils.formatKillLogEntry(log, 'MORTE')).join('');
                 }
            } catch (e) { logMorreuEl.textContent = 'Erro ao buscar log de morte.'; logMorreuEl.classList.add('log-error'); }
             finally { logMorreuEl.classList.remove('log-loading'); }


            // Busca MATOU (denunciado matou denunciante)
            try {
                 // Para MATOU: 'i' é o assassino (denunciado), 'a' é a vítima (denunciante)
                const dataMatou = await window.logUtils.fetchApiLog('MATOU', denuncianteId, denunciadoId, dates);
                 if (dataMatou.error || !Array.isArray(dataMatou.data)) {
                     logMatouEl.textContent = 'Erro ao buscar logs de matou.';
                     logMatouEl.classList.add('log-error');
                 } else if (dataMatou.data.length === 0) {
                     logMatouEl.textContent = `Nenhum log encontrado para ${denunciadoId} matando ${denuncianteId}.`;
                 } else {
                     logMatouEl.innerHTML = dataMatou.data.map(log => window.logUtils.formatKillLogEntry(log, 'MATOU')).join('');
                 }
            } catch (e) { logMatouEl.textContent = 'Erro ao buscar log de matou.'; logMatouEl.classList.add('log-error'); }
            finally { logMatouEl.classList.remove('log-loading'); }

            // Listener para busca opcional de REVISTOU (todos revistando o denunciante)
            checkLoot.addEventListener('change', async (e) => {
                logRevistouEl.classList.toggle('hidden', !e.target.checked);
                if (e.target.checked && !logRevistouEl.innerHTML.trim()) { // Só busca se estiver vazio
                    logRevistouEl.classList.add('log-loading');
                    logRevistouEl.textContent = 'Buscando logs de revista (alvo: denunciante)...';
                     try {
                          // Para REVISTOU opcional: 'i' é null (todos), 'a' é o alvo (denunciante)
                         const dataRevistou = await window.logUtils.fetchApiLog('REVISTOU', denuncianteId, null, dates);
                         if (dataRevistou.error || !Array.isArray(dataRevistou.data)) {
                             logRevistouEl.textContent = 'Erro ao buscar logs de revista.';
                             logRevistouEl.classList.add('log-error');
                         } else if (dataRevistou.data.length === 0) {
                             logRevistouEl.textContent = `Nenhum log encontrado de alguém revistando ${denuncianteId}.`;
                         } else {
                             logRevistouEl.innerHTML = dataRevistou.data.map(window.logUtils.formatLootLogEntry).join('');
                         }
                     } catch(err) { logRevistouEl.textContent = 'Erro ao buscar log de revista.'; logRevistouEl.classList.add('log-error'); }
                     finally { logRevistouEl.classList.remove('log-loading'); }
                }
            });
        }
    };
})();