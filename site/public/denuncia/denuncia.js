// Tickets/site/public/denuncia/denuncia.js
document.addEventListener('DOMContentLoaded', () => {
    // Objeto global para armazenar os dados do formulário
    window.formData = {};
    // Objeto global para armazenar as regras carregadas do JSON
    window.ruleData = {
        punishmentRules: [], // Lista achatada para exibição
        fullRuleSet: [],     // Mantém a estrutura original com sub-regras
        deniedReasons: []
    };

    const stepContent = document.getElementById('step-content');

    const stepPaths = {
        'step1': 'steps/step1/',
        'step2-negado': 'steps/step2/',
        'step2-punicao': 'steps/step2/',
        'step3-logs': 'steps/step3-logs/',
        'step4-summary': 'steps/step4-summary/'
    };

    const stepCssMapping = {
        'step2-punicao': 'step2-punicao.css',
        'step2-negado': 'step2-punicao.css', // <<< ALTERAÇÃO APLICADA AQUI
        'step3-logs': 'step3-logs.css',
        'step4-summary': 'step4-summary.css'
    };

    window.loadStep = async (stepName) => {
        console.log(`--- [denuncia.js] Tentando carregar passo: ${stepName} ---`); // DEBUG ADICIONADO
        try {
            // Remove os estilos e scripts da etapa anterior
            document.getElementById('step-style')?.remove();
            document.getElementById('step-script')?.remove();

            // Garante a remoção de qualquer estilo de módulo de log que tenha permanecido
            document.querySelectorAll('link[id^="log-style-"]').forEach(el => el.remove());

            const basePath = stepPaths[stepName];
            if (!basePath) {
                console.error(`[denuncia.js] Caminho base não encontrado para o passo: ${stepName}`); // DEBUG ADICIONADO
                throw new Error(`Caminho para o passo "${stepName}" não definido.`);
            }
            console.log(`[denuncia.js] Caminho base para ${stepName}: ${basePath}`); // DEBUG ADICIONADO

            const htmlFile = stepName.startsWith('step2-') ? stepName : `${basePath}${stepName}.html`;
            const jsFile = stepName.startsWith('step2-') ? stepName : `${basePath}${stepName}.js`;
            console.log(`[denuncia.js] Arquivo HTML a carregar: ${basePath}${stepName}.html`); // DEBUG ADICIONADO
            console.log(`[denuncia.js] Arquivo JS a carregar: ${basePath}${stepName}.js`); // DEBUG ADICIONADO


            const htmlResponse = await fetch(`${basePath}${stepName}.html`);
            if (!htmlResponse.ok) throw new Error(`Falha ao carregar HTML: ${stepName}. Status: ${htmlResponse.status}`);
            stepContent.innerHTML = await htmlResponse.text();
            console.log(`[denuncia.js] HTML para ${stepName} carregado com sucesso.`); // DEBUG ADICIONADO


            const script = document.createElement('script');
            script.id = 'step-script';
            script.src = `${basePath}${stepName}.js`;
            // DEBUG ADICIONADO: Log para erro no carregamento do script do passo
            script.onerror = () => console.error(`[denuncia.js] FALHA AO CARREGAR SCRIPT: ${script.src}`);
            script.onload = () => console.log(`[denuncia.js] Script ${script.src} carregado e executado (presumivelmente).`); // DEBUG ADICIONADO (Nota: onload não garante execução completa sem erros internos)
            document.body.appendChild(script);

            // Carrega o CSS correto usando o mapeamento
            if (stepCssMapping[stepName]) {
                const cssLink = document.createElement('link');
                cssLink.id = 'step-style';
                cssLink.rel = 'stylesheet';
                cssLink.href = `${stepPaths[stepName]}${stepCssMapping[stepName]}`;
                console.log(`[denuncia.js] Carregando CSS: ${cssLink.href}`); // DEBUG ADICIONADO
                document.head.appendChild(cssLink);
            }

        } catch (error) {
            console.error(`[denuncia.js] Erro DENTRO de loadStep para ${stepName}:`, error); // DEBUG ADICIONADO
            stepContent.innerHTML = `<p style="color: #ff6b6b;">Erro ao carregar o formulário (${stepName}). Verifique o console.</p>`;
        }
    };

    window.loadNavUserProfile = async () => {
        try {
            const response = await fetch('/api/user');
            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            const user = await response.json();

            window.loggedInUser = user;

            const userProfileDiv = document.getElementById('nav-user-profile');
            if (userProfileDiv) {
                userProfileDiv.innerHTML = `
                    <img src="${user.avatarUrl}" alt="Avatar" class="nav-user-avatar">
                    <span>${user.username}</span>`;
            }
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
        }
    };

    const initialize = async () => {
        await loadNavUserProfile();

        try {
            const response = await fetch('/utils/tickets_result.json');
            if (!response.ok) throw new Error('Falha ao carregar JSON de regras.');
            const data = await response.json();

            window.ruleData.fullRuleSet = data.punicoes || [];

            // "Achata" a lista de regras para o seletor principal
            window.ruleData.punishmentRules = [];
            (data.punicoes || []).forEach(rule => {
                if (rule.sub_regras && rule.sub_regras.length > 0) {
                    // Adiciona a regra principal (sem as sub-regras)
                    const mainRule = { ...rule };
                    delete mainRule.sub_regras;
                    window.ruleData.punishmentRules.push(mainRule);
                } else {
                    window.ruleData.punishmentRules.push(rule);
                }
            });

            window.ruleData.deniedReasons = data.negados || [];

            loadStep('step1');
        } catch (error) {
            console.error(error);
            stepContent.innerHTML = `<p style="color: #ff6b6b;">Erro crítico ao carregar as regras.</p>`;
        }
    };

    initialize();
});