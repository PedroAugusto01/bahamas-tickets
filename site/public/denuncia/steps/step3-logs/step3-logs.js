(function () {
    console.log('--- [step3-logs.js] Script Iniciado (Refatorado v2 - Usando RDM como Padrão) ---');

    const mainContainer = document.getElementById('log-details-container');
    const formData = window.formData;

    // Carrega o utilitário centralizado log-utils.js
    const utilsScript = document.createElement('script');
    utilsScript.id = 'log-utils-script';
    utilsScript.src = '/denuncia/steps/step3-logs/modules/log-utils.js'; // Caminho confirmado
    utilsScript.onload = () => console.log('[step3-logs.js] log-utils.js carregado.');
    utilsScript.onerror = () => console.error('[step3-logs.js] FALHA ao carregar log-utils.js');
    document.body.appendChild(utilsScript);

    // Carrega APENAS os estilos do RDM e Revistou (standard.css removido)
    const rdmStyles = document.createElement('link');
    rdmStyles.id = 'log-style-rdm';
    rdmStyles.rel = 'stylesheet';
    rdmStyles.href = '/denuncia/steps/step3-logs/modules/rdm/rdm.css';
    document.head.appendChild(rdmStyles);

    const revistouStyles = document.createElement('link');
    revistouStyles.id = 'log-style-revistou';
    revistouStyles.rel = 'stylesheet';
    revistouStyles.href = '/denuncia/steps/step3-logs/modules/revistou/revistou.css';
    document.head.appendChild(revistouStyles);

    // Remove o estilo do standard se existir de um carregamento anterior
    document.getElementById('log-style-standard')?.remove();


    // Função para carregar dinamicamente HTML e JS de um módulo (sem alterações aqui)
    const loadModule = (moduleName, container, user) => {
        console.log(`[step3-logs.js] Tentando carregar módulo: ${moduleName} para usuário ${user?.gameId || 'N/A'}`);
        return new Promise(async (resolve, reject) => {
            let scriptElement = null;
            try {
                // Carrega HTML
                const htmlPath = `/denuncia/steps/step3-logs/modules/${moduleName}/${moduleName}.html`;
                console.log(`[step3-logs.js] Buscando HTML: ${htmlPath}`);
                const htmlResponse = await fetch(htmlPath);
                if (!htmlResponse.ok) throw new Error(`HTML ${moduleName} não encontrado.`);
                const htmlContent = await htmlResponse.text();
                const moduleContainer = document.createElement('div');
                moduleContainer.id = `module-container-${moduleName}-${user?.index || 'main'}`;
                moduleContainer.innerHTML = htmlContent;
                container.appendChild(moduleContainer);

                // Carrega JS
                const jsPath = `/denuncia/steps/step3-logs/modules/${moduleName}/${moduleName}.js`;
                console.log(`[step3-logs.js] Carregando Script: ${jsPath}`);
                scriptElement = document.createElement('script');
                scriptElement.id = `module-script-${moduleName}-${user?.index || 'main'}`;
                scriptElement.src = jsPath;
                scriptElement.async = false;
                scriptElement.onload = () => {
                    console.log(`[step3-logs.js] Script ${moduleName}.js CARREGADO.`);
                    resolve();
                };
                scriptElement.onerror = () => {
                    console.error(`[step3-logs.js] FALHA AO CARREGAR SCRIPT ${moduleName}.js`);
                    moduleContainer.remove();
                    reject(new Error(`Falha ao carregar script ${moduleName}.js`));
                };
                document.body.appendChild(scriptElement);

            } catch (error) {
                console.error(`[step3-logs.js] Erro ao carregar módulo ${moduleName}:`, error);
                container.innerHTML += `<p class="log-error">Erro ao carregar interface para ${moduleName}.</p>`;
                scriptElement?.remove();
                reject(error);
            }
        });
    };

    const cleanupModules = () => {
        document.querySelectorAll('[id^="module-container-"]').forEach(el => el.remove());
        document.querySelectorAll('[id^="module-script-"]').forEach(el => el.remove());
        // Remove estilos específicos se necessário (já estamos removendo standard.css)
        // document.getElementById('log-style-rdm')?.remove();
        // document.getElementById('log-style-revistou')?.remove();
        console.log('[step3-logs.js] Módulos anteriores limpos.');
    };

    const initialize = async () => {
        console.log('[step3-logs.js] Iniciando initialize()...');
        await new Promise(resolve => {
            if (window.logUtils) { resolve(); }
            else {
                const script = document.getElementById('log-utils-script');
                if (script) { script.onload = resolve; }
                else { console.error("Script log-utils não encontrado para aguardar."); resolve(); }
            }
        });
        console.log('[step3-logs.js] log-utils.js está disponível.');

        cleanupModules();
        mainContainer.innerHTML = '';
        const usersNeedingLogs = formData.punishedUsers.filter(u => u.needsLog);
        console.log(`[step3-logs.js] Usuários que precisam de logs: ${usersNeedingLogs.length}`, usersNeedingLogs);

        if (usersNeedingLogs.length === 0) {
            mainContainer.innerHTML = "<p>Nenhuma regra selecionada requer consulta de logs.</p>";
            console.log('[step3-logs.js] Nenhum usuário precisa de logs.');
            document.getElementById('btn-step3-next').onclick = () => {
                window.formData.selectedLogs = [];
                window.loadStep('step4-summary');
            };
            return;
        }

        // --- LÓGICA DE CARREGAMENTO ALTERADA ---
        // Sempre carrega o módulo RDM se houver necessidade de logs
        const moduleToLoad = 'rdm'; // << SEMPRE RDM
        const primaryUser = usersNeedingLogs[0]; // Contexto principal

        console.log(`[step3-logs.js] Carregando módulo PADRÃO: ${moduleToLoad} (HTML e JS)`);

        const mainCard = document.createElement('div');
        mainCard.className = 'punished-user-log-block';
        // Adapta o título para ser mais genérico ou mostrar a regra principal
        const ruleDisplay = primaryUser.displayRules.length > 0 ? primaryUser.displayRules.join(', ') : 'Regra(s) não especificada(s)';
        mainCard.innerHTML = `<h2>Consulta de Logs para ${primaryUser.gameId} <span class="rule-tag">${ruleDisplay}</span></h2>`;
        mainContainer.appendChild(mainCard);

        try {
            await loadModule(moduleToLoad, mainCard, primaryUser);
            console.log(`[step3-logs.js] Módulo ${moduleToLoad} carregado com sucesso.`);
        } catch (error) {
            console.error(`[step3-logs.js] Falha crítica ao carregar módulo ${moduleToLoad}.`);
        }
        // --- FIM DA LÓGICA DE CARREGAMENTO ---
    };

    // Botões Voltar/Avançar
    document.getElementById('btn-back-to-step2').addEventListener('click', () => {
        console.log('[step3-logs.js] Botão Voltar clicado.');
        cleanupModules();
        const previousStep = window.formData.flow === 'denied' ? 'step2-negado' : 'step2-punicao';
        window.loadStep(previousStep);
    });

    document.getElementById('btn-step3-next').addEventListener('click', () => {
        console.log('[step3-logs.js] Botão Avançar clicado.');
        const nodes = Array.from(mainContainer.querySelectorAll('.loot-log-entry.selected'));
        console.log(`[step3-logs.js] Logs selecionados: ${nodes.length}`);

        window.formData.selectedLogs = nodes.map(node => ({
            id: node.dataset.logId || null,
            html: node.outerHTML,
            text: node.innerText,
            timestamp: node.dataset.timestamp || null
        }));
        console.log('[step3-logs.js] Indo para step4-summary. Dados salvos:', window.formData.selectedLogs.map(l=> ({id: l.id, timestamp: l.timestamp})));

        cleanupModules();
        window.loadStep('step4-summary');
    });

    initialize().catch(err => {
        console.error('[step3-logs.js] Erro geral na inicialização da Etapa 3:', err);
        mainContainer.innerHTML = `<p class="log-error">Ocorreu um erro inesperado ao carregar os logs. Verifique o console.</p>`;
    });

    console.log('--- [step3-logs.js] Script Finalizado (fim do IIFE Refatorado v2) ---');

})();