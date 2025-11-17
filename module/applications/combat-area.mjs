/**
 * 书海大陆 战斗区域应用 - 完全重新设计
 */
import { triggerBleedEffect } from "../services/combat-effects.mjs";
import { triggerItemActivities } from "../services/activity-service.mjs";
import { BUFF_TYPES } from "../constants/buff-types.mjs";

export default class CombatAreaApplication extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;

    // 从角色Flag加载战斗状态，如果没有则初始化
    this.combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      // Cost资源（6个）
      costResources: [false, false, false, false, false, false],
      // EX资源（3个，默认拥有3个）
      exResources: [true, true, true],
      // 战斗骰激活状态（6个）
      activatedDice: [false, false, false, false, false, false],
      // BUFF列表
      buffs: [],
      // 锁定状态
      isLocked: false,
      // 速度值（3个）
      speedValues: null
    };

    // 迁移/修复：确保costResources有6个元素
    if (!this.combatState.costResources || this.combatState.costResources.length !== 6) {
      this.combatState.costResources = [false, false, false, false, false, false];
    }

    // 迁移/修复：确保exResources有3个元素
    if (!this.combatState.exResources || this.combatState.exResources.length !== 3) {
      this.combatState.exResources = [true, true, true];
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

    // 初始化速度值（如果还没有）
    if (!this.combatState.speedValues) {
      this.combatState.speedValues = this._calculateSpeedValues();
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

    // 重新加载战斗状态（确保同步）
    const savedState = this.actor.getFlag('shuhai-dalu', 'combatState');
    if (savedState) {
      this.combatState = savedState;
    }

    // 对BUFF进行排序：本回合的在前，下回合的在后
    if (this.combatState.buffs) {
      this.combatState.buffs.sort((a, b) => {
        const aRound = a.roundTiming || 'current';
        const bRound = b.roundTiming || 'current';

        // 本回合的在前
        if (aRound === 'current' && bRound !== 'current') return -1;
        if (aRound !== 'current' && bRound === 'current') return 1;

        // 同类型按名称排序
        return a.name.localeCompare(b.name);
      });
    }

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

    // 使用保存的速度值，并应用迅捷/束缚BUFF效果（只考虑本回合的BUFF）
    context.speedValues = this._applySpeedModifiers(this.combatState.speedValues);

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

    // 装备槽（4个）- 使用gear数组（装备栏1-4）
    const gearArray = this.actor.system.equipment.gear || ["", "", "", ""];
    for (let i = 0; i < 4; i++) {
      if (gearArray[i]) {
        const item = this.actor.items.get(gearArray[i]);
        equipment.slots.push(item || null);
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

  /**
   * 应用迅捷/束缚BUFF对速度值的修正
   * 只考虑本回合的BUFF（roundTiming='current'或未设置）
   */
  _applySpeedModifiers(baseSpeedValues) {
    if (!baseSpeedValues) return [0, 0, 0];

    let modifier = 0;

    // 计算迅捷/束缚的修正值（只考虑本回合的BUFF）
    if (this.combatState.buffs) {
      for (const buff of this.combatState.buffs) {
        const timing = buff.roundTiming || 'current';
        // 只考虑本回合的BUFF
        if (timing === 'current') {
          if (buff.id === 'swift' && buff.layers > 0) {
            // 迅捷：速度增加
            modifier += buff.layers;
          } else if (buff.id === 'bound' && buff.layers > 0) {
            // 束缚：速度减少
            modifier -= buff.layers;
          }
        }
      }
    }

    // 应用修正（确保速度值不会小于0）
    return baseSpeedValues.map(speed => Math.max(0, speed + modifier));
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
    html.find('.discard-btn').click(this._onDiscard.bind(this));

    // 战斗骰按钮
    html.find('.dice-activate-toggle').click(this._onToggleDiceActivation.bind(this));
    html.find('.combat-dice-initiate-btn').click(this._onInitiateCombatDice.bind(this));

    // 装备使用按钮
    html.find('.equipment-use-btn').click(this._onEquipmentUse.bind(this));

    // 武器/防具/被动骰/触发骰使用按钮
    html.find('.weapon-use-btn').click(this._onWeaponUse.bind(this));
    html.find('.armor-use-btn').click(this._onArmorUse.bind(this));
    html.find('.passive-dice-use-btn').click(this._onPassiveDiceUse.bind(this));
    html.find('.trigger-dice-use-btn').click(this._onTriggerDiceUse.bind(this));

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
    const drawnDice = []; // 记录抽到的骰子

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
        // 记录新激活的骰子（可能触发闪击）
        const diceId = this.actor.system.equipment.combatDice[diceIndex];
        if (diceId) {
          const dice = this.actor.items.get(diceId);
          if (dice) {
            drawnDice.push({ dice, diceIndex });
          }
        }
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

    // 检查新激活的骰子是否有闪击效果
    await this._checkFlashStrike(drawnDice);
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
    const drawnDice = []; // 记录抽到的骰子

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
      // 记录新激活的骰子（可能触发闪击）
      const diceId = this.actor.system.equipment.combatDice[diceIndex];
      if (diceId) {
        const dice = this.actor.items.get(diceId);
        if (dice) {
          drawnDice.push({ dice, diceIndex });
        }
      }
    }

    await this._sendChatMessage(message);
    await this._saveCombatState();
    this.render();

    // 检查新激活的骰子是否有闪击效果
    await this._checkFlashStrike(drawnDice);
  }

  /**
   * 检查新激活的骰子是否有闪击效果
   * @param {Array} drawnDice - 抽到的骰子数组 [{dice, diceIndex}, ...]
   */
  async _checkFlashStrike(drawnDice) {
    if (drawnDice.length === 0) return;

    // 检查是否有骰子带有闪击效果
    const flashStrikeDice = drawnDice.filter(({ dice }) => {
      if (!dice.system.activities) return false;
      return Object.values(dice.system.activities).some(
        activity => activity.trigger === 'onFlashStrike'
      );
    });

    if (flashStrikeDice.length === 0) return;

    // 构建提示消息
    const diceNames = flashStrikeDice.map(({ dice }) => dice.name).join('、');
    const shouldTrigger = await new Promise((resolve) => {
      new Dialog({
        title: "触发闪击效果",
        content: `
          <div style="padding: 16px; font-family: 'Noto Sans SC', sans-serif;">
            <p style="margin-bottom: 12px; font-size: 14px; color: #EBBD68;">
              抽到了带有【闪击☪】效果的战斗骰：<strong style="color: #f3c267;">${diceNames}</strong>
            </p>
            <p style="font-size: 13px; color: #888;">是否要触发闪击效果？</p>
          </div>
        `,
        buttons: {
          yes: {
            icon: '<i class="fas fa-bolt"></i>',
            label: "触发闪击",
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "取消",
            callback: () => resolve(false)
          }
        },
        default: "yes"
      }).render(true);
    });

    if (shouldTrigger) {
      // 打开闪击骰子选择对话框
      const SpecialDiceDialog = (await import('./special-dice-dialog.mjs')).default;
      new SpecialDiceDialog(this.actor, 'onFlashStrike').render(true);
    }
  }

  /**
   * 丢弃：打开丢弃骰子选择对话框
   */
  async _onDiscard(event) {
    event.preventDefault();

    // 打开丢弃骰子选择对话框
    const SpecialDiceDialog = (await import('./special-dice-dialog.mjs')).default;
    new SpecialDiceDialog(this.actor, 'onDiscard').render(true);
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
   * 发起战斗骰对抗
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

    // 特殊处理：触发骰和守备骰不能主动发起
    if (item.type === 'triggerDice' || item.type === 'defenseDice') {
      ui.notifications.warn("触发骰和守备骰只能在对抗时使用");
      return;
    }

    // 检查是否为战斗骰类型(攻击骰或射击骰)
    if (item.type !== 'combatDice' && item.type !== 'shootDice') {
      ui.notifications.warn("只有战斗骰可以发起对抗");
      return;
    }

    // 触发【攻击时】activities
    await this._triggerActivities(item, 'onAttack');

    // 触发【流血】效果
    const bleedResult = await triggerBleedEffect(this.actor);
    if (bleedResult.triggered) {
      await this._sendChatMessage(`<div style="color: #c14545;">${bleedResult.message}</div>`);
    }

    // 请求调整值
    const adjustment = await this._requestAdjustmentForInitiate();
    if (adjustment === null) return; // 用户取消

    // 计算发起者的BUFF加成
    const buffBonus = this._calculateInitiatorBuffBonus();

    // 获取选择的目标（如果有）
    const targets = Array.from(game.user.targets);
    const targetActor = targets.length > 0 ? targets[0].actor : null;

    // 创建发起数据（不提前投骰，等对抗时再投）
    const initiateData = {
      initiatorId: this.actor.id,
      initiatorName: this.actor.name,
      diceId: item.id,
      diceName: item.name,
      diceFormula: item.system.diceFormula,
      diceImg: item.img,
      diceCost: item.system.cost || 0,
      diceType: item.type,
      diceCategory: item.system.category || '',
      diceEffect: item.system.effect || '无特殊效果',
      diceRoll: null, // 不提前投骰
      buffBonus: buffBonus,
      adjustment: adjustment,
      targetId: targetActor ? targetActor.id : null,
      targetName: targetActor ? targetActor.name : null
    };

    // 使用后解除激活状态
    if (index !== undefined) {
      this.combatState.activatedDice[index] = false;
      await this._saveCombatState();
      this.render();
    }

    // 创建发起对抗聊天卡片
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/combat-dice-initiate.hbs", initiateData),
      sound: CONFIG.sounds.dice,
      flags: {
        'shuhai-dalu': {
          initiateData: initiateData
        }
      }
    };

    await ChatMessage.create(chatData);
  }

  /**
   * 计算发起者的BUFF加成
   */
  _calculateInitiatorBuffBonus() {
    let bonus = 0;

    if (!this.combatState.buffs) return bonus;

    for (const buff of this.combatState.buffs) {
      const timing = buff.roundTiming || 'current';
      // 只应用当前回合的BUFF
      if (timing !== 'current') continue;

      if (buff.id === 'strong') {
        // 强壮：骰数增加
        bonus += buff.layers;
      } else if (buff.id === 'weak') {
        // 虚弱：骰数减少
        bonus -= buff.layers;
      }
      // 可以添加更多BUFF效果
    }

    return bonus;
  }

  /**
   * 请求发起者的调整值
   */
  async _requestAdjustmentForInitiate() {
    return new Promise((resolve) => {
      new Dialog({
        title: "输入调整值",
        content: `
          <form>
            <div class="form-group">
              <label>调整值:</label>
              <input type="number" name="adjustment" value="0" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;"/>
            </div>
          </form>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "确认",
            callback: (html) => {
              const adj = parseInt(html.find('[name="adjustment"]').val()) || 0;
              resolve(adj);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "取消",
            callback: () => resolve(null)
          }
        },
        default: "confirm"
      }).render(true);
    });
  }

  /**
   * 使用装备
   */
  async _onEquipmentUse(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const slotIndex = parseInt(button.data('slot-index'));

    // 从gear数组获取装备
    const gearArray = this.actor.system.equipment.gear || ["", "", "", ""];
    if (slotIndex >= 0 && slotIndex < 4 && gearArray[slotIndex]) {
      const item = this.actor.items.get(gearArray[slotIndex]);

      if (!item) return;

      // 触发【使用时】Activities
      const activitySuccess = await this._triggerActivities(item, 'onUse');

      // 如果没有成功的activity（没有activity或没有有效effects），发送普通使用消息
      if (!activitySuccess) {
        await this._sendChatMessage(`
          <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用装备: ${item.name}</h3>
            <div style="color: #888; margin-bottom: 8px;">费用: ${item.system.cost || 0}</div>
            <div style="color: #EBBD68;">${item.system.effect || '无特殊效果'}</div>
          </div>
        `);
      }
    }
  }

  /**
   * 使用武器
   */
  async _onWeaponUse(event) {
    event.preventDefault();

    const weapon = this.actor.items.get(this.actor.system.equipment.weapon);
    if (!weapon) return;

    // 触发【使用时】Activities
    const activitySuccess = await this._triggerActivities(weapon, 'onUse');

    // 如果没有成功的activity，发送普通使用消息
    if (!activitySuccess) {
      await this._sendChatMessage(`
        <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用武器: ${weapon.name}</h3>
          <div style="color: #888; margin-bottom: 8px;">分类: ${weapon.system.category || '无'}</div>
          <div style="color: #EBBD68;">${weapon.system.effect || '无特殊效果'}</div>
        </div>
      `);
    }
  }

  /**
   * 使用防具
   */
  async _onArmorUse(event) {
    event.preventDefault();

    const armor = this.actor.items.get(this.actor.system.equipment.armor);
    if (!armor) return;

    // 触发【使用时】Activities
    const activitySuccess = await this._triggerActivities(armor, 'onUse');

    // 如果没有成功的activity，发送普通使用消息
    if (!activitySuccess) {
      await this._sendChatMessage(`
        <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用防具: ${armor.name}</h3>
          <div style="color: #888; margin-bottom: 8px;">分类: ${armor.system.category || '无'}</div>
          <div style="color: #EBBD68;">${armor.system.effect || '无特殊效果'}</div>
        </div>
      `);
    }
  }

  /**
   * 使用被动骰
   */
  async _onPassiveDiceUse(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const passiveIndex = parseInt(button.data('passive-index'));

    const passives = this.actor.system.equipment.passives || [];
    if (passiveIndex >= 0 && passiveIndex < passives.length && passives[passiveIndex]) {
      const item = this.actor.items.get(passives[passiveIndex]);

      if (!item) return;

      // 触发【使用时】Activities
      const activitySuccess = await this._triggerActivities(item, 'onUse');

      // 如果没有成功的activity，发送普通使用消息
      if (!activitySuccess) {
        await this._sendChatMessage(`
          <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用被动骰: ${item.name}</h3>
            <div style="color: #888; margin-bottom: 8px;">分类: ${item.system.category || '无'}</div>
            <div style="color: #EBBD68;">${item.system.effect || '无特殊效果'}</div>
          </div>
        `);
      }
    }
  }

  /**
   * 使用触发骰（消耗1个EX资源）
   */
  async _onTriggerDiceUse(event) {
    event.preventDefault();

    const triggerDice = this.actor.items.get(this.actor.system.equipment.triggerDice);
    if (!triggerDice) return;

    // 检查是否有可用的EX资源（找到第一个true，表示拥有资源）
    const availableIndex = this.combatState.exResources.findIndex(ex => ex === true);

    if (availableIndex === -1) {
      ui.notifications.warn("没有可用的EX资源！");
      return;
    }

    // 消耗1个EX资源（将true变为false，实心变空心）
    this.combatState.exResources[availableIndex] = false;
    await this._saveCombatState();

    // 发送使用消息到聊天框
    await this._sendChatMessage(`
      <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用触发骰: ${triggerDice.name}</h3>
        <div style="color: #888; margin-bottom: 8px;">消耗: <span style="color: #c14545; font-weight: bold;">1 EX资源</span></div>
        <div style="color: #888; margin-bottom: 8px;">分类: ${triggerDice.system.category || '无'}</div>
        <div style="color: #EBBD68;">${triggerDice.system.effect || '无特殊效果'}</div>
      </div>
    `);

    // 触发【使用时】Activities
    await this._triggerActivities(triggerDice, 'onUse');

    ui.notifications.info(`使用了 ${triggerDice.name}，消耗了1个EX资源！`);

    // 刷新界面以显示更新后的EX资源
    this.render();
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

    // 重新计算速度值并保存
    const speeds = this._calculateSpeedValues();
    this.combatState.speedValues = speeds;
    await this._saveCombatState();

    const totalSpeed = speeds.reduce((sum, speed) => sum + speed, 0);

    // 更新角色的总速度资源（用于战斗遭遇先攻追踪）
    await this.actor.update({ 'system.derived.totalSpeed': totalSpeed });

    await this._sendChatMessage(`先攻速度：${speeds.join(', ')} (总速度: ${totalSpeed})`);

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

    // 检查是否是下回合的BUFF（带有'N'标记）
    if (buff.roundTiming === 'next' || buff.roundTiming === 'both') {
      ui.notifications.warn(`${buff.name} 是下回合的效果，本回合无法触发！`);
      return;
    }

    // 检查层数是否为0
    if (buff.layers <= 0) {
      ui.notifications.warn(`${buff.name} 的层数已为0，无法触发！`);
      return;
    }

    let effectApplied = false;
    let effectMessage = '';

    // 根据BUFF ID执行不同的触发效果
    switch (buff.id) {
      case 'rupture': // 破裂
        // 造成等于强度的固定生命值伤害
        const ruptureDamage = buff.strength;
        const newHpRupture = Math.max(0, this.actor.system.derived.hp.value - ruptureDamage);
        await this.actor.update({ 'system.derived.hp.value': newHpRupture });
        effectMessage = `<span style="color: #15D4B2; font-weight: bold;">破裂触发：受到 ${ruptureDamage} 点固定伤害</span>`;
        effectApplied = true;
        break;

      case 'corruption_effect': // 沉沦
        // 增加等于强度的侵蚀度
        const corruptionIncrease = buff.strength;
        const newCorruption = Math.min(
          this.actor.system.derived.corruption.max,
          this.actor.system.derived.corruption.value + corruptionIncrease
        );
        await this.actor.update({ 'system.derived.corruption.value': newCorruption });
        effectMessage = `<span style="color: #2472E1; font-weight: bold;">沉沦触发：侵蚀度增加 ${corruptionIncrease} 点</span>`;
        effectApplied = true;
        break;

      case 'bleed': // 流血
        // 对自己造成等于强度的固定伤害
        const bleedDamage = buff.strength;
        const newHpBleed = Math.max(0, this.actor.system.derived.hp.value - bleedDamage);
        await this.actor.update({ 'system.derived.hp.value': newHpBleed });
        effectMessage = `<span style="color: #BA1B23; font-weight: bold;">流血触发：受到 ${bleedDamage} 点固定伤害</span>`;
        effectApplied = true;
        break;

      case 'burn': // 燃烧
        // 对自己造成等于强度的固定伤害
        const burnDamage = buff.strength;
        const newHpBurn = Math.max(0, this.actor.system.derived.hp.value - burnDamage);
        await this.actor.update({ 'system.derived.hp.value': newHpBurn });
        effectMessage = `<span style="color: #E09828; font-weight: bold;">燃烧触发：受到 ${burnDamage} 点固定伤害</span>`;
        effectApplied = true;
        break;

      case 'tremor': // 震颤
        // 增加等于强度的混乱值
        const chaosIncrease = buff.strength;
        const newChaos = Math.min(
          this.actor.system.derived.chaos.max,
          this.actor.system.derived.chaos.value + chaosIncrease
        );
        await this.actor.update({ 'system.derived.chaos.value': newChaos });
        effectMessage = `<span style="color: #EECBA2; font-weight: bold;">震颤触发：混乱值增加 ${chaosIncrease} 点</span>`;
        effectApplied = true;
        break;

      default:
        // 其他BUFF：只显示触发信息，不执行特殊效果
        effectMessage = `<span style="color: #EBBD68;">触发 ${buff.name}（层数：${buff.layers}，强度：${buff.strength}）</span>`;
        break;
    }

    // 效果生效后，层数减少1
    if (effectApplied) {
      buff.layers -= 1;

      // 如果层数降为0，移除BUFF
      if (buff.layers <= 0) {
        this.combatState.buffs.splice(buffIndex, 1);
        effectMessage += `<br><span style="color: #888;">【${buff.name}】层数降为0，已移除</span>`;
      }

      // 保存战斗状态
      await this._saveCombatState();
    }

    // 发送触发效果消息到聊天框
    await this._sendChatMessage(`
      <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #E1AA43;">BUFF 触发</h3>
        <div style="color: #EBBD68; margin-bottom: 8px;">
          <strong>${buff.name}</strong> (层数: ${effectApplied ? buff.layers + 1 : buff.layers} → ${buff.layers} | 强度: ${buff.strength})
        </div>
        <div style="color: #EBBD68; font-size: 13px; line-height: 1.6;">
          ${effectMessage}
        </div>
      </div>
    `);

    // 刷新界面
    this.render();
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
          <select name="buffId" id="buffIdSelect" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px; font-size: 13px;">
            <optgroup label="增益BUFF" style="color: #4a7c2c;">
              ${BUFF_TYPES.positive.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
            <optgroup label="减益BUFF" style="color: #c14545;">
              ${BUFF_TYPES.negative.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
            <optgroup label="效果BUFF" style="color: #EBBD68;">
              ${BUFF_TYPES.effect.map(buff => `<option value="${buff.id}">${buff.name} - ${buff.description.substring(0, 50)}...</option>`).join('')}
            </optgroup>
            <optgroup label="自定义" style="color: #f3c267;">
              <option value="custom">自定义BUFF</option>
            </optgroup>
          </select>
        </div>
        <div class="form-group" id="customNameGroup" style="margin-top: 1rem; display: none;">
          <label>自定义名称:</label>
          <input type="text" name="customName" placeholder="输入BUFF名称" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;"/>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
          <label>回合:</label>
          <select name="roundTiming" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;">
            <option value="current">本回合</option>
            <option value="next">下回合</option>
            <option value="both">本回合和下回合</option>
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

    const dialog = new Dialog({
      title: "添加新的BUFF",
      content: content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "添加",
          callback: async (html) => {
            const buffId = html.find('[name="buffId"]').val();
            const customName = html.find('[name="customName"]').val();
            const roundTiming = html.find('[name="roundTiming"]').val();
            const layers = parseInt(html.find('[name="layers"]').val()) || 1;
            const strength = parseInt(html.find('[name="strength"]').val()) || 0;

            let newBuff;

            if (buffId === 'custom') {
              // 自定义BUFF
              if (!customName || customName.trim() === '') {
                ui.notifications.warn('请输入自定义BUFF名称');
                return;
              }

              newBuff = {
                id: 'custom',
                name: customName.trim(),
                type: 'effect',
                description: '自定义效果',
                icon: 'icons/svg/mystery-man.svg',
                layers: layers,
                strength: strength,
                roundTiming: roundTiming
              };
            } else {
              // 预设BUFF
              const buffDef = allBuffs.find(b => b.id === buffId);
              if (!buffDef) return;

              newBuff = {
                id: buffDef.id,
                name: buffDef.name,
                type: buffDef.type,
                description: buffDef.description,
                icon: buffDef.icon,
                layers: layers,
                strength: strength,
                roundTiming: roundTiming
              };
            }

            // 添加到BUFF列表
            this.combatState.buffs.push(newBuff);

            await this._saveCombatState();
            this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "add",
      render: (html) => {
        // 监听BUFF类型选择变化
        html.find('#buffIdSelect').change((e) => {
          const selectedValue = $(e.currentTarget).val();
          const customNameGroup = html.find('#customNameGroup');

          if (selectedValue === 'custom') {
            customNameGroup.show();
          } else {
            customNameGroup.hide();
          }
        });
      }
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

  /**
   * 触发 Activities (使用新的 Activity 系统 v2.0)
   * @param {Item} item - 触发的物品
   * @param {string} triggerType - 触发类型 (onUse, onAttack, onCounter 等)
   * @param {Actor} targetActor - 目标角色（可选）
   * @returns {boolean} 是否有任何activity成功应用了效果
   */
  async _triggerActivities(item, triggerType, targetActor = null) {
    if (!item) {
      return false;
    }

    console.log('【战斗区域】触发 Activities:', {
      item: item.name,
      triggerType,
      target: targetActor?.name
    });

    // 使用新的 activity-service
    const hasTriggered = await triggerItemActivities(this.actor, item, triggerType, targetActor);

    return hasTriggered;
  }

  /**
   * 执行单个 Activity
   * @param {Item} item - 触发的物品
   * @param {object} activity - Activity 数据
   * @returns {boolean} 是否成功应用了效果
   */
  async _executeActivity(item, activity) {
    // 检查消耗
    if (activity.hasConsume && activity.consumes && activity.consumes.length > 0) {
      const canConsume = this._checkActivityConsumes(activity.consumes);
      if (!canConsume) {
        ui.notifications.warn(`无法使用 ${item.name}：消耗不足`);
        return false;
      }
      // 扣除消耗
      await this._consumeActivityBuffs(activity.consumes);
    }

    // 确定目标
    const targets = this._getActivityTargets(activity.target);

    // 应用效果到每个目标，记录是否有成功的
    let hasSuccess = false;
    for (const target of targets) {
      const success = await this._applyActivityEffects(target, activity, item);
      if (success) hasSuccess = true;

      // 执行特殊动作
      if (target && activity.specialActions) {
        await this._executeSpecialActions(target, activity.specialActions, item);
      }
    }

    return hasSuccess;
  }

  /**
   * 执行特殊动作
   * @param {Actor} targetActor - 目标角色
   * @param {object} specialActions - 特殊动作对象
   * @param {Item} sourceItem - 源物品
   */
  async _executeSpecialActions(targetActor, specialActions, sourceItem) {
    if (!specialActions) return;

    // 震颤引爆
    if (specialActions.tremorExplode) {
      const { triggerTremorExplode } = await import('../shuhai-dalu.mjs');
      const result = await triggerTremorExplode(targetActor);

      if (result.triggered) {
        await this._sendChatMessage(`
          <div style="border: 2px solid #EECBA2; border-radius: 4px; padding: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #EECBA2;">特殊动作触发</h3>
            <div style="color: #EBBD68;">来源: ${sourceItem.name}</div>
            <div style="color: #EBBD68; margin-top: 8px;">
              ${result.message}
            </div>
          </div>
        `);
      }
    }
  }

  /**
   * 检查 Activity 的消耗是否足够
   * @param {Array} consumes - 消耗列表
   * @returns {boolean} 是否足够
   */
  _checkActivityConsumes(consumes) {
    for (const consume of consumes) {
      const buffId = consume.buffId;
      const requiredLayers = consume.layers || 0;

      // 在当前战斗状态中查找对应的 BUFF
      const buff = this.combatState.buffs.find(b => b.id === buffId);

      if (!buff || buff.layers < requiredLayers) {
        return false;
      }
    }
    return true;
  }

  /**
   * 消耗 Activity 所需的 BUFFs
   * @param {Array} consumes - 消耗列表
   */
  async _consumeActivityBuffs(consumes) {
    for (const consume of consumes) {
      const buffId = consume.buffId;
      const consumeLayers = consume.layers || 0;

      // 查找对应的 BUFF
      const buffIndex = this.combatState.buffs.findIndex(b => b.id === buffId);

      if (buffIndex !== -1) {
        this.combatState.buffs[buffIndex].layers -= consumeLayers;

        // 如果层数降为 0 或更低，删除 BUFF
        if (this.combatState.buffs[buffIndex].layers <= 0) {
          this.combatState.buffs.splice(buffIndex, 1);
        }
      }
    }

    await this._saveCombatState();
    this.render();
  }

  /**
   * 获取 Activity 的目标列表
   * @param {string} targetType - 目标类型 (self, selected, multiple)
   * @returns {Array} 目标角色数组（可能包含null，表示未选中目标）
   */
  _getActivityTargets(targetType) {
    if (targetType === 'self') {
      return [this.actor];
    } else if (targetType === 'selected') {
      // 获取选中的目标
      const targets = Array.from(game.user.targets);
      if (targets.length > 0) {
        return [targets[0].actor];
      } else {
        // 如果没有选中目标，返回null（将创建"所有人都可以点击"的按钮）
        ui.notifications.info("未选中目标，将创建所有人都可点击的效果按钮");
        return [null];
      }
    } else if (targetType === 'multiple') {
      // 获取所有选中的目标
      const targets = Array.from(game.user.targets);
      if (targets.length > 0) {
        return targets.map(t => t.actor);
      } else {
        ui.notifications.info("未选中目标，将创建所有人都可点击的效果按钮");
        return [null];
      }
    }

    return [this.actor];
  }

  /**
   * 应用 Activity 的效果到目标
   * @param {Actor|null} targetActor - 目标角色（null表示未选中目标，将创建所有人可点击的按钮）
   * @param {object} activity - Activity 数据
   * @param {Item} sourceItem - 源物品
   * @returns {boolean} 是否成功应用了效果（对于其他角色，表示是否创建了BUFF消息）
   */
  async _applyActivityEffects(targetActor, activity, sourceItem) {
    // 如果目标是null（未选中），创建所有人可点击的聊天按钮
    if (targetActor === null) {
      return await this._applyEffectsToOther(null, activity, sourceItem);
    }
    // 如果目标是自己，直接操作 combatState
    else if (targetActor.id === this.actor.id) {
      await this._applyEffectsToSelf(activity, sourceItem);
      return true;
    }
    // 如果目标是其他角色，创建只有目标可点击的聊天按钮
    else {
      return await this._applyEffectsToOther(targetActor, activity, sourceItem);
    }
  }

  /**
   * 解析并评估骰子公式或数字
   * @param {string|number} formula - 骰子公式或数字（如 "1d8", "2d6+3", "5"）
   * @returns {object} { value: 结果值, formula: 原始公式, isRoll: 是否为骰子投掷 }
   */
  async _evaluateDiceFormula(formula) {
    // 转换为字符串并去除空格
    const formulaStr = String(formula || "0").trim();

    // 如果是纯数字，直接返回
    if (/^-?\d+$/.test(formulaStr)) {
      return {
        value: parseInt(formulaStr),
        formula: formulaStr,
        isRoll: false
      };
    }

    // 如果包含骰子符号（d 或 D），则使用 Roll 评估
    if (/\d+[dD]\d+/.test(formulaStr)) {
      try {
        const roll = new Roll(formulaStr);
        await roll.evaluate();
        return {
          value: roll.total,
          formula: formulaStr,
          isRoll: true,
          roll: roll
        };
      } catch (error) {
        console.error(`骰子公式解析失败: ${formulaStr}`, error);
        return {
          value: 0,
          formula: formulaStr,
          isRoll: false,
          error: true
        };
      }
    }

    // 其他情况（如纯加减法），尝试使用 Roll 评估
    try {
      const roll = new Roll(formulaStr);
      await roll.evaluate();
      return {
        value: roll.total,
        formula: formulaStr,
        isRoll: false
      };
    } catch (error) {
      console.error(`公式解析失败: ${formulaStr}`, error);
      return {
        value: 0,
        formula: formulaStr,
        isRoll: false,
        error: true
      };
    }
  }

  /**
   * 应用效果到自己
   * @param {object} activity - Activity 数据
   * @param {Item} sourceItem - 源物品
   */
  async _applyEffectsToSelf(activity, sourceItem) {
    const effects = activity.effects || {};
    const buffMessages = [];

    // 获取回合计数设置，默认为'current'（本回合）
    const roundTiming = activity.roundTiming || 'current';

    // 预设 BUFF 列表（从 BUFF_TYPES 中获取）
    const allBuffs = [
      ...BUFF_TYPES.positive,
      ...BUFF_TYPES.negative,
      ...BUFF_TYPES.effect
    ];

    // 应用每个效果
    for (const [buffId, effectData] of Object.entries(effects)) {
      // 评估层数和强度（支持骰子公式）
      const layersResult = await this._evaluateDiceFormula(effectData.layers || 0);
      const strengthResult = await this._evaluateDiceFormula(effectData.strength || 0);

      const layers = layersResult.value;
      const strength = strengthResult.value;

      if (layers === 0) continue;

      // 查找 BUFF 定义
      const buffDef = allBuffs.find(b => b.id === buffId);
      if (!buffDef) {
        console.warn(`未找到 BUFF 定义: ${buffId}`);
        continue;
      }

      // 检查是否已存在相同id和roundTiming的BUFF（分开管理）
      const existingBuffIndex = this.combatState.buffs.findIndex(
        b => b.id === buffId && b.roundTiming === roundTiming
      );

      // 构建消息
      let message = '';
      if (layersResult.isRoll) {
        message = `${buffDef.name} +${layers}层 [${layersResult.formula}=${layers}]`;
      } else {
        message = `${buffDef.name} +${layers}层`;
      }

      // 添加回合标记到消息
      if (roundTiming === 'next') {
        message += ' (下回合)';
      } else if (roundTiming === 'both') {
        message += ' (本回合和下回合)';
      }

      if (existingBuffIndex !== -1) {
        // 如果已存在相同id和roundTiming的BUFF，增加层数和强度
        this.combatState.buffs[existingBuffIndex].layers += layers;
        // 强度也相加（而不是替换）
        this.combatState.buffs[existingBuffIndex].strength += strength;
        message += ` (当前${this.combatState.buffs[existingBuffIndex].layers}层 ${this.combatState.buffs[existingBuffIndex].strength}强度)`;
        if (strengthResult.isRoll && strength !== 0) {
          message += ` 强度[${strengthResult.formula}=${strength}]`;
        }
      } else {
        // 如果不存在，添加新 BUFF
        this.combatState.buffs.push({
          id: buffDef.id,
          name: buffDef.name,
          type: buffDef.type,
          description: buffDef.description,
          icon: buffDef.icon,
          layers: layers,
          strength: strength !== 0 ? strength : buffDef.defaultStrength,
          roundTiming: roundTiming  // 添加回合计数字段
        });
        if (strengthResult.isRoll && strength !== 0) {
          message += ` 强度[${strengthResult.formula}=${strength}]`;
        } else if (strength !== 0) {
          message += ` ${strength}强度`;
        }
      }

      buffMessages.push(message);
    }

    // 应用自定义效果（如果启用）
    if (activity.customEffect && activity.customEffect.enabled) {
      const customName = activity.customEffect.name || "自定义效果";
      const layersResult = await this._evaluateDiceFormula(activity.customEffect.layers || 0);
      const strengthResult = await this._evaluateDiceFormula(activity.customEffect.strength || 0);

      const customLayers = layersResult.value;
      const customStrength = strengthResult.value;

      if (customLayers > 0) {
        // 自定义效果使用名称和roundTiming作为唯一标识（分开管理）
        const existingCustomIndex = this.combatState.buffs.findIndex(
          b => b.name === customName && b.id === 'custom' && b.roundTiming === roundTiming
        );

        let message = '';
        if (layersResult.isRoll) {
          message = `${customName} +${customLayers}层 [${layersResult.formula}=${customLayers}]`;
        } else {
          message = `${customName} +${customLayers}层`;
        }

        // 添加回合标记到消息
        if (roundTiming === 'next') {
          message += ' (下回合)';
        } else if (roundTiming === 'both') {
          message += ' (本回合和下回合)';
        }

        if (existingCustomIndex !== -1) {
          this.combatState.buffs[existingCustomIndex].layers += customLayers;
          // 强度也相加（而不是替换）
          this.combatState.buffs[existingCustomIndex].strength += customStrength;
          message += ` (当前${this.combatState.buffs[existingCustomIndex].layers}层 ${this.combatState.buffs[existingCustomIndex].strength}强度)`;
        } else {
          this.combatState.buffs.push({
            id: 'custom',
            name: customName,
            type: 'effect',
            description: '自定义效果',
            icon: 'icons/svg/mystery-man.svg',
            layers: customLayers,
            strength: customStrength,
            roundTiming: roundTiming  // 添加回合计数字段
          });
        }

        if (strengthResult.isRoll && customStrength !== 0) {
          message += ` 强度[${strengthResult.formula}=${customStrength}]`;
        } else if (customStrength !== 0) {
          message += ` ${customStrength}强度`;
        }

        buffMessages.push(message);
      }
    }

    // 保存战斗状态
    await this._saveCombatState();
    this.render();

    // 发送效果消息到聊天
    if (buffMessages.length > 0) {
      await this._sendChatMessage(`
        <div style="border: 2px solid #4a7c2c; border-radius: 4px; padding: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #4a7c2c;">【${activity.name || '效果'}】触发</h3>
          <div style="color: #EBBD68;">来源: ${sourceItem.name}</div>
          <div style="color: #EBBD68;">目标: 自己</div>
          <ul style="margin: 8px 0; padding-left: 20px; color: #EBBD68;">
            ${buffMessages.map(msg => `<li>${msg}</li>`).join('')}
          </ul>
        </div>
      `);
    }
  }

  /**
   * 应用效果到其他角色
   * @param {Actor|null} targetActor - 目标角色（null表示未选中目标，所有人可点击）
   * @param {object} activity - Activity 数据
   * @param {Item} sourceItem - 源物品
   * @returns {boolean} 是否成功创建了BUFF消息
   */
  async _applyEffectsToOther(targetActor, activity, sourceItem) {
    const effects = activity.effects || {};
    const buffList = [];

    // 获取回合计数设置，默认为'current'（本回合）
    const roundTiming = activity.roundTiming || 'current';

    // 预设 BUFF 列表
    const allBuffs = [
      ...BUFF_TYPES.positive,
      ...BUFF_TYPES.negative,
      ...BUFF_TYPES.effect
    ];

    // 准备BUFF数据
    for (const [buffId, effectData] of Object.entries(effects)) {
      // 评估层数和强度（支持骰子公式）
      const layersResult = await this._evaluateDiceFormula(effectData.layers || 0);
      const strengthResult = await this._evaluateDiceFormula(effectData.strength || 0);

      const layers = layersResult.value;
      const strength = strengthResult.value;

      if (layers === 0) continue;

      const buffDef = allBuffs.find(b => b.id === buffId);
      if (!buffDef) continue;

      buffList.push({
        buffId: buffDef.id,
        buffName: buffDef.name,
        buffIcon: buffDef.icon,
        buffDescription: buffDef.description,
        buffType: buffDef.type,
        layers: layers,
        strength: strength !== 0 ? strength : buffDef.defaultStrength,
        layersFormula: layersResult.isRoll ? layersResult.formula : null,
        strengthFormula: strengthResult.isRoll ? strengthResult.formula : null,
        source: this.actor.name,
        sourceItem: sourceItem.name,
        roundTiming: roundTiming  // 添加回合计数字段
      });
    }

    // 处理自定义效果
    if (activity.customEffect && activity.customEffect.enabled) {
      const customName = activity.customEffect.name || "自定义效果";
      const layersResult = await this._evaluateDiceFormula(activity.customEffect.layers || 0);
      const strengthResult = await this._evaluateDiceFormula(activity.customEffect.strength || 0);

      const customLayers = layersResult.value;
      const customStrength = strengthResult.value;

      if (customLayers > 0) {
        buffList.push({
          buffId: 'custom',
          buffName: customName,
          buffIcon: 'icons/svg/mystery-man.svg',
          buffDescription: '自定义效果',
          buffType: 'effect',
          layers: customLayers,
          strength: customStrength,
          layersFormula: layersResult.isRoll ? layersResult.formula : null,
          strengthFormula: strengthResult.isRoll ? strengthResult.formula : null,
          source: this.actor.name,
          sourceItem: sourceItem.name,
          roundTiming: roundTiming  // 添加回合计数字段
        });
      }
    }

    if (buffList.length === 0) return false;

    // 构建BUFF效果列表HTML
    const buffListHtml = buffList.map(buff => {
      let buffText = `<img src="${buff.buffIcon}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;" /> ${buff.buffName}`;
      if (buff.layersFormula) {
        buffText += ` <strong>${buff.layers}层</strong> [${buff.layersFormula}]`;
      } else {
        buffText += ` <strong>${buff.layers}层</strong>`;
      }
      if (buff.strength !== 0) {
        if (buff.strengthFormula) {
          buffText += ` <strong>${buff.strength}强度</strong> [${buff.strengthFormula}]`;
        } else {
          buffText += ` <strong>${buff.strength}强度</strong>`;
        }
      }
      return `<li style="margin: 4px 0;">${buffText}</li>`;
    }).join('');

    // 将BUFF数据编码为JSON字符串
    const buffDataJson = JSON.stringify({
      targetId: targetActor ? targetActor.id : null,
      targetName: targetActor ? targetActor.name : null,
      sourceName: this.actor.name,
      sourceItemName: sourceItem.name,
      buffs: buffList
    });

    // 发送带按钮的聊天消息
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="buff-application-card" style="border: 2px solid #4a7c2c; border-radius: 8px; padding: 12px; background: #0F0D1B; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #4a7c2c;">
            <i class="fas fa-magic"></i> 【${activity.name || '效果'}】待应用
          </h3>
          <div style="color: #EBBD68; margin-bottom: 8px;">
            <strong>来源：</strong>${this.actor.name} - ${sourceItem.name}
          </div>
          ${targetActor ? `<div style="color: #EBBD68; margin-bottom: 8px;"><strong>目标：</strong>${targetActor.name}</div>` : ''}
          <div style="color: #EBBD68; margin-bottom: 12px;">
            <strong>效果：</strong>
            <ul style="margin: 4px 0; padding-left: 20px;">
              ${buffListHtml}
            </ul>
          </div>
          <button class="apply-buff-effect-btn"
                  data-buff-data="${buffDataJson.replace(/"/g, '&quot;')}"
                  style="width: 100%; padding: 10px 20px; background: #4a7c2c; color: #FFFFFF; border: none; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            ${targetActor ? `${targetActor.name} 点击应用效果` : '点击应用效果'}
          </button>
          ${targetActor ? `<div style="margin-top: 6px; font-size: 11px; color: #888; text-align: center;">仅 ${targetActor.name} 可以点击</div>` : '<div style="margin-top: 6px; font-size: 11px; color: #888; text-align: center;">所有人都可以点击</div>'}
        </div>
      `,
      flags: {
        'shuhai-dalu': {
          buffApplication: true,
          targetActorId: targetActor ? targetActor.id : null
        }
      }
    };

    await ChatMessage.create(chatData);
    return true;
  }

  /**
   * 处理轮次切换，更新BUFF的回合计数
   * 当战斗遭遇进入下一轮时调用此方法
   * 逻辑：
   * 1. 删除所有"一回合内"的本回合BUFF（强壮、虚弱、守护、易损、迅捷、束缚、忍耐、破绽）
   * 2. 保留所有其他本回合BUFF（破裂、流血、燃烧等效果型BUFF）
   * 3. 将所有下回合的BUFF转换为本回合
   * 4. 如果同一个BUFF既有本回合版本又有下回合版本，合并它们（层数和强度相加）
   */
  async advanceRound() {
    console.log('【轮次切换】开始处理，当前BUFF数量:', this.combatState.buffs.length);

    // 定义"一回合内"的BUFF ID（轮次切换时清除）
    const oneRoundBuffIds = ['strong', 'weak', 'guard', 'vulnerable', 'swift', 'bound', 'endure', 'flaw'];

    // 定义"每轮结束时层数减少"的BUFF ID（不合并本回合和下回合）
    const roundEndBuffIds = ['burn', 'breath', 'charge', 'chant'];

    // 第一步：分类BUFF
    const currentBuffs = [];  // 本回合的BUFF
    const nextBuffs = [];     // 下回合的BUFF

    for (const buff of this.combatState.buffs) {
      const timing = buff.roundTiming || 'current';

      if (timing === 'current') {
        // 删除"一回合内"的BUFF
        if (oneRoundBuffIds.includes(buff.id)) {
          console.log(`【轮次切换】删除一回合内BUFF: ${buff.name} (${buff.layers}层)`);
          continue;
        }
        // 保留其他BUFF（效果型BUFF）
        console.log(`【轮次切换】保留持续性BUFF: ${buff.name} (${buff.layers}层 ${buff.strength}强度)`);
        currentBuffs.push(buff);
      } else if (timing === 'next' || timing === 'both') {
        console.log(`【轮次切换】下回合BUFF待转换: ${buff.name} (${buff.layers}层 ${buff.strength}强度)`);
        nextBuffs.push(buff);
      }
    }

    // 第二步：处理本回合的"每轮结束时层数减少"的BUFF
    const roundEndMessages = [];

    for (const buff of currentBuffs) {
      if (roundEndBuffIds.includes(buff.id)) {
        // 特殊处理【燃烧】：层数减少前先触发伤害
        if (buff.id === 'burn' && buff.layers > 0) {
          const damage = buff.strength;
          const newHp = Math.max(0, this.actor.system.derived.hp.value - damage);
          await this.actor.update({ 'system.derived.hp.value': newHp });
          console.log(`【轮次结束】【燃烧】触发: 受到${damage}点伤害`);
          roundEndMessages.push(`【燃烧】造成 ${damage} 点伤害`);
        }

        // 层数减少1层
        buff.layers -= 1;
        console.log(`【轮次结束】${buff.name} 层数减少1层，剩余${buff.layers}层`);

        if (buff.layers > 0) {
          roundEndMessages.push(`${buff.name} 层数减少1层（剩余${buff.layers}层）`);
        }
      }
    }

    // 第三步：删除层数为0或以下的本回合BUFF
    const survivedCurrentBuffs = currentBuffs.filter(buff => {
      if (buff.layers <= 0) {
        console.log(`【轮次结束】删除层数为0的本回合BUFF: ${buff.name}`);
        roundEndMessages.push(`${buff.name} 已消失`);
        return false;
      }
      return true;
    });

    // 第四步：合并BUFF（每轮结束减层的BUFF不合并）
    const mergedBuffs = [];
    const processedIds = new Set();

    // 先处理本回合保留的BUFF
    for (const currentBuff of survivedCurrentBuffs) {
      const key = currentBuff.id === 'custom'
        ? `custom_${currentBuff.name}`
        : currentBuff.id;

      // 如果是每轮结束减层的BUFF，不合并，直接保留
      if (roundEndBuffIds.includes(currentBuff.id)) {
        mergedBuffs.push({
          ...currentBuff,
          roundTiming: 'current'
        });
        processedIds.add(key);
        continue;
      }

      // 查找是否有同id的下回合BUFF
      const nextBuff = nextBuffs.find(b => {
        if (b.id === 'custom') {
          return b.id === currentBuff.id && b.name === currentBuff.name;
        }
        return b.id === currentBuff.id;
      });

      if (nextBuff) {
        // 找到匹配的下回合BUFF，合并它们（只合并非每轮减层的BUFF）
        const mergedLayers = currentBuff.layers + nextBuff.layers;
        const mergedStrength = currentBuff.strength + nextBuff.strength;
        console.log(`【轮次切换】合并BUFF: ${currentBuff.name} (本回合${currentBuff.layers}层${currentBuff.strength}强度 + 下回合${nextBuff.layers}层${nextBuff.strength}强度 = ${mergedLayers}层${mergedStrength}强度)`);
        mergedBuffs.push({
          ...currentBuff,
          layers: mergedLayers,
          strength: mergedStrength,
          roundTiming: 'current'
        });
        processedIds.add(key);
      } else {
        // 没有匹配的下回合BUFF，直接保留
        mergedBuffs.push({
          ...currentBuff,
          roundTiming: 'current'
        });
        processedIds.add(key);
      }
    }

    // 第五步：处理未匹配的下回合BUFF（直接转为本回合）
    for (const nextBuff of nextBuffs) {
      const key = nextBuff.id === 'custom'
        ? `custom_${nextBuff.name}`
        : nextBuff.id;

      if (!processedIds.has(key)) {
        // 这个下回合BUFF没有本回合版本，直接转换
        console.log(`【轮次切换】下回合BUFF转本回合: ${nextBuff.name} (${nextBuff.layers}层 ${nextBuff.strength}强度)`);
        mergedBuffs.push({
          ...nextBuff,
          roundTiming: 'current'
        });
      }
    }

    console.log('【轮次切换】最终BUFF数量:', mergedBuffs.length);

    // 更新BUFF列表
    this.combatState.buffs = mergedBuffs;

    // 保存并重新渲染
    await this._saveCombatState();
    this.render(false);

    // 发送轮次结束效果消息
    if (roundEndMessages.length > 0) {
      await this._sendChatMessage(`
        <div style="border: 2px solid #8b4513; border-radius: 4px; padding: 12px; background: #0F0D1B;">
          <h3 style="margin: 0 0 8px 0; color: #cd853f;">【轮次结束效果】</h3>
          <ul style="margin: 8px 0; padding-left: 20px; color: #EBBD68;">
            ${roundEndMessages.map(msg => `<li>${msg}</li>`).join('')}
          </ul>
        </div>
      `);
    }

    ui.notifications.info(`轮次切换：一回合内BUFF已清除，下回合BUFF已生效`);
  }
}
