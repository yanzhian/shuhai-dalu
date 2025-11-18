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

    console.log(`【特殊骰子对话框】触发类型: ${this.triggerType}`);

    // ✅ 从 equipment.combatDice 数组获取装备的战斗骰ID
    const equippedDiceIds = new Set(this.actor.system.equipment?.combatDice || []);
    console.log(`【装备的骰子ID】:`, Array.from(equippedDiceIds));

    // ✅ 获取所有战斗骰类型的物品（type === 'combatDice'）
    const combatDiceItems = this.actor.items.filter(item => item.type === 'combatDice');

    // 筛选出已装备的战斗骰
    const equippedDice = combatDiceItems.filter(item => equippedDiceIds.has(item.id));

    console.log(`【特殊骰子对话框】找到装备的战斗骰: ${equippedDice.length} 个`);

    // 筛选出有对应触发类型的骰子
    const availableDice = [];
    for (const dice of equippedDice) {
      console.log(`【检查活动】骰子: ${dice.name}`);
      console.log(`  - activities:`, dice.system.activities);

      if (dice.system.activities && Object.keys(dice.system.activities).length > 0) {
        const matchingActivities = Object.values(dice.system.activities).filter(
          activity => {
            // 兼容新旧格式
            const triggerType = typeof activity.trigger === 'string'
              ? activity.trigger
              : activity.trigger?.type;
            const matches = triggerType === this.triggerType;
            console.log(`  - 检查活动: ${activity.name}, trigger=${JSON.stringify(activity.trigger)}, 期望=${this.triggerType}, 匹配=${matches}`);
            return matches;
          }
        );

        console.log(`【${dice.name}】匹配的activities: ${matchingActivities.length}`, matchingActivities);

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

    console.log(`【最终结果】可用骰子数: ${availableDice.length}`, availableDice);

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

    // ✅ 直接从 equipment.combatDice 数组查找索引
    const combatDiceSlots = this.actor.system.equipment?.combatDice || [];
    const diceIndex = combatDiceSlots.findIndex(id => id === diceId);

    console.log(`【触发效果】骰子: ${dice.name}, ID: ${diceId}, 槽位索引: ${diceIndex}`);

    // 获取战斗状态
    let combatState = this.actor.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [true, true, true],
      activatedDice: [false, false, false, false, false, false],
      buffs: []
    };

    // 检查骰子是否已激活
    if (diceIndex >= 0 && diceIndex < 6) {
      console.log(`【激活状态】槽位 ${diceIndex} 是否激活: ${combatState.activatedDice[diceIndex]}`);

      if (!combatState.activatedDice[diceIndex]) {
        ui.notifications.warn(`${dice.name} 未激活，无法触发${this.triggerType === 'onFlashStrike' ? '闪击' : '丢弃'}效果`);
        return;
      }

      // 取消激活状态
      combatState.activatedDice[diceIndex] = false;
      console.log(`【取消激活】槽位 ${diceIndex} 已取消激活`);
    } else {
      console.warn(`【警告】骰子索引无效: ${diceIndex}`);
    }

    // 触发效果（使用新的 Activity 系统）
    const { triggerItemActivities } = await import('../services/activity-service.mjs');
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
