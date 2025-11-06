from aiohttp import web
import ast
from collections import defaultdict
import discord
import re
from config import GUILD_ID, PUNISHMENT_ROLES_IDS, SECRET_KEY
import database
import aiomysql
from datetime import datetime

ROLE_ID_TO_NAME_MAP = {
    "1345133156361179208": "SERVIDOR・Advertência verbal", "1345132696854073486": "SERVIDOR・Advertência¹",
    "1345132420306833580": "SERVIDOR・Advertência²", "1345132098394132481": "SERVIDOR・Banido",
    "0": "TELAGEM・Banido", "1430743561845866557": "SS-ALERTA",
    "1345134004260569190": "CITIZEN-ATENÇÃO", "1351597668404822106": "SS-ATENÇÃO"
}

def create_error_report(error_message, discord_id=None, found_in_db=False):
    user_info = {"name": "Erro", "avatar_url": "https://cdn.discordapp.com/embed/avatars/0.png"}
    if discord_id: user_info["name"] = f"ID: {discord_id}"
    return {"error": error_message, "user_info": user_info, "current_punishments": [], "full_history": [], "recommendation": None, "found_in_db": found_in_db}

async def generate_user_report(bot, search_term):
    guild = bot.get_guild(GUILD_ID)
    if not guild: return create_error_report("Servidor não encontrado pelo bot")

    async def get_discord_id_from_game_id(game_id):
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT discord_id, last_known_username FROM users WHERE in_game_id = %s", (game_id,))
                return await cursor.fetchone()

    async def get_reports(discord_id):
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT message_id, report_type, jump_url, details, `timestamp`, ticket_id FROM reports WHERE user_id = %s ORDER BY `timestamp` ASC", (discord_id,))
                return await cursor.fetchall()

    if not search_term.isdigit():
        return create_error_report("Formato de ID inválido. Por favor, insira apenas números.")

    _discord_id = None
    _username_from_db = None
    found_in_db = False

    if len(search_term) > 15:
        _discord_id = int(search_term)
    else:
        db_result = await get_discord_id_from_game_id(int(search_term))
        if db_result:
            _discord_id = db_result['discord_id']
            _username_from_db = db_result['last_known_username']
            found_in_db = True
        else:
            return create_error_report(f"O ID de jogo '{search_term}' não foi encontrado ou não está vinculado a uma conta do Discord.")

    if not _discord_id:
         return create_error_report(f"Não foi possível determinar o ID do Discord para '{search_term}'.")

    rows = await get_reports(_discord_id)
    discord_id = _discord_id

    usuario = None
    current_roles_from_discord = []
    current_role_ids_from_discord = []
    user_info = {"id": str(discord_id), "name": "Usuário não encontrado no servidor", "avatar_url": "https://cdn.discordapp.com/embed/avatars/0.png"}

    try:
        usuario = await guild.fetch_member(discord_id)
        if usuario:
            user_punishment_roles = [role for role in usuario.roles if role.id in PUNISHMENT_ROLES_IDS]
            current_roles_from_discord = [role.name for role in user_punishment_roles]
            current_role_ids_from_discord = [str(role.id) for role in user_punishment_roles]
            user_info["name"] = usuario.display_name
            user_info["avatar_url"] = str(usuario.display_avatar.url)
    except discord.NotFound:
         if found_in_db and _username_from_db:
             user_info["name"] = f"{_username_from_db} (Fora do Discord)"
         elif found_in_db:
             user_info["name"] = f"ID DB: {discord_id} (Fora do Discord)"

    except ValueError:
        return create_error_report("ID do Discord inválido.", discord_id=discord_id, found_in_db=found_in_db)

    full_history = []
    EVENT_TYPE_MAP = {
        'wl_approved': '✅ Aprovação WL', 'adv_applied': '📝 Punição Aplicada',
        'ban_applied': '🚫 BAN Aplicado', 'adv_removed': '🗑️ Punição Removida',
        'adv_paid': '💸 Punição Paga', 'ban_removed': '✅ BAN Removido',
        'adv_reverted': '🔄 Punição Revertida', 'spawn_report': '📦 Devolução (Spawn)',
        'support_log': '🎧 Registro de Suporte', 'question': '❓ Dúvida Respondida',
        'ss_review': '🖥️ Revisão de SS', 'ss_request': '📢 Solicitação de SS',
        'ticket_denied': '❌ Ticket Negado'
    }

    active_punishments_by_id = defaultdict(int)
    seen_punishments_in_ticket = defaultdict(set)

    for row in rows:
        report_type, details, timestamp, url, ticket_id = row['report_type'], row['details'], row['timestamp'], row['jump_url'], row['ticket_id']
        is_duplicate = False
        role_ids_in_entry = []
        reversion_data = {}

        if report_type in ['adv_applied', 'ban_applied', 'adv_removed', 'adv_paid', 'ban_removed', 'adv_reverted']:
            try:
                evaluated = ast.literal_eval(details)
                if report_type == 'adv_reverted':
                    reversion_data = evaluated
                elif isinstance(evaluated, list):
                    role_ids_in_entry = [str(item) for item in evaluated]
            except (ValueError, SyntaxError): pass

        if report_type in ['adv_applied', 'ban_applied'] and ticket_id:
            punishment_key = tuple(sorted(role_ids_in_entry))
            if punishment_key in seen_punishments_in_ticket[ticket_id]:
                is_duplicate = True
            else:
                seen_punishments_in_ticket[ticket_id].add(punishment_key)

        if not is_duplicate:
            if report_type in ['adv_applied', 'ban_applied']:
                for role_id in role_ids_in_entry: active_punishments_by_id[role_id] += 1
            elif report_type in ['adv_removed', 'adv_paid', 'ban_removed']:
                for role_id in role_ids_in_entry: active_punishments_by_id[role_id] = 0
            elif report_type == 'adv_reverted':
                for role_id in reversion_data.get('removida', []): active_punishments_by_id[str(role_id)] = 0
                for role_id in reversion_data.get('revertida', []): active_punishments_by_id[str(role_id)] += 1

        entry = {
            "type": EVENT_TYPE_MAP.get(report_type, report_type.replace('_', ' ').title()),
            "date": timestamp.strftime("%d/%m/%Y às %H:%M"), "url": url,
            "is_duplicate": is_duplicate, "details_text": ""
        }

        if report_type == 'adv_reverted':
            removed = [ROLE_ID_TO_NAME_MAP.get(str(rid), str(rid)) for rid in reversion_data.get('removida', [])]
            reverted = [ROLE_ID_TO_NAME_MAP.get(str(rid), str(rid)) for rid in reversion_data.get('revertida', [])]
            entry["details_text"] = f"Removido: {', '.join(removed)} -> Revertido para: {', '.join(reverted)}"
        elif role_ids_in_entry:
            names = [ROLE_ID_TO_NAME_MAP.get(rid, rid) for rid in role_ids_in_entry]
            entry["details_text"] = ", ".join(names)
        else: entry["details_text"] = details

        full_history.append(entry)

    active_punishment_ids = [role_id for role_id, count in active_punishments_by_id.items() if count > 0]
    active_punishments_from_history = [ROLE_ID_TO_NAME_MAP.get(role_id, role_id) for role_id in active_punishment_ids]
    full_history.reverse()

    return {
        "user_info": user_info,
        "current_roles_from_discord": current_roles_from_discord,
        "current_role_ids_from_discord": current_role_ids_from_discord,
        "active_punishments_from_history": active_punishments_from_history,
        "active_punishment_ids_from_history": active_punishment_ids,
        "full_history": full_history,
        "found_in_db": found_in_db,
        "is_in_guild": usuario is not None
    }

async def handle_verification_request(request):
    bot = request.app['bot']
    if request.headers.get("Authorization") != f"Bearer {SECRET_KEY}": return web.json_response({"error": "Não autorizado"}, status=401)
    search_term = request.query.get('user_id') or (await request.json()).get('userId')
    if not search_term: return web.json_response(create_error_report("Termo de busca (user_id/userId) é obrigatório"), status=400)
    try:
        report_data = await generate_user_report(bot, search_term)
        status_code = 404 if "error" in report_data and "não foi encontrado" in report_data["error"] else 200
        return web.json_response(report_data, status=status_code)
    except Exception as e:
        print(f"!!! ERRO INTERNO GRAVE NO BOT: {e}")
        return web.json_response(create_error_report("Ocorreu um erro interno no bot ao gerar o relatório."), status=500)

async def get_ticket_channels(request):
    bot = request.app['bot']
    TICKET_CATEGORY_ID = 1403856121726505060
    guild = bot.get_guild(GUILD_ID)
    if not guild: return web.json_response({"error": "Guilda não encontrada pelo bot"}, status=500)
    category = guild.get_channel(TICKET_CATEGORY_ID)
    if not category or not isinstance(category, discord.CategoryChannel): return web.json_response({"error": f"Categoria de ticket com ID {TICKET_CATEGORY_ID} não encontrada."}, status=404)
    ticket_channels = [{"id": str(channel.id), "name": channel.name} for channel in category.text_channels if re.search(r'-\d+$', channel.name)]
    ticket_channels.sort(key=lambda x: x['name'])
    return web.json_response(ticket_channels)

async def handle_link_ids_request(request):
    if request.headers.get("Authorization") != f"Bearer {SECRET_KEY}": return web.json_response({"error": "Não autorizado"}, status=401)
    try:
        data = await request.json()
        discord_id = data.get('discord_id'); in_game_id = data.get('in_game_id'); username = data.get('username')
        if not discord_id or not in_game_id: return web.json_response({"error": "discord_id e in_game_id são obrigatórios"}, status=400)
        print(f"[API] Recebida solicitação para vincular ID Discord {discord_id} com ID Jogo {in_game_id}")
        await database.link_user_ids(discord_id, in_game_id, username)
        return web.json_response({"status": "ok", "message": "IDs vinculados com sucesso."}, status=200)
    except Exception as e:
        print(f"!!! ERRO na API /api/link-ids: {e}"); return web.json_response({"error": "Erro interno ao tentar vincular IDs."}, status=500)

async def get_all_reports(request):
    if request.headers.get("Authorization") != f"Bearer {SECRET_KEY}": return web.json_response({"error": "Não autorizado"}, status=401)
    try:
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT user_id, report_type, tipo_relatorio, staff_mencionado, timestamp FROM reports")
                reports = await cursor.fetchall()
                for report in reports:
                    if 'timestamp' in report and isinstance(report['timestamp'], datetime): report['timestamp'] = report['timestamp'].isoformat()
                return web.json_response(reports)
    except Exception as e:
        print(f"!!! ERRO na API /api/get-all-reports: {e}"); return web.json_response({"error": "Erro interno ao buscar relatórios."}, status=500)

async def get_ingame_id(request):
    if request.headers.get("Authorization") != f"Bearer {SECRET_KEY}": return web.json_response({"error": "Não autorizado"}, status=401)
    discord_id = request.query.get('discord_id')
    if not discord_id: return web.json_response({"error": "discord_id é obrigatório"}, status=400)
    try:
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute("SELECT in_game_id FROM users WHERE discord_id = %s", (discord_id,))
                result = await cursor.fetchone()
                if result and result.get('in_game_id'): return web.json_response({"in_game_id": result['in_game_id']})
                else: return web.json_response({"error": "ID não encontrado"}, status=404)
    except Exception as e:
        print(f"!!! ERRO na API /api/get-ingame-id: {e}"); return web.json_response({"error": "Erro interno ao buscar ID."}, status=500)

async def start_web_server(bot):
    app = web.Application(); app['bot'] = bot
    app.router.add_get('/api/verify', handle_verification_request)
    app.router.add_post('/api/verify', handle_verification_request)
    app.router.add_get('/api/get-ticket-channels', get_ticket_channels)
    app.router.add_post('/api/link-ids', handle_link_ids_request)
    app.router.add_get('/api/get-all-reports', get_all_reports)
    app.router.add_get('/api/get-ingame-id', get_ingame_id)
    runner = web.AppRunner(app); await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8081); await site.start()
    print("API do Bot iniciada em http://0.0.0.0:8081.")