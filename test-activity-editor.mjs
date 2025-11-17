/**
 * Activity 编辑器 V2 测试脚本
 *
 * 在 Foundry 浏览器控制台中运行此脚本来测试编辑器功能
 *
 * 使用方法：
 * 1. 在 Foundry 中按 F12 打开开发者工具
 * 2. 粘贴以下代码到控制台：
 *    const script = await fetch('/systems/shuhai-dalu/test-activity-editor.mjs').then(r => r.text());
 *    eval(script);
 * 3. 运行 await testActivityEditor.runAllTests()
 */

(async function() {
  const ActivityEditorV2 = (await import('/systems/shuhai-dalu/module/sheets/activity-editor-v2.mjs')).default;
  const { EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5 } = await import('/systems/shuhai-dalu/module/constants/activity-schema.mjs');

  console.log('【测试】Activity 编辑器 V2 测试脚本已加载');

  /**
   * 测试1：打开编辑器（新建）
   */
  async function testOpenEditorNew() {
    console.log('\n===== 测试1：打开编辑器（新建）=====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    try {
      const editor = new ActivityEditorV2(item);
      console.log('✅ 编辑器实例创建成功');
      console.log('  - isNew:', editor.isNew);
      console.log('  - activityId:', editor.activityId);
      console.log('  - editMode:', editor.editMode);

      // 测试渲染（不实际打开窗口）
      const data = await editor.getData();
      console.log('✅ getData() 成功');
      console.log('  - activity.name:', data.activity.name);
      console.log('  - triggerTypes 数量:', data.triggerTypes.length);
      console.log('  - effectTypes 数量:', data.effectTypes.length);

      return true;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  /**
   * 测试2：打开编辑器（编辑旧格式）
   */
  async function testOpenEditorOldFormat() {
    console.log('\n===== 测试2：打开编辑器（编辑旧格式）=====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    // 创建旧格式数据
    const oldActivity = {
      _id: 'test-old-format',
      name: '旧格式测试',
      trigger: 'onUse',  // 字符串格式
      hasConsume: true,
      consumes: [
        { buffId: 'charge', layers: 2 }
      ],
      target: 'self',
      roundTiming: 'current',
      effects: {  // 对象格式
        strong: { layers: 2, strength: 0 }
      }
    };

    try {
      const editor = new ActivityEditorV2(item, oldActivity);
      console.log('✅ 编辑器实例创建成功');
      console.log('  - isNew:', editor.isNew);
      console.log('  - needsMigration:', editor.needsMigration);

      const data = await editor.getData();
      console.log('✅ 旧格式已自动迁移');
      console.log('  - trigger.type:', data.activity.trigger.type);
      console.log('  - trigger 是对象:', typeof data.activity.trigger === 'object');
      console.log('  - effects 是数组:', Array.isArray(data.activity.effects));
      console.log('  - effects 数量:', data.activity.effects?.length || 0);

      return editor.needsMigration;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  /**
   * 测试3：打开编辑器（编辑新格式）
   */
  async function testOpenEditorNewFormat() {
    console.log('\n===== 测试3：打开编辑器（编辑新格式）=====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    try {
      const editor = new ActivityEditorV2(item, EXAMPLE_1);
      console.log('✅ 编辑器实例创建成功');
      console.log('  - isNew:', editor.isNew);
      console.log('  - needsMigration:', editor.needsMigration);

      const data = await editor.getData();
      console.log('✅ getData() 成功');
      console.log('  - activity.name:', data.activity.name);
      console.log('  - trigger.type:', data.activity.trigger.type);
      console.log('  - effects 数量:', data.activity.effects.length);

      return !editor.needsMigration;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  /**
   * 测试4：验证示例数据
   */
  function testExampleData() {
    console.log('\n===== 测试4：验证示例数据 =====');

    const examples = [EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5];
    let passed = 0;

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      console.log(`\n示例 ${i + 1}: ${example.name}`);

      const checks = [
        { name: '有 _id', pass: !!example._id },
        { name: '有 name', pass: !!example.name },
        { name: 'trigger 是对象', pass: typeof example.trigger === 'object' },
        { name: 'trigger.type 存在', pass: !!example.trigger.type },
        { name: 'conditions 是数组', pass: Array.isArray(example.conditions) },
        { name: 'consume 是对象', pass: typeof example.consume === 'object' },
        { name: 'effects 是数组', pass: Array.isArray(example.effects) },
        { name: 'effects 长度 > 0', pass: example.effects.length > 0 }
      ];

      let examplePassed = true;
      for (const check of checks) {
        console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
        if (!check.pass) examplePassed = false;
      }

      if (examplePassed) passed++;
    }

    console.log(`\n${passed}/${examples.length} 个示例通过验证`);
    return passed === examples.length;
  }

  /**
   * 测试5：测试数据准备方法
   */
  async function testDataPreparation() {
    console.log('\n===== 测试5：测试数据准备方法 =====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    try {
      const editor = new ActivityEditorV2(item, EXAMPLE_1);
      const data = await editor.getData();

      const checks = [
        { name: 'triggerTypes 存在', value: data.triggerTypes, expected: 'array' },
        { name: 'targetTypes 存在', value: data.targetTypes, expected: 'array' },
        { name: 'roundTimings 存在', value: data.roundTimings, expected: 'array' },
        { name: 'conditionTypes 存在', value: data.conditionTypes, expected: 'array' },
        { name: 'consumeModes 存在', value: data.consumeModes, expected: 'array' },
        { name: 'effectTypes 存在', value: data.effectTypes, expected: 'array' },
        { name: 'buffTypes 存在', value: data.buffTypes, expected: 'array' },
        { name: 'expressionExamples 存在', value: data.expressionExamples, expected: 'array' }
      ];

      let passed = true;
      for (const check of checks) {
        const isArray = Array.isArray(check.value);
        const checkPassed = isArray && check.value.length > 0;
        console.log(`  ${checkPassed ? '✅' : '❌'} ${check.name} (长度: ${check.value?.length || 0})`);
        if (!checkPassed) passed = false;
      }

      return passed;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  /**
   * 测试6：实际打开编辑器窗口
   */
  async function testRenderEditor() {
    console.log('\n===== 测试6：实际打开编辑器窗口 =====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    try {
      const editor = new ActivityEditorV2(item, EXAMPLE_2);
      editor.render(true);

      console.log('✅ 编辑器窗口已打开');
      console.log('💡 请手动检查：');
      console.log('  1. 窗口是否正常显示');
      console.log('  2. 基础编辑器和高级 JSON 标签切换是否正常');
      console.log('  3. 各个编辑器组件是否显示正确');
      console.log('  4. 表单字段是否预填充了正确的值');
      console.log('  5. 添加/删除按钮是否可用');

      return true;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  /**
   * 测试7：测试全部5个示例
   */
  async function testAllExamples() {
    console.log('\n===== 测试7：测试全部5个示例 =====');

    const item = game.items.contents[0] || game.actors.contents[0]?.items?.contents[0];
    if (!item) {
      console.error('❌ 没有找到测试 Item');
      return false;
    }

    const examples = [EXAMPLE_1, EXAMPLE_2, EXAMPLE_3, EXAMPLE_4, EXAMPLE_5];
    let passed = 0;

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      try {
        const editor = new ActivityEditorV2(item, example);
        const data = await editor.getData();

        console.log(`✅ 示例 ${i + 1}: ${example.name}`);
        console.log(`  - trigger.type: ${data.activity.trigger.type}`);
        console.log(`  - conditions: ${data.activity.conditions.length} 个`);
        console.log(`  - effects: ${data.activity.effects.length} 个`);
        console.log(`  - consume.mode: ${data.activity.consume.mode}`);

        passed++;
      } catch (error) {
        console.error(`❌ 示例 ${i + 1} 失败:`, error);
      }
    }

    console.log(`\n${passed}/${examples.length} 个示例测试通过`);
    return passed === examples.length;
  }

  /**
   * 运行所有测试
   */
  async function runAllTests() {
    console.log('\n========================================');
    console.log('   Activity 编辑器 V2 测试套件');
    console.log('========================================');

    const results = [];

    try {
      results.push({ name: '测试1: 打开编辑器（新建）', passed: await testOpenEditorNew() });
      results.push({ name: '测试2: 打开编辑器（旧格式）', passed: await testOpenEditorOldFormat() });
      results.push({ name: '测试3: 打开编辑器（新格式）', passed: await testOpenEditorNewFormat() });
      results.push({ name: '测试4: 验证示例数据', passed: testExampleData() });
      results.push({ name: '测试5: 测试数据准备方法', passed: await testDataPreparation() });
      results.push({ name: '测试6: 实际打开编辑器窗口', passed: await testRenderEditor() });
      results.push({ name: '测试7: 测试全部5个示例', passed: await testAllExamples() });

      console.log('\n========================================');
      console.log('   测试结果汇总');
      console.log('========================================');

      let passedCount = 0;
      for (const result of results) {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
        if (result.passed) passedCount++;
      }

      console.log(`\n总计: ${passedCount}/${results.length} 个测试通过`);
      console.log('========================================\n');

    } catch (error) {
      console.error('❌ 测试套件执行失败:', error);
    }
  }

  // 导出测试函数到全局
  window.testActivityEditor = {
    runAllTests,
    testOpenEditorNew,
    testOpenEditorOldFormat,
    testOpenEditorNewFormat,
    testExampleData,
    testDataPreparation,
    testRenderEditor,
    testAllExamples
  };

  console.log('\n✅ 测试脚本已加载');
  console.log('📖 运行 await testActivityEditor.runAllTests() 来执行所有测试');
  console.log('📖 或使用 window.testActivityEditor 访问单个测试函数');
  console.log('');
  console.log('可用函数:');
  console.log('  - runAllTests() - 运行所有测试');
  console.log('  - testOpenEditorNew() - 测试打开新建编辑器');
  console.log('  - testOpenEditorOldFormat() - 测试旧格式迁移');
  console.log('  - testOpenEditorNewFormat() - 测试新格式编辑');
  console.log('  - testExampleData() - 验证示例数据');
  console.log('  - testDataPreparation() - 测试数据准备');
  console.log('  - testRenderEditor() - 实际打开编辑器');
  console.log('  - testAllExamples() - 测试全部5个示例');
  console.log('');
})();
