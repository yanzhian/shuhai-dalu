# CLAUDE.md - AI Assistant Development Guide

## Project Overview

**书海大陆-瓦哈娜 (Shuhai Dalu - Vahana)** is a Foundry VTT game system implementing a custom Chinese TRPG system.

- **System ID**: `shuhai-dalu`
- **Version**: 2.0.0
- **Foundry Compatibility**: v13+ (verified: v13.5)
- **Language**: JavaScript ES6 Modules (.mjs)
- **Localization**: 简体中文 (zh-CN)
- **Codebase Size**: ~12,640+ lines across 21 modules

### Key Features
- Dual-dice check system (Hope vs Corruption)
- Complex BUFF/debuff system with round timing mechanics
- Activity-based conditional triggers
- Dice-based combat with counter/accept mechanics
- Skill point pools and Starlight resource management
- Resistance/weakness system for armor

---

## Technology Stack

### Core Technologies
- **Foundry VTT API v13**: Document-based architecture
- **JavaScript ES6 Modules**: Native .mjs files (no build process)
- **Handlebars**: Template engine for UI
- **CSS3**: Styling with custom properties

### No Build Process
- Pure ES6 modules loaded directly by Foundry
- No compilation, bundling, or transpilation
- Hot reload enabled for CSS, HBS, and JSON files
- JavaScript changes require F5 refresh

### Dependencies
- **Zero external npm packages**
- Relies entirely on Foundry VTT's built-in APIs
- Uses Foundry's DataModel, Document, Application classes

---

## Directory Structure

```
shuhai-dalu/
├── module/                      # Core JavaScript modules
│   ├── shuhai-dalu.mjs         # Main entry point (2,014 lines)
│   │
│   ├── applications/           # UI Applications
│   │   ├── combat-area.mjs     # Individual combat interface
│   │   ├── counter-area.mjs    # Counter/accept dialog
│   │   ├── battle-area-hud.mjs # Player party HUD
│   │   └── enemy-battle-area-hud.mjs # Enemy HUD
│   │
│   ├── constants/              # System Constants
│   │   ├── buff-types.mjs      # BUFF definitions
│   │   └── activity-types.mjs  # Activity triggers/targets
│   │
│   ├── data/                   # Data Models
│   │   └── CharacterData.mjs   # Character schema (265 lines)
│   │
│   ├── documents/              # Document Extensions
│   │   ├── actor.mjs           # Actor logic (588 lines)
│   │   └── item.mjs            # Item logic (1,125 lines)
│   │
│   ├── helpers/                # Utility Functions
│   │   ├── effect-registry.mjs # Effect implementations
│   │   ├── expression-parser.mjs # Dynamic expression evaluation
│   │   └── activity-executor.mjs # Activity execution engine
│   │
│   ├── services/               # Business Logic
│   │   └── combat-effects.mjs  # Combat effect processing
│   │
│   └── sheets/                 # Sheet Classes
│       ├── actor-sheet.mjs     # Base actor sheet
│       ├── player-sheet.mjs    # Player-specific sheet
│       ├── item-sheet.mjs      # Item editor
│       └── item-card-sheet.mjs # Item card view
│
├── templates/                  # Handlebars Templates
│   ├── actor/                  # Character sheets
│   ├── chat/                   # Chat message templates
│   ├── combat/                 # Combat UI templates
│   ├── dialog/                 # Dialog templates
│   ├── hud/                    # HUD overlay templates
│   └── item/                   # Item sheets & partials
│
├── styles/                     # CSS Stylesheets
│   ├── shuhai-dalu.css        # Main styles
│   ├── player-sheet.css       # Character sheet styles
│   ├── combat-area.css        # Combat UI styles
│   └── [others].css           # Component-specific styles
│
├── lang/                       # Localization
│   └── zh-CN.json             # Chinese translations
│
├── assets/                     # Icons and Images
│
├── system.json                 # System manifest
├── debug.mjs                   # Browser debugging script
└── README.md                   # Basic project info
```

---

## Core Architecture Patterns

### 1. Document-Driven Architecture

```
Foundry Document Layer
    ↓
Custom Document Classes (ShuhaiActor, ShuhaiItem)
    ↓
Data Models (CharacterData)
    ↓
Flag Storage (persistent state)
```

**Key Principle**: All persistent state is stored in Actor/Item flags, not in application instances.

### 2. Service Layer Pattern

```
User Action (UI Event)
    ↓
Application Event Handler
    ↓
Service Layer (combat-effects, activity-executor)
    ↓
Document Method (Actor/Item)
    ↓
Flag Update + Render
```

### 3. Activity System Architecture

The new activity system (v2.0) replaces the old condition system:

```javascript
Item.activities = {
  "activity-uuid": {
    name: String,
    trigger: "onUse" | "onAttack" | "onDamaged" | etc.,
    conditions: [
      { type: "hasBuff", buffId: "strong" },
      { type: "buffLayer", buffId: "charge", min: 3 }
    ],
    effects: [
      { type: "addBuff", buffId: "guard", target: "self", layers: 2 },
      { type: "dealDamage", formula: "2d6+{charge.layers}" }
    ],
    resourceCost: { costCount: 1, mandatory: true },
    usageLimit: { perRound: 1, perCombat: 3 }
  }
}
```

**Migration**: Old `conditions` arrays are automatically migrated to `activities` on system load.

---

## Domain Knowledge: TRPG Mechanics

### Character System

#### Attributes (1-30 scale)
- **力量 (Strength)**: Physical power
- **体质 (Constitution)**: Endurance, HP pool
- **敏捷 (Dexterity)**: Speed, reflexes
- **感知 (Perception)**: Awareness, corruption resistance
- **智力 (Intelligence)**: Knowledge, magic
- **魅力 (Charisma)**: Social influence

#### Derived Stats (Auto-calculated)
```javascript
HP = constitution×3 + strength + level×3
Corruption Max = perception/2 + intelligence/3
Chaos Max = constitution>10 ? HP/2 : HP/3
Speed = 4 + dexterity/3
Starlight = 10 + level×2 - starlightUsed
```

#### Skill Point Pools (prevents min-maxing)
- **Strength/Dex Pool**: strength + dexterity×3 + level×3
- **Intelligence Pool**: intelligence×4 + level×3
- **Perception Pool**: perception×4 + level×3
- **Charisma Pool**: charisma×3 + level×3

### Check System

All checks use **two d12s**:
- **Hope Die (blue)**: Represents positive outcomes
- **Corruption Die (red)**: Represents corruption influence

```
Roll = 1d12(Hope) + 1d12(Corruption) + Modifier
Success = Total ≥ DC

Result Interpretation:
- Hope == Corruption → CRITICAL SUCCESS (perfect balance)
- Hope > Corruption + Success → Hope Success
- Hope > Corruption + Fail → Hope Failure
- Hope < Corruption + Success → Corrupt Success
- Hope < Corruption + Fail → Corrupt Failure
```

### Combat System

#### Resources
- **Cost**: 6 slots, consumed when using combat dice
- **EX**: 3 slots, used for trigger dice activation
- **Starlight**: Equipment point pool

#### Combat Flow
1. **Initiative**: Uses `totalSpeed` (static value)
2. **Action**: Select combat dice from 6 equipped slots
3. **Consume Resources**: Mark Cost slots as used
4. **Roll Dice**: Custom formulas (e.g., "1d6+3", "2d8")
5. **Opponent Response**: Counter or Accept
6. **Resolution**: Apply damage/effects

#### Counter/Accept Mechanics

**Counter Option**:
```
Attacker rolls attack dice
Defender rolls defense dice
Compare totals (including BUFFs)
Loser takes winner's total as damage
Tie → Re-roll until winner
```

**Accept Option**:
```
Defender takes attack roll as damage
Apply armor resistances (×0.5, ×1, or ×2)
Skip defense roll (saves resources)
```

### BUFF System

#### One-Round BUFFs (cleared at round end)
- **强壮 (Strong)**: +layers to attack dice
- **虚弱 (Weak)**: -layers to attack dice
- **守护 (Guard)**: -layers to damage taken
- **易损 (Vulnerable)**: +layers to damage taken
- **迅捷 (Swift)**: +layers to speed
- **束缚 (Bound)**: -layers to speed
- **忍耐 (Endure)**: +layers to defense dice
- **破绽 (Flaw)**: -layers to defense dice

#### Effect BUFFs (persist, decay by layers)
- **破裂 (Rupture)**: Trigger when damaged → deal strength damage
- **流血 (Bleed)**: Trigger when attacking → deal strength damage
- **沉沦 (Corruption)**: Trigger when damaged → add corruption
- **燃烧 (Burn)**: Trigger at round end → deal strength damage
- **呼吸 (Breath)**: Enable critical hits (dice+strength > 15/20)
- **充能 (Charge)**: Resource for abilities
- **震颤 (Tremor)**: Explode for chaos damage
- **弹药 (Ammo)**: Consumable resource
- **吟唱 (Chant)**: Resource for spells
- **麻痹 (Paralyze)**: Halve next attack

#### Round Timing System
```javascript
roundTiming: "current" | "next" | "both"
```

**Round Advancement**:
1. Clear one-round BUFFs (strong, weak, guard, etc.)
2. Trigger round-end effects (burn damage)
3. Decrement effect BUFF layers
4. Merge "next" buffs into "current"

### Item Types

1. **combatDice** / **shootDice**: Attack dice
   - Categories: 打击 (Blunt), 突刺 (Pierce), 斩击 (Slash)
   - Cost: Cost resource slots
   - Special icons: ☪ (Flash Strike), ✦ (Discard)

2. **defenseDice**: Defense dice
   - Types: 闪避 (Dodge), 反击 (Counter), 防御 (Block)
   - Used in counter responses

3. **triggerDice**: EX-activated abilities
   - Cost: EX resource slots
   - Triggered effects

4. **passiveDice**: Passive abilities
   - Types: 道具 (Item), 标签 (Tag)
   - Always active when equipped

5. **weapon** / **armor** / **item** / **equipment**: Gear
   - Starlight cost for equipping
   - Armor has resistance/weakness properties

---

## Development Conventions

### Naming Conventions

#### Files
- **Modules**: `lowercase-with-hyphens.mjs`
- **Templates**: `lowercase-with-hyphens.hbs`
- **Styles**: `lowercase-with-hyphens.css`

#### Code
- **Classes**: `PascalCase` (e.g., `ShuhaiActor`, `CharacterData`)
- **Methods/Variables**: `camelCase` (e.g., `rollAttributeCheck`, `combatState`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `BUFF_TYPES`)
- **Private fields**: Prefix with `_` (e.g., `_prepareData`)

#### Chinese Labels
Use brackets for system labels in logs:
```javascript
console.log('【战斗】Applying damage:', damage);
console.log('【BUFF】Adding buff:', buffId);
```

### Code Style

#### Async/Await Pattern
```javascript
// Preferred
async rollAttributeCheck(attr, dc) {
  const result = await this._roll('1d12+1d12');
  await this._createChatMessage(result);
  return result;
}

// Avoid .then() chains
```

#### Flag Management Pattern
```javascript
// Get flag
const state = this.getFlag('shuhai-dalu', 'combatState') || defaultState;

// Update flag
await this.setFlag('shuhai-dalu', 'combatState', newState);

// Update nested property
await this.setFlag('shuhai-dalu', 'combatState.costResources', newCostArray);
```

#### Error Handling
```javascript
try {
  const result = await this.performAction();
  ui.notifications.info('Success!');
  return result;
} catch (error) {
  console.error('【Error】Action failed:', error);
  ui.notifications.error(`Failed: ${error.message}`);
  return null;
}
```

### Data Validation

Always validate data before processing:
```javascript
// Check actor exists
if (!actor) {
  console.warn('【警告】Actor not found');
  return;
}

// Check item type
if (item.type !== 'combatDice') {
  console.warn('【警告】Invalid item type:', item.type);
  return;
}

// Check resource availability
if (!this.hasAvailableCost()) {
  ui.notifications.warn('Cost 资源不足');
  return;
}
```

---

## Common Development Tasks

### Adding a New BUFF Type

1. **Define BUFF in constants** (`module/constants/buff-types.mjs`):
```javascript
export const BUFF_TYPES = {
  myNewBuff: {
    id: 'myNewBuff',
    name: '我的BUFF',
    category: 'effect',  // or 'oneRound'
    icon: 'icons/svg/buff.svg',
    triggerType: 'onDamaged',
    defaultStrength: 0,
    defaultLayers: 1
  }
};
```

2. **Implement effect** (`module/helpers/effect-registry.mjs`):
```javascript
effectRegistry.onDamaged.myNewBuff = async function(actor, buff, context) {
  const damage = buff.strength || 0;
  await actor.takeDamage(damage);
  await actor.consumeBuff(buff.id, 1);
};
```

3. **Add localization** (`lang/zh-CN.json`):
```json
{
  "SHUHAI.Buff.myNewBuff": "我的BUFF",
  "SHUHAI.Buff.myNewBuffDesc": "效果描述"
}
```

### Adding a New Activity Trigger

1. **Define trigger** (`module/constants/activity-types.mjs`):
```javascript
export const TRIGGER_TYPES = {
  onMyTrigger: {
    id: 'onMyTrigger',
    label: '我的触发器',
    description: '当某事发生时触发'
  }
};
```

2. **Implement execution** (`module/helpers/activity-executor.mjs`):
Add handling in `executeActivities()` method.

3. **Call from appropriate location**:
```javascript
// In actor.mjs or item.mjs
await this.executeActivities('onMyTrigger', context);
```

### Adding a New Effect Type

1. **Register effect** (`module/helpers/effect-registry.mjs`):
```javascript
const EFFECT_TYPES = {
  myEffect: {
    label: '我的效果',
    requiresTarget: true,
    parameters: {
      value: { type: 'number', default: 0 },
      formula: { type: 'string', default: '' }
    },
    execute: async function(actor, effect, context) {
      // Implementation
      const value = parseExpression(effect.value, context);
      await actor.doSomething(value);
    }
  }
};
```

2. **Add to activity editor** (`module/sheets/activity-editor.mjs`):
Update effect selection dropdown and parameter fields.

### Modifying Character Data Schema

1. **Update schema** (`module/data/CharacterData.mjs`):
```javascript
static defineSchema() {
  return {
    ...existingFields,
    myNewField: new fields.NumberField({
      initial: 0,
      min: 0,
      integer: true
    })
  };
}
```

2. **Update template** (`templates/actor/actor-character-sheet.hbs`):
```handlebars
<div class="form-group">
  <label>新字段:</label>
  <input type="number" name="system.myNewField" value="{{system.myNewField}}" />
</div>
```

3. **Update styles** if needed (`styles/player-sheet.css`)

4. **Add localization** (`lang/zh-CN.json`)

### Creating a New Dialog

1. **Create application class** (`module/applications/my-dialog.mjs`):
```javascript
export class MyDialog extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['shuhai-dalu', 'my-dialog'],
      template: 'systems/shuhai-dalu/templates/dialog/my-dialog.hbs',
      width: 400,
      height: 'auto'
    });
  }

  getData() {
    return {
      ...super.getData(),
      // data for template
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.confirm').click(this._onConfirm.bind(this));
  }

  async _onConfirm(event) {
    event.preventDefault();
    // Handle confirmation
    this.close();
  }
}
```

2. **Create template** (`templates/dialog/my-dialog.hbs`):
```handlebars
<form>
  <div class="form-group">
    <!-- form fields -->
  </div>
  <div class="form-group">
    <button type="button" class="confirm">确认</button>
    <button type="button" class="cancel">取消</button>
  </div>
</form>
```

3. **Add styles** (`styles/shuhai-dalu.css` or new file)

4. **Open dialog**:
```javascript
new MyDialog().render(true);
```

---

## Git Workflow

### Branch Strategy

- **Main branch**: `main` (or `master`)
- **Feature branches**: `claude/feature-name-sessionid` (for Claude)
- **Pull requests**: Always create PRs for review

### Commit Message Format

Follow conventional commits:
```
fix: 修复战斗骰类型过滤条件
feat: 添加新的BUFF类型
refactor: 重构activities系统
debug: 添加详细日志诊断装备骰子数据结构
```

Types: `fix`, `feat`, `refactor`, `debug`, `docs`, `style`, `test`, `chore`

### Development Flow

1. **Create/checkout feature branch**:
```bash
git checkout -b claude/my-feature-sessionid
```

2. **Make changes and test in Foundry**

3. **Commit changes**:
```bash
git add .
git commit -m "fix: 修复问题描述"
```

4. **Push to remote**:
```bash
git push -u origin claude/my-feature-sessionid
```

5. **Create pull request** (via GitHub UI or `gh` CLI if available)

### Important Git Notes

- **Network retry**: Git operations may require retry with exponential backoff (2s, 4s, 8s, 16s)
- **Branch naming**: Claude branches must start with `claude/` and end with session ID
- **No force push**: Never force push to main/master
- **No hooks skip**: Don't use `--no-verify` unless explicitly requested

---

## Testing and Debugging

### Manual Testing Workflow

1. **Edit code** in your editor
2. **Reload Foundry**:
   - CSS/HBS/JSON: Hot reload (automatic)
   - JavaScript: F5 refresh required
3. **Test in-game**: Create test actors/items
4. **Check console**: F12 developer tools
5. **Verify changes**: Test all affected features

### Debug Script

Run `/debug.mjs` in browser console to diagnose issues:
```javascript
// In Foundry browser console, paste debug.mjs content
// It checks:
// - game.shuhai object
// - CONFIG.Actor/Item.documentClass
// - Data models
// - Template paths
// - Creates test character
```

### Common Debug Locations

**Actor data**:
```javascript
console.log('【Actor】System data:', actor.system);
console.log('【Actor】Combat state:', actor.getFlag('shuhai-dalu', 'combatState'));
```

**Item data**:
```javascript
console.log('【Item】Type:', item.type);
console.log('【Item】Activities:', item.system.activities);
```

**Combat state**:
```javascript
console.log('【Combat】Cost resources:', actor.getFlag('shuhai-dalu', 'combatState.costResources'));
console.log('【Combat】Active buffs:', actor.getFlag('shuhai-dalu', 'combatState.buffs'));
```

### Console Logging Pattern

Use Chinese labels for easy filtering:
```javascript
console.log('【战斗】Starting combat');
console.log('【BUFF】Adding buff:', buffId, 'layers:', layers);
console.log('【骰子】Rolling dice:', formula);
console.log('【活动】Executing activity:', activity.name);
console.log('【伤害】Applying damage:', damage, 'to', actor.name);
```

---

## Important Files Reference

### Entry Point
- **`module/shuhai-dalu.mjs`**: System initialization, hooks, global helpers

### Core Documents
- **`module/documents/actor.mjs`**: Actor logic (checks, combat, BUFFs)
- **`module/documents/item.mjs`**: Item logic (activities, dice)
- **`module/data/CharacterData.mjs`**: Character schema

### Combat System
- **`module/applications/combat-area.mjs`**: Individual combat UI
- **`module/applications/counter-area.mjs`**: Counter/accept dialog
- **`module/applications/battle-area-hud.mjs`**: Party HUD
- **`module/services/combat-effects.mjs`**: Combat effect processing

### Activity System
- **`module/helpers/activity-executor.mjs`**: Activity execution engine
- **`module/helpers/effect-registry.mjs`**: Effect implementations
- **`module/helpers/expression-parser.mjs`**: Dynamic expression evaluation
- **`module/constants/activity-types.mjs`**: Trigger/target definitions

### BUFF System
- **`module/constants/buff-types.mjs`**: BUFF type definitions
- See `actor.mjs` for BUFF methods: `addBuff()`, `consumeBuff()`, `clearBuff()`

### UI Sheets
- **`module/sheets/actor-sheet.mjs`**: Base actor sheet
- **`module/sheets/player-sheet.mjs`**: Player-specific sheet
- **`module/sheets/item-card-sheet.mjs`**: Item card editor
- **`module/sheets/activity-editor.mjs`**: Activity editor

### Templates
- **`templates/actor/actor-player-sheet.hbs`**: Main character sheet
- **`templates/combat/combat-area.hbs`**: Combat UI
- **`templates/chat/*.hbs`**: Chat message templates

---

## Common Pitfalls and Gotchas

### 1. Token Linking
**Issue**: All tokens are linked to base actor. Changes to token actor don't persist.

**Solution**: Always modify the base actor, not token actor:
```javascript
const actor = token.actor.isLinked ? token.actor : token.baseActor;
await actor.update({...});
```

### 2. Flag Updates
**Issue**: Flag updates don't trigger reactive updates in applications.

**Solution**: Always call `render()` after flag updates if UI needs refresh:
```javascript
await actor.setFlag('shuhai-dalu', 'combatState', newState);
await app.render();  // Force UI refresh
```

### 3. Activity Execution Context
**Issue**: Activities need proper context to parse expressions.

**Solution**: Always pass complete context:
```javascript
const context = {
  actor,
  item,
  diceResult: roll.total,
  target: targetActor,
  buffs: actor.getFlag('shuhai-dalu', 'combatState.buffs')
};
await item.executeActivities('onUse', context);
```

### 4. BUFF Timing
**Issue**: Forgetting to set `roundTiming` causes BUFFs to not apply correctly.

**Solution**: Always specify timing when adding BUFFs:
```javascript
await actor.addBuff('strong', {
  layers: 2,
  roundTiming: 'current'  // or 'next' or 'both'
});
```

### 5. Migration Breaking Changes
**Issue**: Old data structures cause errors after system updates.

**Solution**: Always include migration logic in `actor.mjs` and `item.mjs`:
```javascript
prepareDerivedData() {
  super.prepareDerivedData();

  // Migrate old data
  if (!this.system.activities) {
    this.system.activities = this._migrateConditions();
  }
}
```

### 6. Dice Formula Parsing
**Issue**: Invalid dice formulas crash the roller.

**Solution**: Validate formulas before rolling:
```javascript
const formula = item.system.diceFormula;
if (!formula || formula === '-') {
  ui.notifications.warn('Invalid dice formula');
  return;
}
const roll = await new Roll(formula).evaluate();
```

### 7. Async Rendering
**Issue**: Handlebars templates can't handle promises.

**Solution**: Always await data preparation before rendering:
```javascript
async getData() {
  const data = await super.getData();

  // Resolve all promises
  data.equippedItems = await Promise.all(
    itemIds.map(id => game.items.get(id))
  );

  return data;
}
```

### 8. Combat State Initialization
**Issue**: New actors don't have combat state flags.

**Solution**: Initialize in actor creation hook:
```javascript
Hooks.on('createActor', async (actor) => {
  if (actor.type === 'character') {
    await actor.setFlag('shuhai-dalu', 'combatState', defaultState);
  }
});
```

---

## Keyboard Shortcuts

- **V**: Toggle individual Combat Area
- **B**: Toggle player Battle Area HUD
- **N**: Toggle enemy Battle Area HUD

Defined in `module/shuhai-dalu.mjs`:
```javascript
Hooks.on('ready', () => {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'v') game.shuhai.combatArea.render(true);
    if (event.key === 'b') game.shuhai.battleAreaHud.render(true);
    if (event.key === 'n') game.shuhai.enemyBattleAreaHud.render(true);
  });
});
```

---

## Expression System

The expression parser (`module/helpers/expression-parser.mjs`) supports:

### Variables
```javascript
{buffId.layers}       // BUFF layer count
{buffId.strength}     // BUFF strength value
{cost.extra}          // Extra Cost slots used
{dice.finalValue}     // Dice roll result
```

### Functions
```javascript
floor({burn.layers}/4)      // Floor division
ceil({guard.layers}/2)      // Ceiling
min({charge.layers}, 3)     // Minimum
max(value1, value2)         // Maximum
abs(value)                  // Absolute value
```

### Operators
```javascript
+, -, *, /, %    // Basic math
```

### Usage in Activities
```javascript
effects: [
  {
    type: 'dealDamage',
    formula: '2d6+{charge.layers}'  // Dynamic damage
  },
  {
    type: 'addBuff',
    buffId: 'guard',
    layers: 'floor({charge.layers}/2)'  // Dynamic layers
  }
]
```

---

## Best Practices for AI Assistants

### 1. Always Read Before Editing
Never edit files without reading them first. Use `Read` tool to understand current state.

### 2. Test Changes Incrementally
Make small changes and test in Foundry between modifications.

### 3. Preserve Existing Patterns
Follow the established code style and architectural patterns in the codebase.

### 4. Use Chinese Labels
System uses Chinese for game terms. Keep consistency:
- BUFF names in Chinese (e.g., 强壮, 虚弱)
- Log labels in brackets (e.g., `console.log('【战斗】...')`)
- UI text via localization files

### 5. Migration-Safe Changes
When modifying data structures, include migration logic to handle existing data.

### 6. Flag-Based State
Never store state in application instances. Always use Actor/Item flags for persistence.

### 7. Comprehensive Context
When executing activities or effects, provide complete context objects with all necessary data.

### 8. Error Recovery
Always handle errors gracefully with try-catch and user-friendly notifications.

### 9. Documentation
Add JSDoc comments for new methods and complex logic:
```javascript
/**
 * Apply damage to actor with armor resistance
 * @param {number} baseDamage - Base damage amount
 * @param {string} damageType - 'slash', 'pierce', or 'blunt'
 * @returns {Promise<number>} Actual damage dealt
 */
async takeDamage(baseDamage, damageType) {
  // Implementation
}
```

### 10. Localization
Add all user-facing strings to `lang/zh-CN.json`, never hardcode in templates or code.

---

## Useful Foundry APIs

### Document Operations
```javascript
// Create
const actor = await Actor.create({name: 'Test', type: 'character'});

// Update
await actor.update({'system.level': 5});

// Delete
await actor.delete();

// Get
const actor = game.actors.get(actorId);
const item = actor.items.get(itemId);
```

### Flag Operations
```javascript
// Get
const value = actor.getFlag('shuhai-dalu', 'combatState');

// Set
await actor.setFlag('shuhai-dalu', 'combatState', newState);

// Unset
await actor.unsetFlag('shuhai-dalu', 'combatState');
```

### Dice Rolling
```javascript
// Basic roll
const roll = await new Roll('1d12+5').evaluate();
console.log(roll.total);

// Show in chat
await roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  flavor: 'Attribute Check'
});
```

### Chat Messages
```javascript
await ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor}),
  content: await renderTemplate('path/to/template.hbs', data)
});
```

### Notifications
```javascript
ui.notifications.info('Info message');
ui.notifications.warn('Warning message');
ui.notifications.error('Error message');
```

---

## Version History

### v2.0.0 (Current)
- Refactored activities system
- Added Actor BUFF management methods
- Fixed initiative roll errors
- Fixed combat dice type filtering
- Fixed Flash Strike (☪) and Discard (✦) functionality
- Migration from old conditions to activities

### Pre-v2.0
- Original condition system
- 5 passive dice slots (now 6)
- Manual BUFF management

---

## Additional Resources

### Foundry VTT Documentation
- API: https://foundryvtt.com/api/
- System Development: https://foundryvtt.com/article/system-development/

### Code Structure Notes
- No external dependencies = easier maintenance
- ES6 modules = modern, clean imports
- DataModel = type-safe data schemas
- Handlebars = powerful templating

---

## Quick Reference: File Modification Guide

### When modifying...

**Character attributes/stats** → Edit `module/data/CharacterData.mjs` + `templates/actor/actor-player-sheet.hbs`

**Combat mechanics** → Edit `module/documents/actor.mjs` or `module/services/combat-effects.mjs`

**Item properties** → Edit `module/documents/item.mjs` + `templates/item/item-sheet.hbs`

**BUFFs** → Edit `module/constants/buff-types.mjs` + `module/helpers/effect-registry.mjs`

**Activities** → Edit `module/constants/activity-types.mjs` + `module/helpers/activity-executor.mjs`

**UI layout** → Edit templates in `templates/` + styles in `styles/`

**Text strings** → Edit `lang/zh-CN.json`

**System metadata** → Edit `system.json`

---

## Contact and Contributions

**Author**: 言之安 (yanzhian)

**Repository**: https://github.com/yanzhian/shuhai-dalu (check system.json for actual URL)

**Issues**: Report via GitHub Issues

**Pull Requests**: Follow the git workflow described above

---

*Last Updated: 2025-11-15*
*Document Version: 1.0*
