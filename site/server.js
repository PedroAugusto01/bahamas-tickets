const dotenv = require('dotenv');
if (process.env.NODE_ENV === 'development') {
    dotenv.config({ path: '.env.development' });
} else {
    dotenv.config();
}

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const {
    DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, REDIRECT_URI, SESSION_SECRET,
    BOT_API_URL, GUILD_ID, LOG_COOKIE, DISCORD_BOT_TOKEN, AUTHORIZED_ROLE_IDS
} = process.env;
const BOT_API_SECRET_KEY = "Amo_a_bebel_2";
const port = 3003;

if (!AUTHORIZED_ROLE_IDS || !DISCORD_BOT_TOKEN) {
    console.error("[ERRO CRÍTICO] Variáveis AUTHORIZED_ROLE_IDS ou DISCORD_BOT_TOKEN não definidas.");
    process.exit(1);
}

const authorizedRoles = AUTHORIZED_ROLE_IDS.split(',');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    store: new FileStore({ path: './sessions', ttl: 86400 * 14, retries: 0 }),
    secret: SESSION_SECRET, resave: false, saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 14 }
}));

const verifyAccessByBot = async (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const memberResponse = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${req.session.user.id}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
        });
        const hasPermission = memberResponse.data.roles.some(roleId => authorizedRoles.includes(roleId));
        if (hasPermission) next();
        else req.session.destroy(() => res.status(401).json({ error: 'Você não tem permissão.' }));
    } catch (error) {
        req.session.destroy(() => res.status(401).json({ error: 'Acesso revogado.' }));
    }
};

app.get('/login', (req, res) => {
    const scope = 'identify guilds';
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    res.redirect(discordAuthUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Erro: Código de autorização ausente.');
    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code',
            code, redirect_uri: REDIRECT_URI,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const { access_token } = tokenResponse.data;
        const userResponse = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${access_token}` } });
        const memberResponse = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userResponse.data.id}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
        });

        if (!memberResponse.data.roles.some(roleId => authorizedRoles.includes(roleId))) {
            return res.send("<h1>Acesso Negado</h1><p>Você não tem o cargo necessário.</p>");
        }
        req.session.user = {
            id: userResponse.data.id,
            username: memberResponse.data.nick || userResponse.data.global_name || userResponse.data.username,
            avatar: userResponse.data.avatar,
        };
        res.redirect('/denuncia/');
    } catch (error) {
        console.error("Erro na autenticação:", error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) return res.send("<h1>Acesso Negado</h1><p>Você precisa estar no servidor do Discord.</p>");
        res.redirect('/?error=auth_failed');
    }
});

app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

app.get('/api/user', verifyAccessByBot, (req, res) => {
    const { user } = req.session;
    const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    res.json({ id: user.id, username: user.username, avatarUrl });
});

app.get('/api/get-user-ingame-id', verifyAccessByBot, async (req, res) => {
    try {
        const discordIdToSearch = req.query.discord_id || req.session.user.id;
        const botApiUrl = (process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : 'http://bot:8081') + `/api/get-ingame-id?discord_id=${discordIdToSearch}`;
        const response = await axios.get(botApiUrl, { headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` } });
        res.json(response.data);
    } catch (error) {
        if (error.response && error.response.status === 404) return res.status(404).json({ error: "ID no jogo não cadastrado." });
        console.error("Erro ao buscar ID do jogo no bot:", error.message);
        res.status(500).json({ error: "Falha ao comunicar com a API do bot para buscar o ID." });
    }
});

app.post('/api/save-user-ingame-id', verifyAccessByBot, async (req, res) => {
    const { in_game_id, discord_id } = req.body;
    const discordIdToSave = discord_id || req.session.user.id;
    if (!in_game_id) return res.status(400).json({ error: "ID do jogo é obrigatório." });
    try {
        const botApiUrl = (process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : 'http://bot:8081') + '/api/link-ids';
        await axios.post(botApiUrl, { discord_id: discordIdToSave, in_game_id: in_game_id, username: req.session.user.username }, {
            headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` }
        });
        res.json({ success: true, message: "ID salvo com sucesso." });
    } catch (error) {
        console.error("Erro ao salvar ID do jogo no bot:", error.message);
        res.status(500).json({ error: "Falha ao comunicar com a API do bot para salvar o ID." });
    }
});

app.post('/api/get-chamados-logs', verifyAccessByBot, async (req, res) => {
    const { dates, staff_id } = req.body;
    if (!dates || !staff_id) return res.status(400).json({ error: "Datas e ID do staff são obrigatórios." });
    const logApiUrl = `https://logs.fusionhost.com.br/getLogs?s=FEEDBACK-CHAMADOS&dates[0]=${encodeURIComponent(dates[0])}&dates[1]=${encodeURIComponent(dates[1])}&i=${staff_id}`;
    try {
        const response = await axios.get(logApiUrl, { headers: { 'Cookie': LOG_COOKIE } });
        res.send(response.data);
    } catch (error) {
        console.error(`Erro ao buscar log de chamados:`, error.message);
        res.status(500).json({ error: `Falha ao buscar log de chamados` });
    }
});

app.post('/api/verificar-usuario', verifyAccessByBot, async (req, res) => {
    const { userId } = req.body;
    try {
        const botApiResponse = await axios.post(`${BOT_API_URL}`, { userId }, {
            headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` }
        });
        if (botApiResponse.data && !botApiResponse.data.error) {
            return res.json(botApiResponse.data);
        } else if (botApiResponse.data && botApiResponse.data.error) {
             return res.status(404).json(botApiResponse.data); // Keep status 404 for frontend check
        }
        throw new Error('Fallback_Trigger');
    } catch (error) {
        if (error.response && error.response.status === 404 && error.response.data && error.response.data.error) {
             return res.status(404).json(error.response.data);
        }
        console.error("Erro inicial na verificação ou fallback:", error.message);
        res.status(500).json({ error: "Erro interno ao verificar usuário." });
    }
});


app.get('/api/ticket-channels', verifyAccessByBot, async (req, res) => {
    try {
        const botChannelsUrl = BOT_API_URL.replace('/api/verify', '/api/get-ticket-channels');
        const response = await axios.get(botChannelsUrl, { headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` } });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Não foi possível buscar a lista de canais." });
    }
});

app.post('/api/get-logs', verifyAccessByBot, async (req, res) => {
    const { logType, dates, id, accusedId, startTimestamp, endTimestamp } = req.body;
    const baseUrl = "https://logs.fusionhost.com.br/getLogs";
    const params = new URLSearchParams({ s: logType });

    if (startTimestamp && endTimestamp) {
        params.append('dates[0]', startTimestamp);
        params.append('dates[1]', endTimestamp);
    } else if (dates && dates.length === 2) {
        params.append('dates[0]', dates[0]);
        params.append('dates[1]', dates[1]);
    } else {
        return res.status(400).json({ error: 'Intervalo de datas (dates ou timestamps) é obrigatório.' });
    }

    if (logType === 'MORTE' && id) params.append('i', id);
    if (logType === 'MATOU') {
        if (accusedId) params.append('i', accusedId); // Assassino
        if (id) params.append('a', id); // Vítima
    }
    if (logType === 'REVISTOU') {
        if (id) params.append('a', id); // Alvo da revista
        if (accusedId !== null) { // Permite busca sem accusedId se for null
             params.append('i', accusedId); // Revistador
        }
    }

    try {
        const response = await axios.get(`${baseUrl}?${params.toString()}`, { headers: { 'Cookie': LOG_COOKIE } });
        if (typeof response.data === 'string') {
            const jsonData = response.data.trim().split('\n\n')
                .map(line => line.replace(/^data: /, ''))
                .map(line => { try { return JSON.parse(line); } catch { return null; } })
                .filter(item => item && !Array.isArray(item));
            res.json({ data: jsonData });
        } else {
            res.json(response.data);
        }
    } catch (error) {
        console.error(`Erro ao buscar log ${logType}:`, error.message, `URL: ${baseUrl}?${params.toString()}`);
        res.status(500).json({ error: `Falha ao buscar log: ${logType}` });
    }
});


app.get('/api/item-prices', (req, res) => {
    const pricesPath = path.join(__dirname, 'item calculadora.json');
    if (fs.existsSync(pricesPath)) res.sendFile(pricesPath);
    else res.status(404).json({ error: 'Arquivo de preços não encontrado' });
});

// ########## SEÇÃO MODIFICADA ##########
// Altera o /api/item-mapping para ler o shared_items.lua
app.get('/api/item-mapping', (req, res) => {
    try {
        // 1. Define o caminho para o novo arquivo .lua
        const luaPath = path.join(__dirname, 'shared_items.lua');
        // 2. Lê o conteúdo do arquivo
        const lua = fs.readFileSync(luaPath, 'utf8');
        
        const map = {};
        // 3. Regex atualizada para o formato LUA: ['ITEM_CODE'] = { ... name = 'Item Name' ... }
        // Captura [1]: ITEM_CODE (ex: 'PACKAGE_WEAPON_SNSPISTOL_MK2')
        // Captura [2]: Item Name (ex: 'Pacote SNS Pistol MK2')
        const regex = /\[\s*'([A-Za-z0-9_\-]+)'\s*\]\s*=\s*\{[\s\S]*?name\s*=\s*'([^']+)'/g;
        let m;

        while ((m = regex.exec(lua)) !== null) {
            const itemCode = m[1].trim();
            const itemName = m[2].trim();
            
            // 4. Cria o mapa no formato esperado: { "item name em minúsculo": "ITEM_CODE" }
            map[itemName.toLowerCase()] = itemCode;
        }
        
        res.json(map);
    } catch (e) {
        // Adiciona um log de erro no console do servidor para debugging
        console.error("Erro ao processar shared_items.lua para /api/item-mapping:", e);
        res.status(500).json({ error: 'Erro interno ao gerar mapeamento de itens' });
    }
});
// ########## FIM DA SEÇÃO MODIFICADA ##########

app.get('/api/reports-data', verifyAccessByBot, async (req, res) => {
    try {
        const botApiUrl = (process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : 'http://bot:8081');
        const response = await axios.get(`${botApiUrl}/api/get-all-reports`, { headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` } });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Falha ao comunicar com a API do bot." });
    }
});

app.get('/api/get-user-by-discord-id', verifyAccessByBot, async (req, res) => {
    const { discord_id } = req.query; if (!discord_id) return res.status(400).json({ error: 'ID do Discord é obrigatório.' });
    try {
        const memberResponse = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discord_id}`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
        const userData = memberResponse.data;
        const user = {
            id: userData.user.id, username: userData.nick || userData.user.global_name || userData.user.username,
            avatarUrl: userData.user.avatar ? `https://cdn.discordapp.com/avatars/${userData.user.id}/${userData.user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
        };
        res.json(user);
    } catch (error) {
        if (error.response && error.response.status === 404) return res.status(404).json({ error: 'Usuário não encontrado no servidor.' });
        console.error("Erro ao buscar usuário pelo ID do Discord:", error.message);
        res.status(500).json({ error: "Falha ao buscar dados do usuário." });
    }
});

app.get('/api/get-hours-data', verifyAccessByBot, async (req, res) => {
    const { month } = req.query; const guildId = GUILD_ID; if (!month) return res.status(400).json({ error: "O parâmetro 'month' é obrigatório." });
    const monthNum = parseInt(month, 10); if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return res.status(400).json({ error: "O parâmetro 'month' deve ser um número entre 1 e 12." });
    const apiUrl = `https://search.fusiongroup.vip/api/hours/${guildId}/all?month=${monthNum}`;
    try {
        const response = await axios.get(apiUrl);
        if (response.data && response.data.success) res.json(response.data);
        else res.status(500).json({ error: "A API externa retornou um erro ou formato inesperado.", details: response.data });
    } catch (error) {
        console.error(`Erro ao buscar dados de horas da API externa:`, error.message);
        if (error.response) res.status(error.response.status).json({ error: `Falha ao buscar dados de horas da API externa (Status: ${error.response.status}).` });
        else res.status(500).json({ error: "Falha interna ao tentar buscar dados de horas." });
    }
});

app.get('/profile/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/profile/index.html')); });

app.get('/api/user-profile', verifyAccessByBot, async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.session.user.id; const guildId = GUILD_ID;
    try {
        const memberResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
        const memberData = memberResponse.data; const user = memberData.user;
        const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        const roleDetails = await Promise.all(memberData.roles.map(async (roleId) => {
             try {
                 const roleResponse = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
                 const role = roleResponse.data.find(r => r.id === roleId);
                 return { id: roleId, name: role ? role.name : 'Nome Desconhecido', color: role ? role.color : 0 };
             } catch (roleError) { console.warn(`Aviso: Falha ao buscar detalhes do cargo ${roleId}: ${roleError.message}`); return { id: roleId, name: 'Erro ao buscar nome', color: 0 }; }
        }));
        res.json({ id: userId, username: memberData.nick || user.global_name || user.username, avatarUrl: avatarUrl, roles: roleDetails });
    } catch (error) {
        console.error("Erro ao buscar detalhes do membro:", error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) {
            const fallbackAvatar = req.session.user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${req.session.user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
            res.json({ id: userId, username: req.session.user.username || 'Usuário Desconhecido', avatarUrl: fallbackAvatar, roles: [] });
        } else { res.status(500).json({ error: "Falha ao buscar dados do perfil." }); }
    }
});

app.get('/api/get-org-data', verifyAccessByBot, async (req, res) => {
    try {
        // Define o URL da API do bot (considerando o ambiente)
        const botApiHost = (process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : 'http://bot:8081');
        const botApiUrl = `${botApiHost}/api/get-org-chart`;

        const response = await axios.get(botApiUrl, { 
            headers: { 'Authorization': `Bearer ${BOT_API_SECRET_KEY}` } 
        });

        // Apenas repassa a resposta do bot (que é a lista de membros)
        res.json(response.data);

    } catch (error) {
        console.error("Erro ao buscar dados do organograma no bot:", error.message);
        res.status(500).json({ error: "Falha ao comunicar com a API do bot para buscar o organograma." });
    }
});

app.get('/denuncia/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/denuncia/index.html')); });
app.get('/relatorio/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/relatorio/index.html')); });
app.get('/calculadora/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/calculadora/index.html')); });
app.get('/metas/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/metas/index.html')); });
app.get('/metas/teste', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/metas/metas_teste.html')); });
app.get('/fluxograma/', verifyAccessByBot, (req, res) => { res.sendFile(path.join(__dirname, 'public/fluxograma/index.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public/index.html')); });

app.listen(port, () => { console.log(`[LOG] Site iniciado e a rodar em http://localhost:${port}`); });