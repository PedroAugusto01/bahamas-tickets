(function() {
    if (!window.logUtils) {
        console.error("Erro crítico: o módulo log-utils.js não foi carregado a tempo.");
        const container = document.getElementById('revistou-logs-container');
        if (container) container.innerHTML = '<p class="log-error">Falha ao carregar dependências do módulo de log.</p>';
        return;
    }

    const container = document.getElementById('revistou-logs-container');
    const denuncianteId = window.formData.reporterId;
    // Pega todos os usuários que precisam de log (pode ser mais de um se a regra se aplicar a vários)
    const punidosParaLog = window.formData.punishedUsers.filter(user => user.needsLog);

    if (!container) {
        console.error("Container 'revistou-logs-container' não encontrado.");
        return;
    }

    // Limpa o container e processa cada usuário que precisa de log de revista
    container.innerHTML = '';
    if (punidosParaLog.length === 0) {
        container.innerHTML = '<p>Nenhum usuário requer log de revista.</p>';
        return;
    }

    punidosParaLog.forEach(punido => {
        const block = document.createElement('div');
        block.className = 'log-results-block'; // Reutiliza a classe para estilização
        block.innerHTML = `
            <h4>Logs de Loot para: ${punido.gameId || 'ID não informado'} (Revistador: ${punido.gameId} / Alvo: ${denuncianteId})</h4>
            <div id="log-loot-${punido.index}" class="log-content log-loading">Buscando logs de revista...</div>
        `;
        container.appendChild(block);

        const logContentEl = document.getElementById(`log-loot-${punido.index}`);
        if (logContentEl) {
            // Chama a função centralizada para buscar e exibir os logs de loot
            window.logUtils.fetchAndDisplayLootLog(logContentEl, denuncianteId, punido);
        } else {
            console.error(`Elemento 'log-loot-${punido.index}' não encontrado após ser criado.`);
        }
    });

    // Listener de seleção (opcional, pode ser centralizado em step3-logs.js se preferir)
    // Este listener permite marcar/desmarcar logs *dentro* deste módulo
    container.addEventListener('click', (e) => {
        const card = e.target.closest('.loot-log-entry');
         // Ignora cliques fora de um card, em links ou em cards de erro
         if (!card || card.querySelector('.log-error') || e.target.closest('a')) return;

         const isSelected = card.classList.toggle('selected');
         const btn = card.querySelector('.select-log-btn');
         if (btn) {
             btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
             btn.textContent = isSelected ? '✓' : '';
         }
    });

})();