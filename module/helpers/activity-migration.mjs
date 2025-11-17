/**
 * Activity 数据迁移工具
 *
 * 将旧的 activity 格式迁移到统一的新格式
 *
 * 版本: 2.0
 * 日期: 2025-11-17
 */

import {
  TRIGGER_TYPES,
  CONDITION_TYPES,
  TARGET_TYPES,
  ROUND_TIMING,
  EFFECT_TYPES,
  CONSUME_MODE,
  createDefaultActivity
} from '../constants/activity-schema.mjs';

/**
 * 迁移单个 Activity 从旧格式到新格式
 *
 * 旧格式（activity-editor.mjs 输出）:
 * {
 *   _id: "...",
 *   name: "...",
 *   trigger: "onUse",
 *   hasConsume: true,
 *   consumes: [{ buffId, layers, strength }],
 *   target: "selected",
 *   roundTiming: "current",
 *   effects: { "strong": { layers: 1, strength: 0 } },  // 对象格式
 *   effectsList: [{ buffId, layers, strength }],        // 编辑器内部使用
 *   customEffect: { enabled: false, name: "", layers: 0, strength: 0 }
 * }
 *
 * 新格式（activity-schema.mjs）:
 * {
 *   _id: "...",
 *   name: "...",
 *   trigger: { type: "onUse", passive: false, category: null },
 *   conditions: [],
 *   consume: { mode: "mandatory", resources: [...] },
 *   effects: [{ type: "addBuff", buffId, layers, strength, target, roundTiming }, ...]
 * }
 *
 * @param {Object} oldActivity - 旧格式的 activity
 * @returns {Object} 新格式的 activity
 */
export function migrateActivity(oldActivity) {
  console.log('【迁移】开始迁移 Activity:', oldActivity.name);

  const newActivity = createDefaultActivity();
  newActivity._id = oldActivity._id;
  newActivity.name = oldActivity.name || '';

  // 1. 迁移触发时机
  if (oldActivity.trigger) {
    if (typeof oldActivity.trigger === 'string') {
      newActivity.trigger = {
        type: oldActivity.trigger,
        passive: false,
        category: null
      };
    } else {
      newActivity.trigger = oldActivity.trigger;
    }
  }

  // 2. 迁移条件（旧格式没有条件系统，保持为空）
  newActivity.conditions = oldActivity.conditions || [];

  // 3. 迁移消耗
  if (oldActivity.hasConsume && oldActivity.consumes && oldActivity.consumes.length > 0) {
    newActivity.consume = {
      mode: CONSUME_MODE.MANDATORY,
      resources: oldActivity.consumes.map(c => ({
        type: 'buff',
        buffId: c.buffId,
        layers: c.layers || 0
      })),
      options: []
    };
  } else if (oldActivity.consume) {
    // 已经是新格式
    newActivity.consume = oldActivity.consume;
  } else {
    newActivity.consume = {
      mode: CONSUME_MODE.NONE,
      resources: [],
      options: []
    };
  }

  // 4. 迁移效果
  newActivity.effects = [];

  // 处理旧的 effects 对象格式（key-value）
  if (oldActivity.effects && typeof oldActivity.effects === 'object' && !Array.isArray(oldActivity.effects)) {
    for (const [buffId, effectData] of Object.entries(oldActivity.effects)) {
      if (buffId && effectData) {
        newActivity.effects.push({
          type: EFFECT_TYPES.ADD_BUFF,
          buffId: buffId,
          layers: effectData.layers || 0,
          strength: effectData.strength || 0,
          target: oldActivity.target || TARGET_TYPES.SELF,
          roundTiming: oldActivity.roundTiming || ROUND_TIMING.CURRENT
        });
      }
    }
  }

  // 处理新的 effects 数组格式
  if (oldActivity.effects && Array.isArray(oldActivity.effects)) {
    newActivity.effects = oldActivity.effects;
  }

  // 处理 effectsList（编辑器内部格式）
  if (oldActivity.effectsList && Array.isArray(oldActivity.effectsList)) {
    for (const effect of oldActivity.effectsList) {
      if (effect.buffId) {
        newActivity.effects.push({
          type: EFFECT_TYPES.ADD_BUFF,
          buffId: effect.buffId,
          layers: effect.layers || 0,
          strength: effect.strength || 0,
          target: oldActivity.target || TARGET_TYPES.SELF,
          roundTiming: oldActivity.roundTiming || ROUND_TIMING.CURRENT
        });
      }
    }
  }

  // 处理自定义效果
  if (oldActivity.customEffect && oldActivity.customEffect.enabled) {
    newActivity.effects.push({
      type: EFFECT_TYPES.ADD_BUFF,
      buffId: oldActivity.customEffect.name,
      layers: oldActivity.customEffect.layers || 0,
      strength: oldActivity.customEffect.strength || 0,
      target: oldActivity.target || TARGET_TYPES.SELF,
      roundTiming: oldActivity.roundTiming || ROUND_TIMING.CURRENT
    });
  }

  // 5. 迁移次数限制
  newActivity.usageLimit = oldActivity.usageLimit || null;

  console.log('【迁移】迁移完成:', newActivity.name, newActivity);
  return newActivity;
}

/**
 * 迁移 Item 的所有 activities
 *
 * @param {Item} item - 要迁移的 Item
 * @returns {Promise<Object>} 迁移后的 activities 对象
 */
export async function migrateItemActivities(item) {
  console.log('【迁移】开始迁移 Item:', item.name);

  const oldActivities = item.system.activities || {};
  const newActivities = {};

  let migrationCount = 0;
  let skipCount = 0;

  for (const [id, activity] of Object.entries(oldActivities)) {
    // 检查是否已经是新格式
    if (isNewFormat(activity)) {
      console.log('【迁移】跳过（已是新格式）:', activity.name);
      newActivities[id] = activity;
      skipCount++;
      continue;
    }

    // 迁移到新格式
    newActivities[id] = migrateActivity(activity);
    migrationCount++;
  }

  console.log(`【迁移】Item "${item.name}" 迁移完成: 迁移 ${migrationCount} 个, 跳过 ${skipCount} 个`);

  return newActivities;
}

/**
 * 检查 activity 是否已经是新格式
 *
 * @param {Object} activity - Activity 数据
 * @returns {boolean} 是否为新格式
 */
export function isNewFormat(activity) {
  // 新格式的特征：
  // 1. trigger 是对象，有 type 字段
  // 2. consume 是对象，有 mode 字段
  // 3. effects 是数组，且第一个元素有 type 字段

  if (activity.trigger && typeof activity.trigger === 'object' && activity.trigger.type) {
    return true;
  }

  if (activity.consume && activity.consume.mode) {
    return true;
  }

  if (activity.effects && Array.isArray(activity.effects) && activity.effects.length > 0) {
    if (activity.effects[0].type) {
      return true;
    }
  }

  return false;
}

/**
 * 迁移旧的 conditions 数组到新的 activities 对象
 * （用于处理更旧的数据格式）
 *
 * @param {Array} conditions - 旧的 conditions 数组
 * @returns {Object} activities 对象
 */
export function migrateConditionsToActivities(conditions) {
  console.log('【迁移】从 conditions 迁移:', conditions);

  if (!conditions || conditions.length === 0) {
    return {};
  }

  const activities = {};

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const activityId = foundry.utils.randomID();

    // 使用迁移函数
    activities[activityId] = migrateActivity({
      _id: activityId,
      name: condition.name || `条件${i + 1}`,
      trigger: condition.trigger || 'onUse',
      hasConsume: condition.hasConsume || false,
      consumes: condition.consumes || [],
      target: condition.target || 'self',
      effects: condition.effects || {},
      customEffect: condition.customEffect || { enabled: false }
    });
  }

  console.log('【迁移】从 conditions 迁移完成:', Object.keys(activities).length, '个 activities');
  return activities;
}

/**
 * 批量迁移所有 Items
 *
 * @param {Array<Item>} items - 要迁移的 Items 数组
 * @returns {Promise<Object>} 迁移统计信息
 */
export async function migrateAllItems(items) {
  console.log('【迁移】开始批量迁移, 共', items.length, '个 Items');

  const stats = {
    total: items.length,
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  for (const item of items) {
    try {
      const oldActivities = item.system.activities || {};
      const activityCount = Object.keys(oldActivities).length;

      if (activityCount === 0) {
        // 检查是否有旧的 conditions
        if (item.system.conditions && item.system.conditions.length > 0) {
          const newActivities = migrateConditionsToActivities(item.system.conditions);
          await item.update({
            'system.activities': newActivities,
            'system.conditions': []
          });
          stats.migrated++;
          console.log(`【迁移】从 conditions 迁移: ${item.name}`);
        } else {
          stats.skipped++;
        }
        continue;
      }

      // 检查是否需要迁移
      const firstActivity = Object.values(oldActivities)[0];
      if (isNewFormat(firstActivity)) {
        stats.skipped++;
        continue;
      }

      // 迁移
      const newActivities = await migrateItemActivities(item);
      await item.update({
        'system.activities': newActivities
      });

      stats.migrated++;
      console.log(`【迁移】已迁移: ${item.name}`);

    } catch (error) {
      console.error(`【迁移】迁移失败: ${item.name}`, error);
      stats.errors++;
    }
  }

  console.log('【迁移】批量迁移完成:', stats);
  return stats;
}

/**
 * 迁移当前世界中所有 Actor 的 Items
 *
 * @returns {Promise<Object>} 迁移统计信息
 */
export async function migrateWorldItems() {
  console.log('【迁移】开始迁移世界中所有 Actor 的 Items...');

  const allItems = [];

  // 收集所有 Actor 的 Items
  for (const actor of game.actors) {
    for (const item of actor.items) {
      allItems.push(item);
    }
  }

  // 收集世界 Items
  for (const item of game.items) {
    allItems.push(item);
  }

  console.log(`【迁移】找到 ${allItems.length} 个 Items`);

  return await migrateAllItems(allItems);
}
