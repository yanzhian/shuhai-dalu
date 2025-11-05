/**
 * 书海大陆 战斗区域应用 - 完全重新设计
 */

// 预定义BUFF类型
const BUFF_TYPES = {
  // 增益BUFF
  positive: [
    {
      id: 'strong',
      name: '强壮',
      type: 'positive',
      description: '一回合内 "战斗骰" 的 "骰数" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/upgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'guard',
      name: '守护',
      type: 'positive',
      description: '一回合内 [被击中时] 受到 最终伤害 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/shield.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'swift',
      name: '迅捷',
      type: 'positive',
      description: '一回合内 所有【行动槽】"速度" 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/wing.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'endure',
      name: '忍耐',
      type: 'positive',
      description: '一回合内 "守备" 的 骰数 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/stone-pile.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'advantage',
      name: '优势',
      type: 'positive',
      description: '一回合内 骰至 等同于本效果层数的数值，取最大结果。',
      icon: 'icons/svg/up.svg',
      defaultLayers: 2,
      defaultStrength: 0
    },
    {
      id: 'dice_upgrade',
      name: '面数增加',
      type: 'positive',
      description: '每层增加一个面数等级，面数等级为：4,6,8,10,12,20 面骰',
      icon: 'icons/svg/d20.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ],

  // 减益BUFF
  negative: [
    {
      id: 'weak',
      name: '虚弱',
      type: 'negative',
      description: '一回合内 "战斗骰" 的 "骰数" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/downgrade.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'vulnerable',
      name: '易损',
      type: 'negative',
      description: '一回合内 [被击中时] 受到 最终伤害 增加 等同于本效果层数的数值。',
      icon: 'icons/svg/break.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'bound',
      name: '束缚',
      type: 'negative',
      description: '一回合内 所有【行动槽】"速度" 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/net.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'flaw',
      name: '破绽',
      type: 'negative',
      description: '一回合内 "守备" 的 骰数 减少 等同于本效果层数的数值。',
      icon: 'icons/svg/hazard.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'disadvantage',
      name: '劣势',
      type: 'negative',
      description: '一回合内 骰至 等同于本效果层数的数值，取最小结果',
      icon: 'icons/svg/down.svg',
      defaultLayers: 2,
      defaultStrength: 0
    },
    {
      id: 'dice_downgrade',
      name: '面数减少',
      type: 'negative',
      description: '每层减少一个面数等级，面数等级为：4,6,8,10,12,20 面骰',
      icon: 'icons/svg/d20.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ],

  // 效果BUFF
  effect: [
    {
      id: 'rupture',
      name: '破裂',
      type: 'effect',
      description: '受到攻击时：附加数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/explosion.svg',
      defaultLayers: 1,
      defaultStrength: 3
    },
    {
      id: 'bleed',
      name: '流血',
      type: 'effect',
      description: '攻击时：受到数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/blood.svg',
      defaultLayers: 1,
      defaultStrength: 2
    },
    {
      id: 'corruption_effect',
      name: '沉沦',
      type: 'effect',
      description: '受到攻击时：增加数值等同于本效果强度的固定侵蚀点数（没有侵蚀值的目标则受到伤害）。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/shadow.svg',
      defaultLayers: 1,
      defaultStrength: 2
    },
    {
      id: 'burn',
      name: '燃烧',
      type: 'effect',
      description: '回合结束时：受到数值等同于本效果强度的固定伤害。效果生效后，本效果的层数减少1层。',
      icon: 'icons/svg/fire.svg',
      defaultLayers: 1,
      defaultStrength: 4
    },
    {
      id: 'breath',
      name: '呼吸',
      type: 'effect',
      description: '攻击命中时：呼吸强度和随机值大于15则暴击，触发暴击时使效果层数减少1层。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/breath.svg',
      defaultLayers: 1,
      defaultStrength: 5
    },
    {
      id: 'charge',
      name: '充能',
      type: 'effect',
      description: '特定技能发动附加效果所需的资源。最多叠加至20层。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/lightning.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'tremor',
      name: '震颤',
      type: 'effect',
      description: '受到造成【震颤引爆】的攻击时：混乱值前移等同于本效果强度的数值。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/frozen.svg',
      defaultLayers: 1,
      defaultStrength: 3
    },
    {
      id: 'ammo',
      name: '弹药',
      type: 'effect',
      description: '特定技能进行攻击时消耗的资源。缺少弹药时这些攻击将被取消。',
      icon: 'icons/svg/sword.svg',
      defaultLayers: 10,
      defaultStrength: 0
    },
    {
      id: 'chant',
      name: '吟唱',
      type: 'effect',
      description: '特定技能发动附加效果所需的资源。回合结束时，本效果的层数减少1层。',
      icon: 'icons/svg/book.svg',
      defaultLayers: 1,
      defaultStrength: 0
    },
    {
      id: 'paralyze',
      name: '麻痹',
      type: 'effect',
      description: '一回合内使骰子的变动值固定为0。每层影响1个骰子。',
      icon: 'icons/svg/paralysis.svg',
      defaultLayers: 1,
      defaultStrength: 0
    }
  ]
};

export default class CombatAreaApplication extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;

    // 从角色Flag加载战斗状态，如果没有则初始化
    this.combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      // Cost资源（6个）
      costResources: [false, false, false, false, false, false],
      // EX资源（3个）
      exResources: [false, false, false],
      // 战斗骰激活状态（6个）
      activatedDice: [false, false, false, false, false, false],
      // BUFF列表
      buffs: [],
      // 锁定状态
      isLocked: false
    };

    // 迁移/修复：确保costResources有6个元素
    if (!this.combatState.costResources || this.combatState.costResources.length !== 6) {
      this.combatState.costResources = [false, false, false, false, false, false];
    }

    // 迁移/修复：确保exResources有3个元素
    if (!this.combatState.exResources || this.combatState.exResources.length !== 3) {
      this.combatState.exResources = [false, false, false];
    }

    // 迁移/修复：确保activatedDice有6个元素
    if (!this.combatState.activatedDice || this.combatState.activatedDice.length !== 6) {
      this.combatState.activatedDice = [false, false, false, false, false, false];
    }

    // 迁移/修复：确保buffs数组存在
    if (!this.combatState.buffs) {
      this.combatState.buffs = [];
    }

    // 迁移/修复：确保isLocked属性存在
    if (this.combatState.isLocked === undefined) {
      this.combatState.isLocked = false;
    }
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
      width: 700,
      height: 900,
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
    context.isLocked = this.combatState.isLocked;

    // 准备战斗骰槽位数据
    context.combatDiceSlots = this._prepareCombatDiceSlots();

    // 准备装备数据
    context.equipment = this._prepareEquipment();

    // 准备被动骰槽位
    context.passiveDiceSlots = this._preparePassiveDiceSlots();

    // 计算速度值
    context.speedValues = this._calculateSpeedValues();

    return context;
  }

  /**
   * 准备战斗骰槽位数据（6个）
   */
  _prepareCombatDiceSlots() {
    const slots = [];
    for (let i = 0; i < 6; i++) {
      const diceId = this.actor.system.equipment.combatDice[i];
      if (diceId) {
        const item = this.actor.items.get(diceId);
        if (item) {
          slots.push({
            index: i,
            item: item,
            activated: this.combatState.activatedDice[i]
          });
        } else {
          slots.push({ index: i, item: null, activated: false });
        }
      } else {
        slots.push({ index: i, item: null, activated: false });
      }
    }
    return slots;
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
      slots: []
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

    // 装备槽（4个）
    for (let i = 0; i < 4; i++) {
      if (i === 0 && equipment.weapon) {
        equipment.slots.push(equipment.weapon);
      } else if (i === 1 && equipment.armor) {
        equipment.slots.push(equipment.armor);
      } else {
        equipment.slots.push(null);
      }
    }

    return equipment;
  }

  /**
   * 准备被动骰槽位（3个）
   */
  _preparePassiveDiceSlots() {
    const slots = [];
    const passives = this.actor.system.equipment.passives || [];

    for (let i = 0; i < 3; i++) {
      if (i < passives.length && passives[i]) {
        const item = this.actor.items.get(passives[i]);
        slots.push(item || null);
      } else {
        slots.push(null);
      }
    }

    return slots;
  }

  /**
   * 计算速度值
   * 速度=速度值为1D（体质小于9为6，大于9为4）+（敏捷/3向下取整）的结果
   */
  _calculateSpeedValues() {
    const constitution = this.actor.system.attributes.constitution || 0;
    const dexterity = this.actor.system.attributes.dexterity || 0;

    // 基础骰子大小
    const diceSize = constitution < 9 ? 6 : 4;

    // 固定加值
    const bonus = Math.floor(dexterity / 3);

    // 生成3个速度值
    return [
      Math.floor(Math.random() * diceSize) + 1 + bonus,
      Math.floor(Math.random() * diceSize) + 1 + bonus,
      Math.floor(Math.random() * diceSize) + 1 + bonus
    ];
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 锁定按钮
    html.find('.lock-btn').click(this._onToggleLock.bind(this));

    // 状态条值输入（解锁时可编辑）
    html.find('.bar-value-input').change(this._onStatusBarValueChange.bind(this));

    // 资源圈点击
    html.find('.resource-circle').click(this._onToggleResource.bind(this));

    // 控制按钮
    html.find('.draw-activate-btn').click(this._onDrawActivate.bind(this));
    html.find('.draw-one-btn').click(this._onDrawOne.bind(this));

    // 战斗骰按钮
    html.find('.dice-activate-toggle').click(this._onToggleDiceActivation.bind(this));
    html.find('.combat-dice-initiate-btn').click(this._onInitiateCombatDice.bind(this));

    // 先攻按钮
    html.find('.initiative-btn').click(this._onInitiative.bind(this));

    // 行动骰装扮按钮
    html.find('.action-dice-theme-btn').click(this._onSelectActionDiceTheme.bind(this));

    // 召唤行动骰按钮
    html.find('.summon-action-dice-btn').click(this._onSummonActionDice.bind(this));

    // BUFF操作
    html.find('.buff-value-input').change(this._onBuffValueChange.bind(this));
    html.find('.buff-trigger-btn').click(this._onBuffTrigger.bind(this));
    html.find('.buff-delete-btn').click(this._onBuffDelete.bind(this));
    html.find('.add-buff-btn').click(this._onAddBuff.bind(this));
  }

  /* -------------------------------------------- */
  /*  事件处理器                                    */
  /* -------------------------------------------- */

  /**
   * 切换锁定状态
   */
  async _onToggleLock(event) {
    event.preventDefault();
    this.combatState.isLocked = !this.combatState.isLocked;
    await this._saveCombatState();
    this.render();
  }

  /**
   * 状态条值变化（解锁时内联编辑）
   */
  async _onStatusBarValueChange(event) {
    event.preventDefault();
    const input = $(event.currentTarget);
    const barType = input.data('bar-type');
    const newValue = Math.max(0, parseInt(input.val()) || 0);

    const updateData = {};

    if (barType === 'hp') {
      updateData['system.derived.hp.value'] = newValue;
    } else if (barType === 'erosion') {
      updateData['system.derived.corruption.value'] = newValue;
    } else if (barType === 'chaos') {
      updateData['system.derived.chaos.value'] = newValue;
    }

    await this.actor.update(updateData);
    this.render();
  }

  /**
   * 切换资源圈
   */
  async _onToggleResource(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const type = button.data('type');
    const index = button.data('index');

    if (type === 'cost') {
      this.combatState.costResources[index] = !this.combatState.costResources[index];
    } else if (type === 'ex') {
      this.combatState.exResources[index] = !this.combatState.exResources[index];
    }

    await this._saveCombatState();
    this.render();
  }

  /**
   * 抽取激活：随机激活3个战斗骰
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

    // 随机抽取3个不重复的索引
    const drawCount = Math.min(3, availableIndices.length);
    const selectedIndices = [];

    for (let i = 0; i < drawCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      selectedIndices.push(availableIndices[randomIndex]);
      availableIndices.splice(randomIndex, 1);
    }

    let extraCost = 0;
    let extraEX = 0;

    // 处理每个选中的骰子
    for (const diceIndex of selectedIndices) {
      // 如果已经激活，增加Cost
      if (this.combatState.activatedDice[diceIndex]) {
        // 找到第一个空的Cost槽位
        for (let j = 0; j < 6; j++) {
          if (!this.combatState.costResources[j]) {
            this.combatState.costResources[j] = true;
            extraCost++;
            break;
          }
        }
      } else {
        this.combatState.activatedDice[diceIndex] = true;
      }
    }

    // 每3个重复激活添加1个EX资源
    if (extraCost >= 3) {
      const exToAdd = Math.floor(extraCost / 3);
      for (let i = 0; i < exToAdd; i++) {
        for (let j = 0; j < 3; j++) {
          if (!this.combatState.exResources[j]) {
            this.combatState.exResources[j] = true;
            extraEX++;
            break;
          }
        }
      }
    }

    let message = `抽取激活了 ${drawCount} 个战斗骰`;
    if (extraCost > 0) {
      message += `，重复激活获得 ${extraCost} 个Cost`;
    }
    if (extraEX > 0) {
      message += `，${extraEX} 个EX`;
    }

    await this._sendChatMessage(message);
    await this._saveCombatState();
    this.render();
  }

  /**
   * 抽取一个：随机激活1个战斗骰
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
    let extraCost = 0;
    let extraEX = 0;

    // 如果已经激活，增加Cost
    if (this.combatState.activatedDice[diceIndex]) {
      // 增加Cost资源
      for (let j = 0; j < 6; j++) {
        if (!this.combatState.costResources[j]) {
          this.combatState.costResources[j] = true;
          extraCost = 1;
          break;
        }
      }

      // 统计当前已有的Cost资源总数，检查是否达到3的倍数来添加EX
      const totalCost = this.combatState.costResources.filter(c => c).length;
      if (totalCost > 0 && totalCost % 3 === 0) {
        // 添加1个EX资源
        for (let j = 0; j < 3; j++) {
          if (!this.combatState.exResources[j]) {
            this.combatState.exResources[j] = true;
            extraEX = 1;
            break;
          }
        }
      }

      if (extraCost > 0) {
        message += `，重复激活获得1个Cost`;
      }
      if (extraEX > 0) {
        message += `，1个EX`;
      }
    } else {
      this.combatState.activatedDice[diceIndex] = true;
    }

    await this._sendChatMessage(message);
    await this._saveCombatState();
    this.render();
  }

  /**
   * 切换战斗骰激活状态
   */
  async _onToggleDiceActivation(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));

    this.combatState.activatedDice[index] = !this.combatState.activatedDice[index];

    await this._saveCombatState();
    this.render();
  }

  /**
   * 发起战斗骰挑战
   */
  async _onInitiateCombatDice(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const index = button.data('index');

    let item = null;

    if (index !== undefined) {
      const slot = this._prepareCombatDiceSlots()[index];
      if (slot && slot.item) {
        item = slot.item;
      }
    } else {
      // 可能是守备骰、触发骰或装备
      const title = button.attr('title');
      if (title) {
        const itemName = title.split('&#10;')[0];
        item = this.actor.items.find(i => i.name === itemName);
      }
    }

    if (!item) return;

    // 投骰
    const formula = item.system.diceFormula || '1d6';
    const roll = new Roll(formula);
    await roll.evaluate();

    // 显示 3D 骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    // 创建挑战数据
    const challengeData = {
      challengerId: this.actor.id,
      challengerName: this.actor.name,
      diceId: item.id,
      diceName: item.name,
      total: roll.total,
      messageId: null // 将由ChatMessage填充
    };

    // 创建挑战聊天卡片
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/combat-dice-challenge.hbs", {
        actor: this.actor,
        dice: item,
        total: roll.total,
        challengeData: challengeData
      }),
      sound: CONFIG.sounds.dice,
      flags: {
        'shuhai-dalu': {
          challengeData: challengeData
        }
      }
    };

    await ChatMessage.create(chatData);
  }

  /**
   * 投骰
   */
  async _rollDice(item) {
    const formula = item.system.diceFormula || '1d6';
    const roll = new Roll(formula);
    await roll.evaluate();

    // 创建聊天消息
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 4px; padding: 8px; color: #EBBD68;">
        <h3 style="margin: 0 0 8px 0; color: #EBBD68;">${item.name}</h3>
        <div style="font-size: 13px; margin-bottom: 6px;">${item.type} - ${item.system.category}</div>
        <div style="background: #EBBD68; color: #0F0D1B; padding: 6px; border-radius: 3px; font-weight: bold; text-align: center; font-size: 18px;">
          结果: ${roll.total}
        </div>
        ${item.system.effect ? `<div style="margin-top: 6px; font-size: 12px;">${item.system.effect}</div>` : ''}
      </div>`,
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll]
    };

    await ChatMessage.create(chatData);
  }

  /**
   * 先攻按钮：重新计算速度值
   */
  async _onInitiative(event) {
    event.preventDefault();

    const speeds = this._calculateSpeedValues();
    await this._sendChatMessage(`先攻速度：${speeds.join(', ')}`);

    this.render();
  }

  /**
   * 选择行动骰装扮
   */
  async _onSelectActionDiceTheme(event) {
    event.preventDefault();

    const themes = ['大自然', '永生蜜酒', '猪灵', '蔷薇之主', '蒸汽驱动', "AL-1S", "Bianh", "PMC"];

    const content = `
      <form>
        <div class="form-group">
          <label>选择行动骰装扮:</label>
          <select name="theme" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;">
            ${themes.map(theme => `<option value="${theme}">${theme}</option>`).join('')}
          </select>
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
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "select"
    }).render(true);
  }

  /**
   * 召唤行动骰
   */
  async _onSummonActionDice(event) {
    event.preventDefault();

    const theme = this.actor.getFlag('shuhai-dalu', 'actionDiceTheme') || '大自然';
    await this._sendChatMessage(`召唤了行动骰装扮：${theme}`);
    ui.notifications.info(`召唤行动骰：${theme}`);
  }

  /**
   * BUFF值变化
   */
  async _onBuffValueChange(event) {
    event.preventDefault();
    const input = $(event.currentTarget);
    const buffIndex = input.data('buff-index');
    const field = input.data('field');
    const value = parseInt(input.val()) || 0;

    if (this.combatState.buffs[buffIndex]) {
      this.combatState.buffs[buffIndex][field] = Math.max(0, value);
      await this._saveCombatState();
    }
  }

  /**
   * 触发BUFF
   */
  async _onBuffTrigger(event) {
    event.preventDefault();
    const buffIndex = parseInt($(event.currentTarget).data('buff-index'));
    const buff = this.combatState.buffs[buffIndex];

    if (!buff) return;

    await this._sendChatMessage(`触发BUFF：${buff.name}（层数：${buff.layers}，强度：${buff.strength}）\n${buff.description}`);
  }

  /**
   * 删除BUFF
   */
  async _onBuffDelete(event) {
    event.preventDefault();
    const buffIndex = parseInt($(event.currentTarget).data('buff-index'));

    this.combatState.buffs.splice(buffIndex, 1);

    await this._saveCombatState();
    this.render();
  }

  /**
   * 添加新BUFF
   */
  async _onAddBuff(event) {
    event.preventDefault();

    // 构建BUFF选择列表
    const allBuffs = [
      ...BUFF_TYPES.positive,
      ...BUFF_TYPES.negative,
      ...BUFF_TYPES.effect
    ];

    const content = `
      <form>
        <div class="form-group">
          <label>选择BUFF类型:</label>
          <select name="buffId" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px; font-size: 13px;">
            <optgroup label="增益BUFF" style="color: #4a7c2c;">
              ${BUFF_TYPES.positive.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
            <optgroup label="减益BUFF" style="color: #c14545;">
              ${BUFF_TYPES.negative.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
            <optgroup label="效果BUFF" style="color: #EBBD68;">
              ${BUFF_TYPES.effect.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
          <label>层数:</label>
          <input type="number" name="layers" value="1" min="0" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;"/>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
          <label>强度:</label>
          <input type="number" name="strength" value="0" min="0" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;"/>
        </div>
      </form>
    `;

    new Dialog({
      title: "添加新的BUFF",
      content: content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "添加",
          callback: async (html) => {
            const buffId = html.find('[name="buffId"]').val();
            const layers = parseInt(html.find('[name="layers"]').val()) || 1;
            const strength = parseInt(html.find('[name="strength"]').val()) || 0;

            // 查找BUFF定义
            const buffDef = allBuffs.find(b => b.id === buffId);
            if (!buffDef) return;

            // 添加到BUFF列表
            this.combatState.buffs.push({
              id: buffDef.id,
              name: buffDef.name,
              type: buffDef.type,
              description: buffDef.description,
              icon: buffDef.icon,
              layers: layers,
              strength: strength
            });

            await this._saveCombatState();
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "add"
    }).render(true);
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
      content: `<div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 4px; padding: 8px; color: #EBBD68;">${content}</div>`
    };

    if (roll) {
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.rolls = [roll];
      chatData.sound = CONFIG.sounds.dice;
    }

    await ChatMessage.create(chatData);
  }
}
