(async function() {
    const sectionsEl = document.getElementById('step4-sections');
    const formData = window.formData || {};

    const getHandlerName = () => {
        if (formData.flow === 'denied') {
            return 'denied';
        }

        const allRules = (formData.punishedUsers || []).flatMap(u => u.rules.map(r => r.toLowerCase()));
        if (allRules.some(r => r.includes('rdm'))) return 'rdm';
        if (allRules.some(r => r.includes('vdm'))) return 'vdm';
        if (allRules.some(r => r.includes('loot indevido'))) return 'loot_indevido';
        return 'generic';
    };

    async function loadScript(id, src) {
        // Remove script antigo se existir, para garantir recarregamento limpo
        document.getElementById(id)?.remove();
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        document.body.appendChild(script);
        return new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        });
    }

    async function loadRuleHandler(handlerName) {
        const utilsPath = '/denuncia/steps/step4-summary/modelos_relatorios/utils.js';
        const baseHandlerPath = '/denuncia/steps/step4-summary/modelos_relatorios/BaseReportHandler.js';
        const handlerPath = `/denuncia/steps/step4-summary/modelos_relatorios/${handlerName}/${handlerName}.js`;
        
        try {
            await loadScript('common-utils-script', utilsPath);
            await loadScript('base-handler-script', baseHandlerPath); // Agora contém os renderers
            await loadScript('rule-handler-script', handlerPath);

            const HandlerClassName = handlerName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Handler';
            const HandlerClass = window[HandlerClassName];
            
            if (HandlerClass) {
                const handlerInstance = new HandlerClass(formData, sectionsEl);
                await handlerInstance.renderAll();
            } else {
                throw new Error(`A classe do handler "${HandlerClassName}" não foi encontrada.`);
            }
        } catch (error) {
            console.error(`Erro ao carregar o handler para a regra "${handlerName}":`, error);
            sectionsEl.innerHTML = `<p class="log-error">Não foi possível carregar o modelo de relatório para esta regra.</p>`;
        }
    }

    // --- INÍCIO DA EXECUÇÃO ---
    try {
        await loadScript('step4-config-script', '/denuncia/steps/step4-summary/config.js');

       if (formData.flow === 'denied' || (formData.punishedUsers && formData.punishedUsers.length > 0)) {
            const handlerToLoad = getHandlerName();
            await loadRuleHandler(handlerToLoad);
        } else {
            sectionsEl.innerHTML = '<p>Nenhuma informação para gerar relatório.</p>';
        }

        document.getElementById('btn-new-denuncia')?.addEventListener('click', () => {
            window.location.reload();
        });

    } catch (error) {
        console.error(error);
        sectionsEl.innerHTML = `<p class="log-error">Erro crítico ao inicializar o Passo 4.</p>`;
    }
})();