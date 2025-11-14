/**
 * 书海大陆 TRPG 系统
 * 主入口文件
 */

import CharacterData from "./data/CharacterData.mjs";
import ShuhaiActor from "./documents/actor.mjs";
import ShuhaiItem, {
  CombatDiceData,
  DefenseDiceData,
  TriggerDiceData,
  PassiveDiceData,
  WeaponData,
  ArmorData,
  ItemData,
  EquipmentData
} from "./documents/item.mjs";
import ShuhaiActorSheet from "./sheets/actor-sheet.mjs";
import ShuhaiPlayerSheet from "./sheets/player-sheet.mjs";
import ShuhaiItemSheet from "./sheets/item-sheet.mjs";
import ItemCardSheet from "./sheets/item-card-sheet.mjs";

// 导入常量
import { BUFF_TYPES } from "./constants/buff-types.mjs";

// 导入服务模块
import {
  advanceActorRound,
  triggerBleedEffect,
  triggerRuptureEffect,
  triggerCorruptionEffect,
  triggerBreathEffect,
  triggerTremorExplode
} from "./services/combat-effects.mjs";

import {
  triggerItemActivities,
  triggerItemActivitiesWithTarget
} from "./services/activity-service.mjs";

// 重新导出服务函数，供外部模块使用
export {
  advanceActorRound,
  triggerBleedEffect,
  triggerRuptureEffect,
  triggerCorruptionEffect,
  triggerBreathEffect,
  triggerTremorExplode,
  triggerItemActivities,
  triggerItemActivitiesWithTarget
};

/* -------------------------------------------- */
/*  初始化钩子                                    */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('书海大陆 | 初始化系统');

  // 定义自定义系统类
  game.shuhai = {
    ShuhaiActor,
    ShuhaiItem,
    rollAttributeCheck,
    rollSkillCheck,
    rollCorruptionCheck,
    equipItem,
    unequipItem
  };

  // 配置文档类
  CONFIG.Actor.documentClass = ShuhaiActor;
  CONFIG.Item.documentClass = ShuhaiItem;

  // 注册战斗HUD的游戏设置
  game.settings.register('shuhai-dalu', 'battleActors', {
    name: '参战角色列表',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('shuhai-dalu', 'battleHudState', {
    name: '战斗HUD状态',
    scope: 'client',
    config: false,
    type: Object,
    default: {
      position: { left: 100, top: 100 },
      scale: 1.0,
      minimized: false
    }
  });

  // 注册敌人HUD的游戏设置
  game.settings.register('shuhai-dalu', 'enemyBattleActors', {
    name: '敌人参战角色列表',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('shuhai-dalu', 'enemyBattleHudState', {
    name: '敌人战斗HUD状态',
    scope: 'client',
    config: false,
    type: Object,
    default: {
      position: { left: 550, top: 100 },
      scale: 1.0,
      minimized: false
    }
  });

  // 注册 Actor 数据模型
  CONFIG.Actor.dataModels = CONFIG.Actor.dataModels || {};
  CONFIG.Actor.dataModels.character = CharacterData;
  
  // 注册 Item 数据模型
  CONFIG.Item.dataModels = CONFIG.Item.dataModels || {};
  CONFIG.Item.dataModels.combatDice = CombatDiceData;
  CONFIG.Item.dataModels.shootDice = CombatDiceData;
  CONFIG.Item.dataModels.defenseDice = DefenseDiceData;
  CONFIG.Item.dataModels.triggerDice = TriggerDiceData;
  CONFIG.Item.dataModels.passiveDice = PassiveDiceData;
  CONFIG.Item.dataModels.weapon = WeaponData;
  CONFIG.Item.dataModels.armor = ArmorData;
  CONFIG.Item.dataModels.item = ItemData;
  CONFIG.Item.dataModels.equipment = EquipmentData;
  
  console.log('书海大陆 | 数据模型已注册');
  console.log('Actor 数据模型:', CONFIG.Actor.dataModels);
  console.log('Item 数据模型:', CONFIG.Item.dataModels);
  
  // 注册角色表单（不取消核心表单，保留其他类型如Scene的表单）
  // ⭐ 注册 Player 角色表单（设为默认）
  Actors.registerSheet("shuhai-dalu", ShuhaiPlayerSheet, {
    types: ["character"],
    makeDefault: true,
    label: "书海大陆 - Player 角色卡"
  });

  // 注册标准角色表单
  Actors.registerSheet("shuhai-dalu", ShuhaiActorSheet, {
    types: ["character"],
    makeDefault: false,
    label: "书海大陆 - 标准角色卡"
  });

  // 注册物品表单（不取消核心表单，保留其他类型的表单）
  // 新物品卡表单（默认）- 适用于所有9种物品类型
  Items.registerSheet("shuhai-dalu", ItemCardSheet, {
    types: ["combatDice", "shootDice", "defenseDice", "triggerDice", "passiveDice", "weapon", "armor", "item", "equipment"],
    makeDefault: true,
    label: "书海大陆 - 物品卡"
  });

  // 旧版标准物品表单（备用）
  Items.registerSheet("shuhai-dalu", ShuhaiItemSheet, {
    types: ["combatDice", "shootDice", "defenseDice", "triggerDice", "passiveDice", "weapon", "armor", "item", "equipment"],
    makeDefault: false,
    label: "书海大陆 - 标准物品卡（旧版）"
  });
  
  console.log('书海大陆 | 表单已注册');
  
  // 预加载 Handlebars 模板
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  就绪钩子                                      */
/* -------------------------------------------- */

Hooks.once('ready', async function() {
  console.log('书海大陆 | 系统已就绪');

  // 等待字体加载
  await waitForFonts();

  // 迁移所有角色的prototypeToken为链接状态
  await migrateActorTokenLinks();

  // 注册键盘事件监听
  setupKeyboardListeners();

  // 显示欢迎消息
  ui.notifications.info("书海大陆系统已加载！");
});

/* -------------------------------------------- */
/*  Token双击打开角色卡                           */
/* -------------------------------------------- */

/**
 * 覆盖Token的双击行为
 * 双击Token时打开原始Actor的角色卡（没有指示物），而不是Token Actor的角色卡
 */
Hooks.once('ready', () => {
  // 保存原始的双击方法
  const originalOnClickLeft2 = Token.prototype._onClickLeft2;

  // 覆盖双击方法
  Token.prototype._onClickLeft2 = function(event) {
    // 获取Token关联的原始Actor
    const baseActor = game.actors.get(this.document.actorId);

    if (baseActor) {
      // 打开原始Actor的角色卡（没有指示物的界面）
      baseActor.sheet.render(true);
    } else {
      // 如果找不到原始Actor，使用默认行为
      originalOnClickLeft2.call(this, event);
    }
  };

  console.log('书海大陆 | Token双击行为已覆盖');
});

/* -------------------------------------------- */
/*  Actor创建钩子 - 初始化新角色HP和原型Token      */
/* -------------------------------------------- */

Hooks.on('preCreateActor', (actor, data, options, userId) => {
  // 只处理角色类型
  if (actor.type !== 'character') return;

  // 计算初始最大HP（需要先有属性值）
  const con = data.system?.attributes?.constitution || 10;
  const str = data.system?.attributes?.strength || 10;
  const lvl = data.system?.level || 1;
  const maxHp = con * 3 + str + lvl * 3;

  // 设置初始HP为最大值，并设置原型Token为链接状态
  actor.updateSource({
    'system.derived.hp.value': maxHp,
    'system.derived.hp.max': maxHp,
    'prototypeToken.actorLink': true  // 设置原型Token为链接状态
  });

  console.log(`书海大陆 | 新角色初始化: HP=${maxHp}/${maxHp}, Token链接=true`);
});

/* -------------------------------------------- */
/*  聊天消息钩子                                  */
/* -------------------------------------------- */

/**
 * 获取当前玩家的角色
 * 优先级：配置的角色 > 选中的Token的原始Actor > 让用户选择
 * 注意：总是返回原始Actor，而不是Token Actor，确保数据持久化
 */
async function getCurrentActor() {
  // 1. 尝试获取配置的角色
  if (game.user.character) {
    return game.user.character;
  }

  // 2. 尝试获取当前选中的Token对应的原始角色
  const controlled = canvas.tokens?.controlled;
  if (controlled && controlled.length > 0) {
    const tokenActor = controlled[0].actor;
    // 如果是Token Actor（有 token 属性且不是链接的），获取原始Actor
    if (tokenActor.isToken && !tokenActor.token?.actorLink) {
      const baseActor = game.actors.get(tokenActor.token.actorId);
      if (baseActor) {
        return baseActor;
      }
    }
    // 否则直接返回actor（可能是链接token或直接的actor）
    return tokenActor;
  }

  // 3. 获取用户拥有的所有角色
  const ownedActors = game.actors.filter(a => a.testUserPermission(game.user, "OWNER"));

  if (ownedActors.length === 0) {
    ui.notifications.error("你没有可用的角色！");
    return null;
  }

  // 如果只有一个角色，直接使用
  if (ownedActors.length === 1) {
    return ownedActors[0];
  }

  // 4. 让用户选择角色
  return new Promise((resolve) => {
    const options = ownedActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    new Dialog({
      title: "选择角色",
      content: `
        <form>
          <div class="form-group">
            <label>选择你的角色:</label>
            <select id="actor-select" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">
              ${options}
            </select>
          </div>
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #95a5a6;">
            <strong>提示：</strong>你可以在用户配置中设置默认角色，避免每次选择。
          </p>
        </form>
      `,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "确定",
          callback: (html) => {
            const actorId = html.find('#actor-select').val();
            resolve(game.actors.get(actorId));
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消",
          callback: () => resolve(null)
        }
      },
      default: "select"
    }).render(true);
  });
}

/**
 * 独立的activity触发函数 - 不依赖CombatAreaApplication
 * @param {Actor} actor - 角色
 * @param {Item} item - 物品
 * @param {string} triggerType - 触发类型 (onUse, onAttack, onCounter等)
 * @returns {boolean} 是否有活动被触发
 */
export async function triggerItemActivities(actor, item, triggerType) {
  // 检查物品是否有activities
  if (!item.system.activities) {
    return false;
  }

  // 兼容数组和对象两种格式
  const activitiesArray = Array.isArray(item.system.activities)
    ? item.system.activities
    : Object.values(item.system.activities);

  if (activitiesArray.length === 0) {
    return false;
  }

  // 筛选出匹配的activities
  const matchingActivities = activitiesArray.filter(
    activity => activity && activity.trigger === triggerType
  );

  if (matchingActivities.length === 0) {
    return false;
  }

  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState') || {
    costResources: [false, false, false, false, false, false],
    exResources: [true, true, true],  // 默认3个EX资源都可用
    activatedDice: [false, false, false, false, false, false],
    buffs: []
  };

  // 获取所有BUFF定义
  const allBuffs = [
    ...BUFF_TYPES.positive,
    ...BUFF_TYPES.negative,
    ...BUFF_TYPES.effect
  ];

  let hasTriggered = false;

  // 执行每个activity
  for (const activity of matchingActivities) {
    // 检测新格式（使用 ActivityExecutor）还是旧格式
    const isNewFormat = activity.effects && Array.isArray(activity.effects);

    if (isNewFormat) {
      // 新格式：使用 ActivityExecutor
      try {
        const { ActivityExecutor } = await import('./helpers/activity-executor.mjs');
        const { createContext } = await import('./helpers/activity-executor.mjs');

        const context = createContext(actor, actor, item, null, game.combat);
        const result = await ActivityExecutor.execute(activity, context);

        if (result.success) {
          hasTriggered = true;
          console.log('【Activity触发】执行成功:', result);
        } else {
          console.warn('【Activity触发】执行失败:', result.reason);
        }
      } catch (error) {
        console.error('【Activity触发】执行异常:', error);
      }
    } else {
      // 旧格式：使用原有的 BUFF 处理逻辑
      const roundTiming = activity.roundTiming || 'current';
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
          const buffDef = allBuffs.find(b => b.id === buffId);
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
  const allBuffs = [
    ...BUFF_TYPES.positive,
    ...BUFF_TYPES.negative,
    ...BUFF_TYPES.effect
  ];

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
        const buffDef = allBuffs.find(b => b.id === buffId);
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

/**
 * 独立的回合结束处理函数 - 不依赖CombatAreaApplication
 * @param {Actor} actor - 角色
 */
export async function advanceActorRound(actor) {
  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs || combatState.buffs.length === 0) {
    return;
  }

  // 定义"一回合内"的BUFF ID（轮次切换时清除）
  const oneRoundBuffIds = ['strong', 'weak', 'guard', 'vulnerable', 'swift', 'bound', 'endure', 'flaw'];

  // 定义"每轮结束时层数减少"的BUFF ID（不合并本回合和下回合）
  const roundEndBuffIds = ['burn', 'breath', 'charge', 'chant'];

  // 第一步：分类BUFF
  const currentBuffs = [];  // 本回合的BUFF
  const nextBuffs = [];     // 下回合的BUFF

  for (const buff of combatState.buffs) {
    const timing = buff.roundTiming || 'current';

    if (timing === 'current') {
      // 删除"一回合内"的BUFF
      if (oneRoundBuffIds.includes(buff.id)) {
        continue;
      }
      // 保留其他BUFF（效果型BUFF）
      currentBuffs.push(buff);
    } else if (timing === 'next' || timing === 'both') {
      nextBuffs.push(buff);
    }
  }

  // 第二步：处理本回合的"每轮结束时层数减少"的BUFF
  const roundEndMessages = [];

  for (const buff of currentBuffs) {
    if (roundEndBuffIds.includes(buff.id)) {
      // 特殊处理【燃烧】：层数减少前先触发伤害
      if (buff.id === 'burn' && buff.layers > 0) {
        const damage = buff.strength;
        const newHp = Math.max(0, actor.system.derived.hp.value - damage);
        await actor.update({ 'system.derived.hp.value': newHp });
        roundEndMessages.push(`【燃烧】造成 ${damage} 点伤害`);
      }

      // 层数减少1层
      buff.layers -= 1;

      if (buff.layers > 0) {
        roundEndMessages.push(`${buff.name} 层数减少1层（剩余${buff.layers}层）`);
      }
    }
  }

  // 第三步：删除层数为0或以下的本回合BUFF
  const survivedCurrentBuffs = currentBuffs.filter(buff => {
    if (buff.layers <= 0) {
      roundEndMessages.push(`${buff.name} 已消失`);
      return false;
    }
    return true;
  });

  // 第四步：合并BUFF（每轮结束减层的BUFF不合并）
  const mergedBuffs = [];
  const processedIds = new Set();

  // 先处理本回合保留的BUFF
  for (const currentBuff of survivedCurrentBuffs) {
    const key = currentBuff.id === 'custom'
      ? `custom_${currentBuff.name}`
      : currentBuff.id;

    // 如果是每轮结束减层的BUFF，不合并，直接保留
    if (roundEndBuffIds.includes(currentBuff.id)) {
      mergedBuffs.push({
        ...currentBuff,
        roundTiming: 'current'
      });
      processedIds.add(key);
      continue;
    }

    // 查找是否有同id的下回合BUFF
    const nextBuff = nextBuffs.find(b => {
      if (b.id === 'custom') {
        return b.id === currentBuff.id && b.name === currentBuff.name;
      }
      return b.id === currentBuff.id;
    });

    if (nextBuff) {
      // 找到匹配的下回合BUFF，合并它们（只合并非每轮减层的BUFF）
      const mergedLayers = currentBuff.layers + nextBuff.layers;
      const mergedStrength = currentBuff.strength + nextBuff.strength;
      mergedBuffs.push({
        ...currentBuff,
        layers: mergedLayers,
        strength: mergedStrength,
        roundTiming: 'current'
      });
      processedIds.add(key);
    } else {
      // 没有匹配的下回合BUFF，直接保留
      mergedBuffs.push({
        ...currentBuff,
        roundTiming: 'current'
      });
      processedIds.add(key);
    }
  }

  // 第五步：处理未匹配的下回合BUFF（直接转为本回合）
  for (const nextBuff of nextBuffs) {
    const key = nextBuff.id === 'custom'
      ? `custom_${nextBuff.name}`
      : nextBuff.id;

    if (!processedIds.has(key)) {
      // 这个下回合BUFF没有本回合版本，直接转换
      mergedBuffs.push({
        ...nextBuff,
        roundTiming: 'current'
      });
    }
  }

  // 更新BUFF列表
  combatState.buffs = mergedBuffs;

  // 保存战斗状态
  await actor.setFlag('shuhai-dalu', 'combatState', combatState);

  // 刷新战斗区域（如果打开）
  Object.values(ui.windows).forEach(app => {
    if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
      app.render(false);
    }
  });

  // 发送轮次结束效果消息
  if (roundEndMessages.length > 0) {
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `
        <div style="border: 2px solid #8b4513; border-radius: 4px; padding: 12px; background: #0F0D1B;">
          <h3 style="margin: 0 0 8px 0; color: #cd853f;">【轮次结束效果 - ${actor.name}】</h3>
          <ul style="margin: 8px 0; padding-left: 20px; color: #EBBD68;">
            ${roundEndMessages.map(msg => `<li>${msg}</li>`).join('')}
          </ul>
        </div>
      `
    };
    await ChatMessage.create(chatData);
  }

  ui.notifications.info(`${actor.name}：轮次切换完成`);
}

/**
 * 处理【流血】效果 - 在攻击时触发
 * @param {Actor} actor - 角色
 * @returns {Object} { triggered: boolean, damage: number, message: string }
 */
export async function triggerBleedEffect(actor) {
  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs) {
    return { triggered: false, damage: 0, message: '' };
  }

  // 查找【流血】BUFF（只考虑本回合的）
  const bleedIndex = combatState.buffs.findIndex(
    buff => buff.id === 'bleed' && (buff.roundTiming === 'current' || !buff.roundTiming)
  );

  if (bleedIndex === -1) {
    return { triggered: false, damage: 0, message: '' };
  }

  const bleedBuff = combatState.buffs[bleedIndex];
  const damage = bleedBuff.strength;

  // 扣除HP
  const hpBefore = actor.system.derived.hp.value;
  const newHp = Math.max(0, hpBefore - damage);
  await actor.update({ 'system.derived.hp.value': newHp });

  // 层数减少1层
  bleedBuff.layers -= 1;

  let message = `【流血】触发：受到 ${damage} 点固定伤害`;

  // 如果层数降到0或以下，删除BUFF
  if (bleedBuff.layers <= 0) {
    combatState.buffs.splice(bleedIndex, 1);
    message += `，【流血】已消失`;
  } else {
    message += `，【流血】层数减少1层（剩余${bleedBuff.layers}层）`;
  }

  // 保存战斗状态
  await actor.setFlag('shuhai-dalu', 'combatState', combatState);

  // 刷新战斗区域（如果打开）
  Object.values(ui.windows).forEach(app => {
    if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
      app.render(false);
    }
  });

  return { triggered: true, damage: damage, message: message };
}

/**
 * 处理【破裂】效果 - 在受到伤害时触发
 * @param {Actor} actor - 受伤角色
 * @returns {Object} { triggered: boolean, damage: number, message: string }
 */
export async function triggerRuptureEffect(actor) {
  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs) {
    return { triggered: false, damage: 0, message: '' };
  }

  // 查找【破裂】BUFF（只考虑本回合的）
  const ruptureIndex = combatState.buffs.findIndex(
    buff => buff.id === 'rupture' && (buff.roundTiming === 'current' || !buff.roundTiming)
  );

  if (ruptureIndex === -1) {
    return { triggered: false, damage: 0, message: '' };
  }

  const ruptureBuff = combatState.buffs[ruptureIndex];
  const damage = ruptureBuff.strength;

  // 扣除HP
  const hpBefore = actor.system.derived.hp.value;
  const newHp = Math.max(0, hpBefore - damage);
  await actor.update({ 'system.derived.hp.value': newHp });

  // 层数减少1层
  ruptureBuff.layers -= 1;

  let message = `【破裂】触发：受到 ${damage} 点固定伤害`;

  // 如果层数降到0或以下，删除BUFF
  if (ruptureBuff.layers <= 0) {
    combatState.buffs.splice(ruptureIndex, 1);
    message += `，【破裂】已消失`;
  } else {
    message += `，【破裂】层数减少1层（剩余${ruptureBuff.layers}层）`;
  }

  // 保存战斗状态
  await actor.setFlag('shuhai-dalu', 'combatState', combatState);

  // 刷新战斗区域（如果打开）
  Object.values(ui.windows).forEach(app => {
    if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
      app.render(false);
    }
  });

  return { triggered: true, damage: damage, message: message };
}

/**
 * 处理【沉沦】效果 - 在受到伤害时触发
 * @param {Actor} actor - 受伤角色
 * @returns {Object} { triggered: boolean, corruption: number, message: string }
 */
export async function triggerCorruptionEffect(actor) {
  // 获取战斗状态
  let combatState = actor.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs) {
    return { triggered: false, corruption: 0, message: '' };
  }

  // 查找【沉沦】BUFF（只考虑本回合的）
  const corruptionIndex = combatState.buffs.findIndex(
    buff => buff.id === 'corruption_effect' && (buff.roundTiming === 'current' || !buff.roundTiming)
  );

  if (corruptionIndex === -1) {
    return { triggered: false, corruption: 0, message: '' };
  }

  const corruptionBuff = combatState.buffs[corruptionIndex];
  const corruptionValue = corruptionBuff.strength;

  // 增加侵蚀度
  const corruptionBefore = actor.system.derived.corruption.value;
  const newCorruption = Math.min(actor.system.derived.corruption.max, corruptionBefore + corruptionValue);
  await actor.update({ 'system.derived.corruption.value': newCorruption });

  // 层数减少1层
  corruptionBuff.layers -= 1;

  let message = `【沉沦】触发：增加 ${corruptionValue} 点侵蚀度`;

  // 如果层数降到0或以下，删除BUFF
  if (corruptionBuff.layers <= 0) {
    combatState.buffs.splice(corruptionIndex, 1);
    message += `，【沉沦】已消失`;
  } else {
    message += `，【沉沦】层数减少1层（剩余${corruptionBuff.layers}层）`;
  }

  // 保存战斗状态
  await actor.setFlag('shuhai-dalu', 'combatState', combatState);

  // 刷新战斗区域（如果打开）
  Object.values(ui.windows).forEach(app => {
    if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
      app.render(false);
    }
  });

  return { triggered: true, corruption: corruptionValue, message: message };
}

/**
 * 处理【呼吸】效果 - 在攻击命中时检查重击/暴击
 * @param {Actor} attacker - 攻击者
 * @param {number} diceRoll - 骰子点数
 * @param {number} baseDamage - 基础伤害
 * @returns {Object} { multiplier: number, finalDamage: number, message: string, triggered: boolean }
 */
export async function triggerBreathEffect(attacker, diceRoll, baseDamage) {
  // 获取战斗状态
  let combatState = attacker.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs) {
    return { multiplier: 1, finalDamage: baseDamage, message: '', triggered: false };
  }

  // 查找【呼吸】BUFF（只考虑本回合的）
  const breathIndex = combatState.buffs.findIndex(
    buff => buff.id === 'breath' && (buff.roundTiming === 'current' || !buff.roundTiming)
  );

  if (breathIndex === -1) {
    return { multiplier: 1, finalDamage: baseDamage, message: '', triggered: false };
  }

  const breathBuff = combatState.buffs[breathIndex];
  const breathStrength = breathBuff.strength;

  // 【呼吸】用于判定暴击/重击：骰数 + 呼吸强度
  const criticalJudgement = diceRoll + breathStrength;

  let multiplier = 1;
  let critType = '';

  // 检查重击和暴击（基于判定值）
  if (criticalJudgement > 20) {
    multiplier = 2;
    critType = '暴击';
  } else if (criticalJudgement > 15) {
    multiplier = 1.5;
    critType = '重击';
  }

  // 最终伤害 = 基础伤害（骰数）× 倍率
  const finalDamage = Math.floor(baseDamage * multiplier);

  let message = '';

  if (critType) {
    // 触发了重击或暴击
    message = `【呼吸】触发：${diceRoll}（骰数）+ ${breathStrength}（呼吸）= ${criticalJudgement} ≥ ${critType === '暴击' ? '20' : '15'}，${critType}！伤害 ${baseDamage} x${multiplier} = ${finalDamage}`;

    // 触发重击或暴击时，层数减少1层
    breathBuff.layers -= 1;

    if (breathBuff.layers <= 0) {
      combatState.buffs.splice(breathIndex, 1);
      message += `，【呼吸】已消失`;
    } else {
      message += `，【呼吸】层数减少1层（剩余${breathBuff.layers}层）`;
    }

    // 保存战斗状态
    await attacker.setFlag('shuhai-dalu', 'combatState', combatState);

    // 刷新战斗区域（如果打开）
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === attacker.id) {
        app.render(false);
      }
    });
  } else {
    // 未触发暴击
    message = `【呼吸】判定：${diceRoll}（骰数）+ ${breathStrength}（呼吸）= ${criticalJudgement} < 15，未触发暴击`;
  }

  return {
    multiplier: multiplier,
    finalDamage: finalDamage,
    message: message,
    triggered: true,
    critType: critType
  };
}

/**
 * 触发震颤引爆效果
 * @param {Actor} target - 目标角色
 * @returns {object} - 引爆结果 { triggered: boolean, chaosIncrease: number, message: string }
 */
export async function triggerTremorExplode(target) {
  // 获取战斗状态
  let combatState = target.getFlag('shuhai-dalu', 'combatState');
  if (!combatState || !combatState.buffs) {
    return { triggered: false, chaosIncrease: 0, message: '' };
  }

  // 查找【震颤】BUFF（本回合的）
  const tremorIndex = combatState.buffs.findIndex(
    buff => buff.id === 'tremor' && (buff.roundTiming === 'current' || !buff.roundTiming)
  );

  if (tremorIndex === -1) {
    return { triggered: false, chaosIncrease: 0, message: '目标没有震颤效果' };
  }

  const tremorBuff = combatState.buffs[tremorIndex];
  const tremorLayers = tremorBuff.layers;
  const tremorStrength = tremorBuff.strength;

  // 计算混乱值增加 = 层数 × 强度
  const chaosIncrease = tremorLayers * tremorStrength;

  // 检查是否有特殊震颤效果（黑暗骑士-誓约）
  const hasSpecialTremor = combatState.buffs.some(
    buff => buff.id === 'dark_knight_oath' || buff.name === '黑暗骑士-誓约'
  );

  let message = '';
  let actualChaosIncrease = 0;

  if (hasSpecialTremor) {
    // 有黑暗骑士-誓约：不陷入混乱
    message = `<span style="color: #EECBA2; font-weight: bold;">【震颤引爆】：${target.name} 的【震颤】${tremorLayers}层 × 强度${tremorStrength} = ${chaosIncrease}混乱值</span><br>`;
    message += `<span style="color: #4a7c2c;">【黑暗骑士-誓约】生效：不会陷入混乱</span>`;
    actualChaosIncrease = 0;
  } else {
    // 正常增加混乱值
    const currentChaos = target.system.derived.chaos.value || 0;
    const maxChaos = target.system.derived.chaos.max || 10;
    actualChaosIncrease = Math.min(chaosIncrease, maxChaos - currentChaos);
    const newChaos = Math.min(maxChaos, currentChaos + chaosIncrease);

    await target.update({ 'system.derived.chaos.value': newChaos });

    message = `<span style="color: #EECBA2; font-weight: bold;">【震颤引爆】：${target.name} 的【震颤】${tremorLayers}层 × 强度${tremorStrength} = ${chaosIncrease}混乱值</span><br>`;
    message += `<span style="color: #888;">混乱值：${currentChaos} → ${newChaos}</span>`;
  }

  // 移除震颤 BUFF
  combatState.buffs.splice(tremorIndex, 1);
  message += `<br><span style="color: #888;">【震颤】已移除</span>`;

  // 保存战斗状态
  await target.setFlag('shuhai-dalu', 'combatState', combatState);

  // 刷新战斗区域（如果打开）
  Object.values(ui.windows).forEach(app => {
    if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === target.id) {
      app.render(false);
    }
  });

  // 触发 onTremorExplode 时机的 activities
  await triggerItemActivities(target, null, 'onTremorExplode');

  return {
    triggered: true,
    chaosIncrease: actualChaosIncrease,
    message: message
  };
}
// 注意：战斗效果函数已移至 services/combat-effects.mjs
// 注意：Activity函数已移至 services/activity-service.mjs

/**
 * 为聊天消息添加事件监听器
 */
Hooks.on('renderChatMessage', (message, html, data) => {
  // 新的对抗按钮事件（combat-dice-initiate.hbs）
  html.find('.counter-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    // 从聊天消息的flags中获取完整的发起数据
    const messageId = $(button).closest('.message').data('messageId');
    const chatMessage = game.messages.get(messageId);

    if (!chatMessage || !chatMessage.flags['shuhai-dalu']?.initiateData) {
      ui.notifications.error("无法获取发起数据");
      return;
    }

    const initiateData = chatMessage.flags['shuhai-dalu'].initiateData;

    // 检查是否是指定目标，如果是，验证当前玩家
    if (initiateData.targetId) {
      const currentActor = await getCurrentActor();
      if (!currentActor) return;

      if (currentActor.id !== initiateData.targetId) {
        ui.notifications.warn("这个对抗不是针对你的！");
        return;
      }

      // 打开对抗界面（【对抗时】将在选择骰子后触发）
      const CounterAreaApplication = (await import('./applications/counter-area.mjs')).default;
      const counterArea = new CounterAreaApplication(currentActor, initiateData);
      counterArea.render(true);
    } else {
      // 没有指定目标，任何人都可以对抗
      const actor = await getCurrentActor();
      if (!actor) return;

      // 防止自己对抗自己
      if (actor.id === initiateData.initiatorId) {
        ui.notifications.warn("你不能对抗自己！");
        return;
      }

      // 打开对抗界面（【对抗时】将在选择骰子后触发）
      const CounterAreaApplication = (await import('./applications/counter-area.mjs')).default;
      const counterArea = new CounterAreaApplication(actor, initiateData);
      counterArea.render(true);
    }
  });

  // 结算伤害按钮事件（counter-result.hbs）
  html.find('.settle-damage-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    console.log('【调试】结算按钮被点击');
    console.log('【调试】button.dataset:', button.dataset);

    const loserId = button.dataset.loserId;
    const finalDamage = parseInt(button.dataset.finalDamage) || 0;

    console.log('【调试】loserId:', loserId);
    console.log('【调试】finalDamage:', finalDamage);

    // 获取失败者角色
    const loser = game.actors.get(loserId);
    if (!loser) {
      console.error('【调试】无法找到角色, loserId:', loserId);
      ui.notifications.error("无法找到失败者角色");
      return;
    }

    console.log('【调试】找到角色:', loser.name);

    // 记录当前HP
    const hpBefore = loser.system.derived.hp.value;
    const hpMax = loser.system.derived.hp.max;
    const hpAfter = Math.max(0, hpBefore - finalDamage);

    console.log('【调试】当前HP:', hpBefore, '/', hpMax, '承受后:', hpAfter);

    // 禁用按钮
    button.disabled = true;
    button.textContent = '已结算';

    // 发送结算消息（包含承受伤害按钮）
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: loser }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 18px; font-weight: bold; color: #E1AA43; margin-bottom: 8px;">💥 伤害结算</div>
          <div style="margin-bottom: 8px;"><strong>${loser.name}</strong> 将受到 <span style="color: #c14545; font-weight: bold;">${finalDamage}</span> 点伤害</div>
          <div style="padding: 8px; background: rgba(235, 189, 104, 0.1); border-radius: 4px; margin-bottom: 12px;">
            <div style="font-size: 14px; color: #EBBD68;">当前生命值: ${hpBefore}/${hpMax}</div>
            <div style="font-size: 16px; font-weight: bold; color: ${hpAfter > 0 ? '#4a7c2c' : '#c14545'}; margin-top: 4px;">承受后: ${hpAfter}/${hpMax}</div>
          </div>
          <button class="apply-damage-btn"
                  data-loser-id="${loserId}"
                  data-final-damage="${finalDamage}"
                  style="padding: 10px 28px; background: #c14545; color: #FFFFFF; border: none; border-radius: 4px; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            承受伤害
          </button>
        </div>
        <style>
        .apply-damage-btn:hover {
          background: #d94545;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        }
        .apply-damage-btn:disabled {
          background: #888;
          cursor: not-allowed;
          transform: none;
        }
        </style>
      `
    });

    ui.notifications.info(`${loser.name} 的伤害已计算完成，点击【承受伤害】按钮确认`);
  });

  // 承受伤害按钮事件（从结算消息中点击）
  html.find('.apply-damage-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    console.log('【调试】承受伤害按钮被点击');
    console.log('【调试】button:', button);
    console.log('【调试】button.dataset:', button.dataset);

    const loserId = button.dataset.loserId;
    const finalDamage = parseInt(button.dataset.finalDamage) || 0;

    console.log('【调试】loserId:', loserId);
    console.log('【调试】finalDamage:', finalDamage);

    // 获取失败者角色
    const loser = game.actors.get(loserId);
    if (!loser) {
      console.error('【调试】无法找到角色');
      ui.notifications.error("无法找到失败者角色");
      return;
    }

    console.log('【调试】找到角色:', loser.name);

    // 记录伤害前的HP
    const hpBefore = loser.system.derived.hp.value;
    const hpMax = loser.system.derived.hp.max;

    console.log('【调试】伤害前HP:', hpBefore, '/', hpMax);

    // 应用伤害
    const newHp = Math.max(0, hpBefore - finalDamage);
    console.log('【调试】准备更新HP到:', newHp);

    try {
      await loser.update({ 'system.derived.hp.value': newHp });
      console.log('【调试】HP更新成功');
    } catch (error) {
      console.error('【调试】HP更新失败:', error);
      ui.notifications.error(`更新HP失败: ${error.message}`);
      return;
    }

    // 等待更新完成
    await new Promise(resolve => setTimeout(resolve, 100));
    const updatedLoser = game.actors.get(loserId);
    console.log('【调试】更新后HP:', updatedLoser.system.derived.hp.value);

    // 禁用按钮
    button.disabled = true;
    button.textContent = '已承受';
    button.style.background = '#888';
    button.style.cursor = 'not-allowed';

    // 刷新所有打开的角色表单
    if (updatedLoser.sheet && updatedLoser.sheet.rendered) {
      updatedLoser.sheet.render(false);
      console.log('【调试】角色表已刷新');
    }

    // 刷新战斗区域（如果有打开）
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === loserId) {
        app.render(false);
        console.log('【调试】战斗区域已刷新');
      }
    });

    // 发送确认消息
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: updatedLoser }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #c14545; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 16px; font-weight: bold; color: #c14545; margin-bottom: 8px;">✓ 伤害已承受</div>
          <div style="margin-bottom: 8px;"><strong>${updatedLoser.name}</strong> 受到了 <span style="color: #c14545; font-weight: bold;">${finalDamage}</span> 点伤害</div>
          <div style="padding: 8px; background: rgba(193, 69, 69, 0.1); border-radius: 4px;">
            <div style="font-size: 14px; color: #888;">伤害前: ${hpBefore}/${hpMax}</div>
            <div style="font-size: 16px; font-weight: bold; color: ${updatedLoser.system.derived.hp.value > 0 ? '#EBBD68' : '#c14545'}; margin-top: 4px;">当前生命值: ${updatedLoser.system.derived.hp.value}/${hpMax}</div>
          </div>
        </div>
      `
    });

    ui.notifications.info(`${updatedLoser.name} 承受了 ${finalDamage} 点伤害，当前生命值: ${updatedLoser.system.derived.hp.value}/${hpMax}`);
    console.log('【调试】承受伤害流程完成');
  });

  // 治疗按钮事件（healHealth效果生成的按钮）
  html.find('.heal-button').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    console.log('【治疗】恢复按钮被点击');
    console.log('【治疗】button.dataset:', button.dataset);

    const actorId = button.dataset.actorId;
    const healAmount = parseInt(button.dataset.amount) || 0;

    console.log('【治疗】actorId:', actorId);
    console.log('【治疗】healAmount:', healAmount);

    // 获取目标角色
    const targetActor = game.actors.get(actorId);
    if (!targetActor) {
      console.error('【治疗】无法找到角色, actorId:', actorId);
      ui.notifications.error("无法找到目标角色");
      return;
    }

    console.log('【治疗】找到角色:', targetActor.name);

    // 记录恢复前的HP
    const hpBefore = targetActor.system.attributes?.hp?.value || targetActor.system.derived?.hp?.value || 0;
    const hpMax = targetActor.system.attributes?.hp?.max || targetActor.system.derived?.hp?.max || 100;

    console.log('【治疗】恢复前HP:', hpBefore, '/', hpMax);

    // 恢复生命值
    const newHp = Math.min(hpMax, hpBefore + healAmount);
    console.log('【治疗】准备更新HP到:', newHp);

    try {
      // 尝试两种数据路径
      if (targetActor.system.attributes?.hp) {
        await targetActor.update({ 'system.attributes.hp.value': newHp });
      } else if (targetActor.system.derived?.hp) {
        await targetActor.update({ 'system.derived.hp.value': newHp });
      }
      console.log('【治疗】HP更新成功');
    } catch (error) {
      console.error('【治疗】HP更新失败:', error);
      ui.notifications.error(`更新HP失败: ${error.message}`);
      return;
    }

    // 等待更新完成
    await new Promise(resolve => setTimeout(resolve, 100));
    const updatedActor = game.actors.get(actorId);
    const finalHP = updatedActor.system.attributes?.hp?.value || updatedActor.system.derived?.hp?.value || 0;
    console.log('【治疗】更新后HP:', finalHP);

    // 禁用按钮
    button.disabled = true;
    button.textContent = '✓ 已恢复';
    button.style.background = '#888';
    button.style.borderColor = '#666';
    button.style.cursor = 'not-allowed';
    button.style.transform = 'none';

    // 刷新所有打开的角色表单
    if (updatedActor.sheet && updatedActor.sheet.rendered) {
      updatedActor.sheet.render(false);
      console.log('【治疗】角色表已刷新');
    }

    // 刷新战斗区域（如果有打开）
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actorId) {
        app.render(false);
        console.log('【治疗】战斗区域已刷新');
      }
    });

    // 发送确认消息
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: updatedActor }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #5ec770; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 16px; font-weight: bold; color: #5ec770; margin-bottom: 8px;">✓ 生命值已恢复</div>
          <div style="margin-bottom: 8px;"><strong>${updatedActor.name}</strong> 恢复了 <span style="color: #5ec770; font-weight: bold;">${healAmount}</span> 点生命值</div>
          <div style="padding: 8px; background: rgba(94, 199, 112, 0.1); border-radius: 4px;">
            <div style="font-size: 14px; color: #888;">恢复前: ${hpBefore}/${hpMax}</div>
            <div style="font-size: 16px; font-weight: bold; color: #5ec770; margin-top: 4px;">当前生命值: ${finalHP}/${hpMax}</div>
          </div>
        </div>
      `
    });

    ui.notifications.info(`${updatedActor.name} 恢复了 ${healAmount} 点生命值，当前生命值: ${finalHP}/${hpMax}`);
    console.log('【治疗】恢复流程完成');
  });

  // 扣除选中Token生命值按钮（counter-result.hbs）
  html.find('.deduct-selected-token-hp-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    const finalDamage = parseInt(button.dataset.finalDamage) || 0;
    const winnerId = button.dataset.winnerId;
    const winnerDiceId = button.dataset.winnerDiceId;
    const loserId = button.dataset.loserId;

    // 获取当前选中的Token
    const controlled = canvas.tokens?.controlled;
    if (!controlled || controlled.length === 0) {
      ui.notifications.warn("请先选中一个Token！");
      return;
    }

    if (controlled.length > 1) {
      ui.notifications.warn("请只选中一个Token！");
      return;
    }

    const token = controlled[0];
    let actor = token.actor;

    if (!actor) {
      ui.notifications.error("选中的Token没有关联角色！");
      return;
    }

    // 如果是Token Actor（非链接token），获取原始Actor以确保数据持久化
    if (actor.isToken && !actor.token?.actorLink) {
      const baseActor = game.actors.get(actor.token.actorId);
      if (baseActor) {
        actor = baseActor;
        console.log('【调试】使用原始Actor而非Token Actor:', actor.name);
      }
    }

    // 记录伤害前的HP
    const hpBefore = actor.system.derived.hp.value;
    const hpMax = actor.system.derived.hp.max;

    // 应用伤害
    const newHp = Math.max(0, hpBefore - finalDamage);

    try {
      await actor.update({ 'system.derived.hp.value': newHp });
      console.log('【调试】HP更新成功:', actor.name, hpBefore, '->', newHp);
    } catch (error) {
      console.error('【调试】HP更新失败:', error);
      ui.notifications.error(`更新HP失败: ${error.message}`);
      return;
    }

    // 触发【破裂】和【沉沦】被动效果（受到伤害时）
    const passiveMessages = [];
    if (finalDamage > 0) {
      const ruptureResult = await triggerRuptureEffect(actor);
      if (ruptureResult.triggered) {
        passiveMessages.push(ruptureResult.message);
      }

      const corruptionResult = await triggerCorruptionEffect(actor);
      if (corruptionResult.triggered) {
        passiveMessages.push(corruptionResult.message);
      }
    }

    // 触发【攻击命中】和【受到伤害】效果
    if (winnerId && loserId && finalDamage > 0) {
      const winner = game.actors.get(winnerId);
      const loser = game.actors.get(loserId);

      if (winner && loser) {
        // 1. 触发获胜者的【攻击命中】效果
        if (winnerDiceId) {
          const winnerDice = winner.items.get(winnerDiceId);
          if (winnerDice) {
            await triggerItemActivitiesWithTarget(winner, winnerDice, 'onHit', loser);
          }
        }

        // 2. 触发失败者的【受到伤害】效果（遍历所有装备）
        const loserEquippedItems = loser.items.filter(item =>
          item.type === 'item' && item.system.equipped
        );
        for (const item of loserEquippedItems) {
          await triggerItemActivitiesWithTarget(loser, item, 'onDamaged', winner);
        }
      }
    }

    // 禁用按钮
    button.disabled = true;
    button.textContent = '已扣除';

    // 刷新角色表单和战斗区域
    if (actor.sheet && actor.sheet.rendered) {
      actor.sheet.render(false);
    }

    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
        app.render(false);
      }
    });

    // 发送确认消息
    const updatedHp = game.actors.get(actor.id).system.derived.hp.value;
    const passiveEffectsHtml = passiveMessages.length > 0
      ? `<div style="margin-top: 8px; padding: 8px; background: rgba(235, 189, 104, 0.15); border-radius: 4px; border-left: 3px solid #E1AA43;">
           ${passiveMessages.map(msg => `<div style="font-size: 13px; color: #EBBD68; margin: 4px 0;">${msg}</div>`).join('')}
         </div>`
      : '';

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #c14545; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 16px; font-weight: bold; color: #c14545; margin-bottom: 8px;">✓ 生命值已扣除</div>
          <div style="margin-bottom: 8px;"><strong>${actor.name}</strong> 受到了 <span style="color: #c14545; font-weight: bold;">${finalDamage}</span> 点伤害</div>
          ${passiveEffectsHtml}
          <div style="padding: 8px; background: rgba(193, 69, 69, 0.1); border-radius: 4px; margin-top: 8px;">
            <div style="font-size: 14px; color: #888;">伤害前: ${hpBefore}/${hpMax}</div>
            <div style="font-size: 16px; font-weight: bold; color: ${updatedHp > 0 ? '#EBBD68' : '#c14545'}; margin-top: 4px;">当前生命值: ${updatedHp}/${hpMax}</div>
          </div>
        </div>
      `
    });

    ui.notifications.info(`${actor.name} 受到了 ${finalDamage} 点伤害，当前生命值: ${newHp}/${hpMax}`);
  });

  // 承受按钮事件（combat-dice-initiate.hbs）
  html.find('.accept-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    const initiatorId = button.dataset.initiatorId;
    const buffBonus = parseInt(button.dataset.buffBonus) || 0;
    const adjustment = parseInt(button.dataset.adjustment) || 0;
    const diceCategory = button.dataset.diceCategory || '';

    // 获取当前玩家的角色
    const actor = await getCurrentActor();
    if (!actor) return;

    // 防止自己承受自己的攻击
    if (actor.id === initiatorId) {
      ui.notifications.warn("你不能承受自己的攻击！");
      return;
    }

    // 从聊天消息的flags中获取完整的发起数据
    const messageId = $(button).closest('.message').data('messageId');
    const chatMessage = game.messages.get(messageId);

    if (!chatMessage || !chatMessage.flags['shuhai-dalu']?.initiateData) {
      ui.notifications.error("无法获取发起数据");
      return;
    }

    const initiateData = chatMessage.flags['shuhai-dalu'].initiateData;

    // 如果发起者还没投骰，现在投
    let diceRoll = initiateData.diceRoll;
    if (diceRoll === null || diceRoll === undefined) {
      const roll = new Roll(initiateData.diceFormula);
      await roll.evaluate();

      // 显示3D骰子动画
      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      diceRoll = roll.total;

      // 更新聊天消息中的 diceRoll
      await chatMessage.setFlag('shuhai-dalu', 'initiateData', {
        ...initiateData,
        diceRoll: diceRoll
      });
    }

    // 计算发起者的最终骰数
    const baseDamage = diceRoll + buffBonus + adjustment;

    // 计算抗性结果
    let finalDamage = baseDamage;
    let description = "";

    // 获取承受者的防具
    const armor = actor.items.get(actor.system.equipment.armor);

    if (armor && armor.system.armorProperties) {
      const props = armor.system.armorProperties;

      // 检查抗性
      if (diceCategory === '斩击') {
        if (props.slashUp) {
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【斩击抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.slashDown) {
          finalDamage = finalDamage * 2;
          description = `由于【斩击弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      } else if (diceCategory === '打击') {
        if (props.bluntUp) {
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【打击抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.bluntDown) {
          finalDamage = finalDamage * 2;
          description = `由于【打击弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      } else if (diceCategory === '突刺') {
        if (props.pierceUp) {
          finalDamage = Math.floor(finalDamage / 2);
          description = `由于【突刺抗性】，受到伤害减半（${baseDamage} → ${finalDamage}）`;
        } else if (props.pierceDown) {
          finalDamage = finalDamage * 2;
          description = `由于【突刺弱性】，受到伤害加倍（${baseDamage} → ${finalDamage}）`;
        }
      }
    }

    if (!description) {
      description = `受到${finalDamage}点伤害`;
    }

    // 检查发起者的【呼吸】BUFF效果
    const initiator = game.actors.get(initiatorId);
    if (initiator && diceRoll !== null && diceRoll !== undefined) {
      const breathResult = await triggerBreathEffect(initiator, diceRoll, finalDamage);

      if (breathResult.triggered) {
        finalDamage = breathResult.finalDamage;
        description = breathResult.message + '\n' + description;
      }
    }

    // 应用伤害
    const hpBefore = actor.system.derived.hp.value;
    const newHp = Math.max(0, hpBefore - finalDamage);
    await actor.update({ 'system.derived.hp.value': newHp });

    // 触发【破裂】和【沉沦】被动效果（受到伤害时）
    const passiveMessages = [];
    if (finalDamage > 0) {
      const ruptureResult = await triggerRuptureEffect(actor);
      if (ruptureResult.triggered) {
        passiveMessages.push(ruptureResult.message);
      }

      const corruptionResult = await triggerCorruptionEffect(actor);
      if (corruptionResult.triggered) {
        passiveMessages.push(corruptionResult.message);
      }
    }

    // 触发【攻击命中】和【受到伤害】效果
    if (finalDamage > 0 && initiator) {
      // 1. 触发攻击者的【攻击命中】效果
      if (initiateData.diceId) {
        const initiatorDice = initiator.items.get(initiateData.diceId);
        if (initiatorDice) {
          await triggerItemActivitiesWithTarget(initiator, initiatorDice, 'onHit', actor);
        }
      }

      // 2. 触发承受者的【受到伤害】效果（遍历所有装备）
      const defenderEquippedItems = actor.items.filter(item =>
        item.type === 'item' && item.system.equipped
      );
      for (const item of defenderEquippedItems) {
        await triggerItemActivitiesWithTarget(actor, item, 'onDamaged', initiator);
      }
    }

    // 重新获取更新后的角色数据
    const updatedActor = game.actors.get(actor.id);

    // 刷新所有打开的角色表单和战斗区域
    if (updatedActor.sheet && updatedActor.sheet.rendered) {
      updatedActor.sheet.render(false);
    }

    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === actor.id) {
        app.render(false);
      }
    });

    // 发送消息
    const passiveEffectsHtml = passiveMessages.length > 0
      ? `<div style="margin-top: 8px; padding: 8px; background: rgba(235, 189, 104, 0.15); border-radius: 4px; border-left: 3px solid #E1AA43;">
           ${passiveMessages.map(msg => `<div style="font-size: 13px; color: #EBBD68; margin: 4px 0;">${msg}</div>`).join('')}
         </div>`
      : '';

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 8px; padding: 16px; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #EBBD68; text-align: center;">选择承受</h3>
          <div style="margin-bottom: 8px; text-align: center;">${actor.name} 选择承受攻击</div>
          <div style="padding: 8px; background: rgba(235, 189, 104, 0.1); border-radius: 4px; margin-bottom: 8px;">
            <div>发起者骰数: ${diceRoll}</div>
            <div>BUFF加成: ${buffBonus}</div>
            <div>调整值: ${adjustment}</div>
            <div style="font-weight: bold; color: #f3c267;">总计: ${baseDamage}</div>
          </div>
          <div style="padding: 8px; background: rgba(235, 189, 104, 0.1); border-radius: 4px; margin-bottom: 8px;">
            <div>${description}</div>
          </div>
          ${passiveEffectsHtml}
          <div style="text-align: center; font-weight: bold; margin-top: 8px;">
            当前生命值: ${updatedActor.system.derived.hp.value}/${updatedActor.system.derived.hp.max}
          </div>
        </div>
      `
    });

    ui.notifications.info(`${actor.name} 承受了 ${finalDamage} 点伤害`);
  });

  // 再次对抗按钮事件（counter-draw.hbs）
  html.find('.retry-counter-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    const initiatorId = button.dataset.initiatorId;
    const initiatorDiceId = button.dataset.initiatorDiceId;
    const initiatorName = button.dataset.initiatorName;
    const initiatorDiceCategory = button.dataset.initiatorDiceCategory;
    const counterId = button.dataset.counterId;
    const counterDiceId = button.dataset.counterDiceId;

    // 获取双方角色和骰子
    const initiator = game.actors.get(initiatorId);
    const counter = game.actors.get(counterId);

    if (!initiator || !counter) {
      ui.notifications.error("无法找到对抗双方角色");
      return;
    }

    const initiatorDice = initiator.items.get(initiatorDiceId);
    const counterDice = counter.items.get(counterDiceId);

    if (!initiatorDice || !counterDice) {
      ui.notifications.error("无法找到对抗骰子");
      return;
    }

    // 禁用按钮
    button.disabled = true;
    button.textContent = '对抗中...';

    // 双方重新投骰
    const initiatorRoll = new Roll(initiatorDice.system.diceFormula);
    await initiatorRoll.evaluate();

    const counterRoll = new Roll(counterDice.system.diceFormula);
    await counterRoll.evaluate();

    // 显示骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(initiatorRoll, game.user, true);
      await game.dice3d.showForRoll(counterRoll, game.user, true);
    }

    // 获取双方的BUFF加成
    const initiatorCombatState = initiator.getFlag('shuhai-dalu', 'combatState') || { buffs: [] };
    const counterCombatState = counter.getFlag('shuhai-dalu', 'combatState') || { buffs: [] };

    let initiatorBuffBonus = 0;
    let counterBuffBonus = 0;

    // 计算发起者BUFF加成
    for (const buff of initiatorCombatState.buffs || []) {
      const timing = buff.roundTiming || 'current';
      if (timing !== 'current') continue;

      if (buff.id === 'strong') {
        initiatorBuffBonus += buff.layers;
      } else if (buff.id === 'weak') {
        initiatorBuffBonus -= buff.layers;
      }
    }

    // 计算对抗者BUFF加成
    for (const buff of counterCombatState.buffs || []) {
      const timing = buff.roundTiming || 'current';
      if (timing !== 'current') continue;

      if (buff.id === 'strong') {
        counterBuffBonus += buff.layers;
      } else if (buff.id === 'weak') {
        counterBuffBonus -= buff.layers;
      }
    }

    const initiatorResult = initiatorRoll.total + initiatorBuffBonus;
    const counterResult = counterRoll.total + counterBuffBonus;

    // 触发双方的【对抗时】activities
    const { triggerItemActivities } = await import('./shuhai-dalu.mjs');
    await triggerItemActivities(initiator, initiatorDice, 'onCounter');
    await triggerItemActivities(counter, counterDice, 'onCounter');

    // 判断结果
    const isDraw = initiatorResult === counterResult;

    if (isDraw) {
      // 还是平局，再次显示平局消息
      const resultDescription = `<div style="text-align: center;">
        <div style="color: #EBBD68; font-weight: bold; margin-bottom: 8px;">${initiatorName}: ${initiatorRoll.total} + ${initiatorBuffBonus} + 0 = ${initiatorResult}</div>
        <div style="color: #EBBD68; font-weight: bold; margin-bottom: 8px;">${counter.name}: ${counterRoll.total} + ${counterBuffBonus} + 0 = ${counterResult}</div>
        <div style="color: #f3c267; font-weight: bold; font-size: 16px; margin-top: 12px;">再次对抗仍为【平局】</div>
      </div>`;

      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: counter }),
        content: await renderTemplate("systems/shuhai-dalu/templates/chat/counter-draw.hbs", {
          initiatorName: initiatorName,
          initiatorId: initiatorId,
          initiatorDiceId: initiatorDiceId,
          initiatorDiceImg: initiatorDice.img,
          initiatorDiceName: initiatorDice.name,
          initiatorDiceCost: initiatorDice.system.cost,
          initiatorDiceFormula: initiatorDice.system.diceFormula,
          initiatorResult: initiatorResult,
          initiatorDiceRoll: initiatorRoll.total,
          initiatorBuff: initiatorBuffBonus,
          initiatorAdjustment: 0,
          initiatorDiceCategory: initiatorDiceCategory,
          counterName: counter.name,
          counterId: counterId,
          counterDiceId: counterDiceId,
          counterDiceImg: counterDice.img,
          counterDiceName: counterDice.name,
          counterDiceCost: counterDice.system.cost,
          counterDiceFormula: counterDice.system.diceFormula,
          counterDiceCategory: counterDice.system.category,
          counterResult: counterResult,
          counterDiceRoll: counterRoll.total,
          counterBuff: counterBuffBonus,
          counterAdjustment: 0,
          resultDescription: resultDescription
        }),
        sound: CONFIG.sounds.dice,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [initiatorRoll, counterRoll]
      };

      await ChatMessage.create(chatData);
    } else {
      // 有胜负，显示正常的对抗结果
      const initiatorWon = initiatorResult > counterResult;
      const winner = initiatorWon ? initiator : counter;
      const loser = initiatorWon ? counter : initiator;
      const winnerDice = initiatorWon ? initiatorDice : counterDice;
      const loserDice = initiatorWon ? counterDice : initiatorDice;

      // 触发【对抗成功】和【对抗失败】
      await triggerItemActivities(winner, winnerDice, 'onCounterSuccess');
      await triggerItemActivities(loser, loserDice, 'onCounterFail');

      // 计算伤害
      const baseDamage = initiatorWon ? initiatorResult : counterResult;
      const attackType = initiatorWon ? initiatorDiceCategory : counterDice.system.category;
      const winnerDiceRoll = initiatorWon ? initiatorRoll.total : counterRoll.total;

      // 导入 _calculateDamage 的逻辑（简化版，直接计算）
      let finalDamage = baseDamage;
      let description = `受到${baseDamage}点伤害`;

      // 检查【呼吸】效果
      const { triggerBreathEffect } = await import('./shuhai-dalu.mjs');
      const breathResult = await triggerBreathEffect(winner, winnerDiceRoll, baseDamage);
      if (breathResult.triggered) {
        finalDamage = breathResult.finalDamage;
        description = breathResult.message + '\n' + description;
      }

      const resultDescription = `<div style="text-align: center;">
        <div style="color: ${initiatorWon ? '#EBBD68' : '#cf4646'}; font-weight: bold; margin-bottom: 8px;">${initiatorName}: ${initiatorRoll.total} + ${initiatorBuffBonus} + 0 = ${initiatorResult}</div>
        <div style="color: ${!initiatorWon ? '#EBBD68' : '#cf4646'}; font-weight: bold; margin-bottom: 8px;">${counter.name}: ${counterRoll.total} + ${counterBuffBonus} + 0 = ${counterResult}</div>
        <div style="color: #EBBD68; font-weight: bold; font-size: 16px; margin-top: 12px;">本次对抗，${winner.name}【获胜】，${loser.name}【败北】</div>
        <div style="margin-top: 8px;">${loser.name}${description}</div>
      </div>`;

      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: counter }),
        content: await renderTemplate("systems/shuhai-dalu/templates/chat/counter-result.hbs", {
          initiatorName: initiatorName,
          initiatorId: initiatorId,
          initiatorDiceId: initiatorDiceId,
          initiatorDiceImg: initiatorDice.img,
          initiatorDiceName: initiatorDice.name,
          initiatorDiceCost: initiatorDice.system.cost,
          initiatorDiceFormula: initiatorDice.system.diceFormula,
          initiatorResult: initiatorResult,
          initiatorDiceRoll: initiatorRoll.total,
          initiatorBuff: initiatorBuffBonus,
          initiatorAdjustment: 0,
          counterName: counter.name,
          counterId: counterId,
          counterDiceId: counterDiceId,
          counterDiceImg: counterDice.img,
          counterDiceName: counterDice.name,
          counterDiceCost: counterDice.system.cost,
          counterDiceFormula: counterDice.system.diceFormula,
          counterResult: counterResult,
          counterDiceRoll: counterRoll.total,
          counterBuff: counterBuffBonus,
          counterAdjustment: 0,
          initiatorWon: initiatorWon,
          resultDescription: resultDescription,
          loserId: loser.id,
          winnerId: winner.id,
          winnerDiceId: winnerDice.id,
          finalDamage: finalDamage
        }),
        sound: CONFIG.sounds.dice,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [initiatorRoll, counterRoll]
      };

      await ChatMessage.create(chatData);
    }

    ui.notifications.info("再次对抗完成");
  });

  // 旧的挑战按钮事件（兼容性保留）
  html.find('.challenge-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const total = parseInt(button.dataset.total);
    const actorId = button.dataset.actorId;

    // 获取当前玩家的角色
    const actor = await getCurrentActor();
    if (!actor) {
      return;
    }

    if (action === 'counter') {
      // 对抗：打开对抗界面
      const challengerId = button.dataset.challengerId;
      const challengerName = button.dataset.challengerName;
      const diceId = button.dataset.diceId;
      const diceName = button.dataset.diceName;
      const total = parseInt(button.dataset.total);

      // 动态导入对抗界面应用
      const CounterAreaApplication = (await import('./applications/counter-area.mjs')).default;
      const counterArea = new CounterAreaApplication(actor, {
        challengerId: challengerId,
        challengerName: challengerName,
        diceId: diceId,
        diceName: diceName,
        total: total
      });
      counterArea.render(true);

      ui.notifications.info(`${challengerName} 的骰数是 ${total}，请选择你的骰子进行对抗！`);

    } else if (action === 'accept') {
      // 承受：直接受到伤害
      const newHp = Math.max(0, actor.system.derived.hp.value - total);
      await actor.update({ 'system.derived.hp.value': newHp });

      // 发送消息
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: `${actor.name} 选择承受，受到 ${total} 点伤害！当前生命值：${newHp}/${actor.system.derived.hp.max}`
      });
    }
  });

  // 应用BUFF效果按钮事件
  html.find('.apply-buff-effect-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    // 解析JSON数据
    const buffDataJson = button.dataset.buffData;
    if (!buffDataJson) {
      ui.notifications.error("无法获取BUFF数据");
      return;
    }

    let buffData;
    try {
      buffData = JSON.parse(buffDataJson);
    } catch (error) {
      ui.notifications.error("BUFF数据格式错误");
      return;
    }

    // 获取当前玩家的角色
    const currentActor = await getCurrentActor();
    if (!currentActor) {
      return;
    }

    // 检查权限：如果有指定目标，必须是目标本人才能点击
    if (buffData.targetId) {
      if (currentActor.id !== buffData.targetId) {
        ui.notifications.warn("这个效果不是针对你的！");
        return;
      }
    }

    // 获取目标角色（如果没有指定目标，目标就是当前玩家）
    const targetActor = buffData.targetId ? game.actors.get(buffData.targetId) : currentActor;
    if (!targetActor) {
      ui.notifications.error("无法找到目标角色");
      return;
    }

    // 获取目标的战斗状态
    let combatState = targetActor.getFlag('shuhai-dalu', 'combatState') || {
      exResources: [true, true, true],
      costResources: 0,
      activatedDice: [],
      buffs: []
    };

    // 应用所有BUFF
    for (const buff of buffData.buffs) {
      const roundTiming = buff.roundTiming || 'current';

      // 检查是否已经存在相同id和roundTiming的BUFF（分开管理）
      // 对于自定义效果（id='custom'），使用名称+ID+roundTiming作为唯一标识
      let existingBuffIndex;
      if (buff.buffId === 'custom') {
        existingBuffIndex = combatState.buffs.findIndex(
          b => b.id === 'custom' && b.name === buff.buffName && (b.roundTiming || 'current') === roundTiming
        );
      } else {
        existingBuffIndex = combatState.buffs.findIndex(
          b => b.id === buff.buffId && (b.roundTiming || 'current') === roundTiming
        );
      }

      if (existingBuffIndex !== -1) {
        // 如果已存在相同id和roundTiming的BUFF，叠加层数和强度
        combatState.buffs[existingBuffIndex].layers += buff.layers;
        // 强度也相加（而不是替换）
        combatState.buffs[existingBuffIndex].strength += buff.strength;
      } else {
        // 如果不存在，添加新BUFF
        combatState.buffs.push({
          id: buff.buffId,
          name: buff.buffName,
          icon: buff.buffIcon,
          layers: buff.layers,
          strength: buff.strength,
          source: buff.source,
          sourceItem: buff.sourceItem,
          roundTiming: roundTiming  // 添加回合计数字段
        });
      }
    }

    // 保存战斗状态
    try {
      await targetActor.setFlag('shuhai-dalu', 'combatState', combatState);
    } catch (error) {
      ui.notifications.error(`更新战斗状态失败: ${error.message}`);
      return;
    }

    // 禁用按钮
    button.disabled = true;
    button.textContent = '已应用';
    button.style.background = '#888';
    button.style.cursor = 'not-allowed';

    // 刷新战斗区域（如果有打开）
    Object.values(ui.windows).forEach(app => {
      if (app.constructor.name === 'CombatAreaApplication' && app.actor.id === targetActor.id) {
        app.render(false);
      }
    });

    // 发送确认消息
    const buffListText = buffData.buffs.map(b => `${b.buffName} (${b.layers}层 ${b.strength}强度)`).join('、');
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: targetActor }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #EBBD68; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 16px; font-weight: bold; color: #E1AA43; margin-bottom: 8px;">✓ 效果已应用</div>
          <div style="margin-bottom: 8px;">
            <strong>${targetActor.name}</strong> 获得了 ${buffListText}
          </div>
          <div style="font-size: 13px; color: #888;">
            来自: ${buffData.sourceName} 的 ${buffData.sourceItemName}
          </div>
        </div>
      `
    });

    ui.notifications.info(`${targetActor.name} 已获得效果: ${buffListText}`);
  });
});

/* -------------------------------------------- */
/*  Handlebars 辅助函数                          */
/* -------------------------------------------- */

Hooks.once('init', function() {
  // 注册 Handlebars 辅助函数
  Handlebars.registerHelper('concat', function() {
    let outStr = '';
    for (let arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });
  
  Handlebars.registerHelper('toLowerCase', function(str) {
    return str ? str.toLowerCase() : '';
  });
  
  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });
  
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });
  
  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  // 逻辑运算符
  Handlebars.registerHelper('or', function() {
    // 获取所有参数（最后一个是Handlebars的options对象，需要排除）
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.some(arg => !!arg);
  });

  Handlebars.registerHelper('and', function() {
    // 获取所有参数（最后一个是Handlebars的options对象，需要排除）
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.every(arg => !!arg);
  });

  Handlebars.registerHelper('not', function(value) {
    return !value;
  });

  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });
  
  Handlebars.registerHelper('subtract', function(a, b) {
    return a - b;
  });
  
  // ⭐ 添加缺失的 multiply helper
  Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });
  
  // ⭐ 添加 divide helper
  Handlebars.registerHelper('divide', function(a, b) {
    if (b === 0) return 0;
    return a / b;
  });
  
  Handlebars.registerHelper('join', function(arr, sep) {
    if (Array.isArray(arr)) {
      return arr.filter(x => x).join(sep || ', ');
    }
    return arr || '';
  });
  
  // ⭐ 添加 floor helper (向下取整)
  Handlebars.registerHelper('floor', function(value) {
    return Math.floor(value);
  });
  
  // ⭐ 添加 ceil helper (向上取整)
  Handlebars.registerHelper('ceil', function(value) {
    return Math.ceil(value);
  });
  
  // ⭐ 添加 round helper (四舍五入)
  Handlebars.registerHelper('round', function(value) {
    return Math.round(value);
  });
  
  // 获取物品图片
  Handlebars.registerHelper('getItemImg', function(itemId, options) {
    if (!itemId) return 'icons/svg/item-bag.svg';
    
    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.img;
    }
    
    // 否则从全局获取
    const item = game.items.get(itemId);
    return item ? item.img : 'icons/svg/item-bag.svg';
  });
  
  // 检查装备槽是否有物品
  Handlebars.registerHelper('hasItem', function(itemId) {
    return itemId && itemId !== '';
  });

  // 检查是否有EX资源
  Handlebars.registerHelper('hasEx', function(exResources) {
    if (!Array.isArray(exResources)) return false;
    return exResources.some(ex => ex === true);
  });

  // 获取物品费用

  Handlebars.registerHelper('getItemCost', function(itemId, options) {

    if (!itemId) return '';

 

    // 尝试从当前上下文的 actor 获取物品

    const actor = options?.data?.root?.actor;

    if (actor && actor.items) {

      const item = actor.items.get(itemId);

      if (item && item.system.cost) return item.system.cost;

    }

 

    // 否则从全局获取

    const item = game.items.get(itemId);

    return (item && item.system.cost) ? item.system.cost : '';

  });

 

  // 获取物品骰数

  Handlebars.registerHelper('getItemDice', function(itemId, options) {

    if (!itemId) return '';

 

    // 尝试从当前上下文的 actor 获取物品

    const actor = options?.data?.root?.actor;

    if (actor && actor.items) {

      const item = actor.items.get(itemId);

      if (item && item.system.diceFormula) return item.system.diceFormula;

    }

 

    // 否则从全局获取

    const item = game.items.get(itemId);

    return (item && item.system.diceFormula) ? item.system.diceFormula : '';

  });

 

  // 获取物品名称
  Handlebars.registerHelper('getItemName', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.name;
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return item ? item.name : '';
  });

  // 获取物品描述/效果
  Handlebars.registerHelper('getItemDescription', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.system.effect || '';
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return (item && item.system.effect) ? item.system.effect : '';
  });

  // 获取物品分类
  Handlebars.registerHelper('getItemCategory', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.system.category || '';
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return (item && item.system.category) ? item.system.category : '';
  });

  // 获取物品tooltip（悬停提示）
  Handlebars.registerHelper('getItemTooltip', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    let item = null;

    if (actor && actor.items) {
      item = actor.items.get(itemId);
    }

    if (!item) {
      item = game.items.get(itemId);
    }

    if (!item) return '';

    // 构建tooltip文本
    const typeNames = {
      combatDice: '攻击骰',
      shootDice: '射击骰',
      defenseDice: '守备骰',
      triggerDice: '触发骰',
      passiveDice: '被动骰',
      weapon: '武器',
      armor: '防具',
      item: '物品',
      equipment: '装备'
    };

    const parts = [];
    parts.push(item.name);
    parts.push(`${typeNames[item.type] || item.type} ${item.system.category || ''}`);
    if (item.system.effect) {
      parts.push(item.system.effect);
    }

    return parts.join('\n');
  });
});

/* -------------------------------------------- */
/*  预加载模板                                    */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // 角色表单模板
    "systems/shuhai-dalu/templates/actor/actor-character-sheet.hbs",
    "systems/shuhai-dalu/templates/actor/actor-player-sheet.hbs",

    // 物品模板
    "systems/shuhai-dalu/templates/item/item-sheet.hbs",

    // 物品卡模板
    "systems/shuhai-dalu/templates/item-card/item-card-sheet.hbs",
    "systems/shuhai-dalu/templates/item-card/condition-editor.hbs",

    // 战斗区域模板
    "systems/shuhai-dalu/templates/combat/combat-area.hbs",
    "systems/shuhai-dalu/templates/combat/counter-area.hbs",

    // 对话框模板
    "systems/shuhai-dalu/templates/dialog/check-dialog.hbs",
    "systems/shuhai-dalu/templates/dialog/create-item.hbs",
    "systems/shuhai-dalu/templates/dialog/item-details.hbs",
    "systems/shuhai-dalu/templates/dialog/special-dice-dialog.hbs",

    // 聊天模板
    "systems/shuhai-dalu/templates/chat/check-roll.hbs",
    "systems/shuhai-dalu/templates/chat/dice-use.hbs",
    "systems/shuhai-dalu/templates/chat/trigger-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-card.hbs",
    "systems/shuhai-dalu/templates/chat/combat-dice-challenge.hbs",
    "systems/shuhai-dalu/templates/chat/combat-dice-initiate.hbs",
    "systems/shuhai-dalu/templates/chat/counter-result.hbs",
    "systems/shuhai-dalu/templates/chat/counter-draw.hbs",
    "systems/shuhai-dalu/templates/chat/contest-result.hbs",
    "systems/shuhai-dalu/templates/chat/counter-attack-result.hbs",

    // HUD模板
    "systems/shuhai-dalu/templates/hud/battle-area-hud.hbs"
  ]);
}

/* -------------------------------------------- */
/*  工具函数                                      */
/* -------------------------------------------- */

/**
 * 等待字体加载
 */
async function waitForFonts() {
  if (document.fonts) {
    await document.fonts.ready;
  }
}

/**
 * 迁移所有角色的prototypeToken为链接状态
 * 这样从角色卡拖出的Token默认是链接的，刷新游戏后也不会变
 */
async function migrateActorTokenLinks() {
  // 只在GM权限下执行迁移
  if (!game.user.isGM) return;

  console.log('书海大陆 | 开始迁移角色Token链接状态...');

  let migratedCount = 0;

  // 遍历所有character类型的Actor
  for (const actor of game.actors.filter(a => a.type === 'character')) {
    // 检查是否需要迁移（prototypeToken.actorLink为false或undefined）
    if (!actor.prototypeToken.actorLink) {
      try {
        await actor.update({
          'prototypeToken.actorLink': true
        });
        migratedCount++;
        console.log(`书海大陆 | 已迁移角色: ${actor.name}`);
      } catch (error) {
        console.error(`书海大陆 | 迁移角色失败: ${actor.name}`, error);
      }
    }
  }

  if (migratedCount > 0) {
    console.log(`书海大陆 | Token链接迁移完成，共迁移 ${migratedCount} 个角色`);
    ui.notifications.info(`已自动迁移 ${migratedCount} 个角色为链接Token模式`);
  } else {
    console.log('书海大陆 | 无需迁移Token链接状态');
  }
}

/**
 * 设置键盘事件监听
 */
function setupKeyboardListeners() {
  document.addEventListener('keydown', async (event) => {
    // 检查是否在输入框中，避免干扰正常输入
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    // 按V键：开关当前选中Token的战斗区域（静默操作）
    if (event.key.toLowerCase() === 'v' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();

      // 获取当前选中的Token
      const controlled = canvas.tokens?.controlled;

      // 如果没有选中Token，静默返回
      if (!controlled || controlled.length === 0) {
        return;
      }

      // 如果选中多个Token，只处理第一个
      const token = controlled[0];
      let actor = token.actor;

      if (!actor) {
        return;
      }

      // 如果是Token Actor（非链接token），获取原始Actor
      if (actor.isToken && !actor.token?.actorLink) {
        const baseActor = game.actors.get(actor.token.actorId);
        if (baseActor) {
          actor = baseActor;
        }
      }

      // 检查是否已经打开了战斗区域窗口
      const existingWindow = Object.values(ui.windows).find(
        app => app.constructor.name === 'CombatAreaApplication' && app.actor?.id === actor.id
      );

      if (existingWindow) {
        // 如果已打开，关闭它
        existingWindow.close();
      } else {
        // 如果未打开，打开它
        const CombatAreaApplication = (await import('./applications/combat-area.mjs')).default;
        const combatArea = new CombatAreaApplication(actor);
        combatArea.render(true);
      }
    }

    // 按B键：开关全局战斗HUD
    if (event.key.toLowerCase() === 'b' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();

      // 检查是否已经打开了全局HUD窗口
      const existingHUD = Object.values(ui.windows).find(
        app => app.constructor.name === 'BattleAreaHUD'
      );

      if (existingHUD) {
        // 如果已打开，关闭它
        existingHUD.close();
      } else {
        // 如果未打开，打开它
        const BattleAreaHUD = (await import('./applications/battle-area-hud.mjs')).default;
        const hud = new BattleAreaHUD();
        hud.render(true);
      }
    }

    // 按N键：开关全局敌人战斗HUD
    if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();

      // 检查是否已经打开了全局敌人HUD窗口
      const existingEnemyHUD = Object.values(ui.windows).find(
        app => app.constructor.name === 'EnemyBattleAreaHUD'
      );

      if (existingEnemyHUD) {
        // 如果已打开，关闭它
        existingEnemyHUD.close();
      } else {
        // 如果未打开，打开它
        const EnemyBattleAreaHUD = (await import('./applications/enemy-battle-area-hud.mjs')).default;
        const enemyHud = new EnemyBattleAreaHUD();
        enemyHud.render(true);
      }
    }
  });

  console.log('书海大陆 | 键盘事件监听已注册 (V键=战斗区域, B键=玩家HUD, N键=敌人HUD)');
}

/**
 * 属性检定
 */
async function rollAttributeCheck(actor, attributeKey, modifier = 0, difficulty = 20) {
  const attribute = actor.system.attributes[attributeKey];
  if (!attribute) {
    ui.notifications.error("无效的属性");
    return null;
  }
  
  const result = actor.rollAttributeCheck(attributeKey, modifier, difficulty);
  return result;
}

/**
 * 技能检定
 */
async function rollSkillCheck(actor, skillKey, modifier = 0, difficulty = 20) {
  // 直接调用 actor 的 rollSkillCheck 方法
  return actor.rollSkillCheck(skillKey, modifier, difficulty);
}

/**
 * 侵蚀检定
 */
async function rollCorruptionCheck(actor) {
  return actor.rollCorruptionCheck();
}

/**
 * 装备物品
 */
async function equipItem(actor, item, slotType, slotIndex = null) {
  const updateData = {};
  
  // 检查星光是否足够
  const starlightCost = item.system.starlightCost || 0;
  const availableStarlight = actor.system.derived.starlight;
  
  if (starlightCost > availableStarlight) {
    ui.notifications.warn(`星光不足！需要 ${starlightCost}，当前可用 ${availableStarlight}`);
    return false;
  }
  
  // 根据槽位类型装备
  if (slotType === 'weapon') {
    updateData['system.equipment.weapon'] = item.id;
  } else if (slotType === 'armor') {
    updateData['system.equipment.armor'] = item.id;
  } else if (slotType === 'item' && slotIndex !== null) {
    // 对于数组类型，需要先复制整个数组再修改
    const items = [...actor.system.equipment.items];
    items[slotIndex] = item.id;
    updateData['system.equipment.items'] = items;
  } else if (slotType === 'gear' && slotIndex !== null) {
    const gear = [...actor.system.equipment.gear];
    gear[slotIndex] = item.id;
    updateData['system.equipment.gear'] = gear;
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    // 修复：复制整个combatDice数组，避免后面的槽位消失
    const combatDice = [...actor.system.equipment.combatDice];
    combatDice[slotIndex] = item.id;
    updateData['system.equipment.combatDice'] = combatDice;
  } else if (slotType === 'defenseDice') {
    updateData['system.equipment.defenseDice'] = item.id;
  } else if (slotType === 'triggerDice') {
    updateData['system.equipment.triggerDice'] = item.id;
  } else if (slotType === 'passiveDice' && slotIndex !== null) {
    const passives = [...actor.system.equipment.passives];
    passives[slotIndex] = item.id;
    updateData['system.equipment.passives'] = passives;
  }
  
  // 增加已使用的星光
  if (starlightCost > 0) {
    updateData['system.derived.starlightUsed'] = actor.system.derived.starlightUsed + starlightCost;
  }
  
  await actor.update(updateData);
  ui.notifications.info(`已装备 ${item.name}`);
  return true;
}

/**
 * 卸下物品
 */
async function unequipItem(actor, slotType, slotIndex = null) {
  const updateData = {};
  let itemId = null;
  
  // 获取要卸下的物品ID
  if (slotType === 'weapon') {
    itemId = actor.system.equipment.weapon;
    updateData['system.equipment.weapon'] = "";
  } else if (slotType === 'armor') {
    itemId = actor.system.equipment.armor;
    updateData['system.equipment.armor'] = "";
  } else if (slotType === 'item' && slotIndex !== null) {
    itemId = actor.system.equipment.items[slotIndex];
    const items = [...actor.system.equipment.items];
    items[slotIndex] = "";
    updateData['system.equipment.items'] = items;
  } else if (slotType === 'gear' && slotIndex !== null) {
    itemId = actor.system.equipment.gear[slotIndex];
    const gear = [...actor.system.equipment.gear];
    gear[slotIndex] = "";
    updateData['system.equipment.gear'] = gear;
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    itemId = actor.system.equipment.combatDice[slotIndex];
    const combatDice = [...actor.system.equipment.combatDice];
    combatDice[slotIndex] = "";
    updateData['system.equipment.combatDice'] = combatDice;
  } else if (slotType === 'defenseDice') {
    itemId = actor.system.equipment.defenseDice;
    updateData['system.equipment.defenseDice'] = "";
  } else if (slotType === 'triggerDice') {
    itemId = actor.system.equipment.triggerDice;
    updateData['system.equipment.triggerDice'] = "";
  } else if (slotType === 'passiveDice' && slotIndex !== null) {
    itemId = actor.system.equipment.passives[slotIndex];
    const passives = [...actor.system.equipment.passives];
    passives[slotIndex] = "";
    updateData['system.equipment.passives'] = passives;
  }
  
  if (!itemId) {
    ui.notifications.warn("该槽位没有装备物品");
    return false;
  }
  
  // 获取物品并返还星光
  const item = actor.items.get(itemId);
  if (item) {
    const starlightCost = item.system.starlightCost || 0;
    if (starlightCost > 0) {
      updateData['system.derived.starlightUsed'] = 
        Math.max(0, actor.system.derived.starlightUsed - starlightCost);
    }
  }
  
  await actor.update(updateData);
  ui.notifications.info(`已卸下 ${item ? item.name : '物品'}`);
  return true;
}

/* -------------------------------------------- */
/*  战斗轮次切换Hook                              */
/* -------------------------------------------- */

// 监听战斗轮次变化，更新BUFF的回合计数
Hooks.on('updateCombat', async (combat, changed, options, userId) => {
  // 检查是否是轮次变化（round字段改变）
  if (changed.round !== undefined) {
    console.log('书海大陆 | 战斗轮次切换到第', changed.round, '轮');

    // 遍历所有参战者，更新他们的BUFF回合计数
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;

      // 使用独立的回合结束处理函数
      await advanceActorRound(actor);
      console.log(`书海大陆 | 已更新 ${actor.name} 的BUFF回合计数`);
    }
  }
});

/* -------------------------------------------- */
/*  导出                                         */
/* -------------------------------------------- */

export {
  rollAttributeCheck,
  rollSkillCheck,
  rollCorruptionCheck,
  equipItem,
  unequipItem
};