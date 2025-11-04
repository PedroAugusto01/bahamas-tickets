import aiomysql
from config import DB_CONFIG
import asyncio
import json

# Pool de conexões global
pool = None

async def init_db_pool():
    """Inicializa o pool de conexões com o banco de dados."""
    global pool
    try:
        pool = await aiomysql.create_pool(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            db=DB_CONFIG['database'],
            loop=asyncio.get_event_loop(),
            minsize=5,
            maxsize=30,
            pool_recycle=600,
            autocommit=True
        )
        print("Pool de conexões com o banco de dados (aiomysql) criado com sucesso.")
        return True
    except Exception as e:
        print(f"!!! ERRO CRÍTICO ao criar o pool de conexões com aiomysql: {e}")
        pool = None
        return False

async def add_report_to_db(message_id, user_id, ticket_id, report_type, jump_url, message_timestamp, details=None, staff_mencionado=None, tipo_relatorio=None):
    """Adiciona um relatório ao banco de dados de forma assíncrona."""
    if not pool:
        print("[DB LOG] ERRO: Pool de conexões não está disponível.")
        return

    # Converte a lista de staff para uma string JSON se for uma lista
    staff_json = json.dumps(staff_mencionado) if isinstance(staff_mencionado, list) else staff_mencionado

    sql = """
        INSERT IGNORE INTO reports (message_id, user_id, ticket_id, report_type, jump_url, details, `timestamp`, staff_mencionado, tipo_relatorio)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (str(message_id), user_id, ticket_id, report_type, jump_url, details, message_timestamp, staff_json, tipo_relatorio)
    
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            try:
                await cursor.execute(sql, values)
                if cursor.rowcount > 0:
                    print(f"  -> SUCESSO: 1 linha inserida na base de dados (aiomysql).")
                else:
                    print(f"  -> AVISO: Nenhuma linha inserida (INSERT IGNORE).")
            except Exception as e:
                print(f"  -> ERRO de MySQL (aiomysql): {e} | Dados: {values}")


async def link_user_ids(discord_id, in_game_id, username=None):
    """Vincula IDs de usuário de forma assíncrona."""
    if not pool: return

    sql = """
        INSERT INTO users (discord_id, in_game_id, last_known_username)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE in_game_id=VALUES(in_game_id), last_known_username=VALUES(last_known_username)
    """
    values = (discord_id, in_game_id, username)

    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, values)

async def delete_reports_by_message_id(message_id):
    """Exclui todos os relatórios associados a um message_id."""
    if not pool:
        print("[DB LOG] ERRO: Pool de conexões não está disponível.")
        return 0
    
    # A query SQL para deletar os registros
    sql = "DELETE FROM reports WHERE message_id LIKE %s"
    # Usamos LIKE para cobrir casos onde um ID de mensagem gera múltiplos relatórios (ex: message_id-0, message_id-1)
    pattern = f"{message_id}%"
    
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            try:
                await cursor.execute(sql, (pattern,))
                deleted_rows = cursor.rowcount
                if deleted_rows > 0:
                    print(f"  -> SUCESSO: {deleted_rows} registro(s) deletado(s) para a message_id {message_id}.")
                return deleted_rows
            except Exception as e:
                print(f"  -> ERRO de MySQL (aiomysql) ao deletar: {e} | message_id: {message_id}")
                return 0