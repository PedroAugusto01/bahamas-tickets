import discord
from config import GUILD_ID, CHANNELS, PUNISHMENT_ROLES_IDS, role_cache, PARSERS_ENABLED
import database
from database import add_report_to_db, link_user_ids
from parsers import (
    aprovados_wl_parser, pagou_adv_parser, punições_parser,
    removidas_parser, ban_hack_parser, banidos_telagem_parser,
    tickets_negados_parser, denuncia_ss_parser, revisao_ss_parser,
    relatorio_spawn_parser, registro_suporte_parser, duvidas_parser
)
import asyncio
import aiomysql

PARSER_MAPPING = {
    CHANNELS['aprovados-wl']: aprovados_wl_parser,
    CHANNELS['punições']: punições_parser,
    CHANNELS['ban-hack']: ban_hack_parser,
    CHANNELS['banidos-telagem']: banidos_telagem_parser,
    CHANNELS['punições-removidas']: removidas_parser,
    CHANNELS['pagou-adv']: pagou_adv_parser,
    CHANNELS['tickets-negados']: tickets_negados_parser,
    CHANNELS['denuncia-ss']: denuncia_ss_parser,
    CHANNELS['revisao-ss']: revisao_ss_parser,
    CHANNELS['relatorio-spawn']: relatorio_spawn_parser,
    CHANNELS['registro-suporte']: registro_suporte_parser,
    CHANNELS['duvidas']: duvidas_parser,
}

async def get_role_name(guild, role_id):
    role_id = int(role_id)
    if role_id in role_cache: return role_cache[role_id]
    role = guild.get_role(role_id)
    if role: role_cache[role_id] = role.name; return role.name
    return str(role_id)

async def process_message(bot, message):
    # Encontra o nome do parser baseado no ID do canal
    channel_name = next((name for name, cid in CHANNELS.items() if cid == message.channel.id), None)
    
    # VERIFICA SE O PARSER ESTÁ ATIVO ANTES DE CONTINUAR
    if not channel_name or not PARSERS_ENABLED.get(channel_name, False):
        return False

    parser = PARSER_MAPPING.get(message.channel.id)
    if parser:
        try:
            result = await parser.parse(
                message,
                lambda message_id, user_id, ticket_id=None, report_type=None, jump_url=None, details=None, timestamp=None, staff_mencionado=None, tipo_relatorio=None: \
                    add_report_to_db(message_id, user_id, ticket_id, report_type, jump_url, timestamp or message.created_at, details, staff_mencionado, tipo_relatorio),
                link_user_ids,
                lambda role_id: get_role_name(message.guild, role_id)
            )
            return result
        except Exception as e:
            print(f"ERRO ao processar mensagem {message.id} com o parser para o canal {message.channel.name}: {e}")
            return False
    return False

async def run_catchup_indexing(bot, initial_sync_complete_flag):
    print("Iniciando verificação de mensagens perdidas (sincronização)...")
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        print(f"!!! ERRO: Guilda com ID {GUILD_ID} não encontrada.")
        return

    for role_id in PUNISHMENT_ROLES_IDS: await get_role_name(guild, role_id)

    for name, channel_id in CHANNELS.items():
        # VERIFICA SE O PARSER PARA ESTE CANAL ESTÁ ATIVO
        if not PARSERS_ENABLED.get(name, False):
            print(f"\nCanal '{name}' ignorado (desativado na config).")
            continue

        channel = guild.get_channel(channel_id)
        if not channel:
            print(f"\nAviso: Canal '{name}' com ID {channel_id} não encontrado.")
            continue

        async def get_last_message_id():
            async with database.pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    query = """
                        SELECT MAX(CAST(SUBSTRING_INDEX(message_id, '-', 1) AS UNSIGNED))
                        FROM reports
                        WHERE jump_url LIKE %s
                    """
                    await cursor.execute(query, (f"%/{channel_id}/%",))
                    result = await cursor.fetchone()
                    return result[0] if result and result[0] is not None else None

        last_known_id = await get_last_message_id()
        print(f"\nSincronizando canal: #{channel.name}")
        print(f"  -> Última mensagem salva no DB: {last_known_id or 'Nenhuma'}")

        messages_to_process = []
        if last_known_id:
            print("  -> Buscando mensagens mais recentes em blocos...")
            after_message = discord.Object(id=last_known_id)
            while True:
                try:
                    batch = [msg async for msg in channel.history(limit=500, after=after_message)]
                    if not batch: break
                    messages_to_process.extend(batch)
                    after_message = batch[-1]
                    print(f"  -> {len(messages_to_process)} novas mensagens encontradas...")
                except Exception as e:
                    print(f"  -> ERRO ao buscar histórico: {e}.")
                    break
        else:
            print("  -> Nenhuma mensagem no DB. Iniciando sincronização completa (pode demorar)...")
            async for message in channel.history(limit=50):
                messages_to_process.append(message)
                if len(messages_to_process) % 1000 == 0:
                    print(f"  -> {len(messages_to_process)} mensagens históricas lidas...")
            messages_to_process.reverse()

        if not messages_to_process:
            print("  -> Nenhuma mensagem nova para processar.")
            continue

        print(f"  -> Processando um total de {len(messages_to_process)} mensagens...")
        processed_count = 0
        for message in messages_to_process:
            if await process_message(bot, message):
                processed_count += 1
        print(f"  -> Sincronização do canal #{channel.name} concluída. {processed_count} relatórios salvos.")

    print("\n--- SINCRONIZAÇÃO INICIAL COMPLETA! HABILITANDO PROCESSAMENTO EM TEMPO REAL. ---")
    initial_sync_complete_flag.set()

async def reprocess_message(bot, message):
    """Deleta relatórios antigos e reprocessa uma mensagem editada."""
    print(f"Mensagem {message.id} foi editada. Iniciando reprocessamento...")
    
    # Deleta os registros antigos associados a esta mensagem
    await database.delete_reports_by_message_id(message.id)
    
    # Processa a mensagem com o conteúdo atualizado
    return await process_message(bot, message)