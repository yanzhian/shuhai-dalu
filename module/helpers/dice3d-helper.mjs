/**
 * Dice So Nice! 辅助工具
 * 用于诊断和测试 3D 骰子动画
 */

/**
 * 检查 Dice So Nice! 是否可用
 * @returns {boolean} 是否可用
 */
export function isDice3dAvailable() {
  const available = !!game.dice3d;
  console.log(`【Dice So Nice! 检查】可用: ${available}`);

  if (available) {
    console.log(`【Dice So Nice! 信息】版本:`, game.modules.get('dice-so-nice')?.version);
    console.log(`【Dice So Nice! 信息】配置:`, game.dice3d);
  } else {
    console.warn(`【Dice So Nice! 警告】模组未启用或未安装`);
  }

  return available;
}

/**
 * 测试 Dice So Nice! 动画
 * 在浏览器控制台调用: testDice3d()
 */
export async function testDice3d() {
  console.log(`【Dice So Nice! 测试】开始测试...`);

  if (!isDice3dAvailable()) {
    ui.notifications.error("Dice So Nice! 模组未启用");
    return;
  }

  try {
    // 创建一个简单的 1d20 投掷
    const roll = new Roll("1d20");
    await roll.evaluate();

    console.log(`【Dice So Nice! 测试】Roll 对象:`, roll);
    console.log(`【Dice So Nice! 测试】结果: ${roll.total}`);

    // 尝试显示 3D 骰子
    await game.dice3d.showForRoll(roll, game.user, true);

    console.log(`【Dice So Nice! 测试】✅ 成功！`);
    ui.notifications.info(`Dice So Nice! 测试成功，投掷结果: ${roll.total}`);

  } catch (error) {
    console.error(`【Dice So Nice! 测试】❌ 失败:`, error);
    ui.notifications.error(`Dice So Nice! 测试失败: ${error.message}`);
  }
}

/**
 * 安全显示骰子动画
 * 包含错误处理和降级方案
 *
 * @param {Roll} roll - Roll 对象
 * @param {User} user - 用户对象（默认当前用户）
 * @param {boolean} synchronize - 是否同步给其他用户（默认 true）
 * @param {Object} options - 额外选项（颜色、主题等）
 * @returns {Promise<void>}
 */
export async function showDiceAnimation(roll, user = null, synchronize = true, options = {}) {
  // 如果 Dice So Nice! 不可用，直接返回
  if (!game.dice3d) {
    console.log(`【Dice So Nice!】模组未启用，跳过动画`);
    return;
  }

  try {
    const targetUser = user || game.user;

    console.log(`【Dice So Nice!】显示动画:`, {
      formula: roll.formula,
      total: roll.total,
      user: targetUser.name,
      synchronize,
      options
    });

    await game.dice3d.showForRoll(roll, targetUser, synchronize, null, false, null, options);

  } catch (error) {
    console.error(`【Dice So Nice!】动画显示失败:`, error);
    // 不抛出错误，避免影响游戏流程
  }
}

/**
 * 显示多个骰子动画（同时显示）
 * @param {Array<Roll>} rolls - Roll 对象数组
 * @param {Array<Object>} options - 每个骰子的选项数组
 * @returns {Promise<void>}
 */
export async function showMultipleDiceAnimation(rolls, options = []) {
  if (!game.dice3d) {
    return;
  }

  try {
    const promises = rolls.map((roll, index) => {
      const opts = options[index] || {};
      return game.dice3d.showForRoll(roll, game.user, true, null, false, null, opts);
    });

    await Promise.all(promises);

  } catch (error) {
    console.error(`【Dice So Nice!】多个骰子动画失败:`, error);
  }
}

// 导出到全局，方便在控制台测试
if (typeof window !== 'undefined') {
  window.testDice3d = testDice3d;
  window.isDice3dAvailable = isDice3dAvailable;
}
