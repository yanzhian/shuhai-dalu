/**
 * Activity 编辑对话框 - 增强版
 * 支持基础编辑器和高级JSON模式
 */

import { EFFECT_TYPES, EFFECT_CATEGORIES } from '../helpers/effect-registry.mjs';
import { ExpressionParser, EXPRESSION_EXAMPLES } from '../helpers/expression-parser.mjs';
import { getAllBuffs } from '../constants/buff-types.mjs';

// BUFF预设列表（从 buff-types.mjs 动态获取）
const BUFF_PRESETS = getAllBuffs();

// 目标类型选项
const TARGET_OPTIONS = [
  { value: 'self', label: '自己' },
  { value: 'selected', label: '选择的目标' },
  { value: 'allEnemies', label: '所有敌人' },
  { value: 'allAllies', label: '所有友军' },
  { value: 'all', label: '所有人' }
];

// 伤害类型选项
const DAMAGE_TYPE_OPTIONS = [
  { value: 'direct', label: '直接伤害' },
  { value: 'slash', label: '斩击' },
  { value: 'pierce', label: '突刺' },
  { value: 'blunt', label: '打击' }
];

export default class ActivityEditor extends Application {

  constructor(item, activity = null, options = {}) {
    super(options);
    this.item = item;
    this.isNew = !activity;  // 标记是否为新建模式

    if (activity) {
      // 编辑现有activity
      this.activityId = activity._id;
      this.activity = foundry.utils.deepClone(activity);

      // 兼容旧格式：将effects对象转换为effectsList数组
      if (activity.effects && !Array.isArray(activity.effects)) {
        this.activity.effectsList = this._effectsToList(activity.effects);
      }
    } else {
      // 创建新activity
      this.activityId = foundry.utils.randomID();
      this.activity = this._getDefaultActivity();
    }

    // 编辑模式：basic 或 advanced
    this.editMode = this.activity._editMode || 'basic';
  }

  /**
   * 将 effects 对象转换为列表
   */
  _effectsToList(effects) {
    const list = [];
    for (const [buffId, data] of Object.entries(effects)) {
      list.push({
        buffId: buffId,
        layers: data.layers || 0,
        strength: data.strength || 0
      });
    }
    return list;
  }

  /**
   * 将 effectsList 转换回 effects 对象
   */
  _listToEffects(effectsList) {
    const effects = {};
    for (const effect of effectsList) {
      if (effect.buffId) {
        effects[effect.buffId] = {
          layers: effect.layers || "0",  // 保留字符串格式以支持骰子公式
          strength: effect.strength || "0"
        };
      }
    }
    return effects;
  }

  /**
   * 获取默认 Activity 数据
   */
  _getDefaultActivity() {
    return {
      _id: this.activityId,
      name: "",
      trigger: "onUse",
      hasConsume: false,
      consumes: [],
      target: "selected",
      roundTiming: "current",  // 添加回合计数字段，默认为本回合
      effectsList: [],
      customEffect: {
        enabled: false,
        name: "",
        layers: 0,
        strength: 0
      }
    };
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "activity-editor", "activity-editor-enhanced"],
      template: "systems/shuhai-dalu/templates/item-card/activity-editor-enhanced.hbs",
      width: 600,
      height: "auto",
      title: "编辑活动",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true
    });
  }

  /** @override */
  async getData() {
    const data = {
      activity: this.activity,
      buffPresets: BUFF_PRESETS,
      effectTypes: EFFECT_TYPES,
      effectCategories: EFFECT_CATEGORIES,
      targetOptions: TARGET_OPTIONS,
      damageTypeOptions: DAMAGE_TYPE_OPTIONS,
      expressionExamples: EXPRESSION_EXAMPLES,
      editMode: this.editMode,
      isBasicMode: this.editMode === 'basic',
      isAdvancedMode: this.editMode === 'advanced'
    };

    // 准备效果类型列表（按分类组织）
    data.effectTypesByCategory = this._prepareEffectTypesByCategory();

    // 如果是高级模式，准备JSON字符串
    if (this.editMode === 'advanced') {
      data.activityJSON = JSON.stringify(this.activity, null, 2);
    }

    return data;
  }

  /**
   * 按分类准备效果类型列表
   */
  _prepareEffectTypesByCategory() {
    const categorized = [];

    for (const [categoryId, category] of Object.entries(EFFECT_CATEGORIES)) {
      const effects = category.effects.map(effectId => ({
        id: effectId,
        name: EFFECT_TYPES[effectId]?.name || effectId,
        fields: EFFECT_TYPES[effectId]?.fields || [],
        defaults: EFFECT_TYPES[effectId]?.defaults || {}
      }));

      categorized.push({
        id: categoryId,
        name: category.name,
        icon: category.icon,
        effects
      });
    }

    return categorized;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 标签页切换
    html.find('.tab-btn').click(this._onSwitchTab.bind(this));

    // 基础编辑器事件
    if (this.editMode === 'basic') {
      // 消耗管理
      html.find('.add-consume-btn').click(this._onAddConsume.bind(this));
      html.find('.remove-consume-btn').click(this._onRemoveConsume.bind(this));

      // 效果管理
      html.find('.add-effect-btn').click(this._onAddEffect.bind(this));
      html.find('.remove-effect-btn').click(this._onRemoveEffect.bind(this));
      html.find('.effect-type-select').change(this._onEffectTypeChange.bind(this));

      // checkbox 变化时先保存表单状态再重新渲染
      html.find('.has-consume-checkbox').change(async (e) => {
        this._updateActivityFromForm();
        this.activity.hasConsume = e.target.checked;
        this.render();
      });

      html.find('.custom-effect-checkbox').change(async (e) => {
        this._updateActivityFromForm();
        this.activity.customEffect.enabled = e.target.checked;
        this.render();
      });

      html.find('.consume-type-radio').change(async (e) => {
        this._updateActivityFromForm();
        this.activity.consumeType = e.target.value;
        this.render();
      });
    }

    // 高级模式事件
    if (this.editMode === 'advanced') {
      // JSON验证
      html.find('.validate-json-btn').click(this._onValidateJSON.bind(this));

      // JSON编辑器输入
      html.find('.json-editor').on('input', this._onJSONChange.bind(this));

      // 格式化JSON
      html.find('.format-json-btn').click(this._onFormatJSON.bind(this));
    }

    // 保存和取消按钮
    html.find('.save-btn').click(this._onSave.bind(this));
    html.find('.cancel-btn').click(() => this.close());

    // 阻止form默认提交
    html.find('form').submit((e) => {
      e.preventDefault();
      this._onSave(e);
    });
  }

  /**
   * 从表单更新 activity 数据（不包括 checkbox）
   */
  _updateActivityFromForm() {
    const form = this.element?.find('form')[0];
    if (!form) return;

    // 获取表单数据并手动展开
    const formDataRaw = new foundry.applications.ux.FormDataExtended(form).object;
    const formData = foundry.utils.expandObject(formDataRaw);

    // 更新基本字段
    if (formData.name !== undefined) this.activity.name = formData.name;
    if (formData.trigger !== undefined) this.activity.trigger = formData.trigger;
    if (formData.target !== undefined) this.activity.target = formData.target;

    // 更新 consumes
    if (formData.consumes) {
      this.activity.consumes = Object.values(formData.consumes);
    }

    // 更新 effectsList
    if (formData.effects) {
      this.activity.effectsList = Object.values(formData.effects);
    }

    // 更新 customEffect（但不更新 enabled，那个由 checkbox 控制）
    if (formData.customEffect) {
      if (formData.customEffect.name !== undefined) {
        this.activity.customEffect.name = formData.customEffect.name;
      }
      if (formData.customEffect.layers !== undefined) {
        this.activity.customEffect.layers = formData.customEffect.layers;
      }
      if (formData.customEffect.strength !== undefined) {
        this.activity.customEffect.strength = formData.customEffect.strength;
      }
    }
  }

  /**
   * 添加消耗
   */
  _onAddConsume(event) {
    event.preventDefault();
    this.activity.consumes.push({
      buffId: 'charge',
      layers: 1,
      strength: 0
    });
    this.render();
  }

  /**
   * 删除消耗
   */
  _onRemoveConsume(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.consumes.splice(index, 1);
    this.render();
  }

  /**
   * 添加效果
   */
  _onAddEffect(event) {
    event.preventDefault();

    // 默认添加一个 addBuff 效果
    this.activity.effectsList.push({
      type: 'addBuff',
      params: {
        buffId: 'strong',
        layers: '1',
        strength: '0',
        target: 'selected'
      }
    });
    this.render();
  }

  /**
   * 删除效果
   */
  _onRemoveEffect(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    this.activity.effectsList.splice(index, 1);
    this.render();
  }

  /**
   * 效果类型变更
   */
  _onEffectTypeChange(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    const newType = $(event.currentTarget).val();

    // 获取新效果类型的默认参数
    const effectDef = EFFECT_TYPES[newType];
    if (!effectDef) {
      console.warn('【Activity编辑器】未知效果类型:', newType);
      return;
    }

    // 更新效果对象
    this.activity.effectsList[index] = {
      type: newType,
      params: { ...effectDef.defaults }
    };

    this.render();
  }

  /**
   * 切换标签页
   */
  async _onSwitchTab(event) {
    event.preventDefault();
    const newMode = $(event.currentTarget).data('mode');

    if (newMode === this.editMode) {
      return; // 已经在当前模式，无需切换
    }

    if (newMode === 'advanced' && this.editMode === 'basic') {
      // 从基础模式切换到高级模式：UI → JSON
      this._syncBasicToJSON();
    } else if (newMode === 'basic' && this.editMode === 'advanced') {
      // 从高级模式切换到基础模式：JSON → UI
      if (!this._syncJSONToBasic()) {
        return; // 切换失败
      }
    }

    this.editMode = newMode;
    this.activity._editMode = newMode;
    this.render();
  }

  /**
   * 从基础模式同步到JSON
   */
  _syncBasicToJSON() {
    // 从表单收集数据，更新activity对象
    this._updateActivityFromForm();
  }

  /**
   * 从JSON同步到基础模式
   */
  _syncJSONToBasic() {
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
      console.error('【Activity编辑器】JSON解析失败:', error);
      return false;
    }
  }

  /**
   * 验证JSON
   */
  _onValidateJSON(event) {
    event.preventDefault();

    try {
      const jsonText = this.element.find('.json-editor').val();
      const parsed = JSON.parse(jsonText);

      // 基本验证
      const errors = [];

      if (!parsed.name) errors.push('缺少 name 字段');
      if (!parsed.trigger && !parsed.baseTiming) errors.push('缺少 trigger 或 baseTiming 字段');

      if (errors.length > 0) {
        ui.notifications.warn(`JSON验证警告:\n${errors.join('\n')}`);
      } else {
        ui.notifications.info('✅ JSON格式正确！');
      }

      // 显示预览
      this._showJSONPreview(parsed);

    } catch (error) {
      ui.notifications.error(`❌ JSON格式错误: ${error.message}`);
    }
  }

  /**
   * 格式化JSON
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
   * JSON编辑器内容变化
   */
  _onJSONChange(event) {
    // 实时保存到临时变量（避免频繁解析）
    this._tempJSON = $(event.currentTarget).val();
  }

  /**
   * 显示JSON预览
   */
  _showJSONPreview(parsed) {
    let preview = `<strong>活动名称:</strong> ${parsed.name}<br>`;
    preview += `<strong>触发时机:</strong> ${parsed.trigger || parsed.baseTiming}<br>`;

    if (parsed.consume) {
      preview += `<strong>消耗:</strong> ${parsed.consume.type === 'optional' ? '可选' : '强制'}<br>`;
    }

    if (parsed.effects && parsed.effects.length > 0) {
      preview += `<strong>效果数量:</strong> ${parsed.effects.length}<br>`;
    }

    // 在预览区域显示
    this.element.find('.json-preview').html(preview);
  }

  /**
   * 保存
   */
  async _onSave(event) {
    event.preventDefault();
    console.log('【Activity保存】开始保存流程，模式:', this.editMode);

    let activityData;

    if (this.editMode === 'advanced') {
      // 高级模式：从JSON编辑器获取数据
      try {
        const jsonText = this.element.find('.json-editor').val();
        activityData = JSON.parse(jsonText);
        activityData._id = this.activityId;
        activityData._editMode = 'advanced';
        console.log('【Activity保存】从JSON解析的数据:', activityData);
      } catch (error) {
        ui.notifications.error(`JSON格式错误: ${error.message}`);
        return;
      }
    } else {
      // 基础模式：从表单获取数据
      const form = this.element.find('form')[0];
      if (!form) {
        console.error('【Activity保存】找不到表单');
        ui.notifications.error("保存失败：找不到表单");
        return;
      }

      const formDataRaw = new foundry.applications.ux.FormDataExtended(form).object;
      const formData = foundry.utils.expandObject(formDataRaw);
      console.log('【Activity保存】表单数据:', formData);

      // 处理 consumes
      const consumes = formData.consumes ? Object.values(formData.consumes) : [];

      // 处理 effectsList（新格式：支持多种效果类型）
      const effectsList = formData.effects ? Object.values(formData.effects) : [];

      // 构建 activity 数据
      activityData = {
        _id: this.activityId,
        _editMode: 'basic',
        name: formData.name || "",
        trigger: formData.trigger || "onUse",
        hasConsume: formData.hasConsume === true || formData.hasConsume === 'on',
        consumes: consumes,
        target: formData.target || "selected",
        roundTiming: formData.roundTiming || "current",
        effectsList: effectsList  // 使用新的效果列表格式
      };
    }

    console.log('【Activity保存】最终数据:', activityData);

    try {
      // 根据是新建还是编辑，调用不同的方法
      if (this.isNew) {
        console.log('【Activity保存】调用 item.createActivity（新建）');
        await this.item.createActivity(activityData);
        console.log('【Activity保存】createActivity 完成');
      } else {
        console.log('【Activity保存】调用 item.updateActivity（编辑）');
        await this.item.updateActivity(this.activityId, activityData);
        console.log('【Activity保存】updateActivity 完成');
      }

      ui.notifications.info("活动已保存");
      this.close();
    } catch (error) {
      console.error('【Activity保存】保存失败:', error);
      ui.notifications.error("保存失败: " + error.message);
    }
  }
}
