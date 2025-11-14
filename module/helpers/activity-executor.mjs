/**
 * 活动执行引擎
 * 负责执行Activity的核心逻辑，包括条件检查、消耗处理、效果执行等
 */
import { ExpressionParser } from './expression-parser.mjs';
import { EFFECT_TYPES } from './effect-registry.mjs';

export class ActivityExecutor {
  /**
   * 执行Activity
   * @param {Object} activity - Activity数据
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 执行结果
   */
  static async execute(activity, context) {
    console.log('【Activity执行】开始执行:', activity.name);

    try {
      // 1. 检查前置条件
      if (!await this.checkConditions(activity.conditions, context)) {
        return { success: false, reason: '前置条件不满足' };
      }

      // 2. 处理消耗
      const consumeResult = await this.handleConsume(activity.consume, context);
      context.consumed = consumeResult.success;

      // 如果是强制消耗且失败，则整个活动失败
      if (activity.consume?.type === 'mandatory' && !consumeResult.success) {
        return { success: false, reason: '资源不足' };
      }

      // 3. 执行效果列表
      const effectResults = [];
      if (activity.effects && Array.isArray(activity.effects)) {
        for (const effect of activity.effects) {
          const result = await this.executeEffect(effect, context);
          effectResults.push(result);
        }
      }

      // 4. 执行特殊机制
      if (activity.specialMechanics && Array.isArray(activity.specialMechanics)) {
        for (const mechanic of activity.specialMechanics) {
          await this.executeSpecialMechanic(mechanic, context);
        }
      }

      // 5. 更新次数限制
      if (activity.usageLimit) {
        await this.updateUsageCount(activity, context);
      }

      console.log('【Activity执行】执行完成:', effectResults);
      return { success: true, effectResults };

    } catch (error) {
      console.error('【Activity执行】执行失败:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 检查前置条件
   */
  static async checkConditions(conditions, context) {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = await this.checkCondition(condition, context);
      if (!result) {
        console.log('【Activity执行】条件不满足:', condition);
        return false;
      }
    }

    return true;
  }

  /**
   * 检查单个条件
   */
  static async checkCondition(condition, context) {
    const { actor } = context;

    switch (condition.type) {
      case 'hasBuff': {
        const target = context.getTarget(condition.target || 'self');
        const buff = target?.getBuff?.(condition.buffId);
        return buff && buff.layers > 0;
      }

      case 'buffLayer': {
        const target = context.getTarget(condition.target || 'self');
        const buff = target?.getBuff?.(condition.buffId);
        const layers = buff?.layers || 0;

        switch (condition.operator) {
          case 'reach':
          case 'equal':
          case '==':
            return layers === condition.value;
          case 'gt':
          case '>':
            return layers > condition.value;
          case 'lt':
          case '<':
            return layers < condition.value;
          case 'gte':
          case '>=':
            return layers >= condition.value;
          case 'lte':
          case '<=':
            return layers <= condition.value;
          default:
            return false;
        }
      }

      case 'hasCost': {
        const combatState = actor.getFlag('shuhai-dalu', 'combatState');
        const available = combatState?.exResources?.filter(r => !r).length || 0;
        return available >= (condition.amount || 1);
      }

      case 'roundLimit': {
        const usageKey = `activityUsage_${condition.activityId}_round`;
        const currentRound = context.combat?.round || 0;
        const usage = actor.getFlag('shuhai-dalu', usageKey) || { round: 0, count: 0 };

        if (usage.round !== currentRound) {
          return true; // 新回合，可以触发
        }
        return usage.count < condition.maxCount;
      }

      default:
        console.warn('【Activity执行】未知条件类型:', condition.type);
        return true;
    }
  }

  /**
   * 处理消耗
   */
  static async handleConsume(consume, context) {
    if (!consume || !consume.resources || consume.resources.length === 0) {
      return { success: true };
    }

    const { actor } = context;
    const results = [];

    // 检查所有资源是否足够
    for (const resource of consume.resources) {
      if (resource.type === 'extraCost') {
        const combatState = actor.getFlag('shuhai-dalu', 'combatState') || { exResources: [false, false, false] };
        const available = combatState.exResources.filter(r => !r).length;
        if (available < resource.amount) {
          results.push({ resource, available: false });
        } else {
          results.push({ resource, available: true });
        }
      } else if (resource.type === 'buff') {
        const buff = actor.getBuff(resource.buffId);
        if (!buff || buff.layers < resource.layers) {
          results.push({ resource, available: false });
        } else {
          results.push({ resource, available: true });
        }
      }
    }

    // 如果任何资源不足
    const allAvailable = results.every(r => r.available);
    if (!allAvailable && consume.type === 'mandatory') {
      return { success: false, reason: '资源不足' };
    }

    // 如果是可选消耗且资源不足，直接返回失败（但不影响整个活动）
    if (!allAvailable && consume.type === 'optional') {
      return { success: false, reason: '可选消耗失败' };
    }

    // 执行消耗
    for (const { resource } of results) {
      if (resource.type === 'extraCost') {
        const combatState = actor.getFlag('shuhai-dalu', 'combatState') || { exResources: [false, false, false] };
        let consumed = 0;
        for (let i = 0; i < combatState.exResources.length && consumed < resource.amount; i++) {
          if (!combatState.exResources[i]) {
            combatState.exResources[i] = true;
            consumed++;
          }
        }
        await actor.setFlag('shuhai-dalu', 'combatState', combatState);
      } else if (resource.type === 'buff') {
        await actor.consumeBuff(resource.buffId, resource.layers);
      }
    }

    return { success: true };
  }

  /**
   * 执行单个效果
   */
  static async executeEffect(effect, context) {
    const effectType = EFFECT_TYPES[effect.type];
    if (!effectType) {
      console.warn('【Activity执行】未知效果类型:', effect.type);
      return { success: false, reason: '未知效果类型' };
    }

    try {
      return await effectType.execute(effect, context);
    } catch (error) {
      console.error('【Activity执行】效果执行失败:', effect, error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * 执行特殊机制
   */
  static async executeSpecialMechanic(mechanic, context) {
    // 特殊机制通常是复杂的自定义逻辑
    // 这里调用对应的效果类型
    return await this.executeEffect(mechanic, context);
  }

  /**
   * 更新次数限制计数
   */
  static async updateUsageCount(activity, context) {
    const { actor } = context;
    const limit = activity.usageLimit;

    if (limit.type === 'perRound') {
      const usageKey = `activityUsage_${activity._id}_round`;
      const currentRound = context.combat?.round || 0;
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { round: 0, count: 0 };

      if (usage.round !== currentRound) {
        // 新回合，重置计数
        await actor.setFlag('shuhai-dalu', usageKey, { round: currentRound, count: 1 });
      } else {
        // 同一回合，增加计数
        usage.count++;
        await actor.setFlag('shuhai-dalu', usageKey, usage);
      }
    } else if (limit.type === 'perCombat') {
      const usageKey = `activityUsage_${activity._id}_combat`;
      const combatId = context.combat?.id || 'default';
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { combatId: '', count: 0 };

      if (usage.combatId !== combatId) {
        // 新战斗，重置计数
        await actor.setFlag('shuhai-dalu', usageKey, { combatId, count: 1 });
      } else {
        // 同一战斗，增加计数
        usage.count++;
        await actor.setFlag('shuhai-dalu', usageKey, usage);
      }
    }
  }

  /**
   * 检查次数限制
   */
  static async checkUsageLimit(activity, context) {
    const { actor } = context;
    const limit = activity.usageLimit;

    if (!limit) {
      return true;
    }

    if (limit.type === 'perRound') {
      const usageKey = `activityUsage_${activity._id}_round`;
      const currentRound = context.combat?.round || 0;
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { round: 0, count: 0 };

      if (usage.round !== currentRound) {
        return true; // 新回合，可以触发
      }
      return usage.count < limit.count;
    } else if (limit.type === 'perCombat') {
      const usageKey = `activityUsage_${activity._id}_combat`;
      const combatId = context.combat?.id || 'default';
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { combatId: '', count: 0 };

      if (usage.combatId !== combatId) {
        return true; // 新战斗，可以触发
      }
      return usage.count < limit.count;
    }

    return true;
  }
}

/**
 * 创建执行上下文
 */
export function createContext(actor, target, item, dice, combat) {
  return {
    actor,
    target,
    item,
    dice,
    combat,
    consumed: false,

    /**
     * 获取目标Actor
     */
    getTarget(targetType) {
      switch (targetType) {
        case 'self':
          return this.actor;
        case 'selected':
        case 'target':
          return this.target;
        case 'all':
          // 返回所有目标（需要根据实际情况实现）
          return [this.target];
        default:
          return this.target;
      }
    }
  };
}
