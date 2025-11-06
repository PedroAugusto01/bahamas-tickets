(function() {
    if (window.step4Config) return;

    window.step4Config = {
        advRoleIds: {
            banido: '1345132098394132481',
            verbal: '1345133156361179208',
            adv1: '1345132696854073486',
            adv2: '1345132420306833580',
        },

        punishmentPrisonTimes: {
            verbal: 150,
            adv1: 300,
            adv2: 500,
            banido: 0 
        },

        punishmentFines: {
            verbal: "R$ 300.000,00",
            adv1: "R$ 600.000,00",
            adv2: "R$ 600.000,00",
            banido: null
        },

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