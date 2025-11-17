# Phase 2 规划：执行引擎重构注意事项

**日期**: 2025-11-17
**阶段**: Phase 2 - 执行引擎重构
**预计时间**: 4-5 天

---

## 📋 目录

1. [现状分析](#现状分析)
2. [核心挑战](#核心挑战)
3. [重构策略](#重构策略)
4. [关键技术点](#关键技术点)
5. [与其他模块的集成](#与其他模块的集成)
6. [测试要点](#测试要点)
7. [风险和解决方案](#风险和解决方案)

---

## 🔍 现状分析

### 现有执行引擎（2个）

#### 1. `activity-executor.mjs` (336 行)

**优点**:
- ✅ 结构完整，支持条件检查、消耗处理、效果执行
- ✅ 支持次数限制（perRound, perCombat）
- ✅ 使用 `effect-registry.mjs` 进行效果分发
- ✅ 有上下文对象 (`createContext()`)

**问题**:
- ❌ 消耗模式不完整（只有 `mandatory` 和 `optional`，没有可选二选一/三选一）
- ❌ 条件检查类型有限（只有 `hasBuff`, `buffLayer`, `hasCost`, `roundLimit`）
- ❌ 没有表达式解析（layers/strength 是静态数值）
- ❌ `consume.type` 应该是 `consume.mode`（与新格式不一致）
- ❌ 特殊机制处理不清晰

**现有代码片段**:
```javascript
// 消耗处理 - 只检查 resources，没有 options
static async handleConsume(consume, context) {
  if (!consume || !consume.resources || consume.resources.length === 0) {
    return { success: true };
  }
  // ... 只处理 resources
}

// 条件检查 - 类型有限
static async checkCondition(condition, context) {
  switch (condition.type) {
    case 'hasBuff': // ...
    case 'buffLayer': // ...
    case 'hasCost': // ...
    case 'roundLimit': // ...
    // 缺少：resourceCount, healthPercent, customExpression
  }
}
```

#### 2. `activity-service.mjs` (128 行)

**优点**:
- ✅ 简单直接，易于理解
- ✅ 支持目标选择 (`self`, `selected`)

**问题**:
- ❌ 只能处理旧格式（effects 对象，不是数组）
- ❌ 只支持 `addBuff` 效果（无法处理其他效果类型）
- ❌ 没有条件检查
- ❌ 没有消耗处理
- ❌ 没有次数限制
- ❌ 触发类型是字符串匹配（`activity.trigger === triggerType`），无法处理对象格式

**现有代码片段**:
```javascript
// 只能处理旧格式的 effects 对象
if (activity.effects && Object.keys(activity.effects).length > 0) {
  for (const [buffId, effectData] of Object.entries(activity.effects)) {
    const layers = parseInt(effectData.layers) || 0;
    const strength = parseInt(effectData.strength) || 0;

    await actualTarget.addBuff(buffId, layers, strength, roundTiming);
  }
}
```

#### 3. `expression-parser.mjs` (200 行)

**优点**:
- ✅ 支持变量引用 (`{buffId.layers}`, `{buffId.strength}`)
- ✅ 支持数学函数 (`floor()`, `ceil()`, `max()`, `min()`, `abs()`)
- ✅ 安全计算（使用白名单函数，防止注入攻击）
- ✅ 表达式验证

**问题**:
- ❌ 没有被 `activity-service.mjs` 使用
- ❌ 没有被 `activity-executor.mjs` 集成
- ❌ 缺少骰子表达式解析（如 `"1d4+3"`）

---

## 💡 核心挑战

### 1. **两个执行引擎的整合**

**挑战**:
- `activity-executor.mjs` 功能完整但不支持新格式
- `activity-service.mjs` 功能简单但被多处调用
- 需要统一为一个引擎，同时不破坏现有调用

**解决方案**:
- 重构 `activity-executor.mjs` 为主要执行引擎
- 保留 `activity-service.mjs` 作为兼容层（调用新执行引擎）
- 渐进式替换：先让两者共存，逐步迁移调用点

### 2. **复杂消耗模式实现**

**挑战**:
新格式支持复杂的消耗模式：

```javascript
consume: {
  mode: 'optional',
  resources: [                    // 强制消耗
    { type: 'buff', buffId: 'chant', layers: 4 }
  ],
  options: [                      // 可选消耗（二选一）
    [
      { type: 'buff', buffId: 'charge', layers: 5 },
      { type: 'resource', resourceType: 'cost', count: 1 }
    ],
    [
      { type: 'buff', buffId: 'ammo', layers: 1 }
    ]
  ]
}
```

**需要实现**:
1. 强制部分 (`resources`) 必须满足
2. 可选部分 (`options`) 需要用户选择（二选一/三选一）
3. 选择 UI（如果有多个选项）
4. 消耗验证（检查是否足够）
5. 消耗执行（实际扣除资源）

**实现要点**:
```javascript
// 伪代码
async handleConsume(consume, context) {
  // 1. 检查强制部分
  if (!await this.checkResources(consume.resources, context)) {
    return { success: false, reason: '强制资源不足' };
  }

  // 2. 处理可选部分
  if (consume.mode === 'optional' && consume.options.length > 0) {
    // 2.1 检查每个选项是否可用
    const availableOptions = [];
    for (const option of consume.options) {
      if (await this.checkResources(option, context)) {
        availableOptions.push(option);
      }
    }

    // 2.2 如果没有可用选项，失败
    if (availableOptions.length === 0) {
      return { success: false, reason: '可选资源不足' };
    }

    // 2.3 如果有多个选项，弹出选择 UI
    let selectedOption;
    if (availableOptions.length > 1) {
      selectedOption = await this.showConsumeChoiceDialog(availableOptions);
    } else {
      selectedOption = availableOptions[0];
    }

    // 2.4 消耗选中的选项
    await this.consumeResources(selectedOption, context);
  }

  // 3. 消耗强制部分
  await this.consumeResources(consume.resources, context);

  return { success: true };
}
```

### 3. **表达式解析集成**

**挑战**:
- 效果的 `layers` 和 `strength` 可能是表达式（如 `"1d4+3"`, `"{burn.layers}"`）
- 需要在执行时动态计算
- 需要支持骰子表达式（Foundry 的 `Roll` 类）

**需要实现**:
```javascript
// 解析效果数值
async parseEffectValue(value, context) {
  // 1. 如果是数字，直接返回
  if (typeof value === 'number') {
    return value;
  }

  // 2. 如果包含骰子表达式（如 "1d4+3"）
  if (this.isDiceExpression(value)) {
    const roll = await new Roll(value).evaluate();
    return roll.total;
  }

  // 3. 如果包含变量引用（如 "{burn.layers}"）
  if (this.hasVariables(value)) {
    return ExpressionParser.parse(value, context);
  }

  // 4. 尝试转换为数字
  return parseFloat(value) || 0;
}

// 检查是否是骰子表达式
isDiceExpression(str) {
  return /\d+d\d+/.test(str);
}

// 检查是否包含变量引用
hasVariables(str) {
  return /\{[^}]+\}/.test(str);
}
```

### 4. **被动触发和类别过滤**

**挑战**:
新格式的 `trigger` 是对象，支持被动和类别过滤：

```javascript
trigger: {
  type: 'passive',      // 被动触发
  passive: true,
  category: 'slash'     // 仅斩击攻击时触发
}
```

**需要实现**:
```javascript
// 检查触发条件
shouldTrigger(activity, context) {
  const trigger = activity.trigger;

  // 1. 检查触发类型
  if (trigger.type !== context.triggerType) {
    return false;
  }

  // 2. 被动触发需要特殊处理
  if (trigger.passive) {
    // 被动触发通常在特定时机检查所有被动 activities
    // 需要在 combat-effects.mjs 中添加被动触发检查
  }

  // 3. 检查攻击类别过滤
  if (trigger.category) {
    const attackCategory = context.item?.system?.category; // 斩击/突刺/打击
    if (trigger.category !== attackCategory) {
      return false;
    }
  }

  return true;
}
```

### 5. **效果类型扩展**

**挑战**:
需要支持多种效果类型，不仅是 `addBuff`：

- `addBuff` - 添加 BUFF
- `consumeBuff` - 消耗 BUFF
- `heal` - 恢复生命
- `dealDamage` - 造成伤害
- `modifyDice` - 修改骰子
- `restoreResource` - 恢复资源
- `deductResource` - 扣除资源
- `customBuff` - 自定义 BUFF（用户在编辑器中创建）

**需要实现**:
```javascript
// 效果执行分发
async executeEffect(effect, context) {
  switch (effect.type) {
    case 'addBuff':
      return await this.executeAddBuff(effect, context);

    case 'consumeBuff':
      return await this.executeConsumeBuff(effect, context);

    case 'heal':
      return await this.executeHeal(effect, context);

    case 'dealDamage':
      return await this.executeDealDamage(effect, context);

    case 'modifyDice':
      return await this.executeModifyDice(effect, context);

    case 'restoreResource':
      return await this.executeRestoreResource(effect, context);

    case 'deductResource':
      return await this.executeDeductResource(effect, context);

    case 'customBuff':
      return await this.executeCustomBuff(effect, context);

    default:
      console.warn('【Activity执行】未知效果类型:', effect.type);
      return { success: false };
  }
}

// 示例：添加 BUFF
async executeAddBuff(effect, context) {
  const target = this.getTarget(effect.target, context);

  // 解析层数和强度（支持表达式）
  const layers = await this.parseEffectValue(effect.layers, context);
  const strength = await this.parseEffectValue(effect.strength || 0, context);

  // 添加 BUFF
  await target.addBuff(
    effect.buffId,
    layers,
    strength,
    effect.roundTiming || 'current'
  );

  return { success: true, buffId: effect.buffId, layers, strength };
}

// 示例：恢复资源
async executeRestoreResource(effect, context) {
  const target = this.getTarget(effect.target, context);
  const count = await this.parseEffectValue(effect.count, context);

  const combatState = target.getFlag('shuhai-dalu', 'combatState');

  if (effect.resourceType === 'cost') {
    // 恢复 Cost 资源
    let restored = 0;
    for (let i = 0; i < combatState.costResources.length && restored < count; i++) {
      if (combatState.costResources[i]) {
        combatState.costResources[i] = false;
        restored++;
      }
    }
    await target.setFlag('shuhai-dalu', 'combatState', combatState);
    return { success: true, restored };
  }

  // 其他资源类型...
}
```

---

## 🎯 重构策略

### 阶段1：准备工作（半天）

**目标**: 梳理现有调用点，准备兼容层

**任务**:
1. 搜索所有调用 `activity-service.mjs` 的地方
2. 搜索所有调用 `activity-executor.mjs` 的地方
3. 创建调用点清单
4. 设计兼容接口

**搜索命令**:
```bash
# 搜索 activity-service 调用
grep -r "triggerItemActivities" module/

# 搜索 activity-executor 调用
grep -r "ActivityExecutor" module/
grep -r "executeActivities" module/
```

### 阶段2：核心重构（2天）

**目标**: 重构 `activity-executor.mjs` 支持新格式

**任务**:
1. **更新 `execute()` 方法**
   - 支持新的 `trigger` 对象格式
   - 集成表达式解析
   - 支持次数限制检查（在执行前）

2. **重构 `handleConsume()`**
   - 支持 `consume.mode`（`none`, `mandatory`, `optional`）
   - 支持 `consume.options`（可选消耗二选一/三选一）
   - 创建消耗选择对话框（如果有多个选项）

3. **扩展 `checkCondition()`**
   - 添加 `resourceCount` 条件类型
   - 添加 `healthPercent` 条件类型
   - 添加 `customExpression` 条件类型

4. **重构 `executeEffect()`**
   - 支持所有效果类型（8种）
   - 集成表达式解析（layers, strength, formula）
   - 支持骰子表达式（`"1d4+3"`）

5. **添加 `shouldTrigger()`**
   - 检查 `trigger.type`
   - 检查 `trigger.category`（攻击类别过滤）
   - 检查 `trigger.passive`（被动触发）

### 阶段3：效果实现（1.5天）

**目标**: 实现所有效果类型

**任务**:
1. `executeAddBuff()` - 添加 BUFF
2. `executeConsumeBuff()` - 消耗 BUFF
3. `executeHeal()` - 恢复生命
4. `executeDealDamage()` - 造成伤害
5. `executeModifyDice()` - 修改骰子
6. `executeRestoreResource()` - 恢复资源
7. `executeDeductResource()` - 扣除资源
8. `executeCustomBuff()` - 自定义 BUFF

**每个效果实现要点**:
- 目标解析（`self`, `selected`, `opponent`, 等）
- 表达式解析（layers, strength, formula, count）
- 错误处理（资源不足、目标不存在等）
- 日志输出（方便调试）
- 返回结果（成功/失败、具体数值）

### 阶段4：兼容层和集成（1天）

**目标**: 保留旧接口，渐进式迁移

**任务**:
1. **重写 `activity-service.mjs`**
   - 调用新的 `ActivityExecutor.execute()`
   - 保留旧的函数签名（向后兼容）
   - 自动转换旧格式到新格式（使用迁移工具）

2. **更新调用点**
   - 逐步替换为新接口
   - 优先替换核心战斗逻辑（`combat-effects.mjs`, `combat-area.mjs`）
   - 保留向后兼容层

3. **集成到 Actor/Item**
   - 在 `actor.mjs` 中添加 `executeActivities()` 方法
   - 在 `item.mjs` 中添加 `triggerActivities()` 方法
   - 统一触发接口

### 阶段5：测试和优化（半天）

**目标**: 全面测试，确保功能正常

**任务**:
1. 创建测试脚本（参考 `test-activity-migration.mjs`）
2. 测试所有效果类型
3. 测试复杂消耗模式
4. 测试表达式解析
5. 测试被动触发
6. 测试次数限制
7. 性能优化（如果需要）

---

## 🔧 关键技术点

### 1. **上下文对象设计**

上下文对象包含执行所需的所有信息：

```javascript
const context = {
  // 核心对象
  actor: sourceActor,           // 触发源角色
  target: targetActor,          // 目标角色
  item: item,                   // 触发的物品

  // 战斗数据
  combat: game.combat,          // 当前战斗
  round: game.combat?.round,    // 当前回合

  // 骰子数据（如果有）
  dice: {
    roll: roll,                 // Roll 对象
    total: roll.total,          // 总值
    dice: roll.dice,            // 骰子详情
    finalValue: finalValue      // 最终值（应用 BUFF 后）
  },

  // 触发信息
  triggerType: 'onUse',         // 触发类型
  attackCategory: 'slash',      // 攻击类别（如果适用）

  // 消耗信息
  consumed: false,              // 是否已消耗资源
  selectedOption: null,         // 选中的消耗选项

  // 工具方法
  getTarget(targetType) {       // 获取目标
    switch (targetType) {
      case 'self': return this.actor;
      case 'selected': return this.target;
      case 'opponent': return this.target;
      // ... 其他目标类型
    }
  },

  getBuff(buffId, targetType = 'self') {  // 获取 BUFF
    const target = this.getTarget(targetType);
    return target?.getBuff?.(buffId);
  }
};
```

### 2. **消耗选择对话框**

当有多个可选消耗选项时，弹出对话框让用户选择：

```javascript
async showConsumeChoiceDialog(options, context) {
  return new Promise((resolve) => {
    const content = `
      <div class="consume-choice-dialog">
        <p>选择消耗方式：</p>
        ${options.map((option, index) => `
          <div class="option" data-index="${index}">
            <input type="radio" name="consume-choice" value="${index}" id="option-${index}" />
            <label for="option-${index}">
              ${this.formatConsumeOption(option)}
            </label>
          </div>
        `).join('')}
      </div>
    `;

    new Dialog({
      title: '选择消耗',
      content,
      buttons: {
        confirm: {
          label: '确认',
          callback: (html) => {
            const selected = html.find('input[name="consume-choice"]:checked').val();
            resolve(options[selected]);
          }
        },
        cancel: {
          label: '取消',
          callback: () => resolve(null)
        }
      },
      default: 'confirm'
    }).render(true);
  });
}

formatConsumeOption(option) {
  // 格式化消耗选项为可读文本
  // 例如：[{ type: 'buff', buffId: 'charge', layers: 5 }]
  // 输出："消耗 5 层【充能】"
  return option.map(resource => {
    if (resource.type === 'buff') {
      const buffName = game.i18n.localize(`SHUHAI.Buff.${resource.buffId}`);
      return `${resource.layers} 层【${buffName}】`;
    } else if (resource.type === 'resource') {
      return `${resource.count} 个 ${resource.resourceType}`;
    }
  }).join(' 或 ');
}
```

### 3. **表达式解析流程**

```javascript
// 完整的表达式解析流程
async parseEffectValue(value, context) {
  // 1. 数字直接返回
  if (typeof value === 'number') {
    return value;
  }

  // 2. 空值返回 0
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // 3. 字符串处理
  const strValue = String(value).trim();

  // 4. 纯数字字符串
  if (/^\d+$/.test(strValue)) {
    return parseInt(strValue);
  }

  // 5. 骰子表达式（如 "1d4+3", "2d6"）
  if (/\d+d\d+/.test(strValue)) {
    const roll = await new Roll(strValue).evaluate();
    return roll.total;
  }

  // 6. 变量引用（如 "{burn.layers}", "floor({charge.layers}/2)"）
  if (/\{[^}]+\}/.test(strValue)) {
    return ExpressionParser.parse(strValue, context);
  }

  // 7. 其他尝试转换为数字
  return parseFloat(strValue) || 0;
}
```

### 4. **效果批处理**

支持单个 Activity 触发多个效果：

```javascript
async executeEffects(effects, context) {
  const results = [];

  for (const effect of effects) {
    try {
      const result = await this.executeEffect(effect, context);
      results.push({
        effect,
        result,
        success: result.success !== false
      });

      // 如果效果失败且是关键效果，可以选择停止执行
      if (!result.success && effect.critical) {
        console.warn('【Activity执行】关键效果失败，停止执行');
        break;
      }
    } catch (error) {
      console.error('【Activity执行】效果执行异常:', effect, error);
      results.push({
        effect,
        result: { success: false, error: error.message },
        success: false
      });
    }
  }

  return results;
}
```

### 5. **次数限制优化**

将次数限制检查移到执行前，避免无效执行：

```javascript
static async execute(activity, context) {
  // 1. 检查次数限制（在执行前）
  if (activity.usageLimit) {
    const canUse = await this.checkUsageLimit(activity, context);
    if (!canUse) {
      return { success: false, reason: '次数限制' };
    }
  }

  // 2. 检查触发条件
  if (!this.shouldTrigger(activity, context)) {
    return { success: false, reason: '触发条件不满足' };
  }

  // 3. 检查前置条件
  if (!await this.checkConditions(activity.conditions, context)) {
    return { success: false, reason: '前置条件不满足' };
  }

  // 4. 处理消耗
  const consumeResult = await this.handleConsume(activity.consume, context);
  if (activity.consume?.mode === 'mandatory' && !consumeResult.success) {
    return { success: false, reason: '资源不足' };
  }

  // 5. 执行效果
  const effectResults = await this.executeEffects(activity.effects, context);

  // 6. 更新次数限制（在执行后）
  if (activity.usageLimit) {
    await this.updateUsageCount(activity, context);
  }

  return { success: true, effectResults };
}
```

---

## 🔗 与其他模块的集成

### 1. **与 `actor.mjs` 的集成**

在 `actor.mjs` 中添加统一的 Activity 执行方法：

```javascript
// module/documents/actor.mjs

import { ActivityExecutor, createContext } from '../helpers/activity-executor.mjs';

/**
 * 执行角色的 Activities
 * @param {string} triggerType - 触发类型
 * @param {Object} contextData - 上下文数据
 */
async executeActivities(triggerType, contextData = {}) {
  console.log('【Actor】执行 Activities:', this.name, triggerType);

  // 收集所有装备的 Items 的 Activities
  const allActivities = [];

  for (const item of this.items) {
    // 只检查装备的 Items
    if (!item.system.equipped) continue;

    const activities = item.system.activities || {};
    for (const [id, activity] of Object.entries(activities)) {
      allActivities.push({ item, activity });
    }
  }

  // 创建上下文
  const context = createContext(
    this,                          // actor
    contextData.target || null,    // target
    null,                          // item（单个 Activity 执行时会更新）
    contextData.dice || null,      // dice
    game.combat                    // combat
  );
  context.triggerType = triggerType;
  context.attackCategory = contextData.attackCategory;

  // 执行匹配的 Activities
  const results = [];
  for (const { item, activity } of allActivities) {
    // 更新上下文中的 item
    context.item = item;

    // 执行 Activity
    const result = await ActivityExecutor.execute(activity, context);
    if (result.success) {
      results.push({ item, activity, result });
    }
  }

  console.log('【Actor】执行完成，触发了', results.length, '个 Activities');
  return results;
}
```

### 2. **与 `combat-effects.mjs` 的集成**

在战斗效果处理中调用 Activity 系统：

```javascript
// module/services/combat-effects.mjs

// 在攻击时触发
async function onAttackRoll(actor, item, roll) {
  // 触发 onAttack Activities
  await actor.executeActivities('onAttack', {
    item,
    dice: { roll, total: roll.total },
    attackCategory: item.system.category  // 斩击/突刺/打击
  });
}

// 在命中时触发
async function onHit(attacker, defender, damage, item) {
  // 触发攻击者的 onHit Activities
  await attacker.executeActivities('onHit', {
    target: defender,
    item,
    attackCategory: item.system.category
  });

  // 触发防御者的 onDamaged Activities
  await defender.executeActivities('onDamaged', {
    target: attacker,
    damage
  });
}

// 在回合开始时触发
async function onTurnStart(actor) {
  await actor.executeActivities('onTurnStart');
}

// 在回合结束时触发
async function onTurnEnd(actor) {
  await actor.executeActivities('onTurnEnd');
}
```

### 3. **与 `effect-registry.mjs` 的关系**

**注意**: `effect-registry.mjs` 处理的是 BUFF 的触发效果（如燃烧、流血、破裂），与 Activity 的效果是不同的：

- **Activity 效果**: 在 Activity 触发时执行的效果（如添加 BUFF、造成伤害）
- **BUFF 效果**: BUFF 自身的触发效果（如燃烧在回合结束时造成伤害）

**不要混淆**:
- `ActivityExecutor.executeEffect()` - 执行 Activity 的效果
- `EffectRegistry.onDamaged.burn()` - 执行 BUFF 的触发效果

**正确使用**:
```javascript
// Activity 效果：添加燃烧 BUFF
await ActivityExecutor.execute({
  effects: [
    { type: 'addBuff', buffId: 'burn', layers: 3, strength: 5 }
  ]
}, context);

// 之后在回合结束时，燃烧 BUFF 触发
// combat-effects.mjs 调用 effect-registry.mjs
await EffectRegistry.onTurnEnd.burn(actor, buff, context);
```

### 4. **与 `buff-types.mjs` 的关系**

**重要**: `buff-types.mjs` 完全不修改！

Activity 系统只需要：
- 读取 BUFF 定义（通过 `findBuffById()`）
- 使用 BUFF ID（在效果中引用）
- 调用 Actor 的 BUFF 方法（`addBuff()`, `consumeBuff()`）

**示例**:
```javascript
import { findBuffById } from '../constants/buff-types.mjs';

// 在 executeAddBuff 中验证 BUFF 是否存在
async executeAddBuff(effect, context) {
  const buffDef = findBuffById(effect.buffId);
  if (!buffDef) {
    console.warn('【Activity执行】未知的 BUFF ID:', effect.buffId);
    return { success: false, reason: '未知 BUFF' };
  }

  // 继续执行...
}
```

---

## 🧪 测试要点

### 1. **单元测试**

创建 `test-activity-executor.mjs`：

```javascript
// 测试条件检查
async function testConditionCheck() {
  const actor = game.actors.getName('测试角色');
  await actor.addBuff('charge', 5, 0, 'current');

  const context = createContext(actor, null, null, null, null);

  // 测试 hasBuff
  const result1 = await ActivityExecutor.checkCondition({
    type: 'hasBuff',
    buffId: 'charge'
  }, context);
  console.log('hasBuff 测试:', result1 === true ? '✅' : '❌');

  // 测试 buffLayer
  const result2 = await ActivityExecutor.checkCondition({
    type: 'buffLayer',
    buffId: 'charge',
    operator: '>=',
    value: 3
  }, context);
  console.log('buffLayer >= 3 测试:', result2 === true ? '✅' : '❌');
}

// 测试消耗处理
async function testConsumeHandling() {
  const actor = game.actors.getName('测试角色');
  await actor.addBuff('chant', 10, 0, 'current');

  const context = createContext(actor, null, null, null, null);

  // 测试强制消耗
  const result = await ActivityExecutor.handleConsume({
    mode: 'mandatory',
    resources: [
      { type: 'buff', buffId: 'chant', layers: 4 }
    ],
    options: []
  }, context);

  console.log('强制消耗测试:', result.success ? '✅' : '❌');

  const remainingChant = actor.getBuff('chant');
  console.log('剩余吟唱层数:', remainingChant.layers, '(应该是 6)');
}

// 测试表达式解析
async function testExpressionParsing() {
  const actor = game.actors.getName('测试角色');
  await actor.addBuff('burn', 12, 0, 'current');

  const context = createContext(actor, null, null, null, null);

  // 测试变量引用
  const result1 = await ActivityExecutor.parseEffectValue('{burn.layers}', context);
  console.log('变量引用测试:', result1 === 12 ? '✅' : '❌', `(${result1})`);

  // 测试函数表达式
  const result2 = await ActivityExecutor.parseEffectValue('floor({burn.layers}/4)', context);
  console.log('函数表达式测试:', result2 === 3 ? '✅' : '❌', `(${result2})`);

  // 测试骰子表达式
  const result3 = await ActivityExecutor.parseEffectValue('1d4+3', context);
  console.log('骰子表达式测试:', result3 >= 4 && result3 <= 7 ? '✅' : '❌', `(${result3})`);
}

// 测试完整执行
async function testFullExecution() {
  const actor = game.actors.getName('测试角色');
  const activity = {
    _id: 'test',
    name: '测试活动',
    trigger: { type: 'onUse', passive: false, category: null },
    conditions: [],
    consume: { mode: 'none', resources: [], options: [] },
    effects: [
      { type: 'addBuff', buffId: 'strong', layers: 2, target: 'self', roundTiming: 'current' },
      { type: 'addBuff', buffId: 'guard', layers: 3, target: 'self', roundTiming: 'current' }
    ],
    usageLimit: null
  };

  const context = createContext(actor, null, null, null, null);
  context.triggerType = 'onUse';

  const result = await ActivityExecutor.execute(activity, context);
  console.log('完整执行测试:', result.success ? '✅' : '❌');
  console.log('效果结果:', result.effectResults);

  console.log('强壮层数:', actor.getBuff('strong')?.layers);
  console.log('守护层数:', actor.getBuff('guard')?.layers);
}
```

### 2. **集成测试**

测试与其他系统的集成：

```javascript
// 测试战斗集成
async function testCombatIntegration() {
  // 1. 创建测试 Actor
  const actor = game.actors.getName('测试角色');

  // 2. 创建测试 Item（带 Activity）
  const item = await Item.create({
    name: '测试武器',
    type: 'combatDice',
    system: {
      equipped: true,
      category: 'slash',
      activities: {
        'test-activity': {
          _id: 'test-activity',
          name: '命中时添加燃烧',
          trigger: { type: 'onHit', passive: false, category: 'slash' },
          conditions: [],
          consume: { mode: 'none', resources: [], options: [] },
          effects: [
            { type: 'addBuff', buffId: 'burn', layers: 3, strength: 5, target: 'opponent', roundTiming: 'current' }
          ]
        }
      }
    }
  }, { parent: actor });

  // 3. 模拟命中
  const target = game.actors.getName('测试敌人');
  await actor.executeActivities('onHit', {
    target,
    item,
    attackCategory: 'slash'
  });

  // 4. 验证
  const burnBuff = target.getBuff('burn');
  console.log('燃烧 BUFF:', burnBuff);
  console.log('集成测试:', burnBuff && burnBuff.layers === 3 ? '✅' : '❌');
}
```

### 3. **边界测试**

```javascript
// 测试资源不足
async function testInsufficientResources() {
  const actor = game.actors.getName('测试角色');
  // 只有 2 层吟唱
  await actor.addBuff('chant', 2, 0, 'current');

  const result = await ActivityExecutor.handleConsume({
    mode: 'mandatory',
    resources: [
      { type: 'buff', buffId: 'chant', layers: 4 }  // 需要 4 层
    ]
  }, createContext(actor, null, null, null, null));

  console.log('资源不足测试:', !result.success ? '✅' : '❌');
}

// 测试次数限制
async function testUsageLimit() {
  const actor = game.actors.getName('测试角色');
  const activity = {
    _id: 'limited-activity',
    name: '限制活动',
    trigger: { type: 'onUse' },
    conditions: [],
    consume: { mode: 'none' },
    effects: [],
    usageLimit: { perRound: 1 }
  };

  const context = createContext(actor, null, null, null, game.combat);
  context.triggerType = 'onUse';

  // 第一次执行
  const result1 = await ActivityExecutor.execute(activity, context);
  console.log('第一次执行:', result1.success ? '✅' : '❌');

  // 第二次执行（同一回合）
  const result2 = await ActivityExecutor.execute(activity, context);
  console.log('次数限制测试:', !result2.success ? '✅' : '❌');
}
```

---

## ⚠️ 风险和解决方案

### 风险1：破坏现有功能

**风险**: 重构可能导致现有的 Activity 系统失效

**解决方案**:
1. ✅ 保留兼容层（`activity-service.mjs` 调用新引擎）
2. ✅ 渐进式迁移（逐步替换调用点）
3. ✅ 自动迁移旧数据（Phase 1 已完成）
4. ✅ 全面测试（覆盖所有触发点）

### 风险2：性能问题

**风险**: 表达式解析和复杂逻辑可能影响性能

**解决方案**:
1. 缓存解析结果（同一回合内相同表达式）
2. 延迟计算（只在需要时解析）
3. 批处理（合并多个 Activity 的执行）
4. 性能监控（记录执行时间）

```javascript
// 示例：表达式缓存
const expressionCache = new Map();

async parseEffectValue(value, context) {
  // 生成缓存键
  const cacheKey = `${value}_${context.combat?.round}_${context.actor.id}`;

  // 检查缓存
  if (expressionCache.has(cacheKey)) {
    return expressionCache.get(cacheKey);
  }

  // 计算
  const result = await this._parseEffectValueUncached(value, context);

  // 缓存
  expressionCache.set(cacheKey, result);

  return result;
}
```

### 风险3：用户体验问题

**风险**: 消耗选择对话框可能打断游戏流程

**解决方案**:
1. 智能选择（如果只有一个可用选项，自动选择）
2. 记住选择（同一 Activity 在同一战斗中记住用户选择）
3. 快捷键支持（1/2/3 选择选项）
4. 超时自动选择（5秒后自动选择第一个）

```javascript
// 示例：记住选择
const consumeChoiceMemory = new Map();

async showConsumeChoiceDialog(options, context, activity) {
  // 检查是否记住了选择
  const memoryKey = `${activity._id}_${context.combat?.id}`;
  if (consumeChoiceMemory.has(memoryKey)) {
    const rememberedIndex = consumeChoiceMemory.get(memoryKey);
    return options[rememberedIndex];
  }

  // 显示对话框
  const selected = await this._showDialog(options);

  // 记住选择
  const selectedIndex = options.indexOf(selected);
  consumeChoiceMemory.set(memoryKey, selectedIndex);

  return selected;
}
```

### 风险4：与 buff-types.mjs 的冲突

**风险**: 不小心修改了 buff-types.mjs

**解决方案**:
1. ✅ **绝对不修改** `buff-types.mjs`
2. ✅ 只读取 BUFF 定义（使用 `findBuffById()`）
3. ✅ 使用 Actor 方法操作 BUFF（`addBuff()`, `consumeBuff()`）
4. ✅ Code review 检查

### 风险5：兼容性问题

**风险**: 新旧格式共存可能导致数据不一致

**解决方案**:
1. ✅ Phase 1 的自动迁移（已实现）
2. ✅ `isNewFormat()` 检测（避免重复迁移）
3. ✅ 执行引擎同时支持新旧格式（临时）
4. ✅ 逐步淘汰旧格式支持

---

## 📝 实施检查清单

### 开始前

- [ ] 备份当前代码
- [ ] 创建 Phase 2 分支
- [ ] 搜索所有 Activity 调用点
- [ ] 阅读相关代码（actor.mjs, combat-effects.mjs）

### 核心重构

- [ ] 更新 `ActivityExecutor.execute()`
- [ ] 重构 `handleConsume()`
- [ ] 扩展 `checkCondition()`
- [ ] 重构 `executeEffect()`
- [ ] 添加 `shouldTrigger()`
- [ ] 添加 `parseEffectValue()`

### 效果实现

- [ ] `executeAddBuff()`
- [ ] `executeConsumeBuff()`
- [ ] `executeHeal()`
- [ ] `executeDealDamage()`
- [ ] `executeModifyDice()`
- [ ] `executeRestoreResource()`
- [ ] `executeDeductResource()`
- [ ] `executeCustomBuff()`

### 集成

- [ ] 更新 `activity-service.mjs`（兼容层）
- [ ] 在 `actor.mjs` 中添加 `executeActivities()`
- [ ] 更新 `combat-effects.mjs` 调用
- [ ] 更新其他调用点

### 测试

- [ ] 创建测试脚本
- [ ] 单元测试（各个方法）
- [ ] 集成测试（与战斗系统）
- [ ] 边界测试（资源不足、次数限制）
- [ ] 性能测试

### 文档

- [ ] 更新 CLAUDE.md
- [ ] 创建 Phase 2 完成报告
- [ ] 添加代码注释

---

## 🎯 成功标准

Phase 2 完成的标准：

1. ✅ **功能完整**: 所有 8 种效果类型都能正确执行
2. ✅ **向后兼容**: 旧代码仍能正常工作
3. ✅ **表达式支持**: 所有表达式类型都能正确解析
4. ✅ **消耗模式**: 复杂消耗模式（可选二选一/三选一）正常工作
5. ✅ **被动触发**: 被动 Activity 和类别过滤正常工作
6. ✅ **次数限制**: perRound 和 perCombat 限制正常工作
7. ✅ **测试通过**: 所有测试用例通过
8. ✅ **无破坏**: buff-types.mjs 完全未修改
9. ✅ **文档齐全**: 代码注释和文档完整

---

**祝重构顺利！** 🚀
