/**
 * 项目配置文件
 * 集中管理所有的配置项，方便维护和修改
 */
module.exports = {
    /**
     * MongoDB 数据库配置
     * url: 数据库连接地址
     * - 优先使用环境变量中的 MONGODB_URI
     * - 如果环境变量不存在，则使用默认的本地数据库地址
     */
    mongodb: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017/XUBU_DB'
    }
};