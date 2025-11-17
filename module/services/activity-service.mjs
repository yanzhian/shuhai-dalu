/**
 * 书海大陆 TRPG 系统
 * Activity 活动服务模块
 *
 * 处理物品活动（Activity）的触发和效果应用
 */

import { EFFECT_TYPES } from '../helpers/effect-registry.mjs';

/**
 * 触发物品活动
 * @param {Actor} actor - 角色
 * @param {Item} item - 物品
 * @param {string} triggerType - 触发类型 (onUse, onAttack, onCounter等)
 * @returns {boolean} 是否有活动被触发
 */
export async function triggerItemActivities(actor, item, triggerType) {
  // 检查物品是否有activities
  if (!item?.system?.activities || Object.keys(item.system.activities).length === 0) {
    return false;
  }

  // 筛选出匹配的activities
  const matchingActivities = Object.values(item.system.activities).filter(
    activity => activity.trigger === triggerType
  );

  if (matchingActivities.length === 0) {
    return false;
  }

  let hasTriggered = false;

  // 执行每个activity
  for (const activity of matchingActivities) {
    // 获取回合时机
    const roundTiming = activity.roundTiming || 'current';

    // 检查目标类型
    const targetType = activity.target || 'self';

    // 目前只处理self目标
    if (targetType !== 'self') {
      continue;
    }

    // 应用效果 - 支持新旧两种格式
    if (activity.effectsList && Array.isArray(activity.effectsList) && activity.effectsList.length > 0) {
      // 新格式：effectsList 数组
      console.log('【Activity执行】执行新格式效果:', activity.effectsList);

      for (const effect of activity.effectsList) {
        const effectType = EFFECT_TYPES[effect.type];
        if (!effectType) {
          console.warn('【Activity执行】未知效果类型:', effect.type);
          continue;
        }

        // 创建执行上下文
        const context = {
          actor,
          item,
          roundTiming,
          getTarget: (targetType) => {
            if (targetType === 'self') return actor;
            return actor; // 默认返回自己
          }
        };

        try {
          // 执行效果
          const result = await effectType.execute(effect.params, context);
          if (result.success) {
            console.log('【Activity执行】效果执行成功:', effect.type, result.message);
            hasTriggered = true;
          } else {
            console.warn('【Activity执行】效果执行失败:', effect.type, result.reason);
          }
        } catch (error) {
          console.error('【Activity执行】效果执行错误:', effect.type, error);
        }
      }
    } else if (activity.effects && Object.keys(activity.effects).length > 0) {
      // 旧格式：effects 对象（向后兼容）
      console.log('【Activity执行】执行旧格式效果:', activity.effects);

      for (const [buffId, effectData] of Object.entries(activity.effects)) {
        const layers = parseInt(effectData.layers) || 0;
        const strength = parseInt(effectData.strength) || 0;

        if (layers === 0) continue;

        // 使用Actor的addBuff方法添加BUFF
        await actor.addBuff(buffId, layers, strength, roundTiming);
        hasTriggered = true;
      }
    }
  }

  return hasTriggered;
}

/**
 * 触发物品活动（支持指定目标）
 * @param {Actor} sourceActor - 触发源角色
 * @param {Item} item - 触发的物品
 * @param {string} triggerType - 触发类型
 * @param {Actor} targetActor - 目标角色（可选，如果activity的target是'selected'则必须提供）
 * @returns {boolean} - 是否有活动被触发
 */
export async function triggerItemActivitiesWithTarget(sourceActor, item, triggerType, targetActor = null) {
  // 检查物品是否有activities
  if (!item.system.activities || Object.keys(item.system.activities).length === 0) {
    return false;
  }

  // 筛选出匹配的activities
  const matchingActivities = Object.values(item.system.activities).filter(
    activity => activity.trigger === triggerType
  );

  if (matchingActivities.length === 0) {
    return false;
  }

  let hasTriggered = false;

  // 执行每个activity
  for (const activity of matchingActivities) {
    // 获取回合时机
    const roundTiming = activity.roundTiming || 'current';

    // 检查目标类型
    const targetType = activity.target || 'self';

    // 确定实际目标actor
    let actualTarget = null;
    if (targetType === 'self') {
      actualTarget = sourceActor;
    } else if (targetType === 'selected') {
      if (!targetActor) {
        console.warn(`Activity需要目标，但未提供: ${item.name}`);
        continue;
      }
      actualTarget = targetActor;
    } else {
      // 其他目标类型暂不支持
      continue;
    }

    // 应用效果 - 支持新旧两种格式
    if (activity.effectsList && Array.isArray(activity.effectsList) && activity.effectsList.length > 0) {
      // 新格式：effectsList 数组
      console.log('【Activity执行】执行新格式效果 (带目标):', activity.effectsList);

      for (const effect of activity.effectsList) {
        const effectType = EFFECT_TYPES[effect.type];
        if (!effectType) {
          console.warn('【Activity执行】未知效果类型:', effect.type);
          continue;
        }

        // 创建执行上下文
        const context = {
          actor: sourceActor,
          item,
          roundTiming,
          getTarget: (targetType) => {
            if (targetType === 'self') return sourceActor;
            if (targetType === 'selected' || targetType === 'target') return actualTarget;
            return actualTarget; // 默认返回实际目标
          }
        };

        try {
          // 执行效果
          const result = await effectType.execute(effect.params, context);
          if (result.success) {
            console.log('【Activity执行】效果执行成功:', effect.type, result.message);
            hasTriggered = true;
          } else {
            console.warn('【Activity执行】效果执行失败:', effect.type, result.reason);
          }
        } catch (error) {
          console.error('【Activity执行】效果执行错误:', effect.type, error);
        }
      }
    } else if (activity.effects && Object.keys(activity.effects).length > 0) {
      // 旧格式：effects 对象（向后兼容）
      console.log('【Activity执行】执行旧格式效果 (带目标):', activity.effects);

      for (const [buffId, effectData] of Object.entries(activity.effects)) {
        const layers = parseInt(effectData.layers) || 0;
        const strength = parseInt(effectData.strength) || 0;

        if (layers === 0) continue;

        // 使用Actor的addBuff方法添加BUFF
        await actualTarget.addBuff(buffId, layers, strength, roundTiming);
        hasTriggered = true;
      }
    }
  }

  return hasTriggered;
}
