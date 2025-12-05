import aiomysql
from config import DB_CONFIG
import asyncio
import json

pool = None

async def init_db_pool():
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
        
        # Cria a tabela de cache de chamados se não existir
        async with pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    CREATE TABLE IF NOT EXISTS chamados_cache (
                        staff_id VARCHAR(50),
                        date_ref DATE,
                        count INT,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (staff_id, date_ref)
                    )
                """)
        
        print("Pool de conexões e tabela de cache iniciados com sucesso.")
        return True
    except Exception as e:
        print(f"!!! ERRO CRÍTICO ao criar o pool de conexões: {e}")
        pool = None
        return False

async def add_report_to_db(message_id, user_id, ticket_id, report_type, jump_url, message_timestamp, details=None, staff_mencionado=None, tipo_relatorio=None):
    if not pool: return
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
                if cursor.rowcount > 0: print(f"  -> SUCESSO: 1 linha inserida.")
            except Exception as e: print(f"  -> ERRO MySQL: {e}")

async def link_user_ids(discord_id, in_game_id, username=None):
    if not pool: return
    sql = """
        INSERT INTO users (discord_id, in_game_id, last_known_username)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE in_game_id=VALUES(in_game_id), last_known_username=VALUES(last_known_username)
    """
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, (discord_id, in_game_id, username))

async def delete_reports_by_message_id(message_id):
    if not pool: return 0
    sql = "DELETE FROM reports WHERE message_id LIKE %s"
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, (f"{message_id}%",))
            return cursor.rowcount

# --- NOVAS FUNÇÕES PARA CHAMADOS ---

async def update_chamados_cache(staff_id, date_ref, count):
    if not pool: return
    sql = """
        INSERT INTO chamados_cache (staff_id, date_ref, count)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE count = VALUES(count)
    """
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(sql, (str(staff_id), date_ref, count))

async def get_chamados_from_cache(date_start, date_end):
    if not pool: return []
    # Soma todos os registros encontrados no range de datas para cada staff
    sql = "SELECT staff_id, SUM(count) as total FROM chamados_cache WHERE date_ref BETWEEN %s AND %s GROUP BY staff_id"
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(sql, (date_start, date_end))
            return await cursor.fetchall()