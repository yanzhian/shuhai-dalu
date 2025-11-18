/**
 * 书海大陆 Actor 文档 - 完整版
 */
export default class ShuhaiActor extends Actor {
  
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // 在应用派生数据之前准备基础数据
    // 这里可以设置一些默认值

    // Migration: 确保被动骰槽位有6个（从旧的5个升级到6个）
    if (this.type === 'character' && this.system.equipment?.passives) {
      const passives = this.system.equipment.passives;
      if (passives.length < 6) {
        // 将数组扩展到6个元素
        while (passives.length < 6) {
          passives.push("");
        }
      }
    }

    // 初始化新角色的HP（仅在创建时，通过检查是否有hpInitialized标记）
    if (this.type === 'character' && !this.getFlag('shuhai-dalu', 'hpInitialized')) {
      // 标记为已初始化（这样下次就不会再重置了）
      // 注意：这个标记会在prepareDerivedData计算完hp.max后由系统自动设置
    }
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.shuhai || {};

    // 为角色类型准备派生数据
    if (actorData.type === 'character') {
      this._prepareCharacterData(actorData);
    }
  }

  /**
   * 准备角色类型的派生数据
   */
  _prepareCharacterData(actorData) {
    const systemData = actorData.system;
    
    // 数据模型的 prepareDerivedData 方法会自动调用
    // 这里只需要处理额外的计算
  }

  /**
   * 获取掷骰数据
   */
  getRollData() {
    const data = { ...super.getRollData() };

    // 准备角色掷骰数据
    if (this.type === 'character') {
      this._getCharacterRollData(data);
    }

    return data;
  }

  /**
   * 准备角色掷骰数据
   */
  _getCharacterRollData(data) {
    // 添加属性到掷骰数据
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = v;
      }
    }

    // 添加等级
    if (data.level) {
      data.lvl = data.level;
    }
  }

  /**
   * 进行属性检定
   */
  async rollAttributeCheck(attributeKey, modifier = 0, difficulty = 20) {
    const attribute = this.system.attributes[attributeKey];
    if (!attribute) {
      ui.notifications.error("无效的属性");
      return null;
    }

    const attrValue = attribute;
    
    // 使用 Foundry Roll 类投掷希望骰(蓝色d12)和侵蚀骰(红色d12)
    const hopeRoll = new Roll("1d12");
    const corruptRoll = new Roll("1d12");
    
    // 评估骰子
    await hopeRoll.evaluate();
    await corruptRoll.evaluate();
    
    // ⭐ 同时显示两个 3D 骰子动画
    if (game.dice3d) {
      // 使用 Promise.all 让两个骰子同时出现
      await Promise.all([
        game.dice3d.showForRoll(hopeRoll, game.user, true, null, false, null, {appearance: {colorset: 'blue'}}),
        game.dice3d.showForRoll(corruptRoll, game.user, true, null, false, null, {appearance: {colorset: 'red'}})
      ]);
    }
    
    const hopeDice = hopeRoll.total;
    const corruptDice = corruptRoll.total;
    const diceSum = hopeDice + corruptDice;
    const total = diceSum + attrValue + modifier;
    
    const isSuccess = total >= difficulty;
    
    // 判断检定类型
    let resultType = '';
    let resultText = '';
    
    if (hopeDice === corruptDice) {
      resultType = 'critical';
      resultText = '🎉🎉🎉 大成功! 🎉🎉🎉\n希望与侵蚀达成完美平衡,可能性的奇迹显现!';
    } else if (hopeDice > corruptDice) {
      if (isSuccess) {
        resultType = 'hope-success';
        resultText = '✨ 希望成功 ✨\n希望之光驱散了侵蚀的阴影!';
      } else {
        resultType = 'hope-failure';
        resultText = '💔 希望失败 💔\n尽管力量仍然不足,但希望尚存...';
      }
    } else {
      if (isSuccess) {
        resultType = 'corrupt-success';
        resultText = '🌑 侵蚀成功 🌑\n你成功了,但侵蚀的代价正在悄然蔓延...';
      } else {
        resultType = 'corrupt-failure';
        resultText = '🕳️ 侵蚀失败 🕳️\n侵蚀吞噬了你的希望,行动以失败告终...';
      }
    }

    const attributeLabels = {
      strength: '力量',
      constitution: '体质',
      dexterity: '敏捷',
      perception: '感知',
      intelligence: '智力',
      charisma: '魅力'
    };

    const result = {
      actor: this.name,
      attribute: attributeLabels[attributeKey] || attributeKey,
      hopeDice,
      corruptDice,
      diceSum,
      attrValue,
      modifier,
      total,
      difficulty,
      success: isSuccess,
      type: resultType,
      text: resultText
    };

    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${result.attribute}检定`,
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/check-roll.hbs", result),
      sound: CONFIG.sounds.dice
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 进行技能检定
   */
  async rollSkillCheck(skillKey, modifier = 0, difficulty = 20) {
    const skillValue = this.system.skills[skillKey];
    if (skillValue === undefined) {
      ui.notifications.error("无效的技能");
      return null;
    }

    // 使用 Foundry Roll 类投掷希望骰(蓝色d12)和侵蚀骰(红色d12)
    const hopeRoll = new Roll("1d12");
    const corruptRoll = new Roll("1d12");

    // 评估骰子
    await hopeRoll.evaluate();
    await corruptRoll.evaluate();

    // ⭐ 同时显示两个 3D 骰子动画
    if (game.dice3d) {
      // 使用 Promise.all 让两个骰子同时出现
      await Promise.all([
        game.dice3d.showForRoll(hopeRoll, game.user, true, null, false, null, {appearance: {colorset: 'blue'}}),
        game.dice3d.showForRoll(corruptRoll, game.user, true, null, false, null, {appearance: {colorset: 'red'}})
      ]);
    }

    const hopeDice = hopeRoll.total;
    const corruptDice = corruptRoll.total;
    const diceSum = hopeDice + corruptDice;
    const total = diceSum + skillValue + modifier;

    const isSuccess = total >= difficulty;

    // 判断检定类型
    let resultType = '';
    let resultText = '';

    if (hopeDice === corruptDice) {
      resultType = 'critical';
      resultText = '🎉🎉🎉 大成功! 🎉🎉🎉\n希望与侵蚀达成完美平衡,可能性的奇迹显现!';
    } else if (hopeDice > corruptDice) {
      if (isSuccess) {
        resultType = 'hope-success';
        resultText = '✨ 希望成功 ✨\n希望之光驱散了侵蚀的阴影!';
      } else {
        resultType = 'hope-failure';
        resultText = '💔 希望失败 💔\n尽管力量仍然不足,但希望尚存...';
      }
    } else {
      if (isSuccess) {
        resultType = 'corrupt-success';
        resultText = '🌑 侵蚀成功 🌑\n你成功了,但侵蚀的代价正在悄然蔓延...';
      } else {
        resultType = 'corrupt-failure';
        resultText = '🕳️ 侵蚀失败 🕳️\n侵蚀吞噬了你的希望,行动以失败告终...';
      }
    }

    const skillLabels = {
      athletics: '运动',
      acrobatics: '敏捷',
      sleight: '巧手',
      stealth: '隐蔽',
      qidian: '奇点',
      history: '历史',
      investigation: '调查',
      nature: '自然',
      religion: '宗教',
      animal: '驯兽',
      insight: '洞悉',
      medicine: '医药',
      perception: '察觉',
      survival: '求生',
      deception: '欺瞒',
      intimidation: '威吓',
      performance: '表演',
      persuasion: '游说'
    };

    const result = {
      actor: this.name,
      attribute: skillLabels[skillKey] || skillKey,
      hopeDice,
      corruptDice,
      diceSum,
      attrValue: skillValue,
      modifier,
      total,
      difficulty,
      success: isSuccess,
      type: resultType,
      text: resultText
    };

    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${result.attribute}检定`,
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/check-roll.hbs", result),
      sound: CONFIG.sounds.dice
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 进行侵蚀检定
   */
  async rollCorruptionCheck() {
    const currentSAN = this.system.derived.corruption.value;
    const sanMax = this.system.derived.corruption.max;
    
    // 使用 Foundry Roll 类投掷d20
    const roll = new Roll("1d20");
    await roll.evaluate();
    
    // 显示 3D 骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    const diceRoll = roll.total;
    const total = diceRoll + currentSAN;
    const corrupted = total > 20;
    
    let message = "";
    if (corrupted) {
      message = "💀 侵蚀发生!你感受到了深渊的呼唤... 💀";
    } else {
      // 增加1-3点侵蚀值
      const increaseRoll = new Roll("1d3");
      await increaseRoll.evaluate();
      const increase = increaseRoll.total;
      
      const newSAN = Math.min(currentSAN + increase, sanMax * 2); // 允许超过上限
      
      await this.update({ "system.derived.corruption.value": newSAN });
      
      message = `✅ 侵蚀未发生,但精神受到冲击\n侵蚀值增加 ${increase} 点: ${currentSAN} ➯ ${newSAN}`;
      
      if (newSAN >= sanMax * 1.5) {
        message += `\n💀 极度危险:侵蚀值远超上限,深渊之力几乎要吞噬你的心智!`;
      } else if (newSAN >= sanMax) {
        message += `\n⚠️ 高度警告:侵蚀值已超过安全上限!`;
      } else if (newSAN >= sanMax * 0.8) {
        message += `\n⚠️ 警告:已快要达到侵蚀值安全上限!`;
      }
    }
    
    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: "侵蚀检定",
      content: `
        <div class="shuhai-corruption-check">
          <div class="dice-result">
            <div class="dice-roll">${diceRoll}[d20] + ${currentSAN}[侵蚀值] = ${total}</div>
            <div class="difficulty">目标值: 20</div>
          </div>
          <div class="result-message">${message}</div>
        </div>
      `,
      sound: CONFIG.sounds.dice
    };
    
    ChatMessage.create(messageData);
    return { corrupted, diceRoll, total, message };
  }

  /**
   * 获取先攻投掷
   * 覆盖 Foundry 默认的先攻投掷，使用 totalSpeed 作为先攻值（不投骰）
   */
  getInitiativeRoll(formula = null) {
    // 获取总速度作为先攻值
    let totalSpeed = this.system.derived?.totalSpeed || 0;

    console.log(`【先攻】${this.name} - 当前totalSpeed:`, totalSpeed);

    // 如果totalSpeed为0，自动计算速度值（速度1+速度2+速度3）
    if (totalSpeed === 0) {
      const constitution = this.system.attributes?.constitution || 0;
      const dexterity = this.system.attributes?.dexterity || 0;

      console.log(`【先攻】${this.name} - 体质:${constitution}, 敏捷:${dexterity}`);

      // 基础骰子大小（体质<9用d6，否则用d4）
      const diceSize = constitution < 9 ? 6 : 4;

      // 固定加值（敏捷/3向下取整）
      const bonus = Math.floor(dexterity / 3);

      // 生成3个速度值并求和
      const speed1 = Math.floor(Math.random() * diceSize) + 1 + bonus;
      const speed2 = Math.floor(Math.random() * diceSize) + 1 + bonus;
      const speed3 = Math.floor(Math.random() * diceSize) + 1 + bonus;
      totalSpeed = speed1 + speed2 + speed3;

      console.log(`【先攻】${this.name} - 速度值: ${speed1}+${speed2}+${speed3}=${totalSpeed}`);

      // 异步更新totalSpeed到角色数据（不阻塞返回）
      this.update({ 'system.derived.totalSpeed': totalSpeed });

      // 发送聊天消息显示速度值
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div style="border: 2px solid #4a90e2; border-radius: 4px; padding: 8px; background: #0F0D1B; color: #EBBD68;">
          <strong>${this.name}</strong> 先攻速度：${speed1} + ${speed2} + ${speed3} = <strong>${totalSpeed}</strong>
        </div>`
      });
    }

    // 确保 totalSpeed 是一个有效的数字
    const speedValue = Number(totalSpeed) || 0;

    console.log(`【先攻】${this.name} - 最终先攻值:`, speedValue);

    // 返回一个固定值的 Roll 对象（不投骰子）
    return new Roll(String(speedValue));
  }

  /**
   * 长休 - 恢复生命值和侵蚀值
   */
  async longRest() {
    const hpMax = this.system.derived.hp.max;
    
    await this.update({
      "system.derived.hp.value": hpMax,
      "system.derived.corruption.value": 0
    });
    
    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: "长期休息",
      content: `
        <div class="shuhai-rest">
          <h3>经过长时间的休息和调整,你恢复了精神和体力...</h3>
          <ul>
            <li><strong>生命值:</strong> ${hpMax}/${hpMax} <span class="tag success">完全恢复</span></li>
            <li><strong>侵蚀值:</strong> 0 <span class="tag success">心灵净化</span></li>
          </ul>
        </div>
      `
    };
    
    ChatMessage.create(messageData);

    ui.notifications.info(`${this.name} 完成了长期休息`);
  }

  // ===== BUFF 管理辅助方法 =====

  /**
   * 获取战斗状态
   * @returns {Object} 战斗状态对象
   */
  _getCombatState() {
    return this.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [false, false, false],
      activatedDice: [false, false, false, false, false, false],
      buffs: []
    };
  }

  /**
   * 保存战斗状态
   * @param {Object} combatState - 战斗状态对象
   */
  async _saveCombatState(combatState) {
    await this.setFlag('shuhai-dalu', 'combatState', combatState);
    this._refreshCombatUI();
  }

  /**
   * 刷新战斗UI
   */
  _refreshCombatUI() {
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === this.id) {
        app.render(false);
      }
    });
  }

  /**
   * 获取指定BUFF
   * @param {string} buffId - BUFF ID
   * @param {string} roundTiming - 回合时机 (current/next)，如果未指定则返回任意时机的BUFF
   * @returns {Object|undefined} BUFF对象
   */
  getBuff(buffId, roundTiming = null) {
    const combatState = this._getCombatState();

    if (roundTiming) {
      return combatState.buffs.find(b => b.id === buffId && b.roundTiming === roundTiming);
    } else {
      return combatState.buffs.find(b => b.id === buffId);
    }
  }

  /**
   * 添加BUFF
   * @param {string} buffId - BUFF ID
   * @param {number} layers - 层数
   * @param {number} strength - 强度（可选）
   * @param {string} roundTiming - 回合时机 (current/next)，默认current
   * @param {string} customName - 自定义BUFF名称（可选，用于custom类型）
   */
  async addBuff(buffId, layers = 1, strength = 0, roundTiming = 'current', customName = null) {
    // 动态导入BUFF定义（避免循环依赖）
    const { findBuffById } = await import('../constants/buff-types.mjs');

    const buffDef = findBuffById(buffId);
    if (!buffDef) {
      console.warn(`未找到 BUFF 定义: ${buffId}`);
      return false;
    }

    const combatState = this._getCombatState();

    // 对于自定义BUFF，使用 customName 作为唯一标识
    const buffIdentifier = customName || buffId;

    // 检查是否已存在相同标识和roundTiming的BUFF
    const existingBuffIndex = combatState.buffs.findIndex(
      b => (customName ? b.customName === customName : b.id === buffId) && b.roundTiming === roundTiming
    );

    if (existingBuffIndex !== -1) {
      // 如果已存在，增加层数和强度
      combatState.buffs[existingBuffIndex].layers += layers;
      if (strength !== 0) {
        combatState.buffs[existingBuffIndex].strength += strength;
      }
    } else {
      // 如果不存在，添加新BUFF
      const newBuff = {
        id: buffDef.id,
        name: customName || buffDef.name,
        type: buffDef.type,
        description: buffDef.description,
        icon: buffDef.icon,
        layers: layers,
        strength: strength !== 0 ? strength : buffDef.defaultStrength,
        roundTiming: roundTiming
      };

      // 如果是自定义BUFF，添加customName字段
      if (customName) {
        newBuff.customName = customName;
      }

      combatState.buffs.push(newBuff);
    }

    await this._saveCombatState(combatState);
    return true;
  }

  /**
   * 消耗BUFF层数
   * @param {string} buffId - BUFF ID
   * @param {number} layers - 要消耗的层数
   * @param {string} roundTiming - 回合时机（可选）
   * @returns {boolean} 是否成功消耗
   */
  async consumeBuff(buffId, layers = 1, roundTiming = null) {
    const combatState = this._getCombatState();

    const buffIndex = roundTiming
      ? combatState.buffs.findIndex(b => b.id === buffId && b.roundTiming === roundTiming)
      : combatState.buffs.findIndex(b => b.id === buffId);

    if (buffIndex === -1) {
      return false;
    }

    const buff = combatState.buffs[buffIndex];
    if (buff.layers < layers) {
      return false;
    }

    buff.layers -= layers;

    // 如果层数为0，移除BUFF
    if (buff.layers <= 0) {
      combatState.buffs.splice(buffIndex, 1);
    }

    await this._saveCombatState(combatState);
    return true;
  }

  /**
   * 清除指定BUFF的所有层数
   * @param {string} buffId - BUFF ID
   * @param {string} roundTiming - 回合时机（可选）
   */
  async clearBuff(buffId, roundTiming = null) {
    const combatState = this._getCombatState();

    if (roundTiming) {
      combatState.buffs = combatState.buffs.filter(
        b => !(b.id === buffId && b.roundTiming === roundTiming)
      );
    } else {
      combatState.buffs = combatState.buffs.filter(b => b.id !== buffId);
    }

    await this._saveCombatState(combatState);
  }

  /**
   * 获取所有BUFF
   * @returns {Array} BUFF数组
   */
  getAllBuffs() {
    const combatState = this._getCombatState();
    return combatState.buffs || [];
  }

  /**
   * 应用BUFF效果（触发BUFF的被动效果）
   * @param {Object} buff - BUFF对象
   */
  async applyBuffEffect(buff) {
    // 这里需要根据BUFF类型执行对应的效果
    // 例如：燃烧造成伤害、破裂造成伤害等
    // 目前保留为空，后续可以补充具体逻辑
    console.log(`触发BUFF效果: ${buff.name} (${buff.id})`);
  }

  /**
   * 受到伤害
   * @param {number} amount - 伤害量
   * @param {string} type - 伤害类型 (direct/normal等)
   * @param {Object} options - 额外选项
   * @param {Actor} options.attacker - 攻击者（用于触发 Activities）
   * @param {string} options.damageType - 伤害类型（slash/pierce/blunt）
   */
  async takeDamage(amount, type = 'normal', options = {}) {
    const currentHP = this.system.attributes?.hp?.value || this.system.derived?.hp?.value || 0;
    const newHP = Math.max(0, currentHP - amount);

    // 根据数据模型更新HP
    if (this.system.attributes?.hp) {
      await this.update({ 'system.attributes.hp.value': newHP });
    } else if (this.system.derived?.hp) {
      await this.update({ 'system.derived.hp.value': newHP });
    }

    // 触发 onDamaged 活动
    await this.executeActivities('onDamaged', {
      target: options.attacker,
      damage: amount,
      damageType: options.damageType
    });

    return newHP;
  }

  /**
   * 执行角色的 Activities（统一接口）
   * @param {string} triggerType - 触发类型（onUse, onAttack, onHit, onDamaged, etc.）
   * @param {Object} options - 执行选项
   * @param {Actor} options.target - 目标角色
   * @param {Item} options.item - 触发的物品（可选，如果只触发特定物品）
   * @param {Object} options.dice - 骰子数据
   * @param {string} options.attackCategory - 攻击类别（slash/pierce/blunt）
   * @returns {Promise<Array>} 执行结果数组
   */
  async executeActivities(triggerType, options = {}) {
    // 导入 activity-service（延迟导入避免循环依赖）
    const { executeActorActivities } = await import('../services/activity-service.mjs');

    console.log('【Actor】执行 Activities:', this.name, triggerType);

    // 调用 activity-service 的统一接口
    const results = await executeActorActivities(this, triggerType, options);

    return results;
  }
}