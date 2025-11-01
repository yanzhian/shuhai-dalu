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
    
    // 显示 3D 骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(hopeRoll, game.user, true, null, false);
      await game.dice3d.showForRoll(corruptRoll, game.user, true, null, false);
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
}