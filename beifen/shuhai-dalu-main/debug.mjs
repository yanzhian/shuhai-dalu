/**
 * 书海大陆系统调试脚本
 * 在浏览器控制台中运行此脚本以诊断问题
 */

// 检查系统是否正确加载
console.log("=== 书海大陆系统调试 ===");

// 1. 检查 game.shuhai 是否存在
console.log("1. 检查 game.shuhai:", game.shuhai ? "✓ 存在" : "✗ 不存在");

// 2. 检查 CONFIG
console.log("2. 检查 CONFIG.Actor.documentClass:", CONFIG.Actor.documentClass);
console.log("3. 检查 CONFIG.Item.documentClass:", CONFIG.Item.documentClass);

// 3. 检查数据模型
console.log("4. 检查 Actor 数据模型:", CONFIG.Actor.dataModels);
console.log("5. 检查 Item 数据模型:", CONFIG.Item.dataModels);

// 4. 尝试创建测试数据
console.log("\n=== 测试数据模型 ===");

try {
  const CharacterData = CONFIG.Actor.dataModels.character;
  console.log("CharacterData 类:", CharacterData);
  
  if (CharacterData) {
    const schema = CharacterData.defineSchema();
    console.log("Schema 定义:", schema);
    
    // 检查必需字段
    console.log("\n=== 检查字段 ===");
    for (const [key, field] of Object.entries(schema)) {
      console.log(`字段 "${key}":`, field);
    }
  }
} catch (e) {
  console.error("创建测试数据失败:", e);
  console.error("错误堆栈:", e.stack);
}

// 5. 尝试手动创建角色
console.log("\n=== 尝试创建测试角色 ===");

async function createTestCharacter() {
  try {
    const actor = await Actor.create({
      name: "测试角色",
      type: "character"
    });
    console.log("✓ 角色创建成功:", actor);
    console.log("角色数据:", actor.system);
    return actor;
  } catch (e) {
    console.error("✗ 角色创建失败:", e);
    console.error("错误信息:", e.message);
    console.error("错误堆栈:", e.stack);
    
    // 详细的验证错误
    if (e.validationErrors) {
      console.error("验证错误:", e.validationErrors);
    }
    return null;
  }
}

// 运行测试
createTestCharacter();

// 6. 检查模板路径
console.log("\n=== 检查模板 ===");
const templatePath = "systems/shuhai-dalu/templates/actor/actor-character-sheet.hbs";
console.log("模板路径:", templatePath);

fetch(templatePath)
  .then(response => {
    if (response.ok) {
      console.log("✓ 模板文件存在");
    } else {
      console.error("✗ 模板文件不存在:", response.status);
    }
  })
  .catch(e => {
    console.error("✗ 无法检查模板:", e);
  });

// 7. 检查样式文件
const cssPath = "systems/shuhai-dalu/styles/shuhai-dalu.css";
console.log("样式路径:", cssPath);

fetch(cssPath)
  .then(response => {
    if (response.ok) {
      console.log("✓ 样式文件存在");
    } else {
      console.error("✗ 样式文件不存在:", response.status);
    }
  })
  .catch(e => {
    console.error("✗ 无法检查样式:", e);
  });

console.log("\n=== 调试完成 ===");
console.log("请查看上方的输出信息以诊断问题");