/**
 * Activity 编辑对话框 - 基础版
 * 只支持BUFF编辑，简单易用
 */

import { getAllBuffs } from '../constants/buff-types.mjs';

// BUFF预设列表（从 buff-types.mjs 动态获取）
const BUFF_PRESETS = getAllBuffs();

export default class ActivityEditor extends Application {

  constructor(item, activity = null, options = {}) {
    super(options);
    this.item = item;
    this.isNew = !activity;

    if (activity) {
      this.activityId = activity._id;
      this.activity = foundry.utils.deepClone(activity);

      // 兼容旧格式：将effects对象转换为effectsList数组
      if (activity.effects && !Array.isArray(activity.effects) && typeof activity.effects === 'object') {
        this.activity.effectsList = this._effectsToList(activity.effects);
      } else if (!this.activity.effectsList) {
        this.activity.effectsList = [];
      }
    } else {
      this.activityId = foundry.utils.randomID();
      this.activity = this._getDefaultActivity();
    }

    // 编辑模式：basic 或 advanced
    this.editMode = this.activity._editMode || 'basic';
  }

  /**
   * 将 effects 对象转换为列表（兼容旧数据）
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
   * 将 effectsList 转换回 effects 对象（用于保存）
   */
  _listToEffects(effectsList) {
    const effects = {};
    for (const effect of effectsList) {
      if (effect.buffId) {
        effects[effect.buffId] = {
          layers: effect.layers || "0",
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
      roundTiming: "current",
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
      classes: ["shuhai-dalu", "activity-editor"],
      template: "systems/shuhai-dalu/templates/item-card/activity-editor-basic.hbs",
      width: 500,
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
      editMode: this.editMode,
      isBasicMode: this.editMode === 'basic',
      isAdvancedMode: this.editMode === 'advanced'
    };

    // 如果是高级模式，准备JSON字符串
    if (this.editMode === 'advanced') {
      data.activityJSON = JSON.stringify(this.activity, null, 2);
    }

    return data;
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

      // checkbox 变化
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
    }

    // 高级模式事件
    if (this.editMode === 'advanced') {
      html.find('.validate-json-btn').click(this._onValidateJSON.bind(this));
      html.find('.json-editor').on('input', this._onJSONChange.bind(this));
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
   * 从表单更新 activity 数据
   */
  _updateActivityFromForm() {
    const form = this.element?.find('form')[0];
    if (!form) return;

    const formDataRaw = new foundry.applications.ux.FormDataExtended(form).object;
    const formData = foundry.utils.expandObject(formDataRaw);

    // 更新基本字段
    if (formData.name !== undefined) this.activity.name = formData.name;
    if (formData.trigger !== undefined) this.activity.trigger = formData.trigger;
    if (formData.target !== undefined) this.activity.target = formData.target;
    if (formData.roundTiming !== undefined) this.activity.roundTiming = formData.roundTiming;

    // 更新 consumes
    if (formData.consumes) {
      this.activity.consumes = Object.values(formData.consumes);
    }

    // 更新 effectsList
    if (formData.effects) {
      this.activity.effectsList = Object.values(formData.effects);
    }

    // 更新 customEffect
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
    this.activity.effectsList.push({
      buffId: 'strong',
      layers: 1,
      strength: 0
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
   * 切换标签页
   */
  async _onSwitchTab(event) {
    event.preventDefault();
    const newMode = $(event.currentTarget).data('mode');

    if (newMode === this.editMode) {
      return;
    }

    if (newMode === 'advanced' && this.editMode === 'basic') {
      this._syncBasicToJSON();
    } else if (newMode === 'basic' && this.editMode === 'advanced') {
      if (!this._syncJSONToBasic()) {
        return;
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
    this._updateActivityFromForm();
  }

  /**
   * 从JSON同步到基础模式
   */
  _syncJSONToBasic() {
    try {
      const jsonText = this.element.find('.json-editor').val();
      const parsed = JSON.parse(jsonText);

      if (!parsed.name || !parsed.trigger) {
        throw new Error('缺少必需字段：name 或 trigger');
      }

      this.activity = parsed;
      this.activity._editMode = 'basic';
      ui.notifications.info('已切换到基础编辑器');
      return true;
    } catch (error) {
      ui.notifications.error(`JSON格式错误: ${error.message}`);
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
    this._tempJSON = $(event.currentTarget).val();
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

      // 处理 effectsList
      const effectsList = formData.effects ? Object.values(formData.effects) : [];

      // 转换为 effects 对象格式（为了兼容性）
      const effects = this._listToEffects(effectsList);

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
        effects: effects,  // 保存为旧格式
        customEffect: {
          enabled: formData.customEffect?.enabled === true || formData.customEffect?.enabled === 'on',
          name: formData.customEffect?.name || "",
          layers: formData.customEffect?.layers || "0",
          strength: formData.customEffect?.strength || "0"
        }
      };
    }

    console.log('【Activity保存】最终数据:', activityData);

    try {
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
