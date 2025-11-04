async function calculateChamadosStats(userId, startDate, endDate) {
    try {
        // CORREÇÃO: A URL agora inclui o 'userId' (que é o ID do Discord)
        // para garantir que estamos buscando o ID de jogo da pessoa certa,
        // seja na página de metas principal ou na de teste.
        const idResponse = await fetch(`/api/get-user-ingame-id?discord_id=${userId}`);
        
        if (idResponse.status === 404) {
            // Se não encontrar (404), informa que o ID precisa ser cadastrado
            return { chamadosRealizados: 0, needsId: true };
        }

        if (!idResponse.ok) {
            throw new Error('Falha ao buscar ID do jogo.');
        }

        const { in_game_id } = await idResponse.json();

        // 2. Se encontrou o ID, busca os logs de chamados
        const logResponse = await fetch('/api/get-chamados-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dates: [startDate.toISOString(), endDate.toISOString()],
                staff_id: in_game_id
            })
        });

        if (!logResponse.ok) {
            throw new Error('Falha ao buscar logs de chamados.');
        }

        const logText = await logResponse.text();
        
        // 3. Conta as ocorrências de "data: {"
        const count = (logText.match(/data: {/g) || []).length;
        
        return { chamadosRealizados: count, needsId: false };

    } catch (error) {
        console.error("Erro em calculateChamadosStats:", error);
        // Em caso de qualquer outro erro, exibe 0 e não pede o ID, para não bloquear o resto.
        return { chamadosRealizados: 0, needsId: false };
    }
}