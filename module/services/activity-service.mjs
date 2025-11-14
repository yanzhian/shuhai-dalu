/**
 * 书海大陆 TRPG 系统
 * Activity 活动服务模块
 *
 * 处理物品活动（Activity）的触发和效果应用
 */

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

    // 应用效果
    if (activity.effects && Object.keys(activity.effects).length > 0) {
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

    // 应用效果
    if (activity.effects && Object.keys(activity.effects).length > 0) {
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
