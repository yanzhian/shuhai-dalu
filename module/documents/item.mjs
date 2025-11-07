/**
 * 书海大陆 Item 文档和数据模型 - 完整版
 */
export default class ShuhaiItem extends Item {
  
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    const itemData = this;
    const systemData = itemData.system;

    // 迁移旧的 conditions 到新的 activities
    this._migrateConditionsToActivities(systemData);

    // 验证数据
    this._validateItemData(itemData);
  }

  /**
   * 迁移旧的 conditions 数组到新的 activities 对象
   */
  async _migrateConditionsToActivities(systemData) {
    // 如果已经有 activities 或没有 conditions，跳过迁移
    if (!systemData.conditions || systemData.conditions.length === 0) {
      return;
    }

    // 如果 activities 已存在且不为空，跳过迁移
    if (systemData.activities && Object.keys(systemData.activities).length > 0) {
      return;
    }

    console.log('【数据迁移】发现旧的 conditions，开始迁移到 activities');

    const activities = {};

    for (let i = 0; i < systemData.conditions.length; i++) {
      const condition = systemData.conditions[i];
      const activityId = foundry.utils.randomID();

      // 转换旧的 condition 到新的 activity 格式
      activities[activityId] = {
        _id: activityId,
        name: `条件${i + 1}`,  // 默认名称
        trigger: condition.trigger || 'onUse',
        hasConsume: condition.hasConsume || false,
        consumes: condition.consumes || [],
        target: condition.target || 'selected',
        effects: condition.effects || {},
        customEffect: condition.customEffect || {
          enabled: false,
          name: '',
          layers: 0,
          strength: 0
        }
      };
    }

    console.log('【数据迁移】迁移完成，共迁移', Object.keys(activities).length, '个条件');

    // 异步更新 item
    this.update({
      'system.activities': activities,
      'system.conditions': []  // 清空旧的 conditions
    });
  }

  /**
   * 验证物品数据
   */
  _validateItemData(itemData) {
    const systemData = itemData.system;

    // 验证分类 - 只对骰子类型进行验证，武器/防具/装备/物品允许自定义分类
    const validCategories = {
      'combatDice': ['打击', '突刺', '斩击'],
      'shootDice': ['打击', '突刺', '斩击'],
      'defenseDice': ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
      'triggerDice': ['EX'],
      'passiveDice': ['道具', '标签']
      // weapon, armor, item, equipment 允许自定义分类，不进行验证
    };

    const typeCategories = validCategories[itemData.type];
    if (typeCategories && !typeCategories.includes(systemData.category)) {
      systemData.category = typeCategories[0];
    }
  }

  /**
   * 获取掷骰数据
   */
  getRollData() {
    if (!this.actor) return null;
    return this.actor.getRollData();
  }

  /**
   * 使用物品/骰子
   */
  async use(modifier = 0) {
    if (!this.actor) {
      ui.notifications.warn("此物品未装备到角色上");
      return;
    }

    const systemData = this.system;

    // 费用消耗功能已移除（属于战斗区域功能，由玩家手动操作）

    // 根据类型执行不同操作
    if (this.type === 'combatDice' || this.type === 'shootDice') {
      return await this._useCombatDice(modifier);
    } else if (this.type === 'defenseDice') {
      return await this._useDefenseDice(modifier);
    } else if (this.type === 'triggerDice') {
      return await this._useTriggerDice();
    } else {
      return await this._useItem();
    }
  }

  /**
   * 检查消耗是否足够
   */
  _checkCost() {
    const cost = this.system.cost;
    if (!cost || cost === '-' || cost === '0') return true;

    // 解析消耗
    if (cost.startsWith('Cost:')) {
      const amount = parseInt(cost.replace('Cost:', ''));
      if (this.actor.system.resources.currency < amount) {
        ui.notifications.warn(`货币不足，需要 ${amount}`);
        return false;
      }
    } else if (cost.startsWith('San:')) {
      const amount = parseInt(cost.replace('San:', ''));
      if (this.actor.system.derived.corruption.value + amount > this.actor.system.derived.corruption.max) {
        ui.notifications.warn(`侵蚀度不足，需要 ${amount}`);
        return false;
      }
    } else {
      const amount = parseInt(cost);
      if (!isNaN(amount) && this.actor.system.resources.currency < amount) {
        ui.notifications.warn(`货币不足，需要 ${amount}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 扣除消耗
   */
  async _consumeCost() {
    const cost = this.system.cost;
    if (!cost || cost === '-' || cost === '0') return;

    if (cost.startsWith('Cost:')) {
      const amount = parseInt(cost.replace('Cost:', ''));
      await this.actor.update({
        'system.resources.currency': this.actor.system.resources.currency - amount
      });
    } else if (cost.startsWith('San:')) {
      const amount = parseInt(cost.replace('San:', ''));
      await this.actor.update({
        'system.derived.corruption.value': this.actor.system.derived.corruption.value + amount
      });
    } else {
      const amount = parseInt(cost);
      if (!isNaN(amount)) {
        await this.actor.update({
          'system.resources.currency': this.actor.system.resources.currency - amount
        });
      }
    }
  }

  /**
   * 使用战斗骰
   */
  async _useCombatDice(modifier = 0) {
    const formula = this.system.diceFormula;
    
    // 构建完整的投掷公式
    let fullFormula = formula;
    if (modifier !== 0) {
      fullFormula += modifier > 0 ? `+${modifier}` : `${modifier}`;
    }
    
    // 创建并评估骰子
    const roll = new Roll(fullFormula);
    await roll.evaluate();
    
    // 显示 3D 骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }

    const result = {
      actor: this.actor.name,
      item: this.name,
      type: this.type,
      category: this.system.category,
      formula: formula,
      modifier: modifier,
      total: roll.total,
      effect: this.system.effect,
      roll: roll
    };

    // 费用消耗功能已移除（属于战斗区域功能）

    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `使用 ${this.name}`,
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/dice-use.hbs", result),
      sound: CONFIG.sounds.dice
      // 移除 rolls: [roll] 避免3D骰子动画播放两次
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 使用守备骰
   */
  async _useDefenseDice(modifier = 0) {
    return await this._useCombatDice(modifier);
  }

  /**
   * 使用触发骰
   */
  async _useTriggerDice() {
    const result = {
      actor: this.actor.name,
      item: this.name,
      type: this.type,
      category: this.system.category,
      tags: this.system.tags,
      effect: this.system.effect
    };

    // 费用消耗功能已移除（属于战斗区域功能）

    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `触发 ${this.name}`,
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/trigger-use.hbs", result)
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 使用物品
   */
  async _useItem() {
    // 减少数量
    if (this.system.quantity > 0) {
      await this.update({ 'system.quantity': this.system.quantity - 1 });
    }

    const result = {
      actor: this.actor.name,
      item: this.name,
      effect: this.system.effect
    };

    // 创建聊天消息
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `使用 ${this.name}`,
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/item-use.hbs", result)
    };

    ChatMessage.create(messageData);
    return result;
  }

  /**
   * 投掷骰子公式
   */
  _rollDiceFormula(formula) {
    if (!formula || formula === '▼' || formula === 'O' || formula === '★') return 0;
    
    // 处理纯数字
    if (!isNaN(formula)) return parseInt(formula, 10);
    
    // 解析 rxdy+z 格式
    let result = 0;
    let workingExpr = formula.toLowerCase().replace(/\s/g, '');
    
    if (!workingExpr.startsWith('+') && !workingExpr.startsWith('-')) {
      workingExpr = '+' + workingExpr;
    }
    
    const parts = workingExpr.match(/[+\-](?:\d*[rdx]\d+|\d+)/g);
    
    if (!parts) return 0;
    
    for (const part of parts) {
      const sign = part.startsWith('-') ? -1 : 1;
      const content = part.slice(1);
      
      // 匹配 rxdy 或 xdy 格式
      const diceMatch = content.match(/^(\d+)?[rdx](\d+)$/);
      if (diceMatch) {
        const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
        const sides = parseInt(diceMatch[2]);
        
        let diceTotal = 0;
        for (let i = 0; i < count; i++) {
          diceTotal += Math.floor(Math.random() * sides) + 1;
        }
        result += sign * diceTotal;
      } else if (!isNaN(content)) {
        result += sign * parseInt(content);
      }
    }
    
    return Math.max(0, result);
  }

  /**
   * 显示物品卡片
   */
  async displayCard() {
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/item-card.hbs", {
        item: this,
        system: this.system
      })
    };

    ChatMessage.create(messageData);
  }

  /**
   * 创建新的 Activity
   * @param {object} activityData  Activity 数据（必须包含 _id）
   * @returns {Promise<Item>}      更新后的 Item
   */
  async createActivity(activityData) {
    if (!activityData._id) {
      throw new Error('Activity 数据必须包含 _id');
    }

    console.log('【createActivity】开始创建 Activity:', activityData._id);
    console.log('【createActivity】当前 activities:', this.system.activities);
    console.log('【createActivity】Activity 数据:', activityData);

    // 使用点符号路径创建新的 activity
    const updateData = { [`system.activities.${activityData._id}`]: activityData };
    console.log('【createActivity】更新数据:', updateData);

    const result = await this.update(updateData);
    console.log('【createActivity】更新完成，结果:', result);
    console.log('【createActivity】更新后的 activities:', this.system.activities);

    return result;
  }

  /**
   * 更新指定 ID 的 Activity
   * 参考 DND5e 的实现方式，使用点符号路径更新
   * @param {string} id        Activity 的 ID
   * @param {object} updates   要更新的数据
   * @returns {Promise<Item>}  更新后的 Item
   */
  async updateActivity(id, updates) {
    if (!this.system.activities) {
      throw new Error('此 Item 不支持 Activities');
    }
    if (!this.system.activities[id]) {
      throw new Error(`Activity ID ${id} 未找到`);
    }
    // 使用点符号路径更新特定的 activity，而不是替换整个 activities 对象
    return this.update({ [`system.activities.${id}`]: updates });
  }

  /**
   * 删除指定 ID 的 Activity
   * @param {string} id        Activity 的 ID
   * @returns {Promise<Item>}  更新后的 Item
   */
  async deleteActivity(id) {
    if (!this.system.activities || !this.system.activities[id]) {
      return this;
    }
    // 使用 Foundry 的删除语法：`-=key` 表示删除这个键
    return this.update({ [`system.activities.-=${id}`]: null });
  }
}

/**
 * ==================== 数据模型定义 ====================
 */

/**
 * 战斗骰数据模型 (攻击骰/射击骰)
 */
export class CombatDiceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        required: true,
        initial: "打击",
        choices: ['打击', '突刺', '斩击'],
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        required: true,
        initial: "1d6+3",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      // 防具属性（如果是防具类型）
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      // Activities 系统（替代旧的 conditions 数组）
      activities: new fields.ObjectField({
        initial: {},
        label: "活动列表"
      }),
      // 条件触发数组（已废弃，保留用于数据迁移）
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({
            initial: false,
            label: "是否消耗"
          }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 守备骰数据模型
 */
export class DefenseDiceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        required: true,
        initial: "闪避",
        choices: ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        required: true,
        initial: "1d10",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      // 防具属性（如果是防具类型）
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      // Activities 系统（替代旧的 conditions 数组）
      activities: new fields.ObjectField({
        initial: {},
        label: "活动列表"
      }),
      // 条件触发数组（已废弃，保留用于数据迁移）
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({
            initial: false,
            label: "是否消耗"
          }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 触发骰数据模型
 */
export class TriggerDiceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        required: true,
        initial: "EX",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "★",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 被动骰数据模型
 */
export class PassiveDiceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        required: true,
        initial: "道具",
        choices: ['道具', '标签'],
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "O",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 武器数据模型
 */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        initial: "",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "▼",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 防具数据模型
 */
export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        initial: "",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "▼",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      // 防具属性
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击↑" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺↑" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击↑" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击↓" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺↓" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击↓" })
      }),
      // Activities 系统（替代旧的 conditions 数组）
      activities: new fields.ObjectField({
        initial: {},
        label: "活动列表"
      }),
      // 条件触发数组（已废弃，保留用于数据迁移）
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 普通物品数据模型
 */
export class ItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        initial: "",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "▼",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 装备数据模型
 */
export class EquipmentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      category: new fields.StringField({
        initial: "",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "▼",
        label: "骰数"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({ initial: false, label: "是否消耗" }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表", initial: [] }
      )
    };
  }
}

/**
 * 物品卡数据模型 (支持条件触发系统)
 */
export class ItemCardData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      itemType: new fields.StringField({
        initial: "item",
        label: "物品类型"
      }),
      category: new fields.StringField({
        initial: "",
        label: "分类"
      }),
      diceFormula: new fields.StringField({
        initial: "",
        label: "骰数公式"
      }),
      cost: new fields.StringField({
        initial: "-",
        label: "费用"
      }),
      tags: new fields.StringField({
        initial: "",
        label: "标签"
      }),
      effect: new fields.HTMLField({
        initial: "",
        label: "效果描述"
      }),
      quantity: new fields.NumberField({
        initial: 1,
        min: 0,
        label: "数量"
      }),
      starlightCost: new fields.NumberField({
        initial: 0,
        min: 0,
        label: "星光消耗"
      }),
      // 防具属性（如果是防具类型）
      armorProperties: new fields.SchemaField({
        slashUp: new fields.BooleanField({ initial: false, label: "斩击抗性" }),
        pierceUp: new fields.BooleanField({ initial: false, label: "突刺抗性" }),
        bluntUp: new fields.BooleanField({ initial: false, label: "打击抗性" }),
        slashDown: new fields.BooleanField({ initial: false, label: "斩击弱性" }),
        pierceDown: new fields.BooleanField({ initial: false, label: "突刺弱性" }),
        bluntDown: new fields.BooleanField({ initial: false, label: "打击弱性" })
      }),
      // Activities 系统（替代旧的 conditions 数组）
      activities: new fields.ObjectField({
        initial: {},
        label: "活动列表"
      }),
      // 条件触发数组（已废弃，保留用于数据迁移）
      conditions: new fields.ArrayField(
        new fields.SchemaField({
          trigger: new fields.StringField({
            initial: "onUse",
            choices: ["onUse", "onAttack", "onCounter", "onCounterSuccess", "onCounterFail", "onHit", "onDamaged", "onTurnStart", "onTurnEnd"],
            label: "触发时机"
          }),
          hasConsume: new fields.BooleanField({
            initial: false,
            label: "是否消耗"
          }),
          consumes: new fields.ArrayField(
            new fields.SchemaField({
              buffId: new fields.StringField({ initial: "", label: "BUFF ID" }),
              layers: new fields.NumberField({ initial: 0, label: "层数" }),
              strength: new fields.NumberField({ initial: 0, label: "强度" })
            }),
            { label: "消耗列表" }
          ),
          target: new fields.StringField({
            initial: "selected",
            choices: ["selected", "self", "multiple"],
            label: "目标"
          }),
          effects: new fields.ObjectField({ label: "效果对象" }),
          customEffect: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false, label: "启用自定义效果" }),
            name: new fields.StringField({ initial: "", label: "效果名称" }),
            layers: new fields.NumberField({ initial: 0, label: "层数" }),
            strength: new fields.NumberField({ initial: 0, label: "强度" })
          })
        }),
        { label: "条件列表" }
      )
    };
  }
}