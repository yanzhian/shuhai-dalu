/**
 * 书海大陆 TRPG 系统
 * Activity 活动服务模块
 *
 * 处理物品活动（Activity）的触发和效果应用
 */

import { getAllBuffs, findBuffById } from "../constants/buff-types.mjs";

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

  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState') || {
    costResources: [false, false, false, false, false, false],
    exResources: [false, false, false],
    activatedDice: [false, false, false, false, false, false],
    buffs: []
  };

  // 获取所有BUFF定义
  const allBuffs = getAllBuffs();

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

        // 查找BUFF定义
        const buffDef = findBuffById(buffId);
        if (!buffDef) {
          console.warn(`未找到 BUFF 定义: ${buffId}`);
          continue;
        }

        // 检查是否已存在相同id和roundTiming的BUFF
        const existingBuffIndex = combatState.buffs.findIndex(
          b => b.id === buffId && b.roundTiming === roundTiming
        );

        if (existingBuffIndex !== -1) {
          // 如果已存在，增加层数和强度
          combatState.buffs[existingBuffIndex].layers += layers;
          combatState.buffs[existingBuffIndex].strength += strength;
        } else {
          // 如果不存在，添加新BUFF
          combatState.buffs.push({
            id: buffDef.id,
            name: buffDef.name,
            type: buffDef.type,
            description: buffDef.description,
            icon: buffDef.icon,
            layers: layers,
            strength: strength !== 0 ? strength : buffDef.defaultStrength,
            roundTiming: roundTiming
          });
        }

        hasTriggered = true;
      }
    }
  }

  // 保存战斗状态
  if (hasTriggered) {
    await actor.setFlag('shuhai-dalu', 'combatState', combatState);

    // 刷新战斗区域（如果打开）
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
        app.render(false);
      }
    });
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

  // 获取所有BUFF定义
  const allBuffs = getAllBuffs();

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

    // 获取目标的战斗状态
    let combatState = actualTarget.getFlag('shuhai-dalu', 'combatState') || {
      costResources: [false, false, false, false, false, false],
      exResources: [false, false, false],
      activatedDice: [false, false, false, false, false, false],
      buffs: []
    };

    // 应用效果
    if (activity.effects && Object.keys(activity.effects).length > 0) {
      for (const [buffId, effectData] of Object.entries(activity.effects)) {
        const layers = parseInt(effectData.layers) || 0;
        const strength = parseInt(effectData.strength) || 0;

        if (layers === 0) continue;

        // 查找BUFF定义
        const buffDef = findBuffById(buffId);
        if (!buffDef) {
          console.warn(`未找到 BUFF 定义: ${buffId}`);
          continue;
        }

        // 检查是否已存在相同id和roundTiming的BUFF
        const existingBuffIndex = combatState.buffs.findIndex(
          b => b.id === buffId && b.roundTiming === roundTiming
        );

        if (existingBuffIndex !== -1) {
          // 如果已存在，增加层数和强度
          combatState.buffs[existingBuffIndex].layers += layers;
          combatState.buffs[existingBuffIndex].strength += strength;
        } else {
          // 如果不存在，添加新BUFF
          combatState.buffs.push({
            id: buffDef.id,
            name: buffDef.name,
            type: buffDef.type,
            description: buffDef.description,
            icon: buffDef.icon,
            layers: layers,
            strength: strength !== 0 ? strength : buffDef.defaultStrength,
            roundTiming: roundTiming
          });
        }

        hasTriggered = true;
      }
    }

    // 保存目标的战斗状态
    if (hasTriggered) {
      await actualTarget.setFlag('shuhai-dalu', 'combatState', combatState);

      // 刷新目标的战斗区域（如果打开）
      Object.values(ui.windows).forEach(app => {
        if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actualTarget.id) {
          app.render(false);
        }
      });
    }
  }

  return hasTriggered;
}
