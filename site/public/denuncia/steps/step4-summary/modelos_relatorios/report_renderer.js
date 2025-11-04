class BaseReportHandler {
    constructor(formData, sectionsEl) {
        this.formData = formData;
        this.sectionsEl = sectionsEl;
        this.utils = window.reportUtils;
    }

    async renderAll() {
        const titleEl = document.getElementById('report-title');
        const punishedUsers = this.formData.punishedUsers || [];

        if (punishedUsers.length === 1) {
            const ruleName = punishedUsers[0].displayRules.join(', ');
            titleEl.textContent = `Relatório: ${ruleName}`;
        } else {
            titleEl.textContent = 'Relatório: Denúncia Múltipla';
        }
        this.sectionsEl.innerHTML = '<p>Carregando dados para o relatório...</p>';
        const loggedInUserInfo = window.loggedInUser || { id: 'ID_NAO_ENCONTRADO' };

        if (punishedUsers.length === 0 && this.formData.flow !== 'denied') { // Allow denied flow to proceed
            this.sectionsEl.innerHTML = `<p class="log-error">Erro: Nenhum usuário punido foi encontrado.</p>`;
            return;
        }

        const fetchPromises = [this.utils.fetchUserInfo(this.formData.reporterId)];
        if (this.formData.flow !== 'denied') {
             fetchPromises.push(...punishedUsers.map(user => this.utils.fetchUserInfo(user.gameId)));
        }

        const [reporterInfo, ...punishedInfos] = await Promise.all(fetchPromises);

        // Check for critical errors (reporter not found is less critical here)
        const criticalErrorInfo = punishedInfos.find(info => info && info.error && !info.found_in_db);
        if (criticalErrorInfo) {
            const errorUserIndex = punishedInfos.indexOf(criticalErrorInfo);
            const errorUser = punishedUsers[errorUserIndex]; // Should exist if punishedInfos has item
            this.sectionsEl.innerHTML = `<div class="step4-section"><p class="log-error"><b>Erro CRÍTICO ao buscar informações do punido (ID: ${errorUser?.gameId || 'Desconhecido'}):</b><br>${criticalErrorInfo.error}<br>Usuário não encontrado nem no Discord nem no banco de dados.</p></div>`;
            return; // Stop rendering if critical error
        }

        const [rulesData, itemMapping, itemPrices] = await Promise.all([
            this.utils.loadRulesJson(),
            fetch('/api/item-mapping').then(res => res.json()),
            fetch('/api/item-prices').then(res => res.json())
        ]);

        this.sectionsEl.innerHTML = '';
        await window.reportRenderer.renderReportSections(this, { loggedInUserInfo, punishedUsers, reporterInfo, punishedInfos, rulesData, itemMapping, itemPrices });

    }

    renderDenuncianteMessage(data) {
        throw new Error("O método renderDenuncianteMessage precisa ser implementado pela classe filha.");
    }
}
window.BaseReportHandler = BaseReportHandler;