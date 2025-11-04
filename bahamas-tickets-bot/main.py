# bahamas-tickets-bot/main.py
import discord
from discord.ext import commands
import asyncio
from config import BOT_TOKEN, CHANNELS, GUILD_ID
from database import init_db_pool
from sync_logic import run_catchup_indexing, process_message, reprocess_message
from api import start_web_server

# --- Novas importações para os comandos de relatório ---
import pandas as pd
import io
from datetime import datetime, timedelta
import database # Importa o módulo database
import aiomysql # Importa aiomysql para usar DictCursor
import json # Para processar o campo staff_mencionado
from collections import defaultdict # Para facilitar a contagem
import re # Para extrair IDs da jump_url
import aiohttp # Para fazer requisições HTTP async
import os # Para pegar LOG_COOKIE do env
# --- Fim das novas importações ---

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.guilds = True
bot = commands.Bot(command_prefix="!", intents=intents)

initial_sync_complete = asyncio.Event()

# --- Carrega o LOG_COOKIE do ambiente ---
LOG_API_COOKIE = os.getenv("LOG_COOKIE")

@bot.event
async def on_ready():
    print(f"Bot logado como {bot.user}")
    print("Inicializando pool de conexões com o banco de dados...")

    db_ok = await init_db_pool()
    if not db_ok:
        print("!!! FALHA NA CONEXÃO COM O BANCO DE DADOS. O BOT NÃO VAI INICIAR CORRETAMENTE.")
        return

    print("Banco de dados pronto.")

    # Verifica se o LOG_COOKIE foi carregado
    if not LOG_API_COOKIE:
        print("!!! AVISO: LOG_COOKIE não encontrado no .env. O comando !gerar_relatorio_chamados pode falhar.")


    bot.loop.create_task(run_catchup_indexing(bot, initial_sync_complete))
    bot.loop.create_task(start_web_server(bot))

    print("API e Sincronização iniciadas em background.")

@bot.event
async def on_message(message):
    await bot.process_commands(message)
    if not initial_sync_complete.is_set(): return
    if message.author == bot.user or not message.guild or message.channel.id not in CHANNELS.values(): return
    if message.content.startswith(bot.command_prefix): return
    if await process_message(bot, message):
        print(f"Novo relatório no canal '{message.channel.name}' salvo no DB em tempo real.")

@bot.event
async def on_message_edit(before, after):
    if not initial_sync_complete.is_set(): return
    if after.author == bot.user or not after.guild or after.channel.id not in CHANNELS.values(): return
    if before.content == after.content or after.content.startswith(bot.command_prefix): return
    if await reprocess_message(bot, after):
        print(f"Relatório editado no canal '{after.channel.name}' (ID: {after.id}) foi atualizado no DB.")


# --- COMANDO GERAR RELATÓRIO DE ATIVIDADES (ADV/BAN/SS etc) ---
@bot.command(name='gerar_relatorio')
async def gerar_relatorio(ctx, data_inicio_str: str, data_fim_str: str):
    """
    Gera um relatório de atividades dos STAFFs com cargo específico em um período.
    Formato das datas: DD/MM/AAAA
    Exemplo: !gerar_relatorio 01/10/2025 21/10/2025
    """
    REQUIRED_ROLE_ID = 1057449425728974989 # Cargo "Obrigatório" que define quem entra no relatório
    FALLBACK_REPORT_TYPES = ['adv_applied', 'adv_removed', 'adv_reverted', 'ticket_denied']

    try:
        data_inicio = datetime.strptime(data_inicio_str, '%d/%m/%Y')
        data_fim = datetime.strptime(data_fim_str, '%d/%m/%Y') + timedelta(days=1, seconds=-1)
        data_inicio_sql = data_inicio.strftime('%Y-%m-%d %H:%M:%S')
        data_fim_sql = data_fim.strftime('%Y-%m-%d %H:%M:%S')
    except ValueError:
        await ctx.send("Formato de data inválido. Use DD/MM/AAAA.")
        return

    await ctx.send(f"Gerando relatório de atividades de {data_inicio_str} até {data_fim_str} para membros com o cargo ID {REQUIRED_ROLE_ID}. Buscando dados...")

    guild = bot.get_guild(GUILD_ID)
    if not guild:
        await ctx.send(f"Erro: Não foi possível encontrar o servidor com ID {GUILD_ID}.")
        return

    role = guild.get_role(REQUIRED_ROLE_ID)
    if not role:
        await ctx.send(f"Erro: Não foi possível encontrar o cargo com ID {REQUIRED_ROLE_ID} no servidor.")
        return

    members_with_role_ids = {str(member.id) for member in role.members}
    if not members_with_role_ids:
        await ctx.send(f"Aviso: Nenhum membro encontrado com o cargo '{role.name}'. O relatório estará vazio.")
        return

    sql = """
        SELECT r.message_id, r.jump_url, r.user_id, r.report_type, r.details, r.tipo_relatorio, r.staff_mencionado
        FROM reports r
        WHERE r.timestamp BETWEEN %s AND %s
        ORDER BY r.timestamp ASC
    """
    db_reports = []
    try:
        if not database.pool: await ctx.send("Erro: O bot não está conectado ao banco de dados."); return
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(sql, (data_inicio_sql, data_fim_sql))
                db_reports = await cursor.fetchall()
    except Exception as e:
        print(f"Erro ao executar a consulta do relatório: {e}"); await ctx.send(f"Ocorreu um erro ao buscar os dados no banco: {e}"); return
    if not db_reports: await ctx.send("Nenhum relatório de atividade encontrado para o período."); return

    staff_game_ids = {}
    ids_tuple = tuple(members_with_role_ids)
    sql_game_ids = "SELECT discord_id, in_game_id FROM users WHERE discord_id IN %s"
    try:
         async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(sql_game_ids, (ids_tuple,))
                results = await cursor.fetchall()
                for row in results: staff_game_ids[str(row['discord_id'])] = row['in_game_id']
    except Exception as e: print(f"Erro ao buscar IDs da cidade para staff: {e}")

    staff_stats = defaultdict(lambda: {'ID Discord': '', 'ID Cidade': '', 'Ticket Denúncia': 0, 'Tickets Revisão': 0, 'Denúncia Negada': 0, 'Revisão Negada': 0, 'SS Lupa': 0})
    message_cache = {}
    print(f"Processando {len(db_reports)} relatórios de atividade...")
    processed_count, skipped_fetch = 0, 0

    for report in db_reports:
        processed_count += 1
        if processed_count % 500 == 0: print(f"  ... {processed_count}/{len(db_reports)} processados (skips: {skipped_fetch})")

        involved_staff_ids_str, report_type, details, tipo_relatorio, db_message_id, jump_url = report.get('staff_mencionado'), report.get('report_type'), report.get('details'), report.get('tipo_relatorio'), report.get('message_id'), report.get('jump_url')
        actor_ids = set()
        valid_staff_mentioned = False

        if involved_staff_ids_str:
            try:
                loaded_ids = json.loads(involved_staff_ids_str); temp_ids = []
                if isinstance(loaded_ids, list): temp_ids = [str(id_val) for id_val in loaded_ids]
                elif isinstance(loaded_ids, (str, int)): temp_ids = [str(loaded_ids)]
                if temp_ids: actor_ids.update(temp_ids); valid_staff_mentioned = True
            except (json.JSONDecodeError, TypeError):
                temp_ids = [id_val.strip() for id_val in involved_staff_ids_str.replace('[','').replace(']','').replace('"','').split(',') if id_val.strip().isdigit()]
                if temp_ids: actor_ids.update(temp_ids); valid_staff_mentioned = True
            except Exception as e: print(f"Erro inesperado ao processar staff_mencionado '{involved_staff_ids_str}': {e}")

        if not valid_staff_mentioned and report_type in FALLBACK_REPORT_TYPES and db_message_id and jump_url:
            author_id = None; actual_message_id_str = str(db_message_id).split('-')[0]
            if actual_message_id_str.isdigit():
                actual_message_id = int(actual_message_id_str)
                if actual_message_id in message_cache: author_id = message_cache[actual_message_id]
                else:
                    match = re.search(r'/channels/\d+/(\d+)/(\d+)', jump_url)
                    if match:
                        channel_id = int(match.group(1))
                        try:
                            channel = bot.get_channel(channel_id) or await bot.fetch_channel(channel_id)
                            if channel: message = await channel.fetch_message(actual_message_id); author_id = str(message.author.id); message_cache[actual_message_id] = author_id
                            else: message_cache[actual_message_id] = None; skipped_fetch += 1
                        except (discord.NotFound, discord.Forbidden, Exception) as e: message_cache[actual_message_id] = None; skipped_fetch += 1
                    else: skipped_fetch += 1
            else: skipped_fetch += 1
            if author_id: actor_ids.add(author_id)

        for staff_id in actor_ids:
            if staff_id in members_with_role_ids:
                stats = staff_stats[staff_id]; stats['ID Discord'] = staff_id; stats['ID Cidade'] = staff_game_ids.get(staff_id, '')
                if report_type == 'adv_applied': stats['Ticket Denúncia'] += 1
                elif report_type in ('adv_removed', 'adv_reverted') and tipo_relatorio == 'RELATÓRIO REVISÃO-ACEITO': stats['Tickets Revisão'] += 1
                elif report_type == 'ticket_denied' and tipo_relatorio == 'TICKET-DENÚNCIA NEGADO': stats['Denúncia Negada'] += 1
                elif report_type == 'ticket_denied' and tipo_relatorio == 'TICKET-REVISÃO NEGADO': stats['Revisão Negada'] += 1
                elif report_type == 'ss_review': stats['SS Lupa'] += 1

    print(f"Processamento de atividades concluído. {skipped_fetch} buscas de autor puladas/falharam.")
    if not staff_stats: await ctx.send(f"Nenhuma atividade encontrada para membros com o cargo '{role.name}' no período."); return

    try:
        final_data = list(staff_stats.values()); df = pd.DataFrame(final_data)
        colunas_esperadas = ['ID Discord', 'ID Cidade', 'Ticket Denúncia', 'Tickets Revisão', 'Denúncia Negada', 'Revisão Negada', 'SS Lupa']
        for col in colunas_esperadas:
            if col not in df.columns: df[col] = 0
        df = df[colunas_esperadas]; df['ID Discord'] = df['ID Discord'].astype(str); df['ID Cidade'] = df['ID Cidade'].astype(str).replace('<NA>', '').replace('nan', '')
        output_buffer = io.BytesIO()
        with pd.ExcelWriter(output_buffer, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name='Relatorio_Staff')
        output_buffer.seek(0)
        nome_arquivo = f"relatorio_staff_{data_inicio_str.replace('/', '-')}_{data_fim_str.replace('/', '-')}.xlsx"
        arquivo_discord = discord.File(fp=output_buffer, filename=nome_arquivo)
        await ctx.send(f"Relatório de atividades para membros com o cargo '{role.name}' gerado!", file=arquivo_discord)
    except Exception as e: print(f"Erro ao gerar/enviar planilha de atividades: {e}"); await ctx.send(f"Erro ao gerar/enviar planilha: {e}")
# --- FIM DO COMANDO DE ATIVIDADES ---


# --- NOVO COMANDO GERAR RELATÓRIO DE CHAMADOS (COM BUSCA SEQUENCIAL) ---
@bot.command(name='gerar_relatorio_chamados')
async def gerar_relatorio_chamados(ctx, data_inicio_str: str, data_fim_str: str):
    """
    Gera um relatório de chamados atendidos pelos STAFFs com cargo específico em um período (busca sequencial).
    Formato das datas: DD/MM/AAAA
    Exemplo: !gerar_relatorio_chamados 01/10/2025 21/10/2025
    """
    REQUIRED_ROLE_ID = 1057449425728974989 # Cargo "Obrigatório"
    LOG_API_URL = "https://logs.fusionhost.com.br/getLogs"
    LOG_TYPE = "FEEDBACK-CHAMADOS"

    # --- Validação das Datas e Cookie ---
    if not LOG_API_COOKIE:
        await ctx.send("Erro: LOG_COOKIE não configurado no bot. Não é possível buscar os chamados.")
        return
    try:
        data_inicio = datetime.strptime(data_inicio_str, '%d/%m/%Y')
        data_fim = datetime.strptime(data_fim_str, '%d/%m/%Y') + timedelta(days=1, seconds=-1) # Inclui o dia final inteiro
        data_inicio_api = data_inicio.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        data_fim_api = data_fim.strftime('%Y-%m-%dT%H:%M:%S.999Z')
    except ValueError:
        await ctx.send("Formato de data inválido. Use DD/MM/AAAA.")
        return

    msg = await ctx.send(f"Gerando relatório de chamados de {data_inicio_str} até {data_fim_str} para membros com o cargo ID {REQUIRED_ROLE_ID}. Buscando dados...")

    # --- Busca Membros com o Cargo no Discord ---
    guild = bot.get_guild(GUILD_ID)
    if not guild: await msg.edit(content=f"Erro: Não foi possível encontrar o servidor com ID {GUILD_ID}."); return
    role = guild.get_role(REQUIRED_ROLE_ID)
    if not role: await msg.edit(content=f"Erro: Não foi possível encontrar o cargo com ID {REQUIRED_ROLE_ID}."); return

    members_with_role = {member.id: member.display_name for member in role.members}
    if not members_with_role: await msg.edit(content=f"Aviso: Nenhum membro encontrado com o cargo '{role.name}'."); return

    # --- Busca IDs da Cidade ---
    staff_data = {}
    discord_ids_tuple = tuple(members_with_role.keys())
    sql_game_ids = "SELECT discord_id, in_game_id FROM users WHERE discord_id IN %s"
    try:
        if not database.pool: await msg.edit(content="Erro: O bot não está conectado ao banco de dados."); return
        async with database.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(sql_game_ids, (discord_ids_tuple,))
                results = await cursor.fetchall()
                for row in results:
                    discord_id_str = str(row['discord_id'])
                    discord_id_int = int(discord_id_str)
                    if discord_id_int in members_with_role:
                         staff_data[discord_id_int] = {
                             'ID Discord': discord_id_str,
                             'ID Cidade': row['in_game_id'],
                             'Chamados': 0,
                             'Username': members_with_role[discord_id_int]
                         }
    except Exception as e:
        print(f"Erro ao buscar IDs da cidade para staff (chamados): {e}")
        await msg.edit(content=f"Erro ao buscar IDs da cidade: {e}")

    # --- Consulta a API de Logs SEQUENCIALMENTE ---
    total_members_to_process = len(staff_data)
    members_processed = 0
    print(f"Iniciando busca sequencial de chamados para {total_members_to_process} membros...")
    async with aiohttp.ClientSession(headers={'Cookie': LOG_API_COOKIE}) as session:
        # Itera sobre os membros COM ID da cidade
        for discord_id, data in staff_data.items():
            in_game_id = data.get('ID Cidade')
            members_processed += 1
            progress_text = f"Buscando chamados... [{members_processed}/{total_members_to_process}] Membro: {data.get('Username', discord_id)}"
            await msg.edit(content=progress_text) # Atualiza a mensagem no Discord

            if in_game_id:
                params = {
                    's': LOG_TYPE,
                    'dates[0]': data_inicio_api,
                    'dates[1]': data_fim_api,
                    'i': in_game_id
                }
                # Chama a função await para buscar e contar, esperando a conclusão
                result = await fetch_and_count_chamados(session, LOG_API_URL, params, discord_id, data)
                if result:
                     print(f"  [{members_processed}/{total_members_to_process}] Chamados para {data['Username']} ({discord_id}): {result['count']}")
                else:
                     print(f"  [{members_processed}/{total_members_to_process}] Falha ao buscar chamados para {data['Username']} ({discord_id}).")
                # Pequena pausa para evitar sobrecarregar a API (opcional, ajuste conforme necessário)
                await asyncio.sleep(0.1)
            else:
                print(f"  [{members_processed}/{total_members_to_process}] PULANDO: Membro {data['Username']} ({discord_id}) sem ID da cidade cadastrado.")

    await msg.edit(content=f"Busca de chamados concluída. Gerando planilha...")
    print("Busca sequencial de chamados concluída.")

    # --- Geração da Planilha ---
    final_data_list = list(staff_data.values())
    if not final_data_list: await msg.edit(content="Nenhum membro com ID da cidade encontrado para gerar o relatório."); return

    try:
        df = pd.DataFrame(final_data_list)
        colunas_planilha = ['ID Discord', 'ID Cidade', 'Username', 'Chamados']
        for col in colunas_planilha:
             if col not in df.columns: df[col] = '' if col == 'ID Cidade' else 0
        df = df[colunas_planilha]
        df['ID Discord'] = df['ID Discord'].astype(str)
        df['ID Cidade'] = df['ID Cidade'].astype(str).replace('<NA>', '').replace('nan', '')

        output_buffer = io.BytesIO()
        with pd.ExcelWriter(output_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Relatorio_Chamados')
        output_buffer.seek(0)

        nome_arquivo = f"relatorio_chamados_{data_inicio_str.replace('/', '-')}_{data_fim_str.replace('/', '-')}.xlsx"
        arquivo_discord = discord.File(fp=output_buffer, filename=nome_arquivo)

        await ctx.send(f"Relatório de chamados para membros com o cargo '{role.name}' gerado!", file=arquivo_discord)
        await msg.delete() # Apaga a mensagem de "Gerando..."

    except Exception as e:
        print(f"Erro ao gerar ou enviar a planilha de chamados: {e}")
        await msg.edit(content=f"Ocorreu um erro ao gerar ou enviar a planilha de chamados: {e}")

async def fetch_and_count_chamados(session, url, params, discord_id, data_dict):
    """Função auxiliar para buscar logs e contar chamados para um usuário."""
    try:
        async with session.get(url, params=params) as response:
            if response.status == 200:
                log_text = await response.text()
                count = log_text.count("data: {")
                data_dict['Chamados'] = count
                return {'discord_id': discord_id, 'count': count}
            else:
                print(f"Erro ao buscar chamados para ID {params.get('i')} (Discord: {discord_id}): Status {response.status}")
                return None
    except Exception as e:
        print(f"Exceção ao buscar chamados para ID {params.get('i')} (Discord: {discord_id}): {e}")
        return None
# --- FIM DO COMANDO DE CHAMADOS ---


if __name__ == "__main__":
    if not BOT_TOKEN:
        print("!!! ERRO: O token do Bot não foi encontrado. Verifique seu arquivo .env.")
    else:
        try:
            with open('requirements.txt', 'r+') as f:
                content = f.read()
                if 'aiohttp' not in content:
                    f.write('\naiohttp\n')
                    print("Adicionado 'aiohttp' ao requirements.txt")
                if 'openpyxl' not in content: # openpyxl é necessário para ExcelWriter
                    f.write('\nopenpyxl\n')
                    print("Adicionado 'openpyxl' ao requirements.txt")
        except FileNotFoundError:
             print("AVISO: requirements.txt não encontrado. Certifique-se de ter 'aiohttp' e 'openpyxl' instalados.")

        bot.run(BOT_TOKEN)