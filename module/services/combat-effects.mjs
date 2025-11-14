/**
 * 书海大陆 TRPG 系统
 * 战斗效果服务模块
 *
 * 处理各种战斗BUFF效果的触发逻辑
 */

/**
 * 回合推进 - 处理回合结束时的BUFF变化
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

  // 注意：triggerItemActivities 会在主入口文件中调用此函数后处理
  // 这里不直接调用以避免循环依赖

  return {
    triggered: true,
    chaosIncrease: actualChaosIncrease,
    message: message
  };
}
