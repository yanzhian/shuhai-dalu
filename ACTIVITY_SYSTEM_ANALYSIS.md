# Activity 系统连通性分析报告

**生成日期**: 2025-11-17
**分析范围**: activity-types, activity-editor, activity-executor, effect-registry, activity-service

---

## 🔴 严重问题

### 1. **数据模型不一致**

#### 问题描述
activity-editor 和实际执行引擎使用的数据结构不同：

**activity-editor.mjs 使用的结构**:
```javascript
{
  _id: "...",
  name: "活动名称",
  trigger: "onUse",
  hasConsume: true,
  consumes: [
    { buffId: "charge", layers: 1, strength: 0 }
  ],
  target: "selected",
  roundTiming: "current",
  effects: {
    "strong": { layers: 1, strength: 0 }
  },
  effectsList: [  // 编辑器内部使用
    { buffId: "strong", layers: 1, strength: 0 }
  ]
}
```

**activity-executor.mjs 期望的结构**:
```javascript
{
  _id: "...",
  name: "活动名称",
  trigger: "onUse",
  consume: {  // ❌ 不是 hasConsume + consumes
    type: "mandatory",  // or "optional"
    resources: [
      { type: "buff", buffId: "charge", layers: 1 }
    ]
  },
  conditions: [  // ❌ 编辑器不支持
    { type: "hasBuff", buffId: "strong" }
  ],
  effects: [  // ❌ 是数组，不是对象
    { type: "addBuff", buffId: "strong", layers: 1, target: "self" }
  ]
}
```

#### 影响
- **编辑器保存的数据无法被执行引擎正确解析**
- **activity-service 使用的是简化版本，与两者都不兼容**
- **导致用户创建的活动无法正常工作**

---

### 2. **效果类型系统混乱**

#### 问题描述

**三种效果定义方式同时存在**:

1. **effect-registry.mjs**: 定义了完整的效果类型系统
   - `addBuff`, `consumeBuff`, `dealDamage`, `healHealth` 等
   - 每个效果有详细的 `fields` 和 `execute` 方法

2. **activity-editor.mjs**: 只支持 BUFF 效果
   - 仅支持从预设的 BUFF 列表选择
   - 只能设置 `layers` 和 `strength`

3. **activity-service.mjs**: 只处理 BUFF 添加
   - 完全不使用 effect-registry
   - 只调用 `actor.addBuff()`

#### 影响
- **编辑器无法创建 effect-registry 定义的高级效果**
- **effect-registry 中的大量效果类型无法使用** (`dealDamage`, `healHealth`, `replaceDice`, 等)
- **用户只能通过手写 JSON 才能使用高级效果**

---

### 3. **触发类型定义不统一**

#### 问题对比

| 文件 | 定义位置 | 差异 |
|------|---------|------|
| **activity-types.mjs** | `TRIGGER_TYPES` | 定义了 19 种触发类型 |
| **模板文件** | `activity-editor-enhanced.hbs` | 只列出了 11 种触发类型 |
| **item.mjs schema** | `conditions.trigger.choices` | 定义了 12 种触发类型 |

**缺失的触发类型** (在 activity-types.mjs 有，但模板中没有):
- `onEquip` (装备时)
- `onUnequip` (卸下时)
- `onKill` (击杀时)
- `onDeath` (死亡时)
- `onRoundStart` (回合开始时) - 模板中是 `onTurnStart`
- `onRoundEnd` (回合结束时) - 模板中是 `onTurnEnd`
- `onCombatStart` (战斗开始时)
- `onCombatEnd` (战斗结束时)
- `onTremorExplode` (震颤引爆时)
- `onBuffApplied` (BUFF应用时)
- `onBuffRemoved` (BUFF移除时)

#### 影响
- **用户无法通过 UI 选择某些触发类型**
- **命名不一致导致混乱** (`onTurnStart` vs `onRoundStart`)
- **现有代码可能使用了错误的触发类型名称**

---

### 4. **执行流程断层**

#### 当前存在三套执行流程

**流程 A: activity-service.mjs** (简化版)
```
triggerItemActivities()
  → 筛选匹配的 activities
  → 直接调用 actor.addBuff()
  → 只支持 BUFF 添加
```

**流程 B: ActivityExecutor** (完整版)
```
ActivityExecutor.execute()
  → checkConditions()
  → handleConsume()
  → executeEffect() (通过 effect-registry)
  → updateUsageCount()
```

**流程 C: 实际使用** (混乱版)
- `counter-area.mjs`: 使用 `triggerItemActivities`
- `special-dice-dialog.mjs`: 使用 `triggerItemActivities`
- `player-sheet.mjs`: 使用 `ActivityExecutor.execute()`

#### 影响
- **功能差异巨大**: activity-service 只能添加 BUFF，ActivityExecutor 可以执行所有效果
- **没有统一的执行入口**
- **不同地方触发同一个 activity 会有不同的结果**

---

## 🟡 中等问题

### 5. **编辑器功能严重受限**

#### 基础编辑器的限制
- ❌ 不支持条件系统 (conditions)
- ❌ 不支持次数限制 (usageLimit)
- ❌ 不支持特殊机制 (specialMechanics)
- ❌ 不支持选择效果类型，只能选 BUFF
- ❌ 不支持设置效果的 target（虽然有目标选项，但只应用于整个 activity）
- ❌ 不支持 effect-registry 中的任何高级效果

#### 高级模式的问题
- ✅ 可以编辑 JSON
- ❌ 没有字段自动补全
- ❌ 没有实时验证
- ❌ 没有文档说明
- ❌ 验证功能不完整

---

### 6. **目标系统混乱**

#### activity-types.mjs 定义
```javascript
TARGET_TYPES = {
  SELF: 'self',
  SELECTED: 'selected',
  TARGET: 'target',  // 与 selected 相同
  ALL_ENEMIES: 'allEnemies',
  ALL_ALLIES: 'allAllies',
  ALL: 'all',
  RANDOM_ENEMY: 'randomEnemy',
  RANDOM_ALLY: 'randomAlly',
  ADJACENT: 'adjacent'
}
```

#### 实际支持
- **activity-editor**: 只支持 `selected`, `self`, `multiple`
- **activity-service**: 只支持 `self` 和 `selected`
- **effect-registry**: 每个效果都有自己的 `target` 字段

#### 问题
- **activity 级别的 target 和 effect 级别的 target 冲突**
- **大部分目标类型没有实现**
- **编辑器 UI 中的 "multiple" 没有对应的处理逻辑**

---

### 7. **表达式解析器未集成**

#### 现状
- `expression-parser.mjs` 定义了完整的表达式系统
- 支持 `{buff.layers}`, `floor()`, `ceil()` 等
- **但只在 effect-registry 的效果中使用**

#### 问题
- **activity-service 不使用表达式解析器**
- **直接使用 `parseInt()` 处理数值**
- **用户在基础编辑器中输入的表达式会被当作字符串**

---

### 8. **roundTiming 实现不一致**

#### 定义
```javascript
ROUND_TIMING = {
  CURRENT: 'current',
  NEXT: 'next',
  BOTH: 'both'
}
```

#### 实际使用
- **activity-editor**: 支持设置 `roundTiming`
- **activity-service**: 读取并传给 `actor.addBuff()`
- **activity-executor**: 不处理 `roundTiming`
- **effect-registry.addBuff**: 不传递 `roundTiming` 参数

#### 问题
- **effect-registry 和 activity-service 的实现不同**
- **如果使用 ActivityExecutor，roundTiming 会失效**

---

## 🟢 轻微问题

### 9. **条件类型定义但未使用**

`activity-types.mjs` 定义了 `CONDITION_TYPES`:
```javascript
{
  HAS_BUFF: 'hasBuff',
  BUFF_LAYER: 'buffLayer',
  HAS_COST: 'hasCost',
  ROUND_LIMIT: 'roundLimit',
  HP_PERCENT: 'hpPercent',
  CORRUPTION: 'corruption',
  ITEM_EQUIPPED: 'itemEquipped'
}
```

但 **编辑器完全不支持添加条件**。

---

### 10. **消耗类型定义但未使用**

`activity-types.mjs` 定义了 `CONSUME_TYPES`:
```javascript
{
  MANDATORY: 'mandatory',
  OPTIONAL: 'optional',
  NONE: 'none'
}
```

但 **编辑器中是 checkbox，没有类型选择**。

---

### 11. **数据迁移逻辑遗留问题**

item.mjs 中有 `_migrateConditionsToActivities()` 方法，但：
- 旧的 `conditions` schema 仍然存在于所有数据模型中
- 占用空间和增加复杂度
- 应该在迁移完成后移除

---

### 12. **文档和实际不符**

BUFF_PRESETS 在 `activity-editor.mjs` 中硬编码：
```javascript
const BUFF_PRESETS = [
  { id: 'strong', name: '强壮', ... },
  { id: 'fearSword', name: '惧剑', ... },
  { id: 'grandMagic', name: '宏伟法术', ... }
]
```

但应该从 `buff-types.mjs` 导入，确保一致性。

---

## 📊 数据流分析

### 当前的数据流（混乱版）

```
用户创建 Activity (基础编辑器)
  ↓
activity-editor.mjs 保存
  ↓
{
  effects: { "strong": { layers: 1 } },  // 对象格式
  hasConsume: true,
  consumes: [...]
}
  ↓
存储到 item.system.activities
  ↓
触发点 A: counter-area.mjs
  ↓
activity-service.triggerItemActivities()
  ↓
只能添加 BUFF，无法处理其他效果
```

```
用户创建 Activity (高级模式 JSON)
  ↓
activity-editor.mjs 保存
  ↓
{
  effects: [  // 数组格式
    { type: "addBuff", buffId: "strong", layers: 1 }
  ],
  consume: { type: "mandatory", resources: [...] }
}
  ↓
存储到 item.system.activities
  ↓
触发点 B: player-sheet.mjs
  ↓
ActivityExecutor.execute()
  ↓
完整执行，但与基础编辑器创建的数据不兼容
```

---

## 🎯 推荐解决方案

### 方案 A: 统一到 ActivityExecutor (推荐)

#### 优点
- 功能最完整
- 架构最清晰
- 支持所有高级特性

#### 改造步骤
1. **统一数据模型**: 让编辑器输出 ActivityExecutor 期望的格式
2. **升级编辑器**: 支持添加 conditions, effects (按类型), usageLimit
3. **替换 activity-service**: 所有地方使用 ActivityExecutor
4. **删除冗余代码**: 移除 activity-service.mjs

---

### 方案 B: 简化到 activity-service

#### 优点
- 代码简单
- 性能更好
- 适合当前需求

#### 改造步骤
1. **删除 activity-executor.mjs 和 effect-registry.mjs**
2. **增强 activity-service**: 支持更多效果类型
3. **简化编辑器**: 只保留基础功能
4. **重写文档**: 明确系统限制

---

### 方案 C: 混合方案

#### 策略
- **基础编辑器 → activity-service** (简单 BUFF 操作)
- **高级模式 → ActivityExecutor** (复杂效果)
- **根据 activity 的复杂度自动选择执行引擎**

#### 判断逻辑
```javascript
function shouldUseExecutor(activity) {
  return activity.conditions
    || activity.usageLimit
    || activity.effects?.some(e => e.type !== 'addBuff')
    || activity.consume?.type;
}
```

---

## 📝 详细问题清单

### activity-types.mjs
- [x] 定义完整
- [ ] 部分常量未被使用 (CONSUME_TYPES, CONDITION_TYPES)
- [ ] 触发类型与其他文件不一致

### activity-editor.mjs
- [ ] 数据结构与执行引擎不匹配
- [ ] 功能受限（无条件、无次数限制、无高级效果）
- [ ] BUFF_PRESETS 应从 buff-types.mjs 导入
- [ ] 高级模式缺少文档和验证
- [ ] `target` 只在 activity 级别，没有 effect 级别

### activity-executor.mjs
- [x] 架构设计良好
- [ ] 与编辑器输出的数据不兼容
- [ ] 实际使用率低

### effect-registry.mjs
- [x] 效果定义完整
- [ ] 编辑器无法创建这些效果
- [ ] `addBuff` 效果没有传递 `roundTiming`

### activity-service.mjs
- [ ] 功能过于简化
- [ ] 不使用 effect-registry
- [ ] 不使用表达式解析器
- [ ] 应该被统一的执行引擎替代

### 模板文件
- [ ] 触发类型列表不完整
- [ ] 目标类型与定义不符
- [ ] 缺少效果类型选择
- [ ] 缺少条件编辑器
- [ ] 缺少次数限制设置

---

## 🚀 优先级建议

### P0 (立即修复)
1. **统一数据模型**: 决定使用哪种格式，全局统一
2. **修复执行流程**: 确保所有触发点使用相同的执行逻辑
3. **修复编辑器输出**: 让保存的数据能被正确执行

### P1 (近期完成)
4. **统一触发类型**: 修改模板和 schema，与 activity-types.mjs 一致
5. **整合 BUFF 定义**: 从 buff-types.mjs 导入，不要硬编码
6. **完善编辑器**: 支持条件、次数限制、效果类型选择

### P2 (功能增强)
7. **增强表达式支持**: 在所有执行路径中使用表达式解析器
8. **完善目标系统**: 实现所有目标类型
9. **添加文档**: 为高级模式提供完整的字段说明
10. **移除遗留代码**: 删除旧的 conditions schema

---

## 📞 需要你确认的问题

1. **你希望系统有多复杂？**
   - 简单系统: 只支持 BUFF，快速上手
   - 复杂系统: 支持所有效果类型，功能强大

2. **优先级是什么？**
   - 快速修复，让现有功能正常工作
   - 还是完整重构，实现所有设计的功能

3. **用户群体？**
   - 主要是自己使用 → 可以接受手写 JSON
   - 给其他玩家使用 → 需要友好的编辑器

4. **时间预算？**
   - 快速修复: 1-2 天
   - 完整重构: 1-2 周

---

**报告生成**: Claude (Sonnet 4.5)
**分析日期**: 2025-11-17
