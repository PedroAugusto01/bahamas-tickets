function calculateAtendimentoStats(userId, reportsData, startDate, endDate) {
    let atendimentoRealizado = 0;
    let auxilioRealizado = 0;

    // Garante que a data final inclui o dia inteiro
    endDate.setHours(23, 59, 59, 999);

    const supportReports = reportsData.filter(r => r.tipo_relatorio === 'REGISTRO SUPORTE');

    supportReports.forEach(report => {
        const reportDate = new Date(report.timestamp);

        // FILTRO DE DATA ADICIONADO AQUI
        if (reportDate < startDate || reportDate > endDate) {
            return;
        }

        if (report.staff_mencionado) {
            let staffIds = [];
            try {
                staffIds = JSON.parse(report.staff_mencionado);
                if (!Array.isArray(staffIds)) staffIds = [String(staffIds)];
            } catch (e) {
                staffIds = String(report.staff_mencionado).replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(id => id);
            }

            if (staffIds.length === 0) return;

            // O primeiro da lista é quem atendeu
            if (staffIds[0] === userId) {
                atendimentoRealizado++;
            }
            // O segundo (se existir) é quem auxiliou
            if (staffIds.length > 1 && staffIds[1] === userId) {
                auxilioRealizado++;
            }
        }
    });

    return { atendimentoRealizado, auxilioRealizado };
}