import re
import discord

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    if not message.embeds:
        return False

    description = message.embeds[0].description

    match_discord_id = re.search(r"\**\s*discord id\s*:\**\s*(\d{17,})", description, re.IGNORECASE)
    if not match_discord_id:
        match_discord_id = re.search(r"(\d{17,})", description)

    match_game_id = re.search(r"\**\s*id no jogo\s*:\**\s*(\d+)", description, re.IGNORECASE)
    
    if match_discord_id and match_game_id:
        try:
            user_id = int(match_discord_id.group(1))
            game_id = int(match_game_id.group(1))
            details = f"ID Jogo: {game_id}"
            
            username = None
            try:
                member = await message.guild.fetch_member(user_id)
                username = member.name
            except discord.NotFound:
                print(f"AVISO (WL Parser): Não foi possível encontrar o membro com ID {user_id} no servidor.")
            except Exception as e:
                print(f"ERRO (WL Parser): Erro ao buscar membro {user_id}: {e}")
            
            await link_user_ids_func(user_id, game_id, username)
            await add_report_func(
                message_id=message.id,
                user_id=user_id,
                ticket_id=None,
                report_type='wl_approved',
                jump_url=message.jump_url,
                details=details
            )
            return True
        except Exception as e:
            print(f"[WL PARSER] ERRO ao salvar relatório para msg {message.id}: {e}")

    return False