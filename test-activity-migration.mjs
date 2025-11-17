/**
 * Activity 数据迁移测试脚本
 *
 * 在 Foundry 浏览器控制台中运行此脚本来测试迁移功能
 *
 * 使用方法：
 * 1. 在 Foundry 中按 F12 打开开发者工具
 * 2. 复制本文件内容到控制台执行
 * 3. 运行测试函数
 */

// 导入迁移工具
const { migrateActivity, migrateItemActivities, isNewFormat, migrateWorldItems } = await import('./module/helpers/activity-migration.mjs');
const { createDefaultActivity, EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5 } = await import('./module/constants/activity-schema.mjs');

console.log('【测试】Activity 迁移测试脚本已加载');

/**
 * 测试1：测试单个 activity 迁移
 */
function testSingleMigration() {
  console.log('\n===== 测试1：单个 Activity 迁移 =====\n');

  // 旧格式数据
  const oldActivity = {
    _id: 'test-1',
    name: '测试活动',
    trigger: 'onUse',
    hasConsume: true,
    consumes: [
      { buffId: 'chant', layers: 4, strength: 0 }
    ],
    target: 'self',
    roundTiming: 'current',
    effects: {
      strong: { layers: 2, strength: 0 },
      guard: { layers: 3, strength: 0 }
    }
  };

  console.log('旧格式:', oldActivity);

  const newActivity = migrateActivity(oldActivity);

  console.log('新格式:', newActivity);

  // 验证
  console.log('✅ 是否为新格式:', isNewFormat(newActivity));
  console.log('✅ 效果数量:', newActivity.effects.length);
  console.log('✅ 消耗模式:', newActivity.consume.mode);

  return newActivity;
}

/**
 * 测试2：测试 effectsList 格式迁移
 */
function testEffectsListMigration() {
  console.log('\n===== 测试2：EffectsList 格式迁移 =====\n');

  const oldActivity = {
    _id: 'test-2',
    name: '测试 EffectsList',
    trigger: 'onHit',
    target: 'target',
    roundTiming: 'next',
    effectsList: [
      { buffId: 'weak', layers: 1, strength: 0 },
      { buffId: 'vulnerable', layers: 2, strength: 0 }
    ]
  };

  console.log('旧格式:', oldActivity);

  const newActivity = migrateActivity(oldActivity);

  console.log('新格式:', newActivity);
  console.log('✅ 效果数量:', newActivity.effects.length);
  console.log('✅ 第一个效果:', newActivity.effects[0]);

  return newActivity;
}

/**
 * 测试3：测试自定义效果迁移
 */
function testCustomEffectMigration() {
  console.log('\n===== 测试3：自定义效果迁移 =====\n');

  const oldActivity = {
    _id: 'test-3',
    name: '测试自定义效果',
    trigger: 'onUse',
    target: 'self',
    customEffect: {
      enabled: true,
      name: 'blackFlame',
      layers: 5,
      strength: 3
    }
  };

  console.log('旧格式:', oldActivity);

  const newActivity = migrateActivity(oldActivity);

  console.log('新格式:', newActivity);
  console.log('✅ 自定义效果:', newActivity.effects[0]);

  return newActivity;
}

/**
 * 测试4：测试新格式识别
 */
function testNewFormatDetection() {
  console.log('\n===== 测试4：新格式识别 =====\n');

  console.log('示例1 是新格式?', isNewFormat(EXAMPLE_1));
  console.log('示例2 是新格式?', isNewFormat(EXAMPLE_2));
  console.log('示例3 是新格式?', isNewFormat(EXAMPLE_3));

  const oldFormat = {
    _id: 'old',
    name: '旧格式',
    trigger: 'onUse',  // 字符串格式
    effects: { strong: { layers: 1 } }  // 对象格式
  };

  console.log('旧格式数据 是新格式?', isNewFormat(oldFormat));

  console.log('✅ 新格式识别测试通过');
}

/**
 * 测试5：测试示例数据
 */
function testExamples() {
  console.log('\n===== 测试5：示例数据 =====\n');

  console.log('示例1 - 使用时双重增益:', EXAMPLE_1);
  console.log('示例2 - 对抗胜利双重恢复:', EXAMPLE_2);
  console.log('示例3 - 命中时再次使用:', EXAMPLE_3);
  console.log('示例4 - 消耗吟唱添加燃烧:', EXAMPLE_4);
  console.log('示例5 - 被动触发伤害增强:', EXAMPLE_5);

  console.log('✅ 所有示例数据都已加载');
}

/**
 * 测试6：测试选中 Actor 的 Items 迁移（只测试，不实际执行）
 */
async function testActorItemsMigration() {
  console.log('\n===== 测试6：Actor Items 迁移测试 =====\n');

  const actor = game.user.character || game.actors.contents[0];

  if (!actor) {
    console.warn('⚠️  没有找到 Actor，跳过测试');
    return;
  }

  console.log(`检查 Actor: ${actor.name}`);
  console.log(`Items 数量: ${actor.items.size}`);

  let needMigration = 0;
  let already New = 0;

  for (const item of actor.items) {
    if (!item.system.activities || Object.keys(item.system.activities).length === 0) {
      continue;
    }

    const firstActivity = Object.values(item.system.activities)[0];
    if (isNewFormat(firstActivity)) {
      alreadyNew++;
    } else {
      needMigration++;
      console.log(`  - 需要迁移: ${item.name}`);
    }
  }

  console.log(`\n统计:`);
  console.log(`  已是新格式: ${alreadyNew} 个 Items`);
  console.log(`  需要迁移: ${needMigration} 个 Items`);

  if (needMigration > 0) {
    console.log('\n💡 提示：运行 migrateSelectedActor() 来执行迁移');
  } else {
    console.log('\n✅ 所有 Items 都已是新格式');
  }
}

/**
 * 执行迁移：迁移选中 Actor 的所有 Items
 */
async function migrateSelectedActor() {
  const actor = game.user.character || game.actors.contents[0];

  if (!actor) {
    console.error('❌ 没有找到 Actor');
    return;
  }

  console.log(`\n开始迁移 Actor: ${actor.name}`);

  const items = [];
  for (const item of actor.items) {
    if (item.system.activities && Object.keys(item.system.activities).length > 0) {
      items.push(item);
    }
  }

  console.log(`找到 ${items.length} 个有 activities 的 Items`);

  let migrated = 0;
  for (const item of items) {
    const firstActivity = Object.values(item.system.activities)[0];
    if (!isNewFormat(firstActivity)) {
      const newActivities = await migrateItemActivities(item);
      await item.update({ 'system.activities': newActivities });
      console.log(`  ✅ 已迁移: ${item.name}`);
      migrated++;
    }
  }

  console.log(`\n✅ 迁移完成: 共迁移 ${migrated} 个 Items`);
}

/**
 * 执行迁移：迁移整个世界的所有 Items
 */
async function migrateWorld() {
  console.log('\n⚠️  警告：这将迁移世界中所有 Actor 和 Item 的 activities');
  console.log('⚠️  建议先备份世界数据！');
  console.log('');
  console.log('如果确定要继续，请运行: confirmMigrateWorld()');
}

async function confirmMigrateWorld() {
  console.log('\n开始迁移整个世界...');

  const stats = await migrateWorldItems();

  console.log('\n✅ 世界迁移完成:');
  console.log(`  总计: ${stats.total} 个 Items`);
  console.log(`  已迁移: ${stats.migrated} 个`);
  console.log(`  已跳过: ${stats.skipped} 个`);
  console.log(`  错误: ${stats.errors} 个`);
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('\n========================================');
  console.log('   Activity 数据迁移测试套件');
  console.log('========================================');

  try {
    testSingleMigration();
    testEffectsListMigration();
    testCustomEffectMigration();
    testNewFormatDetection();
    testExamples();
    await testActorItemsMigration();

    console.log('\n========================================');
    console.log('   ✅ 所有测试完成');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 导出测试函数到全局
window.testActivityMigration = {
  runAllTests,
  testSingleMigration,
  testEffectsListMigration,
  testCustomEffectMigration,
  testNewFormatDetection,
  testExamples,
  testActorItemsMigration,
  migrateSelectedActor,
  migrateWorld,
  confirmMigrateWorld
};

console.log('\n✅ 测试脚本已加载');
console.log('📖 运行 runAllTests() 来执行所有测试');
console.log('📖 或使用 window.testActivityMigration 访问单个测试函数');
console.log('');
console.log('可用函数:');
console.log('  - runAllTests() - 运行所有测试');
console.log('  - testSingleMigration() - 测试单个活动迁移');
console.log('  - testEffectsListMigration() - 测试 effectsList 迁移');
console.log('  - testCustomEffectMigration() - 测试自定义效果迁移');
console.log('  - testNewFormatDetection() - 测试新格式识别');
console.log('  - testExamples() - 查看示例数据');
console.log('  - testActorItemsMigration() - 测试 Actor Items 迁移');
console.log('  - migrateSelectedActor() - 迁移选中 Actor 的所有 Items');
console.log('  - migrateWorld() - 迁移整个世界（需确认）');
console.log('');
