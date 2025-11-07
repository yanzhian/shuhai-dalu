/**
 * 书海大陆 TRPG 系统
 * 主入口文件 - 完整版
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

  // 显示欢迎消息
  ui.notifications.info("书海大陆系统已加载！");
});

/* -------------------------------------------- */
/*  宏快捷栏拖放处理                               */
/* -------------------------------------------- */

/**
 * 处理战斗骰拖放到宏快捷栏
 */
Hooks.on('hotbarDrop', async (bar, data, slot) => {
  // 检查是否是从战斗区域拖放的物品
  if (data.type === 'Item' && data.fromCombatArea) {
    // 获取物品
    const item = await Item.implementation.fromDropData(data);

    if (!item) {
      ui.notifications.error("无法找到物品！");
      return false;
    }

    const actorId = item.parent?.id;
    const itemId = item.id;
    const diceIndex = data.diceIndex;

    if (!actorId) {
      ui.notifications.error("物品必须属于某个角色！");
      return false;
    }

    // 创建宏命令
    const command = `
// 使用战斗骰: ${item.name}
const actor = game.actors.get("${actorId}");
if (!actor) {
  ui.notifications.error("找不到角色！");
  return;
}

// 动态导入战斗区域
const CombatAreaModule = await import("systems/shuhai-dalu/module/applications/combat-area.mjs");
const CombatAreaApp = CombatAreaModule.default;

// 查找是否已经打开战斗区域
let app = Object.values(ui.windows).find(w =>
  w.constructor.name === 'CombatAreaApplication' && w.actor.id === actor.id
);

// 如果没有打开，创建新的
if (!app) {
  app = new CombatAreaApp(actor);
  app.render(true);
}

// 模拟点击战斗骰按钮
const diceIndex = ${diceIndex};
setTimeout(() => {
  app._onInitiateCombatDice({
    preventDefault: () => {},
    currentTarget: { dataset: { index: diceIndex } }
  });
}, 200);
`.trim();

    // 创建或更新宏
    let macro = game.macros.find(m =>
      m.name === item.name &&
      m.flags?.['shuhai-dalu']?.actorId === actorId &&
      m.flags?.['shuhai-dalu']?.itemId === itemId
    );

    if (!macro) {
      macro = await Macro.create({
        name: item.name,
        type: "script",
        img: item.img,
        command: command,
        flags: {
          'shuhai-dalu': {
            type: 'combatDice',
            actorId: actorId,
            itemId: itemId,
            diceIndex: diceIndex
          }
        }
      });
    }

    // 将宏添加到快捷栏
    game.user.assignHotbarMacro(macro, slot);

    ui.notifications.info(`已将 ${item.name} 添加到快捷栏！`);
    return false; // 阻止默认行为
  }

  return true; // 允许其他类型的拖放
});

/* -------------------------------------------- */
/*  Actor创建钩子 - 初始化新角色HP                */
/* -------------------------------------------- */

Hooks.on('preCreateActor', (actor, data, options, userId) => {
  // 只处理角色类型
  if (actor.type !== 'character') return;

  // 计算初始最大HP（需要先有属性值）
  const con = data.system?.attributes?.constitution || 10;
  const str = data.system?.attributes?.strength || 10;
  const lvl = data.system?.level || 1;
  const maxHp = con * 3 + str + lvl * 3;

  // 设置初始HP为最大值
  actor.updateSource({
    'system.derived.hp.value': maxHp,
    'system.derived.hp.max': maxHp
  });

  console.log(`书海大陆 | 新角色HP初始化: ${maxHp}/${maxHp}`);
});

/* -------------------------------------------- */
/*  聊天消息钩子                                  */
/* -------------------------------------------- */

/**
 * 获取当前玩家的角色
 * 优先级：配置的角色 > 选中的Token > 让用户选择
 */
async function getCurrentActor() {
  // 1. 尝试获取配置的角色
  if (game.user.character) {
    return game.user.character;
  }

  // 2. 尝试获取当前选中的Token对应的角色
  const controlled = canvas.tokens?.controlled;
  if (controlled && controlled.length > 0) {
    return controlled[0].actor;
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

      // 打开对抗界面
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

      // 打开对抗界面
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

  // 扣除选中Token生命值按钮（counter-result.hbs）
  html.find('.deduct-selected-token-hp-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;

    const finalDamage = parseInt(button.dataset.finalDamage) || 0;

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
    const actor = token.actor;

    if (!actor) {
      ui.notifications.error("选中的Token没有关联角色！");
      return;
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
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `
        <div style="background: #0F0D1B; border: 2px solid #c14545; border-radius: 8px; padding: 12px; color: #EBBD68; text-align: center; font-family: 'Noto Sans SC', sans-serif;">
          <div style="font-size: 16px; font-weight: bold; color: #c14545; margin-bottom: 8px;">✓ 生命值已扣除</div>
          <div style="margin-bottom: 8px;"><strong>${actor.name}</strong> 受到了 <span style="color: #c14545; font-weight: bold;">${finalDamage}</span> 点伤害</div>
          <div style="padding: 8px; background: rgba(193, 69, 69, 0.1); border-radius: 4px;">
            <div style="font-size: 14px; color: #888;">伤害前: ${hpBefore}/${hpMax}</div>
            <div style="font-size: 16px; font-weight: bold; color: ${newHp > 0 ? '#EBBD68' : '#c14545'}; margin-top: 4px;">当前生命值: ${newHp}/${hpMax}</div>
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

    // 应用伤害
    const newHp = Math.max(0, actor.system.derived.hp.value - finalDamage);
    await actor.update({ 'system.derived.hp.value': newHp });

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
          <div style="text-align: center; font-weight: bold;">
            当前生命值: ${updatedActor.system.derived.hp.value}/${updatedActor.system.derived.hp.max}
          </div>
        </div>
      `
    });

    ui.notifications.info(`${actor.name} 承受了 ${finalDamage} 点伤害`);
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

    // 聊天模板
    "systems/shuhai-dalu/templates/chat/check-roll.hbs",
    "systems/shuhai-dalu/templates/chat/dice-use.hbs",
    "systems/shuhai-dalu/templates/chat/trigger-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-card.hbs",
    "systems/shuhai-dalu/templates/chat/combat-dice-challenge.hbs",
    "systems/shuhai-dalu/templates/chat/combat-dice-initiate.hbs",
    "systems/shuhai-dalu/templates/chat/counter-result.hbs",
    "systems/shuhai-dalu/templates/chat/contest-result.hbs",
    "systems/shuhai-dalu/templates/chat/counter-attack-result.hbs"
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
/*  导出                                         */
/* -------------------------------------------- */

export {
  rollAttributeCheck,
  rollSkillCheck,
  rollCorruptionCheck,
  equipItem,
  unequipItem
};