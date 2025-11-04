import re

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    content = message.content
    tipo_relatorio = None

    if "RELATÓRIO BANIDO TELAGEM" in content:
        tipo_relatorio = "RELATÓRIO BANIDO TELAGEM"
    elif "RELATÓRIO BANIDO ATÉ FORMATAR" in content:
        tipo_relatorio = "RELATÓRIO BANIDO ATÉ FORMATAR"
    
    if not tipo_relatorio:
        return False

    users_found = re.findall(r"<@(\d+)>", content)
    if not users_found:
        return False

    staff_mencionado_id = str(message.author.id)
    details = "Banido por Telagem/Formatação"
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
            print(f"[BAN-TELAGEM PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return saved_count > 0