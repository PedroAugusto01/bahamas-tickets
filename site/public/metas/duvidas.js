function calculateDuvidasStats(userId, reportsData, startDate, endDate) {
    let duvidasRespondidas = 0;

    // Garante que a data final inclui o dia inteiro
    endDate.setHours(23, 59, 59, 999);

    const duvidasReports = reportsData.filter(r => r.tipo_relatorio === 'Dúvida');

    duvidasReports.forEach(report => {
        const reportDate = new Date(report.timestamp);

        // APLICA O FILTRO DE DATA
        if (reportDate < startDate || reportDate > endDate) {
            return;
        }

        // CORREÇÃO: Utiliza a mesma lógica dos outros cálculos para verificar o staff
        let staffIds = [];
        if (report.staff_mencionado) {
            try {
                // Tenta interpretar o campo como um JSON array (ex: ["12345"])
                staffIds = JSON.parse(report.staff_mencionado);
                if (!Array.isArray(staffIds)) staffIds = [String(staffIds)];
            } catch (e) {
                // Se falhar, trata como uma string simples ou lista de strings (ex: "12345" ou "[12345, 67890]")
                staffIds = String(report.staff_mencionado).replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(id => id);
            }
        }

        // Verifica se o ID do usuário está na lista de staff que participou da ação
        const isStaffInvolved = staffIds.includes(String(userId));

        if (isStaffInvolved) {
            duvidasRespondidas++;
        }
    });

    return { duvidasRespondidas };
}