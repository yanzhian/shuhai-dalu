/**
 * 活动执行引擎 v2.0
 * 负责执行Activity的核心逻辑，包括条件检查、消耗处理、效果执行等
 *
 * 支持新的统一数据格式：
 * - trigger 对象格式（支持被动触发和类别过滤）
 * - 复杂消耗模式（强制 + 可选二选一/三选一）
 * - 表达式解析（骰子、变量、函数）
 * - 多种效果类型（addBuff, consumeBuff, heal, dealDamage, 等）
 */
import { ExpressionParser } from './expression-parser.mjs';
import { findBuffById } from '../constants/buff-types.mjs';

export class ActivityExecutor {
  /**
   * 执行Activity
   * @param {Object} activity - Activity数据（新格式）
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 执行结果
   */
  static async execute(activity, context) {
    console.log('【Activity执行】开始执行:', activity.name);

    try {
      // 1. 检查次数限制（在执行前）
      if (activity.usageLimit) {
        const canUse = await this.checkUsageLimit(activity, context);
        if (!canUse) {
          console.log('【Activity执行】次数限制，无法使用');
          return { success: false, reason: '次数限制' };
        }
      }

      // 2. 检查触发条件（trigger 对象格式）
      if (!this.shouldTrigger(activity, context)) {
        return { success: false, reason: '触发条件不满足' };
      }

      // 3. 检查前置条件
      if (!await this.checkConditions(activity.conditions, context)) {
        return { success: false, reason: '前置条件不满足' };
      }

      // 4. 处理消耗（支持复杂消耗模式）
      const consumeResult = await this.handleConsume(activity.consume, context);
      context.consumed = consumeResult.success;
      context.selectedOption = consumeResult.selectedOption;

      // 如果是强制消耗且失败，则整个活动失败
      if (activity.consume?.mode === 'mandatory' && !consumeResult.success) {
        return { success: false, reason: '资源不足' };
      }

      // 5. 执行效果列表（数组格式）
      const effectResults = await this.executeEffects(activity.effects, context);

      // 6. 更新次数限制（在执行后）
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
   * 检查是否应该触发（新格式：trigger 对象）
   */
  static shouldTrigger(activity, context) {
    const trigger = activity.trigger;

    // 兼容旧格式（字符串）
    if (typeof trigger === 'string') {
      return trigger === context.triggerType;
    }

    // 新格式：对象
    if (!trigger || !trigger.type) {
      console.warn('【Activity执行】无效的 trigger 格式:', trigger);
      return false;
    }

    // 1. 检查触发类型
    if (trigger.type !== context.triggerType) {
      return false;
    }

    // 2. 检查攻击类别过滤（仅对特定攻击类型触发）
    if (trigger.category) {
      const attackCategory = context.item?.system?.category || context.attackCategory;
      if (trigger.category !== attackCategory) {
        console.log('【Activity执行】攻击类别不匹配:', {
          required: trigger.category,
          actual: attackCategory
        });
        return false;
      }
    }

    // 3. 被动触发的特殊处理
    // 被动触发通常在特定时机检查所有被动 activities
    // 这里不需要特殊逻辑，因为触发类型已经是 'passive'

    return true;
  }

  /**
   * 检查前置条件（AND 逻辑）
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
        const target = this.getTarget(condition.target || 'self', context);
        const buff = target?.getBuff?.(condition.buffId);
        return buff && buff.layers > 0;
      }

      case 'buffLayer': {
        const target = this.getTarget(condition.target || 'self', context);
        const buff = target?.getBuff?.(condition.buffId);
        const layers = buff?.layers || 0;

        switch (condition.operator) {
          case 'reach':
          case 'equal':
          case '==':
          case '===':
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

      case 'resourceCount': {
        const target = this.getTarget(condition.target || 'self', context);
        const combatState = target.getFlag('shuhai-dalu', 'combatState');

        let count = 0;
        if (condition.resourceType === 'cost') {
          count = combatState?.costResources?.filter(r => !r).length || 0;
        } else if (condition.resourceType === 'ex') {
          count = combatState?.exResources?.filter(r => !r).length || 0;
        }

        return this.compareValue(count, condition.operator, condition.value);
      }

      case 'healthPercent': {
        const target = this.getTarget(condition.target || 'self', context);
        const hp = target.system.derived.hp;
        const percent = (hp.value / hp.max) * 100;

        return this.compareValue(percent, condition.operator, condition.value);
      }

      case 'customExpression': {
        // 使用表达式解析器计算条件
        try {
          const result = ExpressionParser.parse(condition.expression, context);
          return result > 0; // 非零值为 true
        } catch (error) {
          console.error('【Activity执行】自定义表达式错误:', condition.expression, error);
          return false;
        }
      }

      case 'hasCost': {
        // 兼容旧格式
        const combatState = actor.getFlag('shuhai-dalu', 'combatState');
        const available = combatState?.exResources?.filter(r => !r).length || 0;
        return available >= (condition.amount || 1);
      }

      case 'roundLimit': {
        // 兼容旧格式
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
   * 比较数值（通用比较方法）
   */
  static compareValue(actual, operator, expected) {
    switch (operator) {
      case '==':
      case '===':
      case 'equal':
        return actual === expected;
      case '>':
      case 'gt':
        return actual > expected;
      case '<':
      case 'lt':
        return actual < expected;
      case '>=':
      case 'gte':
        return actual >= expected;
      case '<=':
      case 'lte':
        return actual <= expected;
      case '!=':
      case '!==':
        return actual !== expected;
      default:
        return false;
    }
  }

  /**
   * 处理消耗（支持复杂消耗模式）
   */
  static async handleConsume(consume, context) {
    if (!consume || consume.mode === 'none') {
      return { success: true };
    }

    const { actor } = context;

    // 1. 检查强制部分
    if (consume.resources && consume.resources.length > 0) {
      const mandatoryCheck = await this.checkResources(consume.resources, context);
      if (!mandatoryCheck.success) {
        ui.notifications.warn('强制资源不足');
        return { success: false, reason: '强制资源不足' };
      }
    }

    // 2. 处理可选部分
    let selectedOption = null;
    if (consume.mode === 'optional' && consume.options && consume.options.length > 0) {
      // 检查每个选项是否可用
      const availableOptions = [];
      for (const option of consume.options) {
        const check = await this.checkResources(option, context);
        if (check.success) {
          availableOptions.push(option);
        }
      }

      // 如果没有可用选项，失败
      if (availableOptions.length === 0) {
        ui.notifications.warn('可选资源不足');
        return { success: false, reason: '可选资源不足' };
      }

      // 如果有多个选项，弹出选择对话框
      if (availableOptions.length > 1) {
        selectedOption = await this.showConsumeChoiceDialog(availableOptions, context);
        if (!selectedOption) {
          // 用户取消
          return { success: false, reason: '用户取消' };
        }
      } else {
        // 只有一个选项，自动选择
        selectedOption = availableOptions[0];
      }

      // 消耗选中的选项
      await this.consumeResources(selectedOption, context);
    }

    // 3. 消耗强制部分
    if (consume.resources && consume.resources.length > 0) {
      await this.consumeResources(consume.resources, context);
    }

    return { success: true, selectedOption };
  }

  /**
   * 检查资源是否足够
   */
  static async checkResources(resources, context) {
    const { actor } = context;

    for (const resource of resources) {
      if (resource.type === 'buff') {
        const buff = actor.getBuff(resource.buffId);
        if (!buff || buff.layers < resource.layers) {
          return { success: false, resource };
        }
      } else if (resource.type === 'resource') {
        const combatState = actor.getFlag('shuhai-dalu', 'combatState');
        let available = 0;

        if (resource.resourceType === 'cost') {
          available = combatState?.costResources?.filter(r => !r).length || 0;
        } else if (resource.resourceType === 'ex') {
          available = combatState?.exResources?.filter(r => !r).length || 0;
        }

        if (available < resource.count) {
          return { success: false, resource };
        }
      }
    }

    return { success: true };
  }

  /**
   * 消耗资源
   */
  static async consumeResources(resources, context) {
    const { actor } = context;

    for (const resource of resources) {
      if (resource.type === 'buff') {
        await actor.consumeBuff(resource.buffId, resource.layers);
      } else if (resource.type === 'resource') {
        const combatState = actor.getFlag('shuhai-dalu', 'combatState');

        if (resource.resourceType === 'cost') {
          let consumed = 0;
          for (let i = 0; i < combatState.costResources.length && consumed < resource.count; i++) {
            if (!combatState.costResources[i]) {
              combatState.costResources[i] = true;
              consumed++;
            }
          }
        } else if (resource.resourceType === 'ex') {
          let consumed = 0;
          for (let i = 0; i < combatState.exResources.length && consumed < resource.count; i++) {
            if (!combatState.exResources[i]) {
              combatState.exResources[i] = true;
              consumed++;
            }
          }
        }

        await actor.setFlag('shuhai-dalu', 'combatState', combatState);
      }
    }
  }

  /**
   * 显示消耗选择对话框
   */
  static async showConsumeChoiceDialog(options, context) {
    return new Promise((resolve) => {
      const content = `
        <div class="consume-choice-dialog" style="padding: 10px;">
          <p style="margin-bottom: 10px; font-weight: bold;">选择消耗方式：</p>
          ${options.map((option, index) => `
            <div class="option" style="margin: 8px 0; padding: 8px; border: 1px solid #999; border-radius: 4px; cursor: pointer;" data-index="${index}">
              <label style="cursor: pointer; display: block;">
                <input type="radio" name="consume-choice" value="${index}" ${index === 0 ? 'checked' : ''} style="margin-right: 8px;" />
                ${this.formatConsumeOption(option)}
              </label>
            </div>
          `).join('')}
        </div>
      `;

      new Dialog({
        title: '选择消耗',
        content,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: '确认',
            callback: (html) => {
              const selected = html.find('input[name="consume-choice"]:checked').val();
              resolve(options[parseInt(selected)]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: '取消',
            callback: () => resolve(null)
          }
        },
        default: 'confirm',
        render: (html) => {
          // 点击整个选项区域时选中radio
          html.find('.option').click(function() {
            $(this).find('input[type="radio"]').prop('checked', true);
          });
        }
      }).render(true);
    });
  }

  /**
   * 格式化消耗选项为可读文本
   */
  static formatConsumeOption(option) {
    return option.map(resource => {
      if (resource.type === 'buff') {
        const buffDef = findBuffById(resource.buffId);
        const buffName = buffDef?.name || resource.buffId;
        return `${resource.layers} 层【${buffName}】`;
      } else if (resource.type === 'resource') {
        const typeName = resource.resourceType === 'cost' ? 'Cost' : 'EX';
        return `${resource.count} 个 ${typeName}`;
      }
      return '未知资源';
    }).join(' 或 ');
  }

  /**
   * 执行效果列表（数组格式，支持多个效果）
   */
  static async executeEffects(effects, context) {
    if (!effects || effects.length === 0) {
      return [];
    }

    const results = [];

    for (const effect of effects) {
      try {
        const result = await this.executeEffect(effect, context);
        results.push({
          effect,
          result,
          success: result.success !== false
        });

        // 如果效果失败且是关键效果，可以选择停止执行
        if (!result.success && effect.critical) {
          console.warn('【Activity执行】关键效果失败，停止执行');
          break;
        }
      } catch (error) {
        console.error('【Activity执行】效果执行异常:', effect, error);
        results.push({
          effect,
          result: { success: false, error: error.message },
          success: false
        });
      }
    }

    return results;
  }

  /**
   * 执行单个效果（分发到具体实现）
   */
  static async executeEffect(effect, context) {
    switch (effect.type) {
      case 'addBuff':
        return await this.executeAddBuff(effect, context);

      case 'consumeBuff':
        return await this.executeConsumeBuff(effect, context);

      case 'heal':
        return await this.executeHeal(effect, context);

      case 'dealDamage':
        return await this.executeDealDamage(effect, context);

      case 'modifyDice':
        return await this.executeModifyDice(effect, context);

      case 'restoreResource':
        return await this.executeRestoreResource(effect, context);

      case 'deductResource':
        return await this.executeDeductResource(effect, context);

      case 'customBuff':
        return await this.executeCustomBuff(effect, context);

      default:
        console.warn('【Activity执行】未知效果类型:', effect.type);
        return { success: false, reason: '未知效果类型' };
    }
  }

  /**
   * 效果实现：添加 BUFF
   */
  static async executeAddBuff(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    // 验证 BUFF 是否存在
    const buffDef = findBuffById(effect.buffId);
    if (!buffDef) {
      console.warn('【Activity执行】未知的 BUFF ID:', effect.buffId);
      return { success: false, reason: '未知 BUFF' };
    }

    // 解析层数和强度（支持表达式）
    const layers = await this.parseEffectValue(effect.layers || 1, context);
    const strength = await this.parseEffectValue(effect.strength || 0, context);
    const roundTiming = effect.roundTiming || 'current';

    // 添加 BUFF
    await target.addBuff(effect.buffId, layers, strength, roundTiming);

    console.log('【Activity执行】添加 BUFF:', {
      target: target.name,
      buffId: effect.buffId,
      layers,
      strength,
      roundTiming
    });

    return { success: true, buffId: effect.buffId, layers, strength, roundTiming };
  }

  /**
   * 效果实现：消耗 BUFF
   */
  static async executeConsumeBuff(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    const layers = await this.parseEffectValue(effect.layers || 1, context);

    // 消耗 BUFF
    await target.consumeBuff(effect.buffId, layers);

    console.log('【Activity执行】消耗 BUFF:', {
      target: target.name,
      buffId: effect.buffId,
      layers
    });

    return { success: true, buffId: effect.buffId, layers };
  }

  /**
   * 效果实现：恢复生命
   */
  static async executeHeal(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    const amount = await this.parseEffectValue(effect.amount || effect.formula, context);

    const hp = target.system.derived.hp;
    const newHp = Math.min(hp.max, hp.value + amount);
    const actualHeal = newHp - hp.value;

    await target.update({ 'system.derived.hp.value': newHp });

    console.log('【Activity执行】恢复生命:', {
      target: target.name,
      amount: actualHeal
    });

    return { success: true, amount: actualHeal };
  }

  /**
   * 效果实现：造成伤害
   */
  static async executeDealDamage(effect, context) {
    const target = this.getTarget(effect.target || 'opponent', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    const damage = await this.parseEffectValue(effect.formula || effect.amount, context);

    const hp = target.system.derived.hp;
    const newHp = Math.max(0, hp.value - damage);
    const actualDamage = hp.value - newHp;

    await target.update({ 'system.derived.hp.value': newHp });

    console.log('【Activity执行】造成伤害:', {
      target: target.name,
      damage: actualDamage
    });

    return { success: true, damage: actualDamage };
  }

  /**
   * 效果实现：修改骰子
   */
  static async executeModifyDice(effect, context) {
    // 修改骰子通常是修改上下文中的骰子数据
    if (!context.dice) {
      return { success: false, reason: '没有骰子数据' };
    }

    const modifier = await this.parseEffectValue(effect.modifier || 0, context);

    // 修改骰子的最终值
    if (context.dice.finalValue !== undefined) {
      context.dice.finalValue += modifier;
    } else if (context.dice.total !== undefined) {
      context.dice.total += modifier;
    }

    console.log('【Activity执行】修改骰子:', {
      modifier,
      newValue: context.dice.finalValue || context.dice.total
    });

    return { success: true, modifier };
  }

  /**
   * 效果实现：恢复资源
   */
  static async executeRestoreResource(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    const count = await this.parseEffectValue(effect.count, context);
    const combatState = target.getFlag('shuhai-dalu', 'combatState');

    let restored = 0;
    if (effect.resourceType === 'cost') {
      for (let i = 0; i < combatState.costResources.length && restored < count; i++) {
        if (combatState.costResources[i]) {
          combatState.costResources[i] = false;
          restored++;
        }
      }
    } else if (effect.resourceType === 'ex') {
      for (let i = 0; i < combatState.exResources.length && restored < count; i++) {
        if (combatState.exResources[i]) {
          combatState.exResources[i] = false;
          restored++;
        }
      }
    }

    await target.setFlag('shuhai-dalu', 'combatState', combatState);

    console.log('【Activity执行】恢复资源:', {
      target: target.name,
      resourceType: effect.resourceType,
      restored
    });

    return { success: true, resourceType: effect.resourceType, restored };
  }

  /**
   * 效果实现：扣除资源
   */
  static async executeDeductResource(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    const count = await this.parseEffectValue(effect.count, context);
    const combatState = target.getFlag('shuhai-dalu', 'combatState');

    let deducted = 0;
    if (effect.resourceType === 'cost') {
      for (let i = 0; i < combatState.costResources.length && deducted < count; i++) {
        if (!combatState.costResources[i]) {
          combatState.costResources[i] = true;
          deducted++;
        }
      }
    } else if (effect.resourceType === 'ex') {
      for (let i = 0; i < combatState.exResources.length && deducted < count; i++) {
        if (!combatState.exResources[i]) {
          combatState.exResources[i] = true;
          deducted++;
        }
      }
    }

    await target.setFlag('shuhai-dalu', 'combatState', combatState);

    console.log('【Activity执行】扣除资源:', {
      target: target.name,
      resourceType: effect.resourceType,
      deducted
    });

    return { success: true, resourceType: effect.resourceType, deducted };
  }

  /**
   * 效果实现：自定义 BUFF
   */
  static async executeCustomBuff(effect, context) {
    const target = this.getTarget(effect.target || 'self', context);
    if (!target) {
      return { success: false, reason: '目标不存在' };
    }

    // 自定义 BUFF 使用 'custom' ID，名称由用户定义
    const layers = await this.parseEffectValue(effect.layers || 1, context);
    const strength = await this.parseEffectValue(effect.strength || 0, context);
    const roundTiming = effect.roundTiming || 'current';

    // 添加自定义 BUFF
    await target.addBuff('custom', layers, strength, roundTiming, effect.name);

    console.log('【Activity执行】添加自定义 BUFF:', {
      target: target.name,
      name: effect.name,
      layers,
      strength,
      roundTiming
    });

    return { success: true, name: effect.name, layers, strength, roundTiming };
  }

  /**
   * 解析效果数值（支持表达式）
   */
  static async parseEffectValue(value, context) {
    // 1. 如果是数字，直接返回
    if (typeof value === 'number') {
      return value;
    }

    // 2. 空值返回 0
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    // 3. 字符串处理
    const strValue = String(value).trim();

    // 4. 纯数字字符串
    if (/^\d+$/.test(strValue)) {
      return parseInt(strValue);
    }

    // 5. 骰子表达式（如 "1d4+3", "2d6"）
    if (/\d+d\d+/.test(strValue)) {
      try {
        const roll = await new Roll(strValue).evaluate();
        return roll.total;
      } catch (error) {
        console.error('【Activity执行】骰子表达式解析失败:', strValue, error);
        return 0;
      }
    }

    // 6. 变量引用（如 "{burn.layers}", "floor({charge.layers}/2)"）
    if (/\{[^}]+\}/.test(strValue)) {
      try {
        return ExpressionParser.parse(strValue, context);
      } catch (error) {
        console.error('【Activity执行】变量引用解析失败:', strValue, error);
        return 0;
      }
    }

    // 7. 其他尝试转换为数字
    return parseFloat(strValue) || 0;
  }

  /**
   * 获取目标 Actor
   */
  static getTarget(targetType, context) {
    switch (targetType) {
      case 'self':
        return context.actor;
      case 'selected':
      case 'opponent':
      case 'target':
        return context.target;
      case 'all':
        // 返回所有目标（需要根据实际情况实现）
        return context.target ? [context.target] : [];
      case 'allAllies':
        // TODO: 实现获取所有友方
        return [];
      case 'allEnemies':
        // TODO: 实现获取所有敌方
        return [];
      default:
        return context.target || context.actor;
    }
  }

  /**
   * 更新次数限制计数
   */
  static async updateUsageCount(activity, context) {
    const { actor } = context;
    const limit = activity.usageLimit;

    if (limit.perRound) {
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
    }

    if (limit.perCombat) {
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

    if (limit.total) {
      const usageKey = `activityUsage_${activity._id}_total`;
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { count: 0 };
      usage.count++;
      await actor.setFlag('shuhai-dalu', usageKey, usage);
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

    if (limit.perRound) {
      const usageKey = `activityUsage_${activity._id}_round`;
      const currentRound = context.combat?.round || 0;
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { round: 0, count: 0 };

      if (usage.round !== currentRound) {
        return true; // 新回合，可以触发
      }
      if (usage.count >= limit.perRound) {
        return false;
      }
    }

    if (limit.perCombat) {
      const usageKey = `activityUsage_${activity._id}_combat`;
      const combatId = context.combat?.id || 'default';
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { combatId: '', count: 0 };

      if (usage.combatId !== combatId) {
        return true; // 新战斗，可以触发
      }
      if (usage.count >= limit.perCombat) {
        return false;
      }
    }

    if (limit.total) {
      const usageKey = `activityUsage_${activity._id}_total`;
      const usage = actor.getFlag('shuhai-dalu', usageKey) || { count: 0 };
      if (usage.count >= limit.total) {
        return false;
      }
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
    selectedOption: null,

    /**
     * 获取目标Actor（兼容方法）
     */
    getTarget(targetType) {
      return ActivityExecutor.getTarget(targetType, this);
    },

    /**
     * 获取 BUFF
     */
    getBuff(buffId, targetType = 'self') {
      const target = this.getTarget(targetType);
      return target?.getBuff?.(buffId);
    }
  };
}
