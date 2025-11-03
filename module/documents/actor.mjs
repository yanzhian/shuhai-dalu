/**
 * 书海大陆 Actor 文档
 */
export default class ShuhaiActor extends Actor {
  
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // 在应用派生数据之前准备基础数据
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.shuhai || {};

    // 为不同类型的 actor 准备派生数据
    this._prepareCharacterData(actorData);
  }

  /**
   * 准备角色类型的派生数据
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const systemData = actorData.system;
    
    // 计算生命值上限 (基于体质)
    systemData.hp.max = systemData.attributes.constitution.value * 5;
    
    // 如果当前HP为0或超过最大值，设置为最大值
    if (systemData.hp.value === 0 || systemData.hp.value > systemData.hp.max) {
      systemData.hp.value = systemData.hp.max;
    }
  }

  /**
   * 获取掷骰数据
   */
  getRollData() {
    const data = { ...super.getRollData() };

    // 准备角色掷骰数据
    this._getCharacterRollData(data);

    return data;
  }

  /**
   * 准备角色掷骰数据
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // 添加属性
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
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

    const attrValue = attribute.value;
    
    // 投掷希望骰(蓝色d12)和侵蚀骰(红色d12)
    const hopeDice = Math.floor(Math.random() * 12) + 1;
    const corruptDice = Math.floor(Math.random() * 12) + 1;
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

    const result = {
      actor: this.name,
      attribute: attribute.label || attributeKey,
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
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/check-roll.hbs", result)
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 进行侵蚀检定
   */
  async rollCorruptionCheck() {
    const currentSAN = this.system.san.value;
    const sanMax = this.system.san.max;
    
    // 投掷d20
    const diceRoll = Math.floor(Math.random() * 20) + 1;
    const total = diceRoll + currentSAN;
    const corrupted = total > 20;
    
    let message = "";
    if (corrupted) {
      message = "💀 侵蚀发生!你感受到了深渊的呼唤... 💀";
    } else {
      // 增加1-3点侵蚀值
      const increase = Math.floor(Math.random() * 3) + 1;
      const newSAN = Math.min(currentSAN + increase, sanMax * 2); // 允许超过上限
      
      await this.update({ "system.san.value": newSAN });
      
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
      `
    };
    
    ChatMessage.create(messageData);
    return { corrupted, diceRoll, total, message };
  }

  /**
   * 长休 - 恢复生命值和侵蚀值
   */
  async longRest() {
    const hpMax = this.system.hp.max;
    
    await this.update({
      "system.hp.value": hpMax,
      "system.san.value": 0
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
}