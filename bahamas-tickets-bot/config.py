import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env para o ambiente de execução
load_dotenv()

# --- CONFIGURAÇÕES GERAIS ---
BOT_TOKEN = os.getenv("BOT_TOKEN")
GUILD_ID = 1029541397835022346
SECRET_KEY = "Amo_a_bebel_2"

# --- BANCO DE DADOS ---
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASS"),
    'database': os.getenv("DB_NAME")
}

# --- CANAIS E CARGOS ---
CHANNELS = {
    'punições': 1404338257734664222, #OK
    'punições-removidas': 1404338906312478871, #OK
    'ban-hack': 1404340288599887992, #OK
    'banidos-telagem': 0, 
    'aprovados-wl': 1404586815624839289, #OK
    'pagou-adv': 1404340640220975134, #OK
    'tickets-negados': 1404339539794989167, #OK
    'denuncia-ss': 0,
    'revisao-ss': 0,
    'relatorio-spawn': 1404337954998059018, #OK
    'registro-suporte': 1404466529533431828, #OK
    'duvidas': 1404335963177488488, #OK
}

# --- CONTROLE DE PARSERS ---
PARSERS_ENABLED = {
    'punições': True,
    'punições-removidas': True,
    'ban-hack': True,
    'banidos-telagem': True,
    'aprovados-wl': True,
    'pagou-adv': True,
    'tickets-negados': True,
    'denuncia-ss': True,
    'revisao-ss': True,
    'relatorio-spawn': True,
    'registro-suporte': True,
    'duvidas': True,
}

# IDs dos cargos relacionados a punições
PUNISHMENT_ROLES_IDS = [
    1345132098394132481, # Banido ok
    0, # Banido Telagem
    1345133156361179208, # Advertencia verbal ok
    1345132696854073486, # Advertencia 1 ok
    1345132420306833580, # Advertencia 2 ok
    1430743561845866557, # SS-ALERTA ok
    1345134004260569190, # CITIZEN-ATENÇÃO ok
    1351597668404822106  # SS-ATENÇÃO
]

# Cache de cargos para evitar chamadas repetidas à API do Discord
role_cache = {}