class DeniedHandler extends BaseReportHandler {
    constructor(formData, sectionsEl) {
        super(formData, sectionsEl);

        this.deniedMessages = {
            'Denunciado já banido': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Informamos que o seu ticket foi encerrado com o status Negado. Após as devidas verificações, constatamos que o usuário denunciado já se encontra banido da cidade. Dessa forma, não há necessidade de prosseguir com a denúncia, e o atendimento será finalizado.


Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Clip com link expirado':`**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

:check_91: Seu ticket está sendo encerrado com status de negado por falta de provas, pois o link fornecido expirou. Caso consiga provas adequadas e dentro do prazo de validade, você pode abrir um novo ticket.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Bug nas logs': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Seu ticket está sendo encerrado com status de negado, pois, devido a um bug no sistema de logs, não foi possível identificar a pessoa responsável por sua morte. Caso tenha alguma dúvida ou precise de mais informações, por favor, entre em contato novamente.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Não houve quebra de regras': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Após a análise das informações e do vídeo relacionado a sua denúncia, informo que a denúncia está sendo **NEGADA**, pois a situação apresentada não se caracteriza como **{regra_selecionada}**, conforme as regras vigentes da cidade.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Abandono': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Informamos que o ticket está sendo encerrado com o status **NEGADA**, em virtude das tentativas de contato realizadas com o(a) denunciante, sem retorno. Diante da ausência de manifestação, a denúncia será considerada negada por abandono. Conte sempre com a equipe STAFF.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Clip sem áudio': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Seu ticket está sendo encerrado com status de **NEGADA**. Conforme as regras do servidor, nenhum membro da staff pode aceitar denúncias sem áudio. Caso consiga um vídeo adequado, você pode abrir um novo ticket.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Falta de provas': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Seu ticket está sendo encerrado com status de **NEGADA** por falta de provas. Caso consiga provas adequadas, você pode abrir um novo ticket.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Prazo para denúncia expirado': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Seu ticket está sendo encerrado com status de **NEGADA** pelo fato de já ter passado da data limite para abertura de um ticket.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`,

            'Quebra de regras por ambas as partes': `**DENÚNCIA NEGADA :check_91:**

Olá <@{id_discord_denunciante}>,

Seu ticket está sendo encerrado com status de **NEGADA** pelo fato de ambos terem quebrado regras, como não ocorreu algo extremamente grave.

Lembrando que é importante sempre estar atento e seguindo as regras da cidade para evitar futuras punições.

Agradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.

-# Atenciosamente,
-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`
        };

        this.deniedReportTemplate = `**🛠️TICKET-DENÚNCIA NEGADO**
-# Temporada/Season 9

**DENUNCIANTE:** ID {id_ingame_denunciante} | <@{id_discord_denunciante}>
**STAFF QUE JULGOU:** <@{id_discord_user_logado}>
**NÚMERO DO TICKET:** {numero_do_ticket}
**MOTIVO:** {regra_selecionada}
**RESULTADO:** NEGADO`;
    }

    extractItemsFromDeathLog(logText) {
        if (!logText) return '';
        const extractSection = (key, text) => {
            const regex = new RegExp(`\\\[${key}\\\]:([\\s\\S]*?)(?=\\s*\\\[[A-ZÀ-Ÿ]+\]:|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                const content = match[1].trim();
                const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 1 && (lines[0].match(/ x \d+/g) || []).length > 1) {
                    const itemRegex = /.+? x \d+/g;
                    return lines[0].match(itemRegex) || [];
                }
                return lines;
            }
            return [];
        };
        const inventarioItems = extractSection('INVENTÀRIO', logText);
        const armasItemsRaw = extractSection('ARMAS', logText);
        const processedArmas = [];
        armasItemsRaw.forEach(itemLine => {
            const parts = itemLine.split(' x ');
            const name = parts[0].trim();
            const quantity = parseInt(parts[1] || '0', 10);
            if (name.startsWith('WEAPON_')) {
                const weaponName = name.replace('WEAPON_', '');
                if (quantity === 0) {
                    processedArmas.push(`${weaponName} x 1`);
                } else {
                    processedArmas.push(`${weaponName} x 1`);
                    processedArmas.push(`AMMO_${weaponName} x ${quantity}`);
                }
            } else {
                processedArmas.push(itemLine);
            }
        });
        const allItems = [...inventarioItems, ...processedArmas];
        return allItems.map(item => `> ${item.trim()}`).join('\n');
    }

    async renderAll() {
        const titleEl = document.getElementById('report-title');
        titleEl.textContent = `Relatório: Ticket Negado - ${this.formData.deniedInfo.reason}`;
        this.sectionsEl.innerHTML = '<p>Carregando dados para o relatório...</p>';

        const loggedInUserInfo = window.loggedInUser || { id: 'ID_NAO_ENCONTRADO' };

        const [reporterInfo, itemMapping, itemPrices] = await Promise.all([
            this.utils.fetchUserInfo(this.formData.reporterId),
            fetch('/api/item-mapping').then(res => res.json()),
            fetch('/api/item-prices').then(res => res.json())
        ]);

        const reporterDiscordId = reporterInfo?.user_info?.id || 'ID_DENUNCIANTE_NAO_ENCONTRADO';
        const reporterInGameId = this.formData.reporterId;

        this.sectionsEl.innerHTML = '';

        if (this.formData.selectedLogs && this.formData.selectedLogs.length > 0) {
            await window.logRenderer.renderLogSections(this);
        }

        const logMorte = this.formData.selectedLogs && this.formData.selectedLogs.find(log => log.html.includes('[MORTE]'));
        const hasLootLogs = this.formData.selectedLogs && this.formData.selectedLogs.some(log => log.html.includes('[REVISTOU]'));
        const canHaveDevolucao = logMorte || hasLootLogs;

        let messageTemplate = this.deniedMessages[this.formData.deniedInfo.reason] || `Olá <@{id_discord_denunciante}>,\n\nSeu ticket foi negado pelo seguinte motivo: ${this.formData.deniedInfo.reason}.\n\n-# Atenciosamente,\n-# ** <@{id_discord_user_logado}> ** - Equipe Bahamas.`;
        let messageContent = messageTemplate
            .replace('<@{id_discord_denunciante}>', `<@${reporterDiscordId}>`)
            .replace('<@{id_discord_user_logado}>', `<@${loggedInUserInfo.id}>`);

        if (this.formData.deniedInfo.reason === 'Não houve quebra de regras' && this.formData.deniedInfo.evaluatedRule) {
            messageContent = messageContent.replace('{regra_selecionada}', this.formData.deniedInfo.evaluatedRule);
        } else {
             messageContent = messageContent.replace('{regra_selecionada}', this.formData.deniedInfo.reason); // Fallback
        }


        let messageHtml = `<pre>${messageContent}</pre>`;
        if (canHaveDevolucao) {
            messageHtml = `<div class="devolucao-toggle"><input type="checkbox" id="devolucao-check"><label for="devolucao-check">Vai ocorrer devolução?</label></div>` + messageHtml;
        }

        this.utils.createSection(
            'Mensagem ao Denunciante',
            messageHtml,
            this.sectionsEl,
            { copyText: messageContent, id: 'message-section' }
        );

        if (canHaveDevolucao) {
            let itemsTextParaDevolucao = '';
            if (logMorte) {
                itemsTextParaDevolucao = this.extractItemsFromDeathLog(logMorte.text);
            } else if (hasLootLogs) {
                const { itemsData } = this.utils.calculateItemsValue(this.formData.selectedLogs, itemMapping, itemPrices);
                itemsTextParaDevolucao = itemsData.map(item => `> ${item.itemCode} x${item.quantity}`).join('\n');
            }

            if (itemsTextParaDevolucao) {
                window.reportRenderer.renderDevolucaoReport(this, { loggedInUserInfo }, reporterInGameId, reporterDiscordId, itemsTextParaDevolucao);
            }
        }

        const ticketChannelName = this.formData.ticketChannelName || '';
        const ticketNumberMatch = ticketChannelName.match(/-(\d+)$/);
        const ticketNumber = ticketNumberMatch ? ticketNumberMatch[1] : this.formData.ticketChannel;

        const reportReason = this.formData.deniedInfo.reason === 'Não houve quebra de regras' ? this.formData.deniedInfo.evaluatedRule || this.formData.deniedInfo.reason : this.formData.deniedInfo.reason;

        const reportContent = this.deniedReportTemplate
            .replace('{id_ingame_denunciante}', reporterInGameId)
            .replace('{id_discord_denunciante}', reporterDiscordId)
            .replace('{id_discord_user_logado}', loggedInUserInfo.id)
            .replace('{numero_do_ticket}', ticketNumber)
            .replace('{regra_selecionada}', reportReason); // Usa a regra ou o motivo

        this.utils.createSection(
            'Relatório de Ticket Negado',
            `<pre>${reportContent}</pre>`,
            this.sectionsEl,
            { copyText: reportContent, id: 'denied-report-section' }
        );

        if (canHaveDevolucao) {
            const devolucaoCheck = document.getElementById('devolucao-check');
            const devolucaoReportSection = document.getElementById('devolucao-report-section');

            if (devolucaoCheck && devolucaoReportSection) {
                devolucaoReportSection.style.display = 'none';
                devolucaoCheck.addEventListener('change', (e) => {
                    devolucaoReportSection.style.display = e.target.checked ? 'block' : 'none';
                });
            }
        }
    }
}

window.DeniedHandler = DeniedHandler;