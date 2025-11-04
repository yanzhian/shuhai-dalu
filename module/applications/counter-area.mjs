/**
 * 书海大陆 对抗界面应用
 * 用于响应战斗骰挑战时的对抗
 */
export default class CounterAreaApplication extends Application {

  constructor(actor, challengeData, options = {}) {
    super(options);
    this.actor = actor;
    this.challengeData = challengeData; // { challengerId, challengerName, diceId, diceName, total }

    // 从战斗区域获取或初始化战斗状态
    this.combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      activatedDice: [false, false, false, false, false, false],
      extraCost: [false, false, false, false, false, false],
      exResources: [false, false, false]
    };
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "counter-area"],
      template: "systems/shuhai-dalu/templates/combat/counter-area.hbs",
      width: 800,
      height: 600,
      resizable: true,
      title: "对抗界面"
    });
  }

  /** @override */
  async getData() {
    const context = await super.getData();

    context.actor = this.actor;
    context.system = this.actor.system;
    context.combatState = this.combatState;
    context.challengeData = this.challengeData;

    // 准备战斗骰数据（只显示已激活的）
    context.activeCombatDice = this._prepareActiveCombatDice();

    // 准备守备骰和触发骰
    context.defenseDice = this._prepareDefenseDice();
    context.triggerDice = this._prepareTriggerDice();

    return context;
  }

  /**
   * 准备已激活的战斗骰数据
   */
  _prepareActiveCombatDice() {
    const activeDice = [];
    for (let i = 0; i < 6; i++) {
      const diceId = this.actor.system.equipment.combatDice[i];
      const isActivated = this.combatState.activatedDice[i];

      if (diceId && isActivated) {
        const item = this.actor.items.get(diceId);
        if (item) {
          activeDice.push({
            index: i,
            item: item,
            name: item.name,
            img: item.img,
            dice: item.system.diceFormula,
            effect: item.system.effect
          });
        }
      }
    }
    return activeDice;
  }

  /**
   * 准备守备骰数据
   */
  _prepareDefenseDice() {
    const defenseDiceId = this.actor.system.equipment.defenseDice;
    if (!defenseDiceId) return null;

    const item = this.actor.items.get(defenseDiceId);
    if (!item) return null;

    return {
      item: item,
      name: item.name,
      img: item.img,
      dice: item.system.diceFormula,
      effect: item.system.effect
    };
  }

  /**
   * 准备触发骰数据
   */
  _prepareTriggerDice() {
    const triggerDiceId = this.actor.system.equipment.triggerDice;
    if (!triggerDiceId) return null;

    const item = this.actor.items.get(triggerDiceId);
    if (!item) return null;

    return {
      item: item,
      name: item.name,
      img: item.img,
      dice: item.system.diceFormula,
      effect: item.system.effect
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 战斗骰对抗按钮
    html.find('.combat-dice-counter-btn').click(this._onCombatDiceCounter.bind(this));

    // 守备骰对抗按钮
    html.find('.defense-dice-counter-btn').click(this._onDefenseDiceCounter.bind(this));

    // 触发骰对抗按钮
    html.find('.trigger-dice-counter-btn').click(this._onTriggerDiceCounter.bind(this));

    // 额外Cost和EX资源切换（仅显示，不影响拼点）
    html.find('.extra-cost-btn').click(this._onToggleExtraCost.bind(this));
    html.find('.ex-resource-btn').click(this._onToggleExResource.bind(this));
  }

  /**
   * 战斗骰对抗
   */
  async _onCombatDiceCounter(event) {
    event.preventDefault();
    const diceIndex = parseInt(event.currentTarget.dataset.index);
    const diceData = this._prepareActiveCombatDice()[diceIndex];

    if (!diceData) return;

    // 投骰
    const roll = new Roll(diceData.dice);
    await roll.evaluate();

    // 执行拼点
    await this._resolveContest(diceData.name, roll);
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

    // 投骰
    const roll = new Roll(defenseDice.dice);
    await roll.evaluate();

    // 执行拼点
    await this._resolveContest(defenseDice.name, roll);
  }

  /**
   * 触发骰对抗
   */
  async _onTriggerDiceCounter(event) {
    event.preventDefault();

    // 检查是否有EX资源
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

    // 保存战斗状态
    await this.actor.setFlag('shuhai-dalu', 'combatState', this.combatState);

    // 投骰
    const roll = new Roll(triggerDice.dice);
    await roll.evaluate();

    // 执行拼点
    await this._resolveContest(triggerDice.name + "（消耗1EX）", roll);
  }

  /**
   * 解决拼点对抗
   */
  async _resolveContest(diceName, myRoll) {
    const myTotal = myRoll.total;
    const challengerTotal = this.challengeData.total;
    const challenger = game.actors.get(this.challengeData.challengerId);

    let resultMessage = "";
    let damageTarget = null;
    let damageAmount = 0;

    if (myTotal > challengerTotal) {
      // 我赢了，对挑战者造成我的骰数伤害
      resultMessage = `<span style="color: #2ecc71; font-weight: bold;">成功！</span>`;
      damageTarget = challenger;
      damageAmount = myTotal;
    } else if (myTotal < challengerTotal) {
      // 我输了，我受到挑战者的骰数伤害
      resultMessage = `<span style="color: #e74c3c; font-weight: bold;">失败！</span>`;
      damageTarget = this.actor;
      damageAmount = challengerTotal;
    } else {
      // 平局
      resultMessage = `<span style="color: #f39c12; font-weight: bold;">平局！</span>`;
    }

    // 应用伤害
    if (damageTarget && damageAmount > 0) {
      const newHp = Math.max(0, damageTarget.system.derived.hp.value - damageAmount);
      await damageTarget.update({ 'system.derived.hp.value': newHp });
    }

    // 创建结果消息
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/contest-result.hbs", {
        actor: this.actor,
        diceName: diceName,
        myRoll: myRoll,
        myTotal: myTotal,
        challenger: challenger,
        challengerName: this.challengeData.challengerName,
        challengerDiceName: this.challengeData.diceName,
        challengerTotal: challengerTotal,
        resultMessage: resultMessage,
        damageTarget: damageTarget,
        damageAmount: damageAmount
      }),
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [myRoll]
    };

    await ChatMessage.create(chatData);

    // 关闭对抗窗口
    this.close();
  }

  /**
   * 切换额外Cost
   */
  _onToggleExtraCost(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    this.combatState.extraCost[index] = !this.combatState.extraCost[index];

    // 保存状态
    this.actor.setFlag('shuhai-dalu', 'combatState', this.combatState);
    this.render();
  }

  /**
   * 切换EX资源
   */
  _onToggleExResource(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    this.combatState.exResources[index] = !this.combatState.exResources[index];

    // 保存状态
    this.actor.setFlag('shuhai-dalu', 'combatState', this.combatState);
    this.render();
  }
}
