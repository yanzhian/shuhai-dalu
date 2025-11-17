/**
 * Activity 编辑器 V2 - 支持统一数据格式
 *
 * 版本: 2.0
 * 日期: 2025-11-17
 *
 * 支持新统一格式：
 * - trigger: { type, passive, category }
 * - conditions: []
 * - consume: { mode, resources, options }
 * - effects: []
 * - usageLimit: { perRound, perCombat }
 */

import { isNewFormat, migrateActivity } from '../helpers/activity-migration.mjs';
import { createDefaultActivity, TRIGGER_TYPES, TRIGGER_LABELS, TARGET_TYPES, TARGET_LABELS, ROUND_TIMING, ROUND_TIMING_LABELS, CONDITION_TYPES, CONSUME_MODE, EFFECT_TYPES } from '../constants/activity-schema.mjs';
import { findBuffById, BUFF_TYPES } from '../constants/buff-types.mjs';
import { ExpressionParser, EXPRESSION_EXAMPLES } from '../helpers/expression-parser.mjs';

export default class ActivityEditorV2 extends Application {

  /**
   * 构造函数
   * @param {ShuhaiItem} item - 所属物品
   * @param {Object} activity - Activity 数据（可选，null 表示新建）
   * @param {Object} options - 配置选项
   */
  constructor(item, activity = null, options = {}) {
    super(options);

    this.item = item;
    this.isNew = !activity;

    if (activity) {
      // 编辑现有 activity
      this.activityId = activity._id;

      // 检测并迁移旧格式
      if (!isNewFormat(activity)) {
        console.log('【Activity编辑器V2】检测到旧格式，自动迁移');
        this.activity = migrateActivity(activity);
        this.needsMigration = true;
        ui.notifications.info('已自动迁移为新格式');
      } else {
        this.activity = foundry.utils.deepClone(activity);
        this.needsMigration = false;
      }
    } else {
      // 创建新 activity
      this.activityId = foundry.utils.randomID();
      this.activity = createDefaultActivity();
      this.activity._id = this.activityId;
    }

    // 编辑模式：basic 或 advanced
    this.editMode = this.activity._editMode || 'basic';

    console.log('【Activity编辑器V2】初始化完成:', {
      isNew: this.isNew,
      needsMigration: this.needsMigration,
      editMode: this.editMode,
      activity: this.activity
    });
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['shuhai-dalu', 'activity-editor', 'activity-editor-v2'],
      template: 'systems/shuhai-dalu/templates/item-card/activity-editor-v2.hbs',
      width: 700,
      height: 'auto',
      title: 'Activity 编辑器',
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true
    });
  }

  /** @override */
  async getData() {
    const data = await super.getData();

    // 准备数据
    data.activity = this.activity;
    data.editMode = this.editMode;
    data.isBasicMode = this.editMode === 'basic';
    data.isAdvancedMode = this.editMode === 'advanced';
    data.isNew = this.isNew;
    data.needsMigration = this.needsMigration;

    // 枚举数据
    data.triggerTypes = this._prepareTriggerTypes();
    data.targetTypes = this._prepareTargetTypes();
    data.roundTimings = this._prepareRoundTimings();
    data.conditionTypes = this._prepareConditionTypes();
    data.consumeModes = this._prepareConsumeModes();
    data.effectTypes = this._prepareEffectTypes();
    data.buffTypes = this._prepareBuffTypes();
    data.expressionExamples = EXPRESSION_EXAMPLES;

    // JSON 模式数据
    if (this.editMode === 'advanced') {
      data.activityJSON = JSON.stringify(this.activity, null, 2);
    }

    console.log('【Activity编辑器V2】getData:', data);
    return data;
  }

  /**
   * 准备触发类型选项
   */
  _prepareTriggerTypes() {
    return Object.entries(TRIGGER_TYPES).map(([key, value]) => ({
      value: value,
      label: TRIGGER_LABELS[value] || value,
      selected: this.activity.trigger?.type === value
    }));
  }

  /**
   * 准备目标类型选项
   */
  _prepareTargetTypes() {
    return Object.entries(TARGET_TYPES).map(([key, value]) => ({
      value: value,
      label: TARGET_LABELS[value] || value
    }));
  }

  /**
   * 准备回合时机选项
   */
  _prepareRoundTimings() {
    return Object.entries(ROUND_TIMING).map(([key, value]) => ({
      value: value,
      label: ROUND_TIMING_LABELS[value] || value
    }));
  }

  /**
   * 准备条件类型选项
   */
  _prepareConditionTypes() {
    return Object.entries(CONDITION_TYPES).map(([key, value]) => ({
      value: value,
      label: this._getConditionTypeLabel(value)
    }));
  }

  _getConditionTypeLabel(type) {
    const labels = {
      'hasBuff': '拥有BUFF',
      'buffLayer': 'BUFF层数',
      'buffStrength': 'BUFF强度',
      'healthPercent': '生命值百分比',
      'resourceCount': '资源数量',
      'customExpression': '自定义表达式'
    };
    return labels[type] || type;
  }

  /**
   * 准备消耗模式选项
   */
  _prepareConsumeModes() {
    return Object.entries(CONSUME_MODE).map(([key, value]) => ({
      value: value,
      label: this._getConsumeModeLabel(value),
      selected: this.activity.consume?.mode === value
    }));
  }

  _getConsumeModeLabel(mode) {
    const labels = {
      'none': '无消耗',
      'mandatory': '强制消耗',
      'optional': '可选消耗'
    };
    return labels[mode] || mode;
  }

  /**
   * 准备效果类型选项
   */
  _prepareEffectTypes() {
    return Object.entries(EFFECT_TYPES).map(([key, value]) => ({
      value: value,
      label: this._getEffectTypeLabel(value)
    }));
  }

  _getEffectTypeLabel(type) {
    const labels = {
      'addBuff': '添加BUFF',
      'consumeBuff': '消耗BUFF',
      'heal': '恢复生命',
      'dealDamage': '造成伤害',
      'modifyDice': '修正骰子',
      'restoreResource': '恢复资源',
      'deductResource': '扣除资源',
      'customBuff': '自定义BUFF'
    };
    return labels[type] || type;
  }

  /**
   * 准备 BUFF 类型选项
   */
  _prepareBuffTypes() {
    return Object.values(BUFF_TYPES).map(buff => ({
      id: buff.id,
      name: buff.name,
      category: buff.category,
      icon: buff.icon
    }));
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    console.log('【Activity编辑器V2】activateListeners');

    // 模式切换
    html.find('.tab-btn').click(this._onSwitchMode.bind(this));

    if (this.editMode === 'basic') {
      this._activateBasicModeListeners(html);
    } else if (this.editMode === 'advanced') {
      this._activateAdvancedModeListeners(html);
    }

    // 保存和取消按钮
    html.find('.save-btn').click(this._onSave.bind(this));
    html.find('.cancel-btn').click(() => this.close());

    // 阻止表单默认提交
    html.find('form').submit((e) => {
      e.preventDefault();
      this._onSave(e);
    });
  }

  /**
   * 激活基础模式监听器
   */
  _activateBasicModeListeners(html) {
    // 触发时机
    html.find('input[name="trigger.passive"]').change(this._onTriggerPassiveChange.bind(this));

    // 条件
    html.find('.add-condition-btn').click(this._onAddCondition.bind(this));
    html.find('.remove-condition-btn').click(this._onRemoveCondition.bind(this));

    // 消耗
    html.find('select[name="consume.mode"]').change(this._onConsumeModeChange.bind(this));
    html.find('.add-consume-resource-btn').click(this._onAddConsumeResource.bind(this));
    html.find('.remove-consume-resource-btn').click(this._onRemoveConsumeResource.bind(this));
    html.find('.add-consume-option-btn').click(this._onAddConsumeOption.bind(this));
    html.find('.remove-consume-option-btn').click(this._onRemoveConsumeOption.bind(this));

    // 效果
    html.find('.add-effect-btn').click(this._onAddEffect.bind(this));
    html.find('.remove-effect-btn').click(this._onRemoveEffect.bind(this));
    html.find('.effect-type-select').change(this._onEffectTypeChange.bind(this));
  }

  /**
   * 激活高级模式监听器
   */
  _activateAdvancedModeListeners(html) {
    html.find('.validate-json-btn').click(this._onValidateJSON.bind(this));
    html.find('.format-json-btn').click(this._onFormatJSON.bind(this));
    html.find('.json-editor').on('input', this._onJSONChange.bind(this));
  }

  /**
   * 切换编辑模式
   */
  async _onSwitchMode(event) {
    event.preventDefault();
    const newMode = $(event.currentTarget).data('mode');

    if (newMode === this.editMode) {
      return; // 已在当前模式
    }

    if (newMode === 'advanced' && this.editMode === 'basic') {
      // 基础 → JSON：同步表单数据
      this._syncFormToActivity();
    } else if (newMode === 'basic' && this.editMode === 'advanced') {
      // JSON → 基础：验证并解析 JSON
      if (!this._syncJSONToActivity()) {
        return; // 切换失败
      }
    }

    this.editMode = newMode;
    this.activity._editMode = newMode;
    this.render();
  }

  /**
   * 从表单同步数据到 activity 对象
   */
  _syncFormToActivity() {
    const form = this.element?.find('form')[0];
    if (!form) return;

    const formData = new FormDataExtended(form).object;
    const expanded = foundry.utils.expandObject(formData);

    // 手动构建 activity 对象（避免展开问题）
    this.activity.name = expanded.name || '';

    // 触发时机
    this.activity.trigger = {
      type: expanded.trigger?.type || 'onUse',
      passive: expanded.trigger?.passive === true || expanded.trigger?.passive === 'on',
      category: expanded.trigger?.category || null
    };

    // 条件（暂时简化）
    if (expanded.conditions) {
      this.activity.conditions = Object.values(expanded.conditions);
    }

    // 消耗
    this.activity.consume = {
      mode: expanded.consume?.mode || 'none',
      resources: expanded.consume?.resources ? Object.values(expanded.consume.resources) : [],
      options: expanded.consume?.options ? Object.values(expanded.consume.options) : []
    };

    // 效果
    if (expanded.effects) {
      this.activity.effects = Object.values(expanded.effects);
    }

    // 次数限制
    this.activity.usageLimit = expanded.usageLimit || null;

    console.log('【Activity编辑器V2】表单同步完成:', this.activity);
  }

  /**
   * 从 JSON 同步到 activity 对象
   */
  _syncJSONToActivity() {
    try {
      const jsonText = this.element.find('.json-editor').val();
      const parsed = JSON.parse(jsonText);

      // 验证必需字段
      if (!parsed.name || !parsed.trigger) {
        throw new Error('缺少必需字段：name 或 trigger');
      }

      this.activity = parsed;
      this.activity._editMode = 'basic';
      ui.notifications.info('已切换到基础编辑器');
      return true;
    } catch (error) {
      ui.notifications.error(`JSON格式错误: ${error.message}`);
      console.error('【Activity编辑器V2】JSON解析失败:', error);
      return false;
    }
  }

  /**
   * 被动触发勾选变化
   */
  _onTriggerPassiveChange(event) {
    this._syncFormToActivity();
    this.render();
  }

  /**
   * 添加条件
   */
  _onAddCondition(event) {
    event.preventDefault();
    if (!this.activity.conditions) {
      this.activity.conditions = [];
    }
    this.activity.conditions.push({
      type: 'hasBuff',
      buffId: 'strong',
      operator: '>=',
      value: 1
    });
    this.render();
  }

  /**
   * 删除条件
   */
  _onRemoveCondition(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.conditions.splice(index, 1);
    this.render();
  }

  /**
   * 消耗模式变化
   */
  _onConsumeModeChange(event) {
    this._syncFormToActivity();
    this.render();
  }

  /**
   * 添加消耗资源
   */
  _onAddConsumeResource(event) {
    event.preventDefault();
    if (!this.activity.consume.resources) {
      this.activity.consume.resources = [];
    }
    this.activity.consume.resources.push({
      type: 'buff',
      buffId: 'charge',
      layers: 1
    });
    this.render();
  }

  /**
   * 删除消耗资源
   */
  _onRemoveConsumeResource(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.consume.resources.splice(index, 1);
    this.render();
  }

  /**
   * 添加消耗选项
   */
  _onAddConsumeOption(event) {
    event.preventDefault();
    if (!this.activity.consume.options) {
      this.activity.consume.options = [];
    }
    this.activity.consume.options.push([
      { type: 'buff', buffId: 'charge', layers: 1 }
    ]);
    this.render();
  }

  /**
   * 删除消耗选项
   */
  _onRemoveConsumeOption(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.consume.options.splice(index, 1);
    this.render();
  }

  /**
   * 添加效果
   */
  _onAddEffect(event) {
    event.preventDefault();
    if (!this.activity.effects) {
      this.activity.effects = [];
    }
    this.activity.effects.push({
      type: 'addBuff',
      buffId: 'strong',
      layers: 1,
      strength: 0,
      target: 'self',
      roundTiming: 'current'
    });
    this.render();
  }

  /**
   * 删除效果
   */
  _onRemoveEffect(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.effects.splice(index, 1);
    this.render();
  }

  /**
   * 效果类型变化
   */
  _onEffectTypeChange(event) {
    this._syncFormToActivity();
    this.render();
  }

  /**
   * 验证 JSON
   */
  _onValidateJSON(event) {
    event.preventDefault();
    try {
      const jsonText = this.element.find('.json-editor').val();
      const parsed = JSON.parse(jsonText);

      const errors = [];
      if (!parsed.name) errors.push('缺少 name 字段');
      if (!parsed.trigger) errors.push('缺少 trigger 字段');

      if (errors.length > 0) {
        ui.notifications.warn(`JSON验证警告:\n${errors.join('\n')}`);
      } else {
        ui.notifications.info('✅ JSON格式正确！');
      }
    } catch (error) {
      ui.notifications.error(`❌ JSON格式错误: ${error.message}`);
    }
  }

  /**
   * 格式化 JSON
   */
  _onFormatJSON(event) {
    event.preventDefault();
    try {
      const jsonText = this.element.find('.json-editor').val();
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      this.element.find('.json-editor').val(formatted);
      ui.notifications.info('JSON已格式化');
    } catch (error) {
      ui.notifications.error(`格式化失败: ${error.message}`);
    }
  }

  /**
   * JSON 编辑器内容变化
   */
  _onJSONChange(event) {
    this._tempJSON = $(event.currentTarget).val();
  }

  /**
   * 保存
   */
  async _onSave(event) {
    event.preventDefault();
    console.log('【Activity编辑器V2】开始保存，模式:', this.editMode);

    let activityData;

    if (this.editMode === 'advanced') {
      // JSON 模式：解析 JSON
      try {
        const jsonText = this.element.find('.json-editor').val();
        activityData = JSON.parse(jsonText);
        activityData._id = this.activityId;
        activityData._editMode = 'advanced';
      } catch (error) {
        ui.notifications.error(`JSON格式错误: ${error.message}`);
        return;
      }
    } else {
      // 基础模式：从表单构建数据
      this._syncFormToActivity();
      activityData = foundry.utils.deepClone(this.activity);
      activityData._id = this.activityId;
      activityData._editMode = 'basic';
    }

    console.log('【Activity编辑器V2】保存数据:', activityData);

    try {
      if (this.isNew) {
        console.log('【Activity编辑器V2】创建新 Activity');
        await this.item.createActivity(activityData);
      } else {
        console.log('【Activity编辑器V2】更新 Activity');
        await this.item.updateActivity(this.activityId, activityData);
      }

      ui.notifications.info('Activity 已保存');
      this.close();
    } catch (error) {
      console.error('【Activity编辑器V2】保存失败:', error);
      ui.notifications.error(`保存失败: ${error.message}`);
    }
  }
}
