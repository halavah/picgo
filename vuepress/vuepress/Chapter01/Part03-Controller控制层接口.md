# Part03-Controller控制层接口

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─config
│      │          │      ContextStartup.java
│      │          │
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      IndexController.java
│      │          │      PostController.java
│      │          │
│      │          ├─service
│      │          │  │  postService.java
│      │          │  │
│      │          │  └─impl
│      │          │         postServiceImpl.java
│      │
│      └─resources
│          ├─templates
│          │  │  index.ftl
│          │  │
│          │  ├─inc
│          │  │     header-panel.ftl
│          │  │
│          │  └─post
│          │        category.ftl
│          │        detail.ftl
```

## 3.1 首页

- `IndexController.java` ：控制层

```java
@Controller
public class IndexController extends BaseController {

    /**
     * 首页index
     */
    @GetMapping({"", "/", "/index", "/index.html"})
    public String index() {
        /**
         * 多条（post实体类、PostVo实体类）：分页集合results
         */
        //多条：selectPosts(分页信息、分类id、用户id、置顶、精选、排序)
        IPage<PostVo> results = postService.selectPosts(getPage(), null, null, null, null, "created");
        req.setAttribute("postVoDatas", results);

        /**
         * 分类（传入id） -> 渲染分类
         */
        //req：根据传入category表中当前页的id -> 【渲染】分类
        req.setAttribute("currentCategoryId", 0);

        return "index";
    }
}
```

- `index.ftl` ：模板引擎

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl"/>

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "首页">

  <#--【二、分类】-->
  <#include "/inc/header-panel.ftl"/>

  <#--【三、左侧md8 + 右侧md8】-->
  <div class="layui-container">
    <div class="layui-row layui-col-space15">

      <#--1.左侧md8-->
      <div class="layui-col-md8">

        <#--1.1 fly-panel-->
        <div class="fly-panel">
          <#--1.1.1 fly-panel-title-->
          <div class="fly-panel-title fly-filter">
            <a>置顶</a>
          </div>
          <#--1.1.2 消息列表-->
          <ul class="fly-list">
              <@details size=2 level=1>
              <#--1.1.2.1 消息列表-->
                  <#list results.records as post>
                      <@plisting post></@plisting>
                  </#list>
              </@details>
          </ul>
        </div>

        <#--1.2 fly-panel-->
        <div class="fly-panel" style="margin-bottom: 0;">
          <#--1.2.1 fly-panel-title-->
          <div class="fly-panel-title fly-filter">
            <a href="" class="layui-this">综合</a>
            <span class="fly-mid"></span>
            <a href="">未结</a>
            <span class="fly-mid"></span>
            <a href="">已结</a>
            <span class="fly-mid"></span>
            <a href="">精华</a>
            <span class="fly-filter-right layui-hide-xs">
              <a href="" class="layui-this">按最新</a>
              <span class="fly-mid"></span>
              <a href="">按热议</a>
            </span>
          </div>

          <#--1.2.2 消息列表-->
          <div class="fly-list">
              <#list postVoDatas.records as post>
                  <@plisting post></@plisting>
              </#list>
          </div>

          <#--1.2.3 分页条-->
          <@paging postVoDatas></@paging>
        </div>
      </div>

        <#--2.右侧md4-->
        <#include "/inc/right.ftl"/>
    </div>
  </div>
</@layout>
```

## 3.2 导航栏、文章分类

- `ContextStartup.java` ：配置类，【向 `header-panel.ftl` 传入 `categorys`】

```java
@Component
public class ContextStartup implements ApplicationRunner, ServletContextAware {

    @Autowired
    CategoryService categoryService;

    ServletContext servletContext;

    /**
     * 项目启动时，会同时调用该run方法：提前加载导航栏中的“提问、分享、讨论、建议”，并将其list放入servletContext上下文对象
     */
    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<Category> categories = categoryService.list(new QueryWrapper<Category>()
                .eq("status", 0)
        );
        servletContext.setAttribute("categorys", categories);
    }

    /**
     * servletContext上下文对象
     */
    @Override
    public void setServletContext(ServletContext servletContext) {
        this.servletContext = servletContext;
    }
}
```

- `PostController.java` ：控制类，【向 `header-panel.ftl` 传入 `currentCategoryId`】

```java
@Controller
public class PostController extends BaseController {
    /**
     * 分类category
     */
    @GetMapping("/category/{id:\\d*}")
    public String category(@PathVariable(name = "id") long id) {
        /**
         * 分类（传入id）-> 渲染分类
         */
        //req：根据传入category表中当前页的id -> 【渲染】分类
        req.setAttribute("currentCategoryId", id);

        //req：解决使用<@details categoryId=currentCategoryId pn=pn size=2>时，无法传入参数pn的方法：让pn直接从req请求中获取 -> 作为传入posts方法的参数
        req.setAttribute("pn", ServletRequestUtils.getIntParameter(req, "pn", 1));

        return "post/category";
    }
}
```

- `header-panel.ftl` ：模板引擎

```injectedfreemarker
<#--【二、分类】-->
<div class="fly-panel fly-column">
  <div class="layui-container">
    <ul class="layui-clear">
      <!-- 首页 -->
      <li class="${(0 == currentCategoryId)?string('layui-hide-xs layui-this', '')}"><a href="/">首页</a></li>
        <#--提问、分享、讨论、建议-->
        <#list categorys as item>
          <li class="${(item.id == currentCategoryId)?string('layui-hide-xs layui-this', '')}">
            <a href="/category/${item.id}">${item.name}</a>
          </li>
        </#list>
      <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><span class="fly-mid"></span></li>
      <!-- 用户登入后显示 -->
      <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><a href="/user/index#index">我发表的贴</a></li>
      <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><a href="/user/index#collection">我收藏的贴</a></li>
    </ul>

    <div class="fly-column-right layui-hide-xs">
      <span class="fly-search"><i class="layui-icon"></i></span>
      <a href="post/edit" class="layui-btn">发表新帖</a>
    </div>
    <div class="layui-hide-sm layui-show-xs-block" style="margin-top: -10px; padding-bottom: 10px; text-align: center;">
      <a href="post/edit" class="layui-btn">发表新帖</a>
    </div>
  </div>
</div>
```

- `category.ftl` ：模板引擎

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl"/>

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "博客分类">

  <#--【二、分类】-->
  <#include "/inc/header-panel.ftl"/>

  <#--【三、左侧md8 + 右侧md8】-->
  <div class="layui-container">
    <div class="layui-row layui-col-space15">

      <#--1.左侧md8-->
      <div class="layui-col-md8">
        <#--1.2 fly-panel-->
        <div class="fly-panel" style="margin-bottom: 0;">
          <#--1.2.1 fly-panel-title-->
          <div class="fly-panel-title fly-filter">
            <a href="" class="layui-this">综合</a>
            <span class="fly-mid"></span>
            <a href="">未结</a>
            <span class="fly-mid"></span>
            <a href="">已结</a>
            <span class="fly-mid"></span>
            <a href="">精华</a>
            <span class="fly-filter-right layui-hide-xs">
              <a href="" class="layui-this">按最新</a>
              <span class="fly-mid"></span>
              <a href="">按热议</a>
            </span>
          </div>
            <#--1.2.2 消息列表-->
            <@details categoryId=currentCategoryId pn=pn size=2>
              <ul class="fly-list">
                <#list results.records as post>
                  <@plisting post></@plisting>
                </#list>
              </ul>
                <#--1.2.3 分页条-->
                <@paging results></@paging>
            </@details>
        </div>
      </div>

      <#--2.右侧md4-->
      <#include "/inc/right.ftl"/>
    </div>
  </div>

  <script>
    layui.cache.page = 'jie';
  </script>
</@layout>
```

## 3.3 文章详情

- `PostController.java` ：控制层，【查看】文章、【查看】评论

```java
@Controller
public class PostController extends BaseController {

    /**
     * 详情detail：【查看】文章、【查看】评论
     */
    @GetMapping("/post/{id:\\d*}")
    public String detail(@PathVariable(name = "id") long id) {
        /**
         * 一条（post实体类、PostVo实体类）
         */
        //一条：selectOnePost（表 文章id = 传 文章id），因为Mapper中select信息中，id过多引起歧义，故采用p.id
        PostVo postVo = postService.selectOnePost(new QueryWrapper<Post>().eq("p.id", id));
        //req：PostVo实体类 -> CategoryId属性
        req.setAttribute("currentCategoryId", postVo.getCategoryId());
        //req：PostVo实体类（回调）
        req.setAttribute("post", postVo);

        /**
         * 评论（comment实体类）
         */
        //评论：page(分页信息、文章id、用户id、排序)
        IPage<CommentVo> results = commentService.selectComments(getPage(), postVo.getId(), null, "created");
        //req：CommentVo分页集合
        req.setAttribute("pageData", results);

        /**
         * 文章阅读【缓存实现访问量】：减少访问数据库的次数，存在一个BUG，只与点击链接的次数相关，没有与用户的id进行绑定
         */
        postService.putViewCount(postVo);

        return "post/detail";
    }
}
```

- `detail.ftl` ：模板引擎

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl" />

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "博客详情">

  <#--【二、分类】-->
  <#include "/inc/header-panel.ftl" />

  <#--【三、左侧md8 + 右侧md8】-->
  <div class="layui-container">
    <div class="layui-row layui-col-space15">

      <#--1.左侧md8-->
      <div class="layui-col-md8 content detail">
        <#--1.1文章-->
        <div class="fly-panel detail-box">
          <#--1.1.1 文章标题-->
          <h1>${post.title}</h1>

          <#--1.1.2 文章标签-->
          <div class="fly-detail-info">
            <span class="layui-badge layui-bg-green fly-detail-column">${post.categoryName}</span>

            <#if post.level gt 0><span class="layui-badge layui-bg-black">置顶</span></#if>
            <#if post.recommend><span class="layui-badge layui-bg-red">精帖</span></#if>

            <div class="fly-admin-box" data-id="${post.id}">
                <#--发布者删除-->
                <#if post.userId == profile.id  &&  profile.id != 1>
                  <span class="layui-btn layui-btn-xs jie-admin" type="del">删除</span>
                </#if>

                <#--管理员操作-->
                <@shiro.hasRole name="admin">
                  <span class="layui-btn layui-btn-xs jie-admin" type="set" field="delete" rank="1" reload="true" >删除</span>
                    <#if post.level == 0><span class="layui-btn layui-btn-xs jie-admin" type="set" field="stick" rank="1">置顶</span></#if>
                    <#if post.level gt 0><span class="layui-btn layui-btn-xs jie-admin" type="set" field="stick" rank="0" style="background-color:#ccc;">取消置顶</span></#if>
                    <#if !post.recommend><span class="layui-btn layui-btn-xs jie-admin" type="set" field="status" rank="1">加精</span></#if>
                    <#if post.recommend><span class="layui-btn layui-btn-xs jie-admin" type="set" field="status" rank="0" style="background-color:#ccc;">取消加精</span></#if>
                </@shiro.hasRole>
            </div>

            <span class="fly-list-nums">
              <a href="#comment"><i class="iconfont" title="回答">&#xe60c;</i>${post.commentCount}</a>
              <i class="iconfont" title="人气">&#xe60b;</i>${post.viewCount}
            </span>
          </div>

          <#--1.1.3 文章作者信息-->
          <div class="detail-about">
            <a class="fly-avatar" href="/user/${post.authorId}">
              <img src="${post.authorAvatar}" alt="${post.authorName}">
            </a>
            <div class="fly-detail-user">
              <a href="/user/${post.authorId}" class="fly-link">
                <cite>${post.authorName}</cite>
              </a>
              <span>${timeAgo(post.created)}</span>
            </div>

            <div class="detail-hits" id="LAY_jieAdmin" data-id="${post.id}">
              <#--登录状态下，用户id = 作者id，才能进行【编辑文章】-->
              <#if profile.id == post.userId>
                <span class="layui-btn layui-btn-xs jie-admin" type="edit">
                  <a href="/post/edit?id=${post.id}">编辑此贴</a>
                </span>
              </#if>
              <#--未登录状态下，【缺少span块引起的显示问题】，作用：空占位，美化样式-->
              <span class="jie-admin" type=""></span>
            </div>
          </div>

          <#--1.1.4 文章内容-->
          <div class="detail-body photos">
              ${post.content}
          </div>
        </div>

        <#--1.2 评论-->
        <div class="fly-panel detail-box" id="flyReply">
          <#--1.2.1 回帖线-->
          <fieldset class="layui-elem-field layui-field-title" style="text-align: center;">
            <legend>回帖</legend>
          </fieldset>

          <#--1.2.2 评论区-->
          <ul class="jieda" id="jieda">
            <#list pageData.records as comment>
              <li data-id="${comment.id}" class="jieda-daan">
                <a name="item-${comment.id}"></a>
                <div class="detail-about detail-about-reply">
                  <a class="fly-avatar" href="/user/${post.authorId}">
                    <img src="${comment.authorAvatar}" alt="${comment.authorName}">
                  </a>
                  <div class="fly-detail-user">
                    <a href="/user/${comment.authorId}" class="fly-link">
                      <cite>${comment.authorName}</cite>
                    </a>
                    <#if comment.user_id == post.user_id>
                      <span>(楼主)</span>
                    </#if>
                  </div>
                  <div class="detail-hits">
                    <span>${timeAgo(comment.created)}</span>
                  </div>
                </div>
                <div class="detail-body jieda-body photos">
                  ${comment.content}
                </div>
                <div class="jieda-reply">
                    <span class="jieda-zan zanok" type="zan">
                      <i class="iconfont icon-zan"></i>
                      <em>${comment.voteUp}</em>
                    </span>
                  <span type="reply">
                      <i class="iconfont icon-svgmoban53"></i>
                      回复
                    </span>
                  <div class="jieda-admin">
                    <span type="del">删除</span>
                  </div>
                </div>
              </li>
            </#list>
          </ul>

          <#--1.2.3 评论分页-->
          <@paging pageData></@paging>

          <#--1.2.4 回复区-->
          <div class="layui-form layui-form-pane">
            <form action="/post/reply/" method="post">
              <div class="layui-form-item layui-form-text">
                <a name="comment"></a>
                <div class="layui-input-block">
                  <textarea id="L_content" name="content" required lay-verify="required"
                            placeholder="请输入内容" class="layui-textarea fly-editor"
                            style="height: 150px;"></textarea>
                </div>
              </div>
              <div class="layui-form-item">
                <input type="hidden" name="jid" value="${post.id}">
                <button class="layui-btn" lay-filter="*" lay-submit>提交回复</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <#--2.右侧md4-->
      <#include "/inc/right.ftl"/>
    </div>
  </div>
  <script>
    layui.cache.page = 'jie';
  </script>

</@layout>
```
