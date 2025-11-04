function calculateDevolucaoStats(userId, reportsData, startDate, endDate) {
    let devolucoesRealizadas = 0;

    endDate.setHours(23, 59, 59, 999);

    const devolucaoReports = reportsData.filter(r => r.tipo_relatorio === 'RELATÓRIO SPAWN');

    devolucaoReports.forEach(report => {
        const reportDate = new Date(report.timestamp);

        if (reportDate < startDate || reportDate > endDate) {
            return;
        }

        let staffIds = [];
        if (report.staff_mencionado) {
            try {
                staffIds = JSON.parse(report.staff_mencionado);
                if (!Array.isArray(staffIds)) staffIds = [String(staffIds)];
            } catch (e) {
                staffIds = String(report.staff_mencionado).replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(id => id);
            }
        }

        const isStaffInvolved = staffIds.includes(String(userId)) || String(report.user_id) === String(userId);

        if (isStaffInvolved) {
            devolucoesRealizadas++;
        }
    });

    return { devolucoesRealizadas };
}