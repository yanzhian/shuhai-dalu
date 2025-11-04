/**
 * 书海大陆 战斗区域应用
 */
export default class CombatAreaApplication extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;

    // 从角色Flag加载战斗状态，如果没有则初始化
    this.combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      // 激活的战斗骰（0-5索引对应6个战斗骰）
      activatedDice: [false, false, false, false, false, false],
      // 额外Cost（最多6个）
      extraCost: [false, false, false, false, false, false],
      // EX资源（最多3个）
      exResources: [false, false, false],
      // 速度值（3个不同的结果）
      speedValues: [0, 0, 0],
      // BUFF列表
      buffs: []
    };
  }

  /**
   * 保存战斗状态到角色Flag
   */
  async _saveCombatState() {
    await this.actor.setFlag('shuhai-dalu', 'combatState', this.combatState);
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "combat-area"],
      template: "systems/shuhai-dalu/templates/combat/combat-area.hbs",
      width: 1200,
      height: 800,
      resizable: true,
      title: "战斗区域"
    });
  }

  /** @override */
  async getData() {
    const context = await super.getData();

    // 获取角色数据
    context.actor = this.actor;
    context.system = this.actor.system;
    context.combatState = this.combatState;

    // 准备战斗骰数据
    context.combatDice = this._prepareCombatDice();

    // 准备装备数据
    context.equipment = this._prepareEquipment();

    // 准备BUFF数据
    context.buffs = this.combatState.buffs;

    // 准备行动骰装扮数据
    context.actionDiceTheme = this._getActionDiceTheme();

    return context;
  }

  /**
   * 准备战斗骰数据
   */
  _prepareCombatDice() {
    const combatDice = [];
    for (let i = 0; i < 6; i++) {
      const diceId = this.actor.system.equipment.combatDice[i];
      if (diceId) {
        const item = this.actor.items.get(diceId);
        if (item) {
          combatDice.push({
            index: i,
            item: item,
            activated: this.combatState.activatedDice[i],
            name: item.name,
            img: item.img,
            dice: item.system.diceFormula,
            effect: item.system.effect
          });
        } else {
          combatDice.push({ index: i, empty: true });
        }
      } else {
        combatDice.push({ index: i, empty: true });
      }
    }
    return combatDice;
  }

  /**
   * 准备装备数据
   */
  _prepareEquipment() {
    const equipment = {
      weapon: null,
      armor: null,
      defenseDice: null,
      triggerDice: null,
      passives: []
    };

    // 武器
    if (this.actor.system.equipment.weapon) {
      equipment.weapon = this.actor.items.get(this.actor.system.equipment.weapon);
    }

    // 防具
    if (this.actor.system.equipment.armor) {
      equipment.armor = this.actor.items.get(this.actor.system.equipment.armor);
    }

    // 守备骰
    if (this.actor.system.equipment.defenseDice) {
      equipment.defenseDice = this.actor.items.get(this.actor.system.equipment.defenseDice);
    }

    // 触发骰
    if (this.actor.system.equipment.triggerDice) {
      equipment.triggerDice = this.actor.items.get(this.actor.system.equipment.triggerDice);
    }

    // 被动骰
    for (let i = 0; i < this.actor.system.equipment.passives.length; i++) {
      const passiveId = this.actor.system.equipment.passives[i];
      if (passiveId) {
        const passive = this.actor.items.get(passiveId);
        if (passive) {
          equipment.passives.push(passive);
        }
      }
    }

    return equipment;
  }

  /**
   * 获取行动骰装扮主题
   */
  _getActionDiceTheme() {
    // 从角色数据中获取当前选择的行动骰装扮主题
    // 默认使用"大自然"主题
    const theme = this.actor.getFlag('shuhai-dalu', 'actionDiceTheme') || '大自然';

    return {
      name: theme,
      main: `systems/shuhai-dalu/assets/icons/dice/${theme}-主骰.png`,
      dice1: `systems/shuhai-dalu/assets/icons/dice/${theme}-1.png`,
      dice2: `systems/shuhai-dalu/assets/icons/dice/${theme}-2.png`,
      dice3: `systems/shuhai-dalu/assets/icons/dice/${theme}-3.png`
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 控制按钮
    html.find('.draw-activate-btn').click(this._onDrawActivate.bind(this));
    html.find('.draw-one-btn').click(this._onDrawOne.bind(this));
    html.find('.speed-draw-btn').click(this._onSpeedDraw.bind(this));
    html.find('.summon-action-dice-btn').click(this._onSummonActionDice.bind(this));

    // 战斗骰按钮
    html.find('.combat-dice-initiate-btn').click(this._onCombatDiceInitiate.bind(this));
    html.find('.combat-dice-activate-btn').click(this._onCombatDiceActivate.bind(this));

    // 守备骰/触发骰
    html.find('.defense-dice-btn').click(this._onDefenseDice.bind(this));
    html.find('.trigger-dice-btn').click(this._onTriggerDice.bind(this));

    // 额外Cost和EX资源
    html.find('.extra-cost-btn').click(this._onToggleExtraCost.bind(this));
    html.find('.ex-resource-btn').click(this._onToggleExResource.bind(this));

    // 装备按钮
    html.find('.equipment-show-btn').click(this._onShowEquipment.bind(this));

    // BUFF操作
    html.find('.buff-trigger-btn').click(this._onBuffTrigger.bind(this));
    html.find('.buff-clear-btn').click(this._onBuffClear.bind(this));
    html.find('.buff-layer-increase').click(this._onBuffLayerIncrease.bind(this));
    html.find('.buff-layer-decrease').click(this._onBuffLayerDecrease.bind(this));
    html.find('.buff-strength-increase').click(this._onBuffStrengthIncrease.bind(this));
    html.find('.buff-strength-decrease').click(this._onBuffStrengthDecrease.bind(this));

    // 行动骰装扮选择
    html.find('.action-dice-theme-btn').click(this._onSelectActionDiceTheme.bind(this));
  }

  /* -------------------------------------------- */
  /*  控制按钮事件                                  */
  /* -------------------------------------------- */

  /**
   * 抽取激活：随机点亮3个战斗骰
   */
  async _onDrawActivate(event) {
    event.preventDefault();

    const availableIndices = [];
    for (let i = 0; i < 6; i++) {
      const diceId = this.actor.system.equipment.combatDice[i];
      if (diceId) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      ui.notifications.warn("没有装备战斗骰");
      return;
    }

    // 随机抽取3个
    const drawCount = Math.min(3, availableIndices.length);
    let extraCount = 0;
    let costCount = 0;

    for (let i = 0; i < drawCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const diceIndex = availableIndices[randomIndex];

      // 如果已经激活，增加额外Cost和EX
      if (this.combatState.activatedDice[diceIndex]) {
        extraCount++;
        // 增加额外Cost
        for (let j = 0; j < 6; j++) {
          if (!this.combatState.extraCost[j]) {
            this.combatState.extraCost[j] = true;
            costCount++;
            break;
          }
        }
        // 每3个重复激活增加1个EX
        if (extraCount % 3 === 0) {
          for (let j = 0; j < 3; j++) {
            if (!this.combatState.exResources[j]) {
              this.combatState.exResources[j] = true;
              break;
            }
          }
        }
      } else {
        this.combatState.activatedDice[diceIndex] = true;
      }

      // 移除已抽取的索引
      availableIndices.splice(randomIndex, 1);
    }

    // 发送聊天消息
    await this._sendChatMessage(`抽取激活了 ${drawCount} 个战斗骰${extraCount > 0 ? `，重复激活 ${extraCount} 次，获得 ${costCount} 个额外Cost` : ''}`);

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 抽取一个：随机点亮1个战斗骰
   */
  async _onDrawOne(event) {
    event.preventDefault();

    const availableIndices = [];
    for (let i = 0; i < 6; i++) {
      const diceId = this.actor.system.equipment.combatDice[i];
      if (diceId) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      ui.notifications.warn("没有装备战斗骰");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const diceIndex = availableIndices[randomIndex];

    let message = `抽取激活了第 ${diceIndex + 1} 个战斗骰`;

    // 如果已经激活，增加额外Cost和EX
    if (this.combatState.activatedDice[diceIndex]) {
      // 增加额外Cost
      for (let j = 0; j < 6; j++) {
        if (!this.combatState.extraCost[j]) {
          this.combatState.extraCost[j] = true;
          message += `，重复激活获得1个额外Cost`;
          break;
        }
      }
    } else {
      this.combatState.activatedDice[diceIndex] = true;
    }

    await this._sendChatMessage(message);

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 速度抽取：刷新3个速度值
   */
  async _onSpeedDraw(event) {
    event.preventDefault();

    // 生成3个不同的速度值（1d20）
    this.combatState.speedValues = [
      Math.floor(Math.random() * 20) + 1,
      Math.floor(Math.random() * 20) + 1,
      Math.floor(Math.random() * 20) + 1
    ];

    await this._sendChatMessage(`速度抽取：${this.combatState.speedValues.join(', ')}`);

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 召唤行动骰：召唤4个Token
   */
  async _onSummonActionDice(event) {
    event.preventDefault();

    const theme = this._getActionDiceTheme();

    // TODO: 实现在地图上创建Token的功能
    // 这需要与Foundry VTT的Token系统集成

    ui.notifications.info(`召唤行动骰：${theme.name}`);
    await this._sendChatMessage(`召唤了行动骰装扮：${theme.name}`);
  }

  /**
   * 选择行动骰装扮
   */
  async _onSelectActionDiceTheme(event) {
    event.preventDefault();

    // 可用的行动骰装扮主题
    const themes = ['大自然', '永生蜜酒', '猪灵', '蔷薇之主', '蒸汽驱动',"AL-1S","Bianh","PMC","阿里乌斯","阿罗娜","暗邦","暗邦UR"];

    const content = `
      <form>
        <div class="form-group">
          <label>选择行动骰装扮:</label>
          <select name="theme" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">
            ${themes.map(theme => `<option value="${theme}">${theme}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/大自然-主骰.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>主骰</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/大自然-1.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰1</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/大自然-2.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰2</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/大自然-3.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰3</small>
            </div>
          </div>
        </div>
      </form>
    `;

    new Dialog({
      title: "选择行动骰装扮",
      content: content,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "选择",
          callback: async (html) => {
            const theme = html.find('[name="theme"]').val();
            await this.actor.setFlag('shuhai-dalu', 'actionDiceTheme', theme);
            ui.notifications.info(`已选择行动骰装扮：${theme}`);
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "select",
      render: (html) => {
        // 主题选择变化时更新预览图
        html.find('[name="theme"]').change((e) => {
          const selectedTheme = e.target.value;
          const previewContainer = html.find('.form-group').eq(1).find('div').eq(0);
          previewContainer.html(`
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/${selectedTheme}-主骰.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>主骰</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/${selectedTheme}-1.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰1</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/${selectedTheme}-2.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰2</small>
            </div>
            <div style="text-align: center;">
              <img src="systems/shuhai-dalu/assets/icons/dice/${selectedTheme}-3.png" style="width: 100%; border: 1px solid #3a3a3a; border-radius: 3px;"/>
              <small>行动骰3</small>
            </div>
          `);
        });
      }
    }).render(true);
  }

  /* -------------------------------------------- */
  /*  战斗骰事件                                    */
  /* -------------------------------------------- */

  /**
   * 战斗骰发起/对抗
   */
  async _onCombatDiceInitiate(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const diceData = this._prepareCombatDice()[index];

    if (diceData.empty) {
      ui.notifications.warn("该槽位没有装备战斗骰");
      return;
    }

    // 投骰
    const roll = new Roll(diceData.dice);
    await roll.evaluate();

    // 创建聊天消息卡片
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/combat-dice-challenge.hbs", {
        actor: this.actor,
        dice: diceData,
        roll: roll,
        total: roll.total,
        // 传递挑战信息用于对抗
        challengeData: {
          challengerId: this.actor.id,
          challengerName: this.actor.name,
          diceId: diceData.item.id,
          diceName: diceData.name,
          total: roll.total
        }
      }),
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll]
    };

    await ChatMessage.create(chatData);
  }

  /**
   * 战斗骰激活/取消激活
   */
  async _onCombatDiceActivate(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);

    this.combatState.activatedDice[index] = !this.combatState.activatedDice[index];

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 守备骰
   */
  async _onDefenseDice(event) {
    event.preventDefault();

    const defenseDice = this.actor.items.get(this.actor.system.equipment.defenseDice);
    if (!defenseDice) {
      ui.notifications.warn("没有装备守备骰");
      return;
    }

    // 投骰
    const roll = new Roll(defenseDice.system.diceFormula);
    await roll.evaluate();

    await this._sendChatMessage(`使用守备骰进行对抗，结果：${roll.total}`, roll);
  }

  /**
   * 触发骰
   */
  async _onTriggerDice(event) {
    event.preventDefault();

    // 检查是否有EX资源
    const hasEx = this.combatState.exResources.some(ex => ex);
    if (!hasEx) {
      ui.notifications.warn("没有可用的EX资源");
      return;
    }

    const triggerDice = this.actor.items.get(this.actor.system.equipment.triggerDice);
    if (!triggerDice) {
      ui.notifications.warn("没有装备触发骰");
      return;
    }

    // 消耗1个EX资源
    for (let i = 0; i < 3; i++) {
      if (this.combatState.exResources[i]) {
        this.combatState.exResources[i] = false;
        break;
      }
    }

    await this._sendChatMessage(`消耗1个EX资源，触发：${triggerDice.name}\n效果：${triggerDice.system.effect}`);

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 切换额外Cost
   */
  async _onToggleExtraCost(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    this.combatState.extraCost[index] = !this.combatState.extraCost[index];

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 切换EX资源
   */
  async _onToggleExResource(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    this.combatState.exResources[index] = !this.combatState.exResources[index];

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 显示装备效果
   */
  async _onShowEquipment(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    await this._sendChatMessage(`【${item.name}】\n${item.system.effect || '无描述'}`);
  }

  /* -------------------------------------------- */
  /*  BUFF事件                                     */
  /* -------------------------------------------- */

  /**
   * 触发BUFF
   */
  async _onBuffTrigger(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const buff = this.combatState.buffs[index];

    if (!buff) return;

    await this._sendChatMessage(`触发BUFF：${buff.name}（层数：${buff.layers}，强度：${buff.strength}）`);
  }

  /**
   * 清除BUFF
   */
  async _onBuffClear(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);

    this.combatState.buffs.splice(index, 1);

    // 保存状态并刷新
    await this._saveCombatState();
    this.render();
  }

  /**
   * 增加BUFF层数
   */
  async _onBuffLayerIncrease(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const buff = this.combatState.buffs[index];

    if (buff) {
      buff.layers++;

      // 保存状态并刷新
      await this._saveCombatState();
      this.render();
    }
  }

  /**
   * 减少BUFF层数
   */
  async _onBuffLayerDecrease(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const buff = this.combatState.buffs[index];

    if (buff && buff.layers > 0) {
      buff.layers--;

      // 保存状态并刷新
      await this._saveCombatState();
      this.render();
    }
  }

  /**
   * 增加BUFF强度
   */
  async _onBuffStrengthIncrease(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const buff = this.combatState.buffs[index];

    if (buff) {
      buff.strength++;

      // 保存状态并刷新
      await this._saveCombatState();
      this.render();
    }
  }

  /**
   * 减少BUFF强度
   */
  async _onBuffStrengthDecrease(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const buff = this.combatState.buffs[index];

    if (buff && buff.strength > 0) {
      buff.strength--;

      // 保存状态并刷新
      await this._saveCombatState();
      this.render();
    }
  }

  /* -------------------------------------------- */
  /*  辅助方法                                      */
  /* -------------------------------------------- */

  /**
   * 发送聊天消息
   */
  async _sendChatMessage(content, roll = null) {
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    };

    if (roll) {
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.rolls = [roll];
      chatData.sound = CONFIG.sounds.dice;
    }

    await ChatMessage.create(chatData);
  }
}
