import re
import discord

async def parse(message, add_report_func, link_user_ids_func, get_role_name_func):
    if not message.embeds:
        return False

    embed = message.embeds[0]
    user_id = None
    game_id = None

    # --- ESTRATÉGIA 1: Buscar nos Campos (Fields) ---
    if embed.fields:
        for field in embed.fields:
            field_name = field.name.lower()
            field_value = field.value
            
            # 1. Procurar ID do Discord no campo "Membro"
            if "membro" in field_name:
                match_discord = re.search(r"(\d{17,19})", field_value)
                if match_discord:
                    user_id = int(match_discord.group(1))

            # 2. Procurar ID do Jogo no campo "ID no Jogo"
            if "id" in field_name and "jogo" in field_name:
                match_game = re.search(r"(\d+)", field_value)
                if match_game:
                    game_id = int(match_game.group(1))

    # --- ESTRATÉGIA 2: Fallback para Descrição (Description) ---
    # Executa se não encontrou os dois IDs nos fields
    if (not user_id or not game_id) and embed.description:
        desc = embed.description

        # Busca Discord ID se ainda não tem
        if not user_id:
            match_discord_desc = re.search(r"(\d{17,19})", desc)
            if match_discord_desc:
                user_id = int(match_discord_desc.group(1))
        
        # Busca Game ID se ainda não tem
        if not game_id:
            # Regex robusta para ignorar formatação markdown (**, -, >) e quebras de linha
            match_game_desc = re.search(r"(?:id|passaporte)\s*(?:no)?\s*jogo\s*[:\-\|]*\s*\**[\s\->]*(\d+)", desc, re.IGNORECASE)
            
            if match_game_desc:
                game_id = int(match_game_desc.group(1))
            else:
                # Tentativa genérica final: "ID" seguido de número pequeno
                match_generic = re.search(r"ID.*?(\d{1,6})", desc, re.IGNORECASE | re.DOTALL)
                if match_generic:
                     cand = int(match_generic.group(1))
                     if cand < 1000000: # IDs de jogo geralmente < 1 milhão
                         game_id = cand

    # --- SALVAR RELATÓRIO ---
    if user_id and game_id:
        try:
            details = f"ID Jogo: {game_id}"
            username = None
            
            try:
                member = await message.guild.fetch_member(user_id)
                username = member.name
            except:
                pass # Segue mesmo se o membro saiu do servidor
            
            # 1. Vincula IDs (Essencial para o comando de relatórios de chamados)
            await link_user_ids_func(user_id, game_id, username)

            # 2. Salva o relatório de aprovação WL
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