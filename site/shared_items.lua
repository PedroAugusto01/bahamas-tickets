if not Config then Config = {} end

--- Callback de uso de item
---
--- @param user_id number ID do jogador
--- @param source number Source do jogador
--- @param item string Nome do item
--- @param amount number Quantidade
--- @param slot number Slot do inventário
--- @param cb function Retorno do uso
--- cb({bool, string?}) → bool = consumir, string = mensagem opcional
--- cb(bool) → bool = consumir
--- Sem cb → não consome e não exibe mensagem

--- Callback de uso de item
---
--- @param user_id number ID do jogador
--- @param source number Source do jogador
--- @param item string Nome do item
--- @param amount number Quantidade
--- @param slot number Slot do inventário
--- @param cb function Retorno do uso
--- cb({bool, string?}) → bool = consumir, string = mensagem opcional
--- cb(bool) → bool = consumir
--- Sem cb → não consome e não exibe mensagem

Config.items = {
    ['money'] = {
        name = 'Dinheiro',
        description = 'Use esse Item para comprar e vender itens',
        weight = 0.0,
    },

    ['dinheirosujo'] = {
        name = 'Dinheiro Sujo',
        description = 'Dinheiro obtido de atividades ilegais',
        weight = 0.0,
    },

    ['certificadoproducao'] = {
        name = 'Certificado de Produção',
        description = 'Certificado para comprovar a produção',
        weight = 0.5,
    },

    ['mochila'] = {
        name = 'Mochila',
        description = 'Use esse Item para aumentar seu inventario',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local exp = vRP.getBackpack(user_id)
            if exp <= 25 then
                vRP.setBackpack(user_id, 50)
                cb(true)
            elseif exp == 50 then
                vRP.setBackpack(user_id, 75)
                cb(true)
            elseif exp == 75 then
                vRP.setBackpack(user_id, 100)
                cb(true)
            else
                cb(false, "No momento você não pode usar essa mochila.")
            end
        end
    },

    ['toucamilitar'] = {
        name = 'Touca Militar',
        description = 'Touca Militar',
        weight = 0.1,
        durability = {
            type = {
                use = 3,
                shooting = false
            },
            destroy_on_break = true,
        },
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("settouca", source)
            vRPclient.closeInventory(source)
            cb({ true, "Utilizada com sucesso!" })
        end
    },

    ['fogos-azul'] = {
        name = 'Fogos Azul',
        description = 'Use esse Item para disparar fogos de artifício azuis',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            createFireWork(source, 'blue')
            vRPclient.closeInventory(source)
            cb({ true, "Fogos de artifício azuis disparados!" })
        end
    },

    ['fogos-rosa'] = {
        name = 'Fogos Rosa',
        description = 'Use esse Item para disparar fogos de artifício rosas',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            createFireWork(source, 'rose')
            vRPclient.closeInventory(source)
            cb({ true, "Fogos de artifício azuis disparados!" })
        end
    },

    ['celular'] = {
        name = 'Celular',
        description = 'Use esse item para falar no telefone',
        weight = 0.1
    },

    ['grampo'] = {
        name = 'Grampo',
        description = 'Use esse item para grampear documentos',
        weight = 0.1
    },

    ['coinfarm'] = {
        name = 'Coin Farm',
        description = 'Use esse item para dobrar o farm da sua facção em 2x (apenas rotas de farm, não funciona em drogas)',
        weight = 0.1
    },

    ['lockpick'] = {
        name = 'Lockpick',
        description = 'Use esse item para abrir portas',
        weight = 0.1,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            if vZONE.inSafe(source) then
                return cb({ false, "Eii você não pode passar lockpick aqui." })
            end
            local vehicle, vehNet, plate, vehName, vehLock, vehBlock, vehHealth, vehModel, vehClass = vRPclient.vehList(
                source, 7)
            local plateUser = vRP.getUserByRegistration(plate)

            if not plate then
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                return cb({ false, "Nenhum veículo próximo." })
            end

            local plyCoords = GetEntityCoords(GetPlayerPed(source))
            local x, y, z = plyCoords[1], plyCoords[2], plyCoords[3]

            if plateUser then
                RESPONSE._closeInventory(source)

                if vRPclient.inVehicle(source) then
                    -- Se estiver dentro do veículo
                    vRPclient._stopAnimActived(source)
                    TriggerClientEvent('lockpicks:UseLockpick', source)
                    local finished = vTASKBAR.taskThree(source)

                    if finished then
                        local randomPorc = math.random(100)
                        if randomPorc >= 70 then
                            -- Chance de quebrar lockpick
                            if math.random(100) >= 950 then
                                vRP.removeInventoryItem(user_id, item, 1, true, slot)
                                TriggerClientEvent("Notify", source, "negado", "Lockpick quebrou!", 5)
                            end
                        end

                        local entity = NetworkGetEntityFromNetworkId(vehNet)
                        if entity then
                            SetVehicleDoorsLocked(entity, 1)
                        end

                        TriggerClientEvent("vrp_sound:source", source, "lock", 0.1)
                        TriggerClientEvent("Notify", source, "sucesso",
                            "Veículo <b>" .. vRP.vehicleName(vehModel) .. "</b> foi roubado.", 7000)
                        vRP.removeInventoryItem(user_id, item, 1, true, slot)
                        -- Chance de alertar polícia
                        if math.random(100) >= 75 then
                            local copAmount = vRP.getUsersByPermission("policia.permissao")
                            for k, v in pairs(copAmount) do
                                local player = vRP.getUserSource(parseInt(v))
                                if player then
                                    TriggerClientEvent("Notify", player, "qru", "Um veículo acaba de ser roubado!", _, _,
                                        31, { x = x, y = y, z = z })
                                end
                            end
                        end

                        cb(true)
                    else
                        TriggerClientEvent("Notify", source, "aviso", "Você falhou, tente novamente.", 7000)
                        cb({ false, "Falhou no roubo" })
                    end
                else
                    -- Se estiver fora do veículo
                    vRPclient._playAnim(source, false, { "missfbi_s4mop", "clean_mop_back_player" }, true)
                    local finished = vTASKBAR.taskOne(source)

                    if finished then
                        local entity = NetworkGetEntityFromNetworkId(vehNet)
                        if entity then
                            SetVehicleDoorsLocked(entity, 1)
                        end
                        local identity = vRP.getUserIdentity(user_id)
                        vRP._LogN(vRP.getAccountById(user_id), user_id, identity.name .. " " .. identity.firstname,
                            "[ROUBOU CARRO]: (" ..
                            vehName ..
                            ") " ..
                            vRP.vehicleName(vehName) .. " (" .. plateUser .. ")\n[CDS]: " .. x .. "," .. y .. "," .. z,
                            "ROUBOS-USOU-LOCKPICK")
                        TriggerClientEvent("vrp_sound:source", source, "lock", 0.1)
                        TriggerClientEvent("Notify", source, "sucesso",
                            "Veículo <b>" .. vRP.vehicleName(mModel) .. "</b> destrancado.", 7000)
                        vRP.removeInventoryItem(user_id, item, 1, true, slot)
                        -- Chance de quebrar lockpick
                        if math.random(1000) >= 950 then
                            vRP.removeInventoryItem(user_id, item, 1, true, slot)
                            TriggerClientEvent("Notify", source, "negado", "Lockpick quebrou!", 5)
                        end

                        cb(true)
                    else
                        TriggerClientEvent("Notify", source, "aviso", "Você falhou.", 7000)
                        cb({ false, "Falhou" })
                    end

                    vRPclient._stopAnim(source, false)
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Este veículo não pode ser roubado.", 5)
                cb({ false, "Este veículo não pode ser roubado." })
            end
        end
    },

    ["masterpick"] = {
        name = 'Masterpick',
        description = 'Ferramenta avançada para destrancar e abrir porta-malas',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if vZONE.inSafe(source) then
                return cb({ false, "Você não pode utilizar isso aqui.." })
            end

            local vehicle, vehNet, plate, vehName, vehLock, vehBlock, vehHealth, vehModel, vehClass = vRPclient.vehList(source, 7)
            local plateUser = vRP.getUserByRegistration(plate)

            if not plate or not vehNet then
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                return cb({ false, "Nenhum veículo próximo." })
            end

            local plyCoords = GetEntityCoords(GetPlayerPed(source))
            local x, y, z = plyCoords[1], plyCoords[2], plyCoords[3]

            if plateUser then
                RESPONSE._closeInventory(source)

                if vRPclient.inVehicle(source) then
                    vRPclient._stopAnimActived(source)
                    TriggerClientEvent('lockpicks:UseLockpick', source)
                    local finished = vTASKBAR.taskThree(source)

                    if finished then
                        if math.random(1000) >= 990 then
                            vRP.removeInventoryItem(user_id, item, 1, true, slot)
                            TriggerClientEvent("Notify", source, "negado", "Masterpick quebrou!", 5)
                        end

                        local entity = NetworkGetEntityFromNetworkId(vehNet)
                        if entity then
                            SetVehicleDoorsLocked(entity, 1)
                        end

                        TriggerClientEvent("vrp_sound:source", source, "lock", 0.1)
                        TriggerClientEvent("Notify", source, "sucesso",
                            "Veículo <b>" .. vRP.vehicleName(vehModel) .. "</b> foi destrancado.", 7000)

                        TriggerEvent('mirtin_inventory:grantTrunkAccess', user_id, plate)
                        TriggerClientEvent('mirtin_inventory:masterpickOpenTrunk', source)

                        cb(true)
                    else
                        TriggerClientEvent("Notify", source, "aviso", "Você falhou, tente novamente.", 7000)
                        cb({ false, "Falhou no roubo" })
                    end
                else
                    vRPclient._playAnim(source, false, { "missfbi_s4mop", "clean_mop_back_player" }, true)
                    local finished = vTASKBAR.taskOne(source)

                    if finished then
                        local entity = NetworkGetEntityFromNetworkId(vehNet)
                        if entity then
                            SetVehicleDoorsLocked(entity, 1)
                        end

                        local identity = vRP.getUserIdentity(user_id)
                        vRP._LogN(vRP.getAccountById(user_id), user_id, identity.name .. " " .. identity.firstname,
                            "[ROUBOU CARRO]: (" .. vehName .. ") " .. vRP.vehicleName(vehModel) .. " (" .. plateUser .. ")\n[CDS]: " .. x .. "," .. y .. "," .. z,
                            "ROUBOS-USOU-MASTERPICK")

                        TriggerClientEvent("vrp_sound:source", source, "lock", 0.1)
                        TriggerClientEvent("Notify", source, "sucesso",
                            "Veículo <b>" .. vRP.vehicleName(vehModel) .. "</b> destrancado.", 7000)

                        TriggerEvent('mirtin_inventory:grantTrunkAccess', user_id, plate)
                        TriggerClientEvent('mirtin_inventory:masterpickOpenTrunk', source)

                        -- chance menor de quebrar que lockpick
                        if math.random(1000) >= 995 then
                            vRP.removeInventoryItem(user_id, item, 1, true, slot)
                            TriggerClientEvent("Notify", source, "negado", "Masterpick quebrou!", 5)
                        end

                        cb(true)
                    else
                        TriggerClientEvent("Notify", source, "aviso", "Você falhou.", 7000)
                        cb({ false, "Falhou" })
                    end

                    vRPclient._stopAnim(source, false)
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Este veículo não pode ser roubado.", 5)
                cb({ false, "Este veículo não pode ser roubado." })
            end
        end
    },

    ["fenixmedal"] = {
        index = "fenixmedal",
        name = "fenixmedal",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, slot, cb)
            local user_id = vRP.getUserId(source)
            --if not vRP.hasPermission(user_id, "barrame.permissao") then return end

            if cooldown[source] then
                return TriggerClientEvent("Notify", source, "negado", "Aguarde para executar novamente")
            end


            if GetEntityHealth(GetPlayerPed(source)) <= 101 then
                return
            end

            local players = vRPc.getNearestPlayers(source, 15)

            if not players then
                return
            end

            vRPclient.closeInventory(source)

            TriggerClientEvent("dress_medal:show", source, { source, "medal_txt", user_id, true })

            for k, v in pairs(players) do
                TriggerClientEvent("dress_medal:show", k, { source, "medal_txt", user_id, false })
            end

            cooldown[source] = true

            SetTimeout(7 * 1000, function()
                cooldown[source] = false
            end)
            cb(true)
        end
    },

    ['colete'] = {
        name = 'Colete',
        description = 'Equipe um colete à prova de balas',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._playAnim(source, true, { "oddjobs@basejump@ig_15", "puton_parachute" }, false)
            TriggerClientEvent("progress", source, 3000)

            SetTimeout(3000, function()
                vRPclient._setArmour(source, 100)
                TriggerClientEvent("Notify", source, "sucesso", "<b>Colete</b> colocado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['coletepremium'] = {
        name = 'Colete Premium',
        description = 'Equipe um colete à prova de balas',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            if (vRPclient.getArmour(source) <= 10) then
                TriggerClientEvent("Notify", source, "negado",
                    "Você não tem um colete equipado. Equipe umn colete antes de tentar equipar um colete Premium!", 5)
                return cb({ false, "Você não tem um colete equipado." })
            end
            vRPclient._playAnim(source, true, { "oddjobs@basejump@ig_15", "puton_parachute" }, false)
            TriggerClientEvent("progress", source, 3000)

            SetTimeout(3000, function()
                vRPclient._setArmour(source, 150)
                TriggerClientEvent("Notify", source, "sucesso", "<b>Colete</b> colocado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['mochilax'] = {
        name = 'Mochila X',
        description = 'Equipe uma mochila especial',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            local exp = vRP.getBackpack(user_id)
            if exp <= 25 then
                TriggerClientEvent("Notify", source, "negado",
                    "Você não tem uma mochila equipada. Equipe uma mochila antes de tentar equipar uma mochila especial!",
                    5)
                cb(false)
            elseif exp <= 90 then
                vRP.setBackpack(user_id, 100)
                cb(true)
            elseif exp == 100 then
                vRP.setBackpack(user_id, 150)
                cb(true)
            elseif exp == 150 then
                vRP.setBackpack(user_id, 200)
                cb(true)
            else
                cb({
                    error = "No momento você não pode usar essa mochila."
                })
            end

            cb(true)
        end
    },

    ['skate'] = {
        name = 'Skate',
        description = 'Use esse item para andar de skate',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("skate", source)
            cb({ false, "Skateboard equipado!" })
        end
    },
    ['algemas'] = {
        name = 'Algemas',
        description = 'Use esse item para algemar pessoas',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            local nplayer = vRPclient.getNearestPlayer(source, 3)
            if nplayer then
                if not RESPONSE.checkAnim(nplayer) then
                    TriggerClientEvent("Notify", source, "importante", "O jogador não está rendido.", 5)
                    return
                end

                if not vRPclient.isHandcuffed(nplayer) then
                    if vRP.tryGetInventoryItem(user_id, item, 1, true, slot) then
                        vRP.giveInventoryItem(user_id, "chave_algemas", 1, true)
                        vRPclient._playAnim(source, false, { { "mp_arrest_paired", "cop_p2_back_left" } }, false)
                        vRPclient._playAnim(nplayer, false, { { "mp_arrest_paired", "crook_p2_back_left" } }, false)
                        SetTimeout(3500, function()
                            vRPclient._stopAnim(source, false)
                            vRPclient._toggleHandcuff(nplayer)
                            TriggerClientEvent("vrp_sound:source", source, "cuff", 0.1)
                            TriggerClientEvent("vrp_sound:source", nplayer, "cuff", 0.1)
                            vRPclient._setHandcuffed(nplayer, true)
                        end)
                    end

                    cb(true)
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum jogador proximo.", 5)
            end
        end
    },
    ['ticket'] = {
        name = 'Ticket Corrida',
        description = 'Use esse item para participar de corridas',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            cb({ true, "Você esta participando de uma corrida." })
        end
    },
    ['plastico'] = {
        name = 'Plástico',
        description = 'Plástico para fabricação',
        weight = 0.01,
    },
    ['distintivopolicial'] = {
        name = 'Distintivo Policial',
        description = 'Use esse item para mostrar sua autoridade',
        weight = 0.3,
    },
    ['corda'] = {
        name = 'Corda',
        description = 'Use esse item para amarrar pessoas',
        weight = 0.5,
    },
    ['chave_algemas'] = {
        name = 'Chave de algemas',
        description = 'Use esse item para tirar algemas',
        weight = 0.3,
    },
    ['emptybottle'] = {
        name = 'Garrafa Vazia',
        description = 'Use esse item para encher com líquidos',
        weight = 0.2,
        func = function(user_id, source, item, amount, slot, cb)
            local status, style = RESPONSE.checkFountain(source)
            if status then
                if style == "fountain" then
                    RESPONSE._closeInventory(source)
                    vRPclient._playAnim(source, false, { { "amb@prop_human_parking_meter@female@idle_a", "idle_a_female" } },
                        true)
                elseif style == "floor" then
                    RESPONSE._closeInventory(source)
                    vRPclient._playAnim(source, false, { { "amb@world_human_bum_wash@male@high@base", "base" } }, true)
                end

                TriggerClientEvent("progress", source, 10)
                SetTimeout(10000,
                    function()
                        vRP.giveInventoryItem(user_id, "water", 1, true)
                        vRPclient._stopAnim(source, false)
                        RESPONSE._updateInventory(source, "updateMochila")
                    end)

                cb(true)
            end

            TriggerClientEvent("Notify", source, "negado", "Vá proximo de um bebedouro ou água para encher a garrafa", 5)
            cb({ false, "Vá proximo de um bebedouro ou água para encher a garrafa" })
        end
    },
    ['attachs'] = {
        name = 'Attachs',
        description = 'Use esse item para melhorar armas',
        weight = 0.2,
        func = function(user_id, source, item, amount, slot, cb)
            RESPONSE._closeInventory(source)
            TriggerClientEvent('mirtin_inventory:client:use_attachs', source, { slot = slot, item = item })
            cb(false)
        end
    },
    ['alianca'] = {
        name = 'Aliança',
        description = 'Use esse item para se casar',
        weight = 0.5,
    },
    ['cigarro'] = {
        name = 'Cigarro',
        description = 'Use esse item para fumar',
        weight = 0.5,
    },
    ['isqueiro'] = {
        name = 'Isqueiro',
        description = 'Use esse item para acender cigarros',
        weight = 0.5,
    },
    ['fogosartificios'] = {
        name = 'Fogos de Artifícios',
        description = 'Use esse item para celebrar',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('b03461cc:inventory:fireworks', source)
            cb(true)
        end
    },
    ['chavefenda'] = {
        name = 'Chave de Fenda',
        description = 'Use esse item para reparos',
        weight = 0.5,
    },

    -- MECÂNICA
    ['pneus'] = {
        name = 'Pneus',
        description = 'Use esse item para trocar pneus',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local vehicle = vRPclient.getNearestVehicle(source, 3)
                if vehicle then
                    if vRP.hasPermission(user_id, "mecanico.permissao") then
                        TriggerClientEvent('cancelando', source, true)
                        TriggerClientEvent("progress", source, 20000, "reparando pneus")
                        vRPclient._playAnim(source, false, { "amb@medic@standing@tendtodead@base", "base" }, true)
                        vRPclient._CarregarObjeto(source, "", "", "prop_wheel_tyre", 49, 60309, -0.05, 0.2, 0.0, 0.0, 0.0,
                            50.0)

                        SetTimeout(20000, function()
                            TriggerClientEvent('cancelando', source, false)
                            vRPclient._DeletarObjeto(source)
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('repararpneus', source, vehicle)
                            TriggerClientEvent("Notify", source, "sucesso", "Você reparou o pneu do veículo.", 8000)
                        end)

                        cb({ false, "Você está reparando o pneu do veículo." })
                    else
                        TriggerClientEvent('cancelando', source, true)
                        TriggerClientEvent("progress", source, 20000, "reparando pneus")
                        vRPclient._playAnim(source, false, { "amb@medic@standing@tendtodead@base", "base" }, true)
                        vRPclient._CarregarObjeto(source, "", "", "prop_wheel_tyre", 49, 60309, -0.05, 0.2, 0.0, 0.0, 0.0,
                            50.0)

                        SetTimeout(20000, function()
                            TriggerClientEvent('cancelando', source, false)
                            vRPclient._DeletarObjeto(source)
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('repararpneus', source, vehicle)
                            TriggerClientEvent("Notify", source, "sucesso", "Você reparou o pneu do veículo.", 8000)
                        end)

                        cb(true)
                    end
                else
                    TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                    cb({ false, "Nenhum veículo próximo." })
                end
            else
                TriggerClientEvent("Notify", source, "negado",
                    "Precisa estar próximo ou fora do veículo para efetuar os reparos.", 5)
                cb({ false, "Precisa estar próximo ou fora do veículo para efetuar os reparos." })
            end
        end
    },
    ['pneu'] = {
        name = 'Pneu',
        description = 'Pneu simples para veículos',
        weight = 0.1,
    },
    ['ampola'] = {
        name = 'Ampola',
        description = 'Ampola utilizada em procedimentos médicos',
        weight = 0.1,
    },
    ['algodao'] = {
        name = 'Algodão',
        description = 'Algodão para curativos e limpeza',
        weight = 0.05,
    },
    ['alcool'] = {
        name = 'Álcool',
        description = 'Álcool para assepsia e limpeza',
        weight = 0.2,
    },
    ['noradrenalina'] = {
        name = 'Noradrenalina',
        description = 'Medicamento utilizado em emergências',
        weight = 0.1,
    },
    ['seringa'] = {
        name = 'Seringa',
        description = 'Seringa descartável para aplicações',
        weight = 0.1,
    },
    ['oleodemotor'] = {
        name = 'Óleo de Motor',
        description = 'Óleo para manutenção de motores',
        weight = 0.5,
    },
    ['epoxi'] = {
        name = 'Epóxi',
        description = 'Resina epóxi para reparos e colagens',
        weight = 0.3,
    },
    ['engrenagem'] = {
        name = 'Engrenagem',
        description = 'Componente mecânico para transmissões',
        weight = 0.2,
    },
    ['kevlar'] = {
        name = 'Kevlar',
        description = 'Material resistente para proteção',
        weight = 0.1,
    },
    ['fender'] = {
        name = 'Fender',
        description = 'Para-lama de veículo',
        weight = 0.1,
    },
    ['grade'] = {
        name = 'Grade',
        description = 'Grade frontal de veículo',
        weight = 0.2,
    },
    ['santoantonio'] = {
        name = 'Santo Antônio',
        description = 'Proteção frontal de veículo',
        weight = 0.1,
    },
    ['serra'] = {
        name = 'Serra',
        description = 'Ferramenta para corte',
        weight = 5.0,
    },
    ['placa'] = {
        name = 'Placa',
        description = 'Placa clonada para veículos',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            if vRPclient.GetVehicleSeat(source) then
                local placa = "CLONADA"
                TriggerClientEvent('cancelando', source, true)
                TriggerClientEvent("vehicleanchor", source, true)
                TriggerClientEvent("progress", source, 30000, "clonando")

                SetTimeout(30000, function()
                    TriggerClientEvent('cancelando', source, false)
                    TriggerClientEvent("cloneplates", source, placa)
                    TriggerEvent("setPlateEveryone", placa)
                    TriggerClientEvent("Notify", source, "sucesso", "Veículo clonado com sucesso.", 8000)
                    TriggerClientEvent("vehicleanchor", source, false)
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Precisa estar dentro do veículo.", 5)
                cb({ false, "Precisa estar dentro do veículo." })
            end
        end
    },
    ['repairkit'] = {
        name = 'Kit de Reparos',
        description = 'Use esse item para reparar veículos',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local vehicle = vRPclient.getNearestVehicle(source, 7)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)
                TriggerClientEvent("progress", source, 30000)
                --vRP.setBlockCommand(user_id, 35)
                SetTimeout(30000, function()
                    TriggerClientEvent("reparar", source, vehicle)
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Você reparou o veiculo.", 5)
                end)

                cb({ true, "Você esta reparando o veiculo." })
            else
                TriggerClientEvent("Notify", source, "negado",
                    "Precisa estar próximo ou fora do veículo para efetuar os reparos.", 5)
                cb({ false, "Precisa estar próximo ou fora do veículo para efetuar os reparos." })
            end
        end
    },
    ['kitreparoplus'] = {
        name = 'Kit de Reparo Plus',
        description = 'Igual ao kit de reparo, porém mais rápido (10s)',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local vehicle = vRPclient.getNearestVehicle(source, 7)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)
                TriggerClientEvent("progress", source, 10000)
                SetTimeout(10000, function()
                    TriggerClientEvent("reparar", source, vehicle)
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Você reparou o veiculo.", 5)
                end)

                cb({ true, "Você esta reparando o veiculo." })
            else
                TriggerClientEvent("Notify", source, "negado",
                    "Precisa estar próximo ou fora do veículo para efetuar os reparos.", 5)
                cb({ false, "Precisa estar próximo ou fora do veículo para efetuar os reparos." })
            end
        end
    },
    ['militec'] = {
        name = 'Militec',
        description = 'Use esse item para melhorar o motor',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local vehicle, vnetid = vRPclient.vehList(source, 3.5)
                if vehicle then
                    if vRP.hasPermission(user_id, "mecanico.permissao") then
                        cb(true)
                        TriggerClientEvent('cancelando', source, true)
                        TriggerClientEvent("progress", source, 30000, "reparando motor")
                        --vGARAGE.vehicleClientHood(source,vnetid,false)
                        vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)
                        SetTimeout(30 * 1000, function()
                            TriggerClientEvent('cancelando', source, false)
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('repararmotor', source, vehicle, true)
                            --vGARAGE.vehicleClientHood(source,vnetid,true)
                        end)
                    else
                        TriggerClientEvent('cancelando', source, true)
                        TriggerClientEvent("progress", source, 30000, "reparando motor")
                        --vGARAGE.vehicleClientHood(source,vnetid,false)
                        vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)
                        SetTimeout(30 * 1000, function()
                            TriggerClientEvent('cancelando', source, false)
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('repararmotor', source, vehicle, true)
                            --vGARAGE.vehicleClientHood(source,vnetid,true)
                        end)
                    end
                end
            end
        end
    },
    ["chave-inglesa"] = {
        name = 'Chave Inglesa',
        description = 'Use esse item para reparos mecânicos',
        weight = 0.5,
    },

    -- ELETRÔNICOS
    ['radio'] = {
        name = 'Radio',
        description = 'Use esse item para se comunicar',
        weight = 0.5,
    },
    ['apple_watch'] = {
        name = 'Apple Watch',
        description = 'Relógio inteligente',
        weight = 0.1,
    },

    -- ITENS PARA ROUBAR
    ['keycard'] = {
        name = 'Keycard',
        description = 'Cartão de acesso para roubos',
        weight = 0.1,
    },
    ['comedycard'] = {
        name = 'Card Comedy',
        description = 'Cartão especial para Comedy Club',
        weight = 0.1,
    },
    ['c4'] = {
        name = 'C4',
        description = 'Explosivo para roubos',
        weight = 0.1,
    },
    ['pendrive'] = {
        name = 'Pendrive',
        description = 'Dispositivo para hackear sistemas',
        weight = 0.1,
    },
    ['furadeira'] = {
        name = 'Furadeira',
        description = 'Ferramenta para abrir cofres',
        weight = 0.1,
    },
    ['roupas'] = {
        name = 'Roupas',
        description = 'Roupas para vestir',
        weight = 0.0,
    },

    -- ITENS MÁFIA
    ["m-aco"] = {
        name = 'Aço',
        description = 'Material para fabricação de armas',
        weight = 0.1,
    },
    ['metal'] = {
        name = 'Placa de Metal',
        description = 'Material para fabricação',
        weight = 0.1,
    },
    ['pecadearma'] = {
        name = 'Peça de arma',
        description = 'Componente para montagem de armas',
        weight = 0.01,
    },

    ['moladourada'] = {
        name = 'Mola Dourada',
        description = 'Mola dourada para armas',
        weight = 0.1,
    },
    ['pentedourado'] = {
        name = 'Pente Dourado',
        description = 'Pente dourado para armas',
        weight = 0.1,
    },
    ['miradourada'] = {
        name = 'Mirada Dourada',
        description = 'Mirada dourada para armas',
        weight = 0.1,
    },
    ['pecadourada'] = {
        name = 'Peca Dourada',
        description = 'Peca dourada para armas',
        weight = 0.1,
    },

    ['corpo-rifle'] = {
        name = 'Corpo de Rifle',
        description = 'Estrutura para montar Rifle',
        weight = 0.1,
    },
    ["m-capa_colete"] = {
        name = 'Capa Colete',
        description = 'Material para fabricar colete',
        weight = 0.01,
    },
    ["m-corpo_ak47_mk2"] = {
        name = 'Corpo de AK47',
        description = 'Estrutura para montar AK47',
        weight = 0.1,
    },
    ["m-corpo_g3"] = {
        name = 'Corpo de G3',
        description = 'Estrutura para montar G3',
        weight = 0.1,
    },
    ["m-corpo_machinepistol"] = {
        name = 'Corpo de TEC-9',
        description = 'Estrutura para montar TEC-9',
        weight = 0.1,
    },
    ["m-corpo_pistol_mk2"] = {
        name = 'Corpo de Pistol',
        description = 'Estrutura para montar Pistol',
        weight = 0.1,
    },
    ["m-corpo_shotgun"] = {
        name = 'Corpo de Shotgun',
        description = 'Estrutura para montar Shotgun',
        weight = 0.1,
    },
    ["m-corpo_smg_mk2"] = {
        name = 'Corpo de SMG',
        description = 'Estrutura para montar SMG',
        weight = 0.1,
    },
    ["m-corpo_snspistol_mk2"] = {
        name = 'Corpo de Fajuta',
        description = 'Estrutura para montar Fajuta',
        weight = 0.1,
    },
    ["m-gatilho"] = {
        name = 'Gatilho',
        description = 'Componente para armas',
        weight = 0.01,
    },
    ['gatilho'] = {
        name = 'Gatilho',
        description = 'Componente para armas',
        weight = 0.01,
    },
    ['peca'] = {
        name = 'Peça',
        description = 'Peça genérica para armas',
        weight = 0.02,
    },
    ["m-malha"] = {
        name = 'Malha',
        description = 'Material para fabricação',
        weight = 0.01,
    },
    ['aluminio'] = {
        name = 'Alumínio',
        description = 'Metal para fabricação',
        weight = 0.01,
    },
    ["m-placametal"] = {
        name = 'Placa de Metal',
        description = 'Material para fabricação',
        weight = 0.1,
    },
    ["m-tecido"] = {
        name = 'Tecido',
        description = 'Material para fabricação',
        weight = 0.1,
    },
    ['linha'] = {
        name = 'Linha',
        description = 'Use esse item para fabricar mochila',
        weight = 0.1,
    },

    -- ITENS CARTEL
    ["c-cobre"] = {
        name = 'Cobre',
        description = 'Metal para fabricação de munições',
        weight = 0.1,
    },
    ["c-ferro"] = {
        name = 'Ferro',
        description = 'Metal para fabricação',
        weight = 0.3,
    },
    ["c-fio"] = {
        name = 'Fio',
        description = 'Material para fabricação',
        weight = 0.1,
    },
    ["c-polvora"] = {
        name = 'Pólvora',
        description = 'Explosivo para munições',
        weight = 0.3,
    },
    ['polvora'] = {
        name = 'Pólvora',
        description = 'Explosivo para munições',
        weight = 0.01,
    },
    ['capsulas'] = {
        name = 'Cápsulas',
        description = 'Invólucro para munições',
        weight = 0.1,
    },
    ['pente'] = {
        name = 'Pente',
        description = 'Pente de muniçoes',
        weight = 0.1,
    },


    -- ITENS LAVAGEM
    ["l-alvejante"] = {
        name = 'Alvejante',
        description = 'Produto químico para limpeza',
        weight = 0.10,
    },
    ['ventoinha'] = {
        name = 'Ventoinha',
        description = 'Peça mecânica para lavagem',
        weight = 0.10,
    },
    ['conector'] = {
        name = 'Conector',
        description = 'Peça elétrica para lavagem',
        weight = 0.05,
    },

    -- ITENS DROGAS
    ['haxixe'] = {
        name = 'Haxixe',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
    },
    ['pococaina'] = {
        name = 'Pó de cocaína',
        description = 'Matéria-prima para cocaína',
        weight = 0.1,
    },
    ['farinha'] = {
        name = 'Farinha',
        description = 'Matéria-prima para cocaína',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.removeInventoryItem(user_id, item, 1, true, slot)
            RESPONSE._closeInventory(source)
            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

            SetTimeout(10 * 1000, function()
                TriggerClientEvent('setStamina', source, 35000)
                TriggerClientEvent('energeticos', source, true)
                TriggerClientEvent('cancelando', source, false)
                TriggerClientEvent("Notify", source, "aviso", "<b>Droga</b> utilizada com sucesso.", 8000)
                vRPclient._DeletarObjeto(source)
            end)

            SetTimeout(45000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)
            cb({ false, "Farinha Consumida" })
        end
    },
    ['resinacannabis'] = {
        name = 'Resina de Cannabis',
        description = 'Matéria-prima para drogas',
        weight = 0.1,
    },
    ['folhamaconha'] = {
        name = 'Folha de Maconha',
        description = 'Matéria-prima para maconha',
        weight = 0.1,
    },
    ['maconha'] = {
        name = 'Maconha',
        description = 'Use esse item para ficar chapado',
        weight = 0.2,
        func = function(user_id, source, item, amount, slot, cb)
            if (vRP.hasPermission(user_id, "crianca.permissao") or vRP.hasPermission(user_id, "policia.permissao")) then
                TriggerClientEvent("Notify", source, "negado", "Você não pode usar drogas.", 5)
                return cb({ false, "Você não pode usar drogas." })
            end

            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)
            if GetResourceState('scanner') == 'started' then
                exports['scanner']:dirtyHand(user_id, item)
            end

            SetTimeout(10000, function()
                TriggerClientEvent('energeticos', source, true)
                TriggerClientEvent('setStamina', source, 35000)
                vRPclient._stopAnim(source, false)
                TriggerClientEvent("Notify", source, "drogas", "<b>Droga</b> utilizada com sucesso.", 8000)
            end)

            SetTimeout(45000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)

            cb(true)
        end
    },
    ['pastabase'] = {
        name = 'Pasta Base',
        description = 'Matéria-prima para crack',
        weight = 0.1,
    },
    ['cocaina'] = {
        name = 'Cocaína',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if vRP.tryGetInventoryItem(user_id, item, 1, true, slot) then
                RESPONSE._closeInventory(source)
                vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)
                SetEntityHealth(GetPlayerPed(source), (GetEntityHealth(GetPlayerPed(source)) - 5) )
                SetTimeout(10 * 1000, function()
                    TriggerClientEvent('energeticos', source, true, 1.49)
                    TriggerClientEvent('setStamina', source, 35000)
                    TriggerClientEvent('cancelando', source, false)
                    TriggerClientEvent("Notify", source, "aviso", "<b>Droga</b> utilizada com sucesso.", 8000)
                    vRPclient._DeletarObjeto(source)
                end)

                SetTimeout(25000, function()
                    TriggerClientEvent('energeticos', source, false)
                    TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
                end)

                cb({ false, "Cocaina Consumida" })
            end
        end
    },
    ['acidolsd'] = {
        name = 'Ácido LSD',
        description = 'Matéria-prima para LSD',
        weight = 0.01,
    },
    ['tiner'] = {
        name = 'Tiner',
        description = 'Solvente químico',
        weight = 0.1,
    },
    ['lancaperfume'] = {
        name = 'Lança Perfume',
        description = 'Droga inalável',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { { "mp_player_int_uppersmoke", "mp_player_int_smoke" } }, true)

                SetTimeout(2000,
                    function()
                        vRPclient._stopAnim(source, false)
                        TriggerClientEvent("inventory:useDrugs", source, item)
                    end)
                cb({ true, "Você esta usando lança perfume" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você ja está sobre um efeito de uma droga..", 5)
                cb({ false, "Você ja está sobre um efeito de uma droga.." })
            end
        end
    },
    ['opiopapoula'] = {
        name = 'Pó de Ópio',
        description = 'Matéria-prima para ópio',
        weight = 0.1,
    },

    -- ILEGAIS
    ['capuz'] = {
        name = 'Capuz',
        description = 'Use esse item para encapuzar pessoas',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local nplayer = vRPclient.getNearestPlayer(source, 5)
            if nplayer then
                local nuser_id = vRP.getUserId(nplayer)

                if vRPclient.isCapuz(nplayer) then
                    vRPclient._setCapuz(nplayer, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Você retirou o capuz desse jogador.", 5000)
                else
                    if vRPclient.isHandcuffed(nplayer) then
                        vRPclient._setCapuz(nplayer, true)
                        TriggerClientEvent("Notify", source, "sucesso",
                            "Você colocou o capuz nesse jogador, para retirar use o item novamente.", 5000)
                    else
                        TriggerClientEvent("Notify", source, "negado", "O jogador não está algemado.", 5000)
                    end
                end

                cb({ true, "Capuz colocado com sucesso" })
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum jogador proximo.", 5000)
                cb({ false, "Nenhum jogador proximo." })
            end
        end
    },
    ['dirty_money'] = {
        name = 'Dinheiro Sujo',
        description = 'Dinheiro que precisa ser lavado',
        weight = 0.0,
    },
    ['scubagear'] = {
        name = 'Kit de Mergulho',
        description = 'Use esse item para mergulhar',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            RESPONSE._setScuba(source, true)
            cb({ true, "Você esta mergulhando" })
        end
    },
    ['analisador'] = {
        name = 'Analisador de resíduos',
        description = 'Use esse item para analisar evidências',
        weight = 0.1,
    },

    -- ITENS JOALHERIA
    ['relogioroubado'] = {
        name = 'Relógio',
        description = 'Relógio roubado para vender',
        weight = 0.1,
    },
    ['colarroubado'] = {
        name = 'Colar',
        description = 'Colar roubado para vender',
        weight = 0.1,
    },
    ['anelroubado'] = {
        name = 'Anel',
        description = 'Anel roubado para vender',
        weight = 0.1,
    },
    ['brincoroubado'] = {
        name = 'Brinco',
        description = 'Brinco roubado para vender',
        weight = 0.1,
    },
    ['pulseiraroubada'] = {
        name = 'Pulseira',
        description = 'Pulseira roubada para vender',
        weight = 0.1,
    },

    -- ITENS AÇOUGUE
    ['carnedepuma'] = {
        name = 'Carne de Puma',
        description = 'Carne selvagem para vender',
        weight = 3.0,
    },
    ['carnedelobo'] = {
        name = 'Carne de Lobo',
        description = 'Carne selvagem para vender',
        weight = 3.0,
    },
    ['carnedejavali'] = {
        name = 'Carne de Javali',
        description = 'Carne selvagem para vender',
        weight = 3.0,
    },

    -- DROGAS PROCESSADAS
    ['opio'] = {
        name = 'Ópio',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

                SetTimeout(2000, function()
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("inventory:useDrugs", source, item)
                end)

                cb({ true, "Você está usando ópio" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sob efeito de uma droga.", 5)
                cb({ false, "Você já está sob efeito de uma droga." })
            end
        end
    },
    ['lsd'] = {
        name = 'LSD',
        description = 'Use esse item para ter alucinações',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { { "mp_player_int_uppersmoke", "mp_player_int_smoke" } }, true)

                SetTimeout(2000,
                    function()
                        vRPclient._stopAnim(source, false)
                        TriggerClientEvent("inventory:useDrugs", source, item)
                    end)
                cb({ true, "Você esta usando LSD" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você ja está sobre um efeito de uma droga..", 5)
                cb({ false, "Você ja está sobre um efeito de uma droga.." })
            end
        end
    },
    ['morfina'] = {
        name = 'Morfina',
        description = 'Use esse item para curar ferimentos',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 15000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(15000, function()
                vRPclient._DeletarObjeto(source)
                vRPclient.setHealth(source, 300)
                TriggerClientEvent("resetBleeding", source)
                TriggerClientEvent("Notify", source, "medico", "<b>Morfina</b> utilizada com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['anestesia'] = {
        name = 'Anestesia',
        description = 'Use esse item para anestesiar um paciente',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not (vRP.hasPermission(user_id, "medico.permissao") or vRP.hasPermission(user_id, "paramedico.permissao")) then
                TriggerClientEvent("Notify", source, "negado", "Você não tem permissão para usar anestesia.", 5)
                return cb({ false, "Você não tem permissão para usar anestesia." })
            end

            local duration = vRP.prompt(source, "Digite a duração da anestesia em segundos (5-300):", "30")
            if not duration or duration == "" then
                return cb({ false, "Operação cancelada." })
            end

            duration = parseInt(duration)
            if not duration or duration < 5 or duration > 300 then
                TriggerClientEvent("Notify", source, "negado", "Duração inválida. Use entre 5 e 300 segundos.", 5)
                return cb({ false, "Duração inválida." })
            end

            local target_id = vRP.prompt(source, "Digite o ID do paciente:", "")
            if not target_id or target_id == "" then
                return cb({ false, "Operação cancelada." })
            end

            target_id = parseInt(target_id)
            if not target_id then
                TriggerClientEvent("Notify", source, "negado", "ID inválido.", 5)
                return cb({ false, "ID inválido." })
            end

            local target_source = vRP.getUserSource(target_id)
            if not target_source then
                TriggerClientEvent("Notify", source, "negado", "Paciente não encontrado ou offline.", 5)
                return cb({ false, "Paciente não encontrado." })
            end

            -- Verificar proximidade
            local coords1 = GetEntityCoords(GetPlayerPed(source))
            local coords2 = GetEntityCoords(GetPlayerPed(target_source))
            local distance = #(coords1 - coords2)

            if distance > 3.0 then
                TriggerClientEvent("Notify", source, "negado", "Você precisa estar próximo ao paciente.", 5)
                return cb({ false, "Muito longe do paciente." })
            end

            -- Aplicar anestesia
            TriggerClientEvent('progress', source, 5000, "remedio")
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "prop_cs_pills", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                
                local target_identity = vRP.getUserIdentity(target_id)
                local medic_identity = vRP.getUserIdentity(user_id)
                
                -- Aplicar efeito de anestesia no paciente
                TriggerClientEvent("anestesia:start", target_source, duration)
                
                -- Notificações
                TriggerClientEvent("Notify", source, "sucesso", "Anestesia aplicada em " .. target_identity.name .. " por " .. duration .. " segundos.", 8000)
                TriggerClientEvent("Notify", target_source, "medico", "Você foi anestesiado por " .. medic_identity.name .. ".", 8000)
                
                -- Log da ação
                print("^3[ANESTESIA] ^7" .. medic_identity.name .. " [" .. user_id .. "] aplicou anestesia em " .. target_identity.name .. " [" .. target_id .. "] por " .. duration .. " segundos.")
            end)

            cb(true)
        end
    },
    ['heroina'] = {
        name = 'Heroína',
        description = 'Use esse item para ficar chapado',
        weight = 0.2,
        func = function(user_id, source, item, amount, slot, cb)
            if (vRP.hasPermission(user_id, "crianca.permissao") or vRP.hasPermission(user_id, "policia.permissao")) then
                TriggerClientEvent("Notify", source, "negado", "Você não pode usar drogas.", 5)
                return cb({ false, "Você não pode usar drogas." })
            end

            local ped = GetPlayerPed(source)
            local health = GetEntityHealth(ped)

            if health > 150 then
                TriggerClientEvent("Notify", source, "negado", "Você não pode usar heroína com mais de 51% de vida.",
                    8000)
                return cb({ false, "Você não pode usar heroína com mais de 51% de vida." })
            end

            local script_name = 'mirtin_dominacao'
            if GetResourceState(script_name) == 'started' then
                if not exports[script_name]:isInsideZone(user_id) then
                    TriggerClientEvent("Notify", source, "negado", "Você só pode usar esse item dentro de dominações.",
                        8000)
                    return cb({ false, "Você só pode usar esse item dentro de dominações." })
                end
            end

            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

            SetTimeout(15000, function()
                vRPclient.setHealth(source, 150)
                vRPclient._stopAnim(source, false)
                TriggerClientEvent("Notify", source, "drogas", "<b>Droga</b> utilizada com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['anfetamina'] = {
        name = 'Anfetamina',
        description = 'Droga estimulante',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

                SetTimeout(10000, function()
                    TriggerClientEvent('energeticos', source, true, 1.49)
                    TriggerClientEvent('setStamina', source, 20000)
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "drogas", "<b>Droga</b> utilizada com sucesso.", 8000)
                end)

                SetTimeout(30000, function()
                    TriggerClientEvent('energeticos', source, false)
                    TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
                end)

                cb({ true, "Você está usando anfetamina" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sob efeito de uma droga.", 5)
                cb({ false, "Você já está sob efeito de uma droga." })
            end
        end
    },
    ['metanfetamina'] = {
        name = 'Metanfetamina',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { { "mp_player_int_uppersmoke", "mp_player_int_smoke" } }, true)

                SetTimeout(2000,
                    function()
                        vRPclient._stopAnim(source, false)
                        TriggerClientEvent("inventory:useDrugs", source, item)
                    end)
                cb({ true, "Você esta usando metanfetamina" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você ja está sobre um efeito de uma droga..", 5)
                cb({ false, "Você ja está sobre um efeito de uma droga.." })
            end
        end
    },
    ['balinha'] = {
        name = 'Balinha',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { { "mp_player_int_uppersmoke", "mp_player_int_smoke" } }, true)

                SetTimeout(2000,
                    function()
                        vRPclient._stopAnim(source, false)
                        TriggerClientEvent("inventory:useDrugs", source, item)
                    end)
                cb({ true, "Você esta usando balinha" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você ja está sobre um efeito de uma droga..", 5)
                cb({ false, "Você ja está sobre um efeito de uma droga.." })
            end
        end
    },
    ['crack'] = {
        name = 'Crack',
        description = 'Use esse item para ficar chapado',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

                SetTimeout(2000, function()
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("inventory:useDrugs", source, item)
                end)

                cb({ true, "Você está fumando crack" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sob efeito de uma droga.", 5)
                cb({ false, "Você já está sob efeito de uma droga." })
            end
        end
    },
    ['podemd'] = {
        name = 'Pó de MD',
        description = 'Matéria-prima para drogas',
        weight = 0.1,
    },

    -- ANIMAIS
    ['tartaruga'] = {
        name = 'Tartaruga',
        description = 'Animal para vender',
        weight = 3.0,
    },

    -- PESCARIA
    ['isca'] = {
        name = 'Isca',
        description = 'Use esse item para pescar',
        weight = 0.1,
    },
    ['pacu'] = {
        name = 'Pacu',
        description = 'Peixe pescado',
        weight = 1.5,
    },
    ['tilapia'] = {
        name = 'Tilápia',
        description = 'Peixe pescado',
        weight = 0.10,
    },
    ['salmao'] = {
        name = 'Salmão',
        description = 'Peixe pescado',
        weight = 0.5,
    },
    ['tucunare'] = {
        name = 'Tucunaré',
        description = 'Peixe pescado',
        weight = 2.0,
    },
    ['robalo'] = {
        name = 'Robalo',
        description = 'Peixe pescado',
        weight = 2.0,
    },
    ['sardinha'] = {
        name = 'Sardinha',
        description = 'Peixe pescado',
        weight = 2.0,
    },
    ['dourado'] = {
        name = 'Dourado',
        description = 'Peixe pescado',
        weight = 3.0,
    },

    -- LENHADOR
    ['madeira'] = {
        name = 'Madeira',
        description = 'Material para construção',
        weight = 0.2,
    },

    -- GRÃOS/FAZENDA
    ['graosimpuros'] = {
        name = 'Grãos',
        description = 'Grãos para plantar',
        weight = 0.1,
    },
    ['laranja'] = {
        name = 'Laranja',
        description = 'Fruta cultivada',
        weight = 0.1,
    },
    ['tomate'] = {
        name = 'Tomate',
        description = 'Vegetal cultivado',
        weight = 0.1,
    },
    ['trigo'] = {
        name = 'Trigo',
        description = 'Cereal cultivado',
        weight = 0.1,
    },
    ['alface'] = {
        name = 'Alface',
        description = 'Verdura cultivada',
        weight = 0.1,
    },
    ['garrafavazia'] = {
        name = 'Garrafa Vazia',
        description = 'Recipiente vazio',
        weight = 0.2,
    },
    ['garrafadeleite'] = {
        name = 'Garrafa de Leite',
        description = 'Leite fresco',
        weight = 0.3,
    },
    ['credencialfazendeiro'] = {
        name = 'Credencial Fazendeiro',
        description = 'Identificação de fazendeiro',
        weight = 0.5,
    },

    -- ENTREGADOR
    ['caixa'] = {
        name = 'Caixa de entrega',
        description = 'Caixa para entregas',
        weight = 1.5,
    },

    -- ESTRAGADOS

    ['ferroenferrujado'] = {
        name = 'Ferro Enferrujado',
        description = 'Metal Enferrujado',
        weight = 0.1,
    },

    ['papelao'] = {
        name = 'Papelão',
        description = 'Contém 1x Papelão',
        weight = 0.01,
    },

    ['tecido'] = {
        name = 'Tecido',
        description = 'Contém 1x Tecido',
        weight = 0.01,
    },
    
    ['molas'] = {
        name = 'Molas',
        description = 'Contém 1x Mola',
        weight = 0.01,
    },


    ["plasticorasgado"] = {
        name = 'Plástico Rasgado',
        description = 'Contém 1x Plástico Rasgado',
        weight = 0.01,
    },

    ["molaquebrada"] = {
        name = 'Mola Quebrada',
        description = 'Contém 1x Mola Quebrada',
        weight = 0.01,
    },

    ['papelaomolhado'] = {
        name = 'Papelão Molhado',
        description = 'Contém 1x Papelão Molhado',
        weight = 0.01,
    },
    
    ['alvejante'] = {
        name = 'Alvejante',
        description = 'Material para limpar a casa',
        weight = 0.01,
    },
    -- MINERAÇÃO
    ['bronze'] = {
        name = 'Bronze',
        description = 'Metal precioso',
        weight = 0.1,
    },
    ['ferro'] = {
        name = 'Ferro',
        description = 'Metal comum',
        weight = 0.1,
    },
    ['ouro'] = {
        name = 'Ouro',
        description = 'Metal precioso',
        weight = 0.1,
    },
    ['diamante'] = {
        name = 'Diamante',
        description = 'Pedra preciosa',
        weight = 0.1,
    },
    ['rubi'] = {
        name = 'Rubi',
        description = 'Pedra preciosa',
        weight = 0.1,
    },
    ['safira'] = {
        name = 'Safira',
        description = 'Pedra preciosa',
        weight = 0.1,
    },

    -- COMIDAS
    ['pao'] = {
        name = 'Pão',
        description = 'Use esse item para matar a fome',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_inteat@burger", "mp_player_int_eat_burger_fp",
                "prop_cs_burger_01", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                vRP.varyHunger(user_id, -20)
                TriggerClientEvent("Notify", source, "sucesso", "Você comeu pão.", 5000)
            end)

            cb(true)
        end
    },
    ['sanduiche'] = {
        name = 'Sanduíche',
        description = 'Use esse item para matar a fome',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_inteat@burger", "mp_player_int_eat_burger_fp",
                "prop_cs_burger_01", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                vRP.varyHunger(user_id, -30)
                TriggerClientEvent("Notify", source, "sucesso", "Você comeu um sanduíche.", 5000)
            end)

            cb(true)
        end
    },
    ['pizza'] = {
        name = 'Pizza',
        description = 'Use esse item para matar a fome',
        weight = 1.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 10000)
            vRPclient._CarregarObjeto(source, "mp_player_inteat@burger", "mp_player_int_eat_burger_fp",
                "prop_cs_burger_01", 49, 60309)

            SetTimeout(10000, function()
                vRPclient._DeletarObjeto(source)
                vRP.varyHunger(user_id, -50)
                TriggerClientEvent("Notify", source, "sucesso", "Você comeu pizza.", 5000)
            end)

            cb(true)
        end
    },
    ['barrac'] = {
        name = 'Barra de chocolate',
        description = 'Use esse item para matar a fome',
        weight = 0.1,
    },
    ['cachorroq'] = {
        name = 'Cachorro Quente',
        description = 'Use esse item para matar a fome',
        weight = 0.1,
    },
    ['pipoca'] = {
        name = 'Pipoca',
        description = 'Use esse item para matar a fome',
        weight = 0.3,
    },
    ['donut'] = {
        name = 'Donut',
        description = 'Use esse item para matar a fome',
        weight = 0.2,
    },
    ['paoq'] = {
        name = 'Pão de Queijo',
        description = 'Use esse item para matar a fome',
        weight = 0.3,
    },
    ['marmita'] = {
        name = 'Marmitex',
        description = 'Use esse item para matar a fome',
        weight = 2.0,
    },
    ['coxinha'] = {
        name = 'Coxinha',
        description = 'Use esse item para matar a fome',
        weight = 0.1,
    },

    -- BEBIDAS
    ['cocacola'] = {
        name = 'Coca Cola',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
    },
    ['sprunk'] = {
        name = 'Sprunk',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
    },
    ['sucol'] = {
        name = 'Suco de Laranja',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
    },
    ['sucol2'] = {
        name = 'Suco de Limão',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
    },
    ['water'] = {
        name = 'Água',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 3000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "prop_ld_flow_bottle", 49, 60309)

            SetTimeout(3000, function()
                vRPclient._DeletarObjeto(source)
                vRP.varyThirst(user_id, -30)
                TriggerClientEvent("Notify", source, "sucesso", "Você bebeu água.", 5000)
            end)

            cb(true)
        end
    },
    ['cafe'] = {
        name = 'Café',
        description = 'Use esse item para matar a sede',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "amb@world_human_drinking@coffee@male@idle_a", "idle_c", "prop_fib_coffee",
                49, 28422)

            SetTimeout(10000, function()
                TriggerClientEvent('energeticos', source, true)
                TriggerClientEvent('setStamina', source, 35000)
                vRPclient._stopAnim(source, false)
                TriggerClientEvent("Notify", source, "sucesso", "Você bebeu café.", 5000)
            end)

            SetTimeout(45000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)

            cb(true)
        end
    },
    ['energetico'] = {
        name = 'Energético',
        description = 'Use esse item para matar a sede',
        weight = 0.10,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10)
            play_drink(source, item, 10)
            SetTimeout(10000, function()
                vRP.varyThirst(user_id, 5 * amount)
                TriggerClientEvent("Notify", source, "sucesso", "Energético utilizado com sucesso.", 5)
                TriggerClientEvent('setStamina', source, 20000)
                RESPONSE._setEnergetico(source, true)
                SetTimeout(30000, function()
                    TriggerClientEvent("Notify", source, "negado", "O efeito do energético acabou.", 5)
                    RESPONSE._setEnergetico(source, false)
                end)
            end)

            cb({ true, "Você está usando um energético." })
        end
    },

    -- BEBIDAS ALCOÓLICAS
    ['vodka'] = {
        name = 'Vodka',
        description = 'Use esse item para beber álcool',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo uma vodka." })
        end
    },
    ['cerveja'] = {
        name = 'Cerveja',
        description = 'Use esse item para beber álcool',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo uma cerveja." })
        end
    },
    ['corote'] = {
        name = 'Corote',
        description = 'Use esse item para beber álcool',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo uma corote." })
        end
    },
    ['pinga'] = {
        name = 'Pinga',
        description = 'Use esse item para beber álcool',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo uma pinga." })
        end
    },
    ['whisky'] = {
        name = 'Whisky',
        description = 'Use esse item para beber álcool',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo um whisky." })
        end
    },
    ['absinto'] = {
        name = 'Absinto',
        description = 'Use esse item para beber álcool',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo um absinto." })
        end
    },
    ['skolb'] = {
        name = 'Skol Beats',
        description = 'Use esse item para beber álcool',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("progress", source, 10 * amount, "Bebendo")
            play_drink(source, item, 10 * amount)

            SetTimeout(15 * 1000, function()
                vRPclient._playScreenEffect(source, "RaceTurbo", 60 * amount)
                vRPclient._playScreenEffect(source, "DrugsTrevorClownsFight", 60 * amount)
                RESPONSE._setAnim(source, amount)
            end)

            cb({ true, "Você esta bebendo um skol beats." })
        end
    },

    -- REMÉDIOS
    ['amoxilina'] = {
        name = 'Amoxilina',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['cataflan'] = {
        name = 'Cataflan',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['cicatricure'] = {
        name = 'Cicatricure',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['clozapina'] = {
        name = 'Clozapina',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('cancelando', source, true)
            TriggerClientEvent("progress", source, 5000, "remedio")
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFightIn", 10)
            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFight", 48)
            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFightOut", 2)
            SetTimeout(5 * 1000, function()
                TriggerClientEvent('cancelando', source, false)
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['dipirona'] = {
        name = 'Dipirona',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['paracetamol'] = {
        name = 'Paracetamol',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['rivotril'] = {
        name = 'Rivotril',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['riopan'] = {
        name = 'Riopan',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['luftal'] = {
        name = 'Luftal',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['coumadin'] = {
        name = 'Coumadin',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 20000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(20000, function()
                TriggerClientEvent("resetBleeding", source)
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "sucesso", "<b>Coumadin</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['dorflex'] = {
        name = 'Dorflex',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                RESPONSE._usePill(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['anticoncepcional'] = {
        name = 'Anticoncepcional',
        description = 'Use esse item como método contraceptivo',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            if GetEntityModel(GetPlayerPed(source)) == GetHashKey('mp_f_freemode_01') then
                TriggerClientEvent('progress', source, 5000)
                vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

                SetTimeout(5000, function()
                    vRPclient._DeletarObjeto(source)
                    TriggerClientEvent("Notify", source, "medico", "<b>Anticoncepcional</b> utilizado com sucesso.", 8000)
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Apenas mulheres podem usar este item.", 5)
                cb({ false, "Apenas mulheres podem usar este item." })
            end
        end
    },
    ['camisinha'] = {
        name = 'Camisinha',
        description = 'Use esse item como método contraceptivo',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("Notify", source, "sucesso", "Camisinha utilizada com sucesso.", 5000)
            cb(true)
        end
    },
    ['fluoxetina'] = {
        name = 'Fluoxetina',
        description = 'Use esse item para curar ferimentos',
        weight = 0.05,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['bandagem'] = {
        name = 'Bandagem',
        description = 'Use esse item para curar ferimentos',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "amb@world_human_clipboard@male@idle_a", "idle_c", "v_ret_ta_firstaid", 49,
                60309)

            TriggerClientEvent("progress", source, 15)
            SetTimeout(15 * 1000, function()
                vRPclient._DeletarObjeto(source)
                RESPONSE._useBandagem(source)
                TriggerClientEvent("Notify", source, "importante",
                    "Você utilizou a bandagem, não tome nenhum tipo de dano para não ser cancelada..", 5)
            end)

            cb({ true, "Você esta usando uma bandagem." })
        end
    },

    -- NITRO
    ['nitro'] = {
        name = 'Nitro',
        description = 'Use esse item para acelerar o veículo',
        weight = 0.5,
    },

    -- TUNING
    ['suspensaoar2'] = {
        name = 'Suspensão',
        description = 'Use esse item para modificar suspensão',
        weight = 0.0,
    },
    ['kitneon2'] = {
        name = 'Neon',
        description = 'Use esse item para adicionar neon',
        weight = 0.0,
    },
    ['kitxenon2'] = {
        name = 'Xenon',
        description = 'Use esse item para modificar faróis',
        weight = 0.0,
    },
    ['fueltech2'] = {
        name = 'Remap',
        description = 'Use esse item para remap do motor',
        weight = 0.0,
    },
    ['kitcamber2'] = {
        name = 'Camber',
        description = 'Use esse item para modificar camber',
        weight = 0.0,
    },
    ['kitoffset2'] = {
        name = 'OffSet',
        description = 'Use esse item para modificar offset',
        weight = 0.0,
    },
    ['escapamentoPop2'] = {
        name = 'Escapamento',
        description = 'Use esse item para modificar escapamento',
        weight = 0.0,
    },
    ['westgate2'] = {
        name = 'WestGate',
        description = 'Use esse item para controle de turbo',
        weight = 0.0,
    },
    ['purgador2'] = {
        name = 'Purgador',
        description = 'Use esse item para purgador de turbo',
        weight = 0.0,
    },
    ['notebook'] = {
        name = 'Notebook',
        description = 'Use esse item para programação',
        weight = 0.0,
    },

    -- CHEQUES
    ['cheque'] = {
        name = 'Cheque 500 Mil',
        description = 'Cheque no valor de R$500.000',
        weight = 0.1,
    },
    ['cheque1'] = {
        name = 'Cheque 1 Milhão',
        description = 'Cheque no valor de R$1.000.000',
        weight = 0.1,
    },
    ['cheque2'] = {
        name = 'Cheque 2 Milhões',
        description = 'Cheque no valor de R$2.000.000',
        weight = 0.1,
    },
    ['cheque3'] = {
        name = 'Cheque 5 Milhões',
        description = 'Cheque no valor de R$5.000.000',
        weight = 0.1,
    },
    ['cheque4'] = {
        name = 'Cheque 7 Milhões',
        description = 'Cheque no valor de R$7.000.000',
        weight = 0.1,
    },

    -- CASSINO
    ['fichas'] = {
        name = 'Fichas',
        description = 'Fichas para jogar no cassino',
        weight = 0.001,
    },

    -- ITENS ESPECIAIS E NOVOS
    ['britadeira'] = {
        name = 'Britadeira',
        description = 'Ferramenta para quebrar pedras',
        weight = 2.0,
    },
    ['suitegamer'] = {
        name = 'Suite Gamer',
        description = 'Ticket para Suite Gamer',
        weight = 0.1,
    },
    ['suiteoriental'] = {
        name = 'Suite Oriental',
        description = 'Ticket para Suite Oriental',
        weight = 0.1,
    },
    ['suitewest'] = {
        name = 'Suite West',
        description = 'Ticket para Suite West',
        weight = 0.1,
    },
    ['suitecaverna'] = {
        name = 'Suite Caverna',
        description = 'Ticket para Suite Caverna',
        weight = 0.1,
    },
    ['suiteindiana'] = {
        name = 'Suite Indiana',
        description = 'Ticket para Suite Indiana',
        weight = 0.1,
    },
    ['suitediamond'] = {
        name = 'Suite Diamond',
        description = 'Ticket para Suite Diamond',
        weight = 0.1,
    },
    ['suitevanilla'] = {
        name = 'Suite Vanilla',
        description = 'Ticket para Suite Vanilla',
        weight = 0.1,
    },
    ['esmeralda'] = {
        name = 'Esmeralda',
        description = 'Pedra preciosa verde',
        weight = 0.9,
    },
    ['encomenda'] = {
        name = 'Encomenda',
        description = 'Pacote para entrega',
        weight = 1.2,
    },
    ['lenha'] = {
        name = 'Lenha',
        description = 'Madeira para queimar',
        weight = 0.75,
    },
    ['fertilizante'] = {
        name = 'Fertilizante',
        description = 'Produto químico para plantas',
        weight = 0.8,
    },
    ['tabletroubado'] = {
        name = 'Tablet Roubado',
        description = 'Tablet roubado para vender',
        weight = 0.2,
    },
    ['dollars'] = {
        name = 'Dinheiro',
        description = 'Dinheiro em espécie',
        weight = 0.0,
    },
    ['graos'] = {
        name = 'Grãos',
        description = 'Grãos para plantar',
        weight = 0.5,
    },
    ['sucata'] = {
        name = 'Sucata',
        description = 'Peças de metal velhas',
        weight = 0.01,
    },
    ['otima-fotografia'] = {
        name = 'Fotografia Plus',
        description = 'Fotografia de boa qualidade',
        weight = 0.2,
    },
    ['corvina'] = {
        name = 'Corvina',
        description = 'Peixe pescado',
        weight = 0.6,
    },
    ['folhadecoca'] = {
        name = 'Folha de Coca',
        description = 'Matéria-prima para drogas',
        weight = 0.1,
    },
    ['fungo'] = {
        name = 'Fungo',
        description = 'Fungo alucinógeno',
        weight = 0.1,
    },
    ['acido'] = {
        name = 'Ácido',
        description = 'Produto químico corrosivo',
        weight = 0.1,
    },
    ['pendriveinformacoes'] = {
        name = 'Pendrive Informações',
        description = 'Pendrive com dados importantes',
        weight = 0.1,
    },
    ['orgao'] = {
        name = 'Órgão',
        description = 'Órgão humano',
        weight = 1.2,
    },
    ['binoculos'] = {
        name = 'Binóculos',
        description = 'Use para observar à distância',
        weight = 2.0,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("binoculos", source, true)
            vRPclient._CarregarObjeto(source, "amb@world_human_binoculars@male@enter", "enter", "prop_binoc_01", 50,
                28422)
            cb({ false, "Binóculos equipados" })
        end
    },
    ['erva'] = {
        name = 'Erva',
        description = 'Mato verde e resinado',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.removeInventoryItem(user_id, item, 1, true, slot)
            RESPONSE._closeInventory(source)
            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

            SetTimeout(10 * 1000, function()
                TriggerClientEvent('energeticos', source, true)
                TriggerClientEvent('setStamina', source, 35000)
                TriggerClientEvent('cancelando', source, false)
                TriggerClientEvent("Notify", source, "aviso", "<b>Droga</b> utilizada com sucesso.", 8000)
                vRPclient._DeletarObjeto(source)
            end)

            SetTimeout(45000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)
            cb({ false, "Erva Consumida" })
        end
    },
    ['dado'] = {
        name = 'Dado',
        description = 'Use para jogar dados',
        weight = 2.0,
        func = function(user_id, source, item, amount, slot, cb)
            if GetEntityHealth(GetPlayerPed(source)) <= 101 then return end
            local players = vRPclient.getNearestPlayers(source, 15)
            if not players then return end

            local diceSides = { "dado1", "dado2", "dado3", "dado4", "dado5", "dado6" }
            local diceTextureNumber = math.random(1, #diceSides)
            RESPONSE._closeInventory(source)

            TriggerClientEvent("live_dress:show", source, { source, diceSides[diceTextureNumber], user_id, true })
            for k, v in pairs(players) do
                TriggerClientEvent("live_dress:show", k, { source, diceSides[diceTextureNumber], user_id, false })
            end

            cb({ false, "Dado jogado!" })
        end
    },
    ['rastreador'] = {
        name = 'Rastreador',
        description = 'Use para instalar rastreador em veículos',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local vehicle, vehNet, plate, vehName, vehLock, vehBlock, vehHealth, vehModel, vehClass = vRPclient.vehList(source, 7)
            if plate then
                local plateUser = vRP.getUserByRegistration(plate)
                RESPONSE._closeInventory(source)
                TriggerClientEvent("Notify", source, "sucesso", "Instalando rastreador do veículo...", 8000)
                TriggerClientEvent('progress', source, 15000)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)

                SetTimeout(15000, function()
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Rastreador instalado com sucesso!", 8000)
                    exports.vrp_tracker:AddTrackerVehicle(plateUser, vehicle, vehNet)

                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                cb({ false, "Nenhum veículo próximo." })
            end
        end
    },
    ['detectorfrequencia'] = {
        name = 'Detector de Frequência',
        description = 'Use para detectar rastreadores',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local plate, mName, mNet, mPortaMalas, mPrice, mLock, mModel = vRPclient.ModelName(source, 7)
            if plate then
                RESPONSE._closeInventory(source)
                TriggerClientEvent("Notify", source, "sucesso", "Checando frequência do veículo...", 8000)
                TriggerClientEvent('progress', source, 5000)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)

                SetTimeout(5000, function()
                    vRPclient._stopAnim(source, false)
                    local hasTracker = math.random(100) > 50
                    if hasTracker then
                        TriggerClientEvent("Notify", source, "sucesso", "O veículo possui rastreador ativo.", 8000)
                    else
                        TriggerClientEvent("Notify", source, "negado", "O veículo não possui rastreador ativo.", 8000)
                    end
                end)

                cb({ false, "Detectando frequência..." })
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                cb({ false, "Nenhum veículo próximo." })
            end
        end
    },
    ['seringap'] = {
        name = 'Seringa Secreta',
        description = 'Ative habilidades especiais',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if vRP.hasPermission(user_id, "paulinho.permissao") then
                TriggerClientEvent("Notify", source, "negado", "Você não tem permissão para usar esta seringa.", 5)
                return cb({ false, "Você não tem permissão para usar esta seringa." })
            end
            TriggerClientEvent("net.inventory:useItem", source, "seringap")
            cb(true)
        end
    },
    ['bloqueadorfrequencia'] = {
        name = 'Bloqueador de Frequência',
        description = 'Use para bloquear rastreadores',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local plate, mName, mNet, mPortaMalas, mPrice, mLock, mModel = vRPclient.ModelName(source, 7)
            if plate then
                RESPONSE._closeInventory(source)
                TriggerClientEvent("Notify", source, "sucesso", "Bloqueando frequência do rastreador...", 8000)
                TriggerClientEvent('progress', source, 10000)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)

                SetTimeout(10000, function()
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Rastreador bloqueado com sucesso!", 8000)
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                cb({ false, "Nenhum veículo próximo." })
            end
        end
    },
    ['macarico'] = {
        name = 'Maçarico',
        description = 'Ferramenta para soldagem',
        weight = 2.0,
    },
    ['bolinha'] = {
        name = 'Bolinha',
        description = 'Use para brincar com pets',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("c2n_pets:setBall", source, "WEAPON_BALL", 1)
            cb({ false, "Bolinha equipada para pets" })
        end
    },
    ['maquiagemroubada'] = {
        name = 'Maquiagem Roubada',
        description = 'Maquiagem roubada para vender',
        weight = 0.2,
    },
    ['adrenalina'] = {
        name = 'Adrenalina',
        description = 'Use para reanimar pessoas',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            local nplayer = vRPclient.getNearestPlayer(source, 5)
            if nplayer then
                if GetEntityHealth(GetPlayerPed(nplayer)) > 105 then
                    TriggerClientEvent("Notify", source, "negado", "A pessoa não precisa de reanimação.", 5)
                    return cb({ false, "A pessoa não precisa de reanimação." })
                end

                RESPONSE._closeInventory(source)
                TriggerClientEvent('progress', source, 10000)
                vRPclient._playAnim(source, false, { "mini@cpr@char_a@cpr_str", "cpr_pumpchest" }, true)

                SetTimeout(10000, function()
                    vRPclient.setHealth(nplayer, 150)
                    TriggerClientEvent("resetBleeding", nplayer)
                    TriggerClientEvent("resetDiagnostic", nplayer)
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("Notify", source, "sucesso", "Pessoa reanimada com sucesso!", 8000)
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhuma pessoa próxima.", 5)
                cb({ false, "Nenhuma pessoa próxima." })
            end
        end
    },
    ['maladedinheiro'] = {
        name = 'Mala de Dinheiro',
        description = 'Mala com R$ 10.000',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.giveInventoryItem(user_id, "money", 10000, true)
            TriggerClientEvent("Notify", source, "sucesso", "Você removeu $ 10.000.", 6000)
            cb(true)
        end
    },
    ['maladedinheiro2'] = {
        name = 'Mala de Dinheiro',
        description = 'Mala com R$ 20.000',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.giveInventoryItem(user_id, "money", 20000, true)
            TriggerClientEvent("Notify", source, "sucesso", "Você removeu $ 20.000.", 6000)
            cb(true)
        end
    },
    ['blacklist'] = {
        name = 'Blacklist',
        description = 'Use para sair da blacklist',
        weight = 0.7,
        func = function(user_id, source, item, amount, slot, cb)
            local group = vRP.getUserGroupByType(user_id, "job")
            if group ~= "" then
                TriggerClientEvent("Notify", source, "negado", "Você já possui um emprego.", 5)
                return cb({ false, "Você já possui um emprego." })
            end
            TriggerEvent("removeBlacklist", user_id)
            TriggerClientEvent("Notify", source, "sucesso", "Blacklist removida com sucesso!", 8000)
            cb(true)
        end
    },
    ['valecarropolicial'] = {
        name = 'Vale Carro Policial',
        description = 'Vale para liberar carro policial',
        weight = 0.1,
    },
    ['tintadecaneta'] = {
        name = 'Tinta de Caneta',
        description = 'Tinta para documentos',
        weight = 0.1,
    },
    ['intimacoes'] = {
        name = 'Intimações',
        description = 'Documentos de intimação',
        weight = 0.1,
    },
    ['jornal'] = {
        name = 'Jornal',
        description = 'Jornal com notícias',
        weight = 0.2,
    },
    ['oleoungido'] = {
        name = 'Óleo Ungido',
        description = 'Use para benção religiosa',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 10000)
            vRPclient._playAnim(source, false, { "missheist_agency3aig_23", "urinal_sink_loop" }, true)

            SetTimeout(10000, function()
                vRPclient._stopAnim(source, false)
                TriggerClientEvent("Notify", source, "sucesso", "Óleo ungido utilizado!", 8000)
            end)

            cb(true)
        end
    },
    ['biblia'] = {
        name = 'Bíblia',
        description = 'Use para oração',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("emotes", source, "biblia")
            cb({ false, "Lendo a bíblia" })
        end
    },
    ['surfistinha'] = {
        name = 'Surfistinha',
        description = 'Droga psicoativa',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                TriggerClientEvent("progress", source, 7000)
                TriggerClientEvent("emotes", source, "suicidio2")

                SetTimeout(7000, function()
                    vRPclient.loadAnimSet(source, "move_m@drunk@slightlydrunk")
                    vRPclient.playScreenEffect(source, "DeathFailMPIn", 60)
                    TriggerClientEvent('drug:effect', source)
                end)

                cb({ true, "Você está usando surfistinha" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sobre um efeito de uma droga.", 5)
                cb({ false, "Você já está sobre um efeito de uma droga." })
            end
        end
    },
    ['madona'] = {
        name = 'Madona',
        description = 'Droga psicoativa',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                TriggerClientEvent("progress", source, 7000)
                TriggerClientEvent("emotes", source, "suicidio2")

                SetTimeout(7000, function()
                    vRPclient.loadAnimSet(source, "move_m@drunk@slightlydrunk")
                    vRPclient.playScreenEffect(source, "DrugsTrevorClownsFight", 60)
                    TriggerClientEvent("drug:effect2", source)
                end)

                cb({ true, "Você está usando madona" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sobre um efeito de uma droga.", 5)
                cb({ false, "Você já está sobre um efeito de uma droga." })
            end
        end
    },
    ['cinderela'] = {
        name = 'Cinderela',
        description = 'Droga psicoativa',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                TriggerClientEvent("progress", source, 7000)
                TriggerClientEvent("emotes", source, "suicidio2")

                SetTimeout(7000, function()
                    vRPclient.loadAnimSet(source, "move_m@drunk@slightlydrunk")
                    vRPclient.playScreenEffect(source, "DeathFailMPIn", 60)
                    TriggerClientEvent('drug:effect3', source, 60)
                end)

                cb({ true, "Você está usando cinderela" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sobre um efeito de uma droga.", 5)
                cb({ false, "Você já está sobre um efeito de uma droga." })
            end
        end
    },
    ['ingresso'] = {
        name = 'Ingresso',
        description = 'Ingresso para eventos',
        weight = 0.2,
    },
    ['honrabm'] = {
        name = 'Honra BM',
        description = 'Badge de honra',
        weight = 0.01,
    },
    ['bau500kg1'] = {
        name = 'bau500kg1',
        description = 'Use para ganhar veículo com baú de 500kg',
        weight = 100.0,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.prepare("creative/check_vehicle_500",
                "SELECT 1 FROM vrp_user_vehicles WHERE user_id = @user_id AND vehicle = @vehicle")
            local rows = vRP.execute("creative/check_vehicle_500", { user_id = user_id, vehicle = "wrmuleouro" })
            if #rows > 0 then
                TriggerClientEvent('Notify', source, 'negado', 'Você já possui este veículo em sua garagem!', 5000)
                return false
            end

            -- Adiciona o veículo
            vRP.prepare("creative/add_vehicle2",
                "INSERT IGNORE INTO vrp_user_vehicles(user_id,vehicle,tax,plate) VALUES(@user_id,@vehicle,@tax,@plate)")
            vRP._execute("creative/add_vehicle2",
                { user_id = user_id, vehicle = "wrmuleouro", tax = os.time(), plate = vRP.generatePlateNumber() })

            -- Define o baú inicial como 500kg
            vRP.setUData(user_id, "vRP:vehicle_chest_weight", json.encode({ ["wrmuleouro"] = 0 }))

            TriggerClientEvent('Notify', source, 'sucesso', 'Você recebeu o veículo com baú de 500kg!', 5000)
            local data = vRP.getSData('chest:uYNE5P11veh_wrmuleouro')
            print(json.encode(data))
            cb(true)
        end
    },

    ['bau500kg2'] = {
        name = 'bau500kg2',
        description = 'Use para upgrade do baú para 1000kg',
        weight = 100.0,
        func = function(user_id, source, item, amount, slot, cb)
            local chestData = json.decode(vRP.getUData(user_id, "vRP:vehicle_chest_weight") or "{}")
            local currentWeight = chestData["wrmuleouro"] or 0

            if currentWeight ~= 0 then
                TriggerClientEvent('Notify', source, 'negado', 'Você não pode ter upgrade de baú para fazer isto!', 5000)
                return false
            end

            -- Adiciona mais 500
            chestData["wrmuleouro"] = 500
            vRP.setUData(user_id, "vRP:vehicle_chest_weight", json.encode(chestData))

            TriggerClientEvent('Notify', source, 'sucesso', 'Seu baú foi atualizado para 1000kg!', 5000)
            cb(true)
        end
    },

    ['bau500kg3'] = {
        name = 'bau500kg3',
        description = 'Use para upgrade do baú para 1500kg',
        weight = 100.0,
        func = function(user_id, source, item, amount, slot, cb)
            local chestData = json.decode(vRP.getUData(user_id, "vRP:vehicle_chest_weight") or "{}")
            local currentWeight = chestData["wrmuleouro"] or 0

            if currentWeight ~= 500 then
                TriggerClientEvent('Notify', source, 'negado',
                    'Você precisa ter o baú atual de 1000kg para fazer este upgrade!', 15000)
                return false
            end

            -- Adiciona mais 500 = 1500
            chestData["wrmuleouro"] = 1000
            vRP.setUData(user_id, "vRP:vehicle_chest_weight", json.encode(chestData))

            TriggerClientEvent('Notify', source, 'sucesso', 'Seu baú foi atualizado para 1500kg!', 15000)
            cb(true)
        end
    },
    ['debug_vehicle'] = {
        name = 'Debug Veículo',
        description = 'Item para debug de veículos',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            print("=== DEBUG VEHICLE ===")
            print("User ID:", user_id)

            -- Teste 1: Verificar se a tabela existe
            vRP.prepare("debug/test_table", "SHOW TABLES LIKE 'vrp_user_vehicles'")
            local tableExists = vRP.execute("debug/test_table", {})
            print("Table exists:", json.encode(tableExists))

            -- Teste 2: Verificar estrutura da tabela
            vRP.prepare("debug/describe_table", "DESCRIBE vrp_user_vehicles")
            local tableStructure = vRP.execute("debug/describe_table", {})
            print("Table structure:", json.encode(tableStructure))

            -- Teste 3: Verificar todos os veículos do usuário
            vRP.prepare("debug/check_all_vehicles", "SELECT * FROM vrp_user_vehicles WHERE user_id = @user_id")
            local allVehicles = vRP.execute("debug/check_all_vehicles", { user_id = user_id })
            print("All user vehicles:", json.encode(allVehicles))

            -- Teste 4: Verificar veículo específico
            vRP.prepare("debug/check_specific_vehicle",
                "SELECT * FROM vrp_user_vehicles WHERE user_id = @user_id AND vehicle = @vehicle")
            local specificVehicle = vRP.execute("debug/check_specific_vehicle",
                { user_id = user_id, vehicle = "wrmuleouro" })
            print("Specific vehicle (wrmuleouro):", json.encode(specificVehicle))

            -- Teste 5: Verificar com query simples
            vRP.prepare("debug/simple_check", "SELECT COUNT(*) as count FROM vrp_user_vehicles WHERE user_id = @user_id")
            local countResult = vRP.execute("debug/simple_check", { user_id = user_id })
            print("Total vehicles count:", json.encode(countResult))

            print("=====================")

            TriggerClientEvent('Notify', source, 'info', 'Debug executado. Verifique o console do servidor.', 5)
            cb(true)
        end
    },
    ['suprimentosarmas'] = {
        name = 'suprimentosarmas',
        description = 'suprimentosarmas',
        weight = 0.04,
    },
    ['suprimentosmunicao'] = {
        name = 'suprimentosmunicao',
        description = 'suprimentosmunicao',
        weight = 0.04,
    },
    ['pecadecarro'] = {
        name = 'Peça de Carro',
        description = 'Peça automotiva',
        weight = 0.01,
    },
    ['estojo'] = {
        name = 'Estojo',
        description = 'Estojo de ferramentas',
        weight = 0.01,
    },
    ['projetil'] = {
        name = 'Projétil',
        description = 'Projétil de munição',
        weight = 0.01,
    },
    ['cabos'] = {
        name = 'Cabos',
        description = 'Cabos elétricos',
        weight = 0.01,
    },
    ['testedegravidez'] = {
        name = 'Teste de Gravidez',
        description = 'Use para teste de gravidez',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            RESPONSE._closeInventory(source)

            if GetEntityModel(GetPlayerPed(source)) ~= GetHashKey('mp_f_freemode_01') then
                TriggerClientEvent("Notify", source, "negado", "Apenas mulheres podem usar este item.", 5)
                return cb({ false, "Apenas mulheres podem usar este item." })
            end

            local doctorId = vRP.prompt(source, 'Digite o ID do médico.', '')
            if not doctorId or doctorId == "" then
                TriggerClientEvent("Notify", source, "negado", "ID inválido.", 5)
                return cb({ false, "ID inválido." })
            end

            doctorId = parseInt(doctorId)
            if not vRP.getUserSource(doctorId) then
                TriggerClientEvent("Notify", source, "negado", "ID indisponível.", 5)
                return cb({ false, "ID indisponível." })
            end

            if not vRP.hasPermission(doctorId, 'hospital.permissao') then
                TriggerClientEvent("Notify", source, "negado", "Esse ID não é de um médico.", 5)
                return cb({ false, "Esse ID não é de um médico." })
            end

            local chance = math.random(10)
            local result = chance < 5 and "POSITIVO" or "NEGATIVO"
            TriggerClientEvent("Notify", source, "sucesso", "Seu teste de gravidez deu <b>" .. result .. "</b>.", 30000)

            cb(true)
        end
    },
    ['pacotesilegais'] = {
        name = 'Pacotes Ilegais',
        description = 'Pacotes com itens ilegais',
        weight = 0.40,
    },
    ['caixasmilitar'] = {
        name = 'Caixas Militar',
        description = 'Caixas de equipamentos militares',
        weight = 0.1,
    },
    ['municaomilitar'] = {
        name = 'Munição Militar',
        description = 'Munição de uso militar',
        weight = 0.1,
    },
    ['maquinadecabelo'] = {
        name = 'Máquina de Cabelo',
        description = 'Use para cortar cabelo',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            local nplayer = vRPclient.getNearestPlayer(source, 2)
            if nplayer then
                TriggerClientEvent("vrp_sound:source", source, 'barber', 0.5)
                TriggerClientEvent("item:sethair", nplayer, 51)
                TriggerClientEvent("Notify", source, "sucesso", "Cabelo cortado com sucesso!", 8000)
                cb({ false, "Cortando cabelo..." })
            else
                TriggerClientEvent("Notify", source, "negado", "Não há jogadores próximos.", 5000)
                cb({ false, "Não há jogadores próximos." })
            end
        end
    },
    ['kitsequestro'] = {
        name = 'Kit Sequestro',
        description = 'Kit com itens para sequestro',
        weight = 0.4,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.giveInventoryItem(user_id, "capuz", 2, true)
            vRP.giveInventoryItem(user_id, "algemas", 2, true)
            TriggerClientEvent("Notify", source, "sucesso", "Kit de sequestro aberto!", 8000)
            cb(true)
        end
    },
    ['ovodapascoa'] = {
        name = 'Ovo de Páscoa',
        description = 'Doce de páscoa',
        weight = 0.4,
        func = function(user_id, source, item, amount, slot, cb)
            RESPONSE._closeInventory(source)
            TriggerClientEvent("emotes", source, "comer5")
            TriggerClientEvent("Notify", source, "sucesso", "Ovo de páscoa consumido!", 8000)
            cb({ false, "Comendo ovo de páscoa..." })
        end
    },
    ['cristal'] = {
        name = 'Cristal',
        description = 'Cristal especial',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.removeInventoryItem(user_id, item, 1, true, slot)
            RESPONSE._closeInventory(source)
            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

            SetTimeout(10 * 1000, function()
                TriggerClientEvent('energeticos', source, true)
                TriggerClientEvent('setStamina', source, 35000)
                TriggerClientEvent('cancelando', source, false)
                TriggerClientEvent("Notify", source, "aviso", "<b>Droga</b> utilizada com sucesso.", 8000)
                vRPclient._DeletarObjeto(source)
            end)

            SetTimeout(45000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)
            cb({ false, "Cristal Consumido" })
        end
    },
    ['avisofac'] = {
        name = 'Aviso organização',
        description = 'Aviso oficial de organização',
        weight = 0.5,
    },
    ['viagra'] = {
        name = 'Viagra',
        description = 'Remédio para disfunção',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['tadalafila'] = {
        name = 'Tadalafila',
        description = 'Remédio para disfunção',
        weight = 0.5,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },

    -- ITENS VIP
    ['viporigin30'] = {
        name = 'VIP Origin 30 Dias',
        description = 'VIP Origin por 30 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 10)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "Origin")
            vRP.giveBankMoney(parseInt(user_id), 300000)
            vRP.giveInventoryItem(user_id, "kitxenon2", 1, true)
            vRP.giveInventoryItem(user_id, "roupas", 1, true)
            vRP.execute("vRP/add_priority", { id = user_id, priority = 100 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Origin 30 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },
    ['viporiginp30'] = {
        name = 'VIP Origin Plus 30 Dias',
        description = 'VIP Origin Plus por 30 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 11)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "OriginP")
            vRP.giveBankMoney(parseInt(user_id), 500000)
            vRP.giveInventoryItem(user_id, "kitxenon2", 1, true)
            vRP.giveInventoryItem(user_id, "roupas", 1, true)
            vRP.execute("vRP/add_priority", { id = user_id, priority = 100 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Origin Plus 30 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },
    ['vipplatinum30'] = {
        name = 'VIP Platinum 30 Dias',
        description = 'VIP Platinum por 30 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 12)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "Platinum")
            vRP.giveBankMoney(parseInt(user_id), 100000)
            vRP.giveInventoryItem(user_id, "kitxenon2", 1, true)
            vRP.giveInventoryItem(user_id, "roupas", 1, true)
            vRP.execute("vRP/add_priority", { id = user_id, priority = 90 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Platinum 30 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },
    ['vipplatinum15'] = {
        name = 'VIP Platinum 15 Dias',
        description = 'VIP Platinum por 15 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 12)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "Platinum")
            vRP.giveBankMoney(parseInt(user_id), 50000)
            vRP.giveInventoryItem(user_id, "kitxenon2", 1, true)
            vRP.giveInventoryItem(user_id, "roupas", 1, true)
            vRP.execute("vRP/add_priority", { id = user_id, priority = 90 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Platinum 15 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },
    ['vipgold30'] = {
        name = 'VIP Gold 30 Dias',
        description = 'VIP Gold por 30 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 8)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "Gold")
            vRP.execute("vRP/add_priority", { id = user_id, priority = 50 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Gold 30 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },
    ['vipgold15'] = {
        name = 'VIP Gold 15 Dias',
        description = 'VIP Gold por 15 dias',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local time = string.sub(item, 8)
            local vip_time = os.time() + time * 24 * 60 * 60
            vRP.execute("updateVipTime", { id = user_id, vip_time = vip_time })
            vRP.addUserGroup(parseInt(user_id), "Gold")
            vRP.execute("vRP/add_priority", { id = user_id, priority = 50 })
            TriggerClientEvent("Notify", source, "sucesso", "<b>VIP Gold 15 dias</b> utilizado com sucesso.", 8000)
            cb(true)
        end
    },

    -- ITENS ESPECIAIS ADICIONAIS
    ['alicate'] = {
        name = 'Alicate',
        description = 'Use para remover rastreadores',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            local vehicle, vehNet, plate, vehName, vehLock, vehBlock, vehHealth, vehModel, vehClass = vRPclient.vehList( source, 7)
            local plateUser = vRP.getUserByRegistration(plate)
            if plate then
                TriggerClientEvent("Notify", source, "sucesso", "Removendo rastreador do veículo...", 8000)
                TriggerClientEvent('progress', source, 15000)
                vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)
                SetTimeout(15000, function()
                    vRPclient._stopAnim(source, false)
                    exports["vrp_tracker"]:RemoveTrackerByPlate(plate)
                    TriggerClientEvent("Notify", source, "sucesso", "Rastreador removido com sucesso!", 8000)
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                cb({ false, "Nenhum veículo próximo." })
            end
        end
    },
    ['lambari'] = {
        name = 'Lambari',
        description = 'Peixe pescado',
        weight = 0.1,
    },
    ['novalgina'] = {
        name = 'Novalgina',
        description = 'Remédio analgésico',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                RESPONSE._usePill(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['xerelto'] = {
        name = 'Xerelto',
        description = 'Anticoagulante',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 20000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(20000, function()
                TriggerClientEvent("resetBleeding", source)
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "sucesso", "<b>Xerelto</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['allegra'] = {
        name = 'Allegra',
        description = 'Antialérgico',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['oxigenio'] = {
        name = 'Oxigênio',
        description = 'Use para equipar scuba',
        weight = 10.0,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 3000)
            vRPclient._playAnim(source, true, { "oddjobs@basejump@ig_15", "puton_parachute" }, false)

            SetTimeout(3000, function()
                if not RESPONSE.checkScuba(source) then
                    RESPONSE._setScuba(source, true)
                    TriggerClientEvent("Notify", source, "sucesso", "Roupa de <b>Mergulho</b> colocada com sucesso.",
                        8000)
                else
                    TriggerClientEvent("Notify", source, "negado",
                        "Você já possui uma scuba equipada, para retirá-la /rscuba", 5)
                end
            end)

            cb({ false, "Equipando scuba..." })
        end
    },
    ['topazio'] = {
        name = 'Topázio',
        description = 'Pedra preciosa',
        weight = 0.1,
    },
    ['carrodesom'] = {
        name = 'Carro de Som',
        description = 'Use para ganhar carro de som',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            vRP.giveInventoryItem(user_id, "money", 100000, true)
            TriggerClientEvent("Notify", source, "sucesso", "Você ganhou R$ 100.000 pelo carro de som!", 8000)
            cb(true)
        end
    },
    ['rgb'] = {
        name = 'RGB',
        description = 'Use para ativar RGB no carro',
        weight = 0.7,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('rbgcar', source)
            TriggerClientEvent("Notify", source, "sucesso", "RGB ativado no veículo!", 8000)
            cb(true)
        end
    },
    ['salapersonalizada'] = {
        name = 'Sala Personalizada',
        description = 'Use para criar sala personalizada',
        weight = 10.0,
        func = function(user_id, source, item, amount, slot, cb)
            -- exports['live_arena']:tryCreateRoom(source)
            TriggerClientEvent("Notify", source, "sucesso", "Sala personalizada criada!", 8000)
            cb({ false, "Criando sala personalizada..." })
        end
    },
    ['logsinvasao'] = {
        name = 'Logs de Invasão',
        description = 'Logs de atividades de invasão',
        weight = 0.1,
    },
    ['keysinvasao'] = {
        name = 'Keys Invasão',
        description = 'Chaves para invasão',
        weight = 0.1,
    },
    ['defibrillator'] = {
        name = 'Desfibrilador',
        description = 'Use para reanimar pessoas',
        weight = 0.7,
    },
    ['pulseiraroubada'] = {
        name = 'Pulseira Roubada',
        description = 'Pulseira roubada para vender',
        weight = 0.2,
    },
    ['firstaid'] = {
        name = 'First Aid',
        description = 'Kit de primeiros socorros',
        weight = 0.7,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local nplayer = vRPclient.getNearestPlayer(source, 2)
                if nplayer then
                    if GetEntityHealth(GetPlayerPed(nplayer)) <= 101 then
                        if vRP.hasPermission(user_id, "paramedico.permissao") then
                            TriggerClientEvent('progress', source, 15000)
                            vRPclient._playAnim(source, false, { "mini@cpr@char_a@cpr_str", "cpr_pumpchest" }, true)

                            SetTimeout(15000, function()
                                vRPclient._stopAnim(source, false)
                                TriggerClientEvent("Notify", source, "sucesso", "Primeiros socorros aplicados!", 8000)
                            end)

                            cb({ false, "Aplicando primeiros socorros..." })
                        else
                            TriggerClientEvent('progress', source, 15000)
                            vRPclient._playAnim(source, false, { "mini@cpr@char_a@cpr_str", "cpr_pumpchest" }, true)

                            SetTimeout(15000, function()
                                vRPclient._stopAnim(source, false)
                                TriggerClientEvent("Notify", source, "sucesso", "Primeiros socorros aplicados!", 8000)
                            end)

                            cb(true)
                        end
                    else
                        TriggerClientEvent("Notify", source, "negado", "A pessoa não precisa de primeiros socorros.", 5)
                        cb({ false, "A pessoa não precisa de primeiros socorros." })
                    end
                else
                    TriggerClientEvent("Notify", source, "negado", "Nenhuma pessoa próxima.", 5)
                    cb({ false, "Nenhuma pessoa próxima." })
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Você não pode usar isso dentro do veículo.", 5)
                cb({ false, "Você não pode usar isso dentro do veículo." })
            end
        end
    },
    ['ecstasy'] = {
        name = 'Ecstasy',
        description = 'Droga sintética',
        weight = 0.8,
    },
    ['aliancacasamento'] = {
        name = 'Aliança de Casamento',
        description = 'Aliança para casamento',
        weight = 0.0,
    },
    ['aliancanoivado'] = {
        name = 'Aliança de Noivado',
        description = 'Aliança para noivado',
        weight = 0.0,
    },
    ['aliancaroubada'] = {
        name = 'Aliança Roubada',
        description = 'Aliança roubada para vender',
        weight = 0.0,
    },
    ['repairkit2'] = {
        name = 'Repair Kit 2',
        description = 'Kit de reparo avançado',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            if not vRPclient.isInVehicle(source) then
                local vehicle = vRPclient.getNearestVehicle(source, 7)
                if vehicle then
                    if vRP.hasPermission(user_id, "mecanico.permissao") then
                        TriggerClientEvent('progress', source, 15000)
                        vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)

                        SetTimeout(15000, function()
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('reparar', source)
                            TriggerClientEvent("Notify", source, "sucesso", "Veículo reparado!", 8000)
                        end)

                        cb({ false, "Reparando veículo..." })
                    else
                        TriggerClientEvent('progress', source, 15000)
                        vRPclient._playAnim(source, false, { "mini@repair", "fixing_a_player" }, true)

                        SetTimeout(15000, function()
                            vRPclient._stopAnim(source, false)
                            TriggerClientEvent('reparar', source)
                            TriggerClientEvent("Notify", source, "sucesso", "Veículo reparado!", 8000)
                        end)

                        cb(true)
                    end
                else
                    TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                    cb({ false, "Nenhum veículo próximo." })
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Saia do veículo para usar o kit.", 5)
                cb({ false, "Saia do veículo para usar o kit." })
            end
        end
    },
    ['eventkey'] = {
        name = 'Event Key',
        description = 'Chave especial para eventos',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local identity = vRP.getUserIdentity(user_id)
            local plate, mName, mNet, mPortaMalas, mPrice, mLock, mModel = vRPclient.ModelName(source, 7)
            if plate then
                RESPONSE._closeInventory(source)
                TriggerClientEvent('progress', source, 10000)
                vRPclient._playSound(source, "Timer_10s", "DLC_HALLOWEEN_FVJ_Sounds")
                vRPclient._playAnim(source, false,
                    { "anim@amb@clubhouse@tutorial@bkr_tut_ig3@", "machinic_loop_mechandplayer" }, true)

                SetTimeout(10000, function()
                    vRPclient._stopAnim(source, false)
                    if math.random(100) >= 90 then
                        TriggerClientEvent("vrp_sound:source", source, 'lock', 0.5)
                        TriggerClientEvent("Notify", source, "sucesso", "Parabéns, você conseguiu!", 8000)
                    else
                        TriggerClientEvent("Notify", source, "negado", "Infelizmente não foi desta vez.", 8000)
                    end
                end)

                cb(true)
            else
                TriggerClientEvent("Notify", source, "negado", "Nenhum veículo próximo.", 5)
                cb({ false, "Nenhum veículo próximo." })
            end
        end
    },
    ['vipplaca'] = {
        name = 'VIP Placa',
        description = 'Use para alterar sua placa',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            local descricao = vRP.prompt(source, "Mudança de placa (8 Caractéres):", "")
            if descricao and string.len(descricao) == 8 then
                local descricao2 = string.upper(descricao)
                if vRP.getUserByRegistration(descricao2) == nil then
                    vRP.execute("vRP/update_registration", { user_id = user_id, registration = descricao2 })
                    TriggerClientEvent("Notify", source, "sucesso", "<b>Placa modificada</b> com sucesso, favor relogar.",
                        8000)
                    cb(true)
                else
                    TriggerClientEvent("Notify", source, "negado", "Esta placa já existe.", 5)
                    cb({ false, "Esta placa já existe." })
                end
            else
                TriggerClientEvent("Notify", source, "negado", "Placa deve ter exatamente 8 caractéres.", 5)
                cb({ false, "Placa deve ter exatamente 8 caractéres." })
            end
        end
    },
    ['pasta-base'] = {
        name = 'Pasta Base',
        description = 'Matéria-prima para crack',
        weight = 0.25,
    },
    ['pasta-impura'] = {
        name = 'Pasta Impura',
        description = 'Pasta não refinada',
        weight = 0.2,
    },
    ['cocainaparavenda'] = {
        name = 'Cocaína para Venda',
        description = 'Cocaína processada para venda',
        weight = 0.2,
    },
    ['cocaina-malote'] = {
        name = 'Malote de Cocaína',
        description = 'Malote com cocaína',
        weight = 0.8,
    },
    ['vipgaragem'] = {
        name = 'VIP Garagem',
        description = 'Use para ganhar +1 garagem',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            -- vRP.execute("creative/update_garages", { id = user_id })
            TriggerClientEvent("Notify", source, "sucesso", "<b>Adicionado +1 Garagem</b> com sucesso.", 8000)
            cb(true)
        end
    },
    ['cirurgia'] = {
        name = 'Cirurgia',
        description = 'Use para reiniciar seu personagem',
        weight = 1.0,
        func = function(user_id, source, item, amount, slot, cb)
            local ok = vRP.request(source,
                'Você está prestes a reiniciar seu personagem. Você retornará ao spawn inicial. Deseja continuar?', 45)
            if ok then
                cb(true)
                vRP.execute("resetController", { user_id = user_id })
                exports.nation_creator:setSurgery(user_id)

                Wait(150)
                DropPlayer(source, "Você entrou numa cirurgia. Entre novamente para reconstruir seu personagem.")
            else
                cb({ false, "Cirurgia cancelada." })
            end
        end
    },
    ['ferramenta'] = {
        name = 'Ferramenta',
        description = 'Ferramenta para trabalhos',
        weight = 0.01,
    },
    ['sais'] = {
        name = 'sais',
        description = 'Ferramenta para trabalhos',
        weight = 0.01,
    },
    ['vipaparencia'] = {
        name = 'VIP Aparência',
        description = 'Use para alterar aparência',
        weight = 0.0,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("Notify", source, "sucesso", "Aparência VIP ativada!", 8000)
            cb({ false, "Aparência VIP ativada!" })
        end
    },
    ['pano'] = {
        name = 'Pano',
        description = 'Tecido para fabricação',
        weight = 0.01,
    },
    ['armacao'] = {
        name = 'Armação',
        description = 'Estrutura para armas',
        weight = 0.01,
    },
    ['placademetal'] = {
        name = 'Placa de Metal',
        description = 'Material metálico',
        weight = 0.01,
    },
    ['docedeecstasy'] = {
        name = 'Doce de Ecstasy',
        description = 'Droga disfarçada de doce',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            if not RESPONSE.isInDrug(source) then
                vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)

                SetTimeout(2000, function()
                    vRPclient._stopAnim(source, false)
                    TriggerClientEvent("inventory:useDrugs", source, item)
                end)

                cb({ true, "Você está comendo o doce" })
            else
                TriggerClientEvent("Notify", source, "negado", "Você já está sob efeito de uma droga.", 5)
                cb({ false, "Você já está sob efeito de uma droga." })
            end
        end
    },
    ['rouparoubada'] = {
        name = 'Roupa Roubada',
        description = 'Roupa roubada para vender',
        weight = 3.0,
    },

    -- ITENS ADICIONAIS DO ARQUIVO ANTIGO
    ['muda-cannabis'] = {
        name = 'Muda Cannabis',
        description = 'Muda para plantar cannabis',
        weight = 0.8,
    },
    ['bucha-cannabis'] = {
        name = 'Bucha Cannabis',
        description = 'Cannabis em bucha',
        weight = 0.8,
    },
    ['taurina'] = {
        name = 'Taurina',
        description = 'Suplemento energético',
        weight = 0.4,
    },
    ['cafeina'] = {
        name = 'Cafeína',
        description = 'Estimulante',
        weight = 0.2,
    },
    ['cristalrefinado'] = {
        name = 'Cristal Refinado',
        description = 'Cristal processado',
        weight = 0.4,
    },
    ['cannabis'] = {
        name = 'Cannabis',
        description = 'Cannabis natural',
        weight = 0.1,
    },
    ['hidrazida'] = {
        name = 'Hidrazida',
        description = 'Produto químico',
        weight = 0.1,
    },
    ['acidocloridrico'] = {
        name = 'Ácido Clorídrico',
        description = 'Ácido corrosivo',
        weight = 0.1,
    },
    ['pirazol'] = {
        name = 'Pirazol',
        description = 'Composto químico',
        weight = 0.4,
    },
    ['pastadecrack'] = {
        name = 'Pasta de Crack',
        description = 'Matéria-prima para crack',
        weight = 0.1,
    },
    ['maconhaparavenda'] = {
        name = 'Maconha para Venda',
        description = 'Maconha processada para venda',
        weight = 0.2,
    },
    ['sementedeabobora'] = {
        name = 'Semente de Abóbora',
        description = 'Semente para plantar',
        weight = 0.5,
    },
    ['sementedeabacaxi'] = {
        name = 'Semente de Abacaxi',
        description = 'Semente para plantar',
        weight = 0.5,
    },
    ['tangerina'] = {
        name = 'Tangerina',
        description = 'Fruto cultivado',
        weight = 0.5,
    },
    ['madeira'] = {
        name = 'Madeira',
        description = 'Madeira coletada',
        weight = 0.8,
    },
    ['manga'] = {
        name = 'Manga',
        description = 'Fruto cultivado',
        weight = 0.5,
    },
    ['abacaxi'] = {
        name = 'Abacaxi',
        description = 'Fruto cultivado',
        weight = 0.5,
    },
    ['abobora'] = {
        name = 'Abóbora',
        description = 'Fruto cultivado',
        weight = 0.5,
    },
    ['semente'] = {
        name = 'Semente',
        description = 'Semente genérica',
        weight = 0.1,
    },
    ['backpackp'] = {
        name = 'Mochila P',
        description = 'Mochila pequena',
        weight = 1.0,
    },
    ['backpackm'] = {
        name = 'Mochila M',
        description = 'Mochila média',
        weight = 2.0,
    },
    ['backpackg'] = {
        name = 'Mochila G',
        description = 'Mochila grande',
        weight = 3.0,
    },
    ['backpackx'] = {
        name = 'Mochila X',
        description = 'Mochila extra grande',
        weight = 4.0,
    },
    ['eletronics'] = {
        name = 'Eletrônicos',
        description = 'Componentes eletrônicos',
        weight = 0.1,
    },
    ["pig"] = {
        name = "Pig",
        description = "Pig",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_pig", 49, 24817, -0.01,
                0.45, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["bunny"] = {
        name = "Coelhinho",
        description = "Coelhinho",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_bunny", 49, 24817, -0.01,
                0.45, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["pinguim"] = {
        name = "Pinguim",
        description = "Pinguim",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_pinguim", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["husky"] = {
        name = "Husky",
        description = "Husky",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_husky", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["dog"] = {
        name = "Cachorro",
        description = "Cachorro",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_dog", 49, 24817, -0.01,
                0.45, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["balaoa"] = {
        name = "Balão Azul",
        description = "Balão Azul",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop", "bag_balaoa",
                49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["polvo"] = {
        name = "Polvo",
        description = "Polvo",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_polvo", 49, 24817, -0.10,
                -0.30, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["coelho"] = {
        name = "Coelho",
        description = "Coelho",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_coelho", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["balaoam"] = {
        name = "Balão Amarelo",
        description = "Balão Amarelo",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop",
                "bag_balaoam", 49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["rose"] = {
        name = "Rosa",
        description = "Rosa",
        weight = 0.1,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop",
                "prop_single_rose", 49, 18905, 0.13, 0.15, 0.0, -100.0, 0.0, -20.0)
        end,
    },
    ["girafa"] = {
        name = "Girafa",
        description = "Girafa",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_girafa", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["balaov"] = {
        name = "Balão Verde",
        description = "Balão Verde",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop", "bag_balaov",
                49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["coelho"] = {
        name = "Coelho",
        description = "Coelho",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_coelho", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["panda"] = {
        name = "Panda",
        description = "Panda",
        weight = 2.0,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "mah_panda", 49, 24817, 0.0,
                0.40, 0.0, -180.0, -90.0, 0.0)
        end
    },
    ["balaover"] = {
        name = "Balão Vermelho",
        description = "Balão Vermelho",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop",
                "bag_balaover", 49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["balaoro"] = {
        name = "Balão Roxo",
        description = "Balão Roxo",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop",
                "bag_balaoro", 49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["balaor"] = {
        name = "Balão Rosa",
        description = "Balão Rosa",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "anim@heists@humane_labs@finale@keycards", "ped_a_enter_loop", "bag_balaor",
                49, 18905, 0.1, 0.4, -0.2, -100.0, -100.0, 30.0)
        end,
    },
    ["cow"] = {
        name = "Vaca",
        description = "Vaca",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_cow", 49, 24817, -0.01,
                0.45, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["pony"] = {
        name = "Pônei",
        description = "Pônei",
        weight = 0.2,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "bag_pony", 49, 24817, -0.01,
                0.45, -0.02, -180.0, -90.0, 0.0)
        end,
    },
    ["teddy"] = {
        name = "Teddy",
        description = "Teddy",
        weight = 0.8,
        keep_item = true,
        func = function(user_id, source, item, amount, slot, cb)
            vRPclient.closeInventory(source)
            vRPclient._CarregarObjeto(source, "impexp_int-0", "mp_m_waremech_01_dual-0", "v_ilev_mr_rasberryclean", 49,
                24817, -0.20, 0.46, -0.016, -180.0, -90.0, 0.0)
        end,
    },
    ['buscofem'] = {
        name = 'Buscofem',
        description = 'Remédio analgésico',
        weight = 0.1,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent('progress', source, 5000)
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            SetTimeout(5000, function()
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)

            cb(true)
        end
    },
    ['cnhroubada'] = {
        name = 'CNH Roubada',
        description = 'Carteira de motorista roubada',
        weight = 0.7,
    },
    ['pintado'] = {
        name = 'Pintado',
        description = 'Peixe pintado',
        weight = 0.1,
    },
    ['airdrop'] = {
        name = 'Air Drop',
        description = 'Caixa de suprimentos aérea',
        weight = 40.0,
    },


    -- PISTOLAS
    ['WEAPON_SNSPISTOL_MK2'] = {
        name = 'Fajuta',
        description = 'Equipe uma Fajuta',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {   -- SISTEMA DE REPARAR ARMA
            money = 80000, -- DINHEIRO NECESSARIO
            items = {
                -- ['roupas'] = 1, -- ITEMS PARA REPARAR
            },
            onBreak = { -- AO QUEBRAR A ARMA PELA SEGUNDA VEZ VAI GIVAR ESSE ITEM
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_SNSPISTOL_MK2'] = {
        name = 'M-Fajuta',
        description = 'Recarregue uma Fajuta',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PISTOL_MK2'] = {
        name = 'Five-Seven',
        description = 'Equipe uma Five-Seven',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 30000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_PISTOL_MK2'] = {
        name = 'M-Five-Seven',
        description = 'Recarregue uma Five-Seven',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PISTOL50'] = {
        name = 'Desert Eagle',
        description = 'Equipe uma Desert Eagle',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_PISTOL50'] = {
        name = 'M-Desert',
        description = 'Recarregue uma Desert Eagle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMBATPISTOL'] = {
        name = 'Glock',
        description = 'Equipe uma Glock',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 40000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_COMBATPISTOL'] = {
        name = 'M-Glock',
        description = 'Recarregue uma Glock',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PISTOL'] = {
        name = 'Pistol',
        description = 'Equipe uma Pistol',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_PISTOL'] = {
        name = 'M-Pistol',
        description = 'Recarregue uma Pistol',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_HEAVYPISTOL'] = {
        name = 'Heavy Pistol',
        description = 'Equipe uma Heavy Pistol',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HEAVYPISTOL'] = {
        name = 'M-Heavy Pistol',
        description = 'Recarregue uma Heavy Pistol',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_REVOLVER'] = {
        name = 'Revolver',
        description = 'Equipe um Revolver',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_REVOLVER'] = {
        name = 'M-Revolver',
        description = 'Recarregue um Revolver',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_GADGETPISTOL'] = {
        name = 'GADGET PISTOL',
        description = 'Equipe uma GADGET PISTOL',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_GADGETPISTOL'] = {
        name = 'M-GADGET PISTOL',
        description = 'Recarregue uma GADGET PISTOL',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    -- MACHADOS E ARMAS BRANCAS
    ['WEAPON_HATCHET'] = {
        name = 'Machado',
        description = 'Equipe um Machado',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_KNIFE'] = {
        name = 'Faca',
        description = 'Equipe uma Faca',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_DAGGER'] = {
        name = 'Dagger',
        description = 'Equipe um Dagger',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_KNUCKLE'] = {
        name = 'Knuckle',
        description = 'Equipe um Knuckle',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_MACHETE'] = {
        name = 'Machete',
        description = 'Equipe um Machete',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_SWITCHBLADE'] = {
        name = 'SwitchBlade',
        description = 'Equipe uma SwitchBlade',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_WRENCH'] = {
        name = 'Chave Inglesa',
        description = 'Equipe uma Chave Inglesa',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_HAMMER'] = {
        name = 'Martelo',
        description = 'Equipe um Martelo',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_GOLFCLUB'] = {
        name = 'Taco de Golf',
        description = 'Equipe um Taco de Golf',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_CROWBAR'] = {
        name = 'Pé de Cabra',
        description = 'Equipe um Pé de Cabra',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_FLASHLIGHT'] = {
        name = 'Lanterna',
        description = 'Equipe uma Lanterna',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_BAT'] = {
        name = 'Bastão de Beisebol',
        description = 'Equipe um Bastão de Beisebol',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_BOTTLE'] = {
        name = 'Garrafa',
        description = 'Equipe uma Garrafa',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_BATTLEAXE'] = {
        name = 'Machado de Guerra',
        description = 'Equipe um Machado de Guerra',
        weight = 3.0,
        type = 'equip',
    },
    ['WEAPON_POOLCUE'] = {
        name = 'Taco de Sinuca',
        description = 'Equipe um Taco de Sinuca',
        weight = 3.0,
        type = 'equip',
    },
    ['GADGET_PARACHUTE'] = {
        name = 'Paraquedas',
        description = 'Equipe um Paraquedas',
        weight = 3.0,
        durability = {
            type = {
                day = false
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['WEAPON_FLARE'] = {
        name = 'Sinalizador',
        description = 'Equipe um Sinalizador',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    -- BOMBAS

    ['WEAPON_STICKYBOMB'] = {
        name = 'Bomba Adesiva',
        description = 'Equipe uma Bomba Adesiva',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    ['WEAPON_PROXMINE'] = {
        name = 'Bomba de Proximidade',
        description = 'Equipe uma Bomba de Proximidade',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    ['WEAPON_PIPEBOMB'] = {
        name = 'Bomba de Cano',
        description = 'Equipe uma Bomba de Cano',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    ['AMMO_STICKYBOMB'] = {
        name = 'Munição Adesiva',
        description = 'Recarregue uma Bomba Adesiva',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'recharge',
    },

    ['AMMO_PROXMINE'] = {
        name = 'Munição de Proximidade',
        description = 'Recarregue uma Bomba de Proximidade',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'recharge',
    },

    ['AMMO_PIPEBOMB'] = {
        name = 'Munição de Cano',
        description = 'Recarregue uma Bomba de Cano',
        weight = 3.0,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'recharge',
    },

    -- SUBMETRALHADORAS
    ['WEAPON_MACHINEPISTOL'] = {
        name = 'Tec-9',
        description = 'Equipe uma Tec-9',
        weight = 6.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 60000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_MACHINEPISTOL'] = {
        name = 'M-Tec-9',
        description = 'Recarregue uma Tec-9',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SMG_MK2'] = {
        name = 'Smg MK2',
        description = 'Equipe uma Smg MK2',
        weight = 6.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_SMG_MK2'] = {
        name = 'M-Smg MK2',
        description = 'Recarregue uma Smg MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SMG'] = {
        name = 'SMG',
        description = 'Equipe uma SMG',
        weight = 6.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_SMG'] = {
        name = 'M-SMG',
        description = 'Recarregue uma SMG',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_ASSAULTSMG'] = {
        name = 'MTAR',
        description = 'Equipe uma MTAR',
        weight = 6.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_ASSAULTSMG'] = {
        name = 'M-MTAR',
        description = 'Recarregue uma MTAR',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MICROSMG'] = {
        name = 'MICROSMG',
        description = 'Equipe uma MICROSMG',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_MICROSMG'] = {
        name = 'M-MICROSMG',
        description = 'Recarregue uma MICROSMG',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMBATPDW'] = {
        name = 'Pdw',
        description = 'Equipe uma Pdw',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_COMBATPDW'] = {
        name = 'M-Pdw',
        description = 'Recarregue uma Pdw',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MINISMG'] = {
        name = 'Mini SMG',
        description = 'Equipe uma Mini SMG',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MINISMG'] = {
        name = 'M-Mini SMG',
        description = 'Recarregue uma Mini SMG',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    --SHOTGUNS
    ['WEAPON_SAWNOFFSHOTGUN'] = {
        name = 'Shotgun',
        description = 'Equipe uma Shotgun',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_SAWNOFFSHOTGUN'] = {
        name = 'M-Shotgun',
        description = 'Recarregue uma Shotgun',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PUMPSHOTGUN_MK2'] = {
        name = 'Pump Shotgun MK2',
        description = 'Equipe uma Pump Shotgun MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_PUMPSHOTGUN_MK2'] = {
        name = 'M-Pump Shotgun MK2',
        description = 'Recarregue uma Pump Shotgun MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PUMPSHOTGUN'] = {
        name = 'Pump Shotgun',
        description = 'Equipe uma Pump Shotgun',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_PUMPSHOTGUN'] = {
        name = 'M-Pump Shotgun',
        description = 'Recarregue uma Pump Shotgun',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_ASSAULTSHOTGUN'] = {
        name = 'Assault Shotgun',
        description = 'Equipe uma Assault Shotgun',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_ASSAULTSHOTGUN'] = {
        name = 'M-Assault Shotgun',
        description = 'Recarregue uma Assault Shotgun',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_BULLPUPSHOTGUN'] = {
        name = 'BullPup',
        description = 'Equipe uma BullPup',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_BULLPUPSHOTGUN'] = {
        name = 'M-BullPup',
        description = 'Recarregue uma BullPup',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_HEAVYSHOTGUN'] = {
        name = 'Heavy Shotgun',
        description = 'Equipe uma Heavy Shotgun',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HEAVYSHOTGUN'] = {
        name = 'M-Heavy Shotgun',
        description = 'Recarregue uma Heavy Shotgun',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_DBSHOTGUN'] = {
        name = 'Db Shot',
        description = 'Equipe uma Db Shot',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_DBSHOTGUN'] = {
        name = 'M-Db Shot',
        description = 'Recarregue uma Db Shot',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMBATSHOTGUN'] = {
        name = 'Combat Shotgun',
        description = 'Equipe uma Combat Shotgun',
        weight = 3.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_COMBATSHOTGUN'] = {
        name = 'M-Combat Shotgun',
        description = 'Recarregue uma Combat Shotgun',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    -- FUZIS
    ['WEAPON_FAL'] = {
        name = 'Parafal',
        description = 'Equipe uma Parafal',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_FAL'] = {
        name = 'Parafal',
        description = 'Recarregue uma Parafal',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },
    ['WEAPON_AKDODINO'] = {
        name = 'Ak do Dino',
        description = 'Equipe uma Ak do Dino',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_AKDODINO'] = {
        name = 'M-Ak do Dino',
        description = 'Recarregue uma Ak do Dino',
        weight = 0.05,
        aggrupable = 9999999,
        type = 'recharge',
    },
    ['WEAPON_ARTAMBOR'] = {
        name = 'AR Tambor',
        description = 'Equipe uma AR Tambor',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_ARTAMBOR'] = {
        name = 'M-AR Tambor',
        description = 'Recarregue uma AR Tambor',
        weight = 0.05,
        aggrupable = 9999999,
        type = 'recharge',
    },
    ['WEAPON_HK416AVANCO'] = {
        name = 'HK416 AVANCO',
        description = 'Equipe uma HK416 AVANCO',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HK416AVANCO'] = {
        name = 'M-HK416 AVANCO',
        description = 'Recarregue uma HK416 AVANCO',
        weight = 0.05,
        aggrupable = 9999999,
        type = 'recharge',
    },
    ['WEAPON_MCXC'] = {
        name = 'MCXC',
        description = 'Equipe uma MCXC',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MCXC'] = {
        name = 'M-MCXC',
        description = 'Recarregue uma MCXC',
        weight = 0.05,
        aggrupable = 9999999,
        type = 'recharge',
    },
    ['WEAPON_HK416OCEAN'] = {
        name = 'HK416 OCEAN',
        description = 'Equipe uma HK416 OCEAN',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HK416OCEAN'] = {
        name = 'M-HK416 OCEAN',
        description = 'Recarregue uma HK416 OCEAN',
        weight = 0.05,
        aggrupable = 9999999,
        type = 'recharge',
    },
    ['WEAPON_SCARH'] = {
        name = 'Scar H',
        description = 'Equipe uma Scar H',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_SCARH'] = {
        name = 'M-Scar H',
        description = 'Recarregue uma Scar H',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },
    ['WEAPON_NAVYCARBINE'] = {
        name = 'Navycarbine',
        description = 'Equipe uma Navycarbine',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['WEAPON_MP9'] = {
        name = 'MP 9',
        description = 'Equipe uma MP 9',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MP9'] = {
        name = 'MP 9',
        description = 'Recarregue uma MP 9',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },
    ['WEAPON_ASSAULTRIFLE'] = {
        name = 'AK 47',
        description = 'Equipe uma AK 47',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['WEAPON_ASSAULTRIFLE_MK2'] = {
        name = 'AK 47 MK2',
        description = 'Equipe uma AK 47 MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_ASSAULTRIFLE'] = {
        name = 'M-AK-47',
        description = 'Recarregue uma AK-47',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['AMMO_ASSAULTRIFLE_MK2'] = {
        name = 'M-AK-47',
        description = 'Recarregue uma AK-47 MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SPECIALCARBINE_MK2'] = {
        name = 'G3',
        description = 'Equipe uma G3',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_SPECIALCARBINE_MK2'] = {
        name = 'M-G3',
        description = 'Recarregue uma G3',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_CARBINERIFLE_MK2'] = {
        name = 'M4',
        description = 'Equipe uma M4',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_CARBINERIFLE_MK2'] = {
        name = 'M-M4',
        description = 'Recarregue uma M4',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_CARBINERIFLE'] = {
        name = 'M4A1',
        description = 'Equipe uma M4A1',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_CARBINERIFLE'] = {
        name = 'M-M4A1',
        description = 'Recarregue uma M4A1',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SPECIALCARBINE'] = {
        name = 'Parafal',
        description = 'Equipe uma Parafal',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_SPECIALCARBINE'] = {
        name = 'M-Parafal',
        description = 'Recarregue uma Parafal',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_ADVANCEDRIFLE'] = {
        name = 'Advanced Rifle',
        description = 'Equipe uma Advanced Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_ADVANCEDRIFLE'] = {
        name = 'M-Advanced Rifle',
        description = 'Recarregue uma Advanced Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_BULLPUPRIFLE'] = {
        name = 'Bullpup',
        description = 'Equipe uma Bullpup',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_BULLPUPRIFLE'] = {
        name = 'M-Bullpup',
        description = 'Recarregue uma Bullpup',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_BULLPUPRIFLE_MK2'] = {
        name = 'Bullpup MK2',
        description = 'Equipe uma Bullpup MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_BULLPUPRIFLE_MK2'] = {
        name = 'M-Bullpup MK2',
        description = 'Recarregue uma Bullpup MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMPACTRIFLE'] = {
        name = 'Compact Rifle',
        description = 'Equipe uma Compact Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_COMPACTRIFLE'] = {
        name = 'M-Compact Rifle',
        description = 'Recarregue uma Compact Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MILITARYRIFLE'] = {
        name = 'Military Rifle',
        description = 'Equipe uma Military Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        onRepair = {
            money = 80000,
            items = {
                -- ['roupas'] = 1,
            },
            onBreak = {
                item = "sucata",
                amount = 25,
            },
        },
        type = 'equip',
    },
    ['AMMO_MILITARYRIFLE'] = {
        name = 'M-Military Rifle',
        description = 'Recarregue uma Military Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_HEAVYRIFLE'] = {
        name = 'Heavy Rifle',
        description = 'Equipe uma Heavy Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HEAVYRIFLE'] = {
        name = 'M-Heavy Rifle',
        description = 'Recarregue uma Heavy Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_TACTICALRIFLE'] = {
        name = 'Tactical Rifle',
        description = 'Equipe uma Tactical Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_TACTICALRIFLE'] = {
        name = 'M-Tactical Rifle',
        description = 'Recarregue uma Tactical Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    --PESADAS/SNIPERS
    ['WEAPON_MG'] = {
        name = 'MG',
        description = 'Equipe uma MG',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MG'] = {
        name = 'M-MG',
        description = 'Recarregue uma MG',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMBATMG'] = {
        name = 'Combat MG',
        description = 'Equipe uma Combat MG',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_COMBATMG'] = {
        name = 'M-Combat MG',
        description = 'Recarregue uma Combat MG',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_COMBATMG_MK2'] = {
        name = 'Combat MG MK2',
        description = 'Equipe uma Combat MG MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_COMBATMG_MK2'] = {
        name = 'M-Combat MG MK2',
        description = 'Recarregue uma Combat MG MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SNIPERRIFLE'] = {
        name = 'Sniper Rifle',
        description = 'Equipe uma Sniper Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_SNIPERRIFLE'] = {
        name = 'M-Sniper Rifle',
        description = 'Recarregue uma Sniper Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_HEAVYSNIPER'] = {
        name = 'Heavy Sniper',
        description = 'Equipe uma Heavy Sniper',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HEAVYSNIPER'] = {
        name = 'M-Heavy Sniper',
        description = 'Recarregue uma Heavy Sniper',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_HEAVYSNIPER_MK2'] = {
        name = 'Heavy Sniper MK2',
        description = 'Equipe uma Heavy Sniper MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_HEAVYSNIPER_MK2'] = {
        name = 'M-Heavy Sniper MK2',
        description = 'Recarregue uma Heavy Sniper MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MARKSMANRIFLE'] = {
        name = 'Mark Sman Rifle',
        description = 'Equipe uma Mark Sman Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MARKSMANRIFLE'] = {
        name = 'M-Mark Sman Rifle',
        description = 'Recarregue uma Mark Sman Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MARKSMANRIFLE_MK2'] = {
        name = 'Mark Sman Rifle MK2',
        description = 'Equipe uma Mark Sman Rifle MK2',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MARKSMANRIFLE_MK2'] = {
        name = 'M-Mark Sman Rifle MK2',
        description = 'Recarregue uma Mark Sman Rifle MK2',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_PRECISIONRIFLE'] = {
        name = 'Precision Rifle',
        description = 'Equipe uma Precision Rifle',
        weight = 8.0,
        durability = {
            type = {
                day = 7,
                --shooting = 200
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_PRECISIONRIFLE'] = {
        name = 'M-Precision Rifle',
        description = 'Recarregue uma Precision Rifle',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    -- ARMAS CUSTOMIZADAS ADICIONAIS
    ['WEAPON_PARACHUTE'] = {
        name = 'Paraquedas',
        description = 'Equipe um Paraquedas',
        weight = 3.0,
        durability = {
            type = {
                day = false
            },
            destroy_on_break = true,
        },
        type = 'equip',
        func = function(user_id, source, item, amount, slot, cb)
            vRP.giveWeapons(source, { ["GADGET_PARACHUTE"] = { ammo = 100 } })
            cb(true)
        end
    },

    -- POLICIAIS
    ['WEAPON_STUNGUN'] = {
        name = 'Tazer',
        description = 'Equipe um Tazer',
        weight = 0.5,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    ['WEAPON_NIGHTSTICK'] = {
        name = 'Cassetete',
        description = 'Equipe um Cassetete',
        weight = 0.5,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },

    -- OUTROS
    ['WEAPON_PETROLCAN'] = {
        name = 'Galão de gasolina',
        description = 'Equipe um Galão de gasolina',
        weight = 0.5,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_PETROLCAN'] = {
        name = 'Gasolina',
        description = 'Gasolina para o galão',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_SMOKEGRENADE'] = {
        name = 'Smoke',
        description = 'Equipe uma Granada de Fumaça',
        weight = 0.5,
        durability = {
            type = {
                day = false
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_SMOKEGRENADE'] = {
        name = 'M-Smoke',
        description = 'Munição para Granada de Fumaça',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_MOLOTOV'] = {
        name = 'Molotov',
        description = 'Equipe um Molotov',
        weight = 0.5,
        durability = {
            type = {
                day = false
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_MOLOTOV'] = {
        name = 'M-Molotov',
        description = 'Munição para Molotov',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },

    ['WEAPON_FIREEXTINGUISHER'] = {
        name = 'EXTINTOR',
        description = 'Equipe um Extintor',
        weight = 0.5,
        durability = {
            type = {
                day = 7
            },
            destroy_on_break = true,
        },
        type = 'equip',
    },
    ['AMMO_FIREEXTINGUISHER'] = {
        name = 'M-EXTINTOR',
        description = 'Recarga para Extintor',
        weight = 0.05,
        --aggrupable = 250,
        type = 'recharge',
    },
    ['PACKAGE_WEAPON_NAVYCARBINE'] = {
        name = 'Pacote Navycarbine',
        description = 'Contém 1x Navycarbine',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MP9'] = {
        name = 'Pacote MP 9',
        description = 'Contém 1x MP 9',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    
    ['PACKAGE_WEAPON_SNSPISTOL_MK2'] = {
        name = 'Pacote SNS Pistol MK2',
        description = 'Contém 1x SNS Pistol MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PISTOL_MK2'] = {
        name = 'Pacote Pistol MK2',
        description = 'Contém 1x Pistol MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_ASSAULTRIFLE_MK2'] = {
        name = 'Pacote Assaultrifle MK2',
        description = 'Contém 1x Assaultrifle MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SCARH'] = {
        name = 'Pacote Scar H',
        description = 'Contém 1x Scar H',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_FAL'] = {
        name = 'Pacote FAL',
        description = 'Contém 1x FAL',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PISTOL50'] = {
        name = 'Pacote Pistol50',
        description = 'Contém 1x Pistol50',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMBATPISTOL'] = {
        name = 'Pacote Combatpistol',
        description = 'Contém 1x Combatpistol',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PISTOL'] = {
        name = 'Pacote Pistol',
        description = 'Contém 1x Pistol',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HEAVYPISTOL'] = {
        name = 'Pacote Heavypistol',
        description = 'Contém 1x Heavypistol',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_REVOLVER'] = {
        name = 'Pacote Revolver',
        description = 'Contém 1x Revolver',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_GADGETPISTOL'] = {
        name = 'Pacote Gadgetpistol',
        description = 'Contém 1x Gadgetpistol',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HATCHET'] = {
        name = 'Pacote Hatchet',
        description = 'Contém 1x Hatchet',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_KNIFE'] = {
        name = 'Pacote Knife',
        description = 'Contém 1x Knife',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_DAGGER'] = {
        name = 'Pacote Dagger',
        description = 'Contém 1x Dagger',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_KNUCKLE'] = {
        name = 'Pacote Knuckle',
        description = 'Contém 1x Knuckle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MACHETE'] = {
        name = 'Pacote Machete',
        description = 'Contém 1x Machete',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SWITCHBLADE'] = {
        name = 'Pacote Switchblade',
        description = 'Contém 1x Switchblade',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_WRENCH'] = {
        name = 'Pacote Wrench',
        description = 'Contém 1x Wrench',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HAMMER'] = {
        name = 'Pacote Hammer',
        description = 'Contém 1x Hammer',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_GOLFCLUB'] = {
        name = 'Pacote Golfclub',
        description = 'Contém 1x Golfclub',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_CROWBAR'] = {
        name = 'Pacote Crowbar',
        description = 'Contém 1x Crowbar',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_FLASHLIGHT'] = {
        name = 'Pacote Flashlight',
        description = 'Contém 1x Flashlight',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BAT'] = {
        name = 'Pacote Bat',
        description = 'Contém 1x Bat',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BOTTLE'] = {
        name = 'Pacote Bottle',
        description = 'Contém 1x Bottle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BATTLEAXE'] = {
        name = 'Pacote Battleaxe',
        description = 'Contém 1x Battleaxe',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_POOLCUE'] = {
        name = 'Pacote Poolcue',
        description = 'Contém 1x Poolcue',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MACHINEPISTOL'] = {
        name = 'Pacote Machinepistol',
        description = 'Contém 1x Machinepistol',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SMG_MK2'] = {
        name = 'Pacote Smg MK2',
        description = 'Contém 1x Smg MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SMG'] = {
        name = 'Pacote Smg',
        description = 'Contém 1x Smg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_ASSAULTSMG'] = {
        name = 'Pacote Assaultsmg',
        description = 'Contém 1x Assaultsmg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MICROSMG'] = {
        name = 'Pacote Microsmg',
        description = 'Contém 1x Microsmg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMBATPDW'] = {
        name = 'Pacote Combatpdw',
        description = 'Contém 1x Combatpdw',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MINISMG'] = {
        name = 'Pacote Minismg',
        description = 'Contém 1x Minismg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SAWNOFFSHOTGUN'] = {
        name = 'Pacote Sawnoffshotgun',
        description = 'Contém 1x Sawnoffshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PUMPSHOTGUN_MK2'] = {
        name = 'Pacote Pumpshotgun MK2',
        description = 'Contém 1x Pumpshotgun MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PUMPSHOTGUN'] = {
        name = 'Pacote Pumpshotgun',
        description = 'Contém 1x Pumpshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_ASSAULTSHOTGUN'] = {
        name = 'Pacote Assaultshotgun',
        description = 'Contém 1x Assaultshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BULLPUPSHOTGUN'] = {
        name = 'Pacote Bullpupshotgun',
        description = 'Contém 1x Bullpupshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HEAVYSHOTGUN'] = {
        name = 'Pacote Heavyshotgun',
        description = 'Contém 1x Heavyshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_DBSHOTGUN'] = {
        name = 'Pacote Dbshotgun',
        description = 'Contém 1x Dbshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMBATSHOTGUN'] = {
        name = 'Pacote Combatshotgun',
        description = 'Contém 1x Combatshotgun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_ASSAULTRIFLE'] = {
        name = 'Pacote Assaultrifle',
        description = 'Contém 1x Assaultrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SPECIALCARBINE_MK2'] = {
        name = 'Pacote Specialcarbine MK2',
        description = 'Contém 1x Specialcarbine MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_CARBINERIFLE_MK2'] = {
        name = 'Pacote Carbinerifle MK2',
        description = 'Contém 1x Carbinerifle MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_CARBINERIFLE'] = {
        name = 'Pacote Carbinerifle',
        description = 'Contém 1x Carbinerifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SPECIALCARBINE'] = {
        name = 'Pacote Specialcarbine',
        description = 'Contém 1x Specialcarbine',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_ADVANCEDRIFLE'] = {
        name = 'Pacote Advancedrifle',
        description = 'Contém 1x Advancedrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BULLPUPRIFLE'] = {
        name = 'Pacote Bullpuprifle',
        description = 'Contém 1x Bullpuprifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_BULLPUPRIFLE_MK2'] = {
        name = 'Pacote Bullpuprifle MK2',
        description = 'Contém 1x Bullpuprifle MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMPACTRIFLE'] = {
        name = 'Pacote Compactrifle',
        description = 'Contém 1x Compactrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MILITARYRIFLE'] = {
        name = 'Pacote Militaryrifle',
        description = 'Contém 1x Militaryrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HEAVYRIFLE'] = {
        name = 'Pacote Heavyrifle',
        description = 'Contém 1x Heavyrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_TACTICALRIFLE'] = {
        name = 'Pacote Tacticalrifle',
        description = 'Contém 1x Tacticalrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MG'] = {
        name = 'Pacote Mg',
        description = 'Contém 1x Mg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMBATMG'] = {
        name = 'Pacote Combatmg',
        description = 'Contém 1x Combatmg',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_COMBATMG_MK2'] = {
        name = 'Pacote Combatmg MK2',
        description = 'Contém 1x Combatmg MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SNIPERRIFLE'] = {
        name = 'Pacote Sniperrifle',
        description = 'Contém 1x Sniperrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HEAVYSNIPER'] = {
        name = 'Pacote Heavysniper',
        description = 'Contém 1x Heavysniper',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_HEAVYSNIPER_MK2'] = {
        name = 'Pacote Heavysniper MK2',
        description = 'Contém 1x Heavysniper MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MARKSMANRIFLE'] = {
        name = 'Pacote Marksmanrifle',
        description = 'Contém 1x Marksmanrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_MARKSMANRIFLE_MK2'] = {
        name = 'Pacote Marksmanrifle MK2',
        description = 'Contém 1x Marksmanrifle MK2',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_PRECISIONRIFLE'] = {
        name = 'Pacote Precisionrifle',
        description = 'Contém 1x Precisionrifle',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_STUNGUN'] = {
        name = 'Pacote Stungun',
        description = 'Contém 1x Stungun',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['PACKAGE_WEAPON_SMOKEGRENADE'] = {
        name = 'Pacote Smokegrenade',
        description = 'Contém 1x Smokegrenade',
        weight = 3.0,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true, "Pacote aberto.")
            vRP.giveInventoryItem(user_id, item:gsub("PACKAGE_", ""), amount, true)
        end
    },
    ['coquetel'] = {
        name = 'Coquetel',
        description = 'Contém 1x Coquetel',
        weight = 0.01,
        func = function(user_id, source, item, amount, slot, cb)
            TriggerClientEvent("Notify", source, "importante", "Você tomou o coquetel.", 8000)
            vRPclient._playAnim(source, true, { "mp_player_int_uppersmoke", "mp_player_int_smoke" }, true)
            cb(true)

            SetTimeout(10 * 1000, function()
                TriggerClientEvent('energeticos', source, true, 1.49)
                TriggerClientEvent('setStamina', source, 20000)
                TriggerClientEvent('cancelando', source, false)
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "drogas", "<b>coquetel</b> utilizada com sucesso.", 8000)
            end)

            SetTimeout(30000, function()
                TriggerClientEvent('energeticos', source, false)
                TriggerClientEvent("Notify", source, "aviso", "O coração voltou a bater normalmente.", 8000)
            end)
        end
    },
    ['papel'] = {
        name = 'Papel',
        description = 'Contém 1x Papel',
        weight = 0.01,
    },

    ['medkit'] = {
        name = 'Med Kit',
        description = 'Contém 1x MedKit',
        weight = 0.01,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true)

            vRPclient._CarregarObjeto(source, "amb@world_human_clipboard@male@idle_a", "idle_c", "v_ret_ta_firstaid", 49,
                60309)
            TriggerClientEvent("progress", source, 15000, "utilizando")

            SetTimeout(15 * 1000, function()
                RESPONSE._DeletarObjeto(source)
                RESPONSE._useMedkit(source)
                TriggerClientEvent("Notify", source, "sucesso",
                    "Você utilizou a medkit, não tome nenhum tipo de dano para não ser cancelada..", 5000)
            end)
        end
    },

    ['cannabismed'] = {
        name = 'Cannabis Medicinal',
        description = 'Contém 1x Cannabismed',
        weight = 0.01,
        func = function(user_id, source, item, amount, slot, cb)
            cb(true)
            TriggerClientEvent('cancelando', source, true)
            TriggerClientEvent("progress", source, 5000, "remedio")
            vRPclient._CarregarObjeto(source, "mp_player_intdrink", "loop_bottle", "ng_proc_drug01a002", 49, 60309)

            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFightIn", 10)
            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFight", 48)
            vRPclient.playScreenEffect(source, "DrugsMichaelAliensFightOut", 2)
            SetTimeout(5 * 1000, function()
                TriggerClientEvent('cancelando', source, false)
                vRPclient._DeletarObjeto(source)
                TriggerClientEvent("Notify", source, "medico", "<b>Remédio</b> utilizado com sucesso.", 8000)
            end)
        end
    },

    ['primeirossocorros'] = {
        name = 'Primeiros Socorros',
        description = 'Contém 1x Primeirossocorros',
        weight = 0.01,
        func = function(user_id, source, item, amount, slot, cb)
            -- local status, time = exports["vrp"]:getCooldown(user_id, "inv:cannabismed")
            -- if not status then
            --     return cb({ error = "Aguarde " .. time .. " segundos para usar a Cannabis Medicinal." })
            -- end
            -- exports["vrp"]:setCooldown(user_id, "inv:cannabismed", 15)
            local nplayer = vRPclient.getNearestPlayer(source, 2)

            -- if GetResourceState('scanner') ~= 'started' then
            --     return cb({error = "Script [scanner] não iniciado."})
            -- end

            if not nplayer then
                return cb({ error = "Ninguém por perto." })
            end

            if GetEntityHealth(GetPlayerPed(nplayer)) > 101 then
                return cb({ error = "A pessoa precisa estar em coma para prosseguir." })
            end

            TriggerClientEvent('cancelando', source, true)
            TriggerClientEvent("progress", source, 7000, "reanimando")
            -- exports['scanner']:dirtyHand(user_id, Items[item].index)
            cb(true)
            vRPclient._playAnim(source, false, { "mini@cpr@char_a@cpr_str", "cpr_pumpchest" }, true)

            SetTimeout(10 * 1000, function()
                vRPclient.killGod(nplayer)
                vRPclient.setHealth(nplayer, 150)
                TriggerClientEvent("resetBleeding", nplayer)
                TriggerClientEvent("resetDiagnostic", nplayer)
                TriggerClientEvent('cancelando', source, false)
                vRPclient._stopAnim(source, false)
            end)
        end
    },

}

function getItemName(item)
    return Config.items[item] and Config.items[item].name or item
end

exports('getItemName', getItemName)

function getItemWeight(item)
    return Config.items[item] and Config.items[item].weight or 0
end

exports('getItemWeight', getItemWeight)

function getItemType(item)
    return Config.items[item] and Config.items[item].type or 'none'
end

exports('getItemType', getItemType)

function getItemDetail(item)
    return Config.items[item] or nil
end

exports('getItemDetail', getItemDetail)

exports('getItems', function()
    return Config.items
end)

CreateThread(function()
    TriggerEvent('inventory:loaded', Config.items)
end)
