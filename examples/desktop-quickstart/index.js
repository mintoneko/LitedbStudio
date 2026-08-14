import { LiteDB } from '@litedb/client';

async function main() {
  console.log('🚀 正在启动 LiteDB 本地嵌入式模式 (Embedded Mode)...');

  // 1. 初始化客户端 (本地模式，无需启动外部 HTTP 服务)
  const db = new LiteDB({
    mode: 'embedded',
    dbPath: './data/desktop_app.db'
  });

  const notes = db.collection('notes');

  // 2. 插入测试数据
  console.log('\n📝 1. 插入本地笔记数据...');
  const note1 = await notes.insert({
    title: 'LiteDB 架构设计心得',
    content: '轻量化、统一前后端规范、低内存占用，适合个人独立开发！',
    category: 'architecture',
    likes: 12
  });
  console.log('已插入笔记:', note1);

  const note2 = await notes.insert({
    title: 'Electron 桌面端开发备忘',
    content: '桌面端应用直接内嵌 LiteDB，零端口占用，秒开无延迟。',
    category: 'desktop',
    likes: 35
  });

  // 3. 高级条件查询
  console.log('\n🔍 2. 查询 category 为 desktop 或 likes >= 20 的记录:');
  const queryResult = await notes.find({
    $or: [
      { category: 'desktop' },
      { likes: { $gte: 20 } }
    ]
  }, {
    sort: { likes: -1 }
  });
  console.log('查询结果:', queryResult);

  // 4. 更新记录
  console.log('\n✏️ 3. 点赞更新 (likes: 12 -> 13)...');
  const updated = await notes.updateById(note1.id, { likes: 13 });
  console.log('更新后数据:', updated);

  // 5. 统计与分析
  const count = await notes.count();
  console.log(`\n📊 4. 当前本地笔记总数: ${count}`);

  const stats = await db.getStats();
  console.log('💾 5. 数据库运行状态:', {
    dbPath: stats.path,
    driver: stats.driver,
    fileSize: stats.fileSizeFormatted,
    totalDocuments: stats.totalDocuments
  });

  db.close();
  console.log('\n✅ 演示完成！');
}

main().catch(console.error);
