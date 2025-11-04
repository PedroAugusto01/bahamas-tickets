(function() {
    console.log('--- RDM Module Start (Refactored v2 - Conditional Loot) ---');

    if (!window.logUtils) {
        console.error("Erro crítico: o módulo log-utils.js não foi carregado a tempo.");
        const container = document.getElementById('rdm-logs-container');
        if (container) container.innerHTML = '<p class="log-error">Falha ao carregar dependências do módulo de log.</p>';
        return;
    }

    const container = document.getElementById('rdm-logs-container');
    const denuncianteId = window.formData.reporterId;
    const punidosParaLog = window.formData.punishedUsers.filter(user => user.needsLog);
    const lootCheckbox = document.getElementById('check-loot-rdm');
    const lootSection = document.getElementById('loot-log-section');
    const morreuPlaceholder = document.getElementById('log-morreu-placeholder');
    const matouPlaceholder = document.getElementById('log-matou-placeholder');
    const logLootRdm = document.getElementById('log-loot-rdm');
    const punidoPrincipal = punidosParaLog.length > 0 ? punidosParaLog[0] : null;

    if (!container || !lootCheckbox || !lootSection || !morreuPlaceholder || !matouPlaceholder || !logLootRdm) {
        console.error("Erro crítico: Um ou mais elementos do DOM do módulo RDM não foram encontrados.");
        if(container) container.innerHTML = '<p class="log-error">Erro ao inicializar a interface de logs (elementos ausentes).</p>';
        return;
    }

    const initialize = async () => {
        console.log('--- RDM Initialize Start (Refactored v2) ---');
        if (punidoPrincipal && denuncianteId && punidoPrincipal.logDate && punidoPrincipal.gameId) {
            console.log('[Initialize] Dados válidos. Chamando logUtils.handleMorteLog e logUtils.handleMatouLog.');

            await window.logUtils.handleMorteLog(morreuPlaceholder, denuncianteId, punidoPrincipal);
            await window.logUtils.handleMatouLog(matouPlaceholder, denuncianteId, punidoPrincipal);

            const hasLootIndevidoRule = punidoPrincipal.rules.some(rule => rule.toLowerCase().includes('loot indevido'));
            console.log(`[Initialize] Regra 'Loot Indevido' encontrada para ${punidoPrincipal.gameId}? ${hasLootIndevidoRule}`);

            if (hasLootIndevidoRule) {
                lootCheckbox.checked = true;
                lootCheckbox.disabled = true;
                lootSection.classList.remove('hidden');
                console.log('[Initialize] Loot Indevido detectado. Checkbox marcado e desabilitado. Buscando loot automaticamente...');

                await new Promise(resolve => setTimeout(resolve, 300));
                const firstDeathLog = morreuPlaceholder.querySelector('.loot-log-entry:not(:has(.log-error))');
                if (firstDeathLog) {
                    const timestamp = firstDeathLog.dataset.timestamp;
                    if (timestamp) {
                        console.log('[Initialize] Encontrado primeiro log de morte, buscando loot...');
                        firstDeathLog.classList.add('selected');
                        const btn = firstDeathLog.querySelector('.select-log-btn');
                        if(btn) { btn.textContent = '✓'; btn.setAttribute('aria-pressed', 'true'); }
                        window.logUtils.fetchLootLogsAfterDeath(logLootRdm, timestamp, denuncianteId, punidoPrincipal);
                    } else {
                        console.error("[Initialize] Timestamp ausente no primeiro log de morte.");
                        logLootRdm.innerHTML = '<div class="loot-log-entry"><p class="log-error">Erro: Timestamp ausente no log de morte para busca automática.</p></div>';
                        logLootRdm.classList.remove('log-loading');
                    }
                } else {
                    console.log('[Initialize] Nenhum log de morte válido encontrado para buscar loot automaticamente.');
                    logLootRdm.innerHTML = '<div class="loot-log-entry"><p>Nenhum log de morte encontrado para basear a busca automática de loot.</p></div>';
                    logLootRdm.classList.remove('log-loading');
                }
            } else { // Caso NÃO seja Loot Indevido (RDM, VDM ou outra regra com needsLog=true)
                lootCheckbox.checked = false; // Começa desmarcado
                lootCheckbox.disabled = false; // Habilitado para seleção manual
                lootSection.classList.add('hidden'); // Começa escondido
                // Limpa ou define mensagem inicial para a seção de loot
                logLootRdm.innerHTML = '<div class="loot-log-entry"><p>Marque a caixa acima para consultar logs de loot (opcional).</p></div>';
                console.log('[Initialize] Loot Indevido NÃO detectado. Checkbox opcional habilitado.');
            }

        } else {
            console.log('[Initialize] Erro: Dados insuficientes para iniciar.', { punidoPrincipal, denuncianteId });
            const errorMsg = 'Dados insuficientes (denunciante ID, punido ID principal, data do log).';
            morreuPlaceholder.innerHTML = `<div class="loot-log-entry"><p class="log-error">${errorMsg}</p></div>`;
            matouPlaceholder.innerHTML = `<div class="loot-log-entry"><p class="log-error">${errorMsg}</p></div>`;
            morreuPlaceholder.classList.remove('log-loading');
            matouPlaceholder.classList.remove('log-loading');
            lootSection.classList.add('hidden');
        }
        console.log('--- RDM Initialize End (Refactored v2) ---');
    };

    // Listener do Checkbox de Loot
    lootCheckbox.addEventListener('change', (e) => {
        console.log(`[LootCheckbox Change] Checkbox marcado: ${e.target.checked}`);
        lootSection.classList.toggle('hidden', !e.target.checked);
        if (e.target.checked) {
            const selectedDeathLog = morreuPlaceholder.querySelector('.loot-log-entry.selected:not(:has(.log-error))');
            console.log('[LootCheckbox Change] Log de morte selecionado:', selectedDeathLog);
            if (selectedDeathLog && selectedDeathLog.dataset.timestamp) {
                window.logUtils.fetchLootLogsAfterDeath(logLootRdm, selectedDeathLog.dataset.timestamp, denuncianteId, punidoPrincipal);
            } else if (!morreuPlaceholder.querySelector('.log-error')) {
                logLootRdm.innerHTML = '<div class="loot-log-entry"><p>Selecione um log de morte acima para buscar logs de loot.</p></div>';
                 logLootRdm.classList.remove('log-loading'); // Remove loading se não houver log de morte selecionado
            } else {
                 logLootRdm.innerHTML = '<div class="loot-log-entry"><p class="log-error">Selecione um log de morte válido para buscar logs de loot.</p></div>';
                 logLootRdm.classList.remove('log-loading'); // Remove loading se houver erro nos logs de morte
            }
        } else {
            // Se desmarcar, limpa a seção de loot
            logLootRdm.innerHTML = '';
        }
    });

    // Listeners de Seleção de Logs
    const addSelectionListener = (element, isExclusive = false) => {
        element.addEventListener('click', (e) => {
            const card = e.target.closest('.loot-log-entry');
            if (!card || card.querySelector('.log-error') || e.target.closest('a')) return;

            let newlySelectedTimestamp = null;

            if (isExclusive) {
                if (card.classList.contains('selected')) {
                    card.classList.remove('selected');
                    newlySelectedTimestamp = null;
                } else {
                    const currentlySelected = element.querySelector('.loot-log-entry.selected');
                    if (currentlySelected) currentlySelected.classList.remove('selected');
                    card.classList.add('selected');
                    newlySelectedTimestamp = card.dataset.timestamp;
                }
            } else {
                card.classList.toggle('selected');
            }

            // Atualiza botões
             element.querySelectorAll('.loot-log-entry').forEach(entry => {
                 const btn = entry.querySelector('.select-log-btn');
                 const isSelected = entry.classList.contains('selected');
                 if (btn) {
                     btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
                     btn.textContent = isSelected ? '✓' : '';
                 }
             });


            // Dispara busca de loot SE o clique foi em MORTE E o checkbox de loot está MARCADO
             if (element === morreuPlaceholder && lootCheckbox.checked) {
                 console.log(`[SelectionListener ${element.id}] Disparando atualização de loot. Timestamp a ser passado: ${newlySelectedTimestamp}`);
                 if (newlySelectedTimestamp) {
                     window.logUtils.fetchLootLogsAfterDeath(logLootRdm, newlySelectedTimestamp, denuncianteId, punidoPrincipal);
                 } else {
                     logLootRdm.innerHTML = '<div class="loot-log-entry"><p>Selecione um log de morte para buscar logs de loot.</p></div>';
                      logLootRdm.classList.remove('log-loading'); // Garante que não fique carregando
                 }
             }
        });
    };

    addSelectionListener(logLootRdm, false);
    addSelectionListener(morreuPlaceholder, true);
    addSelectionListener(matouPlaceholder, true);

    initialize();

})();