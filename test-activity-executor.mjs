/**
 * Activity Executor 测试脚本
 * 在 Foundry 浏览器控制台中运行此脚本来测试 Activity 执行引擎
 *
 * 使用方法：
 * 1. 在 Foundry 中按 F12 打开开发者工具
 * 2. 复制本文件内容到控制台执行
 * 3. 运行测试函数：await runAllTests()
 */

import { ActivityExecutor, createContext } from './module/helpers/activity-executor.mjs';
import { ACTIVITY_TEMPLATE, EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5 } from './module/constants/activity-schema.mjs';

/**
 * 测试1：shouldTrigger() - 触发条件检查
 */
async function testShouldTrigger() {
  console.log('\n===== 测试1：shouldTrigger() - 触发条件检查 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  const context = createContext(actor, null, null, null, game.combat);

  // 测试1.1：简单触发匹配
  context.triggerType = 'onUse';
  const activity1 = {
    trigger: { type: 'onUse', passive: false, category: null }
  };
  const result1 = ActivityExecutor.shouldTrigger(activity1, context);
  console.log('1.1 简单触发匹配:', result1 ? '✅' : '❌', `(期望: true, 实际: ${result1})`);

  // 测试1.2：触发类型不匹配
  context.triggerType = 'onAttack';
  const result2 = ActivityExecutor.shouldTrigger(activity1, context);
  console.log('1.2 触发类型不匹配:', !result2 ? '✅' : '❌', `(期望: false, 实际: ${result2})`);

  // 测试1.3：攻击类别过滤
  context.triggerType = 'onAttack';
  context.attackCategory = 'slash';
  const activity3 = {
    trigger: { type: 'onAttack', passive: false, category: 'slash' }
  };
  const result3 = ActivityExecutor.shouldTrigger(activity3, context);
  console.log('1.3 攻击类别匹配:', result3 ? '✅' : '❌', `(期望: true, 实际: ${result3})`);

  // 测试1.4：攻击类别不匹配
  context.attackCategory = 'pierce';
  const result4 = ActivityExecutor.shouldTrigger(activity3, context);
  console.log('1.4 攻击类别不匹配:', !result4 ? '✅' : '❌', `(期望: false, 实际: ${result4})`);

  // 测试1.5：向后兼容旧格式（字符串 trigger）
  context.triggerType = 'onUse';
  const activityOld = {
    trigger: 'onUse'  // 旧格式
  };
  const result5 = ActivityExecutor.shouldTrigger(activityOld, context);
  console.log('1.5 向后兼容旧格式:', result5 ? '✅' : '❌', `(期望: true, 实际: ${result5})`);

  console.log('✅ 测试1完成');
}

/**
 * 测试2：checkCondition() - 条件检查
 */
async function testCheckCondition() {
  console.log('\n===== 测试2：checkCondition() - 条件检查 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 准备测试：添加一些 BUFF
  await actor.addBuff('charge', 5, 0, 'current');
  await actor.addBuff('chant', 10, 0, 'current');

  const context = createContext(actor, null, null, null, game.combat);

  // 测试2.1：hasBuff 条件
  const result1 = await ActivityExecutor.checkCondition({
    type: 'hasBuff',
    buffId: 'charge'
  }, context);
  console.log('2.1 hasBuff 条件:', result1 ? '✅' : '❌', `(期望: true, 实际: ${result1})`);

  // 测试2.2：buffLayer 条件（>= 3）
  const result2 = await ActivityExecutor.checkCondition({
    type: 'buffLayer',
    buffId: 'charge',
    operator: '>=',
    value: 3
  }, context);
  console.log('2.2 buffLayer >= 3:', result2 ? '✅' : '❌', `(期望: true, 实际: ${result2})`);

  // 测试2.3：buffLayer 条件（> 10，应该失败）
  const result3 = await ActivityExecutor.checkCondition({
    type: 'buffLayer',
    buffId: 'charge',
    operator: '>',
    value: 10
  }, context);
  console.log('2.3 buffLayer > 10:', !result3 ? '✅' : '❌', `(期望: false, 实际: ${result3})`);

  // 测试2.4：resourceCount 条件
  const result4 = await ActivityExecutor.checkCondition({
    type: 'resourceCount',
    resourceType: 'cost',
    operator: '>=',
    value: 0
  }, context);
  console.log('2.4 resourceCount >= 0:', result4 ? '✅' : '❌', `(期望: true, 实际: ${result4})`);

  // 测试2.5：healthPercent 条件
  const result5 = await ActivityExecutor.checkCondition({
    type: 'healthPercent',
    operator: '>',
    value: 0
  }, context);
  console.log('2.5 healthPercent > 0:', result5 ? '✅' : '❌', `(期望: true, 实际: ${result5})`);

  console.log('✅ 测试2完成');
}

/**
 * 测试3：parseEffectValue() - 表达式解析
 */
async function testParseEffectValue() {
  console.log('\n===== 测试3：parseEffectValue() - 表达式解析 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 准备测试：添加 BUFF
  await actor.addBuff('burn', 12, 0, 'current');

  const context = createContext(actor, null, null, null, game.combat);

  // 测试3.1：纯数字
  const result1 = await ActivityExecutor.parseEffectValue(5, context);
  console.log('3.1 纯数字:', result1 === 5 ? '✅' : '❌', `(期望: 5, 实际: ${result1})`);

  // 测试3.2：数字字符串
  const result2 = await ActivityExecutor.parseEffectValue('10', context);
  console.log('3.2 数字字符串:', result2 === 10 ? '✅' : '❌', `(期望: 10, 实际: ${result2})`);

  // 测试3.3：变量引用 {burn.layers}
  const result3 = await ActivityExecutor.parseEffectValue('{burn.layers}', context);
  console.log('3.3 变量引用 {burn.layers}:', result3 === 12 ? '✅' : '❌', `(期望: 12, 实际: ${result3})`);

  // 测试3.4：函数表达式 floor({burn.layers}/4)
  const result4 = await ActivityExecutor.parseEffectValue('floor({burn.layers}/4)', context);
  console.log('3.4 函数表达式 floor(12/4):', result4 === 3 ? '✅' : '❌', `(期望: 3, 实际: ${result4})`);

  // 测试3.5：骰子表达式 1d4+3
  const result5 = await ActivityExecutor.parseEffectValue('1d4+3', context);
  const isValid5 = result5 >= 4 && result5 <= 7;
  console.log('3.5 骰子表达式 1d4+3:', isValid5 ? '✅' : '❌', `(期望: 4-7, 实际: ${result5})`);

  // 测试3.6：空值
  const result6 = await ActivityExecutor.parseEffectValue('', context);
  console.log('3.6 空值:', result6 === 0 ? '✅' : '❌', `(期望: 0, 实际: ${result6})`);

  console.log('✅ 测试3完成');
}

/**
 * 测试4：executeAddBuff() - 添加 BUFF
 */
async function testExecuteAddBuff() {
  console.log('\n===== 测试4：executeAddBuff() - 添加 BUFF =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 清除现有 BUFF
  await actor.clearBuff('strong');
  await actor.clearBuff('guard');

  const context = createContext(actor, null, null, null, game.combat);

  // 测试4.1：添加静态层数
  const effect1 = {
    type: 'addBuff',
    buffId: 'strong',
    layers: 2,
    target: 'self',
    roundTiming: 'current'
  };
  const result1 = await ActivityExecutor.executeAddBuff(effect1, context);
  const buff1 = actor.getBuff('strong');
  console.log('4.1 添加静态层数:', buff1?.layers === 2 ? '✅' : '❌', `(期望: 2, 实际: ${buff1?.layers})`);

  // 测试4.2：添加表达式层数
  await actor.addBuff('charge', 8, 0, 'current');
  const effect2 = {
    type: 'addBuff',
    buffId: 'guard',
    layers: 'floor({charge.layers}/2)',  // 8/2 = 4
    target: 'self',
    roundTiming: 'current'
  };
  const result2 = await ActivityExecutor.executeAddBuff(effect2, context);
  const buff2 = actor.getBuff('guard');
  console.log('4.2 添加表达式层数:', buff2?.layers === 4 ? '✅' : '❌', `(期望: 4, 实际: ${buff2?.layers})`);

  console.log('✅ 测试4完成');
}

/**
 * 测试5：handleConsume() - 复杂消耗模式
 */
async function testHandleConsume() {
  console.log('\n===== 测试5：handleConsume() - 复杂消耗模式 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 准备测试：添加资源
  await actor.addBuff('chant', 10, 0, 'current');
  await actor.addBuff('charge', 10, 0, 'current');
  await actor.addBuff('ammo', 5, 0, 'current');

  const context = createContext(actor, null, null, null, game.combat);

  // 测试5.1：无消耗
  const consume1 = { mode: 'none', resources: [], options: [] };
  const result1 = await ActivityExecutor.handleConsume(consume1, context);
  console.log('5.1 无消耗:', result1.success ? '✅' : '❌', `(期望: true, 实际: ${result1.success})`);

  // 测试5.2：强制消耗
  const consume2 = {
    mode: 'mandatory',
    resources: [
      { type: 'buff', buffId: 'chant', layers: 4 }
    ],
    options: []
  };
  const result2 = await ActivityExecutor.handleConsume(consume2, context);
  const chantAfter = actor.getBuff('chant');
  console.log('5.2 强制消耗:', result2.success && chantAfter.layers === 6 ? '✅' : '❌',
    `(期望: 成功且剩余6层, 实际: ${result2.success ? '成功' : '失败'}, 剩余${chantAfter?.layers}层)`);

  // 测试5.3：可选消耗（自动选择唯一选项）
  const consume3 = {
    mode: 'optional',
    resources: [],
    options: [
      [{ type: 'buff', buffId: 'ammo', layers: 1 }]
    ]
  };
  const result3 = await ActivityExecutor.handleConsume(consume3, context);
  const ammoAfter = actor.getBuff('ammo');
  console.log('5.3 可选消耗（唯一选项）:', result3.success && ammoAfter.layers === 4 ? '✅' : '❌',
    `(期望: 成功且剩余4层, 实际: ${result3.success ? '成功' : '失败'}, 剩余${ammoAfter?.layers}层)`);

  console.log('✅ 测试5完成');
  console.log('⚠️  注意：多选项消耗需要用户交互（对话框），无法在自动测试中验证');
}

/**
 * 测试6：完整 Activity 执行
 */
async function testFullActivityExecution() {
  console.log('\n===== 测试6：完整 Activity 执行 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 清除测试 BUFF
  await actor.clearBuff('strong');
  await actor.clearBuff('guard');

  // 使用 EXAMPLE_1：使用时获得双重增益
  const activity = EXAMPLE_1;

  const context = createContext(actor, null, null, null, game.combat);
  context.triggerType = 'onUse';

  const result = await ActivityExecutor.execute(activity, context);

  const strongBuff = actor.getBuff('strong');
  const chargeBuff = actor.getBuff('charge');

  console.log('6.1 完整执行 EXAMPLE_1:', result.success ? '✅' : '❌',
    `(执行${result.success ? '成功' : '失败'})`);
  console.log('6.2 强壮层数:', strongBuff?.layers === 2 ? '✅' : '❌',
    `(期望: 2, 实际: ${strongBuff?.layers})`);
  console.log('6.3 充能层数:', chargeBuff?.layers === 5 ? '✅' : '❌',
    `(期望: 5, 实际: ${chargeBuff?.layers})`);
  console.log('6.4 效果结果数量:', result.effectResults?.length === 2 ? '✅' : '❌',
    `(期望: 2, 实际: ${result.effectResults?.length})`);

  console.log('✅ 测试6完成');
}

/**
 * 测试7：actor.executeActivities() 集成测试
 */
async function testActorIntegration() {
  console.log('\n===== 测试7：actor.executeActivities() 集成测试 =====');

  const actor = game.actors.contents[0];
  if (!actor) {
    console.error('❌ 没有找到测试 Actor');
    return;
  }

  // 检查方法是否存在
  if (typeof actor.executeActivities !== 'function') {
    console.error('❌ actor.executeActivities() 方法不存在');
    return;
  }

  console.log('7.1 executeActivities 方法存在:', '✅');

  // 测试调用（需要有装备的 Items）
  try {
    const results = await actor.executeActivities('onUse', {});
    console.log('7.2 executeActivities 调用成功:', '✅',
      `(触发了 ${results.length} 个 Activities)`);
  } catch (error) {
    console.error('7.2 executeActivities 调用失败:', '❌', error);
  }

  console.log('✅ 测试7完成');
}

/**
 * 测试8：Example Activities
 */
async function testExampleActivities() {
  console.log('\n===== 测试8：示例 Activities =====');

  console.log('EXAMPLE_1 (使用时双重增益):');
  console.log('  - 触发:', EXAMPLE_1.trigger.type);
  console.log('  - 效果数量:', EXAMPLE_1.effects.length);
  console.log('  - 效果:', EXAMPLE_1.effects.map(e => `${e.type}(${e.buffId})`).join(', '));

  console.log('\nEXAMPLE_2 (对抗胜利双重恢复):');
  console.log('  - 触发:', EXAMPLE_2.trigger.type);
  console.log('  - 效果数量:', EXAMPLE_2.effects.length);
  console.log('  - 效果:', EXAMPLE_2.effects.map(e => e.type).join(', '));

  console.log('\nEXAMPLE_3 (命中时再次使用):');
  console.log('  - 触发:', EXAMPLE_3.trigger.type);
  console.log('  - 消耗模式:', EXAMPLE_3.consume.mode);
  console.log('  - 效果:', EXAMPLE_3.effects[0].type);

  console.log('\nEXAMPLE_4 (消耗吟唱添加燃烧):');
  console.log('  - 触发:', EXAMPLE_4.trigger.type);
  console.log('  - 消耗:', EXAMPLE_4.consume.resources[0].buffId, EXAMPLE_4.consume.resources[0].layers, '层');
  console.log('  - 效果:', EXAMPLE_4.effects[0].buffId);

  console.log('\nEXAMPLE_5 (被动触发伤害增强):');
  console.log('  - 触发:', EXAMPLE_5.trigger.type);
  console.log('  - 被动:', EXAMPLE_5.trigger.passive);
  console.log('  - 类别过滤:', EXAMPLE_5.trigger.category);
  console.log('  - 条件:', EXAMPLE_5.conditions[0].type, EXAMPLE_5.conditions[0].operator, EXAMPLE_5.conditions[0].value);

  console.log('\n✅ 测试8完成');
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('开始运行 Activity Executor 测试套件');
  console.log('='.repeat(60));

  try {
    await testShouldTrigger();
    await testCheckCondition();
    await testParseEffectValue();
    await testExecuteAddBuff();
    await testHandleConsume();
    await testFullActivityExecution();
    await testActorIntegration();
    await testExampleActivities();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 测试过程中发生错误:', error);
    console.error('='.repeat(60));
  }
}

// 导出到全局
window.testActivityExecutor = {
  runAllTests,
  testShouldTrigger,
  testCheckCondition,
  testParseEffectValue,
  testExecuteAddBuff,
  testHandleConsume,
  testFullActivityExecution,
  testActorIntegration,
  testExampleActivities
};

console.log('Activity Executor 测试脚本已加载');
console.log('运行所有测试: await testActivityExecutor.runAllTests()');
console.log('运行单个测试: await testActivityExecutor.testShouldTrigger()');
