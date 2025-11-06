/**
 * 书海大陆 对抗界面应用 - 重新设计
 * 用于响应战斗骰发起时的对抗
 */
export default class CounterAreaApplication extends Application {

  constructor(actor, initiateData, options = {}) {
    super(options);
    this.actor = actor; // 对抗者
    this.initiateData = initiateData; // 发起数据

    // 从combat-area同步战斗状态
    this.combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [false, false, false],
      activatedDice: [false, false, false, false, false, false],
      buffs: []
    };
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "counter-area"],
      template: "systems/shuhai-dalu/templates/combat/counter-area.hbs",
      width: 600,
      height: 800,
      resizable: true,
      title: "拼点对抗"
    });
  }

  /** @override */
  async getData() {
    const context = await super.getData();

    context.actor = this.actor;
    context.system = this.actor.system;
    context.combatState = this.combatState;

    // 发起者信息
    const initiator = game.actors.get(this.initiateData.initiatorId);
    if (initiator) {
      context.initiatorName = initiator.name;
      context.initiatorDiceFormula = this.initiateData.diceFormula;

      // 获取发起者的抗性信息
      context.initiatorResistances = this._getResistances(initiator);

      // 获取发起者的被动骰
      context.initiatorPassives = this._getPassiveDice(initiator);

      // 获取发起者的状态条
      context.initiatorHp = initiator.system.derived.hp.value;
      context.initiatorHpMax = initiator.system.derived.hp.max;
      context.initiatorErosion = initiator.system.derived.corruption.value;
      context.initiatorErosionMax = initiator.system.derived.corruption.max;
      context.initiatorChaos = initiator.system.derived.chaos.value;
      context.initiatorChaosMax = initiator.system.derived.chaos.max;
    }

    // 对抗者的战斗骰槽位
    context.combatDiceSlots = this._prepareCombatDiceSlots();

    // 守备骰和触发骰
    context.defenseDice = this._prepareDefenseDice();
    context.triggerDice = this._prepareTriggerDice();

    return context;
  }

  /**
   * 获取抗性信息
   */
  _getResistances(actor) {
    const resistances = [];
    const armor = actor.items.get(actor.system.equipment.armor);

    if (armor && armor.system.armorProperties) {
      const props = armor.system.armorProperties;

      if (props.slashUp) resistances.push({ name: '斩击', type: 'up' });
      if (props.slashDown) resistances.push({ name: '斩击', type: 'down' });
      if (props.pierceUp) resistances.push({ name: '突刺', type: 'up' });
      if (props.pierceDown) resistances.push({ name: '突刺', type: 'down' });
      if (props.bluntUp) resistances.push({ name: '打击', type: 'up' });
      if (props.bluntDown) resistances.push({ name: '打击', type: 'down' });
    }

    return resistances;
  }

  /**
   * 获取被动骰
   */
  _getPassiveDice(actor) {
    const passives = [];
    const passiveIds = actor.system.equipment.passives || [];

    for (const id of passiveIds) {
      const item = actor.items.get(id);
      if (item) passives.push(item);
    }

    return passives;
  }

  /**
   * 准备战斗骰槽位数据
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
   * 准备守备骰
   */
  _prepareDefenseDice() {
    const defenseDiceId = this.actor.system.equipment.defenseDice;
    if (!defenseDiceId) return null;
    return this.actor.items.get(defenseDiceId);
  }

  /**
   * 准备触发骰
   */
  _prepareTriggerDice() {
    const triggerDiceId = this.actor.system.equipment.triggerDice;
    if (!triggerDiceId) return null;
    return this.actor.items.get(triggerDiceId);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 资源圈切换
    html.find('.resource-circle').click(this._onToggleResource.bind(this));

    // 战斗骰激活切换
    html.find('.dice-activate-toggle').click(this._onToggleDiceActivation.bind(this));

    // 战斗骰对抗
    html.find('.combat-dice-counter-btn').click(this._onCombatDiceCounter.bind(this));

    // 守备骰对抗
    html.find('.defense-dice-counter-btn').click(this._onDefenseDiceCounter.bind(this));

    // 触发骰对抗
    html.find('.trigger-dice-counter-btn').click(this._onTriggerDiceCounter.bind(this));
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
   * 保存战斗状态
   */
  async _saveCombatState() {
    await this.actor.setFlag('shuhai-dalu', 'combatState', this.combatState);
  }

  /**
   * 战斗骰对抗
   */
  async _onCombatDiceCounter(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    const slot = this._prepareCombatDiceSlots()[index];

    if (!slot || !slot.item) {
      ui.notifications.warn("无效的战斗骰");
      return;
    }

    // 检查是否激活
    if (!slot.activated) {
      ui.notifications.warn("该战斗骰未激活！");
      return;
    }

    // 请求调整值
    const adjustment = await this._requestAdjustment();
    if (adjustment === null) return; // 用户取消

    // 执行对抗，传递diceIndex以便使用后解除激活
    await this._performCounter(slot.item, adjustment, false, index);
  }

  /**
   * 守备骰对抗
   */
  async _onDefenseDiceCounter(event) {
    event.preventDefault();
    const defenseDice = this._prepareDefenseDice();

    if (!defenseDice) {
      ui.notifications.warn("没有装备守备骰");
      return;
    }

    // 请求调整值
    const adjustment = await this._requestAdjustment();
    if (adjustment === null) return; // 用户取消

    // 执行对抗
    await this._performCounter(defenseDice, adjustment);
  }

  /**
   * 触发骰对抗
   */
  async _onTriggerDiceCounter(event) {
    event.preventDefault();

    // 检查EX资源
    const hasEx = this.combatState.exResources.some(ex => ex);
    if (!hasEx) {
      ui.notifications.warn("没有可用的EX资源");
      return;
    }

    const triggerDice = this._prepareTriggerDice();

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

    await this._saveCombatState();

    // 请求调整值
    const adjustment = await this._requestAdjustment();
    if (adjustment === null) return; // 用户取消

    // 执行对抗
    await this._performCounter(triggerDice, adjustment, true); // true表示消耗了EX
  }

  /**
   * 请求调整值
   */
  async _requestAdjustment() {
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
   * 执行对抗
   */
  async _performCounter(dice, adjustment, consumedEx = false, diceIndex = null) {
    // 投骰
    const roll = new Roll(dice.system.diceFormula);
    await roll.evaluate();

    // 显示3D骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    // 计算BUFF加成
    const buffBonus = this._calculateBuffBonus();

    // 对抗者最终结果
    const counterRoll = roll.total;
    const counterResult = counterRoll + buffBonus + adjustment;

    // 发起者数据
    const initiator = game.actors.get(this.initiateData.initiatorId);
    const initiatorRoll = parseInt(this.initiateData.diceRoll) || 0;
    const initiatorBuffBonus = parseInt(this.initiateData.buffBonus) || 0;
    const initiatorAdjustment = parseInt(this.initiateData.adjustment) || 0;
    const initiatorResult = initiatorRoll + initiatorBuffBonus + initiatorAdjustment;

    // 判断胜负
    const initiatorWon = initiatorResult > counterResult;
    const loser = initiatorWon ? this.actor : initiator;
    const winner = initiatorWon ? initiator : this.actor;
    const baseDamage = initiatorWon ? initiatorResult : counterResult;

    // 计算抗性结果
    const { finalDamage, description } = this._calculateDamage(
      baseDamage,
      this.initiateData.diceCategory,
      loser
    );

    // 应用伤害并重新获取最新的角色数据
    if (finalDamage > 0) {
      const newHp = Math.max(0, loser.system.derived.hp.value - finalDamage);
      await loser.update({ 'system.derived.hp.value': newHp });
    }

    // 重新获取最新的loser数据
    const updatedLoser = game.actors.get(loser.id);

    // 使用后解除激活状态（对抗者）
    if (diceIndex !== null && diceIndex >= 0 && diceIndex < 6) {
      this.combatState.activatedDice[diceIndex] = false;
    }

    // 保存对抗者的状态（同步回combat-area）
    await this._saveCombatState();

    // 创建结果消息
    const resultDescription = this._createResultDescription(
      initiator,
      this.actor,
      initiatorResult,
      counterResult,
      initiatorRoll,
      counterRoll,
      initiatorBuffBonus,
      buffBonus,
      initiatorAdjustment,
      adjustment,
      updatedLoser,
      finalDamage,
      description
    );

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/counter-result.hbs", {
        initiatorName: initiator.name,
        initiatorDiceImg: this.initiateData.diceImg,
        initiatorDiceName: this.initiateData.diceName,
        initiatorDiceCost: this.initiateData.diceCost,
        initiatorDiceFormula: this.initiateData.diceFormula,
        initiatorResult: initiatorResult,
        initiatorDiceRoll: initiatorRoll,
        initiatorBuff: initiatorBuffBonus,
        initiatorAdjustment: initiatorAdjustment,
        counterName: this.actor.name,
        counterDiceImg: dice.img,
        counterDiceName: dice.name + (consumedEx ? "（消耗1EX）" : ""),
        counterDiceCost: dice.system.cost,
        counterDiceFormula: dice.system.diceFormula,
        counterResult: counterResult,
        counterDiceRoll: counterRoll,
        counterBuff: buffBonus,
        counterAdjustment: adjustment,
        initiatorWon: initiatorWon,
        resultDescription: resultDescription
      }),
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll]
    };

    await ChatMessage.create(chatData);

    // 关闭对抗窗口
    this.close();
  }

  /**
   * 计算BUFF加成
   */
  _calculateBuffBonus() {
    let bonus = 0;

    if (!this.combatState.buffs) return bonus;

    for (const buff of this.combatState.buffs) {
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
   * 计算伤害（包含抗性）
   */
  _calculateDamage(baseDamage, damageCategory, target) {
    let finalDamage = baseDamage;
    let description = "";

    // 获取目标的防具
    const armor = target.items.get(target.system.equipment.armor);

    if (armor && armor.system.armorProperties) {
      const props = armor.system.armorProperties;

      // 检查抗性
      if (damageCategory === '斩击') {
        if (props.slashUp) {
          // 抗性：伤害/2（向下取整）
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【斩击抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.slashDown) {
          // 弱性：伤害*2
          finalDamage = finalDamage * 2;
          description = `由于【斩击弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      } else if (damageCategory === '打击') {
        if (props.bluntUp) {
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【打击抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.bluntDown) {
          finalDamage = finalDamage * 2;
          description = `由于【打击弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      } else if (damageCategory === '突刺') {
        if (props.pierceUp) {
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【突刺抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.pierceDown) {
          finalDamage = finalDamage * 2;
          description = `由于【突刺弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      }
    }

    if (!description) {
      description = `受到${finalDamage}点伤害`;
    }

    return { finalDamage, description };
  }

  /**
   * 创建结果描述
   */
  _createResultDescription(
    initiator,
    counter,
    initiatorResult,
    counterResult,
    initiatorRoll,
    counterRoll,
    initiatorBuff,
    counterBuff,
    initiatorAdj,
    counterAdj,
    loser,
    finalDamage,
    damageDesc
  ) {
    const winnerName = initiatorResult > counterResult ? initiator.name : counter.name;
    const loserName = loser.name;

    let desc = `<div>本次对抗，${winnerName}【获胜】，${loserName}【败北】，</div>`;
    desc += `<div>${loserName}${damageDesc}。</div>`;
    desc += `<div>${loserName}生命值：${loser.system.derived.hp.value}/${loser.system.derived.hp.max}</div>`;

    return desc;
  }
}
