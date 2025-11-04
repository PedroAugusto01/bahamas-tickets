// Tickets/site/public/denuncia/steps/step4-summary/config.js
(function() {
    // Evita a recriação do objeto se o script for carregado mais de uma vez
    if (window.step4Config) return;

    // Objeto global para armazenar as configurações do Passo 4
    window.step4Config = {
        /**
         * Mapeamento de nomes de punição para os IDs de cargo do Discord.
         */
        advRoleIds: {
            banido: '1345132098394132481',
            verbal: '1345133156361179208',
            adv1: '1345132696854073486',
            adv2: '1345132420306833580',
        },

        /**
         * Mapeamento dos tempos de prisão (em meses) para cada nível de punição.
         */
        punishmentPrisonTimes: {
            verbal: 150,
            adv1: 300,
            adv2: 500,
            banido: 0 // Banimento não tem tempo de prisão em meses
        },

        /**
         * Modelos de relatório.
         */
        reportTemplates: {
            single: `## ** :white_check_mark: DENUNCIA ACEITA :white_check_mark: **

**DISCORD:** <@{discordId}> **//** \`{userId}\`
**TICKET:** \`{ticketNumber}\`
**PUNIÇÃO/BAN:** {punicaoMulta}
**STAFF QUE JULGOU:** <@{staffId}>
**MOTIVO:** \`{motivo}\`
**PROVAS:** {provas}{lootSection}`,
            multiple: `## ** :white_check_mark: DENUNCIA ACEITA :white_check_mark: **

{reportBlocks}

**TICKET:** {ticketNumber}
**STAFF QUE JULGOU:** <@{staffId}>
**PROVAS:** {provas}`,
            punishedBlock: `**DISCORD:** <@{discordId}> **//** \`{userId}\`
**PUNIÇÃO/BAN:** {punicaoMulta}
**MOTIVO:** \`{motivo}\`{lootSection}`,
            devolution: `\`\`\`📦 SOLICITAR PENDÊNCIA 📦\`\`\`
**ID:** {userId} | <@{discordId}>
**ITENS:** 
{itens}
**MOTIVO:** {motivo}
**TICKET:** {ticketNumber}
**PROVAS:** {provas}`
        }
    };
})();