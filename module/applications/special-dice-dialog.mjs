/**
 * 特殊骰子选择对话框（闪击/丢弃）
 */
export default class SpecialDiceDialog extends Application {
  constructor(actor, triggerType, options = {}) {
    super(options);
    this.actor = actor;
    this.triggerType = triggerType; // 'onFlashStrike' 或 'onDiscard'
    this.callback = options.callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['shuhai-dalu', 'special-dice-dialog'],
      template: 'systems/shuhai-dalu/templates/dialog/special-dice-dialog.hbs',
      width: 600,
      height: 'auto',
      title: '选择骰子',
      resizable: false
    });
  }

  getData() {
    const data = super.getData();

    // 获取所有装备的战斗骰（从装备栏中获取）
    const equippedDice = [];

    // 从 combatDice 装备栏获取骰子（6个槽位）
    if (this.actor.system.equipment && this.actor.system.equipment.combatDice) {
      const combatDiceIds = this.actor.system.equipment.combatDice;
      for (let i = 0; i < combatDiceIds.length; i++) {
        const diceId = combatDiceIds[i];
        if (diceId) {
          const item = this.actor.items.get(diceId);
          if (item) {
            equippedDice.push(item);
          }
        }
      }
    }

    // 筛选出有对应触发类型的骰子
    const availableDice = [];
    for (const dice of equippedDice) {
      if (dice.system.activities && Object.keys(dice.system.activities).length > 0) {
        const matchingActivities = Object.values(dice.system.activities).filter(
          activity => activity.trigger === this.triggerType
        );

        if (matchingActivities.length > 0) {
          availableDice.push({
            id: dice.id,
            name: dice.name,
            img: dice.img,
            cost: dice.system.cost,
            diceFormula: dice.system.diceFormula,
            category: dice.system.category,
            activities: matchingActivities
          });
        }
      }
    }

    data.actor = this.actor;
    data.triggerType = this.triggerType;
    data.triggerName = this.triggerType === 'onFlashStrike' ? '闪击☪' : '丢弃✦';
    data.availableDice = availableDice;
    data.hasDice = availableDice.length > 0;

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // 选择骰子按钮
    html.find('.select-dice-btn').click(async (event) => {
      const button = event.currentTarget;
      const diceId = button.dataset.diceId;

      // 触发效果
      await this._triggerDiceEffect(diceId);

      // 关闭对话框
      this.close();
    });

    // 取消按钮
    html.find('.cancel-btn').click(() => {
      this.close();
    });
  }

  async _triggerDiceEffect(diceId) {
    const dice = this.actor.items.get(diceId);
    if (!dice) {
      ui.notifications.error("找不到指定的骰子");
      return;
    }

    // 找到对应的激活状态索引（在 combatDice 装备栏中的位置）
    const combatDiceIds = this.actor.system.equipment?.combatDice || [];
    const diceIndex = combatDiceIds.findIndex(id => id === diceId);

    // 获取战斗状态
    let combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [false, false, false],
      activatedDice: [false, false, false, false, false, false],
      buffs: []
    };

    // 检查骰子是否已激活
    if (diceIndex >= 0 && diceIndex < 6) {
      if (!combatState.activatedDice[diceIndex]) {
        ui.notifications.warn(`${dice.name} 未激活，无法触发${this.triggerType === 'onFlashStrike' ? '闪击' : '丢弃'}效果`);
        return;
      }

      // 取消激活状态
      combatState.activatedDice[diceIndex] = false;
    }

    // 触发效果
    const { triggerItemActivities } = await import('../shuhai-dalu.mjs');
    const triggered = await triggerItemActivities(this.actor, dice, this.triggerType);

    if (triggered) {
      // 保存战斗状态
      await this.actor.setFlag('shuhai-dalu', 'combatState', combatState);

      // 发送消息
      const triggerName = this.triggerType === 'onFlashStrike' ? '闪击☪' : '丢弃✦';
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: `
          <div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
            <div style="font-size: 16px; font-weight: bold; color: #E1AA43; margin-bottom: 8px;">${triggerName} 触发</div>
            <div style="margin-bottom: 8px;"><strong>${this.actor.name}</strong> 触发了 <span style="color: #f3c267; font-weight: bold;">${dice.name}</span> 的${triggerName}效果</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px;">
              <img src="${dice.img}" alt="${dice.name}" style="width: 48px; height: 48px; border: 2px solid #EBBD68; border-radius: 4px;"/>
              <div style="text-align: left;">
                <div style="color: #f3c267; font-weight: bold;">${dice.name}</div>
                <div style="font-size: 12px; color: #888;">骰子已转为未激活状态</div>
              </div>
            </div>
          </div>
        `
      });

      // 刷新战斗区域
      Object.values(ui.windows).forEach(app => {
        if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === this.actor.id) {
          app.render(false);
        }
      });

      ui.notifications.info(`${dice.name} 的${triggerName}效果已触发`);
    } else {
      ui.notifications.warn(`${dice.name} 的${triggerName}效果触发失败`);
    }

    // 执行回调
    if (this.callback) {
      this.callback(diceId);
    }
  }
}
