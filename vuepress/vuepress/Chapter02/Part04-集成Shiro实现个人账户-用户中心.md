# Part04-集成Shiro实现个人账户-用户中心

```text
blog
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─controller
│      │          │      BaseController.java
│      │          │      UserController.java
│      │          │
│      │          ├─service
│      │          │  │  UserService.java
│      │          │  │
│      │          │  └─impl
│      │          │         UserServiceImpl.java
│      │
│      └─resources
│          ├─templates
│          │  ├─inc
│          │  │     common.ftl
│          │  │
│          │  └─user
│          │        index.ftl
```

## 4.1 个人账户：用户中心

- `UserController.java` ：控制层，【跳转页面】、【发布的贴】、【收藏的贴】

```java
@Controller
public class UserController extends BaseController {
    /**
     * 用户中心：跳转页面
     */
    @GetMapping("/user/index")
    public String index() {
        return "/user/index";
    }

    /**
     * 用户中心：发布的贴
     */
    @ResponseBody
    @GetMapping("/user/publish")
    public Result userPublic() {
        IPage page = postService.page(getPage(), new QueryWrapper<Post>()
                .eq("user_id", getProfileId())
                .orderByDesc("created"));
        long total = page.getTotal();
        req.setAttribute("publishCount", total);
        return Result.success(page);
    }

    /**
     * 用户中心：收藏的贴
     */
    @ResponseBody
    @GetMapping("/user/collection")
    public Result userCollection() {
        IPage page = postService.page(getPage(), new QueryWrapper<Post>()
                .inSql("id", "SELECT post_id FROM m_user_collection where user_id = " + getProfileId())
        );
        req.setAttribute("collectionCount", page.getTotal());
        return Result.success(page);
    }
}
```

- `index.ftl` ：模板引擎，参考【layui 社区中的 flow 流加载、laytpl 模板引擎、util 工具文档】

```injectedfreemarker
<#--宏layout.ftl（导航栏 + 页脚）-->
<#include "/inc/layout.ftl"/>
<#--宏common.ftl（用户中心-左侧链接（我的主页、用户中心、基本设置、我的消息））-->
<#include "/inc/common.ftl"/>

<#--【三、填充（导航栏 + 页脚）】-->
<@layout "用户中心">

    <div class="layui-container fly-marginTop fly-user-main">
    <#--用户中心-左侧链接（我的主页、用户中心、基本设置、我的消息）-->
        <@centerLeft level=1></@centerLeft>

        <div class="site-tree-mobile layui-hide">
            <i class="layui-icon">&#xe602;</i>
        </div>
        <div class="site-mobile-shade"></div>

        <div class="site-tree-mobile layui-hide">
            <i class="layui-icon">&#xe602;</i>
        </div>
        <div class="site-mobile-shade"></div>

        <div class="fly-panel fly-panel-user" pad20>
            <div class="layui-tab layui-tab-brief" lay-filter="user">
                <ul class="layui-tab-title" id="LAY_mine">
                    <li data-type="mine-jie" lay-id="index" class="layui-this">我发的帖</li>
                    <li data-type="collection" data-url="/collection/find/" lay-id="collection">我收藏的帖</li>
                </ul>

                <div class="layui-tab-content" style="padding: 20px 0;">
                    <div class="layui-tab-item layui-show">

                    <#-----------------------1.发布的贴----------------------->
                    <#--第二步：建立视图，用于呈现渲染结果-->
                        <ul class="mine-view jie-row" id="publish">
                        <#--第一步，编写模版（laytpl），使用一个script标签存放模板：https://www.layui.com/doc/modules/laytpl.html-->
                            <script id="tpl-publish" type="text/html">
                                <li>
                                    <a class="jie-title" href="/post/{{d.id}}" target="_blank">
                                        {{d.title}}
                                    </a>
                                    <i>
                                        {{layui.util.toDateString(d.created, 'yyyy-MM-dd HH:mm:ss')}}
                                    </i>
                                    <a class="mine-edit" href="/post/edit?id={{d.id}}">编辑</a>
                                    <em>
                                        {{d.viewCount }}阅/{{d.commentCount}}答
                                    </em>
                                </li>
                            </script>
                        </ul>

                        <div id="LAY_page"></div>
                    </div>

                    <div class="layui-tab-item">

                    <#-----------------------2.收藏的贴----------------------->
                    <#--第二步：建立视图，用于呈现渲染结果-->
                        <ul class="mine-view jie-row" id="collection">
                        <#--第一步，编写模版（laytpl），使用一个script标签存放模板：https://www.layui.com/doc/modules/laytpl.html-->
                            <script id="tpl-collection" type="text/html">
                                <li>

                                    <a class="jie-title" href="/post/{{d.id}}" target="_blank">{{d.title}}</a>
                                    <i>收藏于{{layui.util.timeAgo(d.created, true)}}</i>
                                </li>
                            </script>
                        </ul>

                        <div id="LAY_page1"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        layui.cache.page = 'user';

        layui.use(['laytpl', 'flow', 'util'], function () {
            var $ = layui.jquery;
            var laytpl = layui.laytpl;
            var flow = layui.flow;
            var util = layui.util;

            /*流加载（flow）*/
            flow.load({
                elem: '#publish'                    //elem：指定列表容器
                , isAuto: false                     //isAuto：是否自动加载。默认 true。如果设为 false，点会在列表底部生成一个 “加载更多” 的 button，则只能点击它才会加载下一页数据。
                , done: function (page, next) {     //done：到达临界点触发加载的回调（默认滚动触发），触发下一页
                    var lis = [];

                    //以jQuery的Ajax请求为例，请求下一页数据（注意：page是从2开始返回）
                    $.get('/user/publish?pn=' + page, function (res) {

                        //假设你的列表返回在data集合中
                        layui.each(res.data.records, function (index, item) {

                        <#--第三步：渲染模版-->
                            var tpl = $("#tpl-publish").html();                //获取html内容：选择tpl-publish【第一步中的模版】
                            laytpl(tpl).render(item, function (html) {         //使用render进行渲染：使用【集合item】对【模板tpl】渲染为html
                                $("#publish .layui-flow-more").before(html);
                            });
                        });

                        //执行下一页渲染，第二参数为：满足“加载更多”的条件，即后面仍有分页
                        //pages为Ajax返回的总页数，只有当前页小于总页数的情况下，才会继续出现加载更多
                        next(lis.join(''), page < res.data.pages);
                    });
                }
            });

            flow.load({
                elem: '#collection'
                ,isAuto: false
                ,done: function(page, next){
                    var lis = [];

                    $.get('/user/collection?pn='+page, function(res){
                        layui.each(res.data.records, function(index, item){

                        <#--第三步：渲染模版-->
                            var tpl = $("#tpl-collection").html();          //获取html内容：选择tpl-collection【第一步中的模版】
                            laytpl(tpl).render(item, function (html) {      //使用render进行渲染：使用【集合item】对【模板tpl】渲染为html
                                $("#collection .layui-flow-more").before(html);
                            });
                        });

                        next(lis.join(''), page < res.data.pages);
                    });
                }
            });

        });
    </script>

</@layout>
```

## 4.2 宏：个人账户-左侧链接（我的主页、用户中心、基本设置、我的消息）

- `common.ftl` ：模板引擎，【公共部分】

```injectedfreemarker
<#--宏：个人账户-左侧链接（我的主页、用户中心、基本设置、我的消息）-->
<#macro centerLeft level>
    <ul class="layui-nav layui-nav-tree layui-inline" lay-filter="user">
        <li class="layui-nav-item <#if level == 0> layui-this</#if>">
            <a href="/user/home">
                <i class="layui-icon">&#xe609;</i>
                我的主页
            </a>
        </li>
        <li class="layui-nav-item <#if level == 1> layui-this</#if>">
            <a href="/user/index">
                <i class="layui-icon">&#xe612;</i>
                用户中心
            </a>
        </li>
        <li class="layui-nav-item <#if level == 2> layui-this</#if>">
            <a href="/user/set">
                <i class="layui-icon">&#xe620;</i>
                基本设置
            </a>
        </li>
        <li class="layui-nav-item <#if level == 3> layui-this</#if>">
            <a href="/user/mess">
                <i class="layui-icon">&#xe611;</i>
                我的消息
            </a>
        </li>
    </ul>
</#macro>
```
