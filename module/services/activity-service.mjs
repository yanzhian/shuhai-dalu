/**
 * 书海大陆 TRPG 系统
 * Activity 活动服务模块 v2.0
 *
 * 这个文件作为兼容层，保留旧的函数签名但调用新的 ActivityExecutor
 * 渐进式迁移：支持新旧调用方式共存
 */
import { ActivityExecutor, createContext } from '../helpers/activity-executor.mjs';
import { migrateActivity, isNewFormat } from '../helpers/activity-migration.mjs';
import { TRIGGER_LABELS } from '../constants/activity-schema.mjs';

/**
 * 触发物品活动（简化版，兼容旧接口）
 * @param {Actor} actor - 角色
 * @param {Item} item - 物品
 * @param {string} triggerType - 触发类型 (onUse, onAttack, onCounter等)
 * @returns {boolean} 是否有活动被触发
 */
export async function triggerItemActivities(actor, item, triggerType) {
  return await triggerItemActivitiesWithTarget(actor, item, triggerType, null);
}

/**
 * 触发物品活动（支持指定目标，兼容旧接口）
 * @param {Actor} sourceActor - 触发源角色
 * @param {Item} item - 触发的物品
 * @param {string} triggerType - 触发类型
 * @param {Actor} targetActor - 目标角色（可选）
 * @returns {boolean} - 是否有活动被触发
 */
export async function triggerItemActivitiesWithTarget(sourceActor, item, triggerType, targetActor = null) {
  // 检查物品是否有activities
  if (!item?.system?.activities || Object.keys(item.system.activities).length === 0) {
    return false;
  }

  console.log('【Activity服务】触发物品活动:', {
    item: item.name,
    triggerType,
    actorName: sourceActor.name,
    targetName: targetActor?.name
  });

  // 获取所有 activities
  const activities = item.system.activities;
  let hasTriggered = false;

  // 创建上下文
  const context = createContext(
    sourceActor,
    targetActor,
    item,
    null,  // dice（如果有的话会在调用时传入）
    game.combat
  );
  context.triggerType = triggerType;

  // 执行每个 activity
  for (const [id, activity] of Object.entries(activities)) {
    try {
      // 自动迁移旧格式（如果需要）
      let activityToExecute = activity;
      if (!isNewFormat(activity)) {
        console.log('【Activity服务】发现旧格式，自动迁移:', activity.name);
        activityToExecute = migrateActivity(activity);
      }

      // 使用新的 ActivityExecutor 执行
      const result = await ActivityExecutor.execute(activityToExecute, context);

      if (result.success) {
        console.log('【Activity服务】活动执行成功:', activity.name, result);
        hasTriggered = true;

        // 发送聊天消息（可选）
        await sendActivityMessage(sourceActor, targetActor, activity, result);
      } else {
        console.log('【Activity服务】活动执行失败:', activity.name, result.reason);
      }
    } catch (error) {
      console.error('【Activity服务】活动执行异常:', activity.name, error);
    }
  }

  return hasTriggered;
}

/**
 * 发送 Activity 执行结果到聊天
 */
async function sendActivityMessage(sourceActor, targetActor, activity, result) {
  // 构建效果描述
  const effects = [];
  if (result.effectResults) {
    for (const { effect, result: effectResult, success } of result.effectResults) {
      if (success) {
        effects.push(formatEffectResult(effect, effectResult, targetActor));
      }
    }
  }

  if (effects.length === 0) {
    return; // 没有效果，不发送消息
  }

  // 获取触发类型标签
  const triggerType = typeof activity.trigger === 'string'
    ? activity.trigger
    : activity.trigger?.type;
  const triggerLabel = TRIGGER_LABELS[triggerType] || triggerType;

  // 构建描述信息
  let descriptionHtml = '';
  if (activity.description) {
    descriptionHtml = `
      <div style="margin: 12px 0; padding: 10px; background: rgba(127, 176, 62, 0.1); border-left: 3px solid #7fb03e; border-radius: 4px;">
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">
          <i class="fas fa-info-circle"></i> 说明：
        </div>
        <div style="font-size: 13px; color: #d4d4d4; line-height: 1.6;">
          ${activity.description}
        </div>
      </div>
    `;
  }

  // 构建消耗信息
  let consumeHtml = '';
  if (activity.consume && activity.consume.mode !== 'none' && activity.consume.resources?.length > 0) {
    const consumeItems = activity.consume.resources.map(res => {
      if (res.type === 'buff') {
        const buffName = game.shuhai?.buffHelpers?.getBuffName?.(res.buffId) || res.buffId;
        return `${res.layers || 1} 层【${buffName}】`;
      } else if (res.type === 'resource') {
        return `${res.count || 1} 个 ${res.resourceType === 'cost' ? 'Cost' : 'EX'}`;
      }
      return '';
    }).filter(Boolean).join('、');

    if (consumeItems) {
      consumeHtml = `
        <div style="margin: 12px 0; font-size: 13px; color: #ff9966;">
          <i class="fas fa-burn"></i> 消耗：${consumeItems}
        </div>
      `;
    }
  }

  // 构建消息内容
  const content = `
    <div style="border: 2px solid #7fb03e; border-radius: 8px; padding: 16px; background: linear-gradient(135deg, #0F0D1B 0%, #1a1825 100%); font-family: 'Noto Sans SC', sans-serif; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">

      <!-- 标题栏 -->
      <div style="border-bottom: 2px solid #7fb03e; padding-bottom: 12px; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #7fb03e; font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-scroll" style="color: #EBBD68;"></i>
          ${activity.name}
        </h3>
        <div style="margin-top: 6px; font-size: 13px; color: #888; display: flex; gap: 12px;">
          <span><i class="fas fa-user" style="color: #7fb03e;"></i> ${sourceActor.name}</span>
          <span><i class="fas fa-bolt" style="color: #EBBD68;"></i> ${triggerLabel}</span>
        </div>
      </div>

      ${descriptionHtml}
      ${consumeHtml}

      <!-- 效果列表 -->
      <div style="margin: 12px 0;">
        <div style="font-size: 14px; font-weight: bold; color: #EBBD68; margin-bottom: 8px;">
          <i class="fas fa-magic"></i> 效果：
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #d4d4d4; line-height: 1.8;">
          ${effects.map(e => `<li style="margin: 4px 0;">${e}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    content,
    flavor: `【${activity.name}】触发`
  });
}

/**
 * 格式化效果结果为可读文本
 */
function formatEffectResult(effect, result, targetActor) {
  // 导入 getBuffName 函数
  const { getBuffName } = game.shuhai?.buffHelpers || {};

  const targetName = targetActor?.name || '自己';

  switch (effect.type) {
    case 'addBuff': {
      // 优先使用 getBuffName 获取中文名称
      const displayName = getBuffName ? getBuffName(result.buffId) : result.buffId;
      return `为${targetName}添加 ${result.layers} 层【${displayName}】`;
    }

    case 'consumeBuff': {
      // 优先使用 getBuffName 获取中文名称
      const displayName = getBuffName ? getBuffName(result.buffId) : result.buffId;
      return `消耗${targetName}的 ${result.layers} 层【${displayName}】`;
    }

    case 'heal':
      return `为${targetName}恢复 ${result.amount} 点生命值`;

    case 'dealDamage':
      return `对${targetName}造成 ${result.damage} 点伤害`;

    case 'modifyDice':
      return `骰子修正 ${result.modifier > 0 ? '+' : ''}${result.modifier}`;

    case 'restoreResource':
      return `为${targetName}恢复 ${result.restored} 个 ${result.resourceType}`;

    case 'deductResource':
      return `扣除${targetName}的 ${result.deducted} 个 ${result.resourceType}`;

    case 'customBuff':
      return `为${targetName}添加 ${result.layers} 层【${result.name}】`;

    default:
      return `效果：${effect.type}`;
  }
}

/**
 * 执行角色的所有 Activities（新接口）
 * @param {Actor} actor - 角色
 * @param {string} triggerType - 触发类型
 * @param {Object} options - 选项
 * @param {Actor} options.target - 目标角色
 * @param {Item} options.item - 触发的物品（如果是单个物品触发）
 * @param {Object} options.dice - 骰子数据
 * @param {string} options.attackCategory - 攻击类别（slash/pierce/blunt）
 * @returns {Promise<Array>} 执行结果数组
 */
export async function executeActorActivities(actor, triggerType, options = {}) {
  console.log('【Activity服务】执行角色活动:', {
    actor: actor.name,
    triggerType,
    options
  });

  // 收集所有装备的 Items 的 Activities
  const allActivities = [];

  for (const item of actor.items) {
    // 只检查装备的 Items
    if (!item.system.equipped) continue;

    // 如果指定了 item，只处理这个 item
    if (options.item && item.id !== options.item.id) continue;

    const activities = item.system.activities || {};
    for (const [id, activity] of Object.entries(activities)) {
      allActivities.push({ item, activity });
    }
  }

  if (allActivities.length === 0) {
    return [];
  }

  // 创建上下文
  const context = createContext(
    actor,
    options.target || null,
    options.item || null,
    options.dice || null,
    game.combat
  );
  context.triggerType = triggerType;
  context.attackCategory = options.attackCategory;

  // 执行匹配的 Activities
  const results = [];
  for (const { item, activity } of allActivities) {
    try {
      // 更新上下文中的 item
      context.item = item;

      // 自动迁移旧格式（如果需要）
      let activityToExecute = activity;
      if (!isNewFormat(activity)) {
        console.log('【Activity服务】发现旧格式，自动迁移:', activity.name);
        activityToExecute = migrateActivity(activity);
      }

      // 执行 Activity
      const result = await ActivityExecutor.execute(activityToExecute, context);

      if (result.success) {
        console.log('【Activity服务】活动执行成功:', activity.name);
        results.push({ item, activity, result });

        // 发送聊天消息
        await sendActivityMessage(actor, options.target, activity, result);
      } else {
        console.log('【Activity服务】活动执行失败:', activity.name, result.reason);
      }
    } catch (error) {
      console.error('【Activity服务】活动执行异常:', activity.name, error);
    }
  }

  console.log('【Activity服务】执行完成，触发了', results.length, '个 Activities');
  return results;
}
