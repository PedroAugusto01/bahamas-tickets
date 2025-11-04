import re
from .parser_utils import normalize_text

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    users_found = []

    KEY_DISCORD_PLAYER = normalize_text("DISCORD")

    lines = content.split('\n')
    for line in lines:
        normalized_line = normalize_text(line)

        if KEY_DISCORD_PLAYER in normalized_line:
            user_match = re.search(r'<@(\d+)>', line)
            if user_match:
                users_found.append(int(user_match.group(1)))
    
    if not users_found:
        return False

    tipo_relatorio = "RELATÓRIO BAN-HACK"
    staff_mencionado_id = str(message.author.id)
    details = "Banido por Hack"
    saved_count = 0

    for user_id_str in users_found:
        try:
            user_id = int(user_id_str)
            await add_report_func(
                message_id=f"{message.id}-{saved_count}",
                user_id=user_id,
                report_type='ban_applied',
                jump_url=message.jump_url,
                details=details,
                staff_mencionado=[staff_mencionado_id],
                tipo_relatorio=tipo_relatorio
            )
            saved_count += 1
        except Exception as e:
            print(f"[BAN-HACK PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return saved_count > 0