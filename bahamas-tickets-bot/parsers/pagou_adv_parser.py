import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    user_id = None
    ticket_id = None
    role_ids = []

    # Chaves padronizadas
    KEY_DISCORD_PLAYER = normalize_text("DISCORD DO PLAYER")
    KEY_PUNICAO_REMOVIDA = normalize_text("PUNIÇÃO REMOVIDA")

    lines = content.split('\n')
    for line in lines:
        normalized_line = normalize_text(line)

        if KEY_DISCORD_PLAYER in normalized_line:
            user_match = re.search(r'<@(\d+)>', line)
            if user_match:
                user_id = int(user_match.group(1))

        if KEY_PUNICAO_REMOVIDA in normalized_line:
            found_ids = re.findall(r'<@&(\d+)>', line)
            if found_ids:
                role_ids.extend(found_ids)

    if user_id and role_ids:
        details_string = str(role_ids)
        try:
            await add_report_func(
                message_id=message.id, 
                user_id=user_id, 
                ticket_id='',
                report_type='adv_paid', 
                jump_url=message.jump_url, 
                details=details_string
            )
            return True
        except Exception as e:
            print(f"[PAGOU-ADV PARSER] ERRO ao salvar msg {message.id}: {e}")
            return False
    else:
        return False