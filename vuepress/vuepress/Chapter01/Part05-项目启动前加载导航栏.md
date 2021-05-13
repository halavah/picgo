# Part05-项目启动前加载导航栏

```text
blog
│  pom.xml
│
├─src
│  └─main
│      ├─java
│      │  └─org
│      │      └─myslayers
│      │          ├─config
│      │          │      ContextStartup.java
│      │
│      └─resources
│          ├─templates
│          │  └─inc
│          │        header-panel.ftl
```

## 5.1 ContextStartup 配置类

- `ContextStartup.java` ：配置类，【提前加载导航栏中的“提问、分享、讨论、建议”】

```java
/**
 * Context配置类
 */
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

## 5.2 使用

- `header-panel.ftl` ：模板引擎，【根据 currentCategoryId、categorys 对数据进行渲染】

```injectedfreemarker
<#--【二、分类】-->
<div class="fly-panel fly-column">
    <div class="layui-container">
        <ul class="layui-clear">

            <#--首页-->
            <li class="${(0 == currentCategoryId)?string('layui-hide-xs layui-this', '')}"><a href="/">首页</a></li>
            <#--提问、分享、讨论、建议-->
            <#list categorys as item>
                <li class="${(item.id == currentCategoryId)?string('layui-hide-xs layui-this', '')}"><a href="/category/${item.id}">${item.name}</a></li>
            </#list>

            <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><span class="fly-mid"></span></li>
            <!-- 用户登入后显示 -->
            <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><a href="user/index.html">我发表的贴</a></li>
            <li class="layui-hide-xs layui-hide-sm layui-show-md-inline-block"><a href="user/index.html#collection">我收藏的贴</a>
            </li>
        </ul>

        <div class="fly-column-right layui-hide-xs">
            <span class="fly-search"><i class="layui-icon"></i></span>
            <a href="jie/add.html" class="layui-btn">发表新帖</a>
        </div>
        <div class="layui-hide-sm layui-show-xs-block"
             style="margin-top: -10px; padding-bottom: 10px; text-align: center;">
            <a href="jie/add.html" class="layui-btn">发表新帖</a>
        </div>
    </div>
</div>
```
