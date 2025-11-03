/**
 * 书海大陆角色数据模型
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // 基础信息
      race: new fields.StringField({ initial: "" }),
      gender: new fields.StringField({ initial: "" }),
      faction: new fields.StringField({ initial: "" }),

      // 基础属性
      attributes: new fields.SchemaField({
        strength: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "力量" })
        }),
        constitution: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "体质" })
        }),
        dexterity: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "敏捷" })
        }),
        perception: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "感知" })
        }),
        intelligence: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "智力" })
        }),
        charisma: new fields.SchemaField({
          value: new fields.NumberField({ required: true, initial: 10, min: 1, max: 30 }),
          label: new fields.StringField({ initial: "魅力" })
        })
      }),

      // 等级和经验
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 12,
        label: "等级"
      }),
      experience: new fields.SchemaField({
        current: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 300, min: 0 }),
        label: new fields.StringField({ initial: "经验" })
      }),

      // 生命值 (体质*3 + 力量 + 等级*3)
      hp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        label: new fields.StringField({ initial: "生命值" })
      }),

      // 侵蚀值 (感知/2 + 智力/3)
      corruption: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        label: new fields.StringField({ initial: "侵蚀值" })
      }),

      // 混乱值 (体质>10 ? 生命值/2 : 生命值/3)
      chaos: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        label: new fields.StringField({ initial: "混乱值" })
      }),

      // 星光 (10 + 等级*2)
      starlight: new fields.SchemaField({
        current: new fields.NumberField({ required: true, initial: 12, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 12, min: 0 }),
        label: new fields.StringField({ initial: "星光" })
      }),

      // 速度值 (1D6 + 敏捷/3)
      speed: new fields.NumberField({ required: true, initial: 0, min: 0 }),

      // 常用物品货币
      currency: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      adventurePoints: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      miraclePoints: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      coreReplica: new fields.NumberField({ required: true, initial: 0, min: 0 }),

      // 编辑锁定状态
      editLocked: new fields.BooleanField({ initial: true }),
      
      // 技能 (力量+敏捷*3+等级*3)
      skills: new fields.SchemaField({
        // 力敏系 (力量+敏捷*3+等级*3)
        athletics: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "运动" }),
        acrobatics: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "体操" }),
        sleight: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "巧手" }),
        stealth: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "隐蔽" }),
        // 智力系 (智力*4+等级*3)
        qidian: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "奇点" }),
        history: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "历史" }),
        investigation: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "调查" }),
        nature: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "自然" }),
        religion: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "宗教" }),
        // 感知系 (感知*4+等级*3)
        animal: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "驯兽" }),
        insight: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "洞悉" }),
        medicine: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "医药" }),
        perception: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "察觉" }),
        survival: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "求生" }),
        // 魅力系 (魅力*3+等级*3)
        deception: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "欺瞒" }),
        intimidation: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "威吓" }),
        performance: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "表演" }),
        persuasion: new fields.NumberField({ initial: 0, min: 0, max: 25, label: "游说" })
      }),

      // 装备栏
      equipment: new fields.SchemaField({
        weapon: new fields.StringField({ initial: "" }),
        armor: new fields.StringField({ initial: "" }),
        combatDice1: new fields.StringField({ initial: "" }),
        combatDice2: new fields.StringField({ initial: "" }),
        combatDice3: new fields.StringField({ initial: "" }),
        combatDice4: new fields.StringField({ initial: "" }),
        combatDice5: new fields.StringField({ initial: "" }),
        combatDice6: new fields.StringField({ initial: "" }),
        defenseDice: new fields.StringField({ initial: "" }),
        triggerDice: new fields.StringField({ initial: "" }),
        equipmentSlot1: new fields.StringField({ initial: "" }),
        equipmentSlot2: new fields.StringField({ initial: "" }),
        equipmentSlot3: new fields.StringField({ initial: "" }),
        equipmentSlot4: new fields.StringField({ initial: "" })
      }),

      // 备注
      biography: new fields.HTMLField({ initial: "" })
    };
  }
  
  /**
   * 准备派生数据
   */
  prepareDerivedData() {
    const str = this.attributes.strength.value;
    const con = this.attributes.constitution.value;
    const dex = this.attributes.dexterity.value;
    const per = this.attributes.perception.value;
    const int = this.attributes.intelligence.value;
    const cha = this.attributes.charisma.value;
    const lvl = this.level;

    // 计算星光上限 (10 + 等级*2)
    this.starlight.max = 10 + lvl * 2;
    if (this.starlight.current === 0) {
      this.starlight.current = this.starlight.max;
    }

    // 计算生命值上限 (体质*3 + 力量 + 等级*3)
    this.hp.max = con * 3 + str + lvl * 3;
    if (this.hp.value === 0) {
      this.hp.value = this.hp.max;
    }

    // 计算侵蚀值上限 (感知/2 + 智力/3)
    this.corruption.max = Math.floor(per / 2) + Math.floor(int / 3);

    // 计算混乱值上限 (体质>10 ? 生命值/2 : 生命值/3)
    this.chaos.max = con > 10 ? Math.floor(this.hp.max / 2) : Math.floor(this.hp.max / 3);

    // 计算经验值上限（根据等级）
    const expThresholds = [300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000];
    this.experience.max = expThresholds[Math.min(lvl - 1, 11)] || 120000;

    // 计算技能上限
    this._calculateSkillMaxValues();
  }
  
  /**
   * 计算技能上限值
   */
  _calculateSkillMaxValues() {
    const str = this.attributes.strength.value;
    const dex = this.attributes.dexterity.value;
    const per = this.attributes.perception.value;
    const int = this.attributes.intelligence.value;
    const cha = this.attributes.charisma.value;
    const lvl = this.level;

    // 力敏系技能上限 (力量+敏捷*3+等级*3)
    const physicalMax = Math.min(str + dex * 3 + lvl * 3, 25);
    // 智力系技能上限 (智力*4+等级*3)
    const intelligenceMax = Math.min(int * 4 + lvl * 3, 25);
    // 感知系技能上限 (感知*4+等级*3)
    const perceptionMax = Math.min(per * 4 + lvl * 3, 25);
    // 魅力系技能上限 (魅力*3+等级*3)
    const charismaMax = Math.min(cha * 3 + lvl * 3, 25);

    // 存储技能上限（用于前端验证）
    this.skillMaxValues = {
      physical: physicalMax,
      intelligence: intelligenceMax,
      perception: perceptionMax,
      charisma: charismaMax
    };
  }

  /**
   * 计算速度 (1D6 + 敏捷/3)
   */
  _calculateSpeed() {
    const dex = this.attributes.dexterity.value;
    const fixedSpeed = Math.floor(dex / 3);
    const randomSpeed = Math.floor(Math.random() * 6) + 1;
    return fixedSpeed + randomSpeed;
  }
  
  /**
   * 进行属性检定
   */
  rollCheck(attribute, modifier = 0, difficulty = 20) {
    const attrValue = this.attributes[attribute]?.value || 0;
    
    // 投掷希望骰(蓝色d12)和侵蚀骰(红色d12)
    const hopeDice = Math.floor(Math.random() * 12) + 1;
    const corruptDice = Math.floor(Math.random() * 12) + 1;
    const diceSum = hopeDice + corruptDice;
    const total = diceSum + attrValue + modifier;
    
    // 判断结果
    let result = {
      hopeDice,
      corruptDice,
      diceSum,
      total,
      success: total >= difficulty,
      type: this._determineCheckType(hopeDice, corruptDice, total >= difficulty)
    };
    
    return result;
  }
  
  /**
   * 判断检定类型
   */
  _determineCheckType(hope, corrupt, success) {
    if (hope === corrupt) return 'critical';
    if (hope > corrupt) return success ? 'hope-success' : 'hope-failure';
    return success ? 'corrupt-success' : 'corrupt-failure';
  }
}