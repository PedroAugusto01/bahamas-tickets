// cpx-tickets/site/public/metas/tickets.js

function calculateTicketsStats(userId, reportsData, startDate, endDate) {
    let ticketsDenunciaAceitos = 0;
    let ticketsDenunciaNegados = 0;
    let ticketsRevisaoAceitos = 0;
    let ticketsRevisaoNegados = 0;
    
    // Novos contadores
    let ticketsBug = 0;
    let ticketsSuporte = 0;

    // Garante que a data final inclui o dia inteiro
    endDate.setHours(23, 59, 59, 999);

    reportsData.forEach(report => {
        const reportDate = new Date(report.timestamp);

        // APLICA O FILTRO DE DATA
        if (reportDate < startDate || reportDate > endDate) {
            return;
        }

        let staffIds = [];
        try {
            if (report.staff_mencionado) {
                staffIds = JSON.parse(report.staff_mencionado);
                if (!Array.isArray(staffIds)) staffIds = [String(staffIds)];
            }
        } catch (e) {
            staffIds = String(report.staff_mencionado).replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(id => id);
        }

        const isStaffInvolved = staffIds.includes(userId);

        if (!isStaffInvolved) {
            return;
        }

        // --- LÓGICA DE CONTAGEM ---

        // DENÚNCIA ACEITA
        if (report.report_type === 'adv_applied') {
            ticketsDenunciaAceitos++;
        }
        // DENÚNCIA NEGADA
        if (report.report_type === 'ticket_denied' && report.tipo_relatorio === 'TICKET-DENÚNCIA NEGADO') {
            ticketsDenunciaNegados++;
        }
        // REVISÃO ACEITA
        if (report.tipo_relatorio === 'RELATÓRIO REVISÃO-ACEITA') {
            ticketsRevisaoAceitos++;
        }
        // REVISÃO NEGADA
        if (report.report_type === 'ticket_denied' && report.tipo_relatorio === 'TICKET-REVISÃO NEGADO') {
            ticketsRevisaoNegados++;
        }
        
        // NOVOS TIPOS
        if (report.report_type === 'ticket_bug') {
            ticketsBug++;
        }
        if (report.report_type === 'ticket_support') {
            ticketsSuporte++;
        }
    });

    return { 
        ticketsDenunciaAceitos, 
        ticketsDenunciaNegados, 
        ticketsRevisaoAceitos, 
        ticketsRevisaoNegados,
        ticketsBug,      // Novo retorno
        ticketsSuporte   // Novo retorno
    };
}