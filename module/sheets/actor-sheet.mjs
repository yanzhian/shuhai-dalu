/**
 * 书海大陆角色表单
 */
export default class ShuhaiActorSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor"],
      width: 720,
      height: 800,
      tabs: [{ 
        navSelector: ".sheet-tabs", 
        contentSelector: ".sheet-body", 
        initial: "attributes" 
      }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
      scrollY: [".biography", ".items", ".attributes"]
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // 添加 Roll 数据
    context.rollData = this.actor.getRollData();
    
    // 准备角色数据
    this._prepareCharacterData(context);
    
    // 准备物品数据
    this._prepareItems(context);
    
    // 添加富文本编辑器
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography, 
      { async: true }
    );
    
    return context;
  }

  /**
   * 准备角色特定数据
   */
  _prepareCharacterData(context) {
    // 属性列表
    context.attributes = {
      strength: { key: 'strength', label: '力量', value: context.system.attributes.strength.value },
      constitution: { key: 'constitution', label: '体质', value: context.system.attributes.constitution.value },
      dexterity: { key: 'dexterity', label: '敏捷', value: context.system.attributes.dexterity.value },
      perception: { key: 'perception', label: '感知', value: context.system.attributes.perception.value },
      intelligence: { key: 'intelligence', label: '智力', value: context.system.attributes.intelligence.value },
      charisma: { key: 'charisma', label: '魅力', value: context.system.attributes.charisma.value }
    };
    
    // 技能分类
    context.skillGroups = {
      physical: {
        label: '物理技能',
        skills: {
          athletics: { key: 'athletics', label: '运动', value: context.system.skills.athletics },
          acrobatics: { key: 'acrobatics', label: '体操', value: context.system.skills.acrobatics },
          sleight: { key: 'sleight', label: '巧手', value: context.system.skills.sleight },
          stealth: { key: 'stealth', label: '隐蔽', value: context.system.skills.stealth }
        }
      },
      knowledge: {
        label: '知识技能',
        skills: {
          history: { key: 'history', label: '历史', value: context.system.skills.history },
          investigation: { key: 'investigation', label: '调查', value: context.system.skills.investigation },
          nature: { key: 'nature', label: '自然', value: context.system.skills.nature },
          religion: { key: 'religion', label: '宗教', value: context.system.skills.religion },
          animal: { key: 'animal', label: '驯兽', value: context.system.skills.animal }
        }
      },
      perception: {
        label: '感知技能',
        skills: {
          insight: { key: 'insight', label: '洞悉', value: context.system.skills.insight },
          medicine: { key: 'medicine', label: '医药', value: context.system.skills.medicine },
          perception: { key: 'perception', label: '察觉', value: context.system.skills.perception },
          survival: { key: 'survival', label: '求生', value: context.system.skills.survival }
        }
      },
      social: {
        label: '社交技能',
        skills: {
          deception: { key: 'deception', label: '欺瞒', value: context.system.skills.deception },
          intimidation: { key: 'intimidation', label: '威吓', value: context.system.skills.intimidation },
          performance: { key: 'performance', label: '表演', value: context.system.skills.performance },
          persuasion: { key: 'persuasion', label: '游说', value: context.system.skills.persuasion }
        }
      }
    };
  }

  /**
   * 准备物品数据
   */
  _prepareItems(context) {
    const weapons = [];
    const armor = [];
    const items = [];
    const cards = [];
    
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      if (i.type === 'weapon') weapons.push(i);
      else if (i.type === 'armor') armor.push(i);
      else if (i.type === 'card') cards.push(i);
      else items.push(i);
    }
    
    context.weapons = weapons;
    context.armor = armor;
    context.items = items;
    context.cards = cards;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // 只在拥有权限时添加监听器
    if (!this.isEditable) return;
    
    // 属性检定
    html.find('.attribute-roll').click(this._onAttributeRoll.bind(this));
    
    // 技能检定
    html.find('.skill-roll').click(this._onSkillRoll.bind(this));
    
    // 侵蚀检定
    html.find('.corruption-check').click(this._onCorruptionCheck.bind(this));
    
    // 长休
    html.find('.long-rest').click(this._onLongRest.bind(this));
    
    // HP/SAN 调整
    html.find('.resource-control').click(this._onResourceControl.bind(this));
    
    // 物品控制
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    
    // 可拖拽的物品
    const handler = ev => this._onDragStart(ev);
    html.find('li.item').each((i, li) => {
      if (li.classList.contains("inventory-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });
  }

  /* -------------------------------------------- */
  /*  事件处理                                      */
  /* -------------------------------------------- */

  /**
   * 属性检定
   */
  async _onAttributeRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const attributeKey = element.dataset.attribute;
    
    // 弹出对话框询问修正值和难度
    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/check-dialog.hbs", {
      attribute: attributeKey
    });
    
    new Dialog({
      title: "属性检定",
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "检定",
          callback: html => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const difficulty = parseInt(html.find('[name="difficulty"]').val()) || 20;
            game.shuhai.rollAttributeCheck(this.actor, attributeKey, modifier, difficulty);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * 技能检定
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    
    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/check-dialog.hbs", {
      skill: skillKey
    });
    
    new Dialog({
      title: "技能检定",
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "检定",
          callback: html => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const difficulty = parseInt(html.find('[name="difficulty"]').val()) || 20;
            game.shuhai.rollSkillCheck(this.actor, skillKey, modifier, difficulty);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * 侵蚀检定
   */
  _onCorruptionCheck(event) {
    event.preventDefault();
    game.shuhai.rollCorruptionCheck(this.actor);
  }

  /**
   * 长休
   */
  async _onLongRest(event) {
    event.preventDefault();
    
    const hpMax = this.actor.system.hp.max;
    await this.actor.update({
      "system.hp.value": hpMax,
      "system.san.value": 0
    });
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "长期休息",
      content: `
        <div class="shuhai-rest">
          <p>经过长时间的休息和调整,你恢复了精神和体力...</p>
          <ul>
            <li>生命值: ${hpMax}/${hpMax} (完全生命恢复)</li>
            <li>侵蚀值: 0 (心灵得到净化)</li>
          </ul>
        </div>
      `
    });
  }

  /**
   * 资源控制 (HP/SAN调整)
   */
  async _onResourceControl(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const action = element.dataset.action;
    const resource = element.dataset.resource;
    
    const current = this.actor.system[resource].value;
    const max = this.actor.system[resource].max;
    
    let newValue = current;
    if (action === "increase") newValue = Math.min(current + 1, max);
    else if (action === "decrease") newValue = Math.max(current - 1, 0);
    
    await this.actor.update({ [`system.${resource}.value`]: newValue });
  }

  /**
   * 创建物品
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    const itemData = {
      name: game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(`ITEM.Type${type.capitalize()}`) }),
      type: type,
      system: {}
    };
    
    const cls = getDocumentClass("Item");
    return cls.create(itemData, { parent: this.actor });
  }

  /**
   * 编辑物品
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    item.sheet.render(true);
  }

  /**
   * 删除物品
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    const confirmed = await Dialog.confirm({
      title: `删除 ${item.name}?`,
      content: `<p>确定要删除 <strong>${item.name}</strong> 吗?</p>`
    });
    
    if (confirmed) {
      await item.delete();
      li.slideUp(200, () => this.render(false));
    }
  }
}