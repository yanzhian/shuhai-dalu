/**
 * 效果注册表
 * 定义所有可用的效果类型及其执行逻辑
 */
import { ExpressionParser } from './expression-parser.mjs';

/**
 * 所有效果类型的注册表
 */
export const EFFECT_TYPES = {
  // ===== 基础效果 =====

  /**
   * 添加BUFF
   */
  addBuff: {
    name: '添加BUFF',
    category: 'basic',
    fields: ['buffId', 'layers', 'strength', 'target', 'condition'],
    defaults: { layers: 1, strength: 0, target: 'selected' },
    execute: async (effect, context) => {
      // 检查条件
      if (effect.condition && !context[effect.condition]) {
        return { success: false, reason: '条件不满足' };
      }

      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      // 解析层数和强度（支持表达式）
      const layers = ExpressionParser.parse(effect.layers, context);
      const strength = ExpressionParser.parse(effect.strength, context);

      // 添加BUFF
      await targetActor.addBuff(effect.buffId, layers, strength);

      return { success: true, message: `为${targetActor.name}添加${layers}层${effect.buffId}` };
    }
  },

  /**
   * 消耗BUFF
   */
  consumeBuff: {
    name: '消耗BUFF',
    category: 'basic',
    fields: ['buffId', 'layers', 'target'],
    defaults: { layers: 1, target: 'self' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      const layers = ExpressionParser.parse(effect.layers, context);
      const success = await targetActor.consumeBuff(effect.buffId, layers);

      return {
        success,
        message: success ? `消耗${layers}层${effect.buffId}` : `${effect.buffId}层数不足`
      };
    }
  },

  /**
   * 清除BUFF
   */
  clearBuff: {
    name: '清除BUFF',
    category: 'basic',
    fields: ['buffId', 'target'],
    defaults: { target: 'self' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      await targetActor.clearBuff(effect.buffId);
      return { success: true, message: `清除所有${effect.buffId}层数` };
    }
  },

  /**
   * 触发BUFF效果（立即结算）
   */
  triggerBuffEffect: {
    name: '触发BUFF效果',
    category: 'advanced',
    fields: ['buffId', 'target'],
    defaults: { target: 'selected' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      const buff = targetActor.getBuff(effect.buffId);
      if (!buff || buff.layers <= 0) {
        return { success: false, reason: `目标没有${effect.buffId}` };
      }

      // 触发BUFF效果（例如：燃烧造成伤害）
      await targetActor.applyBuffEffect(buff);

      return { success: true, message: `触发${effect.buffId}效果` };
    }
  },

  // ===== 骰子相关效果 =====

  /**
   * 骰数修正
   */
  diceModifier: {
    name: '骰数修正',
    category: 'dice',
    fields: ['modifier', 'condition'],
    defaults: { modifier: 0 },
    execute: async (effect, context) => {
      // 检查条件（例如：仅在消耗成功时生效）
      if (effect.condition && !context[effect.condition]) {
        return { success: false, reason: '条件不满足' };
      }

      if (!context.dice) {
        return { success: false, reason: '没有骰子上下文' };
      }

      const modifier = ExpressionParser.parse(effect.modifier, context);
      context.dice.finalValue = (context.dice.finalValue || 0) + modifier;

      return { success: true, message: `骰数${modifier >= 0 ? '+' : ''}${modifier}` };
    }
  },

  /**
   * 替换骰子
   */
  replaceDice: {
    name: '替换骰子',
    category: 'dice',
    fields: ['targetDice', 'newDiceId', 'duration', 'scope'],
    defaults: { duration: 'once', scope: 'combat' },
    execute: async (effect, context) => {
      const { actor } = context;

      // 找到目标骰子
      let diceItem;
      if (effect.targetDice === 'current') {
        diceItem = context.item;
      } else if (effect.targetDice === 'nextInterception') {
        // 下次拦截的行动骰（需要标记）
        await actor.setFlag('shuhai-dalu', 'nextInterceptionReplace', {
          newDiceId: effect.newDiceId,
          duration: effect.duration
        });
        return { success: true, message: '已设置下次拦截替换' };
      } else if (effect.targetDice.startsWith('slot:')) {
        const slotIndex = parseInt(effect.targetDice.split(':')[1]);
        // 根据槽位查找骰子
        diceItem = actor.items.find(i => i.system.slot === slotIndex);
      }

      if (!diceItem) {
        return { success: false, reason: '找不到目标骰子' };
      }

      // 执行替换
      const newDice = game.items.find(i => i.name === effect.newDiceId || i._id === effect.newDiceId);
      if (!newDice) {
        return { success: false, reason: '找不到新骰子' };
      }

      // 根据持续时间和范围执行替换
      if (effect.scope === 'combat' && effect.duration === 'permanent') {
        // 永久替换（本场战斗）
        await actor.setFlag('shuhai-dalu', `diceReplace_${diceItem.id}`, {
          originalId: diceItem.id,
          newId: newDice.id,
          scope: 'combat'
        });
      }

      return { success: true, message: `${diceItem.name} 替换为 ${newDice.name}` };
    }
  },

  /**
   * 追加攻击
   */
  appendAttack: {
    name: '追加攻击',
    category: 'dice',
    fields: ['diceId', 'times', 'timing'],
    defaults: { times: 1, timing: 'afterCurrent' },
    execute: async (effect, context) => {
      const { actor } = context;

      const dice = game.items.find(i => i.name === effect.diceId || i._id === effect.diceId);
      if (!dice) {
        return { success: false, reason: '找不到指定骰子' };
      }

      // 添加到待执行队列
      const queue = actor.getFlag('shuhai-dalu', 'attackQueue') || [];
      for (let i = 0; i < effect.times; i++) {
        queue.push({
          diceId: dice.id,
          timing: effect.timing
        });
      }
      await actor.setFlag('shuhai-dalu', 'attackQueue', queue);

      return { success: true, message: `追加${effect.times}次${dice.name}` };
    }
  },

  // ===== 资源相关效果 =====

  /**
   * 恢复额外Cost
   */
  restoreCost: {
    name: '恢复额外Cost',
    category: 'resource',
    fields: ['amount'],
    defaults: { amount: 1 },
    execute: async (effect, context) => {
      const { actor } = context;

      const amount = ExpressionParser.parse(effect.amount, context);
      if (amount <= 0) {
        return { success: false, reason: '恢复数量必须大于0' };
      }

      // 恢复额外Cost
      const combatState = actor.getFlag('shuhai-dalu', 'combatState') || {
        exResources: [false, false, false]
      };

      let restored = 0;
      for (let i = 0; i < combatState.exResources.length && restored < amount; i++) {
        if (combatState.exResources[i]) {
          combatState.exResources[i] = false;
          restored++;
        }
      }

      await actor.setFlag('shuhai-dalu', 'combatState', combatState);

      return { success: true, message: `恢复${restored}个额外Cost` };
    }
  },

  /**
   * 消耗额外Cost
   */
  consumeCost: {
    name: '消耗额外Cost',
    category: 'resource',
    fields: ['amount'],
    defaults: { amount: 1 },
    execute: async (effect, context) => {
      const { actor } = context;

      const amount = ExpressionParser.parse(effect.amount, context);
      if (amount <= 0) {
        return { success: false, reason: '消耗数量必须大于0' };
      }

      const combatState = actor.getFlag('shuhai-dalu', 'combatState') || {
        exResources: [false, false, false]
      };

      // 检查是否有足够的Cost
      const available = combatState.exResources.filter(r => !r).length;
      if (available < amount) {
        return { success: false, reason: `额外Cost不足（需要${amount}，拥有${available}）` };
      }

      // 消耗Cost
      let consumed = 0;
      for (let i = 0; i < combatState.exResources.length && consumed < amount; i++) {
        if (!combatState.exResources[i]) {
          combatState.exResources[i] = true;
          consumed++;
        }
      }

      await actor.setFlag('shuhai-dalu', 'combatState', combatState);

      return { success: true, message: `消耗${consumed}个额外Cost` };
    }
  },

  // ===== 伤害相关效果 =====

  /**
   * 造成伤害
   */
  dealDamage: {
    name: '造成伤害',
    category: 'damage',
    fields: ['amount', 'target', 'type'],
    defaults: { amount: 0, target: 'selected', type: 'direct' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      const amount = ExpressionParser.parse(effect.amount, context);
      if (amount <= 0) {
        return { success: false, reason: '伤害必须大于0' };
      }

      // 造成伤害（需要根据你的系统实现）
      await targetActor.takeDamage(amount, effect.type);

      return { success: true, message: `对${targetActor.name}造成${amount}点伤害` };
    }
  },

  /**
   * 恢复生命值
   */
  healHealth: {
    name: '恢复生命值',
    category: 'damage',
    fields: ['amount', 'target'],
    defaults: { amount: 0, target: 'self' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      // 解析恢复量（支持骰子公式，如 "1d8"）
      let amount;
      let rollFormula = null;

      if (typeof effect.amount === 'string' && effect.amount.includes('d')) {
        // 骰子公式
        const roll = new Roll(effect.amount);
        await roll.evaluate();
        amount = roll.total;
        rollFormula = effect.amount;

        // 发送带恢复按钮的骰子结果到聊天
        const messageContent = `
          <div class="dice-roll">
            <div class="dice-result">
              <div class="dice-formula">${rollFormula}</div>
              <h4 class="dice-total">${amount}</h4>
            </div>
          </div>
          <div style="margin-top: 8px; text-align: center;">
            <button class="heal-button"
                    data-actor-id="${targetActor.id}"
                    data-amount="${amount}"
                    style="padding: 10px 28px; background: #4a7c2c; color: #FFFFFF; border: 2px solid #5ec770; border-radius: 4px; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: 'Noto Sans SC', sans-serif;">
              💊 恢复 ${amount} 点生命值
            </button>
          </div>
          <style>
          .heal-button:hover {
            background: #5a9c3c;
            border-color: #6ed780;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          }
          .heal-button:disabled {
            background: #888;
            border-color: #666;
            cursor: not-allowed;
            transform: none;
          }
          </style>
        `;

        const message = await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: context.actor }),
          flavor: `${context.item?.name || '恢复生命值'}`,
          content: messageContent
        });

        // 不立即恢复，等待按钮点击
        return {
          success: true,
          message: `骰子结果: ${amount}点治疗（等待确认）`,
          healAmount: amount,
          pending: true
        };
      } else {
        // 普通数值或表达式 - 直接恢复
        amount = ExpressionParser.parse(effect.amount, context);

        if (amount <= 0) {
          return { success: false, reason: '恢复量必须大于0' };
        }

        // 恢复生命值
        const currentHP = targetActor.system.attributes?.hp?.value || 0;
        const maxHP = targetActor.system.attributes?.hp?.max || 100;
        const newHP = Math.min(currentHP + amount, maxHP);

        await targetActor.update({
          'system.attributes.hp.value': newHP
        });

        return {
          success: true,
          message: `${targetActor.name}恢复${amount}点生命值（${currentHP} → ${newHP}）`,
          healAmount: amount
        };
      }
    }
  },

  // ===== 特殊效果 =====

  /**
   * 添加到特殊栏位
   */
  addToSlot: {
    name: '添加到特殊栏位',
    category: 'special',
    fields: ['slotType', 'itemName', 'target'],
    defaults: { slotType: 'passive', target: 'self' },
    execute: async (effect, context) => {
      const targetActor = context.getTarget(effect.target);
      if (!targetActor) {
        return { success: false, reason: '找不到目标' };
      }

      const item = game.items.find(i => i.name === effect.itemName);
      if (!item) {
        return { success: false, reason: '找不到物品' };
      }

      // 添加到对应栏位
      await targetActor.createEmbeddedDocuments('Item', [{
        ...item.toObject(),
        'system.slotType': effect.slotType
      }]);

      return { success: true, message: `将${item.name}添加到${effect.slotType}栏` };
    }
  },

  /**
   * 免疫效果
   */
  immunity: {
    name: '免疫效果',
    category: 'special',
    fields: ['effectType', 'immunityType'],
    defaults: { immunityType: 'damage' },
    execute: async (effect, context) => {
      const { actor } = context;

      // 添加免疫标记
      const immunities = actor.getFlag('shuhai-dalu', 'immunities') || [];
      immunities.push({
        effectType: effect.effectType,
        immunityType: effect.immunityType
      });
      await actor.setFlag('shuhai-dalu', 'immunities', immunities);

      return { success: true, message: `免疫${effect.effectType}的${effect.immunityType}` };
    }
  },

  /**
   * 增加额外目标
   */
  additionalTarget: {
    name: '增加额外目标',
    category: 'combat',
    fields: ['maxAdditional', 'targetFilter', 'description'],
    defaults: { maxAdditional: 1, targetFilter: 'adjacent', description: '行动顺序相邻的目标' },
    execute: async (effect, context) => {
      const { actor, combat } = context;

      if (!combat) {
        return { success: false, reason: '不在战斗中' };
      }

      // 获取当前actor在行动顺序中的位置
      const currentCombatant = combat.combatants.find(c => c.actor?.id === actor.id);
      if (!currentCombatant) {
        return { success: false, reason: '未找到当前战斗者' };
      }

      const currentIndex = combat.turns.indexOf(currentCombatant);
      const maxAdditional = ExpressionParser.parse(effect.maxAdditional, context);

      // 根据过滤条件查找可选目标
      let availableTargets = [];
      if (effect.targetFilter === 'adjacent') {
        // 查找行动顺序相邻的目标
        const adjacentIndices = [currentIndex - 1, currentIndex + 1];
        availableTargets = adjacentIndices
          .filter(i => i >= 0 && i < combat.turns.length)
          .map(i => combat.turns[i])
          .filter(c => c.actor && c.actor.id !== actor.id);
      } else {
        // 所有其他目标
        availableTargets = combat.turns
          .filter(c => c.actor && c.actor.id !== actor.id);
      }

      // 限制最多额外选择数量
      availableTargets = availableTargets.slice(0, maxAdditional);

      // 存储额外目标信息（供后续使用）
      await actor.setFlag('shuhai-dalu', 'additionalTargets', {
        targets: availableTargets.map(c => c.actor.id),
        description: effect.description,
        maxCount: maxAdditional
      });

      const targetNames = availableTargets.map(c => c.actor.name).join('、');
      return {
        success: true,
        message: availableTargets.length > 0
          ? `可额外选择目标（最多${maxAdditional}个）：${targetNames}`
          : `没有可选的额外目标`
      };
    }
  },

  /**
   * 再次使用骰子
   */
  reuseDice: {
    name: '再次使用骰子',
    category: 'combat',
    fields: ['diceId', 'limitPerRound', 'condition'],
    defaults: { limitPerRound: 1, condition: null },
    execute: async (effect, context) => {
      const { actor, item, combat } = context;

      // 检查是否在战斗中
      if (!combat) {
        return { success: false, reason: '不在战斗中' };
      }

      // 检查本回合使用次数限制
      const roundId = `round-${combat.round}`;
      const usageKey = `reuseDice-${item.id}-${roundId}`;
      const usageCount = actor.getFlag('shuhai-dalu', usageKey) || 0;

      const limitPerRound = ExpressionParser.parse(effect.limitPerRound, context);
      if (usageCount >= limitPerRound) {
        return {
          success: false,
          reason: `本回合已达使用次数限制（${limitPerRound}次）`
        };
      }

      // 检查条件
      if (effect.condition) {
        const conditionMet = ExpressionParser.parse(effect.condition, context);
        if (!conditionMet) {
          return { success: false, reason: '条件不满足' };
        }
      }

      // 增加使用计数
      await actor.setFlag('shuhai-dalu', usageKey, usageCount + 1);

      // 设置重用标记（供骰子系统读取）
      await actor.setFlag('shuhai-dalu', 'pendingReuseDice', {
        itemId: item.id,
        itemName: item.name,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: `将再次使用【${item.name}】（本回合第${usageCount + 1}/${limitPerRound}次）`
      };
    }
  }
};

/**
 * 效果分类
 */
export const EFFECT_CATEGORIES = {
  basic: {
    name: '基础效果',
    icon: '✨',
    effects: ['addBuff', 'consumeBuff', 'clearBuff', 'triggerBuffEffect']
  },
  dice: {
    name: '骰子效果',
    icon: '🎲',
    effects: ['diceModifier', 'replaceDice', 'appendAttack']
  },
  resource: {
    name: '资源效果',
    icon: '💰',
    effects: ['restoreCost', 'consumeCost']
  },
  damage: {
    name: '伤害效果',
    icon: '⚔️',
    effects: ['dealDamage', 'healHealth']
  },
  combat: {
    name: '战斗效果',
    icon: '⚔️',
    effects: ['additionalTarget', 'reuseDice']
  },
  special: {
    name: '特殊效果',
    icon: '⚡',
    effects: ['addToSlot', 'immunity']
  }
};

/**
 * 获取效果的显示名称
 */
export function getEffectDisplayName(effectType) {
  return EFFECT_TYPES[effectType]?.name || effectType;
}

/**
 * 获取效果的分类
 */
export function getEffectCategory(effectType) {
  for (const [categoryId, category] of Object.entries(EFFECT_CATEGORIES)) {
    if (category.effects.includes(effectType)) {
      return categoryId;
    }
  }
  return 'basic';
}
