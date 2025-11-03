/**
 * 书海大陆角色数据模型
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
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
      
      // 等级
      level: new fields.NumberField({ 
        required: true, 
        initial: 1, 
        min: 1,
        label: "等级"
      }),
      
      // 生命值
      hp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        label: new fields.StringField({ initial: "生命值" })
      }),
      
      // 侵蚀值 (SAN值)
      san: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, initial: 10, min: 0 }),
        label: new fields.StringField({ initial: "侵蚀值" })
      }),
      
      // 奇迹点和奇重点
      miracle: new fields.SchemaField({
        points: new fields.NumberField({ required: true, initial: 1, min: 0 }),
        weight: new fields.NumberField({ required: true, initial: 400, min: 0 })
      }),
      
      // 技能
      skills: new fields.SchemaField({
        athletics: new fields.NumberField({ initial: 0, min: 0, label: "运动" }),
        acrobatics: new fields.NumberField({ initial: 0, min: 0, label: "体操" }),
        sleight: new fields.NumberField({ initial: 0, min: 0, label: "巧手" }),
        stealth: new fields.NumberField({ initial: 0, min: 0, label: "隐蔽" }),
        qidian: new fields.NumberField({ initial: 0, min: 0, label: "奇点" }),
        history: new fields.NumberField({ initial: 0, min: 0, label: "历史" }),
        investigation: new fields.NumberField({ initial: 0, min: 0, label: "调查" }),
        nature: new fields.NumberField({ initial: 0, min: 0, label: "自然" }),
        religion: new fields.NumberField({ initial: 0, min: 0, label: "宗教" }),
        animal: new fields.NumberField({ initial: 0, min: 0, label: "驯兽" }),
        insight: new fields.NumberField({ initial: 0, min: 0, label: "洞悉" }),
        medicine: new fields.NumberField({ initial: 0, min: 0, label: "医药" }),
        perception: new fields.NumberField({ initial: 0, min: 0, label: "察觉" }),
        survival: new fields.NumberField({ initial: 0, min: 0, label: "求生" }),
        deception: new fields.NumberField({ initial: 0, min: 0, label: "欺瞒" }),
        intimidation: new fields.NumberField({ initial: 0, min: 0, label: "威吓" }),
        performance: new fields.NumberField({ initial: 0, min: 0, label: "表演" }),
        persuasion: new fields.NumberField({ initial: 0, min: 0, label: "游说" })
      }),
      
      // 战斗卡牌配置
      combat: new fields.SchemaField({
        cards: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
        defense: new fields.ObjectField({ initial: null }),
        resistance: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        weakness: new fields.ArrayField(new fields.StringField(), { initial: [] })
      }),
      
      // 备注
      biography: new fields.HTMLField({ initial: "" })
    };
  }
  
  /**
   * 准备派生数据
   */
  prepareDerivedData() {
    // 计算生命值上限 (基于体质)
    const constitution = this.attributes.constitution.value;
    this.hp.max = constitution * 5;
    
    // 如果当前HP为0，设置为最大值
    if (this.hp.value === 0) {
      this.hp.value = this.hp.max;
    }
    
    // 计算速度
    this.speed = this._calculateSpeed();
  }
  
  /**
   * 计算速度
   */
  _calculateSpeed() {
    const dex = this.attributes.dexterity.value;
    const level = this.level;
    const con = this.attributes.constitution.value;
    
    const fixedSpeed = Math.floor(dex / 3) + Math.floor(level / 5);
    const randomSpeed = con >= 10 ? 
      Math.floor(Math.random() * 4) + 1 : 
      Math.floor(Math.random() * 6) + 1;
    
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