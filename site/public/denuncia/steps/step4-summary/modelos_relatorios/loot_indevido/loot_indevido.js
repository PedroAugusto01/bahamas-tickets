class LootIndevidoHandler extends BaseReportHandler {
    constructor(formData, sectionsEl) { super(formData, sectionsEl); }

    renderDenuncianteMessage(data) {
        const { loggedInUserInfo, rulesData, itemMapping, itemPrices } = data;
        const finalPunishedUsers = this.finalPunishedUsers || [];
        const finalPunishedInfos = this.finalPunishedInfos || [];
        const reporterInfo = data.reporterInfo;

        const { advRoleIds, punishmentPrisonTimes, punishmentFines } = window.step4Config;
        const reporterDiscordId = reporterInfo?.user_info?.id;
        const isValidDiscordId = reporterDiscordId && /^\d{17,19}$/.test(reporterDiscordId);
        const reporterMention = isValidDiscordId ? `<@${reporterDiscordId}>` : `ID ${this.formData.reporterId}`;

        const generatePunishmentTextForMessage = (user, userInfo) => {
             const basePunishment = user.punicaoMinima || 'verbal';
             const nextPunishment = this.utils.getNextPunishment(userInfo, basePunishment);
             const fineAmount = punishmentFines[nextPunishment] || null;
             const fineText = (fineAmount && nextPunishment !== 'banido') ? ` + multa de **${fineAmount}**` : '';

             if (user.punishmentType === 'prison') {
                 return `será aplicada a punição de **${user.prisonTime} meses de prisao**${fineText}`;
             }
             
             const roleId = advRoleIds[nextPunishment];
             
             // Verifica prisonTime fixo
             const prisonTime = (user.prisonTime && user.prisonTime > 0) 
                ? user.prisonTime 
                : (punishmentPrisonTimes[nextPunishment] || 0);

             const normalText = `será aplicada a punição de **<@&${roleId}>**` + (nextPunishment !== 'banido' ? ` com **${prisonTime} meses de prisao**` : '');

             // MODIFICADO: Removida lógica de forçar ban para usuário fora do Discord.
             return normalText + fineText;
        };

        let msgIntro = `Olá ${reporterMention},\n\nApós análise do vídeo de denúncia,`;

        const punishmentMessages = finalPunishedUsers.map((user, index) => {
             const userInfo = finalPunishedInfos[index];
             const ruleName = user.displayRules.join(', ');
             const punishmentText = generatePunishmentTextForMessage(user, userInfo);
             return `considero que o **ID ${user.gameId}** praticou **${ruleName}**. Conforme o histórico, ${punishmentText}.`;
        });

         msgIntro += "\n\n" + punishmentMessages.join('\n\n');

        const { itemsData } = this.utils.calculateItemsValue(this.formData.selectedLogs, itemMapping, itemPrices);
        const itemsTextParaDevolucao = itemsData.map(item => `> ${item.itemCode} x${item.quantity}`).join('\n');
        const msgDevolucao = itemsTextParaDevolucao ? `Seus itens serão solicitados para devolução. Os itens são:\n${itemsTextParaDevolucao}` : '';
        const uniqueCds = [...new Set(this.formData.selectedLogs.map(s => s.text.match(/\[CDS\]:\s*(.*)/)?.[1].trim()).filter(Boolean))];
        const cdsText = uniqueCds.length > 0 ? `\`${uniqueCds.join('`\n`')}\`` : '`N/A`';
        const msgFinal = `\n\n**CDS DA REVISTA:**\n${cdsText}\n\nAgradecemos pela paciência e compreensão. Nosso compromisso é com a melhor experiência para nossos jogadores.\n\n-# Atenciosamente,\n-# **<@${loggedInUserInfo.id}>** - Equipe Bahamas.`;
        const messageSectionContent = `<div class="devolucao-toggle"><input type="checkbox" id="devolucao-check" ${itemsTextParaDevolucao ? '' : 'disabled'}><label for="devolucao-check">Vai ocorrer devolução?</label></div><pre id="message-preview-main">${msgIntro}</pre><div id="devolucao-msg-content-wrapper" style="display:none;"><pre id="devolucao-msg-content">${msgDevolucao}</pre></div><pre id="message-preview-final">${msgFinal}</pre>`;
        this.utils.createSection('Mensagem ao Denunciante', messageSectionContent, this.sectionsEl, { onCopy: this.utils.copyMessageContent });
        if (itemsTextParaDevolucao) {
            window.reportRenderer.renderDevolucaoReport(this, data, this.formData.reporterId, reporterDiscordId, itemsTextParaDevolucao);
        }
    }
}
window.LootIndevidoHandler = LootIndevidoHandler;