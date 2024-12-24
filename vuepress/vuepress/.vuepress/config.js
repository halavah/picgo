module.exports = {
  title: 'Forum',

  description: 'Project documentation',

  head: [['link', { rel: 'icon', href: '/logo/favicon.ico' }]],

  base: '/',

  dest: '../docs',

  themeConfig: {
    /* 一、导航栏 */

    /* 导航栏 Logo */
    logo: '/logo/favicon.ico',

    /* 禁用导航栏 */
    navbar: true,

    /* 导航栏链接 */
    nav: [
      {
        text: '项目地址',
        link: 'https://github.com/halavah/grower/tree/master/forum',
      },
      {
        text: '关于我',
        link: 'https://github.com/halavah',
      },
      // {
      //   text: '关于我',
      //   link: '/About.md',
      // },
      // {
      //   text: '程序员',
      //   items: [
      //     {
      //       text: '移动端',
      //       items: [
      //         { text: 'Android', link: '/' },
      //         { text: 'iOS', link: '/' },
      //       ],
      //     },
      //     {
      //       text: '服务端',
      //       items: [
      //         { text: 'Java', link: '/' },
      //         { text: 'PHP', link: '/' },
      //       ],
      //     },
      //   ],
      // },
    ],

    /* 二、侧边栏 */

    /* 嵌套的标题链接 */
    sidebarDepth: 2,

    /* 显示所有页面的标题链接 */
    displayAllHeaders: false,

    /* 活动的标题链接 */
    activeHeaderLinks: true,

    /* 侧边栏链接 */
    sidebar: {
      // 路径：'/'
      '/': [
        '',
        {
          // 组名：Chapter01
          title: 'Chapter01',
          collapsable: true,
          children: [
            '/Chapter01/Part01-网站页面划分',
            '/Chapter01/Part02-MyBatis-Plus的使用',
            '/Chapter01/Part03-Controller控制层接口',
            '/Chapter01/Part04-自定义Freemaker标签',
            '/Chapter01/Part05-项目启动前加载导航栏',
            '/Chapter01/Part06-侧边栏本周热议',
            '/Chapter01/Part07-文章阅读缓存访问量',
          ],
        },
        {
          // 组名：Chapter02
          title: 'Chapter02',
          collapsable: true,
          children: [
            '/Chapter02/Part01-集成Kaptcha实现用户注册',
            '/Chapter02/Part02-集成Shiro实现用户登录',
            '/Chapter02/Part03-集成Shiro实现个人账户-我的主页、基本设置',
            '/Chapter02/Part04-集成Shiro实现个人账户-用户中心',
            '/Chapter02/Part05-集成Shiro实现个人账户-我的消息',
          ],
        },
        {
          // 组名：Chapter03
          title: 'Chapter03',
          collapsable: true,
          children: [
            '/Chapter03/Part01-集成Shiro实现帖子详情-收藏文章',
            '/Chapter03/Part02-集成Shiro实现帖子详情-添加文章、编辑文章、提交文章',
            '/Chapter03/Part03-集成Shiro实现帖子详情-超级用户、删除、置顶、精华',
            '/Chapter03/Part04-集成Shiro实现帖子详情-用户文章、用户评论',
          ],
        },
        {
          // 组名：Chapter04
          title: 'Chapter04',
          collapsable: true,
          children: [
            '/Chapter04/Part01-集成WeSocket实现用户评论-即时通讯',
            '/Chapter04/Part02-集成Elasticsearch实现文章内容-搜索引擎',
            '/Chapter04/Part03-集成RabbitMQ保证ES随文章增删改查-实时更新',
            '/Chapter04/Part04-集成WebSocket-tio实现网络群聊-聊天室',
          ],
        },
      ],
    },

    /* 三、搜索栏 */

    search: true,

    searchMaxSuggestions: 10,

    /* 四、最后更新时间 */

    lastUpdated: 'Last Updated',

    /* 五、上/下一篇链接 */

    nextLinks: true,

    prevLinks: true,

    /* 六、Git 仓库和编辑链接 */

    // repo: 'https://github.com/halavah/test',

    // docsDir: 'docs',

    // docsBranch: 'master',

    /* 七、页面滚动 */

    smoothScroll: true,
  },
}
